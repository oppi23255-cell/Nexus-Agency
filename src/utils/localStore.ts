import {
  AccountDesk,
  ApiKeyConfig,
  DepositOrder,
  ManagedUser,
  OnlinePresenceEntry,
  PlatformState,
  Requisite,
  SmsMessage,
  TelegramBotConfig,
  TopUpRecord,
  WithdrawalOrder,
} from '../types';

const STORAGE_KEY = 'egyptpay_trader_state_v3';

function minsFromNow(m: number): string {
  return new Date(Date.now() + m * 60_000).toISOString();
}

export function createClientSeedState(): PlatformState {
  return {
    config: {
      platformName: 'egyptpay.trade',
      countryCode: 'EG',
      currencyCode: 'EGP',
      usdRate: 49.85,
      adminPassword: 'admin123',
    },
    users: [],
    onlinePresence: [],
    onlineCount: 0,
    profile: {
      traderId: 'TRD-EG-001',
      displayName: 'مكتب مصر للمدفوعات',
      email: '',
      telegramHandle: '@egyptpay_desk',
      twoFactorEnabled: true,
      referralCode: 'EG-ELITE-01',
      referralRatePct: 0.5,
      trc20Address: 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
    },
    currentAccountId: 'acc_egp_guest',
    accounts: [
      {
        account_id: 'acc_egp_guest',
        uuid: '01a1a848-4f12-7901-b4a2-884019e3c102',
        username: 'guest_egp',
        countryCode: 'EG',
        label: 'EG | جنيه مصري',
        labelEn: 'EG | EGP',
        currency: 'EGP',
        balanceUsdt: 0,
        frozenUsdt: 0,
        insuranceAmount: null,
        rate: 49.85,
        canTrade: false,
        depositFeePct: 3.0,
        withdrawalFeePct: 1.8,
      },
    ],
    requisites: [],
    deposits: [],
    disputes: [],
    withdrawals: [],
    androidDevices: [],
    telegramBots: [],
    apiKeys: [],
    messages: [],
    topUps: [],
    referrals: [],
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
      defaultLanding: '/profile',
    },
  };
}

function prunePresence(list: OnlinePresenceEntry[] = []): OnlinePresenceEntry[] {
  const cutoff = Date.now() - 35_000;
  return list.filter((p) => {
    const ts = Date.parse(p.lastPingAt);
    return !Number.isNaN(ts) && ts >= cutoff;
  });
}

export function buildAccountForUser(user: ManagedUser, rate: number): AccountDesk {
  return {
    account_id: `acc_${user.id}`,
    userId: user.id,
    uuid: user.uuid,
    username: user.username,
    countryCode: 'EG',
    label: 'EG | جنيه مصري',
    labelEn: 'EG | EGP',
    currency: 'EGP',
    balanceUsdt: user.balanceEgp,
    frozenUsdt: user.frozenEgp,
    insuranceAmount: user.insuranceEgp,
    rate,
    canTrade: user.canTrade,
    depositFeePct: user.depositFeePct,
    withdrawalFeePct: user.withdrawalFeePct,
  };
}

export function buildPlatformStateForUser(
  base: PlatformState,
  user: ManagedUser
): PlatformState {
  const acc = buildAccountForUser(user, base.config.usdRate);
  return {
    ...base,
    authenticated: true,
    activeUserId: user.id,
    users: undefined,
    onlinePresence: undefined,
    profile: {
      userId: user.id,
      playerId: user.playerId || `PL-${user.id.slice(-8)}`,
      traderId: user.playerId || user.id.toUpperCase(),
      displayName: user.displayName,
      email: user.email,
      telegramHandle: user.telegramHandle,
      twoFactorEnabled: user.twoFactorEnabled,
      referralCode: user.referralCode,
      referralRatePct: user.referralRatePct,
      trc20Address: user.trc20Address,
    },
    currentAccountId: acc.account_id,
    accounts: [acc],
  };
}

