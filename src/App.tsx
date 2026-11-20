import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthBootLoader } from './components/AuthBootLoader';
import { CommandPalette } from './components/CommandPalette';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
import {
  addFirestoreRequisite,
  addFirestoreTopUp,
  createFirestoreDeposit,
  createFirestoreUser,
  deleteFirestoreRequisite,
  deleteFirestoreUser,
  ensureFirestoreConfig,
  loginFirestoreUser,
  pingFirestorePresence,
  respondFirestoreWithdrawal,
  sendFirestoreInstantDeposit,
  sendFirestoreMessage,
  sendFirestoreWithdrawal,
  subscribeAdminCollections,
  subscribeFirestoreConfig,
  subscribeUserCollections,
  syncUserToFirestore,
  updateFirestoreConfig,
  updateFirestoreDeposit,
  updateFirestoreRequisite,
  updateFirestoreUser,
  verifyFirestoreAdminPassword,
} from './firebase/client';
import { t } from './i18n';
import {
  AdminDashboardPage,
  FirebaseConnectionStatus,
} from './pages/AdminDashboardPage';
import { AutomaticPage } from './pages/AutomaticPage';
import { DepositsPage } from './pages/DepositsPage';
import { DisputesPage } from './pages/DisputesPage';
import { LoginView } from './pages/LoginView';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReferralsPage } from './pages/ReferralsPage';
import { RequisitesPage } from './pages/RequisitesPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { WithdrawalsPage } from './pages/WithdrawalsPage';
import {
  AppSettings,
  DepositOrder,
  ManagedUser,
  PlatformConfig,
  PlatformState,
  Requisite,
  RoutePath,
  SmsMessage,
  ToastMessage,
  TopUpRecord,
} from './types';
import {
  buildPlatformStateForUser,
  createClientSeedState,
  executeLocalApi,
  loadLocalState,
  loadRawLocalDb,
  saveLocalState,
} from './utils/localStore';

const USER_SESSION_KEY = 'egyptpay_user_id';
const ACTIVE_USER_CACHE_KEY = 'egyptpay_active_user_v1';
const ADMIN_SESSION_KEY = 'egyptpay_admin_pass';
const VISITOR_ID_KEY = 'egyptpay_visitor_id';
const SYNC_CHANNEL_NAME = 'egyptpay_sync_v1';

const VALID_ROUTES: RoutePath[] = [
  '/deposits',
  '/deposits/disputes',
  '/withdrawals',
  '/withdrawals/my',
  '/statistics',
  '/requisite',
  '/automatic',
  '/automatic/telegram',
  '/automatic/api',
  '/messages',
  '/profile',
  '/referrals',
  '/admin.php',
];

