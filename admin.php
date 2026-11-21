<?php
/**
 * Nexus Agency — Full-Control Admin Panel (PHP 8+)
 * Connected directly to Firebase Firestore (project: moorrcv) + local JSON backup (data/hpay-db.json).
 */
declare(strict_types=1);
session_start();

const FIREBASE_PROJECT_ID = 'moorrcv';
const FIREBASE_API_KEY = 'AIzaSyBvG-eGAih3HUmcnFQsIDZZWUEs4eeFVKA';
const FIXED_PLATFORM_NAME = 'Nexus Agency';

$dbPath = __DIR__ . '/data/hpay-db.json';
if (!is_dir(__DIR__ . '/data')) {
    @mkdir(__DIR__ . '/data', 0775, true);
}

function loadDb(string $path): array {
    $seed = [
        'config' => [
            'platformName' => FIXED_PLATFORM_NAME,
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
    if (!file_exists($path)) {
        file_put_contents($path, json_encode($seed, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        return $seed;
    }
    $raw = file_get_contents($path);
    $decoded = json_decode($raw ?: '{}', true);
    if (!is_array($decoded)) {
        return $seed;
    }
    $decoded['config'] = array_merge($seed['config'], is_array($decoded['config'] ?? null) ? $decoded['config'] : []);
    $decoded['config']['platformName'] = FIXED_PLATFORM_NAME;
    foreach (['users', 'onlinePresence', 'withdrawals', 'deposits', 'messages'] as $key) {
        if (!isset($decoded[$key]) || !is_array($decoded[$key])) {
            $decoded[$key] = [];
        }
    }
    return $decoded;
}

function saveDb(string $path, array $data): void {
    if (isset($data['config']) && is_array($data['config'])) {
        $data['config']['platformName'] = FIXED_PLATFORM_NAME;
    }
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

function isAssocArray(array $arr): bool {
    if ($arr === []) {
        return false;
    }
    return array_keys($arr) !== range(0, count($arr) - 1);
}

function fsBaseUrl(): string {
    return 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/(default)/documents';
}

function fsRequest(string $method, string $url, ?array $body = null): array {
    $status = 0;
    $raw = '';
    $transportErr = '';
    $payload = $body !== null ? json_encode($body, JSON_UNESCAPED_UNICODE) : null;

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, strtoupper($method));
        curl_setopt($ch, CURLOPT_TIMEOUT, 6);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
        $headers = ['Accept: application/json'];
        if ($payload !== null) {
            $headers[] = 'Content-Type: application/json';
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        $resp = curl_exec($ch);
        if ($resp === false) {
            $transportErr = curl_error($ch);
        } else {
            $raw = (string)$resp;
        }
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
    } else {
        $headers = "Accept: application/json\r\n";
        $opts = [
            'http' => [
                'method' => strtoupper($method),
                'ignore_errors' => true,
                'timeout' => 6,
            ],
        ];
        if ($payload !== null) {
            $headers .= "Content-Type: application/json\r\n";
            $opts['http']['content'] = $payload;
        }
        $opts['http']['header'] = $headers;
        $ctx = stream_context_create($opts);
        $resp = @file_get_contents($url, false, $ctx);
        $raw = $resp === false ? '' : (string)$resp;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $line, $m)) {
                    $status = (int)$m[1];
                    break;
                }
            }
        }
        if ($status === 0 && $resp === false) {
            $transportErr = 'Network unreachable';
        }
    }

    $decoded = $raw !== '' ? json_decode($raw, true) : null;
    $errMsg = '';
    if (is_array($decoded) && isset($decoded['error']['message'])) {
        $errMsg = (string)$decoded['error']['message'];
    } elseif ($transportErr !== '') {
        $errMsg = $transportErr;
    }

    $lower = strtolower($raw . ' ' . $errMsg);
    $apiDisabled = str_contains($lower, 'firestore.googleapis.com')
        || str_contains($lower, 'service_disabled')
        || str_contains($lower, 'access_denied')
        || str_contains($lower, 'has not been used');
    $rulesDenied = !$apiDisabled && ($status === 403 || str_contains($lower, 'permission'));

    return [
        'ok' => $status >= 200 && $status < 300,
        'status' => $status,
        'data' => is_array($decoded) ? $decoded : null,
        'error' => $errMsg !== '' ? $errMsg : ($status >= 400 ? "HTTP $status" : null),
        'apiDisabled' => $apiDisabled,
        'rulesDenied' => $rulesDenied,
    ];
}

