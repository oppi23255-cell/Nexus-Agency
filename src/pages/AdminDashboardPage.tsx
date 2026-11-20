import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Download,
  Edit3,
  Globe,
  Lock,
  LogOut,
  MailPlus,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { CountryFlagBadge, HostapayLogo } from '../components/HpayIcons';
import { StatusBadge } from '../components/StatusBadge';
import { ManagedUser, PlatformState } from '../types';
import { formatDateTime, formatMoney, formatNumber } from '../utils/format';

interface AdminDashboardPageProps {
  state: PlatformState;
  adminAuthed: boolean;
  onAdminLogin: (password: string) => Promise<{ ok: boolean; error?: string }>;
  onAdminLogout: () => void;
  onRefreshAdmin: () => Promise<void>;
  onCreateUser: (payload: {
    email: string;
    password: string;
    displayName: string;
    username: string;
    balanceEgp: number;
    referralCode?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onUpdateUser: (
    userId: string,
    patch: Partial<ManagedUser>
  ) => Promise<{ ok: boolean; error?: string }>;
  onDeleteUser: (userId: string) => Promise<void>;
  onSendWithdrawalToUser: (payload: {
    userId: string;
    amountEgp: number;
    destinationMethod: string;
    requisiteNumber: string;
    recipientName: string;
    note?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSendMessageToUser: (payload: {
    userId: string;
    sender: string;
    body: string;
    amountEgp?: number;
  }) => Promise<void>;
  onCreateDepositForUser: (payload: {
    userId: string;
    amountEgp: number;
  }) => Promise<void>;
  onDepositAction: (id: string, action: 'confirm' | 'cancel') => Promise<void>;
  onUpdateConfig: (patch: {
    platformName?: string;
    usdRate?: number;
    adminPassword?: string;
  }) => Promise<void>;
  onImpersonateUser: (userId: string) => Promise<void>;
  onDownloadPhp: () => void;
  onGoToApp: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export function AdminDashboardPage({
  state,
  adminAuthed,
  onAdminLogin,
  onAdminLogout,
  onRefreshAdmin,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onSendWithdrawalToUser,
  onSendMessageToUser,
  onCreateDepositForUser,
  onDepositAction,
  onUpdateConfig,
  onImpersonateUser,
  onDownloadPhp,
  onGoToApp,
  onNotify,
}: AdminDashboardPageProps) {
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'orders' | 'settings'>('users');

  // Create user state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newBalance, setNewBalance] = useState('10000');

  // Edit user modal
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Withdrawal request form
  const users = state.users ?? [];
  const [wdUserId, setWdUserId] = useState(users[0]?.id ?? '');
  const [wdAmount, setWdAmount] = useState('1500');
  const [wdMethod, setWdMethod] = useState('فودافون كاش');
  const [wdNumber, setWdNumber] = useState('010');
  const [wdRecipient, setWdRecipient] = useState('');
  const [wdNote, setWdNote] = useState('');

  // Custom message / deposit form
  const [msgUserId, setMsgUserId] = useState(users[0]?.id ?? '');
  const [msgSender, setMsgSender] = useState('إدارة المنصة');
  const [msgBody, setMsgBody] = useState('');
  const [depUserId, setDepUserId] = useState(users[0]?.id ?? '');
  const [depAmount, setDepAmount] = useState('2500');

  // Config form
  const [platformNameInput, setPlatformNameInput] = useState(state.config.platformName);
  const [usdRateInput, setUsdRateInput] = useState(String(state.config.usdRate));
  const [newAdminPass, setNewAdminPass] = useState('');

  useEffect(() => {
    setPlatformNameInput(state.config.platformName);
    setUsdRateInput(String(state.config.usdRate));
  }, [state.config.platformName, state.config.usdRate]);

  useEffect(() => {
    if (!wdUserId && users[0]?.id) setWdUserId(users[0].id);
    if (!msgUserId && users[0]?.id) setMsgUserId(users[0].id);
    if (!depUserId && users[0]?.id) setDepUserId(users[0].id);
  }, [users, wdUserId, msgUserId, depUserId]);

  // Auto-refresh online users & state every 5 seconds while admin dashboard is open
  useEffect(() => {
    if (!adminAuthed) return;
    const timer = setInterval(() => {
      onRefreshAdmin().catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [adminAuthed, onRefreshAdmin]);

  if (!adminAuthed) {
    return (
      <div
        dir="rtl"
        className="min-h-dvh w-full bg-[#111111] flex items-center justify-center p-4 text-white"
      >
        <div className="w-full max-w-[420px] rounded-[18px] border border-[#252525] bg-[#151515] p-7 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <HostapayLogo
              platformName={state.config.platformName}
              countryCode={state.config.countryCode}
            />
            <span className="rounded-lg border border-[#e25d0a]/40 bg-[#e25d0a]/10 px-2.5 py-1 text-[11px] font-mono-num font-bold text-[#e25d0a]">
              admin.php
            </span>
          </div>

          <div>
            <h1 className="text-[20px] font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#e25d0a]" />
              <span>لوحة تحكم الأدمن</span>
            </h1>
            <p className="mt-1 text-[13px] text-[#8a8a8a]">
              تحكم كامل في الحسابات، الأرصدة بالجنيه المصري، طلبات السحب، والمتصلين أونلاين.
            </p>
          </div>

          {loginError && (
            <div className="rounded-[10px] border border-[#e32200]/40 bg-[#e32200]/10 px-3.5 py-2.5 text-[12.5px] text-[#ff6b57]">
              {loginError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError(null);
              const res = await onAdminLogin(adminPassInput);
              if (!res.ok) {
                setLoginError(res.error || 'كلمة مرور الأدمن مش صحيحة');
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#aaaaaa] block">
                كلمة مرور الأدمن
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-[#737373]" />
                <input
                  type="password"
                  required
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="أدخل كلمة مرور الإدارة"
                  className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] ps-10 pe-3 py-2.5 text-[13.5px] text-white outline-none focus:border-[#e25d0a]"
                />
              </div>
              <div className="text-[11px] text-[#737373]">
                كلمة المرور الافتراضية للتجربة: <span className="font-mono-num text-[#db9d37]">admin123</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-[10px] bg-[#e25d0a] py-3 text-[14px] font-semibold text-white hover:bg-[#e25d0a]/85 cursor-pointer"
            >
              دخول لوحة الإدارة
            </button>
          </form>

          <button
            type="button"
            onClick={onGoToApp}
            className="w-full text-center text-[12.5px] text-[#8a8a8a] hover:text-white cursor-pointer"
          >
            الرجوع للمنصة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  const totalBalanceEgp = users.reduce((sum, u) => sum + (u.balanceEgp || 0), 0);
  const onlineList = state.onlinePresence ?? [];
  const onlineCount = state.onlineCount ?? onlineList.length;
  const adminWithdrawals = state.withdrawals.filter((w) => w.adminCreated || w.userId);
  const pendingConfirmCount = state.messages.filter(
    (m) => m.withdrawalActionStatus === 'pending_confirmation'
  ).length;

  return (
    <div dir="rtl" className="min-h-dvh bg-[#141414] text-white flex flex-col">
      {/* Admin Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-[#222222] bg-[#151515]/95 backdrop-blur px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HostapayLogo
            platformName={state.config.platformName}
            countryCode={state.config.countryCode}
          />
          <span className="rounded-md border border-[#e25d0a]/40 bg-[#e25d0a]/10 px-2 py-0.5 text-[11px] font-mono-num font-bold text-[#e25d0a]">
            admin.php · تحكم كامل
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Live Online Users Pill */}
          <div className="flex items-center gap-2 rounded-[10px] border border-[#00e344]/30 bg-[#00e344]/10 px-3 py-1.5 text-[12.5px] font-semibold text-[#00e344]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e344] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e344]" />
            </span>
            <span>أونلاين دلوقتي:</span>
            <span className="font-mono-num font-bold text-[14px]">{onlineCount}</span>
          </div>

          <button
            type="button"
            onClick={() => onRefreshAdmin()}
            title="تحديث فوري"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2c2c2c] bg-[#1b1b1b] text-[#aaaaaa] hover:text-white cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onGoToApp}
            className="hidden sm:flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2c2c2c] bg-[#1b1b1b] px-3 text-[12.5px] text-white hover:bg-[#242424] cursor-pointer"
          >
            <span>بوابة المستخدمين</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onAdminLogout}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#e32200]/30 bg-[#e32200]/10 px-3 text-[12.5px] text-[#ff6b57] hover:bg-[#e32200]/20 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Live KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-[14px] border border-[#242424] bg-[#191919] p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#8a8a8a]">المستخدمين أونلاين حاليًا</div>
              <div className="mt-1 text-[26px] font-bold font-mono-num text-[#00e344]">
                {onlineCount}
              </div>
              <div className="text-[11px] text-[#737373]">
                تحديث تلقائي كل 5 ثواني
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00e344]/15 text-[#00e344]">
              <Activity className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[14px] border border-[#242424] bg-[#191919] p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#8a8a8a]">إجمالي الحسابات المسجلة</div>
              <div className="mt-1 text-[26px] font-bold font-mono-num text-white">
                {users.length}
              </div>
              <div className="text-[11px] text-[#737373]">
                مفعّل: {users.filter((u) => u.active).length}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b5ae2]/15 text-[#3b82f6]">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[14px] border border-[#242424] bg-[#191919] p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#8a8a8a]">مجموع أرصدة الحسابات</div>
              <div className="mt-1 text-[22px] font-bold font-mono-num text-[#db9d37]">
                {formatMoney(totalBalanceEgp)} ج.م
              </div>
              <div className="text-[11px] text-[#737373]">بالجنيه المصري</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#db9d37]/15 text-[#db9d37]">
              <Coins className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-[14px] border border-[#242424] bg-[#191919] p-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] text-[#8a8a8a]">طلبات سحب مستنية موافقة</div>
              <div className="mt-1 text-[26px] font-bold font-mono-num text-[#e25d0a]">
                {pendingConfirmCount}
              </div>
              <div className="text-[11px] text-[#737373]">من رسايل المستخدمين</div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e25d0a]/15 text-[#e25d0a]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Live Online Sessions Strip */}
        {onlineList.length > 0 && (
          <div className="rounded-[12px] border border-[#242424] bg-[#181818] p-3.5">
            <div className="text-[12px] font-semibold text-[#a0a0a0] mb-2 flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-[#00e344]" />
              <span>المتصلين الفعليين الآن ({onlineCount}):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {onlineList.map((entry) => (
                <div
                  key={entry.visitorId}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#141414] px-3 py-1.5 text-[12px]"
                >
                  <span className="h-2 w-2 rounded-full bg-[#00e344]" />
                  <span className="font-semibold text-white">
                    {entry.userName || entry.email || 'زائر على شاشة الدخول'}
                  </span>
                  <span className="font-mono-num text-[11px] text-[#737373]">
                    {entry.route}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 rounded-[12px] border border-[#252525] bg-[#181818] p-1.5">
          {(
            [
              { id: 'users', label: 'المستخدمين والبروفايلات', icon: Users },
              { id: 'withdrawals', label: 'طلبات السحب والخصم', icon: Send },
              { id: 'orders', label: 'الإيداعات والرسايل', icon: MailPlus },
              { id: 'settings', label: 'اسم المنصة و admin.php', icon: Globe },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2 rounded-[9px] px-4 py-2 text-[13px] font-semibold transition-colors cursor-pointer ${
                  tab === item.id
                    ? 'bg-[#e25d0a] text-white'
                    : 'text-[#909090] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: USERS & PROFILES */}
        {tab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Create New Account Card */}
            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4 h-fit">
              <div className="flex items-center gap-2 text-[15px] font-bold text-white">
                <UserPlus className="h-4.5 w-4.5 text-[#e25d0a]" />
                <span>إنشاء حساب جديد بالبريد الإلكتروني</span>
              </div>
              <p className="text-[12px] text-[#8a8a8a]">
                اول ما تنشئ الحساب هنا، الشخص يقدر يكتب بريده والباسورد ويفتح معاه بروفايله على طول.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await onCreateUser({
                    email: newEmail.trim(),
                    password: newPassword,
                    displayName: newDisplayName.trim() || newEmail.split('@')[0],
                    username:
                      newUsername.trim() ||
                      `${newEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')}_egp`,
                    balanceEgp: Number(newBalance) || 0,
                  });
                  if (res.ok) {
                    onNotify('success', 'تم إنشاء الحساب بنجاح', newEmail);
                    setNewEmail('');
                    setNewPassword('');
                    setNewDisplayName('');
                    setNewUsername('');
                    setNewBalance('10000');
                  } else {
                    onNotify('error', res.error || 'تعذر إنشاء الحساب');
                  }
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">البريد الإلكتروني *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@domain.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">كلمة المرور *</label>
                  <input
                    type="text"
                    required
                    placeholder="كلمة مرور الدخول"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#aaaaaa]">الاسم</label>
                    <input
                      type="text"
                      placeholder="محمد أحمد"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#aaaaaa]">اليوزرنيم</label>
                    <input
                      type="text"
                      placeholder="mohamed_egp"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">الرصيد الابتدائي (جنيه مصري)</label>
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13.5px] font-bold font-mono-num text-[#00e344] outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#e25d0a] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إنشاء الحساب وتفعيله</span>
                </button>
              </form>
            </div>

            {/* Users Table */}
            <div className="lg:col-span-2 rounded-[14px] border border-[#252525] bg-[#181818] overflow-hidden flex flex-col">
              <div className="border-b border-[#242424] px-5 py-3.5 flex items-center justify-between">
                <span className="text-[14.5px] font-bold text-white">
                  كل الحسابات والبروفايلات ({users.length})
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-[13px]">
                  <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
                    <tr>
                      <th className="py-3 px-4 text-start">البروفايل</th>
                      <th className="py-3 px-4 text-start">البريد والباسورد</th>
                      <th className="py-3 px-4 text-start">الرصيد (ج.م)</th>
                      <th className="py-3 px-4 text-start">الحالة</th>
                      <th className="py-3 px-4 text-start">تحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                    {users.map((u) => {
                      const isOnline = onlineList.some((p) => p.userId === u.id);
                      return (
                        <tr key={u.id} className="hover:bg-[#1e1e1e]">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <CountryFlagBadge code="EG" />
                              <div>
                                <div className="font-semibold text-white flex items-center gap-1.5">
                                  <span>{u.displayName}</span>
                                  {isOnline && (
                                    <span
                                      title="أونلاين الآن"
                                      className="h-2 w-2 rounded-full bg-[#00e344]"
                                    />
                                  )}
                                </div>
                                <div className="text-[11px] font-mono-num text-[#737373]">
                                  {u.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono-num text-[12px]">
                            <div className="text-white">{u.email}</div>
                            <div className="text-[#db9d37]">pass: {u.password}</div>
                          </td>
                          <td className="py-3 px-4 font-mono-num font-bold text-[#00e344] whitespace-nowrap">
                            {formatMoney(u.balanceEgp)} ج.م
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => onUpdateUser(u.id, { active: !u.active })}
                              className="cursor-pointer"
                            >
                              <StatusBadge status={u.active ? 'active' : 'inactive'} lang="ar" />
                            </button>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditBalance(String(u.balanceEgp));
                                  setEditPassword(u.password);
                                  setEditDisplayName(u.displayName);
                                  setEditEmail(u.email);
                                }}
                                title="تعديل الحساب والرصيد"
                                className="rounded-lg border border-[#303030] bg-[#222222] p-1.5 text-[#aaaaaa] hover:text-white cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onImpersonateUser(u.id)}
                                title="فتح بروفايل المستخدم"
                                className="rounded-lg border border-[#1b5ae2]/40 bg-[#1b5ae2]/15 px-2 py-1 text-[11px] font-semibold text-[#60a5fa] hover:bg-[#1b5ae2]/25 cursor-pointer"
                              >
                                فتح حسابه
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteUser(u.id)}
                                title="حذف الحساب"
                                className="rounded-lg border border-[#e32200]/30 bg-[#e32200]/10 p-1.5 text-[#ff6b57] hover:bg-[#e32200]/20 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Edit User Modal Inline Bar */}
              {editingUser && (
                <div className="border-t border-[#303030] bg-[#141414] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13.5px] font-bold text-[#e25d0a]">
                      تعديل بيانات: {editingUser.displayName}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="text-[12px] text-[#8a8a8a] hover:text-white cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      placeholder="الاسم"
                      className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[12.5px] text-white outline-none"
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      placeholder="البريد"
                      className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[12.5px] text-white outline-none"
                    />
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="الباسورد"
                      className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[12.5px] text-white outline-none"
                    />
                    <input
                      type="number"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      placeholder="الرصيد (ج.م)"
                      className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[12.5px] font-mono-num text-[#00e344] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await onUpdateUser(editingUser.id, {
                        displayName: editDisplayName,
                        email: editEmail,
                        password: editPassword,
                        balanceEgp: Number(editBalance) || 0,
                      });
                      onNotify('success', 'تم تحديث بيانات الحساب');
                      setEditingUser(null);
                    }}
                    className="rounded-[9px] bg-[#00e344] px-4 py-2 text-[12.5px] font-bold text-black hover:opacity-90 cursor-pointer"
                  >
                    حفظ التعديلات
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN WITHDRAWAL REQUESTS -> USER MESSAGES */}
        {tab === 'withdrawals' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4 h-fit">
              <div className="flex items-center gap-2 text-[15px] font-bold text-white">
                <Send className="h-4.5 w-4.5 text-[#e25d0a]" />
                <span>إرسال طلب سحب لمستخدم</span>
              </div>
              <p className="text-[12px] text-[#8a8a8a]">
                الطلب هيتبعت فوراً لقسم <strong>الرسايل</strong> عند المستخدم. لو أكده بيتخصم من رصيده فوراً، ولو رفضه الرصيد يفضل زي ما هو.
              </p>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const res = await onSendWithdrawalToUser({
                    userId: wdUserId,
                    amountEgp: Number(wdAmount) || 0,
                    destinationMethod: wdMethod,
                    requisiteNumber: wdNumber,
                    recipientName: wdRecipient || 'تحويل سحب',
                    note: wdNote,
                  });
                  if (res.ok) {
                    onNotify('success', 'تم إرسال طلب السحب لرسايل المستخدم');
                    setWdNote('');
                  } else {
                    onNotify('error', res.error || 'حصل خطأ في إرسال الطلب');
                  }
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">اختر المستخدم / البروفايل</label>
                  <select
                    value={wdUserId}
                    onChange={(e) => setWdUserId(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} ({u.email}) · {formatMoney(u.balanceEgp)} ج.م
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">المبلغ المطلوب سحبه (جنيه مصري)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={wdAmount}
                    onChange={(e) => setWdAmount(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[14px] font-bold font-mono-num text-[#db9d37] outline-none focus:border-[#e25d0a]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#aaaaaa]">طريقة التحويل</label>
                    <input
                      type="text"
                      required
                      value={wdMethod}
                      onChange={(e) => setWdMethod(e.target.value)}
                      className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#aaaaaa]">رقم المحفظة / الحساب</label>
                    <input
                      type="text"
                      required
                      value={wdNumber}
                      onChange={(e) => setWdNumber(e.target.value)}
                      className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] font-mono-num text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">اسم المستلم</label>
                  <input
                    type="text"
                    value={wdRecipient}
                    onChange={(e) => setWdRecipient(e.target.value)}
                    placeholder="اسم المستلم أو الملاحظة"
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">نص الرسالة للمستخدم (اختياري)</label>
                  <textarea
                    rows={2}
                    value={wdNote}
                    onChange={(e) => setWdNote(e.target.value)}
                    placeholder="طلب سحب من رصيدك، برجاء التأكيد أو الرفض من الرسايل"
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[12.5px] text-white outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 rounded-[10px] bg-[#e25d0a] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                  <span>إرسال طلب السحب للرسايل</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 rounded-[14px] border border-[#252525] bg-[#181818] overflow-hidden">
              <div className="border-b border-[#242424] px-5 py-3.5 text-[14.5px] font-bold text-white">
                سجل طلبات السحب وردود المستخدمين
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-[13px]">
                  <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
                    <tr>
                      <th className="py-3 px-4 text-start">رقم الطلب</th>
                      <th className="py-3 px-4 text-start">المستخدم</th>
                      <th className="py-3 px-4 text-start">المبلغ</th>
                      <th className="py-3 px-4 text-start">الوجهة</th>
                      <th className="py-3 px-4 text-start">رد المستخدم</th>
                      <th className="py-3 px-4 text-start">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222222]">
                    {adminWithdrawals.map((w) => {
                      const u = users.find((usr) => usr.id === w.userId);
                      return (
                        <tr key={w.id} className="hover:bg-[#1e1e1e]">
                          <td className="py-3 px-4 font-mono-num text-white">{w.orderId}</td>
                          <td className="py-3 px-4 text-[#cccccc]">
                            {u ? u.displayName : 'عام'}
                          </td>
                          <td className="py-3 px-4 font-mono-num font-bold text-[#db9d37]">
                            {formatMoney(w.amountLocal)} ج.م
                          </td>
                          <td className="py-3 px-4 text-[#aaaaaa]">
                            <div>{w.destinationMethod}</div>
                            <div className="text-[11px] font-mono-num text-[#737373]">{w.requisiteNumber}</div>
                          </td>
                          <td className="py-3 px-4">
                            {w.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#00e344]">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>أكده واتخصم</span>
                              </span>
                            ) : w.status === 'cancelled' ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#ff6b57]">
                                <XCircle className="h-3.5 w-3.5" />
                                <span>رفضه (متخصمش)</span>
                              </span>
                            ) : (
                              <StatusBadge status={w.status} lang="ar" />
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono-num text-[11.5px] text-[#737373]">
                            {formatDateTime(w.createdAt, state.settings)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ORDERS & MESSAGES CONTROL */}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4">
              <div className="text-[15px] font-bold text-white">إرسال رسالة لبروفايل مستخدم</div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onSendMessageToUser({
                    userId: msgUserId,
                    sender: msgSender,
                    body: msgBody,
                  });
                  setMsgBody('');
                  onNotify('success', 'تم إرسال الرسالة للمستخدم');
                }}
                className="space-y-3"
              >
                <select
                  value={msgUserId}
                  onChange={(e) => setMsgUserId(e.target.value)}
                  className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={msgSender}
                  onChange={(e) => setMsgSender(e.target.value)}
                  placeholder="المرسل (مثال: إدارة المنصة)"
                  className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                />
                <textarea
                  rows={3}
                  required
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="اكتب نص الرسالة..."
                  className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                />
                <button
                  type="submit"
                  className="rounded-[10px] bg-[#1b5ae2] px-4 py-2 text-[13px] font-semibold text-white cursor-pointer"
                >
                  إرسال الرسالة الآن
                </button>
              </form>
            </div>

            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4">
              <div className="text-[15px] font-bold text-white">إنشاء طلب إيداع لمستخدم</div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await onCreateDepositForUser({
                    userId: depUserId,
                    amountEgp: Number(depAmount) || 1000,
                  });
                  onNotify('success', 'تم إضافة طلب الإيداع');
                }}
                className="space-y-3"
              >
                <select
                  value={depUserId}
                  onChange={(e) => setDepUserId(e.target.value)}
                  className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  required
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  placeholder="المبلغ بالجنيه المصري"
                  className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13.5px] font-mono-num text-white outline-none"
                />
                <button
                  type="submit"
                  className="rounded-[10px] bg-[#e25d0a] px-4 py-2 text-[13px] font-semibold text-white cursor-pointer"
                >
                  إرسال طلب الإيداع
                </button>
              </form>

              <div className="pt-2 border-t border-[#242424] space-y-2 max-h-56 overflow-y-auto scrollbar-dark">
                {state.deposits.slice(0, 8).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg border border-[#242424] bg-[#141414] px-3 py-2 text-[12px]"
                  >
                    <div>
                      <span className="font-mono-num font-bold text-white">{d.orderId}</span>
                      <span className="mx-2 text-[#db9d37] font-mono-num">
                        {formatMoney(d.amountLocal)} ج.م
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={d.status} lang="ar" />
                      {d.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => onDepositAction(d.id, 'confirm')}
                            className="rounded bg-[#00e344] px-2 py-0.5 text-[11px] font-bold text-black cursor-pointer"
                          >
                            تأكيد
                          </button>
                          <button
                            type="button"
                            onClick={() => onDepositAction(d.id, 'cancel')}
                            className="rounded bg-[#e32200]/20 px-2 py-0.5 text-[11px] text-[#ff6b57] cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PLATFORM CONFIG & PHP DOWNLOAD */}
        {tab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4">
              <div className="text-[15px] font-bold text-white">إعدادات اسم المنصة وسعر الصرف</div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">اسم المنصة (بيظهر جنب علم مصر)</label>
                  <input
                    type="text"
                    value={platformNameInput}
                    onChange={(e) => setPlatformNameInput(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[14px] font-semibold text-white outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">سعر الدولار مقابل الجنيه المصري</label>
                  <input
                    type="number"
                    step="0.01"
                    value={usdRateInput}
                    onChange={(e) => setUsdRateInput(e.target.value)}
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[14px] font-mono-num text-[#db9d37] outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[12px] text-[#aaaaaa]">تغيير كلمة مرور الأدمن (اختياري)</label>
                  <input
                    type="text"
                    value={newAdminPass}
                    onChange={(e) => setNewAdminPass(e.target.value)}
                    placeholder="سيبه فاضي لو مش عايز تغيرها"
                    className="w-full rounded-[9px] border border-[#303030] bg-[#121212] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                  />
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await onUpdateConfig({
                      platformName: platformNameInput.trim() || state.config.platformName,
                      usdRate: Number(usdRateInput) || state.config.usdRate,
                      ...(newAdminPass.trim() ? { adminPassword: newAdminPass.trim() } : {}),
                    });
                    setNewAdminPass('');
                    onNotify('success', 'تم حفظ إعدادات المنصة');
                  }}
                  className="rounded-[10px] bg-[#e25d0a] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 cursor-pointer"
                >
                  حفظ الإعدادات
                </button>
              </div>
            </div>

            <div className="rounded-[14px] border border-[#252525] bg-[#181818] p-5 space-y-4">
              <div className="text-[15px] font-bold text-white">نسخة PHP الكاملة (admin.php)</div>
              <p className="text-[13px] text-[#8a8a8a] leading-relaxed">
                متوفر ملف <span className="font-mono-num text-white">admin.php</span> مكتوب بلغة الـ PHP بالكامل داخل مشروعك لو رفعته على استضافة cPanel / Apache / Nginx، وبيشتغل مباشرة على نفس قاعدة البيانات <span className="font-mono-num text-white">data/hpay-db.json</span>. وكمان المسار <span className="font-mono-num text-[#e25d0a]">/admin.php</span> شغال لايف هنا على طول.
              </p>
              <button
                type="button"
                onClick={onDownloadPhp}
                className="inline-flex items-center gap-2 rounded-[10px] border border-[#303030] bg-[#222222] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2a2a2a] cursor-pointer"
              >
                <Download className="h-4 w-4 text-[#e25d0a]" />
                <span>تحميل ملف admin.php الأصلي</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
