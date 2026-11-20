import React, { useMemo, useRef, useState } from 'react';
import { Copy, FileText, Search, Upload } from 'lucide-react';
import { DetailDrawer, DrawerAction } from '../components/DetailDrawer';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AccountDesk, AppSettings, WithdrawalOrder } from '../types';
import { formatDateTime, formatMoney, formatNumber, formatRemainingMinutes } from '../utils/format';

export function WithdrawalsPage({
  mode,
  withdrawals,
  currentAccount,
  settings,
  onClaim,
  onUpdate,
  onNotify,
}: {
  mode: 'pool' | 'my';
  withdrawals: WithdrawalOrder[];
  currentAccount: AccountDesk;
  settings: AppSettings;
  onClaim: (id: string) => Promise<void>;
  onUpdate: (
    id: string,
    action: 'complete' | 'release' | 'attach',
    files?: Array<{ name: string; size: string }>
  ) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withdrawals.filter((w) => {
      if (w.accountId !== currentAccount.account_id) return false;
      if (mode === 'pool' && w.status !== 'available') return false;
      if (mode === 'my' && w.status === 'available') return false;
      if (q) {
        return (
          w.orderId.toLowerCase().includes(q) ||
          w.recipientName.toLowerCase().includes(q) ||
          w.requisiteNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [withdrawals, currentAccount.account_id, mode, search]);

  const selected = useMemo(
    () => withdrawals.find((w) => w.id === selectedId) ?? null,
    [withdrawals, selectedId]
  );

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || !selected) return;
    const files = Array.from(fileList).map((f) => ({
      name: f.name,
      size: `${Math.max(12, Math.round(f.size / 1024))} KB`,
    }));
    await onUpdate(selected.id, 'attach', files);
    onNotify('success', t(lang, 'uploadReceipt'), files.map((f) => f.name).join(', '));
  };

  const copyVal = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify('success', t(lang, 'copied'), val);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  const drawerActions: DrawerAction[] = selected
    ? selected.status === 'available'
      ? [
          {
            label: t(lang, 'claimWithdrawal'),
            tone: 'primary',
            onClick: async () => {
              await onClaim(selected.id);
              onNotify('success', t(lang, 'claimWithdrawal'), selected.orderId);
            },
          },
        ]
      : selected.status === 'accepted'
      ? [
          {
            label: t(lang, 'completeWithdrawal'),
            tone: 'primary',
            confirm: {
              severity: 'info',
              title: t(lang, 'completeWithdrawalTitle'),
              message: t(lang, 'completeWithdrawalMsg'),
              confirmLabel: t(lang, 'completeWithdrawal'),
            },
            onClick: async () => {
              const autoReceipt =
                selected.receiptFiles.length === 0
                  ? [{ name: `receipt-${selected.orderId}.jpg`, size: '214 KB' }]
                  : undefined;
              await onUpdate(selected.id, 'complete', autoReceipt);
              onNotify('success', t(lang, 'status_completed'), selected.orderId);
            },
          },
          {
            label: t(lang, 'releaseWithdrawal'),
            tone: 'secondary',
            onClick: async () => {
              await onUpdate(selected.id, 'release');
              onNotify('warning', t(lang, 'releaseWithdrawal'), selected.orderId);
              setSelectedId(null);
            },
          },
        ]
      : []
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="hpay-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#202020] bg-[#1b1b1b] px-4 lg:px-6 py-3 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-[#737373]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(lang, 'searchWithdrawalId')}
            className="h-9 w-full rounded-[10px] border border-[#303030] bg-[#151515] ps-9 pe-3 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[#e25d0a]"
          />
        </div>
      </div>

      <div className="hpay-table-wrap flex-1 min-h-0 overflow-auto scrollbar-dark">
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-[#737373]">
            <p className="text-[14px]">{t(lang, 'nothingFound')}</p>
          </div>
        ) : (
          <table className="hpay-table w-full border-collapse text-start">
            <thead className="sticky top-0 z-10 bg-[#202021] border-b border-[#2a2a2a]">
              <tr className="text-[12px] font-medium text-[#a0a0a0]">
                {!settings.hideRowNumbers && <th className="py-3 px-4 text-start w-12">#</th>}
                <th className="py-3 px-4 text-start">{t(lang, 'orderId')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'amount')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'usdt')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'income')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'destinationMethod')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'recipientName')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'timeLeft')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {filtered.map((w, idx) => (
                <tr
                  key={w.id}
                  onClick={() => setSelectedId(w.id)}
                  className={`cursor-pointer transition-colors ${
                    w.id === selectedId ? 'bg-[#252526]' : 'hover:bg-[#202021]'
                  }`}
                >
                  {!settings.hideRowNumbers && (
                    <td className="py-3 px-4 text-[#737373] font-mono-num">{idx + 1}</td>
                  )}
                  <td className="py-3 px-4 font-mono-num font-medium text-white whitespace-nowrap">
                    {w.orderId}
                  </td>
                  <td className="py-3 px-4 font-mono-num font-semibold text-white whitespace-nowrap">
                    {formatMoney(w.amountLocal)} {currentAccount.currency}
                  </td>
                  <td className="py-3 px-4 font-mono-num text-[#aaaaaa] whitespace-nowrap">
                    {formatNumber(w.amountUsdt)}
                  </td>
                  <td className="py-3 px-4 font-mono-num text-[#00e344] whitespace-nowrap">
                    +{formatNumber(w.incomeUsdt)}
                  </td>
                  <td className="py-3 px-4 text-[#cccccc]">
                    <div>{w.destinationMethod}</div>
                    <div className="text-[11.5px] font-mono-num text-[#737373]">{w.requisiteNumber}</div>
                  </td>
                  <td className="py-3 px-4 text-white whitespace-nowrap">{w.recipientName}</td>
                  <td className="py-3 px-4 font-mono-num text-[#f4c20d] whitespace-nowrap">
                    {w.status === 'available' || w.status === 'accepted'
                      ? formatRemainingMinutes(w.expiresAt, lang)
                      : '—'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge status={w.status} lang={lang} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DetailDrawer
        open={Boolean(selected)}
        lang={lang}
        section={mode === 'pool' ? t(lang, 'withdrawalsListing') : t(lang, 'myWithdrawals')}
        title={selected?.orderId ?? ''}
        status={selected?.status}
        copyText={selected ? `${selected.orderId} | ${selected.requisiteNumber}` : ''}
        skipConfirm={settings.skipConfirm}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => setSelectedId(null)}
        actions={drawerActions}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4">
              <div className="text-[12px] text-[#737373]">{t(lang, 'amount')}</div>
              <div className="mt-1 text-[24px] font-bold font-mono-num text-white">
                {formatMoney(selected.amountLocal)}{' '}
                <span className="text-[14px] font-medium text-[#aaaaaa]">{currentAccount.currency}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#252525] pt-3 text-[12px]">
                <div>
                  <div className="text-[#737373]">{t(lang, 'usdt')}</div>
                  <div className="mt-0.5 font-mono-num font-semibold text-white">
                    {formatNumber(selected.amountUsdt)}
                  </div>
                </div>
                <div>
                  <div className="text-[#737373]">{t(lang, 'income')}</div>
                  <div className="mt-0.5 font-mono-num font-semibold text-[#00e344]">
                    +{formatNumber(selected.incomeUsdt)}
                  </div>
                </div>
                <div>
                  <div className="text-[#737373]">{t(lang, 'acquiringRate')}</div>
                  <div className="mt-0.5 font-mono-num font-semibold text-[#db9d37]">
                    {selected.rate.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">{t(lang, 'destinationMethod')}</span>
                <span className="text-white font-medium">{selected.destinationMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">{t(lang, 'recipientName')}</span>
                <span className="text-white">{selected.recipientName}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#737373]">{t(lang, 'requisite')}</span>
                <button
                  type="button"
                  onClick={() => copyVal(selected.requisiteNumber)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#303030] bg-[#252525] px-2.5 py-1 text-[12.5px] font-mono-num text-white hover:bg-[#303030] cursor-pointer"
                >
                  <span>{selected.requisiteNumber}</span>
                  <Copy className="h-3 w-3 text-[#909090]" />
                </button>
              </div>
              {selected.acceptedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[#737373]">{t(lang, 'acceptedAt')}</span>
                  <span className="font-mono-num text-[#aaaaaa] text-[12px]">
                    {formatDateTime(selected.acceptedAt, settings)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#737373]">{t(lang, 'expiresAt')}</span>
                <span className="font-mono-num text-[#f4c20d] text-[12px]">
                  {formatRemainingMinutes(selected.expiresAt, lang)}
                </span>
              </div>
            </div>

            {/* Receipt Upload Zone for Accepted or Completed */}
            {(selected.status === 'accepted' || selected.status === 'completed') && (
              <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-3">
                <div className="text-[13px] font-semibold text-white">{t(lang, 'uploadReceipt')}</div>
                {selected.status === 'accepted' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => handleFilesSelected(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#383838] bg-[#151515] py-5 px-4 text-center hover:border-[#e25d0a] transition-colors cursor-pointer"
                    >
                      <Upload className="h-5 w-5 text-[#e25d0a]" />
                      <span className="text-[13px] font-medium text-white">{t(lang, 'attachFiles')}</span>
                      <span className="text-[11.5px] text-[#737373]">{t(lang, 'multipleFiles')}</span>
                    </button>
                  </>
                )}

                {selected.receiptFiles.length > 0 && (
                  <div className="space-y-2">
                    {selected.receiptFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-[#2a2a2a] bg-[#202020] px-3 py-2 text-[12.5px]"
                      >
                        <span className="flex items-center gap-2 text-white truncate">
                          <FileText className="h-4 w-4 text-[#00e344] shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </span>
                        <span className="text-[#737373] font-mono-num shrink-0">{f.size}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
