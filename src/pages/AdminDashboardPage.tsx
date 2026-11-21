import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  Database,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Hash,
  KeyRound,
  Lock,
  LogOut,
  MailPlus,
  Plus,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { CountryFlagBadge, HostapayLogo } from '../components/HpayIcons';
import { StatusBadge } from '../components/StatusBadge';
import { ManagedUser, PlatformState } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export type FirebaseConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'permission-error'
  | 'offline';

interface AdminDashboardPageProps {
  state: PlatformState;
  adminAuthed: boolean;
  firebaseStatus?: FirebaseConnectionStatus;
  firebaseError?: string | null;
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
  }) => Promise<{ ok: boolean; error?: string; user?: ManagedUser }>;
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
    userId?: string;
    identifier?: string;
    amountEgp: number;
    bankName?: string;
    note?: string;
    autoCredit?: boolean;
  }) => Promise<{ ok: boolean; error?: string; user?: ManagedUser }>;
  onDepositAction: (id: string, action: 'confirm' | 'cancel') => Promise<void>;
  onUpdateConfig: (patch: {
    platformName?: string;
    usdRate?: number;
    adminPassword?: string;
  }) => Promise<void>;
  onImpersonateUser: (userId: string) => Promise<void>;
  onDownloadPhp: () => void;
  onRetryFirebase?: () => Promise<void>;
  onGoToApp: () => void;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

const FIRESTORE_OPEN_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;

const PAYMENT_METHOD_CHIPS = [
  'فودافون كاش',
  'إنستا باي',
  'اتصالات كاش',
  'أورانج كاش',
  'تحويل بنكي',
];

const WD_PRESET_AMOUNTS = [500, 1000, 2500, 5000, 10000];

