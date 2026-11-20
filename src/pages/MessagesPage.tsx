import React, { useMemo, useState } from 'react';
import { CheckCircle2, MessageSquarePlus, Search, XCircle } from 'lucide-react';
import { DetailDrawer, DrawerAction } from '../components/DetailDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AppSettings, SmsMessage } from '../types';
import { formatDateTime, formatMoney } from '../utils/format';

export function MessagesPage({
  messages,
  settings,
  onSimulateSms,
  onRespondWithdrawal,
  onNotify,
}: {
  messages: SmsMessage[];
  settings: AppSettings;
  onSimulateSms: () => Promise<void>;
  onRespondWithdrawal: (messageId: string, action: 'confirm' | 'reject') => Promise<{ ok?: boolean; error?: string }>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const currLabel = t(lang, 'currencyShort');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending_withdrawal' | 'matched' | 'unmatched'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'pending_withdrawal' && m.withdrawalActionStatus !== 'pending_confirmation') {
        return false;
      }
      if ((filter === 'matched' || filter === 'unmatched') && m.status !== filter) return false;
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

  const selected = useMemo(
    () => messages.find((m) => m.id === selectedId) ?? null,
    [messages, selectedId]
  );

  const handleWithdrawalResponse = async (msg: SmsMessage, action: 'confirm' | 'reject') => {
    setBusyId(msg.id);
    try {
      const res = await onRespondWithdrawal(msg.id, action);
      if (res && res.ok === false) {
        onNotify('error', res.error || (lang === 'ar' ? 'الرصيد مش كافي لإتمام السحب' : 'Insufficient balance'));
        return;
      }
      if (action === 'confirm') {
        onNotify(
          'success',
          lang === 'ar' ? 'تم تأكيد السحب وخصم المبلغ' : 'Withdrawal confirmed & deducted',
          `${formatMoney(msg.withdrawalAmountEgp ?? msg.parsedAmount ?? 0)} ${currLabel}`
        );
      } else {
        onNotify(
          'warning',
          lang === 'ar' ? 'تم رفض السحب ولم يتم خصم أي مبلغ' : 'Withdrawal rejected — balance untouched',
          msg.matchedOrderId ?? ''
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const drawerActions: DrawerAction[] =
    selected && selected.withdrawalActionStatus === 'pending_confirmation'
      ? [
          {
            label: t(lang, 'confirmWithdrawalBtn'),
            tone: 'primary',
            onClick: async () => {
              await handleWithdrawalResponse(selected, 'confirm');
            },
          },
          {
            label: t(lang, 'rejectWithdrawalBtn'),
            tone: 'danger',
            onClick: async () => {
              await handleWithdrawalResponse(selected, 'reject');
            },
          },
        ]
      : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hpay-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#202020] bg-[#1b1b1b] px-4 lg:px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-[#737373]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'ar' ? 'ابحث في نص الرسالة أو رقم الطلب...' : 'Search message or order ID...'
              }
              className="h-9 w-full rounded-[10px] border border-[#303030] bg-[#151515] ps-9 pe-3 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[#e25d0a]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-[10px] border border-[#252525] bg-[#151515] p-1">
            {(
              [
                { id: 'all', label: t(lang, 'anyStatus') },
                {
                  id: 'pending_withdrawal',
                  label: lang === 'ar' ? 'طلبات سحب للتأكيد' : 'Withdrawal Requests',
                },
                { id: 'matched', label: t(lang, 'status_matched') },
                { id: 'unmatched', label: t(lang, 'status_unmatched') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
                  filter === tab.id ? 'bg-[#252525] text-white' : 'text-[#737373] hover:text-white'
                }`}
              >
                {tab.label}
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
        {filtered.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-[13.5px] text-[#737373]">
            {t(lang, 'nothingFound')}
          </div>
        ) : (
          <table className="hpay-table w-full border-collapse text-start">
            <thead className="sticky top-0 z-10 bg-[#202021] border-b border-[#2a2a2a]">
              <tr className="text-[12px] font-medium text-[#a0a0a0]">
                {!settings.hideRowNumbers && <th className="py-3 px-4 text-start w-12">#</th>}
                <th className="py-3 px-4 text-start">{t(lang, 'smsSender')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'smsBody')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'amount')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'matchedOrder')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'status')}</th>
                <th className="py-3 px-4 text-start">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {filtered.map((msg, idx) => {
                const isPendingWithdrawal = msg.withdrawalActionStatus === 'pending_confirmation';
                const amountVal = msg.withdrawalAmountEgp ?? msg.parsedAmount;

                return (
                  <tr
                    key={msg.id}
                    onClick={() => setSelectedId(msg.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedId === msg.id
                        ? 'bg-[#252526]'
                        : isPendingWithdrawal
                        ? 'bg-[#e25d0a]/[0.06] hover:bg-[#e25d0a]/[0.1]'
                        : 'hover:bg-[#202021]'
                    }`}
                  >
                    {!settings.hideRowNumbers && (
                      <td className="py-3 px-4 text-[#737373] font-mono-num">{idx + 1}</td>
                    )}
                    <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">{msg.sender}</td>
                    <td className="py-3 px-4 text-[#cccccc] max-w-md">
                      <div className="truncate">{msg.body}</div>
                      {msg.withdrawalDestination && (
                        <div className="text-[11.5px] text-[#db9d37] mt-0.5 truncate">
                          {msg.withdrawalDestination}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono-num font-semibold text-[#00e344] whitespace-nowrap">
                      {amountVal !== null && amountVal !== undefined
                        ? `${formatMoney(amountVal)} ${currLabel}`
                        : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-[#db9d37] whitespace-nowrap">
                      {msg.matchedOrderId ?? '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {msg.withdrawalActionStatus === 'pending_confirmation' ? (
                        <StatusBadge status="awaiting_confirmation" lang={lang} />
                      ) : msg.withdrawalActionStatus === 'confirmed' ? (
                        <StatusBadge status="completed" lang={lang} />
                      ) : msg.withdrawalActionStatus === 'rejected' ? (
                        <StatusBadge status="cancelled" lang={lang} />
                      ) : (
                        <StatusBadge status={msg.status} lang={lang} />
                      )}
                    </td>
                    <td
                      className="py-3 px-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPendingWithdrawal ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === msg.id}
                            onClick={() => handleWithdrawalResponse(msg, 'confirm')}
                            className="inline-flex items-center gap-1 rounded-[8px] bg-[#00e344] px-2.5 py-1 text-[11.5px] font-bold text-black hover:opacity-90 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>{lang === 'ar' ? 'تأكيد وخصم' : 'Confirm'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={busyId === msg.id}
                            onClick={() => handleWithdrawalResponse(msg, 'reject')}
                            className="inline-flex items-center gap-1 rounded-[8px] border border-[#e32200]/50 bg-[#e32200]/15 px-2.5 py-1 text-[11.5px] font-semibold text-[#ff6b57] hover:bg-[#e32200]/25 disabled:opacity-50 cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>{lang === 'ar' ? 'رفض' : 'Reject'}</span>
                          </button>
                        </div>
                      ) : msg.withdrawalActionStatus === 'confirmed' ? (
                        <span className="text-[11.5px] text-[#00e344]">
                          {t(lang, 'withdrawalConfirmedTag')}
                        </span>
                      ) : msg.withdrawalActionStatus === 'rejected' ? (
                        <span className="text-[11.5px] text-[#a0a0a0]">
                          {t(lang, 'withdrawalRejectedTag')}
                        </span>
                      ) : (
                        <span className="text-[#555555]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[12px] font-mono-num text-[#737373] whitespace-nowrap">
                      {formatDateTime(msg.receivedAt, settings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        lang={lang}
        section={t(lang, 'messages')}
        title={selected?.sender ?? ''}
        status={
          selected?.withdrawalActionStatus === 'pending_confirmation'
            ? 'awaiting_confirmation'
            : selected?.withdrawalActionStatus === 'confirmed'
            ? 'completed'
            : selected?.withdrawalActionStatus === 'rejected'
            ? 'cancelled'
            : selected?.status
        }
        copyText={selected?.body}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => setSelectedId(null)}
        actions={drawerActions}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4">
              <div className="text-[12px] text-[#737373] mb-1.5">{t(lang, 'smsBody')}</div>
              <p className="text-[13.5px] text-white leading-relaxed">{selected.body}</p>
            </div>

            {selected.withdrawalActionStatus && (
              <div className="rounded-[12px] border border-[#e25d0a]/30 bg-[#e25d0a]/10 p-4 space-y-2 text-[13px]">
                <div className="font-semibold text-[#e25d0a]">
                  {lang === 'ar' ? 'تفاصيل طلب السحب' : 'Withdrawal Request Details'}
                </div>
                {selected.withdrawalDestination && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[#aaaaaa]">{t(lang, 'destinationMethod')}</span>
                    <span className="text-white font-medium">{selected.withdrawalDestination}</span>
                  </div>
                )}
                {selected.withdrawalRecipient && (
                  <div className="flex justify-between gap-2">
                    <span className="text-[#aaaaaa]">{t(lang, 'recipientName')}</span>
                    <span className="text-white">{selected.withdrawalRecipient}</span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-[#aaaaaa]">{t(lang, 'amount')}</span>
                  <span className="font-mono-num font-bold text-[#00e344]">
                    {formatMoney(selected.withdrawalAmountEgp ?? selected.parsedAmount ?? 0)} {currLabel}
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'android')}</span>
                <span className="text-white">{selected.deviceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'amount')}</span>
                <span className="font-mono-num text-[#00e344]">
                  {(selected.withdrawalAmountEgp ?? selected.parsedAmount) !== null
                    ? `${formatMoney((selected.withdrawalAmountEgp ?? selected.parsedAmount) as number)} ${currLabel}`
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'matchedOrder')}</span>
                <span className="font-mono-num text-[#db9d37]">{selected.matchedOrderId ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'date')}</span>
                <span className="font-mono-num text-[#aaaaaa]">
                  {formatDateTime(selected.receivedAt, settings)}
                </span>
              </div>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
