import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthBootLoader } from './components/AuthBootLoader';
import { CommandPalette } from './components/CommandPalette';
import { SettingsDrawer } from './components/SettingsDrawer';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopHeader } from './components/TopHeader';
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
  PlatformState,
  Requisite,
  RoutePath,
  ToastMessage,
  TopUpRecord,
} from './types';

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

function getInitialRoute(fallback: RoutePath = '/deposits'): RoutePath {
  const path = window.location.pathname as RoutePath;
  return VALID_ROUTES.includes(path) ? path : fallback;
}

export default function App() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootPhase, setBootPhase] = useState<'preparing' | 'accounts' | 'done'>('preparing');
  const [bootError, setBootError] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(() => getInitialRoute('/deposits'));
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [triggerRequisiteCreate, setTriggerRequisiteCreate] = useState(false);
  const [triggerTopUpCreate, setTriggerTopUpCreate] = useState(false);

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

  const fetchState = useCallback(async (withBootSequence = false) => {
    if (withBootSequence) {
      setBootPhase('preparing');
      setBootError(null);
    }
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to load state');
      const data = (await res.json()) as PlatformState;
      setState(data);
      const path = window.location.pathname as RoutePath;
      if (!VALID_ROUTES.includes(path)) {
        setCurrentRoute(data.settings.defaultLanding || '/deposits');
      }
      if (withBootSequence) {
        setTimeout(() => setBootPhase('accounts'), 420);
        setTimeout(() => {
          setBootPhase('done');
          setLoading(false);
        }, 980);
      } else {
        setBootPhase('done');
        setLoading(false);
      }
    } catch {
      setBootError('Failed to connect to trading desk');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState(true);
  }, [fetchState]);

  // Sync HTML dir/lang and body layout classes matching hpay.today
  useEffect(() => {
    if (!state) return;
    const { settings } = state;
    document.documentElement.lang = settings.lang;
    document.documentElement.dir = settings.lang === 'ar' ? 'rtl' : 'ltr';
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
      setCurrentRoute(getInitialRoute('/deposits'));
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

  const apiCall = useCallback(async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error('Request failed');
    const json = await res.json();
    if (json.state) {
      setState(json.state as PlatformState);
      return json;
    }
    setState(json as PlatformState);
    return json;
  }, []);

  const currentAccount = useMemo(() => {
    if (!state) return null;
    return (
      state.accounts.find((a) => a.account_id === state.currentAccountId) ??
      state.accounts[0]
    );
  }, [state]);

  const handleCommandExecute = async (route: RoutePath, action?: string) => {
    navigate(route);
    if (action === 'create' && route === '/requisite') {
      setTriggerRequisiteCreate(true);
    } else if (action === 'create' && route === '/profile') {
      setTriggerTopUpCreate(true);
    } else if (action === 'simulate' && route === '/deposits') {
      const res = await apiCall('/api/deposits/simulate', 'POST');
      if (state && res.created) {
        notify('success', state.settings.lang === 'ar' ? 'طلب إيداع جديد' : 'New deposit order', res.created.orderId);
      }
    }
  };

  if (loading || bootPhase !== 'done' || !state || !currentAccount) {
    return (
      <AuthBootLoader
        phase={bootPhase === 'done' ? 'accounts' : bootPhase}
        error={bootError}
        lang={state?.settings.lang ?? 'ar'}
        onRetry={() => fetchState(true)}
      />
    );
  }

  const { settings } = state;
  const lang = settings.lang;

  if (showLogin) {
    return (
      <LoginView
        lang={lang}
        onLogin={() => {
          setShowLogin(false);
          setLoading(true);
          fetchState(true);
        }}
        onToggleLang={() =>
          apiCall('/api/settings', 'PATCH', { lang: lang === 'ar' ? 'en' : 'ar' })
        }
      />
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

  return (
    <div className="min-h-dvh bg-[#141414] text-white">
      <TopHeader
        lang={lang}
        currentRoute={currentRoute}
        currentAccount={currentAccount}
        sidebarCollapsed={settings.sidebarCollapsedDesktop}
        onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <Sidebar
        lang={lang}
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
        onShowLogin={() => setShowLogin(true)}
        openDisputesCount={openDisputesCount}
        availableWithdrawalsCount={availableWithdrawalsCount}
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
                    lang === 'ar' ? 'تم استلام طلب إيداع جديد' : 'New deposit order received',
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
                    res.message.status === 'matched'
                      ? lang === 'ar'
                        ? 'تمت مطابقة الرسالة تلقائياً مع الطلب'
                        : 'SMS auto-matched to pending deposit'
                      : lang === 'ar'
                      ? 'وصلت رسالة بنكية جديدة'
                      : 'New bank SMS captured',
                    res.message.matchedOrderId ?? res.message.sender
                  );
                }
              }}
              onNotify={notify}
            />
          )}

          {currentRoute === '/profile' && (
            <ProfilePage
              profile={state.profile}
              currentAccount={currentAccount}
              topUps={state.topUps}
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
