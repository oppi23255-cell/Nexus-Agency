import React, { useState } from 'react';
import { Lock, Mail, Shield, ShieldAlert } from 'lucide-react';
import { HostapayLogo } from '../components/HpayIcons';
import { Language } from '../types';

export function LoginView({
  lang,
  platformName,
  countryCode = 'EG',
  onLogin,
  onToggleLang,
  onOpenAdmin,
}: {
  lang: Language;
  platformName: string;
  countryCode?: 'SA' | 'EG' | 'AE' | 'KG';
  onLogin: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  onToggleLang: () => void;
  onOpenAdmin?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError(
        lang === 'ar'
          ? 'من فضلك اكتب البريد الإلكتروني وكلمة المرور الأول'
          : 'Please enter both email and password'
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await onLogin(email.trim(), password);
      if (!res.ok) {
        setError(
          res.error ||
            (lang === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور مش صح، أو الحساب لسه متفعلش من الأدمن'
              : 'Invalid credentials or account not activated by admin')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-dvh w-full bg-[#111111] flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-[420px] rounded-[18px] border border-[#252525] bg-[#151515] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)] space-y-6">
        <div className="flex items-center justify-between gap-3">
          <HostapayLogo platformName={platformName} countryCode={countryCode} />
          <button
            type="button"
            onClick={onToggleLang}
            className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-2.5 py-1 text-[12px] text-[#aaaaaa] hover:text-white cursor-pointer shrink-0"
          >
            {lang === 'ar' ? 'EN' : 'مصري'}
          </button>
        </div>

        <div>
          <h1 className="text-[20px] font-bold text-white">
            {lang === 'ar' ? 'تسجيل دخول الوكيل' : 'Agent Sign In'}
          </h1>
          <p className="mt-1 text-[13px] text-[#8a8a8a]">
            {lang === 'ar'
              ? 'اكتب البريد الإلكتروني والباسورد اللي استلمتهم من الإدارة عشان تدخل حسابك على طول'
              : 'Enter the email and password issued by the administrator to access your desk'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-[12px] border border-[#e32200]/40 bg-[#e32200]/10 p-3 text-[12.5px] text-[#ff6b57]">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#aaaaaa] block">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-[#737373]" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="agent@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] ps-10 pe-3 py-2.5 text-[13.5px] text-white placeholder:text-[#555555] outline-none focus:border-[#e25d0a]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#aaaaaa] block">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-[#737373]" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] ps-10 pe-3 py-2.5 text-[13.5px] text-white placeholder:text-[#555555] outline-none focus:border-[#e25d0a]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[10px] bg-[#e25d0a] py-3 text-[14px] font-semibold text-white hover:bg-[#e25d0a]/85 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {submitting
              ? lang === 'ar'
                ? 'جاري تسجيل الدخول...'
                : 'Signing in...'
              : lang === 'ar'
              ? 'دخول على المنصة'
              : 'Sign In to Desk'}
          </button>
        </form>

        <div className="rounded-[10px] border border-[#222222] bg-[#121212] px-3.5 py-2.5 text-center text-[12px] text-[#737373]">
          {lang === 'ar'
            ? 'إنشاء الحسابات مغلق — الدخول متاح فقط عبر البريد المفعّل من لوحة الإدارة'
            : 'Self-registration is disabled. Accounts are provisioned by Admin only.'}
        </div>

        {onOpenAdmin && (
          <button
            type="button"
            onClick={onOpenAdmin}
            className="w-full flex items-center justify-center gap-2 rounded-[10px] border border-[#303036] bg-[#19191d] py-2.5 text-[12.5px] font-semibold text-[#e4e4e7] hover:border-[#e25d0a]/60 hover:text-white transition-colors cursor-pointer"
          >
            <Shield className="h-4 w-4 text-[#e25d0a]" />
            <span>
              {lang === 'ar'
                ? 'فتح لوحة تحكم الأدمن (React · admin.php)'
                : 'Open Admin Dashboard (React · admin.php)'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
