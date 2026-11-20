<?php
/**
 * EgyptPay / HostaPay — Full-Control Admin Panel (PHP 8+)
 * Works directly with data/hpay-db.json on Apache / Nginx / cPanel PHP servers.
 */
declare(strict_types=1);
session_start();

$dbPath = __DIR__ . '/data/hpay-db.json';
if (!is_dir(__DIR__ . '/data')) {
    @mkdir(__DIR__ . '/data', 0775, true);
}

function loadDb(string $path): array {
    if (!file_exists($path)) {
        $seed = [
            'config' => [
                'platformName' => 'egyptpay.trade',
                'countryCode' => 'EG',
                'currencyCode' => 'EGP',
                'usdRate' => 49.85,
                'adminPassword' => 'admin123',
            ],
            'users' => [],
            'onlinePresence' => [],
            'withdrawals' => [],
            'deposits' => [],
            'messages' => [],
        ];
        file_put_contents($path, json_encode($seed, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        return $seed;
    }
    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '{}', true);
    return is_array($decoded) ? $decoded : [];
}

function saveDb(string $path, array $data): void {
    file_put_contents(
        $path,
        json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
        LOCK_EX
    );
}

function e(string $val): string {
    return htmlspecialchars($val, ENT_QUOTES, 'UTF-8');
}

function uuidV4(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

$db = loadDb($dbPath);
$adminPassword = $db['config']['adminPassword'] ?? 'admin123';
$flash = '';
$error = '';

// Handle Logout
if (isset($_GET['logout'])) {
    unset($_SESSION['hpay_admin_ok']);
    header('Location: admin.php');
    exit;
}

// Handle Admin Login
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'admin_login') {
    $pass = (string)($_POST['password'] ?? '');
    if (hash_equals((string)$adminPassword, $pass)) {
        $_SESSION['hpay_admin_ok'] = true;
        header('Location: admin.php');
        exit;
    } else {
        $error = 'كلمة مرور الأدمن غير صحيحة';
    }
}

$isAuthed = !empty($_SESSION['hpay_admin_ok']);

// Handle Authenticated Admin Actions
if ($isAuthed && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = (string)($_POST['action'] ?? '');

    if ($act === 'create_user') {
        $email = trim((string)($_POST['email'] ?? ''));
        $password = (string)($_POST['password'] ?? '');
        $displayName = trim((string)($_POST['displayName'] ?? ''));
        $username = trim((string)($_POST['username'] ?? ''));
        $balanceEgp = (float)($_POST['balanceEgp'] ?? 0);

        if ($email === '' || $password === '') {
            $error = 'البريد الإلكتروني وكلمة المرور مطلوبين';
        } else {
            $exists = false;
            foreach (($db['users'] ?? []) as $u) {
                if (strtolower($u['email']) === strtolower($email)) {
                    $exists = true;
                    break;
                }
            }
            if ($exists) {
                $error = 'البريد الإلكتروني مسجل بالفعل';
            } else {
                $newId = 'usr_' . time() . '_' . random_int(100, 999);
                $prefix = preg_replace('/[^a-zA-Z0-9_]/', '', explode('@', $email)[0]) ?: 'agent';
                $db['users'][] = [
                    'id' => $newId,
                    'uuid' => uuidV4(),
                    'username' => $username !== '' ? $username : ($prefix . '_egp'),
                    'displayName' => $displayName !== '' ? $displayName : $prefix,
                    'email' => $email,
                    'password' => $password,
                    'telegramHandle' => '@' . $prefix,
                    'balanceEgp' => $balanceEgp,
                    'frozenEgp' => 0,
                    'insuranceEgp' => null,
                    'canTrade' => true,
                    'active' => true,
                    'depositFeePct' => 3.0,
                    'withdrawalFeePct' => 1.8,
                    'referralCode' => 'EG-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)),
                    'referralRatePct' => 0.5,
                    'twoFactorEnabled' => true,
                    'trc20Address' => 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
                    'createdAt' => gmdate('c'),
                ];
                saveDb($dbPath, $db);
                $flash = 'تم إنشاء حساب المستخدم بنجاح: ' . $email;
            }
        }
    } elseif ($act === 'update_user') {
        $uid = (string)($_POST['userId'] ?? '');
        foreach ($db['users'] as &$u) {
            if ($u['id'] === $uid) {
                $u['displayName'] = trim((string)($_POST['displayName'] ?? $u['displayName']));
                $u['email'] = trim((string)($_POST['email'] ?? $u['email']));
                if (trim((string)($_POST['password'] ?? '')) !== '') {
                    $u['password'] = (string)$_POST['password'];
                }
                $u['balanceEgp'] = (float)($_POST['balanceEgp'] ?? $u['balanceEgp']);
                $u['active'] = isset($_POST['active']);
                $u['canTrade'] = isset($_POST['canTrade']);
                break;
            }
        }
        unset($u);
        saveDb($dbPath, $db);
        $flash = 'تم تحديث بيانات المستخدم والرصيد';
    } elseif ($act === 'delete_user') {
        $uid = (string)($_POST['userId'] ?? '');
        $db['users'] = array_values(array_filter($db['users'] ?? [], fn($u) => $u['id'] !== $uid));
        saveDb($dbPath, $db);
        $flash = 'تم حذف الحساب';
    } elseif ($act === 'send_withdrawal') {
        $uid = (string)($_POST['userId'] ?? '');
        $amountEgp = max(1, (float)($_POST['amountEgp'] ?? 0));
        $method = trim((string)($_POST['destinationMethod'] ?? 'فودافون كاش'));
        $number = trim((string)($_POST['requisiteNumber'] ?? '01000000000'));
        $recipient = trim((string)($_POST['recipientName'] ?? 'عميل سحب'));
        $note = trim((string)($_POST['note'] ?? ''));

        $rate = (float)($db['config']['usdRate'] ?? 49.85);
        $wdId = 'wd_' . time() . '_' . random_int(100, 999);
        $orderCode = 'WD-' . random_int(400000, 999999);
        $nowIso = gmdate('c');

        array_unshift($db['withdrawals'], [
            'id' => $wdId,
            'userId' => $uid,
            'orderId' => $orderCode,
            'accountId' => 'acc_' . $uid,
            'amountLocal' => $amountEgp,
            'amountUsdt' => round($amountEgp / max($rate, 1), 2),
            'incomeUsdt' => 0,
            'rate' => $rate,
            'destinationMethod' => $method,
            'requisiteNumber' => $number,
            'recipientName' => $recipient,
            'status' => 'awaiting_confirmation',
            'createdAt' => $nowIso,
            'expiresAt' => gmdate('c', time() + 1800),
            'adminCreated' => true,
            'receiptFiles' => [],
        ]);

        $msgBody = $note !== ''
            ? $note
            : "طلب سحب جديد بقيمة " . number_format($amountEgp, 2) . " ج.م إلى ($method - $number). برجاء التأكيد لخصم المبلغ أو الرفض.";

        array_unshift($db['messages'], [
            'id' => 'msg_' . time() . '_' . random_int(100, 999),
            'userId' => $uid,
            'deviceId' => 'admin_desk',
            'deviceName' => 'لوحة الإدارة',
            'sender' => 'طلب سحب من الإدارة',
            'body' => $msgBody,
            'parsedAmount' => $amountEgp,
            'currency' => 'EGP',
            'matchedDepositId' => null,
            'matchedOrderId' => $orderCode,
            'withdrawalId' => $wdId,
            'withdrawalAmountEgp' => $amountEgp,
            'withdrawalDestination' => $method . ' · ' . $number,
            'withdrawalRecipient' => $recipient,
            'withdrawalActionStatus' => 'pending_confirmation',
            'status' => 'unmatched',
            'receivedAt' => $nowIso,
        ]);

        saveDb($dbPath, $db);
        $flash = "تم إرسال طلب السحب $orderCode إلى رسايل المستخدم";
    } elseif ($act === 'update_config') {
        $db['config']['platformName'] = trim((string)($_POST['platformName'] ?? $db['config']['platformName']));
        $db['config']['usdRate'] = (float)($_POST['usdRate'] ?? $db['config']['usdRate']);
        if (trim((string)($_POST['adminPassword'] ?? '')) !== '') {
            $db['config']['adminPassword'] = trim((string)$_POST['adminPassword']);
        }
        saveDb($dbPath, $db);
        $flash = 'تم حفظ إعدادات المنصة';
    }
}

$nowTs = time();
$onlineUsers = array_values(array_filter($db['onlinePresence'] ?? [], function ($p) use ($nowTs) {
    $ts = strtotime((string)($p['lastPingAt'] ?? ''));
    return $ts !== false && ($nowTs - $ts) <= 35;
}));
$totalBalance = array_reduce($db['users'] ?? [], fn($c, $u) => $c + (float)($u['balanceEgp'] ?? 0), 0.0);
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>لوحة تحكم الأدمن — <?= e((string)($db['config']['platformName'] ?? 'egyptpay.trade')) ?></title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; background: #141414; color: #fff; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .card { background: #181818; border: 1px solid #262626; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
    .header { display: flex; justify-content: space-between; align-items: center; padding: 14px 22px; background: #151515; border-bottom: 1px solid #222; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 18px; }
    input, select, textarea { width: 100%; background: #111; border: 1px solid #303030; color: #fff; border-radius: 9px; padding: 9px 12px; font-size: 13px; margin-top: 5px; }
    label { font-size: 12px; color: #aaa; display: block; margin-top: 10px; }
    .btn { border: 0; border-radius: 9px; padding: 9px 16px; font-weight: 700; cursor: pointer; font-size: 13px; }
    .btn-orange { background: #e25d0a; color: #fff; }
    .btn-green { background: #00e344; color: #000; }
    .btn-red { background: rgba(227,34,0,.15); color: #ff6b57; border: 1px solid rgba(227,34,0,.4); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: right; padding: 10px 12px; border-bottom: 1px solid #232323; }
    th { background: #202021; color: #aaa; font-size: 12px; }
    .badge-live { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(0,227,68,.1); color: #00e344; border: 1px solid rgba(0,227,68,.3); font-weight: 700; font-size: 13px; }
    .alert { padding: 11px 14px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; }
    .alert-ok { background: rgba(0,227,68,.12); border: 1px solid rgba(0,227,68,.35); color: #00e344; }
    .alert-err { background: rgba(227,34,0,.12); border: 1px solid rgba(227,34,0,.35); color: #ff6b57; }
  </style>
</head>
<body>
<?php if (!$isAuthed): ?>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;">
    <form method="post" class="card" style="width:100%;max-width:400px;">
      <h2 style="margin-top:0;">لوحة تحكم الأدمن (admin.php)</h2>
      <?php if ($error): ?><div class="alert alert-err"><?= e($error) ?></div><?php endif; ?>
      <input type="hidden" name="action" value="admin_login" />
      <label>كلمة مرور الأدمن</label>
      <input type="password" name="password" required placeholder="••••••••" />
      <button type="submit" class="btn btn-orange" style="width:100%;margin-top:14px;">دخول الإدارة</button>
    </form>
  </div>
<?php else: ?>
  <div class="header">
    <div style="font-weight:800;font-size:17px;">
      🇪🇬 <?= e((string)($db['config']['platformName'] ?? 'egyptpay.trade')) ?> · <span style="color:#e25d0a;">admin.php</span>
    </div>
    <div style="display:flex;gap:10px;align-items:center;">
      <span class="badge-live">● أونلاين دلوقتي: <?= count($onlineUsers) ?></span>
      <a href="?logout=1" class="btn btn-red" style="text-decoration:none;">خروج</a>
    </div>
  </div>

  <div class="container">
    <?php if ($flash): ?><div class="alert alert-ok"><?= e($flash) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="alert alert-err"><?= e($error) ?></div><?php endif; ?>

    <div class="grid">
      <div class="card">
        <div style="color:#8a8a8a;font-size:12px;">المستخدمين أونلاين حاليًا</div>
        <div style="font-size:26px;font-weight:800;color:#00e344;margin-top:6px;"><?= count($onlineUsers) ?></div>
      </div>
      <div class="card">
        <div style="color:#8a8a8a;font-size:12px;">إجمالي الحسابات</div>
        <div style="font-size:26px;font-weight:800;margin-top:6px;"><?= count($db['users'] ?? []) ?></div>
      </div>
      <div class="card">
        <div style="color:#8a8a8a;font-size:12px;">إجمالي الأرصدة (جنيه مصري)</div>
        <div style="font-size:24px;font-weight:800;color:#db9d37;margin-top:6px;"><?= number_format($totalBalance, 2) ?> ج.م</div>
      </div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;">
      <form method="post" class="card">
        <h3 style="margin-top:0;">إنشاء حساب مستخدم جديد</h3>
        <input type="hidden" name="action" value="create_user" />
        <label>البريد الإلكتروني</label>
        <input type="email" name="email" required placeholder="agent@domain.com" />
        <label>كلمة المرور</label>
        <input type="text" name="password" required placeholder="كلمة المرور" />
        <label>الاسم</label>
        <input type="text" name="displayName" placeholder="الاسم الكامل" />
        <label>اليوزرنيم</label>
        <input type="text" name="username" placeholder="mohamed_egp" />
        <label>الرصيد الابتدائي (ج.م)</label>
        <input type="number" step="0.01" name="balanceEgp" value="10000" />
        <button type="submit" class="btn btn-orange" style="margin-top:14px;width:100%;">إنشاء الحساب</button>
      </form>

      <form method="post" class="card">
        <h3 style="margin-top:0;">إرسال طلب سحب لمستخدم (يظهر في الرسايل)</h3>
        <input type="hidden" name="action" value="send_withdrawal" />
        <label>اختر المستخدم</label>
        <select name="userId" required>
          <?php foreach (($db['users'] ?? []) as $u): ?>
            <option value="<?= e((string)$u['id']) ?>">
              <?= e((string)$u['displayName']) ?> (<?= e((string)$u['email']) ?>) — <?= number_format((float)$u['balanceEgp'], 2) ?> ج.م
            </option>
          <?php endforeach; ?>
        </select>
        <label>المبلغ (جنيه مصري)</label>
        <input type="number" step="0.01" name="amountEgp" value="1500" required />
        <label>طريقة التحويل</label>
        <input type="text" name="destinationMethod" value="فودافون كاش" required />
        <label>رقم المحفظة / الحساب</label>
        <input type="text" name="requisiteNumber" value="01000000000" required />
        <label>اسم المستلم</label>
        <input type="text" name="recipientName" value="عميل سحب" />
        <label>نص الرسالة</label>
        <textarea name="note" rows="2" placeholder="برجاء تأكيد طلب السحب لخصم المبلغ أو رفضه"></textarea>
        <button type="submit" class="btn btn-green" style="margin-top:14px;width:100%;">إرسال طلب السحب للمستخدم</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">الحسابات والأرصدة</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>كلمة المرور</th>
              <th>الرصيد (ج.م)</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach (($db['users'] ?? []) as $u): ?>
              <tr>
                <td><?= e((string)$u['displayName']) ?></td>
                <td><?= e((string)$u['email']) ?></td>
                <td><?= e((string)$u['password']) ?></td>
                <td style="color:#00e344;font-weight:700;"><?= number_format((float)$u['balanceEgp'], 2) ?> ج.م</td>
                <td>
                  <form method="post" style="display:inline;">
                    <input type="hidden" name="action" value="delete_user" />
                    <input type="hidden" name="userId" value="<?= e((string)$u['id']) ?>" />
                    <button type="submit" class="btn btn-red">حذف</button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

    <form method="post" class="card">
      <h3 style="margin-top:0;">إعدادات المنصة</h3>
      <input type="hidden" name="action" value="update_config" />
      <label>اسم المنصة</label>
      <input type="text" name="platformName" value="<?= e((string)($db['config']['platformName'] ?? 'egyptpay.trade')) ?>" />
      <label>سعر الدولار مقابل الجنيه المصري</label>
      <input type="number" step="0.01" name="usdRate" value="<?= e((string)($db['config']['usdRate'] ?? 49.85)) ?>" />
      <label>كلمة مرور الأدمن الجديدة (اختياري)</label>
      <input type="text" name="adminPassword" placeholder="اتركه فارغاً للإبقاء على الحالية" />
      <button type="submit" class="btn btn-orange" style="margin-top:14px;">حفظ الإعدادات</button>
    </form>
  </div>
<?php endif; ?>
</body>
</html>