function projectUserView(db: PlatformState, userId?: string | null): PlatformState {
  db.onlinePresence = prunePresence(db.onlinePresence);
  const users = db.users ?? [];
  const user = userId ? users.find((u) => u.id === userId && u.active) : undefined;
  if (!user) {
    return {
      ...db,
      authenticated: false,
      activeUserId: null,
      users: undefined,
      onlinePresence: undefined,
      onlineCount: db.onlinePresence.length,
    };
  }
  const acc = buildAccountForUser(user, db.config.usdRate);
  return {
    ...buildPlatformStateForUser(db, user),
    onlineCount: db.onlinePresence.length,
    requisites: db.requisites.filter((r) => r.userId === user.id || r.accountId === acc.account_id),
    deposits: db.deposits.filter((d) => d.userId === user.id || d.accountId === acc.account_id),
    disputes: db.disputes.filter((d) => d.userId === user.id || d.accountId === acc.account_id),
    withdrawals: db.withdrawals.filter((w) => w.userId === user.id || w.accountId === acc.account_id),
    androidDevices: db.androidDevices.filter((a) => a.userId === user.id),
    telegramBots: db.telegramBots.filter((t) => t.userId === user.id),
    apiKeys: db.apiKeys.filter((k) => k.userId === user.id),
    messages: db.messages.filter((m) => m.userId === user.id),
    topUps: db.topUps.filter((tp) => tp.userId === user.id),
    referrals: db.referrals.filter((rf) => rf.userId === user.id),
  };
}

export function loadRawLocalDb(): PlatformState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlatformState;
      if (parsed.config && Array.isArray(parsed.users)) return parsed;
    }
  } catch {
    // ignore
  }
  const seed = createClientSeedState();
  saveLocalState(seed);
  return seed;
}

