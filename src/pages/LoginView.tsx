import React, { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import { HostapayLogo } from '../components/HpayIcons';
import { Language } from '../types';

export function LoginView({
  lang,
  onLogin,
  onToggleLang,
}: {
  lang: Language;
  onLogin: () => void;
  onToggleLang: () => void;
}) {
  const [email, setEmail] = useState('desk@hostapay-agent.com');
  const [password, setPassword] = useState('••••••••••••');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen w-full bg-[#111111] flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-[410px] rounded-[16px] border border-[#252525] bg-[#151515] p-7 shadow-2xl space-y-6">
        <div className="flex items-center justify-between">
          <HostapayLogo />
          <button
            type="button"
            onClick={onToggleLang}
            className="rounded-lg border border-[#303030] bg-[#1b1b1b] px-2.5 py-1 text-[12px] text-[#aaaaaa] hover:text-white cursor-pointer"
          >
            {lang === 'ar' ? 'EN' : 'العربية'}
          </button>
        </div>

        <div>
          <h1 className="text-[20px] font-bold text-white">
            {lang === 'ar' ? 'تسجيل دخول الوكيل' : 'Trader Portal Sign In'}
          </h1>
          <p className="mt-1 text-[13px] text-[#737373]">
            {lang === 'ar'
              ? 'أدخل بيانات مكتب التداول للوصول إلى لوحة العمليات'
              : 'Enter your trader credentials to access the liquidity desk'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[#aaaaaa] block">
              {lang === 'ar' ? 'البريد الإلكتروني أو المعرف' : 'Email or Trader ID'}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-[#737373]" />
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] ps-10 pe-3 py-2.5 text-[13.5px] text-white outline-none focus:border-[#e25d0a]"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] ps-10 pe-3 py-2.5 text-[13.5px] text-white outline-none focus:border-[#e25d0a]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-[10px] bg-[#e25d0a] py-3 text-[14px] font-semibold text-white hover:bg-[#e25d0a]/85 transition-colors cursor-pointer"
          >
            {lang === 'ar' ? 'دخول إلى المنصة' : 'Sign In to Desk'}
          </button>
        </form>
      </div>
    </div>
  );
}
