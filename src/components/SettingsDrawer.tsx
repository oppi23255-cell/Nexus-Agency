import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { t } from '../i18n';
import { AppSettings, Language, NotificationPosition, RoutePath } from '../types';
import { DetailDrawer } from './DetailDrawer';

export function SettingsDrawer({
  open,
  settings,
  onClose,
  onUpdate,
}: {
  open: boolean;
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (patch: Partial<AppSettings>) => void;
}) {
  const lang = settings.lang;

  return (
    <DetailDrawer
      open={open}
      lang={lang}
      title={t(lang, 'settingsTitle')}
      onClose={onClose}
    >
      <div className="flex flex-col gap-6 pb-4">
        {/* Display & Locale */}
        <section className="space-y-3">
          <h3 className="text-[12.5px] font-semibold text-[#aaaaaa] uppercase tracking-wide">
            {t(lang, 'displayLocale')}
          </h3>

          <SettingSelectRow
            label={t(lang, 'language')}
            value={settings.lang}
            onChange={(val) => onUpdate({ lang: val as Language })}
            options={[
              { value: 'ar', label: 'العربية (RTL)' },
              { value: 'en', label: 'English (LTR)' },
            ]}
          />

          <SettingSelectRow
            label={t(lang, 'timeZone')}
            value={String(settings.tzOffset)}
            onChange={(val) => onUpdate({ tzOffset: Number(val) })}
            options={[
              { value: '0', label: 'UTC +0 (London)' },
              { value: '2', label: 'UTC +2 (Cairo / EET)' },
              { value: '3', label: 'UTC +3 (Riyadh / MSK)' },
              { value: '4', label: 'UTC +4 (Dubai / GST)' },
              { value: '6', label: 'UTC +6 (Bishkek / KGT)' },
            ]}
          />

          <SettingSelectRow
            label={t(lang, 'dateFormat')}
            value={settings.dateFormat}
            onChange={(val) => onUpdate({ dateFormat: val as AppSettings['dateFormat'] })}
            options={[
              { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY' },
              { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            ]}
          />

          <SettingSelectRow
            label={t(lang, 'clock')}
            value={settings.clockFormat}
            onChange={(val) => onUpdate({ clockFormat: val as AppSettings['clockFormat'] })}
            options={[
              { value: '24h', label: '24h' },
              { value: '12h', label: '12h (AM/PM)' },
            ]}
          />
        </section>

        <div className="h-px bg-[#202020]" />

        {/* Layout */}
        <section className="space-y-3">
          <h3 className="text-[12.5px] font-semibold text-[#aaaaaa] uppercase tracking-wide">
            {t(lang, 'layoutSection')}
          </h3>

          <SettingSwitchRow
            label={t(lang, 'compactTables')}
            desc={t(lang, 'compactTablesDesc')}
            checked={settings.compactTables}
            onChange={(v) => onUpdate({ compactTables: v })}
          />
          <SettingSwitchRow
            label={t(lang, 'mirrorHeader')}
            desc={t(lang, 'mirrorHeaderDesc')}
            checked={settings.mirrorHeader}
            onChange={(v) => onUpdate({ mirrorHeader: v })}
          />
          <SettingSwitchRow
            label={t(lang, 'compactCards')}
            desc={t(lang, 'compactCardsDesc')}
            checked={settings.compactCards}
            onChange={(v) => onUpdate({ compactCards: v })}
          />
          <SettingSwitchRow
            label={t(lang, 'hideRowNumbers')}
            desc={t(lang, 'hideRowNumbersDesc')}
            checked={settings.hideRowNumbers}
            onChange={(v) => onUpdate({ hideRowNumbers: v })}
          />
          <SettingSwitchRow
            label={t(lang, 'fullRowTint')}
            desc={t(lang, 'fullRowTintDesc')}
            checked={settings.fullRowTint}
            onChange={(v) => onUpdate({ fullRowTint: v })}
          />
          <SettingSwitchRow
            label={t(lang, 'autoCollapseSidebar')}
            desc={t(lang, 'autoCollapseSidebarDesc')}
            checked={settings.sidebarCollapsedDesktop}
            onChange={(v) => onUpdate({ sidebarCollapsedDesktop: v })}
          />

          {/* Table Scale Zoom */}
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#252525] bg-[#1b1b1b] px-3 py-2.5">
            <span className="text-[13.5px] font-medium text-white">{t(lang, 'tableScale')}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={settings.tableZoom <= 80}
                onClick={() => onUpdate({ tableZoom: Math.max(80, settings.tableZoom - 5) })}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#303030] bg-[#252525] text-white disabled:opacity-40 cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-12 text-center text-[13px] font-mono-num text-[#aaaaaa]">
                {settings.tableZoom}%
              </span>
              <button
                type="button"
                disabled={settings.tableZoom >= 120}
                onClick={() => onUpdate({ tableZoom: Math.min(120, settings.tableZoom + 5) })}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[#303030] bg-[#252525] text-white disabled:opacity-40 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

        <div className="h-px bg-[#202020]" />

        {/* Behaviour */}
        <section className="space-y-3">
          <h3 className="text-[12.5px] font-semibold text-[#aaaaaa] uppercase tracking-wide">
            {t(lang, 'behaviourSection')}
          </h3>

          <SettingSelectRow
            label={t(lang, 'notificationPosition')}
            value={settings.notificationPosition}
            onChange={(val) => onUpdate({ notificationPosition: val as NotificationPosition })}
            options={[
              { value: 'bottom-right', label: lang === 'ar' ? 'أسفل اليمين' : 'Bottom right' },
              { value: 'bottom-left', label: lang === 'ar' ? 'أسفل اليسار' : 'Bottom left' },
              { value: 'top-right', label: lang === 'ar' ? 'أعلى اليمين' : 'Top right' },
              { value: 'top-left', label: lang === 'ar' ? 'أعلى اليسار' : 'Top left' },
              { value: 'top-center', label: lang === 'ar' ? 'أعلى المنتصف' : 'Top center' },
            ]}
          />

          <SettingSwitchRow
            label={t(lang, 'skipConfirm')}
            desc={t(lang, 'skipConfirmDesc')}
            checked={settings.skipConfirm}
            onChange={(v) => onUpdate({ skipConfirm: v })}
          />

          <SettingSelectRow
            label={t(lang, 'defaultLanding')}
            value={settings.defaultLanding}
            onChange={(val) => onUpdate({ defaultLanding: val as RoutePath })}
            options={[
              { value: '/deposits', label: t(lang, 'depositsListing') },
              { value: '/withdrawals', label: t(lang, 'withdrawalsListing') },
              { value: '/statistics', label: t(lang, 'statistics') },
              { value: '/requisite', label: t(lang, 'requisite') },
            ]}
          />
        </section>
      </div>
    </DetailDrawer>
  );
}

function SettingSelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#252525] bg-[#1b1b1b] px-3 py-2.5">
      <span className="text-[13.5px] font-medium text-white">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#303030] bg-[#252525] px-2.5 py-1.5 text-[12.5px] text-white outline-none focus:border-[#e25d0a] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#151515]">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SettingSwitchRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#252525] bg-[#1b1b1b] px-3 py-2.5">
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-white">{label}</div>
        <div className="text-[11.5px] text-[#737373] leading-snug">{desc}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-[#e25d0a]' : 'bg-[#333333]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-1 rtl:-translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
