<?php
declare(strict_types=1);

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'bootstrap.php') {
    http_response_code(403);
    exit;
}

require_once __DIR__ . '/secrets.php';

define('PK_ROOT_DIR', dirname(__DIR__));
define('PK_STORAGE_DIR', PK_ROOT_DIR . '/storage');
define('PK_UPLOAD_DIR', PK_STORAGE_DIR . '/uploads');
define('PK_DB_PATH', PK_STORAGE_DIR . '/leads.db');

function pk_ensure_storage(): void
{
    if (!is_dir(PK_STORAGE_DIR)) {
        mkdir(PK_STORAGE_DIR, 0750, true);
    }
    if (!is_dir(PK_UPLOAD_DIR)) {
        mkdir(PK_UPLOAD_DIR, 0750, true);
    }
    $htaccess = PK_STORAGE_DIR . '/.htaccess';
    if (!file_exists($htaccess)) {
        file_put_contents($htaccess, "Require all denied\nOptions -Indexes\n");
    }
}

function pk_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    pk_ensure_storage();
    $pdo = new PDO('sqlite:' . PK_DB_PATH, null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA journal_mode = WAL;');
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_code TEXT NOT NULL UNIQUE,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            district TEXT NOT NULL,
            address TEXT NOT NULL,
            gps_coords TEXT DEFAULT "",
            canopy_model TEXT NOT NULL,
            yard_angle TEXT DEFAULT "",
            yard_length REAL DEFAULT 0,
            yard_width REAL DEFAULT 0,
            yard_area REAL DEFAULT 0,
            yard_notes TEXT DEFAULT "",
            answers_json TEXT DEFAULT "{}",
            ai_notes TEXT DEFAULT "",
            photo_filename TEXT DEFAULT "",
            status TEXT DEFAULT "Baru",
            ip_address TEXT DEFAULT "",
            created_at TEXT NOT NULL
        );
    ');
    $pdo->exec('
        CREATE TABLE IF NOT EXISTS rate_limits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            scope TEXT NOT NULL,
            ip_address TEXT NOT NULL,
            created_at INTEGER NOT NULL
        );
    ');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_rl_scope_ip ON rate_limits (scope, ip_address, created_at);');
    return $pdo;
}

function pk_client_ip(): string
{
    $ip = $_SERVER['HTTP_CF_CONNECTING_IP']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
    return substr(trim((string) $ip), 0, 64);
}

function pk_check_rate_limit(string $scope, int $maxHits, int $windowSeconds): bool
{
    $pdo = pk_db();
    $now = time();
    $cutoff = $now - $windowSeconds;
    $ip = pk_client_ip();

    $pdo->prepare('DELETE FROM rate_limits WHERE created_at < ?')->execute([$cutoff]);
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM rate_limits WHERE scope = ? AND ip_address = ? AND created_at >= ?');
    $stmt->execute([$scope, $ip, $cutoff]);
    $count = (int) $stmt->fetchColumn();

    if ($count >= $maxHits) {
        return false;
    }
    $pdo->prepare('INSERT INTO rate_limits (scope, ip_address, created_at) VALUES (?, ?, ?)')->execute([$scope, $ip, $now]);
    return true;
}

function pk_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function pk_clean_text(?string $value, int $maxLen = 500): string
{
    $str = trim((string) $value);
    $str = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $str) ?? '';
    if (mb_strlen($str, 'UTF-8') > $maxLen) {
        $str = mb_substr($str, 0, $maxLen, 'UTF-8');
    }
    return $str;
}

function pk_validate_uploaded_image(array $file): array
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Gagal membaca file foto yang diunggah.'];
    }
    if (($file['size'] ?? 0) <= 0 || ($file['size'] ?? 0) > 10 * 1024 * 1024) {
        return ['ok' => false, 'error' => 'Ukuran foto maksimal 10 MB.'];
    }
    $tmp = $file['tmp_name'] ?? '';
    if ($tmp === '' || !is_uploaded_file($tmp)) {
        return ['ok' => false, 'error' => 'Berkas unggahan tidak valid.'];
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = (string) $finfo->file($tmp);
    $allowed = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];
    if (!isset($allowed[$mime])) {
        return ['ok' => false, 'error' => 'Format foto harus JPG, PNG, atau WEBP.'];
    }
    return ['ok' => true, 'mime' => $mime, 'ext' => $allowed[$mime], 'tmp' => $tmp];
}
