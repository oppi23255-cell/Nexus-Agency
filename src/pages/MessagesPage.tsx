import React, { useMemo, useState } from 'react';
import { MessageSquarePlus, Search } from 'lucide-react';
import { DetailDrawer } from '../components/DetailDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AppSettings, SmsMessage } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export function MessagesPage({
  messages,
  settings,
  onSimulateSms,
  onNotify,
}: {
  messages: SmsMessage[];
  settings: AppSettings;
  onSimulateSms: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [selected, setSelected] = useState<SmsMessage | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter !== 'all' && m.status !== filter) return false;
      if (q) {
        return (
          m.sender.toLowerCase().includes(q) ||
          m.body.toLowerCase().includes(q) ||
          (m.matchedOrderId?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [messages, filter, search]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hpay-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#202020] bg-[#1b1b1b] px-4 lg:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-[#737373]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث في نص الرسالة أو المرسل...' : 'Search SMS body or sender...'}
              className="h-9 w-full rounded-[10px] border border-[#303030] bg-[#151515] ps-9 pe-3 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[#e25d0a]"
            />
          </div>

          <div className="flex items-center gap-1 rounded-[10px] border border-[#252525] bg-[#151515] p-1">
            {(['all', 'matched', 'unmatched'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilter(st)}
                className={`rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                  filter === st ? 'bg-[#252525] text-white' : 'text-[#737373] hover:text-white'
                }`}
              >
                {st === 'all' ? t(lang, 'anyStatus') : t(lang, `status_${st}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSimulateSms}
          className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#e25d0a] px-3.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 transition-colors cursor-pointer whitespace-nowrap"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span>{t(lang, 'simulateSms')}</span>
        </button>
      </div>

      <div className="hpay-table-wrap flex-1 min-h-0 overflow-auto scrollbar-dark">
        <table className="hpay-table w-full border-collapse text-start">
          <thead className="sticky top-0 z-10 bg-[#202021] border-b border-[#2a2a2a]">
            <tr className="text-[12px] font-medium text-[#a0a0a0]">
              {!settings.hideRowNumbers && <th className="py-3 px-4 text-start w-12">#</th>}
              <th className="py-3 px-4 text-start">{t(lang, 'smsSender')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'smsBody')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'amount')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'matchedOrder')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'status')}</th>
              <th className="py-3 px-4 text-start">{t(lang, 'date')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#202020]">
            {filtered.map((msg, idx) => (
              <tr
                key={msg.id}
                onClick={() => setSelected(msg)}
                className={`cursor-pointer transition-colors ${
                  selected?.id === msg.id ? 'bg-[#252526]' : 'hover:bg-[#202021]'
                }`}
              >
                {!settings.hideRowNumbers && (
                  <td className="py-3 px-4 text-[#737373] font-mono-num">{idx + 1}</td>
                )}
                <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{msg.sender}</td>
                <td className="py-3 px-4 text-[#cccccc] max-w-md truncate">{msg.body}</td>
                <td className="py-3 px-4 font-mono-num font-semibold text-[#00e344] whitespace-nowrap">
                  {msg.parsedAmount !== null ? `${formatMoney(msg.parsedAmount)} ${msg.currency}` : '—'}
                </td>
                <td className="py-3 px-4 font-mono-num text-[#db9d37] whitespace-nowrap">
                  {msg.matchedOrderId ?? '—'}
                </td>
                <td className="py-3 px-4 whitespace-nowrap">
                  <StatusBadge status={msg.status} lang={lang} />
                </td>
                <td className="py-3 px-4 text-[12px] font-mono-num text-[#737373] whitespace-nowrap">
                  {formatDateTime(msg.receivedAt, settings)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        lang={lang}
        section={t(lang, 'messages')}
        title={selected?.sender ?? ''}
        status={selected?.status}
        copyText={selected?.body}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4">
              <div className="text-[12px] text-[#737373] mb-1.5">{t(lang, 'smsBody')}</div>
              <p className="text-[13.5px] text-white leading-relaxed">{selected.body}</p>
            </div>
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'android')}</span>
                <span className="text-white">{selected.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'amount')}</span>
                <span className="font-mono-num text-[#00e344]">
                  {selected.parsedAmount !== null ? `${formatMoney(selected.parsedAmount)} ${selected.currency}` : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'matchedOrder')}</span>
                <span className="font-mono-num text-[#db9d37]">{selected.matchedOrderId ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'date')}</span>
                <span className="font-mono-num text-[#aaaaaa]">{formatDateTime(selected.receivedAt, settings)}</span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
