import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AuthBootLoader } from './components/AuthBootLoader';
import { CommandPalette } from './components/CommandPalette';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
import {
  FIXED_PLATFORM_NAME,
  addFirestoreRequisite,
  addFirestoreTopUp,
  createFirestoreDeposit,
  deleteFirestoreRequisite,
  ensureFirestoreConfig,
  loginFirestoreUser,
  pingFirestorePresence,
  respondFirestoreWithdrawal,
  sendFirestoreMessage,
  subscribeFirestoreConfig,
  subscribeUserCollections,
  syncUserToFirestore,
  updateFirestoreDeposit,
  updateFirestoreRequisite,
  updateFirestoreUser,
} from './firebase/client';
import { t } from './i18n';
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
  normalizeManagedUser,
  saveLocalState,
} from './utils/localStore';

const USER_SESSION_KEY = 'egyptpay_user_id';
const ACTIVE_USER_CACHE_KEY = 'egyptpay_active_user_v1';
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
  return VALID_ROUTES.includes(path as RoutePath) ? (path as RoutePath) : fallback;
}

function readCachedUser(): ManagedUser | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_CACHE_KEY);
    return raw ? normalizeManagedUser(JSON.parse(raw) as Partial<ManagedUser>) : null;
  } catch {
    return null;
  }
}

function writeCachedUser(user: ManagedUser | null): void {
  try {
    if (user) {
      localStorage.setItem(ACTIVE_USER_CACHE_KEY, JSON.stringify(normalizeManagedUser(user)));
    } else {
      localStorage.removeItem(ACTIVE_USER_CACHE_KEY);
    }
  } catch {
    // ignore
  }
}

function upsertUserIntoLocalDb(rawUser: ManagedUser): ManagedUser {
  const user = normalizeManagedUser(rawUser);
  const db = loadRawLocalDb();
  const idx = (db.users ?? []).findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    db.users![idx] = user;
  } else {
    db.users = [user, ...(db.users ?? [])];
  }
  saveLocalState(db);
  return user;
}

