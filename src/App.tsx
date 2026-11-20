import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthBootLoader } from './components/AuthBootLoader';
import { CommandPalette } from './components/CommandPalette';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
import { t } from './i18n';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
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
  ManagedUser,
  PlatformState,
  Requisite,
  RoutePath,
  ToastMessage,
  TopUpRecord,
} from './types';
import { executeLocalApi, loadLocalState } from './utils/localStore';

const USER_SESSION_KEY = 'egyptpay_user_id';
const ADMIN_SESSION_KEY = 'egyptpay_admin_pass';
const VISITOR_ID_KEY = 'egyptpay_visitor_id';

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
  const visitorId = useMemo(() => getOrCreateVisitorId(), []);

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
        setState(data);
        if (effectiveUid && !data.authenticated) {
          try {
            localStorage.removeItem(USER_SESSION_KEY);
          } catch {
            // ignore
          }
          setUserSessionId(null);
        }
        const path = window.location.pathname;
        if (path === '/admin' || path === '/admin.php') {
          setCurrentRoute('/admin.php');
        } else if (!VALID_ROUTES.includes(path as RoutePath)) {
          setCurrentRoute(data.settings.defaultLanding || '/profile');
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

      try {
        const headers: Record<string, string> = {};
        if (effectiveUid) headers['x-user-id'] = effectiveUid;
        const res = await fetch('/api/state', { headers });
        const ct = res.headers.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) {
          applyLoadedState(loadLocalState(effectiveUid));
          return;
        }
        const data = (await res.json()) as PlatformState;
        applyLoadedState(data);
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

  // Load admin state if already authed as admin on /admin.php
  useEffect(() => {
    if (currentRoute === '/admin.php' && adminPassword) {
      apiCall('/api/admin/state', 'GET', undefined, userSessionId, adminPassword);
    }
  }, [currentRoute, adminPassword, apiCall, userSessionId]);

  // Real-time presence heartbeat every 10s
  useEffect(() => {
    const sendPing = () => {
      apiCall('/api/presence/ping', 'POST', {
        visitorId,
        userId: userSessionId,
        route: currentRoute,
      });
    };
    sendPing();
    const timer = setInterval(sendPing, 10_000);
    return () => clearInterval(timer);
  }, [visitorId, userSessionId, currentRoute, apiCall]);

  // Sync HTML dir/lang, document title, and layout classes
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
    const res = await apiCall('/api/auth/login', 'POST', { email, password });
    if (res && res.ok && res.userId) {
      const uid = String(res.userId);
      setUserSessionId(uid);
      try {
        localStorage.setItem(USER_SESSION_KEY, uid);
      } catch {
        // ignore
      }
      if (res.state) setState(res.state as PlatformState);
      navigate('/profile');
      return { ok: true };
    }
    return { ok: false, error: res?.error || 'بيانات الدخول مش صح' };
  };

  const handleLogout = async () => {
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
          adminAuthed={Boolean(adminPassword && adminState)}
          onAdminLogin={async (pass) => {
            const res = await apiCall('/api/admin/auth', 'POST', { password: pass }, userSessionId, pass);
            if (res && res.ok) {
              setAdminPassword(pass);
              try {
                sessionStorage.setItem(ADMIN_SESSION_KEY, pass);
              } catch {
                // ignore
              }
              if (res.state) setAdminState(res.state as PlatformState);
              return { ok: true };
            }
            return { ok: false, error: res?.error || 'كلمة مرور الأدمن مش صح' };
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
          onCreateUser={(payload) => apiCall('/api/admin/users', 'POST', payload)}
          onUpdateUser={(id, patch: Partial<ManagedUser>) =>
            apiCall(`/api/admin/users/${id}`, 'PATCH', patch)
          }
          onDeleteUser={(id) => apiCall(`/api/admin/users/${id}`, 'DELETE')}
          onSendWithdrawalToUser={(payload) =>
            apiCall('/api/admin/withdrawals/send', 'POST', payload)
          }
          onSendMessageToUser={(payload) =>
            apiCall('/api/admin/messages/send', 'POST', payload)
          }
          onCreateDepositForUser={(payload) =>
            apiCall('/api/admin/deposits', 'POST', payload)
          }
          onDepositAction={(id, action) =>
            apiCall(`/api/deposits/${id}`, 'PATCH', { action }).then(() =>
              apiCall('/api/admin/state', 'GET')
            )
          }
          onUpdateConfig={async (patch) => {
            await apiCall('/api/admin/config', 'PATCH', patch);
            if (patch.adminPassword) {
              setAdminPassword(patch.adminPassword);
              try {
                sessionStorage.setItem(ADMIN_SESSION_KEY, patch.adminPassword);
              } catch {
                // ignore
              }
            }
            await fetchState(false);
          }}
          onImpersonateUser={async (uid) => {
            setUserSessionId(uid);
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
        onToggleTradeStatus={(canTrade) =>
          apiCall('/api/accounts/trade-status', 'POST', {
            accountId: currentAccount.account_id,
            canTrade,
          }).then(() =>
            notify(
              canTrade ? 'success' : 'warning',
              t(lang, 'tradeStatus'),
              canTrade ? t(lang, 'active') : t(lang, 'paused')
            )
          )
        }
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
              onAction={(id, action, payload) =>
                apiCall(`/api/deposits/${id}`, 'PATCH', { action, ...payload })
              }
              onSimulateOrder={async () => {
                const res = await apiCall('/api/deposits/simulate', 'POST');
                if (res.created) {
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
              onCreate={(data: Partial<Requisite>) => apiCall('/api/requisites', 'POST', data)}
              onUpdate={(id, data) => apiCall(`/api/requisites/${id}`, 'PATCH', data)}
              onDelete={(id) => apiCall(`/api/requisites/${id}`, 'DELETE')}
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
                  notify(
                    res.message.status === 'matched' ? 'success' : 'warning',
                    lang === 'ar' ? 'وصلت رسالة جديدة' : 'New message received',
                    res.message.matchedOrderId ?? res.message.sender
                  );
                }
              }}
              onRespondWithdrawal={(messageId, action) =>
                apiCall(`/api/messages/${messageId}/withdrawal-response`, 'POST', { action })
              }
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
              onCreateTopUp={(amountUsdt: number, network: TopUpRecord['network']) =>
                apiCall('/api/topups', 'POST', { amountUsdt, network })
              }
              onToggle2FA={(enabled) =>
                apiCall('/api/profile', 'PATCH', { twoFactorEnabled: enabled })
              }
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