function getOrCreateVisitorId(): string {
  try {
    const existing = sessionStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const id = `vis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return `vis_${Date.now()}`;
  }
}

function getInitialRoute(fallback: RoutePath = '/profile'): RoutePath {
  const path = window.location.pathname;
  if (path === '/admin' || path === '/admin.php') return '/admin.php';
  return VALID_ROUTES.includes(path as RoutePath) ? (path as RoutePath) : fallback;
}

function readCachedUser(): ManagedUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ManagedUser) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: ManagedUser | null): void {
  try {
    if (user) {
      localStorage.setItem(ACTIVE_USER_CACHE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(ACTIVE_USER_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

function upsertUserIntoLocalDb(user: ManagedUser): void {
  const db = loadRawLocalDb();
  const idx = (db.users ?? []).findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    db.users![idx] = user;
  } else {
    db.users = [user, ...(db.users ?? [])];
  }
  saveLocalState(db);
}

export default function App() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [adminState, setAdminState] = useState<PlatformState | null>(null);
  const [userSessionId, setUserSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(USER_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [adminPassword, setAdminPassword] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [bootPhase, setBootPhase] = useState<'preparing' | 'accounts' | 'done'>('preparing');
  const [bootError, setBootError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => getInitialRoute('/profile'));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [triggerRequisiteCreate, setTriggerRequisiteCreate] = useState(false);
  const [triggerTopUpCreate, setTriggerTopUpCreate] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus>('connecting');
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4200);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const broadcastSync = useCallback((type: string, payload?: unknown) => {
    try {
      syncChannelRef.current?.postMessage({ type, payload });
    } catch {
      // ignore
    }
  }, []);

  const applyConfigToStates = useCallback((cfg: PlatformConfig) => {
    const db = loadRawLocalDb();
    db.config = { ...db.config, ...cfg };
    saveLocalState(db);

    setState((prev) =>
      prev
        ? {
            ...prev,
            config: { ...prev.config, ...cfg },
            accounts: prev.accounts.map((a) => ({ ...a, rate: cfg.usdRate || a.rate })),
          }
        : prev
    );
    setAdminState((prev) =>
      prev
        ? {
            ...prev,
            config: { ...prev.config, ...cfg },
          }
        : prev
    );
  }, []);

  const apiCall = useCallback(
    async (
      url: string,
      method: string,
      body?: unknown,
      overrideUserId?: string | null,
      overrideAdminPass?: string | null
    ) => {
      const effectiveUid = overrideUserId !== undefined ? overrideUserId : userSessionId;
      const effectiveAdminPass =
        overrideAdminPass !== undefined ? overrideAdminPass : adminPassword;

      const runFallback = () => {
        const localRes = executeLocalApi(
          url,
          method,
          body as Record<string, unknown> | undefined,
          effectiveUid
        );
        if (url.startsWith('/api/admin') && localRes.state) {
          setAdminState(localRes.state as PlatformState);
        } else if (url === '/api/admin/state') {
          setAdminState(localRes as unknown as PlatformState);
        } else if (localRes.state) {
          setState(localRes.state as PlatformState);
        } else if ('accounts' in localRes) {
          setState(localRes as unknown as PlatformState);
        }
        return localRes;
      };

      try {
        const headers: Record<string, string> = {};
        if (body) headers['Content-Type'] = 'application/json';
        if (effectiveUid) headers['x-user-id'] = effectiveUid;
        if (effectiveAdminPass) headers['x-admin-password'] = effectiveAdminPass;

        const res = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        const ct = res.headers.get('content-type') || '';
        if (!ct.includes('application/json')) {
          return runFallback();
        }
        const json = await res.json();
        if (!res.ok) {
          return { ok: false, error: json.error || 'Request failed', ...json };
        }
        if (url.startsWith('/api/admin')) {
          if (json.state) setAdminState(json.state as PlatformState);
          else if (json.users) setAdminState(json as PlatformState);
        } else {
          if (json.state) setState(json.state as PlatformState);
          else if (json.accounts) setState(json as PlatformState);
        }
        return json;
      } catch {
        return runFallback();
      }
    },
    [userSessionId, adminPassword]
  );

  const fetchState = useCallback(
    async (withBootSequence = false, overrideUserId?: string | null) => {
      const effectiveUid = overrideUserId !== undefined ? overrideUserId : userSessionId;
      if (withBootSequence) {
        setBootPhase('preparing');
        setBootError(null);
      }

      const applyLoadedState = (data: PlatformState) => {
        let finalState = data;
        // Restore cached Firebase user session seamlessly on refresh/static hosting
        if (effectiveUid && !finalState.authenticated) {
          const cached = readCachedUser();
          if (cached && cached.id === effectiveUid && cached.active) {
            upsertUserIntoLocalDb(cached);
            finalState = buildPlatformStateForUser(finalState, cached);
          } else {
            try {
              localStorage.removeItem(USER_SESSION_KEY);
            } catch {
              // ignore
            }
            setUserSessionId(null);
          }
        }
        setState(finalState);
        const path = window.location.pathname;
        if (path === '/admin' || path === '/admin.php') {
          setCurrentRoute('/admin.php');
        } else if (!VALID_ROUTES.includes(path as RoutePath)) {
          setCurrentRoute(finalState.settings.defaultLanding || '/profile');
        }
        if (withBootSequence) {
          setTimeout(() => setBootPhase('accounts'), 450);
          setTimeout(() => {
            setBootPhase('done');
            setLoading(false);
          }, 980);
        } else {
          setBootPhase('done');
          setLoading(false);
        }
      };

      // Also check Firestore config right away on boot so platformName is fresh before/during render
      const fsCfgPromise = ensureFirestoreConfig();

      try {
        const headers: Record<string, string> = {};
        if (effectiveUid) headers['x-user-id'] = effectiveUid;
        const [res, fsCfg] = await Promise.all([
          fetch('/api/state', { headers }).catch(() => null),
          fsCfgPromise,
        ]);

        if (fsCfg.ok) {
          setFirebaseStatus('connected');
          setFirebaseError(null);
        } else if (fsCfg.permissionError) {
          setFirebaseStatus('permission-error');
          setFirebaseError(fsCfg.errorMessage || 'Missing or insufficient permissions');
        }

        const ct = res?.headers.get('content-type') || '';
        let loaded: PlatformState;
        if (!res || !res.ok || !ct.includes('application/json')) {
          loaded = loadLocalState(effectiveUid);
        } else {
          loaded = (await res.json()) as PlatformState;
        }

        if (fsCfg.ok && fsCfg.config) {
          loaded = {
            ...loaded,
            config: { ...loaded.config, ...fsCfg.config },
          };
          const db = loadRawLocalDb();
          db.config = { ...db.config, ...fsCfg.config };
          saveLocalState(db);
        }
        applyLoadedState(loaded);
      } catch {
        try {
          applyLoadedState(loadLocalState(effectiveUid));
        } catch {
          setBootError('تعذر الاتصال بالمنصة');
          setLoading(false);
        }
      }
    },
    [userSessionId]
  );

  useEffect(() => {
    fetchState(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Global real-time Firestore config listener -> automatically updates platformName across all screens
  useEffect(() => {
    const unsub = subscribeFirestoreConfig(
      (cfg) => {
        setFirebaseStatus('connected');
        setFirebaseError(null);
        applyConfigToStates(cfg);
      },
      (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          setFirebaseStatus('permission-error');
          setFirebaseError(err.message);
        }
      }
    );
    return () => unsub();
  }, [applyConfigToStates]);

  // Same-browser instant sync channel (in addition to Firestore)
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
    syncChannelRef.current = ch;
    ch.onmessage = (ev) => {
      const msg = ev.data as { type?: string; payload?: unknown };
      if (msg?.type === 'config' && msg.payload) {
        applyConfigToStates(msg.payload as PlatformConfig);
      }
    };
    return () => {
      ch.close();
      syncChannelRef.current = null;
    };
  }, [applyConfigToStates]);

  // Real-time Firestore user collections subscription when a player is logged in
  useEffect(() => {
    if (!userSessionId || currentRoute === '/admin.php') return;
    const unsub = subscribeUserCollections(userSessionId, {
      onUser: (fsUser) => {
        if (!fsUser) return;
        if (!fsUser.active) {
          writeCachedUser(null);
          try {
            localStorage.removeItem(USER_SESSION_KEY);
          } catch {
            // ignore
          }
          setUserSessionId(null);
          setState((prev) => (prev ? { ...prev, authenticated: false, activeUserId: null } : prev));
          notify('warning', 'تم إيقاف الحساب من الإدارة');
          return;
        }
        writeCachedUser(fsUser);
        upsertUserIntoLocalDb(fsUser);
        setState((prev) => {
          const base = prev ?? createClientSeedState();
          return buildPlatformStateForUser(base, fsUser);
        });
      },
      onMessages: (messages) => {
        setState((prev) => (prev ? { ...prev, messages } : prev));
      },
      onWithdrawals: (withdrawals) => {
        setState((prev) => (prev ? { ...prev, withdrawals } : prev));
      },
      onDeposits: (deposits) => {
        setState((prev) => (prev ? { ...prev, deposits } : prev));
      },
      onRequisites: (requisites) => {
        setState((prev) => (prev ? { ...prev, requisites } : prev));
      },
      onTopUps: (topUps) => {
        setState((prev) => (prev ? { ...prev, topUps } : prev));
      },
    });
    return () => unsub();
  }, [userSessionId, currentRoute, notify]);

  // Real-time Firestore Admin collections subscription when on /admin.php
  useEffect(() => {
    if (currentRoute !== '/admin.php' || !adminPassword) return;

    // Seed initial adminState from local/express first
    apiCall('/api/admin/state', 'GET', undefined, userSessionId, adminPassword);

    const unsub = subscribeAdminCollections({
      onConfig: (cfg) => {
        setFirebaseStatus('connected');
        setFirebaseError(null);
        applyConfigToStates(cfg);
      },
      onUsers: (fsUsers) => {
        setFirebaseStatus('connected');
        setAdminState((prev) => {
          const base = prev ?? { ...loadRawLocalDb(), ...(state || {}) };
          return { ...base, users: fsUsers };
        });
      },
      onPresence: (entries) => {
        setAdminState((prev) => {
          const base = prev ?? { ...loadRawLocalDb(), ...(state || {}) };
          return {
            ...base,
            onlinePresence: entries,
            onlineCount: entries.length,
          };
        });
      },
      onWithdrawals: (withdrawals) => {
        setAdminState((prev) => (prev ? { ...prev, withdrawals } : prev));
      },
      onDeposits: (deposits) => {
        setAdminState((prev) => (prev ? { ...prev, deposits } : prev));
      },
      onMessages: (messages) => {
        setAdminState((prev) => (prev ? { ...prev, messages } : prev));
      },
      onError: (err) => {
        if (err.message.toLowerCase().includes('permission')) {
          setFirebaseStatus('permission-error');
          setFirebaseError(err.message);
        }
      },
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoute, adminPassword]);

  // Real-time presence heartbeat every 10s (both Firestore & API)
  useEffect(() => {
    const sendPing = () => {
      const nowIso = new Date().toISOString();
      const activeProf = state?.authenticated ? state.profile : null;
      pingFirestorePresence({
        visitorId,
        userId: userSessionId,
        playerId: activeProf?.playerId ?? null,
        userName: activeProf?.displayName ?? null,
        email: activeProf?.email ?? null,
        route: currentRoute,
        lastPingAt: nowIso,
      });
      apiCall('/api/presence/ping', 'POST', {
        visitorId,
        userId: userSessionId,
        route: currentRoute,
      });
    };
    sendPing();
    const timer = setInterval(sendPing, 10_000);
    return () => clearInterval(timer);
  }, [
    visitorId,
    userSessionId,
    currentRoute,
    state?.authenticated,
    state?.profile?.displayName,
    state?.profile?.email,
    state?.profile?.playerId,
    apiCall,
  ]);

  // Sync HTML dir/lang, document title, and layout classes whenever config/settings change
  useEffect(() => {
    if (!state) return;
    const { settings, config } = state;
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
    if (config?.platformName) {
      document.title =
        currentRoute === '/admin.php'
          ? `لوحة الأدمن — ${config.platformName}`
          : `${config.platformName} — منصة الوكلاء والمدفوعات`;
    }
    document.body.classList.toggle('compact-tables', settings.compactTables);
    document.body.classList.toggle('mirror-headers', settings.mirrorHeader);
    document.body.style.setProperty('--table-zoom', String(settings.tableZoom / 100));
  }, [state, currentRoute]);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Browser history popstate
  useEffect(() => {
    const onPop = () => {
      setCurrentRoute(getInitialRoute('/profile'));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((route: RoutePath) => {
    setCurrentRoute(route);
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
  }, []);

  const currentAccount = useMemo(() => {
    if (!state) return null;
    return (
      state.accounts.find((a) => a.account_id === state.currentAccountId) ?? state.accounts[0]
    );
  }, [state]);

  const handleLogin = async (email: string, password: string) => {
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    // 1. Check Firebase Firestore (moorrcv) first — primary global source of truth
    const fsRes = await loginFirestoreUser(cleanEmail, cleanPass);
    if (fsRes.ok && fsRes.user) {
      const uid = fsRes.user.id;
      setUserSessionId(uid);
      writeCachedUser(fsRes.user);
      upsertUserIntoLocalDb(fsRes.user);
      try {
        localStorage.setItem(USER_SESSION_KEY, uid);
      } catch {
        // ignore
      }
      setState((prev) => buildPlatformStateForUser(prev ?? loadLocalState(null), fsRes.user!));
      navigate('/profile');
      return { ok: true };
    }

    // 2. Fallback to Express /api + localStorage (covers accounts created when Firestore was offline/restricted)
    const localRes = await apiCall('/api/auth/login', 'POST', {
      email: cleanEmail,
      password: cleanPass,
    });
    if (localRes && localRes.ok && localRes.userId) {
      const uid = String(localRes.userId);
      setUserSessionId(uid);
      try {
        localStorage.setItem(USER_SESSION_KEY, uid);
      } catch {
        // ignore
      }
      if (localRes.state) {
        const st = localRes.state as PlatformState;
        setState(st);
        const db = loadRawLocalDb();
        const found = (db.users ?? []).find((u) => u.id === uid);
        if (found) {
          writeCachedUser(found);
          syncUserToFirestore(found).catch(() => undefined);
        }
      }
      navigate('/profile');
      return { ok: true };
    }

    return {
      ok: false,
      error: fsRes.error || localRes?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    };
  };

  const handleLogout = async () => {
    writeCachedUser(null);
    try {
      localStorage.removeItem(USER_SESSION_KEY);
    } catch {
      // ignore
    }
    setUserSessionId(null);
    await apiCall('/api/auth/logout', 'POST', {}, null);
  };

  const handleCommandExecute = async (route: RoutePath, action?: string) => {
    navigate(route);
    if (action === 'create' && route === '/requisite') {
      setTriggerRequisiteCreate(true);
    } else if (action === 'create' && route === '/profile') {
      setTriggerTopUpCreate(true);
    } else if (action === 'simulate' && route === '/deposits') {
      const res = await apiCall('/api/deposits/simulate', 'POST');
      if (state && res.created) {
        notify('success', 'طلب إيداع جديد', res.created.orderId);
      }
    }
  };

  if (loading || bootPhase !== 'done' || !state || !currentAccount) {
    return (
      <AuthBootLoader
        phase={bootPhase === 'done' ? 'accounts' : bootPhase}
        error={bootError}
        lang={state?.settings.lang ?? 'ar'}
        platformName={state?.config?.platformName ?? 'egyptpay.trade'}
        countryCode={state?.config?.countryCode ?? 'EG'}
        onRetry={() => fetchState(true)}
      />
    );
  }

  const { settings, config } = state;
  const lang = settings.lang;

  // Dedicated /admin.php Full-Control Admin Panel route
  if (currentRoute === '/admin.php') {
    return (
      <>
        <AdminDashboardPage
          state={adminState ?? state}
          adminAuthed={Boolean(adminPassword)}
          firebaseStatus={firebaseStatus}
          firebaseError={firebaseError}
          onAdminLogin={async (pass) => {
            const cleanPass = pass.trim();
            const fsAuth = await verifyFirestoreAdminPassword(cleanPass);
            const apiAuth = await apiCall(
              '/api/admin/auth',
              'POST',
              { password: cleanPass },
              userSessionId,
              cleanPass
            );
            if (fsAuth.ok || (apiAuth && apiAuth.ok)) {
              setAdminPassword(cleanPass);
              try {
                sessionStorage.setItem(ADMIN_SESSION_KEY, cleanPass);
              } catch {
                // ignore
              }
              if (fsAuth.config) {
                applyConfigToStates(fsAuth.config);
              }
              if (apiAuth?.state) {
                setAdminState(apiAuth.state as PlatformState);
              } else {
                setAdminState(loadRawLocalDb());
              }
              if (fsAuth.permissionError) {
                setFirebaseStatus('permission-error');
              } else if (!fsAuth.unavailable) {
                setFirebaseStatus('connected');
              }
              return { ok: true };
            }
            return { ok: false, error: apiAuth?.error || 'كلمة مرور الأدمن مش صح' };
          }}
          onAdminLogout={() => {
            setAdminPassword(null);
            setAdminState(null);
            try {
              sessionStorage.removeItem(ADMIN_SESSION_KEY);
            } catch {
              // ignore
            }
          }}
          onRefreshAdmin={async () => {
            await apiCall('/api/admin/state', 'GET');
          }}
          onCreateUser={async (payload) => {
            // Try Firestore first so unique random playerId + account is immediately available globally
            const fsRes = await createFirestoreUser(payload);
            if (fsRes.ok && fsRes.user) {
              setFirebaseStatus('connected');
              setFirebaseError(null);
              upsertUserIntoLocalDb(fsRes.user);
              // Mirror to Express if running
              fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(adminPassword ? { 'x-admin-password': adminPassword } : {}),
                },
                body: JSON.stringify(payload),
              }).catch(() => undefined);
              setAdminState((prev) =>
                prev
                  ? {
                      ...prev,
                      users: [fsRes.user!, ...(prev.users ?? []).filter((u) => u.id !== fsRes.user!.id)],
                    }
                  : prev
              );
              return { ok: true, user: fsRes.user };
            }

            if (fsRes.permissionError) {
              setFirebaseStatus('permission-error');
              setFirebaseError(fsRes.error || 'Firestore permission denied');
              // Fallback to local/Express so admin isn't blocked even before opening rules
              const fallbackRes = await apiCall('/api/admin/users', 'POST', payload);
              return fallbackRes as { ok: boolean; error?: string; user?: ManagedUser };
            }

            if (fsRes.error) {
              return { ok: false, error: fsRes.error };
            }

            const res = await apiCall('/api/admin/users', 'POST', payload);
            return res as { ok: boolean; error?: string; user?: ManagedUser };
          }}
          onUpdateUser={async (id, patch: Partial<ManagedUser>) => {
            await updateFirestoreUser(id, patch).catch(() => undefined);
            const res = await apiCall(`/api/admin/users/${id}`, 'PATCH', patch);
            setAdminState((prev) =>
              prev && prev.users
                ? {
                    ...prev,
                    users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
                  }
                : prev
            );
            return { ok: Boolean(res?.ok ?? true), error: res?.error };
          }}
          onDeleteUser={async (id) => {
            await deleteFirestoreUser(id).catch(() => undefined);
            await apiCall(`/api/admin/users/${id}`, 'DELETE');
            setAdminState((prev) =>
              prev && prev.users
                ? { ...prev, users: prev.users.filter((u) => u.id !== id) }
                : prev
            );
          }}
          onSendWithdrawalToUser={async (payload) => {
            const targetUser = (adminState?.users ?? state.users ?? []).find(
              (u) => u.id === payload.userId
            );
            if (!targetUser) {
              return { ok: false, error: 'اختر مستخدم صحيح أولاً' };
            }
            try {
              await sendFirestoreWithdrawal({
                user: targetUser,
                amountEgp: payload.amountEgp,
                destinationMethod: payload.destinationMethod,
                requisiteNumber: payload.requisiteNumber,
                recipientName: payload.recipientName,
                usdRate: (adminState ?? state).config.usdRate,
                note: payload.note,
              });
            } catch {
              // fallback handled below
            }
            const res = await apiCall('/api/admin/withdrawals/send', 'POST', payload);
            return { ok: Boolean(res?.ok ?? true), error: res?.error };
          }}
          onSendMessageToUser={async (payload) => {
            const msg: SmsMessage = {
              id: `msg_${Date.now()}_${Math.floor(10 + Math.random() * 89)}`,
              userId: payload.userId,
              deviceId: 'admin_desk',
              deviceName: 'لوحة الإدارة',
              sender: payload.sender || 'إدارة المنصة',
              body: payload.body,
              parsedAmount: payload.amountEgp ?? null,
              currency: 'EGP',
              matchedDepositId: null,
              matchedOrderId: null,
              status: 'unmatched',
              receivedAt: new Date().toISOString(),
            };
            await sendFirestoreMessage(msg).catch(() => undefined);
            await apiCall('/api/admin/messages/send', 'POST', payload);
          }}
          onCreateDepositForUser={async (payload) => {
            const fsRes = await sendFirestoreInstantDeposit({
              userId: payload.userId,
              identifier: payload.identifier,
              amountEgp: payload.amountEgp,
              bankName: payload.bankName,
              note: payload.note,
              usdRate: (adminState ?? state).config.usdRate,
              autoCredit: payload.autoCredit ?? true,
            });

            if (fsRes.ok && fsRes.user) {
              upsertUserIntoLocalDb(fsRes.user);
              setAdminState((prev) =>
                prev
                  ? {
                      ...prev,
                      users: (prev.users ?? []).map((u) =>
                        u.id === fsRes.user!.id ? fsRes.user! : u
                      ),
                      deposits: fsRes.deposit
                        ? [fsRes.deposit, ...prev.deposits.filter((d) => d.id !== fsRes.deposit!.id)]
                        : prev.deposits,
                    }
                  : prev
              );
              // Mirror to Express/localStore silently
              apiCall('/api/admin/deposits', 'POST', {
                userId: fsRes.user.id,
                identifier: payload.identifier,
                amountEgp: payload.amountEgp,
                bankName: payload.bankName,
                note: payload.note,
                autoCredit: payload.autoCredit ?? true,
              }).catch(() => undefined);
              return { ok: true, user: fsRes.user };
            }

            const res = await apiCall('/api/admin/deposits', 'POST', {
              ...payload,
              autoCredit: payload.autoCredit ?? true,
            });
            return {
              ok: Boolean(res?.ok),
              error: res?.error || fsRes.error,
              user: res?.user as ManagedUser | undefined,
            };
          }}
          onDepositAction={async (id, action) => {
            const dep = (adminState?.deposits ?? state.deposits).find((d) => d.id === id);
            await updateFirestoreDeposit(id, action, dep?.userId).catch(() => undefined);
            await apiCall(`/api/deposits/${id}`, 'PATCH', { action });
            await apiCall('/api/admin/state', 'GET');
          }}
          onUpdateConfig={async (patch) => {
            const nextCfg: PlatformConfig = {
              ...(adminState?.config ?? state.config),
              ...(patch.platformName ? { platformName: patch.platformName } : {}),
              ...(patch.usdRate ? { usdRate: patch.usdRate } : {}),
              ...(patch.adminPassword ? { adminPassword: patch.adminPassword } : {}),
            };
            applyConfigToStates(nextCfg);
            broadcastSync('config', nextCfg);
            await updateFirestoreConfig(patch).catch(() => undefined);
            await apiCall('/api/admin/config', 'PATCH', patch);
            if (patch.adminPassword) {
              setAdminPassword(patch.adminPassword);
              try {
                sessionStorage.setItem(ADMIN_SESSION_KEY, patch.adminPassword);
              } catch {
                // ignore
              }
            }
          }}
          onImpersonateUser={async (uid) => {
            const target = (adminState?.users ?? state.users ?? []).find((u) => u.id === uid);
            setUserSessionId(uid);
            if (target) {
              writeCachedUser(target);
              upsertUserIntoLocalDb(target);
              setState((prev) => buildPlatformStateForUser(prev ?? loadLocalState(null), target));
            }
            try {
              localStorage.setItem(USER_SESSION_KEY, uid);
            } catch {
              // ignore
            }
            await fetchState(false, uid);
            navigate('/profile');
          }}
          onDownloadPhp={() => {
            window.location.href = '/api/admin/download-php';
          }}
          onGoToApp={() => {
            navigate('/profile');
          }}
          onNotify={notify}
        />
        <ToastContainer
          toasts={toasts}
          position={settings.notificationPosition}
          onDismiss={dismissToast}
        />
      </>
    );
  }

  // Strictly block unauthenticated users: show LoginView ONLY (no self-signup)
  if (!state.authenticated) {
    return (
      <>
        <LoginView
          lang={lang}
          platformName={config.platformName}
          countryCode={config.countryCode}
          onLogin={handleLogin}
          onToggleLang={() =>
            apiCall('/api/settings', 'PATCH', { lang: lang === 'ar' ? 'en' : 'ar' })
          }
        />
        <ToastContainer
          toasts={toasts}
          position={settings.notificationPosition}
          onDismiss={dismissToast}
        />
      </>
    );
  }

  const openDisputesCount = state.disputes.filter(
    (d) =>
      d.accountId === currentAccount.account_id &&
      (d.status === 'open' || d.status === 'reviewing')
  ).length;

  const availableWithdrawalsCount = state.withdrawals.filter(
    (w) => w.accountId === currentAccount.account_id && w.status === 'available'
  ).length;

  const pendingMessagesCount = state.messages.filter(
    (m) => m.withdrawalActionStatus === 'pending_confirmation'
  ).length;

  return (
    <div className="min-h-dvh bg-[#141414] text-white">
      <TopHeader
        lang={lang}
        platformName={config.platformName}
        currentRoute={currentRoute}
        currentAccount={currentAccount}
        sidebarCollapsed={settings.sidebarCollapsedDesktop}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Sidebar
        lang={lang}
        platformName={config.platformName}
        currentRoute={currentRoute}
        onNavigate={navigate}
        accounts={state.accounts}
        currentAccount={currentAccount}
        onSwitchAccount={(accountId) =>
          apiCall('/api/accounts/switch', 'POST', { accountId })
        }
        onToggleTradeStatus={(canTrade) => {
          if (userSessionId) {
            updateFirestoreUser(userSessionId, { canTrade }).catch(() => undefined);
          }
          return apiCall('/api/accounts/trade-status', 'POST', {
            accountId: currentAccount.account_id,
            canTrade,
          }).then(() =>
            notify(
              canTrade ? 'success' : 'warning',
              t(lang, 'tradeStatus'),
              canTrade ? t(lang, 'active') : t(lang, 'paused')
            )
          );
        }}
        collapsed={settings.sidebarCollapsedDesktop}
        onToggleCollapse={() =>
          apiCall('/api/settings', 'PATCH', {
            sidebarCollapsedDesktop: !settings.sidebarCollapsedDesktop,
          })
        }
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onOpenSearch={() => setCommandOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleLang={() =>
          apiCall('/api/settings', 'PATCH', { lang: lang === 'ar' ? 'en' : 'ar' })
        }
        onShowLogin={handleLogout}
        openDisputesCount={openDisputesCount}
        availableWithdrawalsCount={availableWithdrawalsCount}
        pendingMessagesCount={pendingMessagesCount}
      />

      {/* Main Content Shell */}
      <main
        className={`flex h-dvh min-h-0 flex-col pt-[3.75rem] transition-[padding-inline-start] duration-300 ${
          settings.sidebarCollapsedDesktop ? 'lg:ps-[4rem]' : 'lg:ps-[20rem]'
        }`}
      >
        <div className="flex-1 min-h-0 overflow-hidden bg-[#141414]">
          {currentRoute === '/deposits' && (
            <DepositsPage
              deposits={state.deposits}
              currentAccount={currentAccount}
              settings={settings}
              onAction={async (id, action, payload) => {
                if (action === 'confirm' || action === 'cancel') {
                  await updateFirestoreDeposit(id, action, userSessionId || undefined).catch(
                    () => undefined
                  );
                }
                return apiCall(`/api/deposits/${id}`, 'PATCH', { action, ...payload });
              }}
              onSimulateOrder={async () => {
                const res = await apiCall('/api/deposits/simulate', 'POST');
                if (res.created) {
                  if (userSessionId) {
                    createFirestoreDeposit(res.created as DepositOrder).catch(() => undefined);
                  }
                  notify(
                    'success',
                    lang === 'ar' ? 'طلب إيداع جديد' : 'New deposit order received',
                    res.created.orderId
                  );
                }
              }}
              onNotify={notify}
            />
          )}

          {currentRoute === '/deposits/disputes' && (
            <DisputesPage
              disputes={state.disputes}
              currentAccount={currentAccount}
              settings={settings}
              onResolve={(id, action, note) =>
                apiCall(`/api/disputes/${id}`, 'PATCH', { action, note })
              }
              onNotify={notify}
            />
          )}

          {(currentRoute === '/withdrawals' || currentRoute === '/withdrawals/my') && (
            <WithdrawalsPage
              mode={currentRoute === '/withdrawals' ? 'pool' : 'my'}
              withdrawals={state.withdrawals}
              currentAccount={currentAccount}
              settings={settings}
              onClaim={(id) => apiCall(`/api/withdrawals/${id}/claim`, 'POST')}
              onUpdate={(id, action, files) =>
                apiCall(`/api/withdrawals/${id}`, 'PATCH', { action, files })
              }
              onNotify={notify}
            />
          )}

          {currentRoute === '/statistics' && (
            <StatisticsPage
              deposits={state.deposits}
              withdrawals={state.withdrawals}
              requisites={state.requisites}
              currentAccount={currentAccount}
              settings={settings}
            />
          )}

          {currentRoute === '/requisite' && (
            <RequisitesPage
              requisites={state.requisites}
              devices={state.androidDevices}
              currentAccount={currentAccount}
              settings={settings}
              triggerCreate={triggerRequisiteCreate}
              onClearTriggerCreate={() => setTriggerRequisiteCreate(false)}
              onCreate={async (data: Partial<Requisite>) => {
                const res = await apiCall('/api/requisites', 'POST', data);
                if (userSessionId) {
                  const created: Requisite = {
                    id: `req_${Date.now()}`,
                    userId: userSessionId,
                    accountId: currentAccount.account_id,
                    bankName: String(data.bankName || 'فودافون كاش'),
                    ownerName: String(data.ownerName || state.profile.displayName),
                    accountNumber: String(data.accountNumber || '01000000000'),
                    type: data.type || 'wallet',
                    minOrder: Number(data.minOrder) || 200,
                    maxOrder: Number(data.maxOrder) || 30000,
                    dailyLimit: Number(data.dailyLimit) || 150000,
                    dailyUsed: 0,
                    bidRate: Number(data.bidRate) || 3.0,
                    active: true,
                    createdAt: new Date().toISOString(),
                  };
                  addFirestoreRequisite(created).catch(() => undefined);
                }
                return res;
              }}
              onUpdate={async (id, data) => {
                await updateFirestoreRequisite(id, data).catch(() => undefined);
                return apiCall(`/api/requisites/${id}`, 'PATCH', data);
              }}
              onDelete={async (id) => {
                await deleteFirestoreRequisite(id).catch(() => undefined);
                return apiCall(`/api/requisites/${id}`, 'DELETE');
              }}
              onNotify={notify}
            />
          )}

          {(currentRoute === '/automatic' ||
            currentRoute === '/automatic/telegram' ||
            currentRoute === '/automatic/api') && (
            <AutomaticPage
              subRoute={
                currentRoute === '/automatic/telegram'
                  ? 'telegram'
                  : currentRoute === '/automatic/api'
                  ? 'api'
                  : 'android'
              }
              devices={state.androidDevices}
              telegramBots={state.telegramBots}
              apiKeys={state.apiKeys}
              requisites={state.requisites.filter(
                (r) => r.accountId === currentAccount.account_id
              )}
              settings={settings}
              onNavigate={navigate}
              onCreateAndroid={(data) => apiCall('/api/automatic/android', 'POST', data)}
              onToggleAndroid={(id, online) =>
                apiCall(`/api/automatic/android/${id}`, 'PATCH', { online })
              }
              onDeleteAndroid={(id) => apiCall(`/api/automatic/android/${id}`, 'DELETE')}
              onCreateTelegram={(data) => apiCall('/api/automatic/telegram', 'POST', data)}
              onDeleteTelegram={(id) => apiCall(`/api/automatic/telegram/${id}`, 'DELETE')}
              onCreateApiKey={(data) => apiCall('/api/automatic/api-keys', 'POST', data)}
              onDeleteApiKey={(id) => apiCall(`/api/automatic/api-keys/${id}`, 'DELETE')}
              onNotify={notify}
            />
          )}

          {currentRoute === '/messages' && (
            <MessagesPage
              messages={state.messages}
              settings={settings}
              onSimulateSms={async () => {
                const res = await apiCall('/api/messages/simulate', 'POST');
                if (res.message) {
                  if (userSessionId) {
                    sendFirestoreMessage(res.message as SmsMessage).catch(() => undefined);
                  }
                  notify(
                    res.message.status === 'matched' ? 'success' : 'warning',
                    lang === 'ar' ? 'وصلت رسالة جديدة' : 'New message received',
                    res.message.matchedOrderId ?? res.message.sender
                  );
                }
              }}
              onRespondWithdrawal={async (messageId, action) => {
                if (userSessionId) {
                  const fsRes = await respondFirestoreWithdrawal({
                    messageId,
                    userId: userSessionId,
                    action,
                  });
                  if (fsRes.ok) {
                    // Mirror locally as well
                    await apiCall(`/api/messages/${messageId}/withdrawal-response`, 'POST', {
                      action,
                    }).catch(() => undefined);
                    return fsRes;
                  }
                  if (fsRes.error && !fsRes.error.includes('الرسالة أو الحساب مش موجود')) {
                    return fsRes;
                  }
                }
                return apiCall(`/api/messages/${messageId}/withdrawal-response`, 'POST', {
                  action,
                });
              }}
              onNotify={notify}
            />
          )}

          {currentRoute === '/profile' && (
            <ProfilePage
              profile={state.profile}
              currentAccount={currentAccount}
              topUps={state.topUps}
              withdrawals={state.withdrawals}
              settings={settings}
              triggerCreate={triggerTopUpCreate}
              onClearTriggerCreate={() => setTriggerTopUpCreate(false)}
              onCreateTopUp={async (amountUsdt: number, network: TopUpRecord['network']) => {
                if (userSessionId) {
                  const rec: TopUpRecord = {
                    id: `top_${Date.now()}`,
                    userId: userSessionId,
                    txHash: `0x${Math.random().toString(16).slice(2)}`,
                    network,
                    amountUsdt,
                    status: 'credited',
                    createdAt: new Date().toISOString(),
                  };
                  addFirestoreTopUp(userSessionId, rec).catch(() => undefined);
                }
                return apiCall('/api/topups', 'POST', { amountUsdt, network });
              }}
              onToggle2FA={(enabled) => {
                if (userSessionId) {
                  updateFirestoreUser(userSessionId, { twoFactorEnabled: enabled }).catch(
                    () => undefined
                  );
                }
                return apiCall('/api/profile', 'PATCH', { twoFactorEnabled: enabled });
              }}
              onNotify={notify}
            />
          )}

          {currentRoute === '/referrals' && (
            <ReferralsPage
              profile={state.profile}
              referrals={state.referrals}
              settings={settings}
              onNotify={notify}
            />
          )}
        </div>
      </main>

      <SettingsDrawer
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(patch: Partial<AppSettings>) => apiCall('/api/settings', 'PATCH', patch)}
      />

      <CommandPalette
        open={commandOpen}
        lang={lang}
        currentRoute={currentRoute}
        onClose={() => setCommandOpen(false)}
        onExecute={handleCommandExecute}
      />

      <ToastContainer
        toasts={toasts}
        position={settings.notificationPosition}
        onDismiss={dismissToast}
      />
    </div>
  );
}
