import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  CreditCard,
  HelpCircle,
  Inbox,
  Landmark,
  MinusSquare,
  Plus,
  PlusSquare,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BottomBar } from '../components/BottomBar';
import { DetailDrawer } from '../components/DetailDrawer';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AccountDesk, AppSettings, RoutePath, TopUpRecord, UserProfile, WithdrawalOrder } from '../types';
import { formatDateTime, formatMoney, formatNumber } from '../utils/format';

export function ProfilePage({
  profile,
  currentAccount,
  topUps,
  withdrawals,
  depositsCount = 0,
  pendingDepositsCount = 0,
  pendingWithdrawalsCount = 0,
  requisitesCount = 0,
  devicesCount = 0,
  settings,
  triggerCreate,
  onClearTriggerCreate,
  onCreateTopUp,
  onToggle2FA,
  onNavigate,
  onNotify,
}: {
  profile: UserProfile;
  currentAccount: AccountDesk;
  topUps: TopUpRecord[];
  withdrawals: WithdrawalOrder[];
  depositsCount?: number;
  pendingDepositsCount?: number;
  pendingWithdrawalsCount?: number;
  requisitesCount?: number;
  devicesCount?: number;
  settings: AppSettings;
  triggerCreate: boolean;
  onClearTriggerCreate: () => void;
  onCreateTopUp: (amountUsdt: number, network: TopUpRecord['network']) => Promise<void>;
  onToggle2FA: (enabled: boolean) => Promise<void>;
  onNavigate?: (route: RoutePath) => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const currLabel = t(lang, 'currencyShort');
  const [accountInfoOpen, setAccountInfoOpen] = useState(true);
  const [balanceHistoryOpen, setBalanceHistoryOpen] = useState(true);
  const [historyTab, setHistoryTab] = useState<'deposit' | 'withdrawals'>('deposit');
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [amountInput, setAmountInput] = useState('1000');
  const [network, setNetwork] = useState<TopUpRecord['network']>('TRC-20');
  const [page, setPage] = useState(1);

  const safePlayerId = profile.playerId || profile.traderId || 'PL-00000001';
  const safeUuid = currentAccount.uuid || '01a1a848-4f12-7901-b4a2-884019e3c102';
  const safeEmail = profile.email || '—';
  const safeTrc20 = profile.trc20Address || 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1';

  useEffect(() => {
    if (triggerCreate) {
      setTopUpOpen(true);
      onClearTriggerCreate();
    }
  }, [triggerCreate, onClearTriggerCreate]);

  const copyVal = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify('success', t(lang, 'copied'), val);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  const quickSections: Array<{
    route: RoutePath;
    title: string;
    desc: string;
    count?: number;
    icon: React.ReactNode;
    accent: string;
  }> = [
    {
      route: '/deposits',
      title: t(lang, 'depositsListing'),
      desc: lang === 'ar' ? 'متابعة وتأكيد طلبات الإيداع' : 'Manage & confirm incoming deposits',
      count: depositsCount,
      icon: <PlusSquare className="h-4.5 w-4.5" />,
      accent: 'text-[#00e344] bg-[#00e344]/10 border-[#00e344]/25',
    },
    {
      route: '/withdrawals',
      title: t(lang, 'withdrawalsListing'),
      desc: lang === 'ar' ? 'سوق السحوبات وتنفيذ الحوالات' : 'Claim & complete payout orders',
      count: withdrawals.length,
      icon: <MinusSquare className="h-4.5 w-4.5" />,
      accent: 'text-[#3b82f6] bg-[#3b82f6]/10 border-[#3b82f6]/25',
    },
    {
      route: '/requisite',
      title: t(lang, 'requisite'),
      desc: lang === 'ar' ? 'فودافون كاش · إنستا باي · البنوك' : 'Wallets, InstaPay & Bank accounts',
      count: requisitesCount,
      icon: <CreditCard className="h-4.5 w-4.5" />,
      accent: 'text-[#db9d37] bg-[#db9d37]/10 border-[#db9d37]/25',
    },
    {
      route: '/messages',
      title: t(lang, 'messages'),
      desc: lang === 'ar' ? 'رسائل التأكيد والتنبيهات الفورية' : 'Incoming alerts & withdrawal confirmations',
      count: pendingWithdrawalsCount,
      icon: <Inbox className="h-4.5 w-4.5" />,
      accent: 'text-[#e25d0a] bg-[#e25d0a]/10 border-[#e25d0a]/25',
    },
    {
      route: '/statistics',
      title: t(lang, 'statistics'),
      desc: lang === 'ar' ? 'ملخص الأرباح وحجم التداول' : 'Volume, profit & conversion metrics',
      icon: <TrendingUp className="h-4.5 w-4.5" />,
      accent: 'text-[#a855f7] bg-[#a855f7]/10 border-[#a855f7]/25',
    },
    {
      route: '/automatic',
      title: t(lang, 'automaticGroup'),
      desc: lang === 'ar' ? 'أجهزة أندرويد وبوتات التليجرام و API' : 'Android SMS, Telegram & API keys',
      count: devicesCount,
      icon: <Settings className="h-4.5 w-4.5" />,
      accent: 'text-[#14b8a6] bg-[#14b8a6]/10 border-[#14b8a6]/25',
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#141414]">
      <div className="flex-1 overflow-y-auto scrollbar-dark">
        {/* Top Overview Banner & Live KPI Strip */}
        <div className="border-b border-[#202020] px-4 lg:px-6 py-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#242424] bg-gradient-to-l from-[#e25d0a]/10 via-[#191919] to-[#191919] px-4 py-3.5">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-white">
                  {lang === 'ar'
                    ? `أهلاً بك، ${profile.displayName || currentAccount.username}`
                    : `Welcome, ${profile.displayName || currentAccount.username}`}
                </h2>
                <span className="rounded-md border border-[#e25d0a]/35 bg-[#e25d0a]/15 px-2 py-0.5 font-mono-num text-[11px] font-bold text-[#e25d0a]">
                  {safePlayerId}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    currentAccount.canTrade
                      ? 'border border-[#00e344]/35 bg-[#00e344]/10 text-[#00e344]'
                      : 'border border-[#525252]/40 bg-[#252525] text-[#a0a0a0]'
                  }`}
                >
                  {currentAccount.canTrade ? t(lang, 'active') : t(lang, 'paused')}
                </span>
              </div>
              <div className="text-[12.5px] text-[#8a8a8a]">
                {lang === 'ar'
                  ? 'لوحة التحكم مكتملة وجاهزة للعمل — يمكنك متابعة رصيدك، الإيداعات، السحوبات، ووسائل الدفع مباشرة.'
                  : 'Your trading desk is active and ready — manage balance, deposits, withdrawals, and payment methods.'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTopUpOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#e25d0a] hover:bg-[#e25d0a]/90 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>{lang === 'ar' ? 'شحن رصيد جديد' : 'Top up balance'}</span>
              </button>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('/referrals')}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#2c2c2c] bg-[#1f1f1f] hover:border-[#404040] px-3 py-2 text-[13px] font-medium text-[#d4d4d8] hover:text-white transition-colors cursor-pointer"
                >
                  <Users className="h-4 w-4 text-[#db9d37]" />
                  <span>{t(lang, 'referrals')}</span>
                </button>
              )}
            </div>
          </div>

          {/* 4 Live KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3">
              <div className="text-[12px] text-[#8a8a8a]">{t(lang, 'balance')}</div>
              <div className="mt-1 font-mono-num text-[18px] font-bold text-[#00e344]">
                {formatNumber(currentAccount.balanceUsdt)} {currLabel}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3">
              <div className="text-[12px] text-[#8a8a8a]">{t(lang, 'frozen')}</div>
              <div className="mt-1 font-mono-num text-[18px] font-bold text-[#db9d37]">
                {formatNumber(currentAccount.frozenUsdt)} {currLabel}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3">
              <div className="text-[12px] text-[#8a8a8a]">
                {lang === 'ar' ? 'الإيداعات / قيد التأكيد' : 'Deposits / Pending'}
              </div>
              <div className="mt-1 font-mono-num text-[18px] font-bold text-white">
                {depositsCount}{' '}
                <span className="text-[12px] font-medium text-[#db9d37]">
                  ({pendingDepositsCount} {lang === 'ar' ? 'معلق' : 'pending'})
                </span>
              </div>
            </div>
            <div className="rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3">
              <div className="text-[12px] text-[#8a8a8a]">
                {lang === 'ar' ? 'طلبات السحب والوسائل' : 'Withdrawals & Methods'}
              </div>
              <div className="mt-1 font-mono-num text-[18px] font-bold text-white">
                {withdrawals.length}{' '}
                <span className="text-[12px] font-medium text-[#60a5fa]">
                  · {requisitesCount} {lang === 'ar' ? 'وسيلة' : 'methods'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Workspace Navigation */}
          {onNavigate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickSections.map((item) => (
                <button
                  key={item.route}
                  type="button"
                  onClick={() => onNavigate(item.route)}
                  className="flex items-center justify-between gap-3 rounded-[12px] border border-[#242424] bg-[#191919] hover:border-[#e25d0a]/50 hover:bg-[#1e1e1e] px-4 py-3 text-start transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border ${item.accent}`}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11.5px] text-[#7c7c85] truncate">{item.desc}</div>
                    </div>
                  </div>
                  {item.count !== undefined && (
                    <span className="shrink-0 rounded-md border border-[#2c2c2c] bg-[#141414] px-2 py-0.5 font-mono-num text-[12px] font-bold text-[#d4d4d8]">
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 1: Account info */}
        <div className="border-b border-[#202020]">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3.5">
            <div className="flex items-center gap-2.5 text-[14.5px] font-medium text-white">
              <HelpCircle className="h-[18px] w-[18px] text-[#909090]" />
              <span>{lang === 'ar' ? 'بيانات الحساب' : 'Account info'}</span>
            </div>
            <button
              type="button"
              onClick={() => setAccountInfoOpen((o) => !o)}
              aria-label="Toggle account info"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] text-[#909090] hover:text-white cursor-pointer"
            >
              {accountInfoOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {accountInfoOpen && (
            <div className="px-4 lg:px-6 pb-5 pt-1">
              <div className="flex gap-3 overflow-x-auto scrollbar-dark pb-2">
                {/* Unique Random Player ID tile */}
                <div className="shrink-0 min-w-[180px] rounded-[12px] border border-[#e25d0a]/30 bg-[#e25d0a]/[0.07] px-4 py-3.5">
                  <div className="flex items-center gap-2 text-[12px] text-[#db9d37]">
                    <span>{lang === 'ar' ? 'ID اللاعب' : 'Player ID'}</span>
                    <button
                      type="button"
                      onClick={() => copyVal(safePlayerId)}
                      className="text-[#db9d37] hover:text-white cursor-pointer"
                      aria-label={t(lang, 'copy')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 font-mono-num text-[14px] font-bold text-white">
                    {safePlayerId}
                  </div>
                </div>

                {/* Account ID tile */}
                <div className="shrink-0 min-w-[295px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="flex items-center gap-2 text-[12px] text-[#8a8a8a]">
                    <span>{lang === 'ar' ? 'معرف الحساب' : 'account id'}</span>
                    <button
                      type="button"
                      onClick={() => copyVal(safeUuid)}
                      className="text-[#8a8a8a] hover:text-white cursor-pointer"
                      aria-label={t(lang, 'copy')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1.5 font-mono-num text-[13px] font-semibold text-white">
                    {safeUuid}
                  </div>
                </div>

                {/* Available Balance in EGP */}
                <div className="shrink-0 min-w-[165px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="text-[12px] text-[#8a8a8a]">{t(lang, 'balance')}</div>
                  <div className="mt-1.5 font-mono-num text-[14px] font-bold text-[#00e344]">
                    {formatNumber(currentAccount.balanceUsdt)} {currLabel}
                  </div>
                </div>

                {/* Email / Owner tile */}
                <div className="shrink-0 min-w-[210px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="text-[12px] text-[#8a8a8a]">
                    {lang === 'ar' ? 'البريد الإلكتروني' : 'email'}
                  </div>
                  <div className="mt-1.5 font-mono-num text-[13px] font-semibold text-white truncate">
                    {safeEmail}
                  </div>
                </div>

                {/* Insurance tile */}
                <div className="shrink-0 min-w-[135px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="text-[12px] text-[#8a8a8a]">
                    {lang === 'ar' ? 'التأمين' : 'insurance'}
                  </div>
                  <div className="mt-1.5 font-mono-num text-[14px] font-semibold text-white">
                    {currentAccount.insuranceAmount != null
                      ? `${formatNumber(currentAccount.insuranceAmount)} ${currLabel}`
                      : `— ${currLabel}`}
                  </div>
                </div>

                {/* Deposit & Withdrawal fee tiles */}
                <div className="shrink-0 min-w-[130px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="text-[12px] text-[#8a8a8a]">
                    {lang === 'ar' ? 'عمولة الإيداع' : 'deposit fee'}
                  </div>
                  <div className="mt-1.5 font-mono-num text-[14px] font-semibold text-[#00e344]">
                    {currentAccount.depositFeePct ?? 3.0}%
                  </div>
                </div>

                <div className="shrink-0 min-w-[130px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5">
                  <div className="text-[12px] text-[#8a8a8a]">
                    {lang === 'ar' ? 'عمولة السحب' : 'withdrawal fee'}
                  </div>
                  <div className="mt-1.5 font-mono-num text-[14px] font-semibold text-[#3b82f6]">
                    {currentAccount.withdrawalFeePct ?? 1.8}%
                  </div>
                </div>

                {/* 2FA Toggle tile */}
                <div className="shrink-0 min-w-[175px] rounded-[12px] border border-[#242424] bg-[#191919] px-4 py-3.5 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[12px] text-[#8a8a8a]">2FA</div>
                    <div className="mt-1 text-[13px] font-semibold text-white">
                      {profile.twoFactorEnabled ? t(lang, 'active') : t(lang, 'paused')}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.twoFactorEnabled}
                    onClick={async () => {
                      await onToggle2FA(!profile.twoFactorEnabled);
                      onNotify('success', t(lang, 'security2fa'));
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      profile.twoFactorEnabled ? 'bg-[#e25d0a]' : 'bg-[#333333]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                        profile.twoFactorEnabled
                          ? 'translate-x-4.5 rtl:-translate-x-4.5'
                          : 'translate-x-1 rtl:-translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Balance history */}
        <div className="px-4 lg:px-6 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[14.5px] font-medium text-white">
              <Landmark className="h-[18px] w-[18px] text-[#909090]" />
              <span>{lang === 'ar' ? 'سجل الرصيد والعمليات' : 'Balance history'}</span>
            </div>
            <button
              type="button"
              onClick={() => setBalanceHistoryOpen((o) => !o)}
              aria-label="Toggle balance history"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1f1f1f] text-[#909090] hover:text-white cursor-pointer"
            >
              {balanceHistoryOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>

          {balanceHistoryOpen && (
            <div className="space-y-3.5">
              <div className="flex flex-col items-start gap-3">
                <button
                  type="button"
                  onClick={() => setTopUpOpen(true)}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-[#e25d0a] hover:bg-[#e25d0a]/90 px-4 py-2 text-[13.5px] font-semibold text-white transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{lang === 'ar' ? 'شحن رصيد جديد' : 'Create new'}</span>
                </button>

                <div className="inline-flex items-center rounded-[10px] border border-[#242424] bg-[#191919] p-1">
                  <button
                    type="button"
                    onClick={() => setHistoryTab('deposit')}
                    className={`rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                      historyTab === 'deposit' ? 'bg-[#2a2a2a] text-white' : 'text-[#8a8a8a] hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'إيداعات الشحن' : 'Deposit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryTab('withdrawals')}
                    className={`rounded-[7px] px-4 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                      historyTab === 'withdrawals' ? 'bg-[#2a2a2a] text-white' : 'text-[#8a8a8a] hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'سجل السحوبات' : 'Withdrawals'}
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-[#242424] bg-[#191919] overflow-hidden">
                {historyTab === 'deposit' ? (
                  topUps.length === 0 ? (
                    <div className="py-10 text-center text-[13.5px] text-[#737373]">
                      {t(lang, 'nothingFound')}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-start text-[13px]">
                        <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
                          <tr>
                            <th className="py-2.5 px-4 text-start">TX Hash</th>
                            <th className="py-2.5 px-4 text-start">{lang === 'ar' ? 'الشبكة' : 'Network'}</th>
                            <th className="py-2.5 px-4 text-start">{t(lang, 'amount')}</th>
                            <th className="py-2.5 px-4 text-start">{t(lang, 'status')}</th>
                            <th className="py-2.5 px-4 text-start">{t(lang, 'date')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#202020]">
                          {topUps.map((tp) => (
                            <tr key={tp.id} className="hover:bg-[#202021]">
                              <td className="py-3 px-4 font-mono-num text-[#aaaaaa] max-w-[240px] truncate">
                                {tp.txHash}
                              </td>
                              <td className="py-3 px-4 font-mono-num text-white">{tp.network}</td>
                              <td className="py-3 px-4 font-mono-num font-semibold text-[#00e344]">
                                +{formatNumber(tp.amountUsdt)} {currLabel}
                              </td>
                              <td className="py-3 px-4">
                                <StatusBadge status={tp.status} lang={lang} />
                              </td>
                              <td className="py-3 px-4 font-mono-num text-[12px] text-[#737373]">
                                {formatDateTime(tp.createdAt, settings)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                ) : withdrawals.length === 0 ? (
                  <div className="py-10 text-center text-[13.5px] text-[#737373]">
                    {t(lang, 'nothingFound')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-start text-[13px]">
                      <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
                        <tr>
                          <th className="py-2.5 px-4 text-start">{t(lang, 'orderId')}</th>
                          <th className="py-2.5 px-4 text-start">{t(lang, 'destinationMethod')}</th>
                          <th className="py-2.5 px-4 text-start">{t(lang, 'amount')}</th>
                          <th className="py-2.5 px-4 text-start">{t(lang, 'status')}</th>
                          <th className="py-2.5 px-4 text-start">{t(lang, 'date')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#202020]">
                        {withdrawals.map((wd) => (
                          <tr key={wd.id} className="hover:bg-[#202021]">
                            <td className="py-3 px-4 font-mono-num text-white">{wd.orderId}</td>
                            <td className="py-3 px-4 text-[#cccccc]">
                              <div>{wd.destinationMethod}</div>
                              <div className="text-[11.5px] font-mono-num text-[#737373]">{wd.requisiteNumber}</div>
                            </td>
                            <td className="py-3 px-4 font-mono-num font-semibold text-white">
                              {formatMoney(wd.amountLocal)} {currLabel}
                            </td>
                            <td className="py-3 px-4">
                              <StatusBadge status={wd.status} lang={lang} />
                            </td>
                            <td className="py-3 px-4 font-mono-num text-[12px] text-[#737373]">
                              {formatDateTime(wd.createdAt, settings)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <BottomBar
        lang={lang}
        page={page}
        totalPages={1}
        onPageChange={setPage}
        onRefresh={() => onNotify('success', t(lang, 'refresh'))}
      />

      {/* Create Top-Up Slide-Over Drawer */}
      <DetailDrawer
        open={topUpOpen}
        lang={lang}
        section={t(lang, 'profile')}
        title={t(lang, 'createTopUp')}
        onClose={() => setTopUpOpen(false)}
        actions={[
          {
            label: t(lang, 'createTopUp'),
            tone: 'primary',
            onClick: async () => {
              const val = Number(amountInput) || 1000;
              await onCreateTopUp(val, network);
              setTopUpOpen(false);
              onNotify('success', t(lang, 'status_credited'), `+${formatMoney(val)} ${currLabel}`);
            },
          },
        ]}
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center rounded-[12px] border border-[#242424] bg-[#1a1a1a] p-4 gap-3">
            <QrCodeSvg value={safeTrc20} size={136} />
            <div className="text-[11.5px] text-[#8a8a8a]">{t(lang, 'depositAddress')}</div>
            <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#2c2c2c] bg-[#141414] px-3 py-2">
              <span className="font-mono-num text-[12px] text-white truncate">{safeTrc20}</span>
              <button
                type="button"
                onClick={() => copyVal(safeTrc20)}
                className="text-[#909090] hover:text-white shrink-0 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#aaaaaa]">
              {lang === 'ar' ? `المبلغ (${currLabel})` : `Amount (${currLabel})`}
            </label>
            <input
              type="number"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-full rounded-[10px] border border-[#303030] bg-[#1a1a1a] px-3 py-2 text-[15px] font-bold font-mono-num text-white outline-none focus:border-[#e25d0a]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#aaaaaa]">
              {lang === 'ar' ? 'الشبكة / الوسيلة' : 'Network'}
            </label>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value as TopUpRecord['network'])}
              className="w-full rounded-[10px] border border-[#303030] bg-[#1a1a1a] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
            >
              <option value="TRC-20">USDT TRC-20 (تحويل فوري للجنيه)</option>
              <option value="BEP-20">USDT BEP-20 (BSC)</option>
              <option value="TON">USDT TON</option>
            </select>
          </div>
        </div>
      </DetailDrawer>
    </div>
  );
}