function fsEncodeValue(mixed $val): array {
    if ($val === null) {
        return ['nullValue' => null];
    }
    if (is_bool($val)) {
        return ['booleanValue' => $val];
    }
    if (is_int($val)) {
        return ['integerValue' => (string)$val];
    }
    if (is_float($val)) {
        return ['doubleValue' => $val];
    }
    if (is_array($val)) {
        if ($val === [] || !isAssocArray($val)) {
            $values = [];
            foreach ($val as $item) {
                $values[] = fsEncodeValue($item);
            }
            return ['arrayValue' => ['values' => $values]];
        }
        $fields = [];
        foreach ($val as $k => $v) {
            $fields[(string)$k] = fsEncodeValue($v);
        }
        return ['mapValue' => ['fields' => $fields]];
    }
    return ['stringValue' => (string)$val];
}

function fsEncodeFields(array $assoc): array {
    $fields = [];
    foreach ($assoc as $k => $v) {
        $fields[(string)$k] = fsEncodeValue($v);
    }
    return ['fields' => $fields];
}

function fsDecodeValue(array $v): mixed {
    if (array_key_exists('nullValue', $v)) {
        return null;
    }
    if (array_key_exists('booleanValue', $v)) {
        return (bool)$v['booleanValue'];
    }
    if (array_key_exists('integerValue', $v)) {
        return (int)$v['integerValue'];
    }
    if (array_key_exists('doubleValue', $v)) {
        return (float)$v['doubleValue'];
    }
    if (array_key_exists('stringValue', $v)) {
        return (string)$v['stringValue'];
    }
    if (array_key_exists('timestampValue', $v)) {
        return (string)$v['timestampValue'];
    }
    if (array_key_exists('arrayValue', $v)) {
        $out = [];
        foreach (($v['arrayValue']['values'] ?? []) as $item) {
            if (is_array($item)) {
                $out[] = fsDecodeValue($item);
            }
        }
        return $out;
    }
    if (array_key_exists('mapValue', $v)) {
        $out = [];
        foreach (($v['mapValue']['fields'] ?? []) as $k => $sub) {
            if (is_array($sub)) {
                $out[(string)$k] = fsDecodeValue($sub);
            }
        }
        return $out;
    }
    return null;
}

function fsDecodeDocument(array $doc): array {
    $name = (string)($doc['name'] ?? '');
    $parts = explode('/', $name);
    $docId = end($parts) ?: '';
    $out = $docId !== '' ? ['id' => $docId] : [];
    foreach (($doc['fields'] ?? []) as $k => $val) {
        if (is_array($val)) {
            $out[(string)$k] = fsDecodeValue($val);
        }
    }
    return $out;
}

function fsGetDoc(string $collection, string $docId): array {
    $url = fsBaseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId) . '?key=' . urlencode(FIREBASE_API_KEY);
    $res = fsRequest('GET', $url);
    if ($res['ok'] && is_array($res['data'])) {
        $res['doc'] = fsDecodeDocument($res['data']);
    }
    return $res;
}

function fsSetDoc(string $collection, string $docId, array $fields): array {
    $url = fsBaseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId) . '?key=' . urlencode(FIREBASE_API_KEY);
    return fsRequest('PATCH', $url, fsEncodeFields($fields));
}

function fsDeleteDoc(string $collection, string $docId): array {
    $url = fsBaseUrl() . '/' . rawurlencode($collection) . '/' . rawurlencode($docId) . '?key=' . urlencode(FIREBASE_API_KEY);
    return fsRequest('DELETE', $url);
}

function fsListCollection(string $collection): array {
    $url = fsBaseUrl() . '/' . rawurlencode($collection) . '?pageSize=300&key=' . urlencode(FIREBASE_API_KEY);
    $res = fsRequest('GET', $url);
    $items = [];
    if ($res['ok'] && is_array($res['data'])) {
        foreach (($res['data']['documents'] ?? []) as $doc) {
            if (is_array($doc)) {
                $items[] = fsDecodeDocument($doc);
            }
        }
    }
    $res['items'] = $items;
    return $res;
}

function normalizeUserRecord(array $u): array {
    $email = trim((string)($u['email'] ?? ''));
    $u['email'] = $email;
    $u['emailLower'] = strtolower($email);
    $u['password'] = trim((string)($u['password'] ?? ''));
    $u['balanceEgp'] = (float)($u['balanceEgp'] ?? 0);
    $u['active'] = isset($u['active']) ? (bool)$u['active'] : true;
    $u['canTrade'] = isset($u['canTrade']) ? (bool)$u['canTrade'] : true;
    return $u;
}

function mergeById(array $local, array $remote): array {
    $byId = [];
    foreach ($local as $item) {
        if (is_array($item) && !empty($item['id'])) {
            $byId[(string)$item['id']] = $item;
        }
    }
    foreach ($remote as $item) {
        if (is_array($item) && !empty($item['id'])) {
            $id = (string)$item['id'];
            $byId[$id] = isset($byId[$id]) ? array_merge($byId[$id], $item) : $item;
        }
    }
    return array_values($byId);
}

$db = loadDb($dbPath);

