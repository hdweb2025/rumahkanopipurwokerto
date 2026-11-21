<?php
declare(strict_types=1);

require_once __DIR__ . '/api/bootstrap.php';

$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_set_cookie_params([
    'lifetime' => 86400,
    'path' => '/',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

if (empty($_SESSION['pk_csrf'])) {
    $_SESSION['pk_csrf'] = bin2hex(random_bytes(24));
}

function pk_is_authed(): bool
{
    if (empty($_SESSION['pk_admin_auth']) || empty($_SESSION['pk_admin_expires'])) {
        return false;
    }
    if (time() > (int) $_SESSION['pk_admin_expires']) {
        $_SESSION = [];
        return false;
    }
    return true;
}

function pk_h(?string $v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function pk_csv_cell(string $val): string
{
    $val = str_replace(["\r", "\n"], ' ', $val);
    if ($val !== '' && in_array($val[0], ['=', '+', '-', '@', "\t"], true)) {
        $val = "'" . $val;
    }
    return $val;
}

$loginError = '';

// Handle Logout
if (isset($_POST['action']) && $_POST['action'] === 'logout') {
    if (hash_equals($_SESSION['pk_csrf'] ?? '', (string) ($_POST['csrf_token'] ?? ''))) {
        $_SESSION = [];
        session_destroy();
    }
    header('Location: admin.php');
    exit;
}

// Handle Login
if (isset($_POST['action']) && $_POST['action'] === 'login') {
    if (!hash_equals($_SESSION['pk_csrf'] ?? '', (string) ($_POST['csrf_token'] ?? ''))) {
        $loginError = 'Sesi formulir kedaluwarsa. Muat ulang halaman dan coba lagi.';
    } elseif (!pk_check_rate_limit('admin_login', 5, 60)) {
        $loginError = 'Terlalu banyak percobaan masuk. Tunggu 1 menit sebelum mencoba kembali.';
    } else {
        $pass = (string) ($_POST['admin_password'] ?? '');
        $calc = hash_pbkdf2('sha256', $pass, PK_ADMIN_SALT, 100000, 64);
        if (hash_equals(PK_ADMIN_HASH, $calc)) {
            session_regenerate_id(true);
            $_SESSION['pk_admin_auth'] = true;
            $_SESSION['pk_admin_expires'] = time() + 86400;
            $_SESSION['pk_csrf'] = bin2hex(random_bytes(24));
            header('Location: admin.php');
            exit;
        }
        $loginError = 'Kata sandi tidak cocok. Akses ditolak.';
    }
}

$authed = pk_is_authed();

// Authenticated Photo Proxy
if ($authed && isset($_GET['photo'])) {
    $leadId = (int) $_GET['photo'];
    $pdo = pk_db();
    $stmt = $pdo->prepare('SELECT photo_filename FROM leads WHERE id = ? LIMIT 1');
    $stmt->execute([$leadId]);
    $filename = basename((string) $stmt->fetchColumn());
    if ($filename !== '' && preg_match('/^[a-zA-Z0-9_.-]+$/', $filename)) {
        $path = PK_UPLOAD_DIR . '/' . $filename;
        if (is_file($path)) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = (string) $finfo->file($path);
            if (in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
                header('Content-Type: ' . $mime);
                header('Content-Length: ' . (string) filesize($path));
                readfile($path);
                exit;
            }
        }
    }
    http_response_code(404);
    exit('Not found');
}

// Authenticated Actions: Update Status / Delete / Export CSV
if ($authed && isset($_POST['action']) && in_array($_POST['action'], ['update_status', 'delete_lead'], true)) {
    if (hash_equals($_SESSION['pk_csrf'] ?? '', (string) ($_POST['csrf_token'] ?? ''))) {
        $pdo = pk_db();
        $leadId = (int) ($_POST['lead_id'] ?? 0);
        if ($_POST['action'] === 'update_status' && $leadId > 0) {
            $newStatus = (string) ($_POST['status'] ?? 'Baru');
            if (in_array($newStatus, ['Baru', 'Dihubungi', 'Survei', 'Selesai'], true)) {
                $pdo->prepare('UPDATE leads SET status = ? WHERE id = ?')->execute([$newStatus, $leadId]);
            }
        } elseif ($_POST['action'] === 'delete_lead' && $leadId > 0) {
            $stmt = $pdo->prepare('SELECT photo_filename FROM leads WHERE id = ?');
            $stmt->execute([$leadId]);
            $fn = basename((string) $stmt->fetchColumn());
            if ($fn !== '' && is_file(PK_UPLOAD_DIR . '/' . $fn)) {
                @unlink(PK_UPLOAD_DIR . '/' . $fn);
            }
            $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute([$leadId]);
        }
    }
    header('Location: admin.php');
    exit;
}

if ($authed && isset($_GET['export']) && $_GET['export'] === 'csv') {
    $pdo = pk_db();
    $rows = $pdo->query('SELECT * FROM leads ORDER BY id DESC')->fetchAll();
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="purwokerto-kanopi-leads-' . date('Ymd-His') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['Kode Tiket', 'Tanggal', 'Status', 'Nama', 'Nomor HP', 'Kecamatan', 'Alamat', 'GPS', 'Model Kanopi', 'Sudut Foto', 'Panjang (m)', 'Lebar (m)', 'Luas (m2)', 'Catatan', 'Jawaban Interaktif', 'Analisa AI']);
    foreach ($rows as $r) {
        fputcsv($out, [
            pk_csv_cell((string) $r['ticket_code']),
            pk_csv_cell((string) $r['created_at']),
            pk_csv_cell((string) $r['status']),
            pk_csv_cell((string) $r['customer_name']),
            pk_csv_cell((string) $r['phone']),
            pk_csv_cell((string) $r['district']),
            pk_csv_cell((string) $r['address']),
            pk_csv_cell((string) $r['gps_coords']),
            pk_csv_cell((string) $r['canopy_model']),
            pk_csv_cell((string) $r['yard_angle']),
            (string) $r['yard_length'],
            (string) $r['yard_width'],
            (string) $r['yard_area'],
            pk_csv_cell((string) $r['yard_notes']),
            pk_csv_cell((string) $r['answers_json']),
            pk_csv_cell((string) $r['ai_notes']),
        ]);
    }
    fclose($out);
    exit;
}

$leads = [];
$counts = ['total' => 0, 'Baru' => 0, 'Dihubungi' => 0, 'Survei' => 0, 'Selesai' => 0];
$filterStatus = (string) ($_GET['status'] ?? 'Semua');
$searchQuery = trim((string) ($_GET['q'] ?? ''));

if ($authed) {
    $pdo = pk_db();
    $all = $pdo->query('SELECT * FROM leads ORDER BY id DESC')->fetchAll();
    $counts['total'] = count($all);
    foreach ($all as $row) {
        $st = $row['status'] ?? 'Baru';
        if (isset($counts[$st])) {
            $counts[$st]++;
        }
        if ($filterStatus !== 'Semua' && $st !== $filterStatus) {
            continue;
        }
        if ($searchQuery !== '') {
            $hay = mb_strtolower($row['ticket_code'] . ' ' . $row['customer_name'] . ' ' . $row['phone'] . ' ' . $row['district'] . ' ' . $row['address'] . ' ' . $row['canopy_model'], 'UTF-8');
            if (mb_strpos($hay, mb_strtolower($searchQuery, 'UTF-8')) === false) {
                continue;
            }
        }
        $leads[] = $row;
    }
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Portal Pengelola | Purwokerto Kanopi</title>
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" />
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body class="min-h-screen antialiased">
<?php if (!$authed): ?>
  <main class="min-h-screen flex items-center justify-center p-4">
    <div class="bespoke-card max-w-md w-full p-7 sm:p-8 space-y-6">
      <div class="text-center space-y-3">
        <div class="w-14 h-14 mx-auto rounded-2xl bg-emerald-900/10 text-brand flex items-center justify-center shadow-sm">
          <img src="assets/brand-mark.svg" alt="Logo Purwokerto Kanopi" class="w-10 h-10" />
        </div>
        <div>
          <span class="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-gold text-[11px] font-extrabold uppercase tracking-widest">Akses Khusus Pengelola Resmi</span>
          <h1 class="text-2xl font-extrabold text-ink-primary mt-2">Purwokerto Kanopi</h1>
          <p class="text-sm text-ink-muted mt-1">Masuk untuk melihat daftar alamat, nomor HP, dan foto halaman rumah pelanggan.</p>
        </div>
      </div>

      <?php if ($loginError !== ''): ?>
        <div class="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-700 text-sm font-semibold">
          <?= pk_h($loginError) ?>
        </div>
      <?php endif; ?>

      <form method="post" class="space-y-4">
        <input type="hidden" name="action" value="login" />
        <input type="hidden" name="csrf_token" value="<?= pk_h($_SESSION['pk_csrf']) ?>" />

        <div>
          <label for="admin_password" class="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">Kata Sandi Pengelola</label>
          <div class="relative">
            <input id="admin_password" name="admin_password" type="password" required autocomplete="current-password" placeholder="Masukkan kata sandi pengelola" class="bespoke-input w-full px-4 py-3 pr-12 text-sm font-semibold" />
            <button id="toggle-pw-btn" type="button" aria-label="Tampilkan atau sembunyikan kata sandi" class="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg text-ink-muted hover:text-ink-primary flex items-center justify-center">
              <i class="fa-regular fa-eye" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <button id="login-submit-btn" type="submit" class="w-full bespoke-btn-primary py-3 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2">
          <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
          <span>Masuk ke Portal</span>
        </button>
      </form>

      <div class="pt-3 border-t border-emerald-900/10 text-center">
        <a href="index.html" class="text-xs font-bold text-brand hover:text-gold transition-colors inline-flex items-center gap-1.5">
          <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          <span>Kembali ke Halaman Utama</span>
        </a>
      </div>
    </div>
  </main>
  <script>
    const pwInput = document.getElementById('admin_password');
    const toggleBtn = document.getElementById('toggle-pw-btn');
    toggleBtn.addEventListener('click', () => {
      const isHidden = pwInput.type === 'password';
      pwInput.type = isHidden ? 'text' : 'password';
      toggleBtn.querySelector('i').className = isHidden ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
    });
  </script>
<?php else: ?>
  <header class="bespoke-header sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <img src="assets/brand-mark.svg" alt="Purwokerto Kanopi" class="w-9 h-9" />
        <div>
          <h1 class="text-lg font-extrabold text-brand leading-none">Data Pelanggan — Purwokerto Kanopi</h1>
          <p class="text-xs font-semibold text-ink-muted mt-1">Daftar nomor HP, alamat lokasi, dan foto halaman rumah untuk dihubungi admin</p>
        </div>
      </div>

      <div class="flex items-center gap-2.5">
        <a href="index.html" class="bespoke-btn-outline px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
          <i class="fa-solid fa-globe" aria-hidden="true"></i><span>Lihat Web</span>
        </a>
        <a href="admin.php?export=csv" class="bespoke-btn-outline px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
          <i class="fa-solid fa-file-csv text-gold" aria-hidden="true"></i><span>Unduh CSV</span>
        </a>
        <form method="post" class="inline">
          <input type="hidden" name="action" value="logout" />
          <input type="hidden" name="csrf_token" value="<?= pk_h($_SESSION['pk_csrf']) ?>" />
          <button type="submit" class="bespoke-btn-primary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2">
            <i class="fa-solid fa-right-from-bracket" aria-hidden="true"></i><span>Keluar</span>
          </button>
        </form>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
      <div class="bespoke-card p-4">
        <span class="text-xs font-bold uppercase text-ink-muted">Total Masuk</span>
        <p class="text-2xl font-extrabold text-ink-primary mt-1"><?= $counts['total'] ?></p>
      </div>
      <div class="bespoke-card p-4">
        <span class="text-xs font-bold uppercase text-gold">Baru</span>
        <p class="text-2xl font-extrabold text-ink-primary mt-1"><?= $counts['Baru'] ?></p>
      </div>
      <div class="bespoke-card p-4">
        <span class="text-xs font-bold uppercase text-ink-muted">Dihubungi</span>
        <p class="text-2xl font-extrabold text-ink-primary mt-1"><?= $counts['Dihubungi'] ?></p>
      </div>
      <div class="bespoke-card p-4">
        <span class="text-xs font-bold uppercase text-ink-muted">Survei</span>
        <p class="text-2xl font-extrabold text-ink-primary mt-1"><?= $counts['Survei'] ?></p>
      </div>
      <div class="bespoke-card p-4 col-span-2 sm:col-span-1">
        <span class="text-xs font-bold uppercase text-emerald-700">Selesai</span>
        <p class="text-2xl font-extrabold text-ink-primary mt-1"><?= $counts['Selesai'] ?></p>
      </div>
    </div>

    <!-- Filters -->
    <form method="get" class="bespoke-card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
      <div class="flex flex-wrap gap-2">
        <?php foreach (['Semua', 'Baru', 'Dihubungi', 'Survei', 'Selesai'] as $st): ?>
          <a href="?status=<?= urlencode($st) ?>&amp;q=<?= urlencode($searchQuery) ?>"
             class="choice-card px-3.5 py-2 text-xs font-bold inline-flex items-center <?= $filterStatus === $st ? 'is-selected text-gold' : 'text-ink-primary' ?>">
            <?= pk_h($st) ?>
          </a>
        <?php endforeach; ?>
      </div>
      <div class="flex gap-2">
        <input type="search" name="q" value="<?= pk_h($searchQuery) ?>" placeholder="Cari nama, no HP, alamat..." class="bespoke-input px-3.5 py-2 text-sm w-full sm:w-64" />
        <input type="hidden" name="status" value="<?= pk_h($filterStatus) ?>" />
        <button type="submit" class="bespoke-btn-primary px-4 py-2 rounded-xl text-xs font-bold">Cari</button>
      </div>
    </form>

    <!-- Leads List -->
    <?php if (empty($leads)): ?>
      <div class="bespoke-card p-10 text-center space-y-2">
        <i class="fa-regular fa-folder-open text-3xl text-gold" aria-hidden="true"></i>
        <p class="text-base font-bold text-ink-primary">Belum ada data pelanggan yang cocok.</p>
        <p class="text-sm text-ink-muted">Setiap pengisian formulir di halaman utama akan otomatis muncul di sini.</p>
      </div>
    <?php else: ?>
      <div class="grid gap-5">
        <?php foreach ($leads as $lead):
          $ans = json_decode((string) $lead['answers_json'], true) ?: [];
          $mapsUrl = '';
          if (preg_match('/^https?:\/\//i', (string) $lead['address'])) {
              $mapsUrl = (string) $lead['address'];
          } elseif (!empty($lead['gps_coords'])) {
              $mapsUrl = 'https://maps.google.com/?q=' . urlencode((string) $lead['gps_coords']);
          }
        ?>
          <article class="bespoke-card p-5 sm:p-6 grid lg:grid-cols-12 gap-5 items-start">
            <div class="lg:col-span-3">
              <?php if (!empty($lead['photo_filename'])): ?>
                <a href="admin.php?photo=<?= (int) $lead['id'] ?>" target="_blank" class="block relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 group">
                  <img src="admin.php?photo=<?= (int) $lead['id'] ?>" alt="Foto halaman <?= pk_h($lead['customer_name']) ?>" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <span class="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-bold">Perbesar</span>
                </a>
              <?php else: ?>
                <div class="aspect-[4/3] rounded-xl bg-elevated border border-emerald-900/10 flex flex-col items-center justify-center text-ink-muted text-xs font-semibold">
                  <i class="fa-regular fa-image text-2xl mb-1.5" aria-hidden="true"></i>
                  <span>Tanpa Foto Halaman</span>
                </div>
              <?php endif; ?>
            </div>

            <div class="lg:col-span-6 space-y-2.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2.5 py-1 rounded-lg bg-amber-500/15 text-gold text-xs font-extrabold"><?= pk_h($lead['ticket_code']) ?></span>
                <span class="px-2.5 py-1 rounded-lg bg-emerald-900/10 text-brand text-xs font-bold"><?= pk_h($lead['status']) ?></span>
                <span class="text-xs font-medium text-ink-muted"><?= pk_h($lead['created_at']) ?></span>
              </div>

              <h2 class="text-xl font-extrabold text-ink-primary"><?= pk_h($lead['customer_name']) ?></h2>

              <div class="flex flex-wrap gap-3 text-sm font-bold">
                <a href="tel:<?= pk_h($lead['phone']) ?>" class="text-brand hover:text-gold inline-flex items-center gap-1.5">
                  <i class="fa-solid fa-phone" aria-hidden="true"></i>
                  <span><?= pk_h($lead['phone']) ?></span>
                </a>
                <span class="text-ink-muted">&bull;</span>
                <span class="text-ink-primary"><?= pk_h($lead['district']) ?></span>
              </div>

              <p class="text-sm text-ink-secondary leading-relaxed">
                <strong>Alamat:</strong> <?= pk_h($lead['address']) ?>
                <?php if ($mapsUrl !== ''): ?>
                  <a href="<?= pk_h($mapsUrl) ?>" target="_blank" rel="noopener noreferrer" class="ml-2 text-xs font-bold text-gold underline">Buka Maps</a>
                <?php endif; ?>
              </p>

              <div class="grid sm:grid-cols-2 gap-2 text-xs pt-1">
                <div class="p-2.5 rounded-xl bg-elevated">
                  <span class="text-ink-muted font-bold block">Model Kanopi</span>
                  <span class="text-ink-primary font-bold"><?= pk_h($lead['canopy_model']) ?></span>
                </div>
                <div class="p-2.5 rounded-xl bg-elevated">
                  <span class="text-ink-muted font-bold block">Dimensi Halaman</span>
                  <span class="text-ink-primary font-bold"><?= pk_h((string) $lead['yard_length']) ?>m &times; <?= pk_h((string) $lead['yard_width']) ?>m (<?= pk_h((string) $lead['yard_area']) ?> m&sup2;) &bull; <?= pk_h($lead['yard_angle']) ?></span>
                </div>
              </div>

              <?php if (!empty($ans)): ?>
                <div class="text-xs text-ink-secondary space-y-1 pt-1">
                  <?php foreach ($ans as $k => $v): ?>
                    <span class="inline-block mr-2 mb-1 px-2.5 py-1 rounded-lg bg-emerald-950/5 border border-emerald-900/10">
                      <strong><?= pk_h((string) $k) ?>:</strong> <?= pk_h((string) $v) ?>
                    </span>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>

              <?php if (!empty($lead['yard_notes'])): ?>
                <p class="text-xs text-ink-secondary"><strong>Catatan:</strong> <?= pk_h($lead['yard_notes']) ?></p>
              <?php endif; ?>

              <?php if (!empty($lead['ai_notes'])): ?>
                <details class="text-xs text-ink-secondary pt-1">
                  <summary class="cursor-pointer font-bold text-gold">Lihat Analisa AI Halaman</summary>
                  <p class="mt-1.5 whitespace-pre-line p-3 rounded-xl bg-elevated"><?= pk_h($lead['ai_notes']) ?></p>
                </details>
              <?php endif; ?>
            </div>

            <div class="lg:col-span-3 flex flex-col gap-2.5">
              <form method="post" class="space-y-2">
                <input type="hidden" name="action" value="update_status" />
                <input type="hidden" name="csrf_token" value="<?= pk_h($_SESSION['pk_csrf']) ?>" />
                <input type="hidden" name="lead_id" value="<?= (int) $lead['id'] ?>" />
                <label class="block text-[11px] font-bold uppercase text-ink-muted">Ubah Status</label>
                <div class="flex gap-2">
                  <select name="status" class="bespoke-input px-3 py-2 text-xs font-bold flex-1">
                    <?php foreach (['Baru', 'Dihubungi', 'Survei', 'Selesai'] as $st): ?>
                      <option value="<?= $st ?>" <?= ($lead['status'] === $st) ? 'selected' : '' ?>><?= $st ?></option>
                    <?php endforeach; ?>
                  </select>
                  <button type="submit" class="bespoke-btn-primary px-3.5 py-2 rounded-xl text-xs font-bold">Simpan</button>
                </div>
              </form>

              <form method="post" onsubmit="return confirm('Hapus data pelanggan ini permanen?');">
                <input type="hidden" name="action" value="delete_lead" />
                <input type="hidden" name="csrf_token" value="<?= pk_h($_SESSION['pk_csrf']) ?>" />
                <input type="hidden" name="lead_id" value="<?= (int) $lead['id'] ?>" />
                <button type="submit" class="w-full bespoke-btn-outline py-2 rounded-xl text-xs font-bold text-red-700 border-red-500/30 hover:border-red-500">
                  <i class="fa-solid fa-trash-can mr-1.5" aria-hidden="true"></i> Hapus Data
                </button>
              </form>
            </div>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </main>
<?php endif; ?>
</body>
</html>
