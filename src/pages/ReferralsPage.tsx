import React from 'react';
import { Copy, Users } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import { AppSettings, ReferralPartner, UserProfile } from '../types';
import { formatDateTime, formatMoney, formatNumber } from '../utils/format';

export function ReferralsPage({
  profile,
  referrals,
  settings,
  onNotify,
}: {
  profile: UserProfile;
  referrals: ReferralPartner[];
  settings: AppSettings;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const referralUrl = `https://hpay.today/r/${profile.referralCode}`;
  const totalEarned = referrals.reduce((sum, r) => sum + r.earnedUsdt, 0);
  const totalVolume = referrals.reduce((sum, r) => sum + r.volumeUsdt, 0);

  const copyLink = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify('success', t(lang, 'copied'), val);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-dark p-4 lg:p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 rounded-[12px] border border-[#252525] bg-[#151515] p-5 space-y-3">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-white">
            <Users className="h-4.5 w-4.5 text-[#e25d0a]" />
            <span>{t(lang, 'referralLink')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex-1 min-w-[200px] rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3.5 py-2.5 font-mono-num text-[13px] text-white truncate">
              {referralUrl}
            </div>
            <button
              type="button"
              onClick={() => copyLink(referralUrl)}
              className="flex items-center gap-1.5 rounded-[10px] bg-[#e25d0a] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{t(lang, 'copy')}</span>
            </button>
          </div>
        </div>

        <div className="rounded-[12px] border border-[#252525] bg-[#151515] p-5 flex flex-col justify-between">
          <div className="text-[12px] text-[#737373]">{t(lang, 'referralCommission')}</div>
          <div className="text-[24px] font-bold font-mono-num text-[#00e344]">
            +{formatNumber(totalEarned)} USDT
          </div>
          <div className="text-[12px] text-[#aaaaaa] font-mono-num">
            {profile.referralRatePct}% · {formatMoney(totalVolume)} USDT vol
          </div>
        </div>
      </div>

      <div className="rounded-[12px] border border-[#252525] bg-[#151515] overflow-hidden">
        <div className="border-b border-[#202020] px-5 py-3.5 text-[14px] font-semibold text-white">
          {t(lang, 'partnersList')}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start text-[13px]">
            <thead className="bg-[#202021] text-[12px] text-[#a0a0a0]">
              <tr>
                <th className="py-2.5 px-4 text-start">{lang === 'ar' ? 'رمز الوكيل' : 'Partner Code'}</th>
                <th className="py-2.5 px-4 text-start">{lang === 'ar' ? 'حجم التداول' : 'Volume (USDT)'}</th>
                <th className="py-2.5 px-4 text-start">{lang === 'ar' ? 'أرباحك' : 'Earned (USDT)'}</th>
                <th className="py-2.5 px-4 text-start">{t(lang, 'status')}</th>
                <th className="py-2.5 px-4 text-start">{t(lang, 'date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-[#202021]">
                  <td className="py-3 px-4 font-mono-num font-semibold text-white">{r.partnerCode}</td>
                  <td className="py-3 px-4 font-mono-num text-[#aaaaaa]">{formatMoney(r.volumeUsdt)} USDT</td>
                  <td className="py-3 px-4 font-mono-num font-semibold text-[#00e344]">
                    +{formatNumber(r.earnedUsdt)} USDT
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={r.status} lang={lang} />
                  </td>
                  <td className="py-3 px-4 font-mono-num text-[12px] text-[#737373]">
                    {formatDateTime(r.joinedAt, settings)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