// Probe Firebase moorrcv config
$fsState = [
    'connected' => false,
    'apiDisabled' => false,
    'rulesDenied' => false,
    'error' => '',
];
$cfgProbe = fsGetDoc('hpay_platform', 'config');
if ($cfgProbe['ok'] && !empty($cfgProbe['doc'])) {
    $fsState['connected'] = true;
    $remoteCfg = $cfgProbe['doc'];
    unset($remoteCfg['id']);
    $db['config'] = array_merge($db['config'], $remoteCfg);
    $db['config']['platformName'] = FIXED_PLATFORM_NAME;
} elseif ($cfgProbe['status'] === 404) {
    // Database exists, seed config document
    $seedWrite = fsSetDoc('hpay_platform', 'config', $db['config']);
    $fsState['connected'] = $seedWrite['ok'];
    $fsState['apiDisabled'] = $seedWrite['apiDisabled'];
    $fsState['rulesDenied'] = $seedWrite['rulesDenied'];
    $fsState['error'] = (string)($seedWrite['error'] ?? '');
} else {
    $fsState['apiDisabled'] = $cfgProbe['apiDisabled'];
    $fsState['rulesDenied'] = $cfgProbe['rulesDenied'];
    $fsState['error'] = (string)($cfgProbe['error'] ?? '');
}

$adminPassword = (string)($db['config']['adminPassword'] ?? 'admin123');
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
    $pass = trim((string)($_POST['password'] ?? ''));
    if (hash_equals(trim((string)$adminPassword), $pass)) {
        $_SESSION['hpay_admin_ok'] = true;
        header('Location: admin.php');
        exit;
    } else {
        $error = 'كلمة مرور الأدمن غير صحيحة';
    }
}

$isAuthed = !empty($_SESSION['hpay_admin_ok']);

// If authenticated & Firebase is live, pull remote collections into $db before handling mutations
if ($isAuthed && $fsState['connected']) {
    $remoteUsersRes = fsListCollection('hpay_users');
    if ($remoteUsersRes['ok']) {
        $mergedUsers = mergeById($db['users'] ?? [], $remoteUsersRes['items']);
        $db['users'] = array_map('normalizeUserRecord', $mergedUsers);
    }
    $remoteWdRes = fsListCollection('hpay_withdrawals');
    if ($remoteWdRes['ok']) {
        $db['withdrawals'] = mergeById($db['withdrawals'] ?? [], $remoteWdRes['items']);
    }
    $remoteDepRes = fsListCollection('hpay_deposits');
    if ($remoteDepRes['ok']) {
        $db['deposits'] = mergeById($db['deposits'] ?? [], $remoteDepRes['items']);
    }
    $remotePresRes = fsListCollection('hpay_presence');
    if ($remotePresRes['ok']) {
        $db['onlinePresence'] = $remotePresRes['items'];
    }
    saveDb($dbPath, $db);
}

// Handle manual Firebase full sync trigger
if ($isAuthed && isset($_GET['sync_firebase'])) {
    if (!$fsState['connected']) {
        $error = 'تعذر المزامنة: Firestore في مشروع ' . FIREBASE_PROJECT_ID . ' غير مفعّل أو قواعد Rules مغلقة (' . $fsState['error'] . ')';
    } else {
        $pushed = 0;
        foreach (($db['users'] ?? []) as $u) {
            $norm = normalizeUserRecord($u);
            $res = fsSetDoc('hpay_users', (string)$norm['id'], $norm);
            if ($res['ok']) {
                $pushed++;
            }
        }
        fsSetDoc('hpay_platform', 'config', $db['config']);
        $flash = "تمت مزامنة {$pushed} حساب مع Firebase (" . FIREBASE_PROJECT_ID . ") بنجاح";
    }
}

