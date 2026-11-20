import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bot,
  CreditCard,
  KeyRound,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Smartphone,
  User,
  Users,
} from 'lucide-react';
import { t } from '../i18n';
import { Language, RoutePath } from '../types';

export interface CommandItem {
  id: string;
  title: string;
  group: string;
  route: RoutePath;
  action?: string;
  keywords: string[];
  icon: React.ReactNode;
}

export function CommandPalette({
  open,
  lang,
  currentRoute,
  onClose,
  onExecute,
}: {
  open: boolean;
  lang: Language;
  currentRoute: RoutePath;
  onClose: () => void;
  onExecute: (route: RoutePath, action?: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = useMemo(
    () => [
      {
        id: 'nav-deposits',
        title: t(lang, 'depositsListing'),
        group: t(lang, 'depositsGroup'),
        route: '/deposits',
        keywords: ['deposits', 'payin', 'ايداع', 'الإيداعات', 'طلبات'],
        icon: <ArrowDownLeft className="h-4 w-4 text-[#00e344]" />,
      },
      {
        id: 'nav-disputes',
        title: t(lang, 'disputes'),
        group: t(lang, 'depositsGroup'),
        route: '/deposits/disputes',
        keywords: ['disputes', 'appeals', 'نزاع', 'النزاعات', 'شكاوى'],
        icon: <ArrowDownLeft className="h-4 w-4 text-[#e32200]" />,
      },
      {
        id: 'nav-withdrawals',
        title: t(lang, 'withdrawalsListing'),
        group: t(lang, 'withdrawalsGroup'),
        route: '/withdrawals',
        keywords: ['withdrawals', 'payout', 'سحب', 'السحوبات'],
        icon: <ArrowUpRight className="h-4 w-4 text-[#3b82f6]" />,
      },
      {
        id: 'nav-my-withdrawals',
        title: t(lang, 'myWithdrawals'),
        group: t(lang, 'withdrawalsGroup'),
        route: '/withdrawals/my',
        keywords: ['my withdrawals', 'سحوباتي', 'قيد التنفيذ'],
        icon: <ArrowUpRight className="h-4 w-4 text-[#3b82f6]" />,
      },
      {
        id: 'nav-stats',
        title: t(lang, 'statistics'),
        group: t(lang, 'navigation'),
        route: '/statistics',
        keywords: ['statistics', 'analytics', 'احصائيات', 'أرباح'],
        icon: <BarChart3 className="h-4 w-4 text-[#db9d37]" />,
      },
      {
        id: 'nav-req',
        title: t(lang, 'requisite'),
        group: t(lang, 'navigation'),
        route: '/requisite',
        keywords: ['requisite', 'cards', 'bank', 'وسائل الدفع', 'بطاقات', 'فودافون'],
        icon: <CreditCard className="h-4 w-4 text-[#e25d0a]" />,
      },
      {
        id: 'nav-android',
        title: `${t(lang, 'automaticGroup')} · ${t(lang, 'android')}`,
        group: t(lang, 'automaticGroup'),
        route: '/automatic',
        keywords: ['android', 'device', 'أندرويد', 'جهاز', 'اتمتة'],
        icon: <Smartphone className="h-4 w-4 text-[#db9d37]" />,
      },
      {
        id: 'nav-tg',
        title: `${t(lang, 'automaticGroup')} · ${t(lang, 'telegram')}`,
        group: t(lang, 'automaticGroup'),
        route: '/automatic/telegram',
        keywords: ['telegram', 'bot', 'تيليجرام', 'بوت'],
        icon: <Send className="h-4 w-4 text-[#3b82f6]" />,
      },
      {
        id: 'nav-api',
        title: `${t(lang, 'automaticGroup')} · ${t(lang, 'api')}`,
        group: t(lang, 'automaticGroup'),
        route: '/automatic/api',
        keywords: ['api', 'webhook', 'key', 'مفتاح'],
        icon: <KeyRound className="h-4 w-4 text-[#00e344]" />,
      },
      {
        id: 'nav-messages',
        title: t(lang, 'messages'),
        group: t(lang, 'navigation'),
        route: '/messages',
        keywords: ['messages', 'sms', 'push', 'رسائل'],
        icon: <MessageSquareText className="h-4 w-4 text-[#a0a0a0]" />,
      },
      {
        id: 'nav-profile',
        title: t(lang, 'profile'),
        group: t(lang, 'navigation'),
        route: '/profile',
        keywords: ['profile', 'topup', 'شحن', 'حسابي', 'الملف'],
        icon: <User className="h-4 w-4 text-[#a0a0a0]" />,
      },
      {
        id: 'nav-referrals',
        title: t(lang, 'referrals'),
        group: t(lang, 'navigation'),
        route: '/referrals',
        keywords: ['referrals', 'partners', 'احالات', 'شركاء'],
        icon: <Users className="h-4 w-4 text-[#a0a0a0]" />,
      },
      {
        id: 'act-create-req',
        title: t(lang, 'createRequisite'),
        group: lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions',
        route: '/requisite',
        action: 'create',
        keywords: ['create requisite', 'add card', 'اضافة وسيلة', 'بطاقة جديدة'],
        icon: <Plus className="h-4 w-4 text-[#e25d0a]" />,
      },
      {
        id: 'act-create-topup',
        title: t(lang, 'createTopUp'),
        group: lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions',
        route: '/profile',
        action: 'create',
        keywords: ['topup', 'deposit usdt', 'شحن رصيد'],
        icon: <Plus className="h-4 w-4 text-[#00e344]" />,
      },
      {
        id: 'act-sim-order',
        title: t(lang, 'simulateNewOrder'),
        group: lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions',
        route: '/deposits',
        action: 'simulate',
        keywords: ['simulate', 'test order', 'محاكاة', 'طلب جديد'],
        icon: <Bot className="h-4 w-4 text-[#db9d37]" />,
      },
    ],
    [lang]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  if (!open) return null;

  const safeIndex = filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length) setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length) setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && safeIndex >= 0) {
      e.preventDefault();
      const chosen = filtered[safeIndex];
      onExecute(chosen.route, chosen.action);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-start justify-center pt-[12vh] px-4">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label={t(lang, 'searchPages')}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[14px] border border-[#2b2b2b] bg-[#151515] shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-[#252525] px-4 py-3">
          <Search className="h-4 w-4 text-[#737373] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder={t(lang, 'searchPages')}
            className="w-full bg-transparent text-[14.5px] text-white outline-none placeholder:text-[#737373]"
          />
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[6px] border border-[#303030] px-1.5 py-0.5 text-[11px] font-medium text-[#737373] hover:text-white cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-[360px] overflow-y-auto scrollbar-dark py-1.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13.5px] text-[#737373]">{t(lang, 'nothingFound')}</div>
          ) : (
            filtered.map((item, idx) => {
              const selected = idx === safeIndex;
              const isCurrent = !item.action && item.route === currentRoute;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    onExecute(item.route, item.action);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors cursor-pointer ${
                    selected ? 'bg-[#252525]' : 'bg-transparent'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="shrink-0">{item.icon}</span>
                    <span className="text-[13.5px] font-medium text-white truncate">{item.title}</span>
                  </span>
                  <span className="shrink-0 text-[11.5px] text-[#737373]">
                    {isCurrent ? t(lang, 'currentPage') : item.group}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#252525] px-4 py-2 text-[11.5px] text-[#737373]">
          <span>↑↓ {t(lang, 'toNavigate')}</span>
          <span>↵ {t(lang, 'toOpen')}</span>
        </div>
      </div>
    </div>
  );
}
