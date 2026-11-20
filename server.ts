import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  ApiKeyConfig,
  DepositOrder,
  PlatformState,
  Requisite,
  SmsMessage,
  TelegramBotConfig,
  TopUpRecord,
  WithdrawalOrder,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'hpay-db.json');

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minsFromNow(m: number): string {
  return new Date(Date.now() + m * 60_000).toISOString();
}

function createSeedState(): PlatformState {
  return {
    profile: {
      traderId: 'TRD-84920',
      displayName: 'مكتب النخبة للمدفوعات',
      email: 'desk@hostapay-agent.com',
      telegramHandle: '@elite_hpay_desk',
      twoFactorEnabled: true,
      referralCode: 'HPAY-ELITE-88',
      referralRatePct: 0.5,
      trc20Address: 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
    },
    currentAccountId: 'acc_sar',
    accounts: [
      {
        account_id: 'acc_sar',
        uuid: '01a1a848-2e79-7533-a6f9-fc1f21a258a7',
        username: 'emad8093_sar',
        countryCode: 'SA',
        label: 'SA | SAR · السعودية',
        labelEn: 'SA | SAR',
        currency: 'SAR',
        balanceUsdt: 28450.0,
        frozenUsdt: 1120.0,
        insuranceAmount: null,
        rate: 3.83,
        canTrade: true,
        depositFeePct: 2.5,
        withdrawalFeePct: 1.5,
      },
      {
        account_id: 'acc_egp',
        uuid: '01a1a848-4f12-7901-b4a2-884019e3c102',
        username: 'emad8093_egp',
        countryCode: 'EG',
        label: 'EG | EGP · مصر',
        labelEn: 'EG | EGP',
        currency: 'EGP',
        balanceUsdt: 14820.5,
        frozenUsdt: 642.15,
        insuranceAmount: 500,
        rate: 49.85,
        canTrade: true,
        depositFeePct: 3.2,
        withdrawalFeePct: 1.8,
      },
      {
        account_id: 'acc_aed',
        uuid: '01a1a848-9c31-7112-8891-0029a8f11e40',
        username: 'emad8093_aed',
        countryCode: 'AE',
        label: 'AE | AED · الإمارات',
        labelEn: 'AE | AED',
        currency: 'AED',
        balanceUsdt: 9310.75,
        frozenUsdt: 0,
        insuranceAmount: 1000,
        rate: 3.68,
        canTrade: false,
        depositFeePct: 2.2,
        withdrawalFeePct: 1.4,
      },
      {
        account_id: 'acc_kgs',
        uuid: '01a1a848-7b02-7881-9120-774129b0a119',
        username: 'emad8093_kgs',
        countryCode: 'KG',
        label: 'KG | KGS · قيرغيزستان',
        labelEn: 'KG | KGS',
        currency: 'KGS',
        balanceUsdt: 5190.2,
        frozenUsdt: 215.4,
        insuranceAmount: null,
        rate: 87.4,
        canTrade: true,
        depositFeePct: 3.5,
        withdrawalFeePct: 2.0,
      },
    ],
    requisites: [
      {
        id: 'req_101',
        accountId: 'acc_egp',
        bankName: 'فودافون كاش (Vodafone Cash)',
        ownerName: 'أحمد محمود عبد العزيز',
        accountNumber: '01094827165',
        type: 'wallet',
        minOrder: 200,
        maxOrder: 30000,
        dailyLimit: 180000,
        dailyUsed: 112400,
        bidRate: 3.2,
        active: true,
        deviceId: 'dev_01',
        createdAt: hoursAgo(240),
      },
      {
        id: 'req_102',
        accountId: 'acc_egp',
        bankName: 'إنستا باي · البنك التجاري الدولي CIB',
        ownerName: 'شركة النخبة للتجارة',
        accountNumber: 'elite.pay@instapay',
        type: 'instapay',
        minOrder: 500,
        maxOrder: 70000,
        dailyLimit: 350000,
        dailyUsed: 194500,
        bidRate: 3.0,
        active: true,
        deviceId: 'dev_01',
        createdAt: hoursAgo(190),
      },
      {
        id: 'req_103',
        accountId: 'acc_egp',
        bankName: 'بنك مصر · بطاقة ميزة',
        ownerName: 'كريم طارق حسن',
        accountNumber: '5078 0311 4920 8841',
        type: 'card',
        minOrder: 1000,
        maxOrder: 50000,
        dailyLimit: 200000,
        dailyUsed: 48000,
        bidRate: 3.4,
        active: false,
        deviceId: 'dev_02',
        createdAt: hoursAgo(120),
      },
      {
        id: 'req_201',
        accountId: 'acc_sar',
        bankName: 'مصرف الراجحي (Al Rajhi)',
        ownerName: 'فيصل بن سعود القحطاني',
        accountNumber: 'SA44 8000 0219 6080 1044 9211',
        type: 'iban',
        minOrder: 100,
        maxOrder: 25000,
        dailyLimit: 150000,
        dailyUsed: 68200,
        bidRate: 2.5,
        active: true,
        deviceId: 'dev_03',
        createdAt: hoursAgo(300),
      },
      {
        id: 'req_202',
        accountId: 'acc_sar',
        bankName: 'STC Pay',
        ownerName: 'فيصل بن سعود القحطاني',
        accountNumber: '0558291043',
        type: 'wallet',
        minOrder: 50,
        maxOrder: 10000,
        dailyLimit: 75000,
        dailyUsed: 41300,
        bidRate: 2.7,
        active: true,
        deviceId: 'dev_03',
        createdAt: hoursAgo(160),
      },
      {
        id: 'req_301',
        accountId: 'acc_aed',
        bankName: 'بنك الإمارات دبي الوطني ENBD',
        ownerName: 'سلطان المهيري',
        accountNumber: 'AE07 0260 0010 1548 9201 401',
        type: 'iban',
        minOrder: 200,
        maxOrder: 30000,
        dailyLimit: 120000,
        dailyUsed: 18400,
        bidRate: 2.2,
        active: true,
        createdAt: hoursAgo(90),
      },
      {
        id: 'req_401',
        accountId: 'acc_kgs',
        bankName: 'MBank Kyrgyzstan',
        ownerName: 'Азамат Токтосунов',
        accountNumber: '+996 555 842 190',
        type: 'wallet',
        minOrder: 500,
        maxOrder: 100000,
        dailyLimit: 600000,
        dailyUsed: 245000,
        bidRate: 3.5,
        active: true,
        createdAt: hoursAgo(150),
      },
    ],
    deposits: [
      {
        id: 'dep_9001',
        orderId: 'HP-884120',
        accountId: 'acc_egp',
        amountLocal: 4985,
        amountUsdt: 100.0,
        incomeUsdt: 3.2,
        rate: 49.85,
        requisiteId: 'req_101',
        bankName: 'فودافون كاش (Vodafone Cash)',
        ownerName: 'أحمد محمود عبد العزيز',
        requisiteNumber: '01094827165',
        status: 'pending',
        createdAt: hoursAgo(0.15),
        expiresAt: minsFromNow(14),
        customerNote: 'يرجى مطابقة المبلغ 4985 ج.م عبر فودافون كاش',
      },
      {
        id: 'dep_9002',
        orderId: 'HP-884115',
        accountId: 'acc_egp',
        amountLocal: 14955,
        amountUsdt: 300.0,
        incomeUsdt: 9.0,
        rate: 49.85,
        requisiteId: 'req_102',
        bankName: 'إنستا باي · البنك التجاري الدولي CIB',
        ownerName: 'شركة النخبة للتجارة',
        requisiteNumber: 'elite.pay@instapay',
        status: 'pending',
        createdAt: hoursAgo(0.45),
        expiresAt: minsFromNow(9),
      },
      {
        id: 'dep_9003',
        orderId: 'HP-884098',
        accountId: 'acc_egp',
        amountLocal: 8500,
        amountUsdt: 170.51,
        incomeUsdt: 5.46,
        rate: 49.85,
        requisiteId: 'req_101',
        bankName: 'فودافون كاش (Vodafone Cash)',
        ownerName: 'أحمد محمود عبد العزيز',
        requisiteNumber: '01094827165',
        status: 'completed',
        createdAt: hoursAgo(1.8),
        expiresAt: hoursAgo(1.5),
        confirmedAt: hoursAgo(1.75),
      },
      {
        id: 'dep_9004',
        orderId: 'HP-884074',
        accountId: 'acc_egp',
        amountLocal: 12000,
        amountUsdt: 240.72,
        incomeUsdt: 7.7,
        rate: 49.85,
        requisiteId: 'req_102',
        bankName: 'إنستا باي · البنك التجاري الدولي CIB',
        ownerName: 'شركة النخبة للتجارة',
        requisiteNumber: 'elite.pay@instapay',
        status: 'disputed',
        createdAt: hoursAgo(3.2),
        expiresAt: hoursAgo(2.9),
      },
      {
        id: 'dep_9005',
        orderId: 'HP-884051',
        accountId: 'acc_egp',
        amountLocal: 3200,
        amountUsdt: 64.19,
        incomeUsdt: 2.05,
        rate: 49.85,
        requisiteId: 'req_101',
        bankName: 'فودافون كاش (Vodafone Cash)',
        ownerName: 'أحمد محمود عبد العزيز',
        requisiteNumber: '01094827165',
        status: 'completed',
        createdAt: hoursAgo(5.4),
        expiresAt: hoursAgo(5.1),
        confirmedAt: hoursAgo(5.35),
      },
      {
        id: 'dep_9006',
        orderId: 'HP-884019',
        accountId: 'acc_egp',
        amountLocal: 2500,
        amountUsdt: 50.15,
        incomeUsdt: 0,
        rate: 49.85,
        requisiteId: 'req_103',
        bankName: 'بنك مصر · بطاقة ميزة',
        ownerName: 'كريم طارق حسن',
        requisiteNumber: '5078 0311 4920 8841',
        status: 'expired',
        createdAt: hoursAgo(9.1),
        expiresAt: hoursAgo(8.8),
      },
      {
        id: 'dep_9007',
        orderId: 'HP-883990',
        accountId: 'acc_sar',
        amountLocal: 3760,
        amountUsdt: 1000.0,
        incomeUsdt: 25.0,
        rate: 3.76,
        requisiteId: 'req_201',
        bankName: 'مصرف الراجحي (Al Rajhi)',
        ownerName: 'فيصل بن سعود القحطاني',
        requisiteNumber: 'SA44 8000 0219 6080 1044 9211',
        status: 'pending',
        createdAt: hoursAgo(0.2),
        expiresAt: minsFromNow(12),
      },
      {
        id: 'dep_9008',
        orderId: 'HP-883955',
        accountId: 'acc_sar',
        amountLocal: 1880,
        amountUsdt: 500.0,
        incomeUsdt: 13.5,
        rate: 3.76,
        requisiteId: 'req_202',
        bankName: 'STC Pay',
        ownerName: 'فيصل بن سعود القحطاني',
        requisiteNumber: '0558291043',
        status: 'completed',
        createdAt: hoursAgo(2.6),
        expiresAt: hoursAgo(2.3),
        confirmedAt: hoursAgo(2.55),
      },
      {
        id: 'dep_9009',
        orderId: 'HP-883912',
        accountId: 'acc_kgs',
        amountLocal: 18826,
        amountUsdt: 215.4,
        incomeUsdt: 7.54,
        rate: 87.4,
        requisiteId: 'req_401',
        bankName: 'MBank Kyrgyzstan',
        ownerName: 'Азамат Токтосунов',
        requisiteNumber: '+996 555 842 190',
        status: 'disputed',
        createdAt: hoursAgo(4.0),
        expiresAt: hoursAgo(3.7),
      },
    ],
    disputes: [
      {
        id: 'dsp_401',
        depositId: 'dep_9004',
        orderId: 'HP-884074',
        accountId: 'acc_egp',
        claimedAmountLocal: 12000,
        originalAmountLocal: 12000,
        amountUsdt: 240.72,
        bankName: 'إنستا باي · CIB',
        requisiteNumber: 'elite.pay@instapay',
        reason: 'العميل أرسل إيصال تحويل إنستا باي برقم مرجعي مختلف عن المتوقع.',
        status: 'open',
        createdAt: hoursAgo(2.8),
        slaMinutesLeft: 42,
        receiptRef: 'IPN-2026-9948120',
      },
      {
        id: 'dsp_402',
        depositId: 'dep_9009',
        orderId: 'HP-883912',
        accountId: 'acc_kgs',
        claimedAmountLocal: 18800,
        originalAmountLocal: 18826,
        amountUsdt: 215.4,
        bankName: 'MBank Kyrgyzstan',
        requisiteNumber: '+996 555 842 190',
        reason: 'تم تحويل مبلغ ناقص 26 KGS عن الفاتورة الأصلية.',
        status: 'reviewing',
        createdAt: hoursAgo(3.5),
        slaMinutesLeft: 18,
        receiptRef: 'MBK-449012',
      },
    ],
    withdrawals: [
      {
        id: 'wd_701',
        orderId: 'WD-301944',
        accountId: 'acc_egp',
        amountLocal: 9970,
        amountUsdt: 200.0,
        incomeUsdt: 3.6,
        rate: 49.85,
        destinationMethod: 'فودافون كاش',
        requisiteNumber: '01022481993',
        recipientName: 'محمد عادل السعيد',
        status: 'available',
        createdAt: hoursAgo(0.1),
        expiresAt: minsFromNow(25),
        receiptFiles: [],
      },
      {
        id: 'wd_702',
        orderId: 'WD-301938',
        accountId: 'acc_egp',
        amountLocal: 24925,
        amountUsdt: 500.0,
        incomeUsdt: 9.0,
        rate: 49.85,
        destinationMethod: 'إنستا باي · البنك الأهلي NBE',
        requisiteNumber: 'youssef.ali@instapay',
        recipientName: 'يوسف علي مصطفى',
        status: 'available',
        createdAt: hoursAgo(0.25),
        expiresAt: minsFromNow(19),
        receiptFiles: [],
      },
      {
        id: 'wd_703',
        orderId: 'WD-301910',
        accountId: 'acc_egp',
        amountLocal: 14955,
        amountUsdt: 300.0,
        incomeUsdt: 5.4,
        rate: 49.85,
        destinationMethod: 'اتصالات كاش',
        requisiteNumber: '01148290312',
        recipientName: 'سارة إبراهيم كامل',
        status: 'accepted',
        createdAt: hoursAgo(0.8),
        expiresAt: minsFromNow(11),
        acceptedAt: hoursAgo(0.4),
        receiptFiles: [],
      },
      {
        id: 'wd_704',
        orderId: 'WD-301875',
        accountId: 'acc_egp',
        amountLocal: 7477,
        amountUsdt: 150.0,
        incomeUsdt: 2.7,
        rate: 49.85,
        destinationMethod: 'فودافون كاش',
        requisiteNumber: '01066320188',
        recipientName: 'طارق جمال الدين',
        status: 'completed',
        createdAt: hoursAgo(4.2),
        expiresAt: hoursAgo(3.7),
        acceptedAt: hoursAgo(4.1),
        completedAt: hoursAgo(3.95),
        receiptFiles: [{ name: 'vf-receipt-301875.png', size: '284 KB', uploadedAt: hoursAgo(3.95) }],
      },
      {
        id: 'wd_705',
        orderId: 'WD-301840',
        accountId: 'acc_sar',
        amountLocal: 5640,
        amountUsdt: 1500.0,
        incomeUsdt: 22.5,
        rate: 3.76,
        destinationMethod: 'مصرف الراجحي',
        requisiteNumber: 'SA19 8000 0412 6080 1992 3100',
        recipientName: 'عبدالله فهد الدوسري',
        status: 'available',
        createdAt: hoursAgo(0.3),
        expiresAt: minsFromNow(22),
        receiptFiles: [],
      },
    ],
    androidDevices: [
      {
        id: 'dev_01',
        name: 'جهاز القاهرة الرئيسي #1',
        model: 'Samsung Galaxy A54',
        osVersion: 'Android 14',
        appVersion: 'v2.8.4',
        pairingToken: 'HP-AND-9482-X9K2',
        linkedRequisiteId: 'req_101',
        batteryPct: 92,
        online: true,
        lastPingAt: hoursAgo(0.02),
        capturedCount: 1428,
      },
      {
        id: 'dev_02',
        name: 'جهاز الإسكندرية الاحتياطي',
        model: 'Xiaomi Redmi Note 13',
        osVersion: 'Android 13',
        appVersion: 'v2.8.2',
        pairingToken: 'HP-AND-3109-M4P7',
        linkedRequisiteId: 'req_103',
        batteryPct: 64,
        online: false,
        lastPingAt: hoursAgo(3.4),
        capturedCount: 412,
      },
      {
        id: 'dev_03',
        name: 'جهاز الرياض · STC/AlRajhi',
        model: 'Pixel 7a',
        osVersion: 'Android 14',
        appVersion: 'v2.8.4',
        pairingToken: 'HP-AND-7721-R8V1',
        linkedRequisiteId: 'req_201',
        batteryPct: 87,
        online: true,
        lastPingAt: hoursAgo(0.01),
        capturedCount: 936,
      },
    ],
    telegramBots: [
      {
        id: 'tg_01',
        name: 'تنبيهات الإيداعات الفورية',
        botUsername: '@hostapay_alerts_bot',
        chatId: '-1002198472310',
        events: ['new_deposit', 'dispute_opened', 'auto_matched'],
        active: true,
        createdAt: hoursAgo(320),
      },
      {
        id: 'tg_02',
        name: 'غرفة عمليات السحب',
        botUsername: '@hostapay_payouts_bot',
        chatId: '-1001984021559',
        events: ['new_withdrawal', 'low_balance'],
        active: true,
        createdAt: hoursAgo(180),
      },
    ],
    apiKeys: [
      {
        id: 'key_01',
        label: 'مفتاح التكامل المحاسبي الرئيسي',
        keyPrefix: 'hp_live_98f2',
        fullKey: 'hp_live_98f2a4c1d9e04471b2380f9a71c44e92',
        webhookUrl: 'https://ops.elite-desk.example/webhooks/hostapay',
        permissions: ['deposits:read', 'deposits:confirm', 'withdrawals:read', 'messages:ingest'],
        active: true,
        lastUsedAt: hoursAgo(0.1),
        createdAt: hoursAgo(400),
      },
    ],
    messages: [
      {
        id: 'msg_501',
        deviceId: 'dev_01',
        deviceName: 'جهاز القاهرة الرئيسي #1',
        sender: 'VF-Cash',
        body: 'تم استلام مبلغ 8500.00 جنيه من رقم 01018492011 رصيدك الحالي 112400.00 ج.م رقم العملية 9928410.',
        parsedAmount: 8500,
        currency: 'EGP',
        matchedDepositId: 'dep_9003',
        matchedOrderId: 'HP-884098',
        status: 'matched',
        receivedAt: hoursAgo(1.76),
      },
      {
        id: 'msg_502',
        deviceId: 'dev_01',
        deviceName: 'جهاز القاهرة الرئيسي #1',
        sender: 'InstaPay',
        body: 'CIB: Credit transaction of EGP 12,000.00 to elite.pay@instapay. Ref: IPN-2026-9948120',
        parsedAmount: 12000,
        currency: 'EGP',
        matchedDepositId: 'dep_9004',
        matchedOrderId: 'HP-884074',
        status: 'unmatched',
        receivedAt: hoursAgo(3.0),
      },
      {
        id: 'msg_503',
        deviceId: 'dev_01',
        deviceName: 'جهاز القاهرة الرئيسي #1',
        sender: 'VF-Cash',
        body: 'تم استلام مبلغ 3200.00 جنيه من رقم 01077210492 رصيدك الحالي 103900.00 ج.م.',
        parsedAmount: 3200,
        currency: 'EGP',
        matchedDepositId: 'dep_9005',
        matchedOrderId: 'HP-884051',
        status: 'matched',
        receivedAt: hoursAgo(5.36),
      },
      {
        id: 'msg_504',
        deviceId: 'dev_03',
        deviceName: 'جهاز الرياض · STC/AlRajhi',
        sender: 'STC Pay',
        body: 'تم إيداع 1,880.00 ر.س في محفظتك في STC Pay بنجاح.',
        parsedAmount: 1880,
        currency: 'SAR',
        matchedDepositId: 'dep_9008',
        matchedOrderId: 'HP-883955',
        status: 'matched',
        receivedAt: hoursAgo(2.56),
      },
    ],
    topUps: [
      {
        id: 'top_01',
        txHash: '0x94c2f8a1e770192b4f6c8832d90a1b54f128c7d9a1',
        network: 'TRC-20',
        amountUsdt: 5000,
        status: 'credited',
        createdAt: hoursAgo(48),
      },
      {
        id: 'top_02',
        txHash: '0x31b8e0f4c219804a6d2e1175c08f4a29e330b8c2f4',
        network: 'TRC-20',
        amountUsdt: 10000,
        status: 'credited',
        createdAt: hoursAgo(168),
      },
    ],
    referrals: [
      {
        id: 'ref_01',
        partnerCode: 'AG-CAIRO-41',
        joinedAt: hoursAgo(720),
        volumeUsdt: 142800,
        earnedUsdt: 714.0,
        status: 'active',
      },
      {
        id: 'ref_02',
        partnerCode: 'AG-RIYADH-19',
        joinedAt: hoursAgo(480),
        volumeUsdt: 98450,
        earnedUsdt: 492.25,
        status: 'active',
      },
      {
        id: 'ref_03',
        partnerCode: 'AG-DELTA-07',
        joinedAt: hoursAgo(210),
        volumeUsdt: 24100,
        earnedUsdt: 120.5,
        status: 'inactive',
      },
    ],
    settings: {
      lang: 'ar',
      tzOffset: 2,
      dateFormat: 'DD.MM.YYYY',
      clockFormat: '24h',
      compactTables: false,
      mirrorHeader: false,
      compactCards: false,
      hideRowNumbers: false,
      fullRowTint: false,
      tableZoom: 100,
      sidebarCollapsedDesktop: false,
      notificationPosition: 'bottom-right',
      skipConfirm: false,
      defaultLanding: '/deposits',
    },
  };
}

