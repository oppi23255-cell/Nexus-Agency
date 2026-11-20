import React, { useState } from 'react';
import {
  ChevronDown,
  CreditCard,
  Inbox,
  Landmark,
  LogOut,
  MinusSquare,
  MoreHorizontal,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PlusSquare,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
  X,
} from 'lucide-react';
import { t } from '../i18n';
import { AccountDesk, Language, RoutePath } from '../types';
import { formatNumber } from '../utils/format';
import { CountryFlagBadge, HostapayLogo } from './HpayIcons';

interface SidebarProps {
  lang: Language;
  platformName: string;
  currentRoute: RoutePath;
  onNavigate: (route: RoutePath) => void;
  accounts: AccountDesk[];
  currentAccount: AccountDesk;
  onSwitchAccount: (accountId: string) => void;
  onToggleTradeStatus: (canTrade: boolean) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onToggleLang: () => void;
  onShowLogin: () => void;
  openDisputesCount: number;
  availableWithdrawalsCount: number;
  pendingMessagesCount: number;
}

export function Sidebar({
  lang,
  platformName,
  currentRoute,
  onNavigate,
  accounts,
  currentAccount,
  onSwitchAccount,
  onToggleTradeStatus,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onOpenSearch,
  onOpenSettings,
  onToggleLang,
  onShowLogin,
  openDisputesCount,
  availableWithdrawalsCount,
  pendingMessagesCount,
}: SidebarProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    deposits: false,
    withdrawals: false,
    automatic: false,
  });
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNav = (route: RoutePath) => {
    onNavigate(route);
    onCloseMobile();
  };

  const isCollapsedDesktop = collapsed;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#141414] border-e border-[#202020] select-none">
      {/* Mobile Header inside drawer (exact match to screenshot 2) */}
      <div className="flex items-center justify-between px-4 h-[3.75rem] border-b border-[#202020] lg:hidden shrink-0">
        <HostapayLogo countryCode={currentAccount.countryCode} platformName={platformName} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenSettings();
            }}
            aria-label={t(lang, 'settingsTitle')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2c2c2c] bg-[#202020] text-[#aaaaaa] hover:text-white cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label={t(lang, 'close')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2c2c2c] bg-[#202020] text-[#aaaaaa] hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Trade status + Balance rows (exact match to screenshot 2) */}
      <div className={`shrink-0 ${isCollapsedDesktop ? 'lg:px-2.5 px-4' : 'px-4'} py-3 space-y-2.5 border-b border-[#202020]`}>
        {!isCollapsedDesktop ? (
          <>
            {/* Trade status card */}
            <div className="flex items-center justify-between rounded-[12px] border border-[#242424] bg-[#1a1a1a] px-3.5 py-2.5">
              <div className="text-[13.5px] font-medium text-[#b5b5b5]">
                {t(lang, 'tradeStatus')}:{' '}
                <span className="text-[#e25d0a] font-semibold">
                  {currentAccount.canTrade
                    ? lang === 'ar'
                      ? 'نشط'
                      : 'enable'
                    : lang === 'ar'
                    ? 'متوقف'
                    : 'disable'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={currentAccount.canTrade}
                aria-label={t(lang, 'tradeStatus')}
                onClick={() => onToggleTradeStatus(!currentAccount.canTrade)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  currentAccount.canTrade ? 'bg-[#e25d0a]' : 'bg-[#303030]'
                }`}
              >
                <span
                  className={`inline-block h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
                    currentAccount.canTrade
                      ? lang === 'ar'
                        ? '-translate-x-5.5'
                        : 'translate-x-5.5'
                      : lang === 'ar'
                      ? '-translate-x-1'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Balance row card */}
            <button
              type="button"
              onClick={() => handleNav('/profile')}
              className="flex w-full items-center justify-between rounded-[12px] border border-[#242424] bg-[#1a1a1a] px-3 py-2 hover:border-[#333333] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#242424] text-[#909090]">
                  <Landmark className="h-4 w-4" />
                </span>
                <span className="text-[14px] font-semibold font-mono-num text-white truncate">
                  {formatNumber(currentAccount.balanceUsdt)}
                </span>
              </div>
              <span className="text-[12.5px] font-semibold text-[#737373] shrink-0">
                {lang === 'ar' && currentAccount.currency === 'EGP' ? 'ج.م' : currentAccount.currency}
              </span>
            </button>
          </>
        ) : (
          <div className="hidden lg:flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleTradeStatus(!currentAccount.canTrade)}
              title={`${t(lang, 'tradeStatus')}: ${currentAccount.canTrade ? t(lang, 'active') : t(lang, 'paused')}`}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
                currentAccount.canTrade
                  ? 'border-[#e25d0a]/40 bg-[#e25d0a]/15 text-[#e25d0a]'
                  : 'border-[#303030] bg-[#252525] text-[#737373]'
              }`}
            >
              <Landmark className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* NAVIGATION header + Search pages [Ctrl K] */}
      <div className={`${isCollapsedDesktop ? 'lg:px-2.5 px-4' : 'px-4'} pt-3.5 pb-2 shrink-0`}>
        {!isCollapsedDesktop ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#737373]">
                {t(lang, 'navigation')}
              </span>
              <Network className="h-3.5 w-3.5 text-[#737373]" />
            </div>
            <button
              type="button"
              onClick={onOpenSearch}
              className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-[#242424] bg-[#1a1a1a] px-3 py-2 text-[13px] text-[#737373] hover:border-[#333333] hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t(lang, 'searchPages')}</span>
              </span>
              <span className="shrink-0 rounded-[5px] border border-[#2e2e2e] bg-[#222222] px-1.5 py-0.5 text-[10.5px] font-mono-num text-[#8e8e8e]">
                Ctrl K
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenSearch}
            title={t(lang, 'searchPages')}
            className="hidden lg:flex w-full items-center justify-center rounded-[10px] border border-[#252525] bg-[#1a1a1a] p-2 text-[#737373] hover:text-white cursor-pointer"
          >
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation Tree */}
      <nav className={`flex-1 overflow-y-auto sidebar-scroll ${isCollapsedDesktop ? 'lg:px-2 px-3' : 'px-3'} py-1 space-y-0.5`}>
        {/* Group: Deposits */}
        <div>
          <button
            type="button"
            onClick={() => (isCollapsedDesktop ? handleNav('/deposits') : toggleGroup('deposits'))}
            title={t(lang, 'depositsGroup')}
            className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
              currentRoute.startsWith('/deposits')
                ? 'bg-[#202020] text-white border border-[#2a2a2a]'
                : 'text-[#8e8e8e] hover:bg-[#1c1c1c] hover:text-white border border-transparent'
            } ${isCollapsedDesktop ? 'lg:justify-center' : ''}`}
          >
            <span className="flex items-center gap-3">
              <PlusSquare className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsedDesktop && <span className="whitespace-nowrap">{t(lang, 'depositsGroup')}</span>}
            </span>
            {!isCollapsedDesktop && (
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ${
                  openGroups.deposits ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>
          {!isCollapsedDesktop && openGroups.deposits && (
            <div className="mt-1 space-y-0.5 ps-7">
              <NavLeaf
                active={currentRoute === '/deposits'}
                label={t(lang, 'depositsListing')}
                onClick={() => handleNav('/deposits')}
              />
              <NavLeaf
                active={currentRoute === '/deposits/disputes'}
                label={t(lang, 'disputes')}
                badge={openDisputesCount > 0 ? openDisputesCount : undefined}
                badgeTone="danger"
                onClick={() => handleNav('/deposits/disputes')}
              />
            </div>
          )}
        </div>

        {/* Group: Withdrawals */}
        <div>
          <button
            type="button"
            onClick={() => (isCollapsedDesktop ? handleNav('/withdrawals') : toggleGroup('withdrawals'))}
            title={t(lang, 'withdrawalsGroup')}
            className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
              currentRoute.startsWith('/withdrawals')
                ? 'bg-[#202020] text-white border border-[#2a2a2a]'
                : 'text-[#8e8e8e] hover:bg-[#1c1c1c] hover:text-white border border-transparent'
            } ${isCollapsedDesktop ? 'lg:justify-center' : ''}`}
          >
            <span className="flex items-center gap-3">
              <MinusSquare className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsedDesktop && <span className="whitespace-nowrap">{t(lang, 'withdrawalsGroup')}</span>}
            </span>
            {!isCollapsedDesktop && (
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ${
                  openGroups.withdrawals ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>
          {!isCollapsedDesktop && openGroups.withdrawals && (
            <div className="mt-1 space-y-0.5 ps-7">
              <NavLeaf
                active={currentRoute === '/withdrawals'}
                label={t(lang, 'withdrawalsListing')}
                badge={availableWithdrawalsCount > 0 ? availableWithdrawalsCount : undefined}
                badgeTone="info"
                onClick={() => handleNav('/withdrawals')}
              />
              <NavLeaf
                active={currentRoute === '/withdrawals/my'}
                label={t(lang, 'myWithdrawals')}
                onClick={() => handleNav('/withdrawals/my')}
              />
            </div>
          )}
        </div>

        <SingleNavRow
          active={currentRoute === '/statistics'}
          collapsed={isCollapsedDesktop}
          icon={<TrendingUp className="h-[18px] w-[18px] shrink-0" />}
          label={t(lang, 'statistics')}
          onClick={() => handleNav('/statistics')}
        />

        <SingleNavRow
          active={currentRoute === '/requisite'}
          collapsed={isCollapsedDesktop}
          icon={<CreditCard className="h-[18px] w-[18px] shrink-0" />}
          label={t(lang, 'requisite')}
          onClick={() => handleNav('/requisite')}
        />

        {/* Group: Automatic */}
        <div>
          <button
            type="button"
            onClick={() => (isCollapsedDesktop ? handleNav('/automatic') : toggleGroup('automatic'))}
            title={t(lang, 'automaticGroup')}
            className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
              currentRoute.startsWith('/automatic')
                ? 'bg-[#202020] text-white border border-[#2a2a2a]'
                : 'text-[#8e8e8e] hover:bg-[#1c1c1c] hover:text-white border border-transparent'
            } ${isCollapsedDesktop ? 'lg:justify-center' : ''}`}
          >
            <span className="flex items-center gap-3">
              <Settings className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsedDesktop && <span className="whitespace-nowrap">{t(lang, 'automaticGroup')}</span>}
            </span>
            {!isCollapsedDesktop && (
              <ChevronDown
                className={`h-3.5 w-3.5 text-[#737373] transition-transform duration-150 ${
                  openGroups.automatic ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>
          {!isCollapsedDesktop && openGroups.automatic && (
            <div className="mt-1 space-y-0.5 ps-7">
              <NavLeaf
                active={currentRoute === '/automatic'}
                label={t(lang, 'android')}
                onClick={() => handleNav('/automatic')}
              />
              <NavLeaf
                active={currentRoute === '/automatic/telegram'}
                label={t(lang, 'telegram')}
                onClick={() => handleNav('/automatic/telegram')}
              />
              <NavLeaf
                active={currentRoute === '/automatic/api'}
                label={t(lang, 'api')}
                onClick={() => handleNav('/automatic/api')}
              />
            </div>
          )}
        </div>

        <SingleNavRow
          active={currentRoute === '/messages'}
          collapsed={isCollapsedDesktop}
          icon={<Inbox className="h-[18px] w-[18px] shrink-0" />}
          label={t(lang, 'messages')}
          badge={pendingMessagesCount > 0 ? pendingMessagesCount : undefined}
          onClick={() => handleNav('/messages')}
        />

        <SingleNavRow
          active={currentRoute === '/profile'}
          collapsed={isCollapsedDesktop}
          icon={<User className="h-[18px] w-[18px] shrink-0" />}
          label={t(lang, 'profile')}
          onClick={() => handleNav('/profile')}
        />

        <SingleNavRow
          active={currentRoute === '/referrals'}
          collapsed={isCollapsedDesktop}
          icon={<Users className="h-[18px] w-[18px] shrink-0" />}
          label={t(lang, 'referrals')}
          onClick={() => handleNav('/referrals')}
        />
      </nav>

      {/* Bottom Account Switcher Card (exact match to screenshot 2) */}
      <div className="relative shrink-0 border-t border-[#202020] p-3">
        {accountMenuOpen && !isCollapsedDesktop && (
          <div className="absolute bottom-[calc(100%+6px)] inset-x-3 z-20 rounded-[12px] border border-[#2c2c2c] bg-[#1a1a1a] p-1.5 shadow-2xl space-y-1">
            {accounts.map((acc) => (
              <button
                key={acc.account_id}
                type="button"
                onClick={() => {
                  onSwitchAccount(acc.account_id);
                  setAccountMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-[9px] px-2.5 py-2 text-start text-[12.5px] transition-colors cursor-pointer ${
                  acc.account_id === currentAccount.account_id
                    ? 'bg-[#252525] text-white font-semibold'
                    : 'text-[#aaaaaa] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0d9488]/20 text-[10px] font-bold text-[#2dd4bf]">
                    {acc.countryCode}
                  </span>
                  <span className="font-mono-num">{acc.username}</span>
                </span>
                <span className="text-[11px] text-[#737373]">{acc.currency}</span>
              </button>
            ))}

            <div className="my-1 h-px bg-[#252525]" />
            <div className="flex items-center justify-between px-2 py-1">
              <button
                type="button"
                onClick={() => {
                  onToggleLang();
                  setAccountMenuOpen(false);
                }}
                className="text-[11.5px] text-[#aaaaaa] hover:text-white cursor-pointer"
              >
                {lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onShowLogin();
                }}
                className="flex items-center gap-1 text-[11.5px] text-[#e32200] hover:underline cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>{t(lang, 'signOutPreview')}</span>
              </button>
            </div>
          </div>
        )}

        {!isCollapsedDesktop ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setAccountMenuOpen((o) => !o)}
              className="flex flex-1 min-w-0 items-center justify-between gap-2 rounded-[12px] border border-[#242424] bg-[#1a1a1a] px-3 py-2.5 hover:border-[#333333] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-[#1f1f1f] border border-[#2c2c2c]">
                  <CountryFlagBadge code={currentAccount.countryCode} />
                </span>
                <div className="min-w-0 text-start">
                  <div className="truncate text-[13px] font-semibold text-white font-mono-num">
                    {currentAccount.username}
                  </div>
                  <div className="text-[11px] text-[#737373]">
                    {currentAccount.countryCode} | {lang === 'ar' && currentAccount.currency === 'EGP' ? 'جنيه مصري' : currentAccount.currency}
                  </div>
                </div>
              </div>
              <MoreHorizontal className="h-4 w-4 text-[#737373] shrink-0" />
            </button>

            <button
              type="button"
              onClick={onToggleCollapse}
              title={t(lang, 'collapseSidebar')}
              aria-label={t(lang, 'collapseSidebar')}
              className="hidden lg:flex h-10 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#242424] bg-[#1a1a1a] text-[#737373] hover:text-white cursor-pointer"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={t(lang, 'expandSidebar')}
            aria-label={t(lang, 'expandSidebar')}
            className="hidden lg:flex w-full h-9 items-center justify-center rounded-[10px] border border-[#242424] bg-[#1a1a1a] text-[#909090] hover:text-white cursor-pointer"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:block fixed top-[3.75rem] bottom-0 start-0 z-30 transition-[width] duration-300 ${
          isCollapsedDesktop ? 'w-[4rem]' : 'w-[20rem]'
        }`}
      >
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="fixed top-0 bottom-0 start-0 w-[min(21rem,90vw)] z-50">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

function NavLeaf({
  active,
  label,
  badge,
  badgeTone,
  onClick,
}: {
  active: boolean;
  label: string;
  badge?: number;
  badgeTone?: 'danger' | 'info';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-[9px] px-2.5 py-2 text-[13px] transition-colors cursor-pointer ${
        active
          ? 'bg-[#202020] text-white font-semibold'
          : 'text-[#8a8a8a] hover:bg-[#1c1c1c] hover:text-white'
      }`}
    >
      <span className="truncate">{label}</span>
      {badge !== undefined && (
        <span
          className={`ms-2 shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-mono-num font-semibold ${
            badgeTone === 'danger'
              ? 'bg-[#e32200]/15 text-[#e32200]'
              : 'bg-[#3b82f6]/15 text-[#3b82f6]'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SingleNavRow({
  active,
  collapsed,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  collapsed: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2.5 text-[14px] font-medium transition-colors cursor-pointer ${
        collapsed ? 'lg:justify-center' : ''
      } ${
        active
          ? 'bg-[#202020] text-white border border-[#2a2a2a]'
          : 'text-[#8e8e8e] hover:bg-[#1c1c1c] hover:text-white border border-transparent'
      }`}
    >
      <span className="flex items-center gap-3 min-w-0">
        <span className={active ? 'text-white' : 'text-[#8e8e8e]'}>{icon}</span>
        {!collapsed && <span className="whitespace-nowrap truncate">{label}</span>}
      </span>
      {!collapsed && badge !== undefined && (
        <span className="shrink-0 rounded-md bg-[#e25d0a]/20 px-1.5 py-0.5 text-[11px] font-mono-num font-bold text-[#e25d0a]">
          {badge}
        </span>
      )}
    </button>
  );
}
