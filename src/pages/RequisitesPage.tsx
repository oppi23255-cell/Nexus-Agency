import React, { useEffect, useMemo, useState } from 'react';
import { Copy, CreditCard, Plus, Search, Smartphone, Wallet } from 'lucide-react';
import { DetailDrawer, DrawerAction } from '../components/DetailDrawer';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AccountDesk, AndroidDevice, AppSettings, Requisite, RequisiteType } from '../types';
import { formatMoney } from '../utils/format';

export function RequisitesPage({
  requisites,
  devices,
  currentAccount,
  settings,
  triggerCreate,
  onClearTriggerCreate,
  onCreate,
  onUpdate,
  onDelete,
  onNotify,
}: {
  requisites: Requisite[];
  devices: AndroidDevice[];
  currentAccount: AccountDesk;
  settings: AppSettings;
  triggerCreate: boolean;
  onClearTriggerCreate: () => void;
  onCreate: (data: Partial<Requisite>) => Promise<void>;
  onUpdate: (id: string, data: Partial<Requisite>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create/Edit form state
  const [bankName, setBankName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [reqType, setReqType] = useState<RequisiteType>('wallet');
  const [minOrder, setMinOrder] = useState('200');
  const [maxOrder, setMaxOrder] = useState('30000');
  const [dailyLimit, setDailyLimit] = useState('150000');
  const [bidRate, setBidRate] = useState(String(currentAccount.depositFeePct));
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    if (triggerCreate) {
      openCreateDrawer();
      onClearTriggerCreate();
    }
  }, [triggerCreate, onClearTriggerCreate]);

  const openCreateDrawer = () => {
    setSelectedId(null);
    setBankName('');
    setOwnerName('');
    setAccountNumber('');
    setReqType('wallet');
    setMinOrder('200');
    setMaxOrder('30000');
    setDailyLimit('150000');
    setBidRate(String(currentAccount.depositFeePct));
    setDeviceId(devices[0]?.id ?? '');
    setCreating(true);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requisites.filter((r) => {
      if (r.accountId !== currentAccount.account_id) return false;
      if (q) {
        return (
          r.bankName.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.accountNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [requisites, currentAccount.account_id, search]);

  const selected = useMemo(
    () => requisites.find((r) => r.id === selectedId) ?? null,
    [requisites, selectedId]
  );

  const selectForEdit = (req: Requisite) => {
    setCreating(false);
    setSelectedId(req.id);
    setBankName(req.bankName);
    setOwnerName(req.ownerName);
    setAccountNumber(req.accountNumber);
    setReqType(req.type);
    setMinOrder(String(req.minOrder));
    setMaxOrder(String(req.maxOrder));
    setDailyLimit(String(req.dailyLimit));
    setBidRate(String(req.bidRate));
    setDeviceId(req.deviceId ?? '');
  };

  const copyNum = async (num: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await navigator.clipboard.writeText(num);
      onNotify('success', t(lang, 'copied'), num);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  const drawerActions: DrawerAction[] = creating
    ? [
        {
          label: t(lang, 'createRequisite'),
          tone: 'primary',
          onClick: async () => {
            if (!bankName.trim() || !accountNumber.trim()) {
              onNotify('error', lang === 'ar' ? 'أكمل اسم البنك ورقم الحساب' : 'Bank name and account number are required');
              return;
            }
            await onCreate({
              accountId: currentAccount.account_id,
              bankName: bankName.trim(),
              ownerName: ownerName.trim() || 'مكتب النخبة',
              accountNumber: accountNumber.trim(),
              type: reqType,
              minOrder: Number(minOrder) || 200,
              maxOrder: Number(maxOrder) || 25000,
              dailyLimit: Number(dailyLimit) || 150000,
              bidRate: Number(bidRate) || currentAccount.depositFeePct,
              deviceId: deviceId || undefined,
            });
            setCreating(false);
            onNotify('success', t(lang, 'createRequisite'), bankName.trim());
          },
        },
      ]
    : selected
    ? [
        {
          label: t(lang, 'updateRequisite'),
          tone: 'primary',
          onClick: async () => {
            await onUpdate(selected.id, {
              bankName,
              ownerName,
              accountNumber,
              type: reqType,
              minOrder: Number(minOrder) || selected.minOrder,
              maxOrder: Number(maxOrder) || selected.maxOrder,
              dailyLimit: Number(dailyLimit) || selected.dailyLimit,
              bidRate: Number(bidRate) || selected.bidRate,
              deviceId: deviceId || undefined,
            });
            onNotify('success', t(lang, 'updateRequisite'));
          },
        },
        {
          label: selected.active ? t(lang, 'disable') : t(lang, 'enable'),
          tone: 'secondary',
          onClick: async () => {
            await onUpdate(selected.id, { active: !selected.active });
            onNotify('success', selected.active ? t(lang, 'paused') : t(lang, 'active'));
          },
        },
        {
          label: t(lang, 'deleteRequisite'),
          tone: 'danger',
          confirm: {
            severity: 'danger',
            title: t(lang, 'deleteRequisiteTitle'),
            message: t(lang, 'deleteRequisiteMsg'),
            confirmLabel: t(lang, 'deleteRequisite'),
          },
          onClick: async () => {
            await onDelete(selected.id);
            setSelectedId(null);
            onNotify('error', t(lang, 'deleteRequisite'));
          },
        },
      ]
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
            placeholder={lang === 'ar' ? 'ابحث بالبنك أو رقم المحفظة أو المالك...' : 'Search bank, card, or owner...'}
            className="h-9 w-full rounded-[10px] border border-[#303030] bg-[#151515] ps-9 pe-3 text-[13px] text-white placeholder:text-[#737373] outline-none focus:border-[#e25d0a]"
          />
        </div>

        <button
          type="button"
          onClick={openCreateDrawer}
          className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#e25d0a] px-3.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>{t(lang, 'createRequisite')}</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-dark p-4 lg:p-6">
        {filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-[#737373]">
            <p className="text-[14px]">{t(lang, 'nothingFound')}</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              settings.compactCards
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}
          >
            {filtered.map((req) => {
              const pct = Math.min(100, Math.round((req.dailyUsed / Math.max(1, req.dailyLimit)) * 100));
              return (
                <div
                  key={req.id}
                  onClick={() => selectForEdit(req)}
                  className={`rounded-[12px] border transition-colors cursor-pointer ${
                    settings.compactCards ? 'p-3.5' : 'p-4'
                  } ${
                    req.id === selectedId
                      ? 'border-[#e25d0a] bg-[#202020]'
                      : 'border-[#252525] bg-[#151515] hover:border-[#333333] hover:bg-[#1a1a1a]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] text-[#e25d0a]">
                        {req.type === 'wallet' || req.type === 'instapay' ? (
                          <Wallet className="h-4 w-4" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[14px] font-semibold text-white truncate">{req.bankName}</div>
                        <div className="text-[12px] text-[#737373] truncate">{req.ownerName}</div>
                      </div>
                    </div>
                    <StatusBadge
                      status={req.active ? 'active' : 'inactive'}
                      lang={lang}
                      label={req.active ? t(lang, 'active') : t(lang, 'paused')}
                    />
                  </div>

                  <div className="mt-3.5 flex items-center justify-between gap-2 rounded-lg border border-[#252525] bg-[#1b1b1b] px-3 py-2">
                    <span className="font-mono-num text-[13px] font-medium text-white truncate">
                      {req.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => copyNum(req.accountNumber, e)}
                      className="text-[#909090] hover:text-white shrink-0 cursor-pointer"
                      aria-label={t(lang, 'copy')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
                    <div>
                      <div className="text-[#737373]">{t(lang, 'minOrder')}</div>
                      <div className="font-mono-num text-white mt-0.5">{formatMoney(req.minOrder)}</div>
                    </div>
                    <div>
                      <div className="text-[#737373]">{t(lang, 'maxOrder')}</div>
                      <div className="font-mono-num text-white mt-0.5">{formatMoney(req.maxOrder)}</div>
                    </div>
                    <div>
                      <div className="text-[#737373]">{t(lang, 'bidRate')}</div>
                      <div className="font-mono-num text-[#db9d37] font-semibold mt-0.5">{req.bidRate}%</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#202020]">
                    <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                      <span className="text-[#737373]">{t(lang, 'dailyLimit')}</span>
                      <span className="font-mono-num text-[#aaaaaa]">
                        {formatMoney(req.dailyUsed)} / {formatMoney(req.dailyLimit)} {currentAccount.currency}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[#252525] overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className={`h-full rounded-full ${
                          pct > 85 ? 'bg-[#e32200]' : pct > 60 ? 'bg-[#f4c20d]' : 'bg-[#00e344]'
                        }`}
                      />
                    </div>
                  </div>

                  {req.deviceId && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#737373]">
                      <Smartphone className="h-3 w-3 text-[#00e344]" />
                      <span className="truncate">
                        {devices.find((d) => d.id === req.deviceId)?.name ?? req.deviceId}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <DetailDrawer
        open={creating || Boolean(selected)}
        lang={lang}
        section={t(lang, 'requisite')}
        title={creating ? t(lang, 'createRequisite') : selected?.bankName ?? ''}
        status={selected ? (selected.active ? 'active' : 'inactive') : undefined}
        copyText={selected?.accountNumber}
        skipConfirm={settings.skipConfirm}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => {
          setCreating(false);
          setSelectedId(null);
        }}
        actions={drawerActions}
      >
        <div className="space-y-4">
          {selected && (
            <div className="flex flex-col items-center rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 gap-2">
              <QrCodeSvg value={`req:${selected.id}:${selected.accountNumber}`} size={124} />
              <span className="text-[11.5px] font-mono-num text-[#737373]">{selected.id}</span>
            </div>
          )}

          <Field label={t(lang, 'bank')}>
            <input
              type="text"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder={lang === 'ar' ? 'مثال: فودافون كاش / مصرف الراجحي' : 'e.g. Vodafone Cash / Al Rajhi'}
              className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
            />
          </Field>

          <Field label={t(lang, 'ownerName')}>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder={lang === 'ar' ? 'الاسم الكامل لصاحب الحساب' : 'Account holder full name'}
              className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
            />
          </Field>

          <Field label={t(lang, 'accountNumber')}>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="010XXXXXXXX / IBAN / InstaPay"
              className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={lang === 'ar' ? 'نوع الوسيلة' : 'Type'}>
              <select
                value={reqType}
                onChange={(e) => setReqType(e.target.value as RequisiteType)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
              >
                <option value="wallet">{t(lang, 'requisiteType_wallet')}</option>
                <option value="instapay">{t(lang, 'requisiteType_instapay')}</option>
                <option value="card">{t(lang, 'requisiteType_card')}</option>
                <option value="iban">{t(lang, 'requisiteType_iban')}</option>
              </select>
            </Field>
            <Field label={t(lang, 'bidRate')}>
              <input
                type="number"
                step="0.1"
                value={bidRate}
                onChange={(e) => setBidRate(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <Field label={t(lang, 'minOrder')}>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-2.5 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
              />
            </Field>
            <Field label={t(lang, 'maxOrder')}>
              <input
                type="number"
                value={maxOrder}
                onChange={(e) => setMaxOrder(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-2.5 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
              />
            </Field>
            <Field label={t(lang, 'dailyLimit')}>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-2.5 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
              />
            </Field>
          </div>

          <Field label={t(lang, 'android')}>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
            >
              <option value="">{lang === 'ar' ? 'بدون ربط بجهاز' : 'No device linked'}</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.model})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </DetailDrawer>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-[#aaaaaa] block">{label}</label>
      {children}
    </div>
  );
}