export function loadLocalState(sessionUserId?: string | null): PlatformState {
  return projectUserView(loadRawLocalDb(), sessionUserId);
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
  body?: Record<string, unknown>,
  sessionUserId?: string | null
): Record<string, unknown> {
  const db = loadRawLocalDb();
  const uid = sessionUserId ?? null;

  if (url === '/api/presence/ping' && body) {
    const visitorId = String(body.visitorId || '');
    const pUid = body.userId ? String(body.userId) : null;
    const user = pUid ? (db.users ?? []).find((u) => u.id === pUid) : undefined;
    const now = new Date().toISOString();
    db.onlinePresence = prunePresence(db.onlinePresence);
    const existing = db.onlinePresence.find((p) => p.visitorId === visitorId);
    if (existing) {
      existing.userId = user?.id ?? null;
      existing.userName = user?.displayName ?? null;
      existing.email = user?.email ?? null;
      existing.route = String(body.route || '/');
      existing.lastPingAt = now;
    } else if (visitorId) {
      db.onlinePresence.push({
        visitorId,
        userId: user?.id ?? null,
        userName: user?.displayName ?? null,
        email: user?.email ?? null,
        route: String(body.route || '/'),
        lastPingAt: now,
      });
    }
    saveLocalState(db);
    return { ok: true, onlineCount: db.onlinePresence.length };
  }

  if (url === '/api/auth/login' && body) {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const cleanPass = password.trim();
    const user = (db.users ?? []).find(
      (u) =>
        u.email.trim().toLowerCase() === email &&
        (u.password === password || u.password.trim() === cleanPass)
    );
    if (!user) {
      return { ok: false, error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    }
    if (!user.active) {
      return { ok: false, error: 'الحساب موقوف مؤقتاً من الإدارة' };
    }
    saveLocalState(db);
    return { ok: true, userId: user.id, state: projectUserView(db, user.id) };
  }

  if (url === '/api/auth/logout') {
    return { ok: true, state: projectUserView(db, null) };
  }

  if (url === '/api/admin/auth' && body) {
    const pass = String(body.password || '');
    if (pass === (db.config.adminPassword || 'admin123')) {
      db.onlinePresence = prunePresence(db.onlinePresence);
      return { ok: true, state: { ...db, onlineCount: db.onlinePresence.length } };
    }
    return { ok: false, error: 'كلمة مرور الأدمن مش صح' };
  }

  if (url === '/api/admin/state') {
    db.onlinePresence = prunePresence(db.onlinePresence);
    return { ...db, onlineCount: db.onlinePresence.length };
  }

  if (url === '/api/admin/users' && method === 'POST' && body) {
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    if (!email || !password) return { ok: false, error: 'البريد وكلمة المرور مطلوبين' };
    if ((db.users ?? []).some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: 'البريد الإلكتروني مسجل من قبل' };
    }
    const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'agent';
    const takenPids = new Set((db.users ?? []).map((u) => u.playerId).filter(Boolean));
    let playerId = `PL-${Math.floor(10000000 + Math.random() * 89999999)}`;
    while (takenPids.has(playerId)) {
      playerId = `PL-${Math.floor(10000000 + Math.random() * 89999999)}`;
    }
    const newUser: ManagedUser = {
      id: `usr_${Date.now()}`,
      playerId,
      uuid: `01a1a848-${Math.random().toString(16).slice(2, 6)}-7533-a6f9-${Math.random().toString(16).slice(2, 14)}`,
      username: String(body.username || `${prefix}_egp`),
      displayName: String(body.displayName || prefix),
      email,
      emailLower: email.toLowerCase(),
      password: password.trim(),
      telegramHandle: `@${prefix}`,
      balanceEgp: Number(body.balanceEgp) || 0,
      frozenEgp: 0,
      insuranceEgp: null,
      canTrade: true,
      active: true,
      depositFeePct: 3.0,
      withdrawalFeePct: 1.8,
      referralCode: String(body.referralCode || `EG-${playerId.replace('PL-', '')}`),
      referralRatePct: 0.5,
      twoFactorEnabled: true,
      trc20Address: 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
      createdAt: new Date().toISOString(),
    };
    db.users = [...(db.users ?? []), newUser];
    saveLocalState(db);
    return { ok: true, user: newUser, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url.startsWith('/api/admin/users/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') {
      db.users = (db.users ?? []).filter((u) => u.id !== id);
    } else if (body) {
      const user = (db.users ?? []).find((u) => u.id === id);
      if (user) Object.assign(user, body);
    }
    saveLocalState(db);
    return { ok: true, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url === '/api/admin/withdrawals/send' && body) {
    const targetId = String(body.userId || '');
    const user = (db.users ?? []).find((u) => u.id === targetId);
    if (!user) return { ok: false, error: 'اختر مستخدم صحيح أولاً' };
    const amount = Math.max(1, Number(body.amountEgp) || 0);
    const rate = db.config.usdRate || 49.85;
    const wdId = `wd_${Date.now()}`;
    const orderId = `WD-${Math.floor(400000 + Math.random() * 599999)}`;
    const nowIso = new Date().toISOString();
    const methodLabel = String(body.destinationMethod || 'فودافون كاش');
    const reqNum = String(body.requisiteNumber || '01000000000');
    const recName = String(body.recipientName || user.displayName);

    const wd: WithdrawalOrder = {
      id: wdId,
      userId: user.id,
      orderId,
      accountId: `acc_${user.id}`,
      amountLocal: amount,
      amountUsdt: Math.round((amount / rate) * 100) / 100,
      incomeUsdt: 0,
      rate,
      destinationMethod: methodLabel,
      requisiteNumber: reqNum,
      recipientName: recName,
      status: 'awaiting_confirmation',
      createdAt: nowIso,
      expiresAt: minsFromNow(30),
      adminCreated: true,
      receiptFiles: [],
    };
    db.withdrawals.unshift(wd);

    const msg: SmsMessage = {
      id: `msg_${Date.now()}`,
      userId: user.id,
      deviceId: 'admin_desk',
      deviceName: 'إدارة المنصة',
      sender: 'طلب سحب من الإدارة',
      body:
        typeof body.note === 'string' && body.note.trim()
          ? body.note.trim()
          : `عندك طلب سحب بمبلغ ${amount.toLocaleString('en-US')} ج.م إلى ${methodLabel} (${reqNum}). أكّد عشان يتخصم من رصيدك أو ارفض لو مش موافق.`,
      parsedAmount: amount,
      currency: 'EGP',
      matchedDepositId: null,
      matchedOrderId: orderId,
      withdrawalId: wdId,
      withdrawalAmountEgp: amount,
      withdrawalDestination: `${methodLabel} · ${reqNum}`,
      withdrawalRecipient: recName,
      withdrawalActionStatus: 'pending_confirmation',
      status: 'unmatched',
      receivedAt: nowIso,
    };
    db.messages.unshift(msg);
    saveLocalState(db);
    return { ok: true, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url === '/api/admin/messages/send' && body) {
    db.messages.unshift({
      id: `msg_${Date.now()}`,
      userId: String(body.userId || ''),
      deviceId: 'admin_desk',
      deviceName: 'لوحة الإدارة',
      sender: String(body.sender || 'إدارة المنصة'),
      body: String(body.body || ''),
      parsedAmount: null,
      currency: 'EGP',
      matchedDepositId: null,
      matchedOrderId: null,
      status: 'unmatched',
      receivedAt: new Date().toISOString(),
    });
    saveLocalState(db);
    return { ok: true, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url === '/api/admin/deposits' && body) {
    const targetId = String(body.userId || '').trim();
    const qVal = String(body.identifier || '').trim().toLowerCase();
    const qNoAt = qVal.replace(/^@/, '');
    const user = (db.users ?? []).find(
      (u) =>
        (targetId && u.id === targetId) ||
        (qVal &&
          (u.email.trim().toLowerCase() === qVal ||
            u.username.trim().toLowerCase().replace(/^@/, '') === qNoAt ||
            (u.playerId || '').trim().toLowerCase() === qVal))
    );
    if (!user) {
      return { ok: false, error: 'لم يتم العثور على العميل بالبريد أو اليوزرنيم ده' };
    }
    const autoCredit = body.autoCredit !== false;
    const amount = Math.max(1, Number(body.amountEgp) || 0);
    const rate = db.config.usdRate || 49.85;
    const nowIso = new Date().toISOString();
    const depId = `dep_${Date.now()}`;
    const orderId = `EG-${Math.floor(884200 + Math.random() * 90000)}`;
    if (autoCredit) {
      user.balanceEgp = Math.round(((user.balanceEgp || 0) + amount) * 100) / 100;
    }
    db.deposits.unshift({
      id: depId,
      userId: user.id,
      orderId,
      accountId: `acc_${user.id}`,
      amountLocal: amount,
      amountUsdt: Math.round((amount / rate) * 100) / 100,
      incomeUsdt: 0,
      rate,
      requisiteId: 'req_admin',
      bankName: typeof body.bankName === 'string' && body.bankName.trim() ? body.bankName.trim() : 'إيداع فوري من الإدارة',
      ownerName: user.displayName,
      requisiteNumber: user.username,
      status: autoCredit ? 'completed' : 'pending',
      createdAt: nowIso,
      expiresAt: minsFromNow(15),
      ...(autoCredit ? { confirmedAt: nowIso } : {}),
      ...(typeof body.note === 'string' && body.note.trim() ? { customerNote: body.note.trim() } : {}),
    });
    if (autoCredit) {
      db.messages.unshift({
        id: `msg_${Date.now()}`,
        userId: user.id,
        deviceId: 'admin_desk',
        deviceName: 'إدارة المنصة',
        sender: 'إيداع رصيد فوري',
        body:
          typeof body.note === 'string' && body.note.trim()
            ? body.note.trim()
            : `تم إيداع مبلغ ${amount.toLocaleString('en-US')} ج.م ونزوله في حسابك (${user.username}) بنجاح. رصيدك الحالي: ${user.balanceEgp.toLocaleString('en-US')} ج.م.`,
        parsedAmount: amount,
        currency: 'EGP',
        matchedDepositId: depId,
        matchedOrderId: orderId,
        status: 'matched',
        receivedAt: nowIso,
      });
    }
    saveLocalState(db);
    return { ok: true, user, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url === '/api/admin/config' && body) {
    if (body.platformName) db.config.platformName = String(body.platformName);
    if (body.usdRate && Number(body.usdRate) > 0) db.config.usdRate = Number(body.usdRate);
    if (body.adminPassword) db.config.adminPassword = String(body.adminPassword);
    saveLocalState(db);
    return { ok: true, state: { ...db, onlineCount: prunePresence(db.onlinePresence).length } };
  }

  if (url.startsWith('/api/messages/') && url.endsWith('/withdrawal-response') && body) {
    const id = url.split('/')[3];
    const user = (db.users ?? []).find((u) => u.id === uid);
    const msg = db.messages.find((m) => m.id === id && m.userId === uid);
    if (!user || !msg || !msg.withdrawalId) return { ok: false, error: 'الرسالة غير موجودة' };
    if (msg.withdrawalActionStatus !== 'pending_confirmation') {
      return { ok: false, error: 'تم الرد على الطلب بالفعل' };
    }
    const wd = db.withdrawals.find((w) => w.id === msg.withdrawalId);
    const amount = Number(msg.withdrawalAmountEgp ?? wd?.amountLocal ?? 0);
    if (body.action === 'confirm') {
      if (user.balanceEgp < amount) {
        return { ok: false, error: `الرصيد المتاح (${user.balanceEgp} ج.م) أقل من مبلغ السحب` };
      }
      user.balanceEgp = Math.round((user.balanceEgp - amount) * 100) / 100;
      msg.withdrawalActionStatus = 'confirmed';
      msg.status = 'matched';
      if (wd) {
        wd.status = 'completed';
        wd.completedAt = new Date().toISOString();
      }
    } else {
      msg.withdrawalActionStatus = 'rejected';
      msg.status = 'ignored';
      if (wd) wd.status = 'cancelled';
    }
    saveLocalState(db);
    return { ok: true, state: projectUserView(db, uid) };
  }

  if (url === '/api/accounts/trade-status' && body) {
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (user) user.canTrade = Boolean(body.canTrade);
  } else if (url === '/api/deposits/simulate') {
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (user) {
      const amountLocal = Math.round(500 + Math.random() * 4500);
      const rate = db.config.usdRate || 49.85;
      const created: DepositOrder = {
        id: `dep_${Date.now()}`,
        userId: user.id,
        orderId: `EG-${Math.floor(884200 + Math.random() * 9000)}`,
        accountId: `acc_${user.id}`,
        amountLocal,
        amountUsdt: Math.round((amountLocal / rate) * 100) / 100,
        incomeUsdt: Math.round(amountLocal * (user.depositFeePct / 100) * 100) / 100,
        rate,
        requisiteId: 'req_default',
        bankName: 'فودافون كاش',
        ownerName: user.displayName,
        requisiteNumber: '01000000000',
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: minsFromNow(15),
      };
      user.frozenEgp = Math.round((user.frozenEgp + amountLocal) * 100) / 100;
      db.deposits.unshift(created);
      saveLocalState(db);
      return { state: projectUserView(db, uid), created };
    }
  } else if (url.startsWith('/api/deposits/')) {
    const id = url.split('/').pop();
    const dep = db.deposits.find((d) => d.id === id);
    const user = (db.users ?? []).find((u) => u.id === dep?.userId);
    if (dep && body) {
      if (body.action === 'confirm') {
        dep.status = 'completed';
        dep.confirmedAt = new Date().toISOString();
        if (user) {
          user.frozenEgp = Math.max(0, Math.round((user.frozenEgp - dep.amountLocal) * 100) / 100);
          user.balanceEgp = Math.round((user.balanceEgp + dep.amountLocal + dep.incomeUsdt) * 100) / 100;
        }
      } else if (body.action === 'cancel') {
        dep.status = 'cancelled';
        if (user) user.frozenEgp = Math.max(0, Math.round((user.frozenEgp - dep.amountLocal) * 100) / 100);
      }
    }
  } else if (url === '/api/requisites' && method === 'POST' && body && uid) {
    const user = (db.users ?? []).find((u) => u.id === uid);
    const item: Requisite = {
      id: `req_${Date.now()}`,
      userId: uid,
      accountId: `acc_${uid}`,
      bankName: String(body.bankName || 'فودافون كاش'),
      ownerName: String(body.ownerName || user?.displayName || ''),
      accountNumber: String(body.accountNumber || '01000000000'),
      type: (body.type as Requisite['type']) || 'wallet',
      minOrder: Number(body.minOrder) || 200,
      maxOrder: Number(body.maxOrder) || 30000,
      dailyLimit: Number(body.dailyLimit) || 150000,
      dailyUsed: 0,
      bidRate: Number(body.bidRate) || 3.0,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.requisites.unshift(item);
  } else if (url.startsWith('/api/requisites/')) {
    const id = url.split('/').pop();
    if (method === 'DELETE') db.requisites = db.requisites.filter((r) => r.id !== id);
    else if (body) {
      const item = db.requisites.find((r) => r.id === id);
      if (item) Object.assign(item, body);
    }
  } else if (url === '/api/automatic/android' && method === 'POST' && body && uid) {
    db.androidDevices.unshift({
      id: `dev_${Date.now()}`,
      userId: uid,
      name: String(body.name || 'جهاز جديد'),
      model: String(body.model || 'Samsung Galaxy A55'),
      osVersion: 'Android 14',
      appVersion: 'v2.8.4',
      pairingToken: `EG-AND-${Math.floor(1000 + Math.random() * 9000)}`,
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
  } else if (url === '/api/automatic/telegram' && method === 'POST' && body && uid) {
    const bot: TelegramBotConfig = {
      id: `tg_${Date.now()}`,
      userId: uid,
      name: String(body.name || 'بوت التنبيهات'),
      botUsername: String(body.botUsername || '@egyptpay_bot'),
      chatId: String(body.chatId || '-1002248190441'),
      events: ['new_deposit'],
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.telegramBots.unshift(bot);
  } else if (url.startsWith('/api/automatic/telegram/')) {
    const id = url.split('/').pop();
    db.telegramBots = db.telegramBots.filter((b) => b.id !== id);
  } else if (url === '/api/automatic/api-keys' && method === 'POST' && body && uid) {
    const fullKey = `eg_live_${Math.random().toString(36).slice(2, 16)}`;
    const k: ApiKeyConfig = {
      id: `key_${Date.now()}`,
      userId: uid,
      label: String(body.label || 'API Key'),
      keyPrefix: fullKey.slice(0, 12),
      fullKey,
      webhookUrl: String(body.webhookUrl || 'https://api.example.com/webhook'),
      permissions: ['deposits:read'],
      active: true,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.apiKeys.unshift(k);
  } else if (url.startsWith('/api/automatic/api-keys/')) {
    const id = url.split('/').pop();
    db.apiKeys = db.apiKeys.filter((k) => k.id !== id);
  } else if (url === '/api/messages/simulate' && uid) {
    const amount = Math.floor(1000 + Math.random() * 5000);
    const msg: SmsMessage = {
      id: `msg_${Date.now()}`,
      userId: uid,
      deviceId: 'dev_eg',
      deviceName: 'جهاز القاهرة',
      sender: 'VF-Cash',
      body: `تم استلام مبلغ ${amount.toLocaleString('en-US')}.00 جنيه مصري عبر فودافون كاش.`,
      parsedAmount: amount,
      currency: 'EGP',
      matchedDepositId: null,
      matchedOrderId: null,
      status: 'unmatched',
      receivedAt: new Date().toISOString(),
    };
    db.messages.unshift(msg);
    saveLocalState(db);
    return { state: projectUserView(db, uid), message: msg };
  } else if (url === '/api/topups' && body && uid) {
    const user = (db.users ?? []).find((u) => u.id === uid);
    const amount = Number(body.amountUsdt) || 1000;
    if (user) user.balanceEgp = Math.round((user.balanceEgp + amount) * 100) / 100;
    const rec: TopUpRecord = {
      id: `top_${Date.now()}`,
      userId: uid,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
      network: (body.network as TopUpRecord['network']) || 'TRC-20',
      amountUsdt: amount,
      status: 'credited',
      createdAt: new Date().toISOString(),
    };
    db.topUps.unshift(rec);
  } else if (url === '/api/profile' && body && uid) {
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (user && typeof body.twoFactorEnabled === 'boolean') user.twoFactorEnabled = body.twoFactorEnabled;
  } else if (url === '/api/settings' && body) {
    Object.assign(db.settings, body);
  }

  saveLocalState(db);
  return projectUserView(db, uid) as unknown as Record<string, unknown>;
}
