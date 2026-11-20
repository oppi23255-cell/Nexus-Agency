import React from 'react';
import { t, TranslationKey } from '../i18n';
import { Language } from '../types';

export type BadgeTone = 'success' | 'danger' | 'info' | 'warning' | 'accent' | 'neutral';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'border-[#00e344]/35 bg-[#00e344]/10 text-[#00e344]',
  danger: 'border-[#e32200]/35 bg-[#e32200]/10 text-[#e32200]',
  info: 'border-[#3b82f6]/35 bg-[#3b82f6]/10 text-[#3b82f6]',
  warning: 'border-[#f4c20d]/35 bg-[#f4c20d]/10 text-[#f4c20d]',
  accent: 'border-[#db9d37]/35 bg-[#db9d37]/10 text-[#db9d37]',
  neutral: 'border-[#333333] bg-[#252525] text-[#aaaaaa]',
};

export function statusToTone(status: string): BadgeTone {
  switch (status) {
    case 'completed':
    case 'resolved_approve':
    case 'matched':
    case 'credited':
    case 'active':
      return 'success';
    case 'pending':
    case 'reviewing':
    case 'accepted':
    case 'confirming':
      return 'warning';
    case 'awaiting_confirmation':
      return 'accent';
    case 'disputed':
    case 'open':
    case 'cancelled':
    case 'resolved_reject':
    case 'unmatched':
      return 'danger';
    case 'available':
      return 'info';
    case 'expired':
    case 'ignored':
    case 'inactive':
    default:
      return 'neutral';
  }
}

export function StatusBadge({
  status,
  lang,
  label,
}: {
  status: string;
  lang: Language;
  label?: string;
}) {
  const tone = statusToTone(status);
  const key = `status_${status}` as TranslationKey;
  const text = label ?? t(lang, key);

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-[6px] border px-[10px] py-[3px] text-[12px] font-medium leading-4 ${TONE_CLASSES[tone]}`}
    >
      {text}
    </span>
  );
}
