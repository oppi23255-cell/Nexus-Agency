import React from 'react';
import {
  CreditCard,
  Inbox,
  Menu,
  MinusSquare,
  PanelRightOpen,
  PlusSquare,
  Settings,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { t, TranslationKey } from '../i18n';
import { AccountDesk, Language, RoutePath } from '../types';
import { HostapayLogo } from './HpayIcons';

interface TopHeaderProps {
  lang: Language;
  platformName: string;
  currentRoute: RoutePath;
  currentAccount: AccountDesk;
  sidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onOpenSettings: () => void;
}

const ROUTE_META: Record<RoutePath, { parent?: TranslationKey; title: TranslationKey; icon: React.ReactNode }> = {
  '/deposits': {
    parent: 'depositsGroup',
    title: 'depositsListing',
    icon: <PlusSquare className="h-[18px] w-[18px] text-white" />,
  },
  '/deposits/disputes': {
    parent: 'depositsGroup',
    title: 'disputes',
    icon: <PlusSquare className="h-[18px] w-[18px] text-[#e32200]" />,
  },
  '/withdrawals': {
    parent: 'withdrawalsGroup',
    title: 'withdrawalsListing',
    icon: <MinusSquare className="h-[18px] w-[18px] text-white" />,
  },
  '/withdrawals/my': {
    parent: 'withdrawalsGroup',
    title: 'myWithdrawals',
    icon: <MinusSquare className="h-[18px] w-[18px] text-white" />,
  },
  '/statistics': {
    title: 'statistics',
    icon: <TrendingUp className="h-[18px] w-[18px] text-white" />,
  },
  '/requisite': {
    title: 'requisite',
    icon: <CreditCard className="h-[18px] w-[18px] text-white" />,
  },
  '/automatic': {
    parent: 'automaticGroup',
    title: 'android',
    icon: <Settings className="h-[18px] w-[18px] text-white" />,
  },
  '/automatic/telegram': {
    parent: 'automaticGroup',
    title: 'telegram',
    icon: <Settings className="h-[18px] w-[18px] text-white" />,
  },
  '/automatic/api': {
    parent: 'automaticGroup',
    title: 'api',
    icon: <Settings className="h-[18px] w-[18px] text-white" />,
  },
  '/messages': {
    title: 'messages',
    icon: <Inbox className="h-[18px] w-[18px] text-white" />,
  },
  '/profile': {
    title: 'profile',
    icon: <User className="h-[18px] w-[18px] text-white" />,
  },
  '/referrals': {
    title: 'referrals',
    icon: <Users className="h-[18px] w-[18px] text-white" />,
  },
  '/admin.php': {
    title: 'profile',
    icon: <Settings className="h-[18px] w-[18px] text-[#e25d0a]" />,
  },
};

export function TopHeader({
  lang,
  platformName,
  currentRoute,
  currentAccount,
  sidebarCollapsed,
  onOpenMobileSidebar,
  onOpenSettings,
}: TopHeaderProps) {
  const meta = ROUTE_META[currentRoute] ?? ROUTE_META['/deposits'];
  const currLabel = lang === 'ar' && currentAccount.currency === 'EGP' ? 'ج.م' : currentAccount.currency;

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-[3.75rem] bg-[#141414] border-b border-[#202020] flex items-center">
      {/* Brand Zone aligned to sidebar width on lg+ */}
      <div
        className={`hidden lg:flex h-full items-center border-e border-[#202020] shrink-0 transition-[width] duration-300 ${
          sidebarCollapsed ? 'w-[4rem] justify-center px-0' : 'w-[20rem] px-5 justify-between'
        }`}
      >
        <HostapayLogo
          collapsed={sidebarCollapsed}
          countryCode={currentAccount.countryCode}
          platformName={platformName}
        />
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={onOpenSettings}
            title={t(lang, 'settingsTitle')}
            aria-label={t(lang, 'settingsTitle')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2c2c2c] bg-[#202020] text-[#aaaaaa] hover:text-white transition-colors cursor-pointer"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Header Content (exact match to screenshot 1) */}
      <div className="flex flex-1 min-w-0 items-center justify-between px-4 lg:px-5 gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open menu"
            className="lg:hidden flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2c2c2c] bg-[#202020] text-white hover:bg-[#2a2a2a] cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <span className="shrink-0">{meta.icon}</span>
            <div className="flex items-center gap-2 min-w-0 text-[15px]">
              {meta.parent && (
                <>
                  <span className="hidden sm:inline text-[#737373] font-medium whitespace-nowrap">
                    {t(lang, meta.parent)}
                  </span>
                  <span className="hidden sm:inline text-[#525252]">/</span>
                </>
              )}
              <h1 className="font-medium text-white truncate whitespace-nowrap">
                {t(lang, meta.title)}
              </h1>
            </div>
          </div>
        </div>

        {/* End Controls: Exchange rate pill + panel/settings button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center whitespace-nowrap rounded-[10px] bg-[#e25d0a]/12 px-3 py-1.5 text-[12.5px] font-semibold text-[#e25d0a] font-mono-num">
            1 USD = {currentAccount.rate.toFixed(2)} {currLabel}
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            title={t(lang, 'settingsTitle')}
            aria-label={t(lang, 'settingsTitle')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2c2c2c] bg-[#202020] text-[#aaaaaa] hover:bg-[#2a2a2a] hover:text-white transition-colors cursor-pointer"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
