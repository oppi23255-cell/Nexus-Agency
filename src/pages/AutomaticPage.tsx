import React, { useState } from 'react';
import {
  BatteryCharging,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  Send,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { DetailDrawer } from '../components/DetailDrawer';
import { QrCodeSvg } from '../components/QrCodeSvg';
import { StatusBadge } from '../components/StatusBadge';
import { t } from '../i18n';
import {
  AndroidDevice,
  ApiKeyConfig,
  AppSettings,
  Requisite,
  RoutePath,
  TelegramBotConfig,
} from '../types';
import { formatDateTime } from '../utils/format';

export function AutomaticPage({
  subRoute,
  devices,
  telegramBots,
  apiKeys,
  requisites,
  settings,
  onNavigate,
  onCreateAndroid,
  onToggleAndroid,
  onDeleteAndroid,
  onCreateTelegram,
  onDeleteTelegram,
  onCreateApiKey,
  onDeleteApiKey,
  onNotify,
}: {
  subRoute: 'android' | 'telegram' | 'api';
  devices: AndroidDevice[];
  telegramBots: TelegramBotConfig[];
  apiKeys: ApiKeyConfig[];
  requisites: Requisite[];
  settings: AppSettings;
  onNavigate: (r: RoutePath) => void;
  onCreateAndroid: (data: { name: string; model: string; linkedRequisiteId?: string }) => Promise<void>;
  onToggleAndroid: (id: string, online: boolean) => Promise<void>;
  onDeleteAndroid: (id: string) => Promise<void>;
  onCreateTelegram: (data: { name: string; botUsername: string; chatId: string }) => Promise<void>;
  onDeleteTelegram: (id: string) => Promise<void>;
  onCreateApiKey: (data: { label: string; webhookUrl: string }) => Promise<void>;
  onDeleteApiKey: (id: string) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}) {
  const lang = settings.lang;
  const [drawerMode, setDrawerMode] = useState<'none' | 'create' | 'inspect_android'>('none');
  const [selectedDevice, setSelectedDevice] = useState<AndroidDevice | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Form inputs
  const [nameInput, setNameInput] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [thirdInput, setThirdInput] = useState('');

  const copyVal = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      onNotify('success', t(lang, 'copied'), val);
    } catch {
      onNotify('error', t(lang, 'copyFailed'));
    }
  };

  const openCreate = () => {
    setNameInput('');
    setExtraInput('');
    setThirdInput('');
    setSelectedDevice(null);
    setDrawerMode('create');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Sub-navigation Toolbar */}
      <div className="hpay-toolbar flex flex-wrap items-center justify-between gap-3 border-b border-[#202020] bg-[#1b1b1b] px-4 lg:px-6 py-3 shrink-0">
        <div className="flex items-center gap-1 rounded-[10px] border border-[#252525] bg-[#151515] p-1">
          <button
            type="button"
            onClick={() => onNavigate('/automatic')}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
              subRoute === 'android' ? 'bg-[#252525] text-white' : 'text-[#737373] hover:text-white'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-[#db9d37]" />
            <span>{t(lang, 'android')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/automatic/telegram')}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
              subRoute === 'telegram' ? 'bg-[#252525] text-white' : 'text-[#737373] hover:text-white'
            }`}
          >
            <Send className="h-3.5 w-3.5 text-[#3b82f6]" />
            <span>{t(lang, 'telegram')}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/automatic/api')}
            className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer ${
              subRoute === 'api' ? 'bg-[#252525] text-white' : 'text-[#737373] hover:text-white'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5 text-[#00e344]" />
            <span>{t(lang, 'api')}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="flex h-9 items-center gap-1.5 rounded-[10px] bg-[#e25d0a] px-3.5 text-[13px] font-semibold text-white hover:bg-[#e25d0a]/85 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>
            {subRoute === 'android'
              ? t(lang, 'createAutomatic')
              : subRoute === 'telegram'
              ? t(lang, 'createTelegram')
              : t(lang, 'createApiKey')}
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-dark p-4 lg:p-6">
        {subRoute === 'android' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices.map((dev) => (
              <div
                key={dev.id}
                onClick={() => {
                  setSelectedDevice(dev);
                  setDrawerMode('inspect_android');
                }}
                className="rounded-[12px] border border-[#252525] bg-[#151515] p-4 hover:border-[#333333] transition-colors cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] text-[#db9d37]">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-white truncate">{dev.name}</div>
                      <div className="text-[12px] text-[#737373] truncate">
                        {dev.model} · {dev.osVersion}
                      </div>
                    </div>
                  </div>
                  <StatusBadge
                    status={dev.online ? 'active' : 'inactive'}
                    lang={lang}
                    label={dev.online ? (lang === 'ar' ? 'متصل' : 'Online') : lang === 'ar' ? 'غير متصل' : 'Offline'}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-[#252525] bg-[#1b1b1b] px-3 py-2 text-[12.5px]">
                  <span className="font-mono-num text-[#aaaaaa]">{dev.pairingToken}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyVal(dev.pairingToken);
                    }}
                    className="text-[#909090] hover:text-white cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11.5px] pt-1 border-t border-[#202020]">
                  <div>
                    <div className="text-[#737373]">{t(lang, 'capturedMsgs')}</div>
                    <div className="font-mono-num text-white font-semibold mt-0.5">{dev.capturedCount}</div>
                  </div>
                  <div>
                    <div className="text-[#737373]">{lang === 'ar' ? 'البطارية' : 'Battery'}</div>
                    <div className="flex items-center gap-1 font-mono-num text-[#00e344] mt-0.5">
                      <BatteryCharging className="h-3.5 w-3.5" />
                      {dev.batteryPct}%
                    </div>
                  </div>
                  <div>
                    <div className="text-[#737373]">{t(lang, 'lastPing')}</div>
                    <div className="font-mono-num text-[#aaaaaa] mt-0.5 truncate">
                      {formatDateTime(dev.lastPingAt, settings).split(' ')[1]}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {subRoute === 'telegram' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {telegramBots.map((bot) => (
              <div
                key={bot.id}
                className="rounded-[12px] border border-[#252525] bg-[#151515] p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] text-[#3b82f6]">
                      <Send className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[14px] font-semibold text-white">{bot.name}</div>
                      <div className="text-[12px] font-mono-num text-[#3b82f6]">{bot.botUsername}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteTelegram(bot.id);
                      onNotify('error', lang === 'ar' ? 'تم حذف البوت' : 'Bot removed');
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#303030] bg-[#252525] text-[#909090] hover:text-[#e32200] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[12.5px] rounded-lg border border-[#252525] bg-[#1b1b1b] px-3 py-2">
                  <span className="text-[#737373]">{t(lang, 'chatId')}</span>
                  <span className="font-mono-num text-white">{bot.chatId}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11.5px] text-[#aaaaaa]">
                  {bot.events.map((ev) => (
                    <span key={ev} className="rounded bg-[#202020] px-2 py-0.5 font-mono-num">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {subRoute === 'api' && (
          <div className="space-y-4">
            {apiKeys.map((key) => {
              const revealed = Boolean(revealedKeys[key.id]);
              return (
                <div
                  key={key.id}
                  className="rounded-[12px] border border-[#252525] bg-[#151515] p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#2a2a2a] bg-[#1b1b1b] text-[#00e344]">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-[14px] font-semibold text-white">{key.label}</div>
                        <div className="text-[12px] font-mono-num text-[#737373]">{key.webhookUrl}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status="active" lang={lang} />
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteApiKey(key.id);
                          onNotify('error', lang === 'ar' ? 'تم إلغاء المفتاح' : 'API key revoked');
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#303030] bg-[#252525] text-[#909090] hover:text-[#e32200] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg border border-[#252525] bg-[#1b1b1b] px-3 py-2">
                    <span className="font-mono-num text-[12.5px] text-white truncate">
                      {revealed ? key.fullKey : `${key.keyPrefix}••••••••••••••••••••••••`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedKeys((prev) => ({ ...prev, [key.id]: !prev[key.id] }))
                        }
                        className="p-1 text-[#909090] hover:text-white cursor-pointer"
                      >
                        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyVal(key.fullKey)}
                        className="p-1 text-[#909090] hover:text-white cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#737373]">
                    <div className="flex flex-wrap gap-1.5">
                      {key.permissions.map((p) => (
                        <span key={p} className="rounded bg-[#202020] px-2 py-0.5 font-mono-num text-[#aaaaaa]">
                          {p}
                        </span>
                      ))}
                    </div>
                    <span className="font-mono-num">{formatDateTime(key.createdAt, settings)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Inspect Drawer */}
      <DetailDrawer
        open={drawerMode !== 'none'}
        lang={lang}
        section={t(lang, 'automaticGroup')}
        title={
          drawerMode === 'inspect_android'
            ? selectedDevice?.name ?? ''
            : subRoute === 'android'
            ? t(lang, 'createAutomatic')
            : subRoute === 'telegram'
            ? t(lang, 'createTelegram')
            : t(lang, 'createApiKey')
        }
        status={
          drawerMode === 'inspect_android' && selectedDevice
            ? selectedDevice.online
              ? 'active'
              : 'inactive'
            : undefined
        }
        copyText={selectedDevice?.pairingToken}
        skipConfirm={settings.skipConfirm}
        onCopySuccess={() => onNotify('success', t(lang, 'copied'))}
        onClose={() => setDrawerMode('none')}
        actions={
          drawerMode === 'inspect_android' && selectedDevice
            ? [
                {
                  label: selectedDevice.online ? t(lang, 'disable') : t(lang, 'enable'),
                  tone: 'secondary',
                  onClick: async () => {
                    await onToggleAndroid(selectedDevice.id, !selectedDevice.online);
                    setSelectedDevice({ ...selectedDevice, online: !selectedDevice.online });
                    onNotify('success', t(lang, 'save'));
                  },
                },
                {
                  label: t(lang, 'deleteRequisite'),
                  tone: 'danger',
                  confirm: {
                    severity: 'danger',
                    title: t(lang, 'deleteRequisiteTitle'),
                    confirmLabel: t(lang, 'deleteRequisite'),
                  },
                  onClick: async () => {
                    await onDeleteAndroid(selectedDevice.id);
                    setDrawerMode('none');
                    onNotify('error', lang === 'ar' ? 'تم حذف الجهاز' : 'Device removed');
                  },
                },
              ]
            : [
                {
                  label: t(lang, 'save'),
                  tone: 'primary',
                  onClick: async () => {
                    if (subRoute === 'android') {
                      await onCreateAndroid({
                        name: nameInput || 'جهاز أندرويد جديد',
                        model: extraInput || 'Samsung Galaxy A55',
                        linkedRequisiteId: thirdInput || undefined,
                      });
                    } else if (subRoute === 'telegram') {
                      await onCreateTelegram({
                        name: nameInput || 'بوت تنبيهات جديد',
                        botUsername: extraInput || '@hostapay_alerts_bot',
                        chatId: thirdInput || '-1002310449120',
                      });
                    } else {
                      await onCreateApiKey({
                        label: nameInput || 'مفتاح تكامل API',
                        webhookUrl: extraInput || 'https://api.example.com/webhooks/hpay',
                      });
                    }
                    setDrawerMode('none');
                    onNotify('success', t(lang, 'save'));
                  },
                },
              ]
        }
      >
        {drawerMode === 'inspect_android' && selectedDevice ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 gap-3">
              <QrCodeSvg value={`hpay-pair:${selectedDevice.pairingToken}`} size={140} />
              <div className="text-[12px] text-[#737373]">{t(lang, 'pairingToken')}</div>
              <div className="font-mono-num text-[14px] font-semibold text-white">
                {selectedDevice.pairingToken}
              </div>
            </div>
            <div className="rounded-[12px] border border-[#252525] bg-[#1b1b1b] p-4 space-y-2.5 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'deviceModel')}</span>
                <span className="text-white">{selectedDevice.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">OS / App</span>
                <span className="text-white font-mono-num">
                  {selectedDevice.osVersion} · {selectedDevice.appVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737373]">{t(lang, 'capturedMsgs')}</span>
                <span className="text-white font-mono-num">{selectedDevice.capturedCount}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#aaaaaa]">
                {subRoute === 'android'
                  ? lang === 'ar'
                    ? 'اسم الجهاز'
                    : 'Device name'
                  : subRoute === 'telegram'
                  ? lang === 'ar'
                    ? 'اسم قناة التنبيه'
                    : 'Bot channel label'
                  : lang === 'ar'
                  ? 'اسم المفتاح'
                  : 'Key label'}
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[#aaaaaa]">
                {subRoute === 'android'
                  ? t(lang, 'deviceModel')
                  : subRoute === 'telegram'
                  ? t(lang, 'botUsername')
                  : t(lang, 'webhookUrl')}
              </label>
              <input
                type="text"
                value={extraInput}
                onChange={(e) => setExtraInput(e.target.value)}
                className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
              />
            </div>

            {subRoute === 'android' && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#aaaaaa]">{t(lang, 'requisite')}</label>
                <select
                  value={thirdInput}
                  onChange={(e) => setThirdInput(e.target.value)}
                  className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] text-white outline-none focus:border-[#e25d0a]"
                >
                  <option value="">{lang === 'ar' ? 'اختياري' : 'Optional'}</option>
                  {requisites.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.bankName} ({r.accountNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {subRoute === 'telegram' && (
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-[#aaaaaa]">{t(lang, 'chatId')}</label>
                <input
                  type="text"
                  value={thirdInput}
                  onChange={(e) => setThirdInput(e.target.value)}
                  placeholder="-1002310449120"
                  className="w-full rounded-[10px] border border-[#303030] bg-[#1b1b1b] px-3 py-2 text-[13px] font-mono-num text-white outline-none focus:border-[#e25d0a]"
                />
              </div>
            )}
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}
