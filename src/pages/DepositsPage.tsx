import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Edit3,
  Plus,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { BottomBar } from '../components/BottomBar';
import { DetailDrawer, DrawerAction } from '../components/DetailDrawer';
import { FilterDrawer } from '../components/FilterDrawer';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AccountDesk, AppSettings, DepositOrder, DepositStatus } from '../types';
import {
  downloadCsv,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatRemainingMinutes,
} from '../utils/format';

interface DepositsPageProps {
  deposits: DepositOrder[];
  currentAccount: AccountDesk;
  settings: AppSettings;
  onAction: (id: string, action: 'confirm' | 'cancel' | 'dispute' | 'edit_amount', payload?: { newAmountLocal?: number }) => Promise<void>;
  onSimulateOrder: () => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

export function DepositsPage({
  deposits,
  currentAccount,
  settings,
  onAction,
  onSimulateOrder,
  onNotify,
}: DepositsPageProps) {
  const lang = settings.lang;
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | DepositStatus>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  // Draft filter drawer state
  const [draftStatus, setDraftStatus] = useState<'all' | DepositStatus>('all');
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [page, setPage] = useState(1);

  const accountDeposits = useMemo(
    () => deposits.filter((d) => d.accountId === currentAccount.account_id),
    [deposits, currentAccount.account_id]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = minAmount ? Number(minAmount) : null;
    const max = maxAmount ? Number(maxAmount) : null;
    return accountDeposits.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (min !== null && d.amountLocal < min) return false;
      if (max !== null && d.amountLocal > max) return false;
      if (q) {
        return (
          d.orderId.toLowerCase().includes(q) ||
          d.bankName.toLowerCase().includes(q) ||
          d.requisiteNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [accountDeposits, search, statusFilter, minAmount, maxAmount]);

  const selected = useMemo(
    () => accountDeposits.find((d) => d.id === selectedId) ?? null,
    [accountDeposits, selectedId]
  );

  const openFilterDrawer = () => {
    setDraftStatus(statusFilter);
    setDraftMin(minAmount);
    setDraftMax(maxAmount);
    setFilterOpen(true);
  };

  const copyText = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify('success', t(lang, 'copied'), val);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  const handleExport = () => {
    downloadCsv(
      `hostapay-deposits-${currentAccount.currency}.csv`,
      [t(lang, 'orderId'), t(lang, 'amount'), t(lang, 'usdt'), t(lang, 'income'), t(lang, 'bank'), t(lang, 'status'), t(lang, 'date')],
      filtered.map((d) => [
        d.orderId,
        `${d.amountLocal} ${currentAccount.currency}`,
        d.amountUsdt,
        d.incomeUsdt,
        d.bankName,
        d.status,
        formatDateTime(d.createdAt, settings),
      ])
    );
    onNotify('success', t(lang, 'exportCsv'));
  };

  const drawerActions: DrawerAction[] = selected
    ? selected.status === 'pending'
      ? [
          {
            label: t(lang, 'confirmDeposit'),
            tone: 'primary',
            confirm: {
              severity: 'info',
              title: t(lang, 'confirmDepositTitle'),
              message: t(lang, 'confirmDepositMsg'),
              confirmLabel: t(lang, 'confirmDeposit'),
            },
            onClick: async () => {
              await onAction(selected.id, 'confirm');
              onNotify('success', t(lang, 'status_completed'), selected.orderId);
            },
          },
          {
            label: t(lang, 'openDispute'),
            tone: 'secondary',
            onClick: async () => {
              await onAction(selected.id, 'dispute');
              onNotify('warning', t(lang, 'status_disputed'), selected.orderId);
            },
          },
          {
            label: t(lang, 'cancelOrder'),
            tone: 'danger',
            confirm: {
              severity: 'danger',
              title: t(lang, 'cancelOrderTitle'),
              message: t(lang, 'cancelOrderMsg'),
              confirmLabel: t(lang, 'cancelOrder'),
            },
            onClick: async () => {
              await onAction(selected.id, 'cancel');
              onNotify('error', t(lang, 'status_cancelled'), selected.orderId);
            },
          },
        ]
      : []
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Toolbar */}
      <div className="hpay-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#202020] bg-[#1b1b1b] px-4 lg:px-6 py-3 shrink-0">
        <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
          <button
            type="button"
            onClick={openFilterDrawer}
            className={`flex h-9 items-center gap-2 rounded-[10px] border px-3 text-[13px] font-medium transition-colors cursor-pointer shrink-0 ${
              statusFilter !== 'all' || minAmount || maxAmount
                ? 'border-[#e25d0a]/45 bg-[#e25d0a]/10 text-[#e25d0a]'
                : 'border-[#303030] bg-[#252525] text-white hover:bg-[#303030]'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>{t(lang, 'filters')}</span>
          </button>

          <div className="relative flex-1 max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 -translate-y-1/2 start-3 h-3.5 w-3.5 text-[#737373]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(lang, 'searchDepositId')}
              className="h-9 w-full rounded-[10px] border border-[#303030] bg-[#151515] ps-9 pe-3 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[#e25d0a]"
            />
          </div>

          {/* Quick Status Tabs */}
          <div className="hidden xl:flex items-center gap-1 rounded-[10px] border border-[#252525] bg-[#151515] p-1">
            {(['all', 'pending', 'completed', 'disputed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-[7px] px-2.5 py-1 text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#252525] text-white'
                    : 'text-[#737373] hover:text-white'
                }`}
              >
                {st === 'all' ? t(lang, 'anyStatus') : t(lang, `status_${st}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="flex h-9 items-center gap-1.5 rounded-[10px] border border-[#303030] bg-[#252525] px-3 text-[13px] font-medium text-[#aaaaaa] hover:text-white hover:bg-[#303030] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t(lang, 'exportCsv')}</span>
          </button>
          <button
            type="button"
            onClick={onSimulateOrder}
            className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#e25d0a] px-3.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{t(lang, 'simulateNewOrder')}</span>
          </button>
        </div>
      </div>

      {/* Table */}
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
                <th className="py-3 px-4 text-start">{t(lang, 'bank')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'status')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {filtered.map((dep, idx) => {
                const isSelected = dep.id === selectedId;
                const rowTint = settings.fullRowTint
                  ? dep.status === 'completed'
                    ? 'bg-[#00e344]/[0.04]'
                    : dep.status === 'disputed'
                    ? 'bg-[#e32200]/[0.05]'
                    : dep.status === 'pending'
                    ? 'bg-[#f4c20d]/[0.04]'
                    : ''
                  : '';

                return (
                  <tr
                    key={dep.id}
                    onClick={() => {
                      setSelectedId(dep.id);
                      setEditingAmount(false);
                      setAmountInput(String(dep.amountLocal));
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#252526]' : `${rowTint} hover:bg-[#202021]`
                    }`}
                  >
                    {!settings.hideRowNumbers && (
                      <td className="py-3 px-4 text-[#737373] font-mono-num">{idx + 1}</td>
                    )}
                    <td className="py-3 px-4 font-mono-num font-medium text-white whitespace-nowrap">
                      {dep.orderId}
                    </td>
                    <td className="py-3 px-4 font-mono-num font-semibold text-white whitespace-nowrap">
                      {formatMoney(dep.amountLocal)}{' '}
                      <span className="text-[11px] font-normal text-[#737373]">{currentAccount.currency}</span>
                    </td>
                    <td className="py-3 px-4 font-mono-num text-[#aaaaaa] whitespace-nowrap">
                      {formatNumber(dep.amountUsdt)}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-[#00e344] whitespace-nowrap">
                      +{formatNumber(dep.incomeUsdt)}
                    </td>
                    <td className="py-3 px-4 text-[#cccccc]">
                      <div className="max-w-[210px] truncate">{dep.bankName}</div>
                      <div className="text-[11.5px] font-mono-num text-[#737373] truncate">{dep.requisiteNumber}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={dep.status} lang={lang} />
                    </td>
                    <td className="py-3 px-4 text-[12px] font-mono-num text-[#737373] whitespace-nowrap">
                      {formatDateTime(dep.createdAt, settings)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Filter Drawer */}
      <FilterDrawer
        open={filterOpen}
        lang={lang}
        onClose={() => setFilterOpen(false)}
        onClear={() => {
          setDraftStatus('all');
          setDraftMin('');
          setDraftMax('');
          setStatusFilter('all');
          setMinAmount('');
          setMaxAmount('');
        }}
        onApply={() => {
          setStatusFilter(draftStatus);
          setMinAmount(draftMin);
          setMaxAmount(draftMax);
        }}
      >
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-[#aaaaaa]">{t(lang, 'status')}</label>
          <select
            value={draftStatus}
            onChange={(e) => setDraftStatus(e.target.value as 'all' | DepositStatus)}
            className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
          >
            <option value="all">{t(lang, 'anyStatus')}</option>
            <option value="pending">{t(lang, 'status_pending')}</option>
            <option value="completed">{t(lang, 'status_completed')}</option>
            <option value="disputed">{t(lang, 'status_disputed')}</option>
            <option value="cancelled">{t(lang, 'status_cancelled')}</option>
            <option value="expired">{t(lang, 'status_expired')}</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-[#aaaaaa]">
            {t(lang, 'minAmount')} ({currentAccount.currency})
          </label>
          <input
            type="number"
            value={draftMin}
            onChange={(e) => setDraftMin(e.target.value)}
            placeholder="0"
            className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white font-mono-num outline-none focus:border-[#e25d0a]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-[#aaaaaa]">
            {t(lang, 'maxAmount')} ({currentAccount.currency})
          </label>
          <input
            type="number"
            value={draftMax}
            onChange={(e) => setDraftMax(e.target.value)}
            placeholder="100000"
            className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white font-mono-num outline-none focus:border-[#e25d0a]"
          />
        </div>
      </FilterDrawer>

      {/* Slide-over Detail Drawer */}
      <DetailDrawer
        open={Boolean(selected)}
        lang={lang}
        section={t(lang, 'depositsListing')}
        title={selected?.orderId ?? ''}
        status={selected?.status}
        copyText={selected ? `${selected.orderId} | ${selected.amountLocal} ${currentAccount.currency} | ${selected.requisiteNumber}` : ''}
        skipConfirm={settings.skipConfirm}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => setSelectedId(null)}
        actions={drawerActions}
      >
        {selected && (
          <div className="space-y-5">
            {/* Big Amount Card */}
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] text-[#737373]">{t(lang, 'amount')}</span>
                {selected.status === 'pending' && !editingAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setAmountInput(String(selected.amountLocal));
                      setEditingAmount(true);
                    }}
                    className="flex items-center gap-1 text-[12px] font-medium text-[#e25d0a] hover:underline cursor-pointer"
                  >
                    <Edit3 className="h-3 w-3" />
                    <span>{t(lang, 'editAmount')}</span>
                  </button>
                )}
              </div>

              {editingAmount ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="flex-1 rounded-lg border border-[#e25d0a] bg-[#151515] px-3 py-1.5 text-[16px] font-bold font-mono-num text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const num = Number(amountInput);
                      if (num > 0) {
                        await onAction(selected.id, 'edit_amount', { newAmountLocal: num });
                        onNotify('success', t(lang, 'save'));
                      }
                      setEditingAmount(false);
                    }}
                    className="flex h-9 items-center gap-1 rounded-lg bg-[#e25d0a] px-3 text-[12.5px] font-semibold text-white cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{t(lang, 'save')}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-1 text-[24px] font-bold font-mono-num text-white">
                  {formatMoney(selected.amountLocal)}{' '}
                  <span className="text-[14px] font-medium text-[#aaaaaa]">{currentAccount.currency}</span>
                </div>
              )}

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

            {/* Requisites Box */}
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-white">{t(lang, 'requisite')}</span>
                <span className="text-[11.5px] font-mono-num text-[#737373]">{selected.requisiteId}</span>
              </div>

              <DetailRow label={t(lang, 'bank')} value={selected.bankName} />
              <DetailRow label={t(lang, 'ownerName')} value={selected.ownerName} />

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[12px] text-[#737373]">{t(lang, 'accountNumber')}</span>
                <button
                  type="button"
                  onClick={() => copyText(selected.requisiteNumber)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#303030] bg-[#252525] px-2.5 py-1 text-[12.5px] font-mono-num text-white hover:bg-[#303030] cursor-pointer"
                >
                  <span>{selected.requisiteNumber}</span>
                  <Copy className="h-3 w-3 text-[#909090]" />
                </button>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 gap-2">
              <div className="text-[12px] text-[#737373] self-start">{t(lang, 'qrCode')}</div>
              <QrCodeSvg value={`hpay:${selected.orderId}:${selected.requisiteNumber}:${selected.amountLocal}`} size={136} />
            </div>

            {/* Timestamps */}
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-2.5">
              <DetailRow label={t(lang, 'date')} value={formatDateTime(selected.createdAt, settings)} mono />
              <DetailRow
                label={t(lang, 'timeLeft')}
                value={
                  selected.status === 'pending'
                    ? formatRemainingMinutes(selected.expiresAt, lang)
                    : '—'
                }
                mono
              />
              {selected.confirmedAt && (
                <DetailRow
                  label={t(lang, 'status_completed')}
                  value={formatDateTime(selected.confirmedAt, settings)}
                  mono
                />
              )}
            </div>
          </div>
        )}
      </DetailDrawer>

      <BottomBar
        lang={lang}
        page={page}
        totalPages={1}
        onPageChange={setPage}
        onRefresh={() => onNotify('success', t(lang, 'refresh'))}
      />
    </div>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="text-[#737373] shrink-0">{label}</span>
      <span className={`text-white text-end truncate ${mono ? 'font-mono-num' : ''}`}>{value}</span>
    </div>
  );
}