// Handle Authenticated Admin Actions
if ($isAuthed && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $act = (string)($_POST['action'] ?? '');

    if ($act === 'create_user') {
        $email = trim((string)($_POST['email'] ?? ''));
        $password = trim((string)($_POST['password'] ?? ''));
        $displayName = trim((string)($_POST['displayName'] ?? ''));
        $username = trim((string)($_POST['username'] ?? ''));

        if ($email === '' || $password === '') {
            $error = 'البريد الإلكتروني وكلمة المرور مطلوبين';
        } else {
            $exists = false;
            foreach (($db['users'] ?? []) as $u) {
                if (strtolower(trim((string)($u['email'] ?? ''))) === strtolower($email)) {
                    $exists = true;
                    break;
                }
            }
            if ($exists) {
                $error = 'البريد الإلكتروني مسجل بالفعل';
            } else {
                $newId = 'usr_' . time() . '_' . random_int(100, 999);
                $prefix = preg_replace('/[^a-zA-Z0-9_]/', '', explode('@', $email)[0]) ?: 'agent';
                $takenPids = array_map(fn($u) => (string)($u['playerId'] ?? ''), $db['users'] ?? []);
                $playerId = 'PL-' . random_int(10000000, 99999999);
                while (in_array($playerId, $takenPids, true)) {
                    $playerId = 'PL-' . random_int(10000000, 99999999);
                }

                $newUser = [
                    'id' => $newId,
                    'playerId' => $playerId,
                    'uuid' => uuidV4(),
                    'username' => $username !== '' ? $username : ($prefix . '_egp'),
                    'displayName' => $displayName !== '' ? $displayName : $prefix,
                    'email' => $email,
                    'emailLower' => strtolower($email),
                    'password' => $password,
                    'telegramHandle' => '@' . $prefix,
                    'balanceEgp' => 0.0,
                    'frozenEgp' => 0,
                    'insuranceEgp' => null,
                    'canTrade' => true,
                    'active' => true,
                    'depositFeePct' => 3.0,
                    'withdrawalFeePct' => 1.8,
                    'referralCode' => 'EG-' . str_replace('PL-', '', $playerId),
                    'referralRatePct' => 0.5,
                    'twoFactorEnabled' => true,
                    'trc20Address' => 'TY9xK8mPq7VwRz4nLp3JdXs2kF9aBc7eW1',
                    'createdAt' => gmdate('c'),
                ];

                array_unshift($db['users'], $newUser);
                saveDb($dbPath, $db);

                $fsUserWrite = fsSetDoc('hpay_users', $newId, $newUser);
                if ($fsUserWrite['ok']) {
                    $fsState['connected'] = true;
                    $flash = "تم إنشاء الحساب وحفظه في Firebase (" . FIREBASE_PROJECT_ID . ") والسيرفر: {$email} ({$playerId})";
                } else {
                    $flash = "تم إنشاء الحساب محليًا: {$email} ({$playerId}) — ملاحظة: مزامنة Firebase تحتاج تفعيل Firestore API";
                }
            }
        }
    } elseif ($act === 'update_user') {
        $uid = trim((string)($_POST['userId'] ?? ''));
        $updatedUser = null;
        foreach ($db['users'] as &$u) {
            if (($u['id'] ?? '') === $uid) {
                if (isset($_POST['displayName']) && trim((string)$_POST['displayName']) !== '') {
                    $u['displayName'] = trim((string)$_POST['displayName']);
                }
                if (isset($_POST['email']) && trim((string)$_POST['email']) !== '') {
                    $u['email'] = trim((string)$_POST['email']);
                    $u['emailLower'] = strtolower($u['email']);
                }
                if (isset($_POST['password']) && trim((string)$_POST['password']) !== '') {
                    $u['password'] = trim((string)$_POST['password']);
                }
                if (isset($_POST['balanceEgp'])) {
                    $u['balanceEgp'] = round((float)$_POST['balanceEgp'], 2);
                }
                if (isset($_POST['active_submitted'])) {
                    $u['active'] = isset($_POST['active']);
                    $u['canTrade'] = isset($_POST['canTrade']);
                }
                $u = normalizeUserRecord($u);
                $updatedUser = $u;
                break;
            }
        }
        unset($u);
        if ($updatedUser !== null) {
            saveDb($dbPath, $db);
            $fsUpd = fsSetDoc('hpay_users', $uid, $updatedUser);
            $flash = $fsUpd['ok']
                ? 'تم تحديث بيانات المستخدم والرصيد في Firebase والسيرفر'
                : 'تم تحديث بيانات المستخدم والرصيد محليًا';
        } else {
            $error = 'لم يتم العثور على الحساب';
        }
    } elseif ($act === 'delete_user') {
        $uid = trim((string)($_POST['userId'] ?? ''));
        $db['users'] = array_values(array_filter($db['users'] ?? [], fn($u) => ($u['id'] ?? '') !== $uid));
        saveDb($dbPath, $db);
        fsDeleteDoc('hpay_users', $uid);
        $flash = 'تم حذف الحساب من الإدارة و Firebase';
    } elseif ($act === 'send_withdrawal') {
        $uid = trim((string)($_POST['userId'] ?? ''));
        $amountEgp = max(1, (float)($_POST['amountEgp'] ?? 0));
        $method = trim((string)($_POST['destinationMethod'] ?? 'فودافون كاش'));
        $number = trim((string)($_POST['requisiteNumber'] ?? '01000000000'));
        $recipient = trim((string)($_POST['recipientName'] ?? 'عميل سحب'));
        $note = trim((string)($_POST['note'] ?? ''));

        $rate = max(1.0, (float)($db['config']['usdRate'] ?? 49.85));
        $wdId = 'wd_' . time() . '_' . random_int(100, 999);
        $msgId = 'msg_' . time() . '_' . random_int(100, 999);
        $orderCode = 'WD-' . random_int(400000, 999999);
        $nowIso = gmdate('c');

        $wdDoc = [
            'id' => $wdId,
            'userId' => $uid,
            'orderId' => $orderCode,
            'accountId' => 'acc_' . $uid,
            'amountLocal' => $amountEgp,
            'amountUsdt' => round($amountEgp / $rate, 2),
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
        ];

        $msgBody = $note !== ''
            ? $note
            : "طلب سحب جديد بقيمة " . number_format($amountEgp, 2) . " ج.م إلى ($method - $number). برجاء التأكيد لخصم المبلغ أو الرفض.";

        $msgDoc = [
            'id' => $msgId,
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
        ];

        array_unshift($db['withdrawals'], $wdDoc);
        array_unshift($db['messages'], $msgDoc);
        saveDb($dbPath, $db);

        $fsWd = fsSetDoc('hpay_withdrawals', $wdId, $wdDoc);
        fsSetDoc('hpay_messages', $msgId, $msgDoc);

        $flash = $fsWd['ok']
            ? "تم إرسال طلب السحب $orderCode إلى رسايل المستخدم و Firebase"
            : "تم إرسال طلب السحب $orderCode إلى رسايل المستخدم";
    } elseif ($act === 'send_deposit') {
        $uid = trim((string)($_POST['userId'] ?? ''));
        $identifier = strtolower(trim((string)($_POST['identifier'] ?? '')));
        $idNoAt = ltrim($identifier, '@');
        $amountEgp = max(1, (float)($_POST['amountEgp'] ?? 0));
        $bankName = trim((string)($_POST['bankName'] ?? 'إيداع فوري من الإدارة'));
        if ($bankName === '') {
            $bankName = 'إيداع فوري من الإدارة';
        }
        $note = trim((string)($_POST['note'] ?? ''));

        $matchedIdx = null;
        foreach (($db['users'] ?? []) as $idx => $u) {
            $uEmail = strtolower(trim((string)($u['email'] ?? '')));
            $uUser = ltrim(strtolower(trim((string)($u['username'] ?? ''))), '@');
            $uPid = strtolower(trim((string)($u['playerId'] ?? '')));
            if (
                ($uid !== '' && ($u['id'] ?? '') === $uid) ||
                ($identifier !== '' && ($uEmail === $identifier || $uUser === $idNoAt || $uPid === $identifier))
            ) {
                $matchedIdx = $idx;
                break;
            }
        }

        if ($matchedIdx === null) {
            $error = 'لم يتم العثور على العميل بالجيميل أو اليوزر نيم ده';
        } else {
            $target = normalizeUserRecord($db['users'][$matchedIdx]);
            $newBalance = round((float)($target['balanceEgp'] ?? 0) + $amountEgp, 2);
            $target['balanceEgp'] = $newBalance;
            $db['users'][$matchedIdx] = $target;

            $rate = max(1.0, (float)($db['config']['usdRate'] ?? 49.85));
            $depId = 'dep_' . time() . '_' . random_int(100, 999);
            $msgId = 'msg_' . time() . '_' . random_int(100, 999);
            $orderId = 'EG-' . random_int(884200, 974200);
            $nowIso = gmdate('c');

            $depDoc = [
                'id' => $depId,
                'userId' => $target['id'],
                'orderId' => $orderId,
                'accountId' => 'acc_' . $target['id'],
                'amountLocal' => $amountEgp,
                'amountUsdt' => round($amountEgp / $rate, 2),
                'incomeUsdt' => 0,
                'rate' => $rate,
                'requisiteId' => 'req_admin_direct',
                'bankName' => $bankName,
                'ownerName' => $target['displayName'],
                'requisiteNumber' => $target['username'],
                'status' => 'completed',
                'createdAt' => $nowIso,
                'expiresAt' => gmdate('c', time() + 900),
                'confirmedAt' => $nowIso,
            ];

            $msgDoc = [
                'id' => $msgId,
                'userId' => $target['id'],
                'deviceId' => 'admin_desk',
                'deviceName' => 'إدارة المنصة',
                'sender' => 'إيداع رصيد فوري',
                'body' => $note !== '' ? $note : ("تم إيداع مبلغ " . number_format($amountEgp, 2) . " ج.م في حسابك ({$target['email']}) بنجاح. رصيدك الحالي: " . number_format($newBalance, 2) . " ج.م."),
                'parsedAmount' => $amountEgp,
                'currency' => 'EGP',
                'matchedDepositId' => $depId,
                'matchedOrderId' => $orderId,
                'status' => 'matched',
                'receivedAt' => $nowIso,
            ];

            array_unshift($db['deposits'], $depDoc);
            array_unshift($db['messages'], $msgDoc);
            saveDb($dbPath, $db);

            $fsUser = fsSetDoc('hpay_users', (string)$target['id'], $target);
            fsSetDoc('hpay_deposits', $depId, $depDoc);
            fsSetDoc('hpay_messages', $msgId, $msgDoc);

            $flash = $fsUser['ok']
                ? "تم إيداع " . number_format($amountEgp, 2) . " ج.م لحساب {$target['email']} (@{$target['username']}) ونزل في Firebase والمنصة فورًا"
                : "تم إيداع " . number_format($amountEgp, 2) . " ج.م لحساب {$target['email']} (@{$target['username']}) محليًا";
        }
    } elseif ($act === 'update_config') {
        $db['config']['platformName'] = FIXED_PLATFORM_NAME;
        $db['config']['usdRate'] = (float)($_POST['usdRate'] ?? $db['config']['usdRate']);
        if (trim((string)($_POST['adminPassword'] ?? '')) !== '') {
            $db['config']['adminPassword'] = trim((string)$_POST['adminPassword']);
        }
        saveDb($dbPath, $db);
        $fsCfg = fsSetDoc('hpay_platform', 'config', $db['config']);
        $flash = $fsCfg['ok']
            ? 'تم حفظ الإعدادات في Firebase والسيرفر (Nexus Agency مثبّت)'
            : 'تم حفظ إعدادات المنصة محليًا (Nexus Agency مثبّت)';
    }
}