function loadDb(): PlatformState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const seed = createSeedState();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    const parsed = JSON.parse(raw) as PlatformState;
    if (!parsed.accounts?.[0]?.uuid || !parsed.accounts?.[0]?.username) {
      const seed = createSeedState();
      fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    return parsed;
  } catch {
    const seed = createSeedState();
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }
}

function saveDb(state: PlatformState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  let db: PlatformState = loadDb();

  // Health & full state
  app.get('/api/state', (_req, res) => {
    res.json(db);
  });

  // Reset demo data
  app.post('/api/reset', (_req, res) => {
    db = createSeedState();
    saveDb(db);
    res.json(db);
  });

  // Switch active desk account
  app.post('/api/accounts/switch', (req, res) => {
    const { accountId } = req.body as { accountId: string };
    const found = db.accounts.find((a) => a.account_id === accountId);
    if (!found) return res.status(404).json({ error: 'Account not found' });
    db.currentAccountId = accountId;
    saveDb(db);
    res.json(db);
  });

  // Toggle trade status
  app.post('/api/accounts/trade-status', (req, res) => {
    const { accountId, canTrade } = req.body as { accountId: string; canTrade: boolean };
    const acc = db.accounts.find((a) => a.account_id === accountId);
    if (!acc) return res.status(404).json({ error: 'Account not found' });
    acc.canTrade = Boolean(canTrade);
    saveDb(db);
    res.json(db);
  });

  // Simulate incoming live deposit order
  app.post('/api/deposits/simulate', (_req, res) => {
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    const reqs = db.requisites.filter((r) => r.accountId === acc.account_id && r.active);
    const chosenReq = reqs[Math.floor(Math.random() * reqs.length)] ?? db.requisites[0];
    const baseUsdt = Math.round((45 + Math.random() * 420) * 100) / 100;
    const amountLocal = Math.round(baseUsdt * acc.rate);
    const incomeUsdt = Math.round(baseUsdt * (acc.depositFeePct / 100) * 100) / 100;
    const orderNum = Math.floor(884200 + Math.random() * 9000);
    const newOrder: DepositOrder = {
      id: `dep_${Date.now()}`,
      orderId: `HP-${orderNum}`,
      accountId: acc.account_id,
      amountLocal,
      amountUsdt: baseUsdt,
      incomeUsdt,
      rate: acc.rate,
      requisiteId: chosenReq.id,
      bankName: chosenReq.bankName,
      ownerName: chosenReq.ownerName,
      requisiteNumber: chosenReq.accountNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: minsFromNow(15),
    };
    acc.frozenUsdt = Math.round((acc.frozenUsdt + baseUsdt) * 100) / 100;
    acc.balanceUsdt = Math.max(0, Math.round((acc.balanceUsdt - baseUsdt) * 100) / 100);
    db.deposits.unshift(newOrder);
    saveDb(db);
    res.json({ state: db, created: newOrder });
  });

  // Update deposit (confirm, cancel, open dispute, edit amount)
  app.patch('/api/deposits/:id', (req, res) => {
    const dep = db.deposits.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'Deposit not found' });
    const acc = db.accounts.find((a) => a.account_id === dep.accountId);
    const { action, newAmountLocal, reason } = req.body as {
      action: 'confirm' | 'cancel' | 'dispute' | 'edit_amount';
      newAmountLocal?: number;
      reason?: string;
    };

    if (action === 'edit_amount' && typeof newAmountLocal === 'number' && newAmountLocal > 0) {
      const oldUsdt = dep.amountUsdt;
      const newUsdt = Math.round((newAmountLocal / dep.rate) * 100) / 100;
      const feePct = acc?.depositFeePct ?? 3.0;
      dep.amountLocal = Math.round(newAmountLocal);
      dep.amountUsdt = newUsdt;
      dep.incomeUsdt = Math.round(newUsdt * (feePct / 100) * 100) / 100;
      if (acc && dep.status === 'pending') {
        const diff = newUsdt - oldUsdt;
        acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt + diff) * 100) / 100);
        acc.balanceUsdt = Math.max(0, Math.round((acc.balanceUsdt - diff) * 100) / 100);
      }
    } else if (action === 'confirm' && (dep.status === 'pending' || dep.status === 'disputed')) {
      dep.status = 'completed';
      dep.confirmedAt = new Date().toISOString();
      if (acc) {
        acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
        acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.incomeUsdt) * 100) / 100;
      }
      const reqItem = db.requisites.find((r) => r.id === dep.requisiteId);
      if (reqItem) reqItem.dailyUsed += dep.amountLocal;
    } else if (action === 'cancel' && dep.status === 'pending') {
      dep.status = 'cancelled';
      if (acc) {
        acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
        acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.amountUsdt) * 100) / 100;
      }
    } else if (action === 'dispute' && dep.status === 'pending') {
      dep.status = 'disputed';
      db.disputes.unshift({
        id: `dsp_${Date.now()}`,
        depositId: dep.id,
        orderId: dep.orderId,
        accountId: dep.accountId,
        claimedAmountLocal: dep.amountLocal,
        originalAmountLocal: dep.amountLocal,
        amountUsdt: dep.amountUsdt,
        bankName: dep.bankName,
        requisiteNumber: dep.requisiteNumber,
        reason: reason || 'عدم تطابق المبلغ المحول أو تأخر الإشعار البنكي.',
        status: 'open',
        createdAt: new Date().toISOString(),
        slaMinutesLeft: 45,
        receiptRef: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }

    saveDb(db);
    res.json(db);
  });

  // Resolve dispute
  app.patch('/api/disputes/:id', (req, res) => {
    const dispute = db.disputes.find((d) => d.id === req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    const { action, note } = req.body as { action: 'approve' | 'reject'; note?: string };
    const dep = db.deposits.find((d) => d.id === dispute.depositId);
    const acc = db.accounts.find((a) => a.account_id === dispute.accountId);

    if (action === 'approve') {
      dispute.status = 'resolved_approve';
      dispute.resolutionNote = note || 'تم اعتماد الإيداع من قبل الوكيل.';
      if (dep) {
        dep.status = 'completed';
        dep.confirmedAt = new Date().toISOString();
        if (acc) {
          acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
          acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.incomeUsdt) * 100) / 100;
        }
      }
    } else if (action === 'reject') {
      dispute.status = 'resolved_reject';
      dispute.resolutionNote = note || 'لم يتم العثور على حوالة مطابقة في كشف الحساب.';
      if (dep) {
        dep.status = 'cancelled';
        if (acc) {
          acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
          acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.amountUsdt) * 100) / 100;
        }
      }
    }
    saveDb(db);
    res.json(db);
  });

  // Claim available withdrawal
  app.post('/api/withdrawals/:id/claim', (req, res) => {
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
    if (wd.status !== 'available') return res.status(400).json({ error: 'Withdrawal already claimed' });
    wd.status = 'accepted';
    wd.acceptedAt = new Date().toISOString();
    wd.expiresAt = minsFromNow(25);
    saveDb(db);
    res.json(db);
  });

  // Update withdrawal (upload receipt / complete / release)
  app.patch('/api/withdrawals/:id', (req, res) => {
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Withdrawal not found' });
    const acc = db.accounts.find((a) => a.account_id === wd.accountId);
    const { action, files } = req.body as {
      action: 'complete' | 'release' | 'attach';
      files?: Array<{ name: string; size: string }>;
    };

    if (action === 'attach' && files?.length) {
      const now = new Date().toISOString();
      wd.receiptFiles = [...wd.receiptFiles, ...files.map((f) => ({ ...f, uploadedAt: now }))];
    } else if (action === 'complete') {
      if (files?.length) {
        const now = new Date().toISOString();
        wd.receiptFiles = [...wd.receiptFiles, ...files.map((f) => ({ ...f, uploadedAt: now }))];
      }
      wd.status = 'completed';
      wd.completedAt = new Date().toISOString();
      if (acc) {
        acc.balanceUsdt = Math.round((acc.balanceUsdt + wd.amountUsdt + wd.incomeUsdt) * 100) / 100;
      }
    } else if (action === 'release' && wd.status === 'accepted') {
      wd.status = 'available';
      wd.acceptedAt = undefined;
    }

    saveDb(db);
    res.json(db);
  });

  // Requisites CRUD
  app.post('/api/requisites', (req, res) => {
    const body = req.body as Partial<Requisite>;
    const acc = db.accounts.find((a) => a.account_id === (body.accountId || db.currentAccountId)) ?? db.accounts[0];
    const item: Requisite = {
      id: `req_${Date.now()}`,
      accountId: acc.account_id,
      bankName: body.bankName || 'وسيلة دفع جديدة',
      ownerName: body.ownerName || db.profile.displayName,
      accountNumber: body.accountNumber || '01000000000',
      type: body.type || 'wallet',
      minOrder: Number(body.minOrder) || 200,
      maxOrder: Number(body.maxOrder) || 25000,
      dailyLimit: Number(body.dailyLimit) || 150000,
      dailyUsed: 0,
      bidRate: Number(body.bidRate) || acc.depositFeePct,
      active: true,
      deviceId: body.deviceId,
      createdAt: new Date().toISOString(),
    };
    db.requisites.unshift(item);
    saveDb(db);
    res.json(db);
  });

  app.patch('/api/requisites/:id', (req, res) => {
    const item = db.requisites.find((r) => r.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Requisite not found' });
    Object.assign(item, req.body);
    saveDb(db);
    res.json(db);
  });

  app.delete('/api/requisites/:id', (req, res) => {
    db.requisites = db.requisites.filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.json(db);
  });

  // Android devices CRUD
  app.post('/api/automatic/android', (req, res) => {
    const { name, model, linkedRequisiteId } = req.body as {
      name: string;
      model: string;
      linkedRequisiteId?: string;
    };
    const token = `HP-AND-${Math.floor(1000 + Math.random() * 9000)}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    db.androidDevices.unshift({
      id: `dev_${Date.now()}`,
      name: name || 'جهاز أندرويد جديد',
      model: model || 'Samsung Galaxy A35',
      osVersion: 'Android 14',
      appVersion: 'v2.8.4',
      pairingToken: token,
      linkedRequisiteId,
      batteryPct: 100,
      online: true,
      lastPingAt: new Date().toISOString(),
      capturedCount: 0,
    });
    saveDb(db);
    res.json(db);
  });

  app.patch('/api/automatic/android/:id', (req, res) => {
    const dev = db.androidDevices.find((d) => d.id === req.params.id);
    if (!dev) return res.status(404).json({ error: 'Device not found' });
    Object.assign(dev, req.body);
    saveDb(db);
    res.json(db);
  });

  app.delete('/api/automatic/android/:id', (req, res) => {
    db.androidDevices = db.androidDevices.filter((d) => d.id !== req.params.id);
    saveDb(db);
    res.json(db);
  });

  // Telegram bots CRUD
  app.post('/api/automatic/telegram', (req, res) => {
    const { name, botUsername, chatId, events } = req.body as Partial<TelegramBotConfig>;
    db.telegramBots.unshift({
      id: `tg_${Date.now()}`,
      name: name || 'بوت تنبيهات جديد',
      botUsername: botUsername || '@hostapay_notify_bot',
      chatId: chatId || '-1002248190441',
      events: events?.length ? events : ['new_deposit', 'dispute_opened'],
      active: true,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db);
  });

  app.delete('/api/automatic/telegram/:id', (req, res) => {
    db.telegramBots = db.telegramBots.filter((b) => b.id !== req.params.id);
    saveDb(db);
    res.json(db);
  });

  // API keys CRUD
  app.post('/api/automatic/api-keys', (req, res) => {
    const { label, webhookUrl, permissions } = req.body as Partial<ApiKeyConfig>;
    const rand = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const fullKey = `hp_live_${rand.slice(0, 28)}`;
    db.apiKeys.unshift({
      id: `key_${Date.now()}`,
      label: label || 'مفتاح API جديد',
      keyPrefix: fullKey.slice(0, 12),
      fullKey,
      webhookUrl: webhookUrl || 'https://api.yourdomain.com/hostapay/webhook',
      permissions: permissions?.length ? permissions : ['deposits:read', 'deposits:confirm'],
      active: true,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(db);
  });

  app.delete('/api/automatic/api-keys/:id', (req, res) => {
    db.apiKeys = db.apiKeys.filter((k) => k.id !== req.params.id);
    saveDb(db);
    res.json(db);
  });

  // Simulate incoming SMS & auto-match pending deposit
  app.post('/api/messages/simulate', (_req, res) => {
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    const pendingDep = db.deposits.find((d) => d.accountId === acc.account_id && d.status === 'pending');
    const dev = db.androidDevices.find((d) => d.online) ?? db.androidDevices[0];
    const amount = pendingDep ? pendingDep.amountLocal : Math.floor(1500 + Math.random() * 5000);
    const sender = acc.currency === 'EGP' ? 'VF-Cash' : acc.currency === 'SAR' ? 'AlRajhi' : 'BankSMS';

    let matchedDepositId: string | null = null;
    let matchedOrderId: string | null = null;
    let status: SmsMessage['status'] = 'unmatched';

    if (pendingDep) {
      pendingDep.status = 'completed';
      pendingDep.confirmedAt = new Date().toISOString();
      acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - pendingDep.amountUsdt) * 100) / 100);
      acc.balanceUsdt = Math.round((acc.balanceUsdt + pendingDep.incomeUsdt) * 100) / 100;
      const reqItem = db.requisites.find((r) => r.id === pendingDep.requisiteId);
      if (reqItem) reqItem.dailyUsed += pendingDep.amountLocal;
      matchedDepositId = pendingDep.id;
      matchedOrderId = pendingDep.orderId;
      status = 'matched';
    }

    if (dev) dev.capturedCount += 1;

    const msg: SmsMessage = {
      id: `msg_${Date.now()}`,
      deviceId: dev?.id || 'dev_01',
      deviceName: dev?.name || 'Android Bridge',
      sender,
      body:
        acc.currency === 'EGP'
          ? `تم استلام مبلغ ${amount.toLocaleString('en-US')}.00 جنيه بنجاح. مرجع العملية ${Math.floor(1000000 + Math.random() * 9000000)}.`
          : `Credit alert: ${amount.toLocaleString('en-US')}.00 ${acc.currency} received into your desk account.`,
      parsedAmount: amount,
      currency: acc.currency,
      matchedDepositId,
      matchedOrderId,
      status,
      receivedAt: new Date().toISOString(),
    };

    db.messages.unshift(msg);
    saveDb(db);
    res.json({ state: db, message: msg });
  });

  // Top-up balance
  app.post('/api/topups', (req, res) => {
    const { amountUsdt, network } = req.body as { amountUsdt: number; network: TopUpRecord['network'] };
    const amount = Math.max(10, Number(amountUsdt) || 500);
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    const hash = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const record: TopUpRecord = {
      id: `top_${Date.now()}`,
      txHash: hash,
      network: network || 'TRC-20',
      amountUsdt: amount,
      status: 'credited',
      createdAt: new Date().toISOString(),
    };
    acc.balanceUsdt = Math.round((acc.balanceUsdt + amount) * 100) / 100;
    db.topUps.unshift(record);
    saveDb(db);
    res.json(db);
  });

  // Profile & Settings
  app.patch('/api/profile', (req, res) => {
    Object.assign(db.profile, req.body);
    saveDb(db);
    res.json(db);
  });

  app.patch('/api/settings', (req, res) => {
    Object.assign(db.settings, req.body);
    saveDb(db);
    res.json(db);
  });

  // Vite middleware in dev vs static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HostaPay Trader server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
