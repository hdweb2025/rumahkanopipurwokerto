<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pk_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

// Anti-bot honeypot
if (!empty($_POST['website_url'])) {
    pk_json(['ok' => false, 'error' => 'Permintaan tidak valid.'], 400);
}

if (!pk_check_rate_limit('submit_lead', 10, 600)) {
    pk_json(['ok' => false, 'error' => 'Terlalu banyak pengiriman dalam waktu singkat. Mohon tunggu beberapa menit.'], 429);
}

$customerName = pk_clean_text($_POST['customer_name'] ?? '', 100);
$phoneRaw = pk_clean_text($_POST['phone'] ?? '', 30);
$phoneDigits = preg_replace('/[^0-9+]/', '', $phoneRaw) ?? '';
$district = pk_clean_text($_POST['district'] ?? '', 80);
$address = pk_clean_text($_POST['address'] ?? '', 350);
$gpsCoords = pk_clean_text($_POST['gps_coords'] ?? '', 80);
$canopyModel = pk_clean_text($_POST['canopy_model'] ?? '', 120);
$yardAngle = pk_clean_text($_POST['yard_angle'] ?? 'Tampak Depan', 60);
$yardLength = max(0, min(100, (float) ($_POST['yard_length'] ?? 0)));
$yardWidth = max(0, min(100, (float) ($_POST['yard_width'] ?? 0)));
$yardArea = round($yardLength * $yardWidth, 2);
$yardNotes = pk_clean_text($_POST['yard_notes'] ?? '', 600);
$aiNotes = pk_clean_text($_POST['ai_notes'] ?? '', 2000);
$answersRaw = (string) ($_POST['answers_json'] ?? '{}');
$answersDecoded = json_decode($answersRaw, true);
$answersJson = is_array($answersDecoded) ? json_encode($answersDecoded, JSON_UNESCAPED_UNICODE) : '{}';

if ($customerName === '' || mb_strlen($customerName, 'UTF-8') < 2) {
    pk_json(['ok' => false, 'error' => 'Mohon isi nama lengkap Anda.'], 422);
}

if (strlen(preg_replace('/\D/', '', $phoneDigits)) < 9) {
    pk_json(['ok' => false, 'error' => 'Mohon isi nomor HP / WhatsApp yang valid (minimal 9 digit).'], 422);
}

if ($address === '' || mb_strlen($address, 'UTF-8') < 5) {
    pk_json(['ok' => false, 'error' => 'Mohon isi alamat rumah atau link Google Maps Anda.'], 422);
}

if ($district === '') {
    $district = 'Purwokerto';
}
if ($canopyModel === '') {
    $canopyModel = 'Belum dipilih';
}

$photoFilename = '';
if (isset($_FILES['yard_photo']) && ($_FILES['yard_photo']['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
    $imgCheck = pk_validate_uploaded_image($_FILES['yard_photo']);
    if (!$imgCheck['ok']) {
        pk_json(['ok' => false, 'error' => $imgCheck['error']], 422);
    }
    pk_ensure_storage();
    $safeName = 'yard_' . date('Ymd_His') . '_' . bin2hex(random_bytes(8)) . '.' . $imgCheck['ext'];
    $destPath = PK_UPLOAD_DIR . '/' . $safeName;
    if (!move_uploaded_file($imgCheck['tmp'], $destPath)) {
        pk_json(['ok' => false, 'error' => 'Gagal menyimpan foto halaman rumah.'], 500);
    }
    $photoFilename = $safeName;
}

$ticketCode = 'PK-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));
$createdAt = date('Y-m-d H:i:s');

$pdo = pk_db();
$stmt = $pdo->prepare('
    INSERT INTO leads (
        ticket_code, customer_name, phone, district, address, gps_coords,
        canopy_model, yard_angle, yard_length, yard_width, yard_area,
        yard_notes, answers_json, ai_notes, photo_filename, status, ip_address, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->execute([
    $ticketCode,
    $customerName,
    $phoneDigits,
    $district,
    $address,
    $gpsCoords,
    $canopyModel,
    $yardAngle,
    $yardLength,
    $yardWidth,
    $yardArea,
    $yardNotes,
    $answersJson,
    $aiNotes,
    $photoFilename,
    'Baru',
    pk_client_ip(),
    $createdAt,
]);

pk_json([
    'ok' => true,
    'ticketCode' => $ticketCode,
    'message' => 'Data halaman rumah, alamat, dan nomor HP berhasil dikirim. Admin Purwokerto Kanopi akan segera menghubungi Anda.',
]);
