import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
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
        label: 'EG | EGP · مصر',
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

function buildAccountForUser(user: ManagedUser, rate: number): AccountDesk {
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

function projectStateForUser(db: PlatformState, sessionUserId?: string | null): PlatformState {
  db.onlinePresence = prunePresence(db.onlinePresence);
  const users = db.users ?? [];
  const user = sessionUserId ? users.find((u) => u.id === sessionUserId && u.active) : undefined;

  if (!user) {
    return {
      ...db,
      authenticated: false,
      activeUserId: null,
      users: undefined,
      onlinePresence: undefined,
      onlineCount: db.onlinePresence.length,
      config: {
        ...db.config,
        adminPassword: '',
      },
      currentAccountId: 'acc_egp_guest',
      accounts: [
        {
          account_id: 'acc_egp_guest',
          uuid: '00000000-0000-0000-0000-000000000000',
          username: 'guest',
          countryCode: db.config.countryCode || 'EG',
          label: 'EG | جنيه مصري',
          labelEn: 'EG | EGP',
          currency: 'EGP',
          balanceUsdt: 0,
          frozenUsdt: 0,
          insuranceAmount: null,
          rate: db.config.usdRate,
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
    };
  }

  const acc = buildAccountForUser(user, db.config.usdRate);

  return {
    ...db,
    authenticated: true,
    activeUserId: user.id,
    users: undefined,
    onlinePresence: undefined,
    onlineCount: db.onlinePresence.length,
    config: {
      ...db.config,
      adminPassword: '',
    },
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

function projectAdminState(db: PlatformState): PlatformState {
  db.onlinePresence = prunePresence(db.onlinePresence);
  return {
    ...db,
    authenticated: true,
    onlineCount: db.onlinePresence.length,
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
    if (!parsed.config || !Array.isArray(parsed.users)) {
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

function getSessionUserId(req: express.Request): string | null {
  const token = req.header('x-user-id');
  return token && token.trim() ? token.trim() : null;
}

function requireAdmin(req: express.Request, db: PlatformState): boolean {
  const pass = req.header('x-admin-password') || '';
  return pass === (db.config.adminPassword || 'admin123');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  let db: PlatformState = loadDb();

  // Client state (strictly scoped by x-user-id; returns unauthenticated shell if none)
  app.get('/api/state', (req, res) => {
    db = loadDb();
    const uid = getSessionUserId(req);
    res.json(projectStateForUser(db, uid));
  });

  // Live online presence heartbeat
  app.post('/api/presence/ping', (req, res) => {
    const { visitorId, userId, route } = req.body as {
      visitorId: string;
      userId?: string | null;
      route?: string;
    };
    if (!visitorId) return res.status(400).json({ error: 'visitorId required' });

    db.onlinePresence = prunePresence(db.onlinePresence);
    const user = userId ? (db.users ?? []).find((u) => u.id === userId) : undefined;
    const now = new Date().toISOString();
    if (user) user.lastSeenAt = now;

    const existing = db.onlinePresence.find((p) => p.visitorId === visitorId);
    if (existing) {
      existing.userId = user?.id ?? null;
      existing.userName = user?.displayName ?? null;
      existing.email = user?.email ?? null;
      existing.route = route || '/';
      existing.lastPingAt = now;
    } else {
      db.onlinePresence.push({
        visitorId,
        userId: user?.id ?? null,
        userName: user?.displayName ?? null,
        email: user?.email ?? null,
        route: route || '/',
        lastPingAt: now,
      });
    }
    saveDb(db);
    res.json({ ok: true, onlineCount: db.onlinePresence.length });
  });

  // Strict Email + Password Login (admin-provisioned accounts only)
  app.post('/api/auth/login', (req, res) => {
    db = loadDb();
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    const user = (db.users ?? []).find(
      (u) =>
        u.email.trim().toLowerCase() === cleanEmail &&
        (u.password === password || u.password.trim() === cleanPass)
    );
    if (!user) {
      return res.status(401).json({
        ok: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }
    if (!user.active) {
      return res.status(403).json({
        ok: false,
        error: 'الحساب موقوف مؤقتاً من الإدارة',
      });
    }
    user.lastSeenAt = new Date().toISOString();
    saveDb(db);
    res.json({
      ok: true,
      userId: user.id,
      state: projectStateForUser(db, user.id),
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.json({ ok: true, state: projectStateForUser(db, null) });
  });

  // Toggle trade status for logged-in user
  app.post('/api/accounts/trade-status', (req, res) => {
    const uid = getSessionUserId(req);
    const { canTrade } = req.body as { canTrade: boolean };
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    user.canTrade = Boolean(canTrade);
    saveDb(db);
    res.json(projectStateForUser(db, user.id));
  });

  // Respond to Admin-issued Withdrawal Request from Messages (Confirm -> Deduct | Reject -> Do Not Deduct)
  app.post('/api/messages/:id/withdrawal-response', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });

    const msg = db.messages.find((m) => m.id === req.params.id && m.userId === user.id);
    if (!msg || !msg.withdrawalId) {
      return res.status(404).json({ ok: false, error: 'الرسالة غير موجودة' });
    }
    if (msg.withdrawalActionStatus !== 'pending_confirmation') {
      return res.status(400).json({ ok: false, error: 'تم الرد على الطلب ده بالفعل' });
    }

    const { action } = req.body as { action: 'confirm' | 'reject' };
    const wd = db.withdrawals.find((w) => w.id === msg.withdrawalId);
    const amount = Number(msg.withdrawalAmountEgp ?? wd?.amountLocal ?? msg.parsedAmount ?? 0);

    if (action === 'confirm') {
      if (user.balanceEgp < amount) {
        return res.status(400).json({
          ok: false,
          error: `الرصيد المتاح (${user.balanceEgp} ج.م) أقل من مبلغ السحب (${amount} ج.م)`,
        });
      }
      user.balanceEgp = Math.round((user.balanceEgp - amount) * 100) / 100;
      msg.withdrawalActionStatus = 'confirmed';
      msg.status = 'matched';
      if (wd) {
        wd.status = 'completed';
        wd.completedAt = new Date().toISOString();
      }
    } else {
      // Rejected: DO NOT deduct from user's balance
      msg.withdrawalActionStatus = 'rejected';
      msg.status = 'ignored';
      if (wd) {
        wd.status = 'cancelled';
      }
    }

    saveDb(db);
    res.json({ ok: true, state: projectStateForUser(db, user.id) });
  });

  // Simulate incoming deposit for active user
  app.post('/api/deposits/simulate', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const accId = `acc_${user.id}`;
    const userReqs = db.requisites.filter((r) => r.userId === user.id && r.active);
    const chosenReq = userReqs[0];
    const amountLocal = Math.round(500 + Math.random() * 4500);
    const rate = db.config.usdRate || 49.85;
    const baseUsdt = Math.round((amountLocal / rate) * 100) / 100;
    const incomeEgp = Math.round(amountLocal * (user.depositFeePct / 100) * 100) / 100;
    const orderNum = Math.floor(884200 + Math.random() * 9000);
    const newOrder: DepositOrder = {
      id: `dep_${Date.now()}`,
      userId: user.id,
      orderId: `EG-${orderNum}`,
      accountId: accId,
      amountLocal,
      amountUsdt: baseUsdt,
      incomeUsdt: incomeEgp,
      rate,
      requisiteId: chosenReq?.id || 'req_default',
      bankName: chosenReq?.bankName || 'فودافون كاش',
      ownerName: chosenReq?.ownerName || user.displayName,
      requisiteNumber: chosenReq?.accountNumber || '01000000000',
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: minsFromNow(15),
    };
    user.frozenEgp = Math.round((user.frozenEgp + amountLocal) * 100) / 100;
    db.deposits.unshift(newOrder);
    saveDb(db);
    res.json({ state: projectStateForUser(db, user.id), created: newOrder });
  });

  app.patch('/api/deposits/:id', (req, res) => {
    const uid = getSessionUserId(req);
    const dep = db.deposits.find((d) => d.id === req.params.id);
    if (!dep) return res.status(404).json({ error: 'Deposit not found' });
    const user = (db.users ?? []).find((u) => u.id === dep.userId);
    const { action, newAmountLocal, reason } = req.body as {
      action: 'confirm' | 'cancel' | 'dispute' | 'edit_amount';
      newAmountLocal?: number;
      reason?: string;
    };

    if (action === 'edit_amount' && typeof newAmountLocal === 'number' && newAmountLocal > 0) {
      dep.amountLocal = Math.round(newAmountLocal);
      dep.amountUsdt = Math.round((dep.amountLocal / dep.rate) * 100) / 100;
    } else if (action === 'confirm' && (dep.status === 'pending' || dep.status === 'disputed')) {
      dep.status = 'completed';
      dep.confirmedAt = new Date().toISOString();
      if (user) {
        user.frozenEgp = Math.max(0, Math.round((user.frozenEgp - dep.amountLocal) * 100) / 100);
        user.balanceEgp = Math.round((user.balanceEgp + dep.amountLocal + dep.incomeUsdt) * 100) / 100;
      }
    } else if (action === 'cancel' && dep.status === 'pending') {
      dep.status = 'cancelled';
      if (user) {
        user.frozenEgp = Math.max(0, Math.round((user.frozenEgp - dep.amountLocal) * 100) / 100);
      }
    } else if (action === 'dispute' && dep.status === 'pending') {
      dep.status = 'disputed';
      db.disputes.unshift({
        id: `dsp_${Date.now()}`,
        userId: dep.userId,
        depositId: dep.id,
        orderId: dep.orderId,
        accountId: dep.accountId,
        claimedAmountLocal: dep.amountLocal,
        originalAmountLocal: dep.amountLocal,
        amountUsdt: dep.amountUsdt,
        bankName: dep.bankName,
        requisiteNumber: dep.requisiteNumber,
        reason: reason || 'مراجعة مرجع التحويل البنكي.',
        status: 'open',
        createdAt: new Date().toISOString(),
        slaMinutesLeft: 45,
        receiptRef: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      });
    }

    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/disputes/:id', (req, res) => {
    const uid = getSessionUserId(req);
    const dispute = db.disputes.find((d) => d.id === req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });
    const { action, note } = req.body as { action: 'approve' | 'reject'; note?: string };
    const dep = db.deposits.find((d) => d.id === dispute.depositId);
    const user = (db.users ?? []).find((u) => u.id === dispute.userId);

    if (action === 'approve') {
      dispute.status = 'resolved_approve';
      dispute.resolutionNote = note || 'تم اعتماد الإيداع.';
      if (dep) {
        dep.status = 'completed';
        dep.confirmedAt = new Date().toISOString();
        if (user) {
          user.frozenEgp = Math.max(0, Math.round((user.frozenEgp - dep.amountLocal) * 100) / 100);
          user.balanceEgp = Math.round((user.balanceEgp + dep.amountLocal) * 100) / 100;
        }
      }
    } else {
      dispute.status = 'resolved_reject';
      dispute.resolutionNote = note || 'تم رفض النزاع.';
      if (dep) dep.status = 'cancelled';
    }
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/withdrawals/:id/claim', (req, res) => {
    const uid = getSessionUserId(req);
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Not found' });
    wd.status = 'accepted';
    wd.acceptedAt = new Date().toISOString();
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/withdrawals/:id', (req, res) => {
    const uid = getSessionUserId(req);
    const wd = db.withdrawals.find((w) => w.id === req.params.id);
    if (!wd) return res.status(404).json({ error: 'Not found' });
    const { action, files } = req.body as {
      action: 'complete' | 'release' | 'attach';
      files?: Array<{ name: string; size: string }>;
    };
    if (action === 'attach' && files?.length) {
      const now = new Date().toISOString();
      wd.receiptFiles = [...wd.receiptFiles, ...files.map((f) => ({ ...f, uploadedAt: now }))];
    } else if (action === 'complete') {
      wd.status = 'completed';
      wd.completedAt = new Date().toISOString();
    } else if (action === 'release') {
      wd.status = 'available';
    }
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/requisites', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const body = req.body as Partial<Requisite>;
    const item: Requisite = {
      id: `req_${Date.now()}`,
      userId: user.id,
      accountId: `acc_${user.id}`,
      bankName: body.bankName || 'فودافون كاش',
      ownerName: body.ownerName || user.displayName,
      accountNumber: body.accountNumber || '01000000000',
      type: body.type || 'wallet',
      minOrder: Number(body.minOrder) || 200,
      maxOrder: Number(body.maxOrder) || 30000,
      dailyLimit: Number(body.dailyLimit) || 150000,
      dailyUsed: 0,
      bidRate: Number(body.bidRate) || user.depositFeePct,
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.requisites.unshift(item);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/requisites/:id', (req, res) => {
    const uid = getSessionUserId(req);
    const item = db.requisites.find((r) => r.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    Object.assign(item, req.body);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.delete('/api/requisites/:id', (req, res) => {
    const uid = getSessionUserId(req);
    db.requisites = db.requisites.filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/automatic/android', (req, res) => {
    const uid = getSessionUserId(req);
    const { name, model, linkedRequisiteId } = req.body as {
      name: string;
      model: string;
      linkedRequisiteId?: string;
    };
    db.androidDevices.unshift({
      id: `dev_${Date.now()}`,
      userId: uid ?? undefined,
      name: name || 'موبايل أندرويد',
      model: model || 'Samsung Galaxy A54',
      osVersion: 'Android 14',
      appVersion: 'v2.8.4',
      pairingToken: `EG-AND-${Math.floor(1000 + Math.random() * 9000)}`,
      linkedRequisiteId,
      batteryPct: 100,
      online: true,
      lastPingAt: new Date().toISOString(),
      capturedCount: 0,
    });
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/automatic/android/:id', (req, res) => {
    const uid = getSessionUserId(req);
    const dev = db.androidDevices.find((d) => d.id === req.params.id);
    if (dev) Object.assign(dev, req.body);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.delete('/api/automatic/android/:id', (req, res) => {
    const uid = getSessionUserId(req);
    db.androidDevices = db.androidDevices.filter((d) => d.id !== req.params.id);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/automatic/telegram', (req, res) => {
    const uid = getSessionUserId(req);
    const { name, botUsername, chatId, events } = req.body as Partial<TelegramBotConfig>;
    db.telegramBots.unshift({
      id: `tg_${Date.now()}`,
      userId: uid ?? undefined,
      name: name || 'بوت التنبيهات',
      botUsername: botUsername || '@egyptpay_bot',
      chatId: chatId || '-1002248190441',
      events: events?.length ? events : ['new_deposit'],
      active: true,
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.delete('/api/automatic/telegram/:id', (req, res) => {
    const uid = getSessionUserId(req);
    db.telegramBots = db.telegramBots.filter((b) => b.id !== req.params.id);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/automatic/api-keys', (req, res) => {
    const uid = getSessionUserId(req);
    const { label, webhookUrl, permissions } = req.body as Partial<ApiKeyConfig>;
    const fullKey = `eg_live_${crypto.randomBytes(12).toString('hex')}`;
    db.apiKeys.unshift({
      id: `key_${Date.now()}`,
      userId: uid ?? undefined,
      label: label || 'API Key',
      keyPrefix: fullKey.slice(0, 12),
      fullKey,
      webhookUrl: webhookUrl || 'https://api.example.com/webhook',
      permissions: permissions?.length ? permissions : ['deposits:read'],
      active: true,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.delete('/api/automatic/api-keys/:id', (req, res) => {
    const uid = getSessionUserId(req);
    db.apiKeys = db.apiKeys.filter((k) => k.id !== req.params.id);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.post('/api/messages/simulate', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const amount = Math.floor(1000 + Math.random() * 5000);
    const msg: SmsMessage = {
      id: `msg_${Date.now()}`,
      userId: user.id,
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
    saveDb(db);
    res.json({ state: projectStateForUser(db, uid), message: msg });
  });

  app.post('/api/topups', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { amountUsdt, network } = req.body as { amountUsdt: number; network: TopUpRecord['network'] };
    const amount = Math.max(10, Number(amountUsdt) || 1000);
    const record: TopUpRecord = {
      id: `top_${Date.now()}`,
      userId: user.id,
      txHash: '0x' + crypto.randomBytes(20).toString('hex'),
      network: network || 'TRC-20',
      amountUsdt: amount,
      status: 'credited',
      createdAt: new Date().toISOString(),
    };
    user.balanceEgp = Math.round((user.balanceEgp + amount) * 100) / 100;
    db.topUps.unshift(record);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/profile', (req, res) => {
    const uid = getSessionUserId(req);
    const user = (db.users ?? []).find((u) => u.id === uid);
    if (user && typeof req.body.twoFactorEnabled === 'boolean') {
      user.twoFactorEnabled = req.body.twoFactorEnabled;
      saveDb(db);
    }
    res.json(projectStateForUser(db, uid));
  });

  app.patch('/api/settings', (req, res) => {
    const uid = getSessionUserId(req);
    Object.assign(db.settings, req.body);
    saveDb(db);
    res.json(projectStateForUser(db, uid));
  });

  // ---------------- ADMIN PANEL API ROUTES ----------------
  app.post('/api/admin/auth', (req, res) => {
    db = loadDb();
    const { password } = req.body as { password?: string };
    if (password === (db.config.adminPassword || 'admin123')) {
      return res.json({ ok: true, state: projectAdminState(db) });
    }
    res.status(401).json({ ok: false, error: 'كلمة مرور الأدمن مش صح' });
  });

  app.get('/api/admin/state', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ error: 'Unauthorized admin' });
    res.json(projectAdminState(db));
  });

  app.post('/api/admin/users', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const { email, password, displayName, username, balanceEgp, referralCode } = req.body as {
      email: string;
      password: string;
      displayName?: string;
      username?: string;
      balanceEgp?: number;
      referralCode?: string;
    };
    const cleanEmail = (email || '').trim();
    if (!cleanEmail || !password) {
      return res.status(400).json({ ok: false, error: 'البريد وكلمة المرور مطلوبين' });
    }
    if ((db.users ?? []).some((u) => u.email.toLowerCase() === cleanEmail.toLowerCase())) {
      return res.status(400).json({ ok: false, error: 'البريد الإلكتروني مسجل من قبل' });
    }

    const prefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'agent';
    const existingPids = new Set((db.users ?? []).map((u) => u.playerId).filter(Boolean));
    let playerId = `PL-${crypto.randomInt(10000000, 99999999)}`;
    while (existingPids.has(playerId)) {
      playerId = `PL-${crypto.randomInt(10000000, 99999999)}`;
    }
    const newUser: ManagedUser = {
      id: `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
      playerId,
      uuid: crypto.randomUUID(),
      username: (username || `${prefix}_egp`).trim(),
      displayName: (displayName || prefix).trim(),
      email: cleanEmail,
      emailLower: cleanEmail,
      password: password.trim(),
      telegramHandle: `@${prefix}`,
      balanceEgp: Number(balanceEgp) || 0,
      frozenEgp: 0,
      insuranceEgp: null,
      canTrade: true,
      active: true,
      depositFeePct: 3.0,
      withdrawalFeePct: 1.8,
      referralCode: referralCode || `EG-${playerId.replace('PL-', '')}`,
      referralRatePct: 0.5,
      twoFactorEnabled: true,
      trc20Address: 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
      createdAt: new Date().toISOString(),
    };
    db.users = [...(db.users ?? []), newUser];
    saveDb(db);
    res.json({ ok: true, user: newUser, state: projectAdminState(db) });
  });

  app.patch('/api/admin/users/:id', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const user = (db.users ?? []).find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' });
    Object.assign(user, req.body);
    saveDb(db);
    res.json({ ok: true, state: projectAdminState(db) });
  });

  app.delete('/api/admin/users/:id', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ error: 'Unauthorized' });
    db.users = (db.users ?? []).filter((u) => u.id !== req.params.id);
    saveDb(db);
    res.json(projectAdminState(db));
  });

  app.post('/api/admin/withdrawals/send', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const { userId, amountEgp, destinationMethod, requisiteNumber, recipientName, note } = req.body as {
      userId: string;
      amountEgp: number;
      destinationMethod: string;
      requisiteNumber: string;
      recipientName: string;
      note?: string;
    };
    const user = (db.users ?? []).find((u) => u.id === userId);
    if (!user) return res.status(404).json({ ok: false, error: 'اختر مستخدم صحيح أولاً' });

    const amount = Math.max(1, Number(amountEgp) || 0);
    const rate = db.config.usdRate || 49.85;
    const wdId = `wd_${Date.now()}`;
    const orderId = `WD-${Math.floor(400000 + Math.random() * 599999)}`;
    const nowIso = new Date().toISOString();

    const wd: WithdrawalOrder = {
      id: wdId,
      userId: user.id,
      orderId,
      accountId: `acc_${user.id}`,
      amountLocal: amount,
      amountUsdt: Math.round((amount / rate) * 100) / 100,
      incomeUsdt: 0,
      rate,
      destinationMethod: destinationMethod || 'فودافون كاش',
      requisiteNumber: requisiteNumber || '01000000000',
      recipientName: recipientName || user.displayName,
      status: 'awaiting_confirmation',
      createdAt: nowIso,
      expiresAt: minsFromNow(30),
      adminCreated: true,
      receiptFiles: [],
    };
    db.withdrawals.unshift(wd);

    const msg: SmsMessage = {
      id: `msg_${Date.now()}_${Math.floor(10 + Math.random() * 89)}`,
      userId: user.id,
      deviceId: 'admin_desk',
      deviceName: 'إدارة المنصة',
      sender: 'طلب سحب من الإدارة',
      body:
        note?.trim() ||
        `عندك طلب سحب بمبلغ ${amount.toLocaleString('en-US')} ج.م إلى ${wd.destinationMethod} (${wd.requisiteNumber}). أكّد عشان يتخصم من رصيدك أو ارفض لو مش موافق.`,
      parsedAmount: amount,
      currency: 'EGP',
      matchedDepositId: null,
      matchedOrderId: orderId,
      withdrawalId: wdId,
      withdrawalAmountEgp: amount,
      withdrawalDestination: `${wd.destinationMethod} · ${wd.requisiteNumber}`,
      withdrawalRecipient: wd.recipientName,
      withdrawalActionStatus: 'pending_confirmation',
      status: 'unmatched',
      receivedAt: nowIso,
    };
    db.messages.unshift(msg);
    saveDb(db);
    res.json({ ok: true, state: projectAdminState(db) });
  });

  app.post('/api/admin/messages/send', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ error: 'Unauthorized' });
    const { userId, sender, body } = req.body as { userId: string; sender: string; body: string };
    db.messages.unshift({
      id: `msg_${Date.now()}`,
      userId,
      deviceId: 'admin_desk',
      deviceName: 'لوحة الإدارة',
      sender: sender || 'إدارة المنصة',
      body,
      parsedAmount: null,
      currency: 'EGP',
      matchedDepositId: null,
      matchedOrderId: null,
      status: 'unmatched',
      receivedAt: new Date().toISOString(),
    });
    saveDb(db);
    res.json(projectAdminState(db));
  });

  app.post('/api/admin/deposits', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ error: 'Unauthorized' });
    const {
      userId,
      identifier,
      amountEgp,
      bankName,
      note,
      autoCredit = true,
    } = req.body as {
      userId?: string;
      identifier?: string;
      amountEgp: number;
      bankName?: string;
      note?: string;
      autoCredit?: boolean;
    };
    const qVal = (identifier || '').trim().toLowerCase();
    const qNoAt = qVal.replace(/^@/, '');
    const user = (db.users ?? []).find(
      (u) =>
        (userId && u.id === userId) ||
        (qVal &&
          (u.email.trim().toLowerCase() === qVal ||
            u.username.trim().toLowerCase().replace(/^@/, '') === qNoAt ||
            (u.playerId || '').trim().toLowerCase() === qVal))
    );
    if (!user) return res.status(404).json({ error: 'لم يتم العثور على العميل بالبريد أو اليوزرنيم' });
    const amount = Math.max(1, Number(amountEgp) || 0);
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
      bankName: bankName?.trim() || 'إيداع فوري من الإدارة',
      ownerName: user.displayName,
      requisiteNumber: user.username,
      status: autoCredit ? 'completed' : 'pending',
      createdAt: nowIso,
      expiresAt: minsFromNow(15),
      ...(autoCredit ? { confirmedAt: nowIso } : {}),
      ...(note?.trim() ? { customerNote: note.trim() } : {}),
    });
    if (autoCredit) {
      db.messages.unshift({
        id: `msg_${Date.now()}`,
        userId: user.id,
        deviceId: 'admin_desk',
        deviceName: 'إدارة المنصة',
        sender: 'إيداع رصيد فوري',
        body:
          note?.trim() ||
          `تم إيداع مبلغ ${amount.toLocaleString('en-US')} ج.م ونزوله في حسابك (${user.username}) بنجاح. رصيدك الحالي: ${user.balanceEgp.toLocaleString('en-US')} ج.م.`,
        parsedAmount: amount,
        currency: 'EGP',
        matchedDepositId: depId,
        matchedOrderId: orderId,
        status: 'matched',
        receivedAt: nowIso,
      });
    }
    saveDb(db);
    res.json({ ok: true, user, state: projectAdminState(db) });
  });

  app.patch('/api/admin/config', (req, res) => {
    db = loadDb();
    if (!requireAdmin(req, db)) return res.status(401).json({ error: 'Unauthorized' });
    const { platformName, usdRate, adminPassword } = req.body as {
      platformName?: string;
      usdRate?: number;
      adminPassword?: string;
    };
    if (platformName) db.config.platformName = platformName;
    if (usdRate && Number(usdRate) > 0) db.config.usdRate = Number(usdRate);
    if (adminPassword) db.config.adminPassword = adminPassword;
    saveDb(db);
    res.json(projectAdminState(db));
  });

  app.get('/api/admin/download-php', (_req, res) => {
    const phpPath = path.join(__dirname, 'admin.php');
    if (fs.existsSync(phpPath)) {
      res.download(phpPath, 'admin.php');
    } else {
      res.status(404).send('admin.php not found');
    }
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
    console.log(`EgyptPay Trader server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