function generateStrongPin(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = 'EG-';
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function AdminDashboardPage({
  state,
  adminAuthed,
  firebaseStatus = 'connected',
  firebaseError,
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
  onRetryFirebase,
  onGoToApp,
  onNotify,
}: AdminDashboardPageProps) {
  const [adminPassInput, setAdminPassInput] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [retryingFirebase, setRetryingFirebase] = useState(false);
  const [tab, setTab] = useState<'users' | 'withdrawals' | 'orders' | 'settings'>('users');
  const [userSearch, setUserSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPassIds, setRevealedPassIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create user state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

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
  const [sendingWd, setSendingWd] = useState(false);

  // Instant Deposit request form (next to withdrawal)
  const [instantDepIdentifier, setInstantDepIdentifier] = useState('');
  const [instantDepAmount, setInstantDepAmount] = useState('2500');
  const [instantDepMethod, setInstantDepMethod] = useState('إيداع فوري من الإدارة');
  const [instantDepNote, setInstantDepNote] = useState('');
  const [sendingDep, setSendingDep] = useState(false);

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
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    setPlatformNameInput(state.config.platformName);
    setUsdRateInput(String(state.config.usdRate));
  }, [state.config.platformName, state.config.usdRate]);

  useEffect(() => {
    if ((!wdUserId || !users.some((u) => u.id === wdUserId)) && users[0]?.id) {
      setWdUserId(users[0].id);
    }
    if ((!msgUserId || !users.some((u) => u.id === msgUserId)) && users[0]?.id) {
      setMsgUserId(users[0].id);
    }
    if ((!depUserId || !users.some((u) => u.id === depUserId)) && users[0]?.id) {
      setDepUserId(users[0].id);
    }
  }, [users, wdUserId, msgUserId, depUserId]);

  // Periodic background sync as fallback alongside Firestore real-time listeners
  useEffect(() => {
    if (!adminAuthed) return;
    const timer = setInterval(() => {
      onRefreshAdmin().catch(() => undefined);
    }, 8000);
    return () => clearInterval(timer);
  }, [adminAuthed, onRefreshAdmin]);

  const matchedDepUser = useMemo(() => {
    const qRaw = instantDepIdentifier.trim().toLowerCase();
    if (!qRaw) return null;
    const qNoAt = qRaw.replace(/^@/, '');
    return (
      users.find(
        (u) =>
          u.email.trim().toLowerCase() === qRaw ||
          u.username.trim().toLowerCase().replace(/^@/, '') === qNoAt ||
          (u.playerId || '').trim().toLowerCase() === qRaw
      ) ?? null
    );
  }, [users, instantDepIdentifier]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.playerId || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const copyText = (key: string, text: string, label: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    setCopiedId(key);
    onNotify('success', `تم النسخ: ${label}`, text);
    setTimeout(() => setCopiedId((prev) => (prev === key ? null : prev)), 1800);
  };

  if (!adminAuthed) {
    return (
      <div
        dir="rtl"
        className="min-h-dvh w-full bg-[#0d0d0e] bg-[radial-gradient(ellipse_at_top,_rgba(226,93,10,0.12),transparent_55%)] flex items-center justify-center p-4 text-white"
      >
        <div className="w-full max-w-[440px] rounded-[20px] border border-[#28282a] bg-[#151517]/95 p-7 shadow-[0_28px_70px_rgba(0,0,0,0.65)] space-y-6">
          <div className="flex items-center justify-between">
            <HostapayLogo
              platformName={state.config.platformName}
              countryCode={state.config.countryCode}
            />
            <div className="flex items-center gap-1.5">
              <span className="rounded-lg border border-[#e25d0a]/40 bg-[#e25d0a]/10 px-2.5 py-1 text-[11px] font-mono-num font-bold text-[#e25d0a]">
                admin.php
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-[21px] font-bold text-white flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e25d0a]/15 text-[#e25d0a] border border-[#e25d0a]/30">
                <Shield className="h-5 w-5" />
              </span>
              <span>لوحة تحكم الإدارة</span>
            </h1>
            <p className="text-[13px] text-[#8d8d92]">
              ربط مباشر بقاعدة بيانات Firebase (<span className="font-mono-num text-[#db9d37]">moorrcv</span>) لإدارة اللاعبين، الأرصدة، السحب، واسم المنصة لايف.
            </p>
          </div>

          {loginError && (
            <div className="rounded-[12px] border border-[#e32200]/40 bg-[#e32200]/10 px-3.5 py-2.5 text-[12.5px] text-[#ff6b57]">
              {loginError}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setLoginError(null);
              setLoggingIn(true);
              try {
                const res = await onAdminLogin(adminPassInput);
                if (!res.ok) {
                  setLoginError(res.error || 'كلمة مرور الأدمن مش صحيحة');
                }
              } finally {
                setLoggingIn(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#b5b5bb] block">
                كلمة مرور الأدمن
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3.5 h-4 w-4 text-[#73737a]" />
                <input
                  type="password"
                  required
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  placeholder="أدخل كلمة مرور الإدارة"
                  className="w-full rounded-[11px] border border-[#323236] bg-[#1b1b1e] ps-10 pe-3 py-2.5 text-[14px] text-white outline-none focus:border-[#e25d0a] transition-colors"
                />
              </div>
              <div className="flex items-center justify-between text-[11.5px] text-[#73737a]">
                <span>
                  كلمة المرور الافتراضية:{' '}
                  <span className="font-mono-num text-[#db9d37]">admin123</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[#00e344]">
                  <Database className="h-3 w-3" />
                  moorrcv
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-[11px] bg-[#e25d0a] py-3 text-[14px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loggingIn ? 'جاري التحقق والدخول...' : 'دخول لوحة الإدارة'}
            </button>
          </form>

          <button
            type="button"
            onClick={onGoToApp}
            className="w-full text-center text-[12.5px] text-[#8d8d92] hover:text-white cursor-pointer"
          >
            الرجوع لبوابة المستخدمين
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
  const pendingDepositsCount = state.deposits.filter((d) => d.status === 'pending').length;

  const navItems = [
    {
      id: 'users' as const,
      label: 'اللاعبين والحسابات',
      sub: 'إنشاء و ID عشوائي',
      icon: Users,
      badge: users.length,
    },
    {
      id: 'withdrawals' as const,
      label: 'طلبات السحب والإيداع',
      sub: 'سحب بالرسايل وإيداع فوري',
      icon: Send,
      badge: pendingConfirmCount > 0 ? pendingConfirmCount : undefined,
      badgeColor: 'bg-[#e25d0a] text-white',
    },
    {
      id: 'orders' as const,
      label: 'الإيداعات والرسايل',
      sub: 'رسايل مباشرة وإيداع',
      icon: MailPlus,
      badge: pendingDepositsCount > 0 ? pendingDepositsCount : undefined,
      badgeColor: 'bg-[#db9d37] text-black',
    },
    {
      id: 'settings' as const,
      label: 'إعدادات المنصة والصرف',
      sub: 'سعر الصرف و admin.php',
      icon: Globe,
    },
  ];

  return (
    <div dir="rtl" className="min-h-dvh bg-[#0e0e10] text-white flex flex-col">
      {/* Executive Sticky Top Command Bar */}
      <header className="sticky top-0 z-30 border-b border-[#222226] bg-[#141416]/95 backdrop-blur-md px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <HostapayLogo
            platformName={state.config.platformName}
            countryCode={state.config.countryCode}
          />
          <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-[#e25d0a]/40 bg-[#e25d0a]/10 px-2.5 py-0.5 text-[11px] font-mono-num font-bold text-[#e25d0a]">
            admin.php
          </span>

          {/* Firebase Connection Pill */}
          {firebaseStatus === 'connected' ? (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#00e344]/30 bg-[#00e344]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00e344]">
              <Database className="h-3 w-3" />
              <span>Firebase لايف: moorrcv</span>
            </span>
          ) : firebaseStatus === 'permission-error' ? (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#db9d37]/40 bg-[#db9d37]/15 px-2.5 py-1 text-[11px] font-semibold text-[#db9d37]">
              <AlertTriangle className="h-3 w-3" />
              <span>Firebase يحتاج تفعيل Rules</span>
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#323236] bg-[#1b1b1e] px-2.5 py-1 text-[11px] text-[#9b9ba2]">
              <Database className="h-3 w-3" />
              <span>مزامنة Firebase...</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Live Online Users Pill */}
          <div className="flex items-center gap-2 rounded-[10px] border border-[#00e344]/30 bg-[#00e344]/10 px-3 py-1.5 text-[12.5px] font-semibold text-[#00e344]">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00e344] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00e344]" />
            </span>
            <span className="hidden xs:inline">أونلاين الآن:</span>
            <span className="font-mono-num font-bold text-[14px]">{onlineCount}</span>
          </div>

          <button
            type="button"
            onClick={() => onRefreshAdmin()}
            title="تحديث فوري"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2c2c30] bg-[#1b1b1e] text-[#a0a0a8] hover:text-white hover:border-[#3e3e44] cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onGoToApp}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#2c2c30] bg-[#1b1b1e] px-3 text-[12.5px] font-medium text-white hover:bg-[#242428] cursor-pointer"
          >
            <span className="hidden sm:inline">فتح المنصة</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-[#e25d0a]" />
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

      {/* Main Executive Shell: Left/Start Sidebar + Content */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-5">
        {/* Desktop Navigation Rail */}
        <aside className="lg:w-64 shrink-0 space-y-3">
          <div className="rounded-[16px] border border-[#232327] bg-[#151518] p-2.5 grid grid-cols-2 lg:grid-cols-1 gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center justify-between gap-2 rounded-[11px] px-3 py-2.5 text-start transition-all cursor-pointer ${
                    active
                      ? 'bg-[#e25d0a] text-white shadow-[0_8px_20px_rgba(226,93,10,0.28)]'
                      : 'text-[#a3a3ab] hover:bg-[#1e1e22] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-bold truncate">{item.label}</div>
                      <div
                        className={`hidden lg:block text-[10.5px] truncate ${
                          active ? 'text-white/80' : 'text-[#6c6c74]'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-mono-num font-bold ${
                        active
                          ? 'bg-black/25 text-white'
                          : item.badgeColor || 'bg-[#25252a] text-[#d4d4d8]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Platform Summary Box in Sidebar */}
          <div className="hidden lg:block rounded-[16px] border border-[#232327] bg-[#151518] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-semibold text-[#8d8d95]">اسم المنصة (مثبّت)</span>
              <CountryFlagBadge code={state.config.countryCode} />
            </div>
            <div className="text-[15px] font-bold text-white truncate flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-[#00e344] shrink-0" />
              <span>{state.config.platformName}</span>
            </div>
            <div className="pt-2 border-t border-[#232327] flex items-center justify-between text-[12px]">
              <span className="text-[#8d8d95]">سعر الصرف</span>
              <span className="font-mono-num font-bold text-[#db9d37]">
                1 USD = {state.config.usdRate} ج.م
              </span>
            </div>
            <button
              type="button"
              onClick={() => setTab('settings')}
              className="w-full rounded-[9px] border border-[#2c2c32] bg-[#1c1c20] py-1.5 text-[12px] font-semibold text-[#d4d4d8] hover:text-white hover:border-[#e25d0a]/50 cursor-pointer"
            >
              إعدادات سعر الصرف والأمان
            </button>
          </div>
        </aside>

        {/* Workspace Column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Firestore Rules Warning Banner (only shown if permission-denied/disabled on moorrcv) */}
          {firebaseStatus === 'permission-error' && (
            <div className="rounded-[14px] border border-[#db9d37]/40 bg-[#db9d37]/10 p-4 flex flex-col gap-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[13.5px] font-bold text-[#db9d37]">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      ملاحظة Firestore (moorrcv): الحسابات والدخول شغالين الآن عبر السيرفر والمتصفح مباشرة
                    </span>
                  </div>
                  <p className="text-[12px] text-[#d4c39a] leading-relaxed">
                    لمزامنة الحسابات سحابيًا بين <span className="font-mono-num">admin.php</span> والموقع عبر جميع الأجهزة، فعّل Cloud Firestore في مشروع{' '}
                    <span className="font-mono-num font-bold text-white">moorrcv</span> واضبط Rules ثم اضغط{' '}
                    <strong className="text-white">فحص الاتصال ومزامنة الحسابات</strong>.
                    {firebaseError ? ` (${firebaseError})` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=moorrcv"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#e25d0a]/50 bg-[#e25d0a]/15 px-3 py-2 text-[12px] font-semibold text-[#ff9352] hover:bg-[#e25d0a]/25"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>تفعيل Firestore في moorrcv</span>
                  </a>
                  <a
                    href="https://console.firebase.google.com/project/moorrcv/firestore/rules"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#db9d37]/50 bg-[#1a1610] px-3 py-2 text-[12px] font-semibold text-[#db9d37] hover:bg-[#272115]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>فتح Rules</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => copyText('rules', FIRESTORE_OPEN_RULES, 'قواعد Firestore')}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#db9d37]/50 bg-[#1a1610] px-3 py-2 text-[12px] font-semibold text-[#db9d37] hover:bg-[#272115] cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ قواعد Firestore</span>
                  </button>
                  {onRetryFirebase && (
                    <button
                      type="button"
                      disabled={retryingFirebase}
                      onClick={async () => {
                        setRetryingFirebase(true);
                        try {
                          await onRetryFirebase();
                        } finally {
                          setRetryingFirebase(false);
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#00e344] px-3.5 py-2 text-[12px] font-bold text-black hover:bg-[#00e344]/90 disabled:opacity-60 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${retryingFirebase ? 'animate-spin' : ''}`} />
                      <span>{retryingFirebase ? 'جاري الفحص...' : 'فحص الاتصال ومزامنة الحسابات'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3.5">
            <div className="rounded-[15px] border border-[#242429] bg-gradient-to-b from-[#1a1a1e] to-[#141417] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11.5px] text-[#8f8f98]">المستخدمين أونلاين حاليًا</div>
                <div className="mt-1 text-[26px] font-bold font-mono-num text-[#00e344]">
                  {onlineCount}
                </div>
                <div className="text-[10.5px] text-[#6d6d76]">مراقبة فورية لايف</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00e344]/12 border border-[#00e344]/25 text-[#00e344]">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-[15px] border border-[#242429] bg-gradient-to-b from-[#1a1a1e] to-[#141417] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11.5px] text-[#8f8f98]">إجمالي اللاعبين</div>
                <div className="mt-1 text-[26px] font-bold font-mono-num text-white">
                  {users.length}
                </div>
                <div className="text-[10.5px] text-[#6d6d76]">
                  مفعّل: {users.filter((u) => u.active).length}
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1b5ae2]/15 border border-[#1b5ae2]/25 text-[#60a5fa]">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-[15px] border border-[#242429] bg-gradient-to-b from-[#1a1a1e] to-[#141417] p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[11.5px] text-[#8f8f98]">مجموع أرصدة الموقع</div>
                <div className="mt-1 text-[20px] sm:text-[22px] font-bold font-mono-num text-[#db9d37] truncate">
                  {formatMoney(totalBalanceEgp)} ج.م
                </div>
                <div className="text-[10.5px] text-[#6d6d76]">بالجنيه المصري</div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#db9d37]/15 border border-[#db9d37]/25 text-[#db9d37]">
                <Coins className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-[15px] border border-[#242429] bg-gradient-to-b from-[#1a1a1e] to-[#141417] p-4 flex items-center justify-between">
              <div>
                <div className="text-[11.5px] text-[#8f8f98]">سحب مستني الموافقة</div>
                <div className="mt-1 text-[26px] font-bold font-mono-num text-[#e25d0a]">
                  {pendingConfirmCount}
                </div>
                <div className="text-[10.5px] text-[#6d6d76]">في الرسايل الآن</div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e25d0a]/15 border border-[#e25d0a]/25 text-[#e25d0a]">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Live Online Presence Monitor */}
          {onlineList.length > 0 && (
            <div className="rounded-[14px] border border-[#232328] bg-[#151518] px-4 py-3">
              <div className="text-[12px] font-semibold text-[#a0a0aa] mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00e344]" />
                <span>المتصلين الفعليين على المنصة الآن ({onlineCount}):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {onlineList.map((entry) => (
                  <div
                    key={entry.visitorId}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#2a2a30] bg-[#101012] px-3 py-1.5 text-[12px]"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00e344]" />
                    <span className="font-semibold text-white">
                      {entry.userName || entry.email || 'زائر بشاشة الدخول'}
                    </span>
                    {entry.playerId && (
                      <span className="rounded bg-[#e25d0a]/15 px-1.5 py-0.5 font-mono-num text-[10.5px] font-bold text-[#e25d0a]">
                        {entry.playerId}
                      </span>
                    )}
                    <span className="font-mono-num text-[11px] text-[#6e6e77]">{entry.route}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 1: USERS & PLAYERS */}
          {tab === 'users' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Create Account Card */}
              <div className="xl:col-span-4 rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[15.5px] font-bold text-white">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e25d0a]/15 text-[#e25d0a]">
                      <UserPlus className="h-4 w-4" />
                    </span>
                    <span>إنشاء حساب لاعب جديد</span>
                  </div>
                </div>

                <div className="rounded-[10px] border border-[#25252b] bg-[#111113] p-3 text-[12px] text-[#9b9ba4] flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-[#db9d37] shrink-0 mt-0.5" />
                  <span>
                    يتم توليد <strong className="text-white">ID لاعب عشوائي مميز</strong> تلقائيًا لكل حساب (مثل <span className="font-mono-num text-[#e25d0a]">PL-84920314</span>) ويُحفظ في Firebase ليفتح فورًا بالبريد والباسورد.
                  </span>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCreatingUser(true);
                    try {
                      const prefix =
                        newEmail.trim().split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'agent';
                      const res = await onCreateUser({
                        email: newEmail.trim(),
                        password: newPassword.trim(),
                        displayName: newDisplayName.trim() || prefix,
                        username: newUsername.trim() || `${prefix}_egp`,
                        balanceEgp: 0,
                      });
                      if (res.ok) {
                        onNotify(
                          'success',
                          'تم إنشاء الحساب وتفعيله (رصيد 0 ج.م)',
                          res.user?.playerId
                            ? `${newEmail.trim()} · ${res.user.playerId}`
                            : newEmail.trim()
                        );
                        setNewEmail('');
                        setNewPassword('');
                        setNewDisplayName('');
                        setNewUsername('');
                      } else {
                        onNotify('error', res.error || 'تعذر إنشاء الحساب');
                      }
                    } finally {
                      setCreatingUser(false);
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#b4b4bc]">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      required
                      placeholder="player@domain.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-[#b4b4bc]">كلمة المرور *</label>
                      <button
                        type="button"
                        onClick={() => setNewPassword(generateStrongPin())}
                        className="inline-flex items-center gap-1 text-[11px] text-[#db9d37] hover:underline cursor-pointer"
                      >
                        <KeyRound className="h-3 w-3" />
                        <span>توليد تلقائي</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="كلمة مرور الدخول"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">اسم اللاعب</label>
                      <input
                        type="text"
                        placeholder="أحمد محمد"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">اليوزرنيم</label>
                      <input
                        type="text"
                        placeholder="ahmed_egp"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                      />
                    </div>
                  </div>

                  <div className="rounded-[9px] border border-[#24242a] bg-[#101012] px-3 py-2 text-[11.5px] text-[#8d8d95]">
                    يبدأ كل حساب جديد برصيد <strong className="font-mono-num text-white">0.00 ج.م</strong> تلقائيًا، ويمكنك شحنه من خانة <strong className="text-[#00e344]">طلب إيداع</strong>.
                  </div>

                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="w-full flex items-center justify-center gap-2 rounded-[11px] bg-[#e25d0a] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-60 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{creatingUser ? 'جاري الحفظ...' : 'إنشاء الحساب وتوليد ID عشوائي'}</span>
                  </button>
                </form>
              </div>

              {/* Users Directory Table */}
              <div className="xl:col-span-8 rounded-[16px] border border-[#26262b] bg-[#151518] overflow-hidden flex flex-col">
                <div className="border-b border-[#232328] px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-white">
                      دليل اللاعبين والحسابات ({filteredUsers.length})
                    </span>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-[#70707a]" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="ابحث بالاسم، البريد، أو ID اللاعب..."
                      className="w-full rounded-[9px] border border-[#2c2c32] bg-[#101012] ps-9 pe-3 py-1.5 text-[12.5px] text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className="p-10 text-center space-y-2 text-[#80808a]">
                    <Users className="h-9 w-9 mx-auto text-[#4b4b53]" />
                    <div className="text-[14px] font-semibold text-[#c4c4cc]">
                      {users.length === 0
                        ? 'مفيش حسابات لاعبين متسجلة لسه'
                        : 'مفيش نتائج مطابقة للبحث'}
                    </div>
                    <div className="text-[12px]">
                      أنشئ أول حساب بالبريد الإلكتروني من النموذج اللي على اليمين وهيظهر فورًا هنا.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-start text-[13px]">
                      <thead className="bg-[#1b1b1f] text-[11.5px] text-[#9b9ba4]">
                        <tr>
                          <th className="py-3 px-4 text-start">اللاعب &amp; ID</th>
                          <th className="py-3 px-4 text-start">بيانات الدخول</th>
                          <th className="py-3 px-4 text-start">الرصيد (ج.م)</th>
                          <th className="py-3 px-4 text-start">الحالة</th>
                          <th className="py-3 px-4 text-start">التحكم</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222227]">
                        {filteredUsers.map((u) => {
                          const isOnline = onlineList.some((p) => p.userId === u.id);
                          const passVisible = Boolean(revealedPassIds[u.id]);
                          return (
                            <tr key={u.id} className="hover:bg-[#1a1a1e]/75 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-start gap-2.5">
                                  <CountryFlagBadge code="EG" />
                                  <div className="space-y-1">
                                    <div className="font-semibold text-white flex items-center gap-1.5">
                                      <span>{u.displayName}</span>
                                      {isOnline && (
                                        <span
                                          title="أونلاين الآن"
                                          className="inline-block h-2 w-2 rounded-full bg-[#00e344]"
                                        />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          copyText(`pid_${u.id}`, u.playerId || u.id, 'ID اللاعب')
                                        }
                                        className="inline-flex items-center gap-1 rounded-md border border-[#e25d0a]/35 bg-[#e25d0a]/10 px-1.5 py-0.5 font-mono-num text-[11px] font-bold text-[#e25d0a] hover:bg-[#e25d0a]/20 cursor-pointer"
                                      >
                                        <Hash className="h-2.5 w-2.5" />
                                        <span>{u.playerId || 'PL-00000000'}</span>
                                        {copiedId === `pid_${u.id}` ? (
                                          <Check className="h-2.5 w-2.5 text-[#00e344]" />
                                        ) : (
                                          <Copy className="h-2.5 w-2.5 opacity-70" />
                                        )}
                                      </button>
                                      <span className="text-[11px] font-mono-num text-[#6e6e77]">
                                        @{u.username}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-mono-num text-[12px]">
                                <div className="flex items-center gap-1.5 text-white">
                                  <span>{u.email}</span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText(
                                        `cred_${u.id}`,
                                        `البريد: ${u.email}\nكلمة المرور: ${u.password}\nID اللاعب: ${u.playerId}`,
                                        'بيانات الدخول'
                                      )
                                    }
                                    title="نسخ بيانات الدخول"
                                    className="text-[#787882] hover:text-white cursor-pointer"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </button>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5 text-[#db9d37]">
                                  <span>
                                    {passVisible ? u.password : '•'.repeat(Math.min(10, u.password.length || 6))}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRevealedPassIds((prev) => ({
                                        ...prev,
                                        [u.id]: !prev[u.id],
                                      }))
                                    }
                                    className="text-[#787882] hover:text-white cursor-pointer"
                                    title={passVisible ? 'إخفاء' : 'إظهار الباسورد'}
                                  >
                                    {passVisible ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-mono-num font-bold text-[#00e344] text-[13.5px]">
                                  {formatMoney(u.balanceEgp)} ج.م
                                </div>
                                <div className="mt-1 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateUser(u.id, {
                                        balanceEgp: Math.max(0, (u.balanceEgp || 0) + 1000),
                                      })
                                    }
                                    className="rounded border border-[#00e344]/30 bg-[#00e344]/10 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#00e344] hover:bg-[#00e344]/20 cursor-pointer"
                                  >
                                    +1000
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onUpdateUser(u.id, {
                                        balanceEgp: Math.max(0, (u.balanceEgp || 0) - 1000),
                                      })
                                    }
                                    className="rounded border border-[#e32200]/30 bg-[#e32200]/10 px-1.5 py-0.5 font-mono-num text-[10px] font-bold text-[#ff6b57] hover:bg-[#e32200]/20 cursor-pointer"
                                  >
                                    -1000
                                  </button>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => onUpdateUser(u.id, { active: !u.active })}
                                  className="cursor-pointer"
                                  title="اضغط لتفعيل أو إيقاف الحساب"
                                >
                                  <StatusBadge status={u.active ? 'active' : 'inactive'} lang="ar" />
                                </button>
                              </td>

                              <td className="py-3.5 px-4 whitespace-nowrap">
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
                                    className="rounded-lg border border-[#303036] bg-[#202025] p-1.5 text-[#b5b5be] hover:text-white cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setInstantDepIdentifier(u.email);
                                      setTab('withdrawals');
                                    }}
                                    title="عمل إيداع فوري لهذا العميل"
                                    className="rounded-lg border border-[#00e344]/40 bg-[#00e344]/10 px-2.5 py-1 text-[11px] font-semibold text-[#00e344] hover:bg-[#00e344]/20 cursor-pointer"
                                  >
                                    إيداع
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onImpersonateUser(u.id)}
                                    title="فتح بروفايل اللاعب"
                                    className="rounded-lg border border-[#1b5ae2]/40 bg-[#1b5ae2]/15 px-2.5 py-1 text-[11px] font-semibold text-[#60a5fa] hover:bg-[#1b5ae2]/25 cursor-pointer"
                                  >
                                    دخول بحسابه
                                  </button>
                                  {confirmDeleteId === u.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await onDeleteUser(u.id);
                                          setConfirmDeleteId(null);
                                          onNotify('warning', 'تم حذف الحساب');
                                        }}
                                        className="rounded-lg bg-[#e32200] px-2 py-1 text-[11px] font-bold text-white cursor-pointer"
                                      >
                                        تأكيد
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="rounded-lg bg-[#25252a] px-2 py-1 text-[11px] text-[#a0a0a8] cursor-pointer"
                                      >
                                        لا
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(u.id)}
                                      title="حذف الحساب"
                                      className="rounded-lg border border-[#e32200]/30 bg-[#e32200]/10 p-1.5 text-[#ff6b57] hover:bg-[#e32200]/20 cursor-pointer"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Edit User Drawer Bar */}
                {editingUser && (
                  <div className="border-t border-[#2d2d34] bg-[#111114] p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13.5px] font-bold text-[#e25d0a]">
                        تعديل حساب: {editingUser.displayName} ({editingUser.playerId})
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="text-[12px] text-[#8a8a92] hover:text-white cursor-pointer"
                      >
                        إغلاق
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="الاسم"
                        className="rounded-lg border border-[#303036] bg-[#18181c] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[#e25d0a]"
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="البريد"
                        className="rounded-lg border border-[#303036] bg-[#18181c] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[#e25d0a]"
                      />
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="كلمة المرور"
                        className="rounded-lg border border-[#303036] bg-[#18181c] px-3 py-2 text-[12.5px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                      />
                      <input
                        type="number"
                        value={editBalance}
                        onChange={(e) => setEditBalance(e.target.value)}
                        placeholder="الرصيد (ج.م)"
                        className="rounded-lg border border-[#303036] bg-[#18181c] px-3 py-2 text-[12.5px] font-mono-num font-bold text-[#00e344] outline-none focus:border-[#e25d0a]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await onUpdateUser(editingUser.id, {
                          displayName: editDisplayName.trim(),
                          email: editEmail.trim(),
                          password: editPassword.trim(),
                          balanceEgp: Number(editBalance) || 0,
                        });
                        onNotify('success', 'تم تحديث بيانات اللاعب');
                        setEditingUser(null);
                      }}
                      className="rounded-[9px] bg-[#00e344] px-4 py-2 text-[12.5px] font-bold text-black hover:opacity-90 cursor-pointer"
                    >
                      حفظ التعديلات في Firebase
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SIDE-BY-SIDE WITHDRAWAL REQUEST & INSTANT DEPOSIT REQUEST */}
          {tab === 'withdrawals' && (
            <div className="space-y-5">
              {/* Side-by-side Action Forms */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* CARD 1: WITHDRAWAL REQUEST */}
                <div className="rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4 h-fit">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[15.5px] font-bold text-white">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e25d0a]/15 text-[#e25d0a]">
                        <Send className="h-4 w-4" />
                      </span>
                      <span>طلب سحب (إرسال للرسايل)</span>
                    </div>
                    <span className="rounded-md bg-[#e25d0a]/10 border border-[#e25d0a]/30 px-2 py-0.5 text-[11px] font-semibold text-[#e25d0a]">
                      خصم عند التأكيد
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8d8d95]">
                    الطلب بيتبعت لقسم <strong className="text-white">الرسايل</strong> عند اللاعب. لو أكده بيتخصم من رصيده، ولو رفضه الرصيد يفضل زي ما هو.
                  </p>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setSendingWd(true);
                      try {
                        const res = await onSendWithdrawalToUser({
                          userId: wdUserId,
                          amountEgp: Number(wdAmount) || 0,
                          destinationMethod: wdMethod,
                          requisiteNumber: wdNumber,
                          recipientName: wdRecipient || 'تحويل سحب',
                          note: wdNote,
                        });
                        if (res.ok) {
                          onNotify('success', 'تم إرسال طلب السحب لرسايل اللاعب');
                          setWdNote('');
                        } else {
                          onNotify('error', res.error || 'حصل خطأ في إرسال الطلب');
                        }
                      } finally {
                        setSendingWd(false);
                      }
                    }}
                    className="space-y-3.5"
                  >
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">اختر اللاعب</label>
                      <select
                        value={wdUserId}
                        onChange={(e) => setWdUserId(e.target.value)}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                      >
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.displayName} (@{u.username}) · {formatMoney(u.balanceEgp)} ج.م
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] text-[#b4b4bc]">مبلغ السحب (جنيه مصري)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={wdAmount}
                        onChange={(e) => setWdAmount(e.target.value)}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[15px] font-bold font-mono-num text-[#db9d37] outline-none focus:border-[#e25d0a]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {WD_PRESET_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setWdAmount(String(amt))}
                            className={`rounded-md border px-2 py-0.5 font-mono-num text-[11px] cursor-pointer ${
                              Number(wdAmount) === amt
                                ? 'border-[#e25d0a] bg-[#e25d0a]/20 text-[#e25d0a]'
                                : 'border-[#2c2c32] bg-[#101012] text-[#9b9ba4] hover:text-white'
                            }`}
                          >
                            {amt.toLocaleString('en-US')} ج.م
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] text-[#b4b4bc]">وسيلة السحب</label>
                      <div className="flex flex-wrap gap-1.5">
                        {PAYMENT_METHOD_CHIPS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setWdMethod(m)}
                            className={`rounded-md border px-2.5 py-1 text-[11.5px] cursor-pointer ${
                              wdMethod === m
                                ? 'border-[#e25d0a] bg-[#e25d0a]/20 text-white font-semibold'
                                : 'border-[#2c2c32] bg-[#101012] text-[#9b9ba4] hover:text-white'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[12px] text-[#b4b4bc]">رقم المحفظة / الحساب</label>
                        <input
                          type="text"
                          required
                          value={wdNumber}
                          onChange={(e) => setWdNumber(e.target.value)}
                          className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[12px] text-[#b4b4bc]">اسم المستلم</label>
                        <input
                          type="text"
                          value={wdRecipient}
                          onChange={(e) => setWdRecipient(e.target.value)}
                          placeholder="اسم المستلم"
                          className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">نص الرسالة (اختياري)</label>
                      <textarea
                        rows={2}
                        value={wdNote}
                        onChange={(e) => setWdNote(e.target.value)}
                        placeholder="طلب سحب من رصيدك، برجاء التأكيد أو الرفض من الرسايل"
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[#e25d0a]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingWd || users.length === 0}
                      className="w-full flex items-center justify-center gap-2 rounded-[11px] bg-[#e25d0a] py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-60 cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                      <span>{sendingWd ? 'جاري الإرسال...' : 'إرسال طلب السحب الآن'}</span>
                    </button>
                  </form>
                </div>

                {/* CARD 2: INSTANT DEPOSIT REQUEST (AUTO-CREDIT BY EMAIL OR USERNAME) */}
                <div className="rounded-[16px] border border-[#00e344]/25 bg-[#151518] p-5 space-y-4 h-fit">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[15.5px] font-bold text-white">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#00e344]/15 text-[#00e344]">
                        <ArrowDownLeft className="h-4 w-4" />
                      </span>
                      <span>طلب إيداع (إضافة رصيد تلقائي)</span>
                    </div>
                    <span className="rounded-md bg-[#00e344]/10 border border-[#00e344]/30 px-2 py-0.5 text-[11px] font-semibold text-[#00e344]">
                      ينزل في الحساب فورًا
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8d8d95]">
                    اختار العميل أو اكتب <strong className="text-white">البريد الإلكتروني</strong> أو <strong className="text-white">اليوزر نيم</strong> وحدد المبلغ — أول ما تضيفه بينزل في رصيد حسابه تلقائيًا.
                  </p>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const amt = Number(instantDepAmount) || 0;
                      if (amt <= 0) {
                        onNotify('error', 'اكتب مبلغ إيداع صحيح');
                        return;
                      }
                      if (!matchedDepUser && !instantDepIdentifier.trim()) {
                        onNotify('error', 'اكتب البريد الإلكتروني أو اليوزر نيم للعميل');
                        return;
                      }
                      setSendingDep(true);
                      try {
                        const res = await onCreateDepositForUser({
                          userId: matchedDepUser?.id,
                          identifier: instantDepIdentifier.trim(),
                          amountEgp: amt,
                          bankName: instantDepMethod,
                          note: instantDepNote.trim() || undefined,
                          autoCredit: true,
                        });
                        if (res.ok) {
                          const targetName =
                            res.user?.displayName || matchedDepUser?.displayName || instantDepIdentifier;
                          onNotify(
                            'success',
                            `تم إيداع ${formatMoney(amt)} ج.م تلقائيًا`,
                            `نزل في حساب ${targetName}`
                          );
                          setInstantDepNote('');
                        } else {
                          onNotify('error', res.error || 'تعذر تنفيذ طلب الإيداع');
                        }
                      } finally {
                        setSendingDep(false);
                      }
                    }}
                    className="space-y-3.5"
                  >
                    {/* Quick pick dropdown by Gmail / Username (mirrors Withdrawal selector) */}
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">
                        اختر الجيميل / العميل *
                      </label>
                      <select
                        value={matchedDepUser?.id ?? ''}
                        onChange={(e) => {
                          const found = users.find((u) => u.id === e.target.value);
                          if (found) {
                            setInstantDepIdentifier(found.email);
                          }
                        }}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#00e344]"
                      >
                        <option value="">— اختر جيميل العميل أو اكتبه تحت —</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.email} · @{u.username} ({u.displayName}) — {formatMoney(u.balanceEgp)} ج.م
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Email or Username input */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-[#b4b4bc]">
                        أو اكتب الجيميل / اليوزر نيم مباشرة
                      </label>
                      <input
                        type="text"
                        value={instantDepIdentifier}
                        onChange={(e) => setInstantDepIdentifier(e.target.value)}
                        placeholder="مثال: ahmed_egp أو player@domain.com"
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13.5px] font-mono-num text-white outline-none focus:border-[#00e344]"
                      />
                      {matchedDepUser ? (
                        <div className="rounded-[10px] border border-[#00e344]/35 bg-[#00e344]/10 px-3 py-2 text-[12px] flex flex-wrap items-center justify-between gap-2">
                          <div className="text-white">
                            <span className="font-bold text-[#00e344]">✓ {matchedDepUser.displayName}</span>
                            <span className="mx-1.5 text-[#8d8d95]">·</span>
                            <span className="font-mono-num text-[#d4d4dc]">@{matchedDepUser.username}</span>
                            <span className="mx-1.5 text-[#8d8d95]">·</span>
                            <span className="font-mono-num text-[#9b9ba4]">{matchedDepUser.email}</span>
                          </div>
                          <div className="font-mono-num text-[11.5px] font-bold text-[#db9d37]">
                            {formatMoney(matchedDepUser.balanceEgp)} &rarr;{' '}
                            <span className="text-[#00e344]">
                              {formatMoney(
                                (matchedDepUser.balanceEgp || 0) + (Number(instantDepAmount) || 0)
                              )}{' '}
                              ج.م
                            </span>
                          </div>
                        </div>
                      ) : instantDepIdentifier.trim() ? (
                        <div className="rounded-[9px] border border-[#e32200]/30 bg-[#e32200]/10 px-3 py-1.5 text-[11.5px] text-[#ff8a7a]">
                          مش لاقي عميل بالبريد أو اليوزرنيم ده — اتأكد من كتابته صح
                        </div>
                      ) : null}
                    </div>

                    {/* Deposit Amount */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-[#b4b4bc]">مبلغ الإيداع (جنيه مصري)</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={instantDepAmount}
                        onChange={(e) => setInstantDepAmount(e.target.value)}
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[15px] font-bold font-mono-num text-[#00e344] outline-none focus:border-[#00e344]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {WD_PRESET_AMOUNTS.map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setInstantDepAmount(String(amt))}
                            className={`rounded-md border px-2 py-0.5 font-mono-num text-[11px] cursor-pointer ${
                              Number(instantDepAmount) === amt
                                ? 'border-[#00e344] bg-[#00e344]/20 text-[#00e344]'
                                : 'border-[#2c2c32] bg-[#101012] text-[#9b9ba4] hover:text-white'
                            }`}
                          >
                            +{amt.toLocaleString('en-US')} ج.م
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Deposit Channel */}
                    <div className="space-y-1.5">
                      <label className="text-[12px] text-[#b4b4bc]">نوع الإيداع</label>
                      <div className="flex flex-wrap gap-1.5">
                        {['إيداع فوري من الإدارة', 'فودافون كاش', 'إنستا باي', 'مكافأة رصيد'].map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setInstantDepMethod(ch)}
                            className={`rounded-md border px-2.5 py-1 text-[11.5px] cursor-pointer ${
                              instantDepMethod === ch
                                ? 'border-[#00e344] bg-[#00e344]/15 text-white font-semibold'
                                : 'border-[#2c2c32] bg-[#101012] text-[#9b9ba4] hover:text-white'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional Note */}
                    <div className="space-y-1">
                      <label className="text-[12px] text-[#b4b4bc]">ملاحظة للإشعار (اختياري)</label>
                      <input
                        type="text"
                        value={instantDepNote}
                        onChange={(e) => setInstantDepNote(e.target.value)}
                        placeholder="تم شحن حسابك وإضافة الرصيد تلقائيًا"
                        className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[12.5px] text-white outline-none focus:border-[#00e344]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={sendingDep || users.length === 0}
                      className="w-full flex items-center justify-center gap-2 rounded-[11px] bg-[#00e344] py-2.5 text-[13.5px] font-bold text-black hover:opacity-90 disabled:opacity-60 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        {sendingDep ? 'جاري إضافة الإيداع...' : 'إضافة الإيداع ونزوله في الحساب تلقائيًا'}
                      </span>
                    </button>
                  </form>
                </div>
              </div>

              {/* Bottom Logs Grid: Withdrawals Log & Instant Deposits Log */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="rounded-[16px] border border-[#26262b] bg-[#151518] overflow-hidden">
                  <div className="border-b border-[#232328] px-5 py-3.5 flex items-center justify-between">
                    <span className="text-[14.5px] font-bold text-white">
                      سجل طلبات السحب ({adminWithdrawals.length})
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto scrollbar-dark">
                    <table className="w-full border-collapse text-start text-[12.5px]">
                      <thead className="bg-[#1b1b1f] text-[11px] text-[#9b9ba4]">
                        <tr>
                          <th className="py-2.5 px-3.5 text-start">الطلب</th>
                          <th className="py-2.5 px-3.5 text-start">اللاعب</th>
                          <th className="py-2.5 px-3.5 text-start">المبلغ</th>
                          <th className="py-2.5 px-3.5 text-start">الحالة</th>
                          <th className="py-2.5 px-3.5 text-start">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222227]">
                        {adminWithdrawals.map((w) => {
                          const u = users.find((usr) => usr.id === w.userId);
                          return (
                            <tr key={w.id} className="hover:bg-[#1a1a1e]/75">
                              <td className="py-2.5 px-3.5 font-mono-num text-white">{w.orderId}</td>
                              <td className="py-2.5 px-3.5 text-[#d4d4dc]">
                                <div>{u ? u.displayName : 'عام'}</div>
                                {u?.username && (
                                  <div className="text-[10.5px] font-mono-num text-[#787882]">
                                    @{u.username}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono-num font-bold text-[#db9d37] whitespace-nowrap">
                                {formatMoney(w.amountLocal)} ج.م
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                {w.status === 'completed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#00e344]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#00e344]">
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>أكده واتخصم</span>
                                  </span>
                                ) : w.status === 'cancelled' ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#e32200]/10 px-2 py-0.5 text-[11.5px] font-semibold text-[#ff6b57]">
                                    <XCircle className="h-3 w-3" />
                                    <span>رفضه (متخصمش)</span>
                                  </span>
                                ) : (
                                  <StatusBadge status={w.status} lang="ar" />
                                )}
                              </td>
                              <td className="py-2.5 px-3.5 font-mono-num text-[11px] text-[#6e6e77] whitespace-nowrap">
                                {formatDateTime(w.createdAt, state.settings)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-[16px] border border-[#26262b] bg-[#151518] overflow-hidden">
                  <div className="border-b border-[#232328] px-5 py-3.5 flex items-center justify-between">
                    <span className="text-[14.5px] font-bold text-white">
                      سجل الإيداعات المنفذة ({state.deposits.length})
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto scrollbar-dark">
                    <table className="w-full border-collapse text-start text-[12.5px]">
                      <thead className="bg-[#1b1b1f] text-[11px] text-[#9b9ba4]">
                        <tr>
                          <th className="py-2.5 px-3.5 text-start">رقم العملية</th>
                          <th className="py-2.5 px-3.5 text-start">العميل</th>
                          <th className="py-2.5 px-3.5 text-start">المبلغ</th>
                          <th className="py-2.5 px-3.5 text-start">الحالة</th>
                          <th className="py-2.5 px-3.5 text-start">التاريخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#222227]">
                        {state.deposits.map((d) => {
                          const u = users.find((usr) => usr.id === d.userId);
                          return (
                            <tr key={d.id} className="hover:bg-[#1a1a1e]/75">
                              <td className="py-2.5 px-3.5 font-mono-num text-white">{d.orderId}</td>
                              <td className="py-2.5 px-3.5 text-[#d4d4dc]">
                                <div>{u ? u.displayName : d.ownerName}</div>
                                <div className="text-[10.5px] font-mono-num text-[#787882]">
                                  {u ? `@${u.username}` : d.requisiteNumber}
                                </div>
                              </td>
                              <td className="py-2.5 px-3.5 font-mono-num font-bold text-[#00e344] whitespace-nowrap">
                                +{formatMoney(d.amountLocal)} ج.م
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <StatusBadge status={d.status} lang="ar" />
                              </td>
                              <td className="py-2.5 px-3.5 font-mono-num text-[11px] text-[#6e6e77] whitespace-nowrap">
                                {formatDateTime(d.createdAt, state.settings)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS & MESSAGES CONTROL */}
          {tab === 'orders' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4">
                <div className="text-[15.5px] font-bold text-white">إرسال رسالة لبروفايل لاعب</div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await onSendMessageToUser({
                      userId: msgUserId,
                      sender: msgSender,
                      body: msgBody,
                    });
                    setMsgBody('');
                    onNotify('success', 'تم إرسال الرسالة للاعب');
                  }}
                  className="space-y-3"
                >
                  <select
                    value={msgUserId}
                    onChange={(e) => setMsgUserId(e.target.value)}
                    className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} [{u.playerId}] ({u.email})
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={msgSender}
                    onChange={(e) => setMsgSender(e.target.value)}
                    placeholder="المرسل (مثال: إدارة المنصة)"
                    className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] text-white outline-none"
                  />
                  <textarea
                    rows={3}
                    required
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    placeholder="اكتب نص الرسالة..."
                    className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13px] text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={users.length === 0}
                    className="rounded-[10px] bg-[#1b5ae2] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1b5ae2]/85 disabled:opacity-50 cursor-pointer"
                  >
                    إرسال الرسالة الآن
                  </button>
                </form>
              </div>

              <div className="rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4">
                <div className="text-[15.5px] font-bold text-white">إيداع فوري لحساب لاعب</div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const res = await onCreateDepositForUser({
                      userId: depUserId,
                      amountEgp: Number(depAmount) || 1000,
                      autoCredit: true,
                    });
                    if (res.ok) {
                      onNotify('success', 'تم إضافة الإيداع ونزوله تلقائيًا');
                    } else {
                      onNotify('error', res.error || 'تعذر تنفيذ الإيداع');
                    }
                  }}
                  className="space-y-3"
                >
                  <select
                    value={depUserId}
                    onChange={(e) => setDepUserId(e.target.value)}
                    className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} [{u.playerId}] ({u.email})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    value={depAmount}
                    onChange={(e) => setDepAmount(e.target.value)}
                    placeholder="المبلغ بالجنيه المصري"
                    className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2 text-[13.5px] font-mono-num text-white outline-none"
                  />
                  <button
                    type="submit"
                    disabled={users.length === 0}
                    className="rounded-[10px] bg-[#e25d0a] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-50 cursor-pointer"
                  >
                    إرسال طلب الإيداع
                  </button>
                </form>

                <div className="pt-3 border-t border-[#232328] space-y-2 max-h-60 overflow-y-auto scrollbar-dark">
                  {state.deposits.slice(0, 10).map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-[#24242a] bg-[#101012] px-3 py-2 text-[12px]"
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
              <div className="rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-[15.5px] font-bold text-white">
                    إعدادات المنصة وسعر الصرف
                  </div>
                  <CountryFlagBadge code={state.config.countryCode} />
                </div>
                <p className="text-[12px] text-[#8d8d95]">
                  اسم المنصة مثبّت نهائيًا على <strong className="text-white">Nexus Agency</strong> لا يتغير. يمكنك تعديل سعر صرف الدولار أو كلمة مرور الأدمن من هنا.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[12px] text-[#b4b4bc]">
                        اسم المنصة (ثابت جنب علم مصر)
                      </label>
                      <span className="inline-flex items-center gap-1 rounded-md bg-[#00e344]/10 border border-[#00e344]/30 px-2 py-0.5 text-[10.5px] font-semibold text-[#00e344]">
                        <Lock className="h-2.5 w-2.5" />
                        مثبّت لا يتغير
                      </span>
                    </div>
                    <input
                      type="text"
                      value="Nexus Agency"
                      readOnly
                      disabled
                      className="w-full rounded-[10px] border border-[#2e2e34] bg-[#0c0c0e] px-3 py-2.5 text-[14px] font-bold text-white/80 outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#b4b4bc]">
                      سعر الدولار مقابل الجنيه المصري
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={usdRateInput}
                      onChange={(e) => setUsdRateInput(e.target.value)}
                      className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[14px] font-mono-num text-[#db9d37] outline-none focus:border-[#e25d0a]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] text-[#b4b4bc]">
                      تغيير كلمة مرور الأدمن (اختياري)
                    </label>
                    <input
                      type="text"
                      value={newAdminPass}
                      onChange={(e) => setNewAdminPass(e.target.value)}
                      placeholder="سيبه فاضي لو مش عايز تغيرها"
                      className="w-full rounded-[10px] border border-[#2e2e34] bg-[#101012] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={savingConfig}
                    onClick={async () => {
                      setSavingConfig(true);
                      try {
                        await onUpdateConfig({
                          platformName: 'Nexus Agency',
                          usdRate: Number(usdRateInput) || state.config.usdRate,
                          ...(newAdminPass.trim() ? { adminPassword: newAdminPass.trim() } : {}),
                        });
                        setNewAdminPass('');
                        onNotify('success', 'تم حفظ الإعدادات', 'Nexus Agency');
                      } finally {
                        setSavingConfig(false);
                      }
                    }}
                    className="rounded-[10px] bg-[#e25d0a] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-60 cursor-pointer"
                  >
                    {savingConfig ? 'جاري التحديث...' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </div>

              <div className="rounded-[16px] border border-[#26262b] bg-[#151518] p-5 space-y-4">
                <div className="text-[15.5px] font-bold text-white">نسخة PHP الكاملة (admin.php)</div>
                <p className="text-[13px] text-[#8d8d95] leading-relaxed">
                  متوفر ملف <span className="font-mono-num text-white">admin.php</span> مكتوب بلغة الـ PHP بالكامل داخل مشروعك لو رفعته على استضافة cPanel / Apache / Nginx. وهنا النسخة التفاعلية على <span className="font-mono-num text-[#e25d0a]">/admin.php</span> مربوطة لايف بمشروع Firebase (<span className="font-mono-num text-[#db9d37]">moorrcv</span>).
                </p>
                <button
                  type="button"
                  onClick={onDownloadPhp}
                  className="inline-flex items-center gap-2 rounded-[10px] border border-[#303036] bg-[#202025] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#292930] cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#e25d0a]" />
                  <span>تحميل ملف admin.php الأصلي</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
