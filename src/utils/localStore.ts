import {
  ApiKeyConfig,
  DepositOrder,
  PlatformState,
  Requisite,
  SmsMessage,
  TelegramBotConfig,
  TopUpRecord,
} from '../types';

const STORAGE_KEY = 'hostapay_trader_state_v2';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function minsFromNow(m: number): string {
  return new Date(Date.now() + m * 60_000).toISOString();
}

export function createClientSeedState(): PlatformState {
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
    ],
    deposits: [
      {
        id: 'dep_883990',
        orderId: 'HP-883990',
        accountId: 'acc_sar',
        amountLocal: 3830,
        amountUsdt: 1000.0,
        incomeUsdt: 25.0,
        rate: 3.83,
        requisiteId: 'req_201',
        bankName: 'مصرف الراجحي (Al Rajhi)',
        ownerName: 'فيصل بن سعود القحطاني',
        requisiteNumber: 'SA44 8000 0219 6080 1044 9211',
        status: 'pending',
        createdAt: hoursAgo(0.2),
        expiresAt: minsFromNow(12),
      },
      {
        id: 'dep_883955',
        orderId: 'HP-883955',
        accountId: 'acc_sar',
        amountLocal: 1915,
        amountUsdt: 500.0,
        incomeUsdt: 13.5,
        rate: 3.83,
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
      },
    ],
    disputes: [
      {
        id: 'dsp_401',
        depositId: 'dep_9001',
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
    ],
    withdrawals: [
      {
        id: 'wd_705',
        orderId: 'WD-301840',
        accountId: 'acc_sar',
        amountLocal: 5745,
        amountUsdt: 1500.0,
        incomeUsdt: 22.5,
        rate: 3.83,
        destinationMethod: 'مصرف الراجحي',
        requisiteNumber: 'SA19 8000 0412 6080 1992 3100',
        recipientName: 'عبدالله فهد الدوسري',
        status: 'available',
        createdAt: hoursAgo(0.3),
        expiresAt: minsFromNow(22),
        receiptFiles: [],
      },
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
    ],
    androidDevices: [
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
    ],
    apiKeys: [
      {
        id: 'key_01',
        label: 'مفتاح التكامل المحاسبي الرئيسي',
        keyPrefix: 'hp_live_98f2',
        fullKey: 'hp_live_98f2a4c1d9e04471b2380f9a71c44e92',
        webhookUrl: 'https://ops.elite-desk.example/webhooks/hostapay',
        permissions: ['deposits:read', 'deposits:confirm', 'withdrawals:read'],
        active: true,
        lastUsedAt: hoursAgo(0.1),
        createdAt: hoursAgo(400),
      },
    ],
    messages: [
      {
        id: 'msg_504',
        deviceId: 'dev_03',
        deviceName: 'جهاز الرياض · STC/AlRajhi',
        sender: 'STC Pay',
        body: 'تم إيداع 1,915.00 ر.س في محفظتك في STC Pay بنجاح.',
        parsedAmount: 1915,
        currency: 'SAR',
        matchedDepositId: 'dep_883955',
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
    ],
    referrals: [
      {
        id: 'ref_01',
        partnerCode: 'AG-RIYADH-19',
        joinedAt: hoursAgo(480),
        volumeUsdt: 98450,
        earnedUsdt: 492.25,
        status: 'active',
      },
    ],
    settings: {
      lang: 'ar',
      tzOffset: 3,
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

export function loadLocalState(): PlatformState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PlatformState;
  } catch {
    // ignore
  }
  const seed = createClientSeedState();
  saveLocalState(seed);
  return seed;
}

export function saveLocalState(state: PlatformState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function executeLocalApi(
  url: string,
  method: string,
  body?: Record<string, unknown>
): PlatformState | { state: PlatformState; created?: DepositOrder; message?: SmsMessage } {
  const db = loadLocalState();

  if (url === '/api/accounts/switch' && body?.accountId) {
    db.currentAccountId = String(body.accountId);
  } else if (url === '/api/accounts/trade-status' && body) {
    const acc = db.accounts.find((a) => a.account_id === body.accountId);
    if (acc) acc.canTrade = Boolean(body.canTrade);
  } else if (url === '/api/deposits/simulate') {
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    const req = db.requisites.find((r) => r.accountId === acc.account_id && r.active) ?? db.requisites[0];
    const baseUsdt = Math.round((45 + Math.random() * 420) * 100) / 100;
    const amountLocal = Math.round(baseUsdt * acc.rate);
    const incomeUsdt = Math.round(baseUsdt * (acc.depositFeePct / 100) * 100) / 100;
    const created: DepositOrder = {
      id: `dep_${Date.now()}`,
      orderId: `HP-${Math.floor(884200 + Math.random() * 9000)}`,
      accountId: acc.account_id,
      amountLocal,
      amountUsdt: baseUsdt,
      incomeUsdt,
      rate: acc.rate,
      requisiteId: req.id,
      bankName: req.bankName,
      ownerName: req.ownerName,
      requisiteNumber: req.accountNumber,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: minsFromNow(15),
    };
    acc.frozenUsdt = Math.round((acc.frozenUsdt + baseUsdt) * 100) / 100;
    acc.balanceUsdt = Math.max(0, Math.round((acc.balanceUsdt - baseUsdt) * 100) / 100);
    db.deposits.unshift(created);
    saveLocalState(db);
    return { state: db, created };
  } else if (url.startsWith('/api/deposits/')) {
    const id = url.split('/').pop();
    const dep = db.deposits.find((d) => d.id === id);
    if (dep && body) {
      const acc = db.accounts.find((a) => a.account_id === dep.accountId);
      if (body.action === 'confirm') {
        dep.status = 'completed';
        dep.confirmedAt = new Date().toISOString();
        if (acc) {
          acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
          acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.incomeUsdt) * 100) / 100;
        }
      } else if (body.action === 'cancel') {
        dep.status = 'cancelled';
        if (acc) {
          acc.frozenUsdt = Math.max(0, Math.round((acc.frozenUsdt - dep.amountUsdt) * 100) / 100);
          acc.balanceUsdt = Math.round((acc.balanceUsdt + dep.amountUsdt) * 100) / 100;
        }
      } else if (body.action === 'dispute') {
        dep.status = 'disputed';
      } else if (body.action === 'edit_amount' && typeof body.newAmountLocal === 'number') {
        dep.amountLocal = Math.round(body.newAmountLocal);
        dep.amountUsdt = Math.round((dep.amountLocal / dep.rate) * 100) / 100;
      }
    }
  } else if (url.startsWith('/api/disputes/')) {
    const id = url.split('/').pop();
    const dsp = db.disputes.find((d) => d.id === id);
    if (dsp && body) {
      dsp.status = body.action === 'approve' ? 'resolved_approve' : 'resolved_reject';
    }
  } else if (url.startsWith('/api/withdrawals/') && url.endsWith('/claim')) {
    const id = url.split('/')[3];
    const wd = db.withdrawals.find((w) => w.id === id);
    if (wd) {
      wd.status = 'accepted';
      wd.acceptedAt = new Date().toISOString();
    }
  } else if (url.startsWith('/api/withdrawals/')) {
    const id = url.split('/').pop();
    const wd = db.withdrawals.find((w) => w.id === id);
    if (wd && body) {
      if (body.action === 'complete') {
        wd.status = 'completed';
        wd.completedAt = new Date().toISOString();
      } else if (body.action === 'release') {
        wd.status = 'available';
      } else if (body.action === 'attach' && Array.isArray(body.files)) {
        const now = new Date().toISOString();
        wd.receiptFiles = [
          ...wd.receiptFiles,
          ...(body.files as Array<{ name: string; size: string }>).map((f) => ({ ...f, uploadedAt: now })),
        ];
      }
    }
  } else if (url === '/api/requisites' && method === 'POST' && body) {
    const item: Requisite = {
      id: `req_${Date.now()}`,
      accountId: String(body.accountId || db.currentAccountId),
      bankName: String(body.bankName || 'وسيلة دفع جديدة'),
      ownerName: String(body.ownerName || db.profile.displayName),
      accountNumber: String(body.accountNumber || '0500000000'),
      type: (body.type as Requisite['type']) || 'wallet',
      minOrder: Number(body.minOrder) || 200,
      maxOrder: Number(body.maxOrder) || 25000,
      dailyLimit: Number(body.dailyLimit) || 150000,
      dailyUsed: 0,
      bidRate: Number(body.bidRate) || 2.5,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.requisites.unshift(item);
  } else if (url.startsWith('/api/requisites/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') {
      db.requisites = db.requisites.filter((r) => r.id !== id);
    } else if (body) {
      const item = db.requisites.find((r) => r.id === id);
      if (item) Object.assign(item, body);
    }
  } else if (url === '/api/automatic/android' && method === 'POST' && body) {
    db.androidDevices.unshift({
      id: `dev_${Date.now()}`,
      name: String(body.name || 'جهاز جديد'),
      model: String(body.model || 'Samsung Galaxy A55'),
      osVersion: 'Android 14',
      appVersion: 'v2.8.4',
      pairingToken: `HP-AND-${Math.floor(1000 + Math.random() * 9000)}`,
      batteryPct: 100,
      online: true,
      lastPingAt: new Date().toISOString(),
      capturedCount: 0,
    });
  } else if (url.startsWith('/api/automatic/android/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') db.androidDevices = db.androidDevices.filter((d) => d.id !== id);
    else if (body) {
      const dev = db.androidDevices.find((d) => d.id === id);
      if (dev) Object.assign(dev, body);
    }
  } else if (url === '/api/automatic/telegram' && method === 'POST' && body) {
    const bot: TelegramBotConfig = {
      id: `tg_${Date.now()}`,
      name: String(body.name || 'بوت جديد'),
      botUsername: String(body.botUsername || '@hostapay_alerts_bot'),
      chatId: String(body.chatId || '-1002248190441'),
      events: ['new_deposit'],
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.telegramBots.unshift(bot);
  } else if (url.startsWith('/api/automatic/telegram/')) {
    const id = url.split('/').pop();
    db.telegramBots = db.telegramBots.filter((b) => b.id !== id);
  } else if (url === '/api/automatic/api-keys' && method === 'POST' && body) {
    const fullKey = `hp_live_${Math.random().toString(36).slice(2, 16)}`;
    const k: ApiKeyConfig = {
      id: `key_${Date.now()}`,
      label: String(body.label || 'API Key'),
      keyPrefix: fullKey.slice(0, 12),
      fullKey,
      webhookUrl: String(body.webhookUrl || 'https://api.example.com/webhook'),
      permissions: ['deposits:read', 'deposits:confirm'],
      active: true,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.apiKeys.unshift(k);
  } else if (url.startsWith('/api/automatic/api-keys/')) {
    const id = url.split('/').pop();
    db.apiKeys = db.apiKeys.filter((k) => k.id !== id);
  } else if (url === '/api/messages/simulate') {
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    const pendingDep = db.deposits.find((d) => d.accountId === acc.account_id && d.status === 'pending');
    const amount = pendingDep ? pendingDep.amountLocal : 2500;
    if (pendingDep) {
      pendingDep.status = 'completed';
      pendingDep.confirmedAt = new Date().toISOString();
    }
    const msg: SmsMessage = {
      id: `msg_${Date.now()}`,
      deviceId: 'dev_03',
      deviceName: 'جهاز الرياض · STC/AlRajhi',
      sender: acc.currency === 'SAR' ? 'STC Pay' : 'VF-Cash',
      body: `تم إيداع ${amount} ${acc.currency} بنجاح.`,
      parsedAmount: amount,
      currency: acc.currency,
      matchedDepositId: pendingDep?.id ?? null,
      matchedOrderId: pendingDep?.orderId ?? null,
      status: pendingDep ? 'matched' : 'unmatched',
      receivedAt: new Date().toISOString(),
    };
    db.messages.unshift(msg);
    saveLocalState(db);
    return { state: db, message: msg };
  } else if (url === '/api/topups' && body) {
    const amount = Number(body.amountUsdt) || 500;
    const acc = db.accounts.find((a) => a.account_id === db.currentAccountId) ?? db.accounts[0];
    acc.balanceUsdt = Math.round((acc.balanceUsdt + amount) * 100) / 100;
    const rec: TopUpRecord = {
      id: `top_${Date.now()}`,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      network: (body.network as TopUpRecord['network']) || 'TRC-20',
      amountUsdt: amount,
      status: 'credited',
      createdAt: new Date().toISOString(),
    };
    db.topUps.unshift(rec);
  } else if (url === '/api/profile' && body) {
    Object.assign(db.profile, body);
  } else if (url === '/api/settings' && body) {
    Object.assign(db.settings, body);
  }

  saveLocalState(db);
  return db;
}
