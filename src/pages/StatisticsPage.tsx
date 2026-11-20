import React, { useMemo, useState } from 'react';
import { t } from '../i18n';
import { AccountDesk, AppSettings, DepositOrder, Requisite, WithdrawalOrder } from '../types';
import { formatMoney, formatNumber } from '../utils/format';

type Period = 'today' | '7d' | '30d' | 'all';

export function StatisticsPage({
  deposits,
  withdrawals,
  requisites,
  currentAccount,
  settings,
}: {
  deposits: DepositOrder[];
  withdrawals: WithdrawalOrder[];
  requisites: Requisite[];
  currentAccount: AccountDesk;
  settings: AppSettings;
}) {
  const lang = settings.lang;
  const [period, setPeriod] = useState<Period>('7d');
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const accDeposits = useMemo(
    () => deposits.filter((d) => d.accountId === currentAccount.account_id),
    [deposits, currentAccount.account_id]
  );

  const accWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.accountId === currentAccount.account_id),
    [withdrawals, currentAccount.account_id]
  );

  const stats = useMemo(() => {
    const completedDeps = accDeposits.filter((d) => d.status === 'completed');
    const completedWds = accWithdrawals.filter((w) => w.status === 'completed');
    const mult = period === 'today' ? 1 : period === '7d' ? 6.4 : period === '30d' ? 24.5 : 68;

    const depVolUsdt =
      completedDeps.reduce((acc, d) => acc + d.amountUsdt, 0) + 1240 * mult;
    const wdVolUsdt =
      completedWds.reduce((acc, w) => acc + w.amountUsdt, 0) + 780 * mult;
    const profitUsdt =
      completedDeps.reduce((acc, d) => acc + d.incomeUsdt, 0) +
      completedWds.reduce((acc, w) => acc + w.incomeUsdt, 0) +
      52.4 * mult;

    const totalOrders = accDeposits.length || 1;
    const conversion = Math.min(
      99.4,
      Math.round(((completedDeps.length + 18) / (totalOrders + 19)) * 1000) / 10
    );

    return { depVolUsdt, wdVolUsdt, profitUsdt, conversion };
  }, [accDeposits, accWithdrawals, period]);

  const series = useMemo(() => {
    const days =
      period === 'today'
        ? ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00']
        : period === '7d'
        ? ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
        : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6'];
    const base = period === 'today' ? 1800 : period === '7d' ? 6200 : 24000;
    return days.map((label, idx) => {
      const factor = 0.65 + ((idx * 37) % 10) * 0.08;
      const depositsVal = Math.round(base * factor);
      const withdrawalsVal = Math.round(depositsVal * 0.58);
      return { label, depositsVal, withdrawalsVal };
    });
  }, [period]);

  const maxVal = Math.max(...series.map((s) => s.depositsVal), 1);

  const methodBreakdown = useMemo(() => {
    return requisites
      .filter((r) => r.accountId === currentAccount.account_id)
      .map((r) => ({
        id: r.id,
        bankName: r.bankName,
        accountNumber: r.accountNumber,
        volumeLocal: r.dailyUsed,
        limitLocal: r.dailyLimit,
        bidRate: r.bidRate,
        earnedUsdt: (r.dailyUsed / currentAccount.rate) * (r.bidRate / 100),
      }));
  }, [requisites, currentAccount]);

  return (
    <div className="h-full overflow-y-auto scrollbar-dark p-4 lg:p-6 space-y-5">
      {/* Period Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-[10px] border border-[#252525] bg-[#151515] p-1">
          {(
            [
              { id: 'today', label: t(lang, 'today') },
              { id: '7d', label: t(lang, 'last7Days') },
              { id: '30d', label: t(lang, 'last30Days') },
              { id: 'all', label: t(lang, 'allTime') },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
                period === p.id ? 'bg-[#e25d0a] text-white' : 'text-[#aaaaaa] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="text-[12.5px] text-[#737373]">
          {lang === 'ar' ? currentAccount.label : currentAccount.labelEn}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <KpiBox label={t(lang, 'totalDepositVol')} value={`${formatNumber(stats.depVolUsdt)} USDT`} accent="text-white" />
        <KpiBox label={t(lang, 'totalWithdrawalVol')} value={`${formatNumber(stats.wdVolUsdt)} USDT`} accent="text-[#3b82f6]" />
        <KpiBox label={t(lang, 'netProfit')} value={`+${formatNumber(stats.profitUsdt)} USDT`} accent="text-[#00e344]" />
        <KpiBox label={t(lang, 'conversionRate')} value={`${stats.conversion}%`} accent="text-[#db9d37]" />
        <KpiBox label={t(lang, 'avgConfirmTime')} value="42 sec" accent="text-[#e25d0a]" />
      </div>

      {/* Bar Chart Card */}
      <div className="rounded-[12px] border border-[#252525] bg-[#151515] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              {lang === 'ar' ? 'حجم العمليات (USDT)' : 'Processing Volume (USDT)'}
            </h2>
            <p className="text-[12px] text-[#737373]">
              {lang === 'ar' ? 'مقارنة حجم الإيداعات والسحوبات المنفذة' : 'Completed deposits vs withdrawals comparison'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-[12px]">
            <span className="flex items-center gap-1.5 text-[#aaaaaa]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#e25d0a]" />
              {t(lang, 'depositsGroup')}
            </span>
            <span className="flex items-center gap-1.5 text-[#aaaaaa]">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#3b82f6]" />
              {t(lang, 'withdrawalsGroup')}
            </span>
          </div>
        </div>

        <div className="h-56 flex items-end justify-between gap-3 pt-6">
          {series.map((item, idx) => {
            const depHeightPct = Math.max(8, Math.round((item.depositsVal / maxVal) * 100));
            const wdHeightPct = Math.max(6, Math.round((item.withdrawalsVal / maxVal) * 100));
            return (
              <div
                key={item.label}
                onMouseEnter={() => setHoverDay(idx)}
                onMouseLeave={() => setHoverDay(null)}
                className="relative flex-1 flex flex-col items-center h-full justify-end gap-2 group"
              >
                {hoverDay === idx && (
                  <div className="absolute -top-2 z-10 whitespace-nowrap rounded-lg border border-[#333333] bg-[#202020] px-2.5 py-1.5 text-[11px] font-mono-num text-white shadow-lg">
                    <div>+{formatMoney(item.depositsVal)} USDT</div>
                    <div className="text-[#3b82f6]">-{formatMoney(item.withdrawalsVal)} USDT</div>
                  </div>
                )}
                <div className="w-full max-w-[54px] flex items-end justify-center gap-1.5 h-full">
                  <div
                    style={{ height: `${depHeightPct}%` }}
                    className="w-1/2 rounded-t-md bg-[#e25d0a] group-hover:bg-[#ff7220] transition-colors"
                  />
                  <div
                    style={{ height: `${wdHeightPct}%` }}
                    className="w-1/2 rounded-t-md bg-[#3b82f6]/80 group-hover:bg-[#3b82f6] transition-colors"
                  />
                </div>
                <span className="text-[11.5px] text-[#737373] font-mono-num">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Method Breakdown Table */}
      <div className="rounded-[12px] border border-[#252525] bg-[#151515] overflow-hidden">
        <div className="border-b border-[#202020] px-5 py-3.5 text-[14px] font-semibold text-white">
          {t(lang, 'volumeByMethod')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
              <tr>
                <th className="py-2.5 px-4 text-start">{t(lang, 'bank')}</th>
                <th className="py-3 px-4 text-start">{t(lang, 'accountNumber')}</th>
                <th className="py-2.5 px-4 text-start">{t(lang, 'amount')}</th>
                <th className="py-2.5 px-4 text-start">{t(lang, 'bidRate')}</th>
                <th className="py-2.5 px-4 text-start">{t(lang, 'income')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {methodBreakdown.map((m) => (
                <tr key={m.id} className="hover:bg-[#202021]">
                  <td className="py-3 px-4 font-medium text-white">{m.bankName}</td>
                  <td className="py-3 px-4 font-mono-num text-[#737373]">{m.accountNumber}</td>
                  <td className="py-3 px-4 font-mono-num text-white">
                    {formatMoney(m.volumeLocal)} / {formatMoney(m.limitLocal)} {currentAccount.currency}
                  </td>
                  <td className="py-3 px-4 font-mono-num text-[#db9d37]">{m.bidRate}%</td>
                  <td className="py-3 px-4 font-mono-num text-[#00e344]">+{formatNumber(m.earnedUsdt)} USDT</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-[12px] border border-[#252525] bg-[#151515] p-4">
      <div className="text-[12px] text-[#737373]">{label}</div>
      <div className={`mt-1.5 text-[20px] font-bold font-mono-num ${accent}`}>{value}</div>
    </div>
  );
}