function mergeUserCollections(primary: PlatformState, secondary: PlatformState): PlatformState {
  const mergeList = <T extends { id: string }>(a: T[] = [], b: T[] = []): T[] => {
    const map = new Map<string, T>();
    for (const item of b) if (item?.id) map.set(item.id, item);
    for (const item of a) if (item?.id) map.set(item.id, item);
    return Array.from(map.values());
  };
  return {
    ...primary,
    requisites: mergeList(primary.requisites, secondary.requisites),
    deposits: mergeList(primary.deposits, secondary.deposits),
    disputes: mergeList(primary.disputes, secondary.disputes),
    withdrawals: mergeList(primary.withdrawals, secondary.withdrawals),
    androidDevices: mergeList(primary.androidDevices, secondary.androidDevices),
    telegramBots: mergeList(primary.telegramBots, secondary.telegramBots),
    apiKeys: mergeList(primary.apiKeys, secondary.apiKeys),
    messages: mergeList(primary.messages, secondary.messages),
    topUps: mergeList(primary.topUps, secondary.topUps),
    referrals: mergeList(primary.referrals, secondary.referrals),
  };
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(err: Error) {
    return { hasError: true, errorMsg: err?.message || 'Unexpected error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-dvh w-full bg-[#111111] text-white flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md rounded-[18px] border border-[#2a2a2a] bg-[#161616] p-6 text-center space-y-4">
            <div className="text-[18px] font-bold text-white">حدث خطأ مؤقت في عرض لوحة التحكم</div>
            <p className="text-[13px] text-[#8a8a8a] font-mono-num break-words">
              {this.state.errorMsg}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-[10px] bg-[#e25d0a] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/90 cursor-pointer"
            >
              إعادة تحميل لوحة التحكم
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}

function AppShell() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [userSessionId, setUserSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(USER_SESSION_KEY);
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
    const lockedCfg: PlatformConfig = { ...cfg, platformName: FIXED_PLATFORM_NAME };
    const db = loadRawLocalDb();
    db.config = { ...db.config, ...lockedCfg };
    saveLocalState(db);

    setState((prev) =>
      prev
        ? {
            ...prev,
            config: { ...prev.config, ...lockedCfg },
            accounts: prev.accounts.map((a) => ({ ...a, rate: lockedCfg.usdRate || a.rate })),
          }
        : prev
    );
  }, []);

  const apiCall = useCallback(
    async (
      url: string,
      method: string,
      body?: unknown,
      overrideUserId?: string | null
    ) => {
      const effectiveUid = overrideUserId !== undefined ? overrideUserId : userSessionId;

      const runFallback = () => {
        const localRes = executeLocalApi(
          url,
          method,
          body as Record<string, unknown> | undefined,
          effectiveUid
        );
        if (localRes.state) {
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
          if (
            res.status === 401 &&
            effectiveUid &&
            url !== '/api/auth/login' &&
            url !== '/api/auth/sync-session'
          ) {
            const cached = readCachedUser();
            if (cached && cached.id === effectiveUid) {
              fetch('/api/auth/sync-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: cached }),
              }).catch(() => undefined);
            }
            return runFallback();
          }
          return { ok: false, error: json.error || 'Request failed', ...json };
        }
        if (json.state) setState(json.state as PlatformState);
        else if (json.accounts) setState(json as PlatformState);
        return json;
      } catch {
        return runFallback();
      }
    },
    [userSessionId]
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
        // Restore cached Firebase / localStorage user session seamlessly on refresh/static hosting
        if (effectiveUid && !finalState.authenticated) {
          const localUsers = loadRawLocalDb().users ?? [];
          const cached =
            readCachedUser() ?? localUsers.find((u) => u.id === effectiveUid) ?? null;
          if (cached && cached.id === effectiveUid && cached.active !== false) {
            const normalized = upsertUserIntoLocalDb(cached);
            const localUserView = loadLocalState(effectiveUid);
            finalState = mergeUserCollections(
              buildPlatformStateForUser(finalState, normalized),
              localUserView
            );
            fetch('/api/auth/sync-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user: normalized }),
            }).catch(() => undefined);
          } else {
            try {
              localStorage.removeItem(USER_SESSION_KEY);
            } catch {
              // ignore
            }
            setUserSessionId(null);
          }
        } else if (effectiveUid && finalState.authenticated) {
          finalState = mergeUserCollections(finalState, loadLocalState(effectiveUid));
        }
        setState(finalState);
        const path = window.location.pathname;
        if (!VALID_ROUTES.includes(path as RoutePath)) {
          setCurrentRoute('/profile');
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

      // Also check Firestore config right away on boot so platformName & usdRate are fresh
      const fsCfgPromise = ensureFirestoreConfig();

      try {
        const headers: Record<string, string> = {};
        if (effectiveUid) headers['x-user-id'] = effectiveUid;
        const [res, fsCfg] = await Promise.all([
          fetch('/api/state', { headers }).catch(() => null),
          fsCfgPromise,
        ]);

        const ct = res?.headers.get('content-type') || '';
        let loaded: PlatformState;
        if (!res || !res.ok || !ct.includes('application/json')) {
          loaded = loadLocalState(effectiveUid);
        } else {
          loaded = (await res.json()) as PlatformState;
        }

        const mergedConfig: PlatformConfig = {
          ...loaded.config,
          ...(fsCfg.ok && fsCfg.config ? fsCfg.config : {}),
          platformName: FIXED_PLATFORM_NAME,
        };
        loaded = {
          ...loaded,
          config: mergedConfig,
        };
        const db = loadRawLocalDb();
        db.config = { ...db.config, ...mergedConfig };
        saveLocalState(db);
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

  // Global real-time Firestore config listener -> automatically updates usdRate across all screens
  useEffect(() => {
    const unsub = subscribeFirestoreConfig((cfg) => {
      applyConfigToStates(cfg);
    });
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
      } else if (msg?.type === 'user_upsert' && msg.payload) {
        upsertUserIntoLocalDb(msg.payload as ManagedUser);
      }
    };
    return () => {
      ch.close();
      syncChannelRef.current = null;
    };
  }, [applyConfigToStates]);

  // Real-time Firestore user collections subscription when a player is logged in
  useEffect(() => {
    if (!userSessionId) return;
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
        setState((prev) =>
          prev ? (messages.length === 0 && prev.messages.length > 0 ? prev : { ...prev, messages }) : prev
        );
      },
      onWithdrawals: (withdrawals) => {
        setState((prev) =>
          prev
            ? withdrawals.length === 0 && prev.withdrawals.length > 0
              ? prev
              : { ...prev, withdrawals }
            : prev
        );
      },
      onDeposits: (deposits) => {
        setState((prev) =>
          prev ? (deposits.length === 0 && prev.deposits.length > 0 ? prev : { ...prev, deposits }) : prev
        );
      },
      onRequisites: (requisites) => {
        setState((prev) =>
          prev
            ? requisites.length === 0 && prev.requisites.length > 0
              ? prev
              : { ...prev, requisites }
            : prev
        );
      },
      onTopUps: (topUps) => {
        setState((prev) =>
          prev ? (topUps.length === 0 && prev.topUps.length > 0 ? prev : { ...prev, topUps }) : prev
        );
      },
    });
    return () => unsub();
  }, [userSessionId, notify]);

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
      document.title = `${config.platformName} — منصة الوكلاء والمدفوعات`;
    }
    document.body.classList.toggle('compact-tables', settings.compactTables);
    document.body.classList.toggle('mirror-headers', settings.mirrorHeader);
    document.body.style.setProperty('--table-zoom', String(settings.tableZoom / 100));
  }, [state]);

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

    const completeLogin = async (
      uid: string,
      userObj?: ManagedUser | null,
      nextState?: PlatformState
    ) => {
      const normalizedUser = userObj ? normalizeManagedUser(userObj) : null;
      setUserSessionId(uid);
      try {
        localStorage.setItem(USER_SESSION_KEY, uid);
      } catch {
        // ignore
      }
      if (normalizedUser) {
        writeCachedUser(normalizedUser);
        upsertUserIntoLocalDb(normalizedUser);
        syncUserToFirestore(normalizedUser).catch(() => undefined);
      }

      let syncedServerState: PlatformState | undefined;
      if (normalizedUser) {
        try {
          const syncRes = await fetch('/api/auth/sync-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: normalizedUser }),
          });
          if (syncRes.ok) {
            const syncJson = (await syncRes.json()) as { state?: PlatformState };
            if (syncJson?.state) syncedServerState = syncJson.state;
          }
        } catch {
          // ignore if offline / static hosting
        }
      }

      const localView = loadLocalState(uid);
      const baseView =
        syncedServerState ??
        nextState ??
        (normalizedUser
          ? buildPlatformStateForUser(state ?? createClientSeedState(), normalizedUser)
          : localView);
      const mergedView = mergeUserCollections(baseView, localView);
      mergedView.config = { ...mergedView.config, platformName: FIXED_PLATFORM_NAME };
      setState(mergedView);

      const landing = mergedView.settings?.defaultLanding;
      navigate(VALID_ROUTES.includes(landing) ? landing : '/profile');
      return { ok: true };
    };

    // 1. Check Firebase Firestore (moorrcv) first
    const fsRes = await loginFirestoreUser(cleanEmail, cleanPass);
    if (fsRes.ok && fsRes.user) {
      return completeLogin(fsRes.user.id, fsRes.user);
    }

    // 2. Check Express API (/api/auth/login)
    const apiRes = await apiCall('/api/auth/login', 'POST', {
      email: cleanEmail,
      password: cleanPass,
    });
    if (apiRes && apiRes.ok && apiRes.userId) {
      const uid = String(apiRes.userId);
      const apiUser =
        (apiRes.user as ManagedUser | undefined) ??
        (loadRawLocalDb().users ?? []).find((u) => u.id === uid) ??
        null;
      return completeLogin(uid, apiUser, apiRes.state as PlatformState | undefined);
    }

    // 3. Check browser localStorage DB even if Express returned 401
    const localRes = executeLocalApi('/api/auth/login', 'POST', {
      email: cleanEmail,
      password: cleanPass,
    });
    if (localRes && localRes.ok && localRes.userId) {
      const uid = String(localRes.userId);
      const localUser =
        (localRes.user as ManagedUser | undefined) ??
        (loadRawLocalDb().users ?? []).find((u) => u.id === uid) ??
        null;
      return completeLogin(uid, localUser, localRes.state as PlatformState | undefined);
    }

    return {
      ok: false,
      error:
        (!fsRes.unavailable ? fsRes.error : undefined) ||
        (apiRes?.error as string | undefined) ||
        (localRes?.error as string | undefined) ||
        'البريد الإلكتروني أو كلمة المرور غير صحيحة',
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
        platformName={state?.config?.platformName ?? FIXED_PLATFORM_NAME}
        countryCode={state?.config?.countryCode ?? 'EG'}
        onRetry={() => fetchState(true)}
      />
    );
  }

  const { settings, config } = state;
  const lang = settings.lang;

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

          {(currentRoute === '/profile' || !VALID_ROUTES.includes(currentRoute)) && (
            <ProfilePage
              profile={state.profile}
              currentAccount={currentAccount}
              topUps={state.topUps}
              withdrawals={state.withdrawals}
              depositsCount={state.deposits.length}
              pendingDepositsCount={state.deposits.filter((d) => d.status === 'pending').length}
              pendingWithdrawalsCount={pendingMessagesCount}
              requisitesCount={state.requisites.length}
              devicesCount={state.androidDevices.length}
              settings={settings}
              triggerCreate={triggerTopUpCreate}
              onClearTriggerCreate={() => setTriggerTopUpCreate(false)}
              onNavigate={navigate}
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
