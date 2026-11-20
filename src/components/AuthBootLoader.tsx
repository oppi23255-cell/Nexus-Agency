import React from 'react';
import { HostapayMark } from './HpayIcons';

export function AuthBootLoader({
  phase,
  error,
  lang = 'ar',
  onRetry,
}: {
  phase: 'preparing' | 'accounts';
  error?: string | null;
  lang?: 'ar' | 'en';
  onRetry?: () => void;
}) {
  const isAr = lang === 'ar';

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className="grid min-h-dvh w-full place-items-center bg-[#141414] px-6 text-white select-none"
    >
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#222222] bg-[#151515] p-7 text-center shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        {/* Emblem + smooth orange orbital spinner */}
        <div className="mx-auto mb-5 relative flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-[#2a2a2a] bg-[#1b1b1b]" />
          <div className="absolute -inset-1 rounded-[20px] border-2 border-transparent border-t-[#e25d0a] border-r-[#e25d0a]/40 animate-spin" />
          <HostapayMark className="relative z-10 h-7 w-7 text-white" />
        </div>

        <div className="text-[19px] font-semibold tracking-tight text-white">
          {isAr ? 'التفويض والتحقق' : 'Authorization'}
        </div>

        <div className="mt-2.5 text-[13.5px] text-[#a0a0a0]">
          {phase === 'preparing'
            ? isAr
              ? 'جاري التحقق وتجهيز الجلسة…'
              : 'Preparing authorization redirect…'
            : isAr
            ? 'جاري تحميل حسابات التداول…'
            : 'Loading accounts…'}
        </div>

        {/* Subtle progress bar */}
        {!error && (
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-[#242424]">
            <div
              className={`h-full rounded-full bg-[#e25d0a] transition-all duration-500 ease-out ${
                phase === 'preparing' ? 'w-2/5' : 'w-[88%]'
              }`}
            />
          </div>
        )}

        {error && (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-[#e32200]/40 bg-[#e32200]/10 p-3 text-[13px] text-[#e32200]">
              {error}
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-2xl bg-[#db9d37] px-5 py-2.5 text-[13.5px] font-semibold text-black hover:opacity-90 cursor-pointer"
              >
                {isAr ? 'إعادة المحاولة' : 'Retry'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