$nowTs = time();
$onlineUsers = array_values(array_filter($db['onlinePresence'] ?? [], function ($p) use ($nowTs) {
    $ms = $p['lastPingMs'] ?? null;
    if (is_numeric($ms) && (float)$ms > 0) {
        return (($nowTs * 1000) - (float)$ms) <= 45000;
    }
    $ts = strtotime((string)($p['lastPingAt'] ?? ''));
    return $ts !== false && ($nowTs - $ts) <= 45;
}));
$totalBalance = array_reduce($db['users'] ?? [], fn($c, $u) => $c + (float)($u['balanceEgp'] ?? 0), 0.0);
$openRulesSnippet = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}";
?>
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>لوحة تحكم الأدمن — Nexus Agency</title>
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif; }
    body { margin: 0; background: #141414; color: #fff; }
    .container { max-width: 1260px; margin: 0 auto; padding: 20px; }
    .card { background: #181818; border: 1px solid #262626; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
    .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; padding: 14px 22px; background: #151515; border-bottom: 1px solid #222; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 18px; }
    input, select, textarea { width: 100%; background: #111; border: 1px solid #303030; color: #fff; border-radius: 9px; padding: 9px 12px; font-size: 13px; margin-top: 5px; }
    label { font-size: 12px; color: #aaa; display: block; margin-top: 10px; }
    .btn { border: 0; border-radius: 9px; padding: 9px 15px; font-weight: 700; cursor: pointer; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; text-decoration: none; }
    .btn-orange { background: #e25d0a; color: #fff; }
    .btn-green { background: #00e344; color: #000; }
    .btn-dark { background: #222227; color: #e4e4e7; border: 1px solid #35353c; }
    .btn-red { background: rgba(227,34,0,.15); color: #ff6b57; border: 1px solid rgba(227,34,0,.4); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { text-align: right; padding: 10px 12px; border-bottom: 1px solid #232323; vertical-align: middle; }
    th { background: #202021; color: #aaa; font-size: 12px; }
    .badge-live { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(0,227,68,.1); color: #00e344; border: 1px solid rgba(0,227,68,.3); font-weight: 700; font-size: 12.5px; }
    .badge-warn { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 999px; background: rgba(219,157,55,.12); color: #db9d37; border: 1px solid rgba(219,157,55,.35); font-weight: 700; font-size: 12.5px; }
    .alert { padding: 12px 15px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; line-height: 1.6; }
    .alert-ok { background: rgba(0,227,68,.12); border: 1px solid rgba(0,227,68,.35); color: #00e344; }
    .alert-err { background: rgba(227,34,0,.12); border: 1px solid rgba(227,34,0,.35); color: #ff6b57; }
    .alert-warn { background: rgba(219,157,55,.10); border: 1px solid rgba(219,157,55,.35); color: #ebd29b; }
    pre.rules-box { background: #0d0d0f; border: 1px solid #2c2c33; border-radius: 8px; padding: 10px; font-size: 12px; color: #db9d37; direction: ltr; text-align: left; overflow-x: auto; margin: 8px 0 0; }
  </style>
</head>
<body>
<?php if (!$isAuthed): ?>
  <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;">
    <form method="post" class="card" style="width:100%;max-width:420px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <h2 style="margin:0;">لوحة تحكم الأدمن (admin.php)</h2>
        <span class="<?= $fsState['connected'] ? 'badge-live' : 'badge-warn' ?>">
          <?= $fsState['connected'] ? 'Firebase لايف' : 'moorrcv' ?>
        </span>
      </div>
      <p style="font-size:12.5px;color:#999;margin-top:0;">ربط مباشر مع منصة Nexus Agency ومشروع Firebase: <strong style="color:#db9d37;"><?= e(FIREBASE_PROJECT_ID) ?></strong></p>
      <?php if ($error): ?><div class="alert alert-err"><?= e($error) ?></div><?php endif; ?>
      <input type="hidden" name="action" value="admin_login" />
      <label>كلمة مرور الأدمن</label>
      <input type="password" name="password" required placeholder="••••••••" />
      <button type="submit" class="btn btn-orange" style="width:100%;justify-content:center;margin-top:14px;">دخول الإدارة</button>
    </form>
  </div>
<?php else: ?>
  <div class="header">
    <div style="font-weight:800;font-size:17px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span>🇪🇬 Nexus Agency · <span style="color:#e25d0a;">admin.php</span></span>
      <?php if ($fsState['connected']): ?>
        <span class="badge-live">Firebase لايف: <?= e(FIREBASE_PROJECT_ID) ?></span>
      <?php else: ?>
        <span class="badge-warn">Firebase محتاج تفعيل (<?= e(FIREBASE_PROJECT_ID) ?>)</span>
      <?php endif; ?>
    </div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <span class="badge-live">● أونلاين دلوقتي: <?= count($onlineUsers) ?></span>
      <a href="?sync_firebase=1" class="btn btn-dark">مزامنة مع Firebase</a>
      <a href="?logout=1" class="btn btn-red">خروج</a>
    </div>
  </div>

  <div class="container">
    <?php if ($flash): ?><div class="alert alert-ok"><?= e($flash) ?></div><?php endif; ?>
    <?php if ($error): ?><div class="alert alert-err"><?= e($error) ?></div><?php endif; ?>

    <?php if (!$fsState['connected']): ?>
      <div class="alert alert-warn">
        <div style="font-weight:800;color:#db9d37;margin-bottom:4px;">
          تنبيه ربط Firebase (مشروع <?= e(FIREBASE_PROJECT_ID) ?>):
        </div>
        <div>
          عشان الحسابات اللي بتتعمل هنا في <code>admin.php</code> تفتح فورًا على الموقع الأساسي (وعلى Vercel أو أي جهاز)، لازم خدمة <strong>Cloud Firestore</strong> تكون مفعّلة في مشروع <code><?= e(FIREBASE_PROJECT_ID) ?></code> وتكون قواعد Rules مفتوحة للقراءة والكتابة:
          <?php if ($fsState['error']): ?>
            <div style="color:#ff9352;font-size:12px;margin-top:4px;">السبب الوارد من Firebase: <?= e($fsState['error']) ?></div>
          <?php endif; ?>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          <a href="https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=<?= e(FIREBASE_PROJECT_ID) ?>" target="_blank" rel="noreferrer" class="btn btn-orange">
            1. تفعيل Cloud Firestore API في <?= e(FIREBASE_PROJECT_ID) ?>
          </a>
          <a href="https://console.firebase.google.com/project/<?= e(FIREBASE_PROJECT_ID) ?>/firestore/rules" target="_blank" rel="noreferrer" class="btn btn-dark">
            2. فتح Firestore Rules
          </a>
          <a href="?sync_firebase=1" class="btn btn-green">
            3. فحص الاتصال ومزامنة الحسابات
          </a>
        </div>
        <pre class="rules-box"><?= e($openRulesSnippet) ?></pre>
      </div>
    <?php endif; ?>

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

    <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));">
      <form method="post" class="card">
        <h3 style="margin-top:0;">إنشاء حساب مستخدم جديد (رصيد 0 ج.م)</h3>
        <input type="hidden" name="action" value="create_user" />
        <label>البريد الإلكتروني (الجيميل)</label>
        <input type="email" name="email" required placeholder="agent@gmail.com" />
        <label>كلمة المرور</label>
        <input type="text" name="password" required placeholder="كلمة المرور" />
        <label>الاسم</label>
        <input type="text" name="displayName" placeholder="الاسم الكامل" />
        <label>اليوزرنيم</label>
        <input type="text" name="username" placeholder="mohamed_egp" />
        <button type="submit" class="btn btn-orange" style="margin-top:14px;width:100%;justify-content:center;">إنشاء الحساب وحفظه في Firebase</button>
      </form>

      <form method="post" class="card">
        <h3 style="margin-top:0;">إرسال طلب سحب لمستخدم (يظهر في الرسايل)</h3>
        <input type="hidden" name="action" value="send_withdrawal" />
        <label>اختر المستخدم بالجيميل</label>
        <select name="userId" required>
          <?php foreach (($db['users'] ?? []) as $u): ?>
            <option value="<?= e((string)$u['id']) ?>">
              <?= e((string)$u['email']) ?> (<?= e((string)$u['displayName']) ?>) — <?= number_format((float)$u['balanceEgp'], 2) ?> ج.م
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
        <button type="submit" class="btn btn-orange" style="margin-top:14px;width:100%;justify-content:center;">إرسال طلب السحب للمستخدم</button>
      </form>

      <form method="post" class="card" style="border-color:rgba(0,227,68,.35);">
        <h3 style="margin-top:0;color:#00e344;">عمل إيداع لمستخدم (بالجيميل أو اليوزر)</h3>
        <input type="hidden" name="action" value="send_deposit" />
        <label>اختر الجيميل بتاع العميل</label>
        <select name="userId">
          <option value="">— اختر من القائمة أو اكتب تحت —</option>
          <?php foreach (($db['users'] ?? []) as $u): ?>
            <option value="<?= e((string)$u['id']) ?>">
              <?= e((string)$u['email']) ?> (@<?= e((string)$u['username']) ?>) — <?= number_format((float)$u['balanceEgp'], 2) ?> ج.م
            </option>
          <?php endforeach; ?>
        </select>
        <label>أو اكتب الجيميل / اليوزرنيم</label>
        <input type="text" name="identifier" placeholder="user@gmail.com أو ahmed_egp" />
        <label>مبلغ الإيداع (جنيه مصري)</label>
        <input type="number" step="0.01" min="1" name="amountEgp" value="1000" required />
        <label>طريقة الإيداع</label>
        <input type="text" name="bankName" value="إيداع فوري من الإدارة" />
        <label>ملاحظة (اختياري)</label>
        <input type="text" name="note" placeholder="تم إضافة الرصيد تلقائيًا" />
        <button type="submit" class="btn btn-green" style="margin-top:14px;width:100%;justify-content:center;">إضافة الإيداع ونزوله فورًا</button>
      </form>
    </div>

    <div class="card">
      <h3 style="margin-top:0;">الحسابات والأرصدة (متزامنة مع Firebase)</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>ID اللاعب</th>
              <th>الاسم واليوزر</th>
              <th>البريد الإلكتروني (الجيميل)</th>
              <th>كلمة المرور والرصيد</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach (($db['users'] ?? []) as $u): ?>
              <tr>
                <td style="color:#e25d0a;font-weight:700;"><?= e((string)($u['playerId'] ?? $u['id'])) ?></td>
                <td><?= e((string)($u['displayName'] ?? '')) ?> <span style="color:#888;">(@<?= e((string)($u['username'] ?? '')) ?>)</span></td>
                <td><?= e((string)($u['email'] ?? '')) ?></td>
                <td>
                  <form method="post" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                    <input type="hidden" name="action" value="update_user" />
                    <input type="hidden" name="userId" value="<?= e((string)$u['id']) ?>" />
                    <input type="text" name="password" value="<?= e((string)($u['password'] ?? '')) ?>" style="width:130px;margin-top:0;" title="كلمة المرور" />
                    <input type="number" step="0.01" name="balanceEgp" value="<?= e((string)(float)($u['balanceEgp'] ?? 0)) ?>" style="width:110px;margin-top:0;color:#00e344;font-weight:700;" title="الرصيد بالجنيه" />
                    <button type="submit" class="btn btn-dark">حفظ</button>
                  </form>
                </td>
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

    <div class="card">
      <h3 style="margin-top:0;">سجل الإيداعات (<?= count($db['deposits'] ?? []) ?>)</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>رقم العملية</th>
              <th>العميل / اليوزر</th>
              <th>المبلغ (ج.م)</th>
              <th>الطريقة</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            <?php foreach (array_slice($db['deposits'] ?? [], 0, 25) as $d): ?>
              <tr>
                <td><?= e((string)($d['orderId'] ?? '')) ?></td>
                <td><?= e((string)($d['ownerName'] ?? '')) ?> <span style="color:#888;">(<?= e((string)($d['requisiteNumber'] ?? '')) ?>)</span></td>
                <td style="color:#00e344;font-weight:700;">+<?= number_format((float)($d['amountLocal'] ?? 0), 2) ?> ج.م</td>
                <td><?= e((string)($d['bankName'] ?? '')) ?></td>
                <td><?= e((string)($d['status'] ?? '')) ?></td>
                <td style="color:#888;font-size:12px;"><?= e((string)($d['createdAt'] ?? '')) ?></td>
              </tr>
            <?php endforeach; ?>
          </tbody>
        </table>
      </div>
    </div>

    <form method="post" class="card">
      <h3 style="margin-top:0;">إعدادات المنصة</h3>
      <input type="hidden" name="action" value="update_config" />
      <label>اسم المنصة (مثبّت لا يتغير)</label>
      <input type="text" name="platformName" value="Nexus Agency" readonly disabled style="opacity:.75;cursor:not-allowed;" />
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
