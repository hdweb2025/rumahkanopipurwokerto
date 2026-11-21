<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    pk_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

if (!pk_check_rate_limit('ai_visualize', 15, 600)) {
    pk_json(['ok' => false, 'error' => 'Terlalu banyak permintaan simulasi AI. Coba lagi beberapa menit lagi.'], 429);
}

if (!isset($_FILES['yard_photo'])) {
    pk_json(['ok' => false, 'error' => 'Silakan unggah foto halaman rumah terlebih dahulu.'], 400);
}

$imgCheck = pk_validate_uploaded_image($_FILES['yard_photo']);
if (!$imgCheck['ok']) {
    pk_json(['ok' => false, 'error' => $imgCheck['error']], 400);
}

$modelName = pk_clean_text($_POST['canopy_model'] ?? 'Kanopi Modern Minimalis', 120);
$roofMaterial = pk_clean_text($_POST['roof_material'] ?? '', 120);
$frameMaterial = pk_clean_text($_POST['frame_material'] ?? '', 120);
$yardAngle = pk_clean_text($_POST['yard_angle'] ?? 'Tampak Depan', 60);
$district = pk_clean_text($_POST['district'] ?? 'Purwokerto', 80);
$length = max(0, (float) ($_POST['yard_length'] ?? 0));
$width = max(0, (float) ($_POST['yard_width'] ?? 0));

$rawBytes = file_get_contents($imgCheck['tmp']);
if ($rawBytes === false) {
    pk_json(['ok' => false, 'error' => 'Gagal memproses file foto.'], 500);
}
$b64 = base64_encode($rawBytes);

function pk_call_gemini(string $model, array $payload): array
{
    $url = 'https://generativelanguage.googleapis.com/v1beta/models/' . rawurlencode($model) . ':generateContent?key=' . rawurlencode(PK_GEMINI_API_KEY);
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 45,
    ]);
    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        return ['http' => 0, 'error' => $curlErr ?: 'Koneksi ke layanan AI gagal.'];
    }
    $decoded = json_decode($raw, true);
    return ['http' => $httpCode, 'data' => is_array($decoded) ? $decoded : []];
}

// 1) Try Gemini Image Generation / Editing first
$editPrompt = sprintf(
    'Edit this Indonesian residential front yard photo (%s view) to realistically install a %s canopy (%s roof with %s structure) over the yard/carport area of roughly %.1fm x %.1fm. Preserve the existing house architecture, walls, gate, plants, driveway, lighting, and perspective accurately. Photorealistic architectural photography, no text or watermarks.',
    $yardAngle,
    $modelName,
    $roofMaterial ?: 'architectural',
    $frameMaterial ?: 'matte charcoal steel',
    $length > 0 ? $length : 5.0,
    $width > 0 ? $width : 4.0
);

$imageModels = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview'];
$quotaLimited = false;

foreach ($imageModels as $imgModel) {
    $res = pk_call_gemini($imgModel, [
        'contents' => [[
            'parts' => [
                ['text' => $editPrompt],
                ['inlineData' => ['mimeType' => $imgCheck['mime'], 'data' => $b64]],
            ],
        ]],
        'generationConfig' => [
            'responseModalities' => ['TEXT', 'IMAGE'],
        ],
    ]);

    if ($res['http'] === 200 && !empty($res['data']['candidates'][0]['content']['parts'])) {
        $genImage = null;
        $genMime = 'image/png';
        $genText = '';
        foreach ($res['data']['candidates'][0]['content']['parts'] as $part) {
            if (!empty($part['inlineData']['data'])) {
                $genImage = $part['inlineData']['data'];
                $genMime = $part['inlineData']['mimeType'] ?? 'image/png';
            } elseif (!empty($part['text'])) {
                $genText .= trim($part['text']) . "\n";
            }
        }
        if ($genImage !== null) {
            pk_json([
                'ok' => true,
                'mode' => 'image',
                'modelUsed' => $imgModel,
                'imageMime' => $genMime,
                'imageBase64' => $genImage,
                'analysis' => trim($genText) ?: "Simulasi visual {$modelName} berhasil diterapkan pada foto halaman rumah Anda.",
            ]);
        }
    }

    if ($res['http'] === 429) {
        $quotaLimited = true;
    }
}

// 2) Graceful fallback: Gemini Vision Architectural Analysis on the uploaded yard photo
$visionPrompt = sprintf(
    "Anda adalah arsitek spesialis kanopi dari Purwokerto Kanopi. Pelanggan mengunggah foto halaman rumah (%s) di wilayah %s dengan perkiraan dimensi %.1f x %.1f meter dan memilih model '%s' (atap: %s, rangka: %s).\n\nBerikan analisa ringkas namun sangat membantu dalam Bahasa Indonesia (maksimal 4 poin pendek):\n1. Penilaian kondisi halaman & titik tumpuan dinding/kolom dari foto.\n2. Kecocokan model '%s' dengan fasad rumah di foto ini.\n3. Saran kemiringan talang, arah tampias hujan, dan tinggi ideal rangka untuk iklim Purwokerto.\n4. Catatan persiapan sebelum tim survei lapangan datang.",
    $yardAngle,
    $district,
    $length > 0 ? $length : 5.0,
    $width > 0 ? $width : 4.0,
    $modelName,
    $roofMaterial ?: '-',
    $frameMaterial ?: '-',
    $modelName
);

$visionModels = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
foreach ($visionModels as $vModel) {
    $res = pk_call_gemini($vModel, [
        'contents' => [[
            'parts' => [
                ['text' => $visionPrompt],
                ['inlineData' => ['mimeType' => $imgCheck['mime'], 'data' => $b64]],
            ],
        ]],
    ]);

    if ($res['http'] === 200 && !empty($res['data']['candidates'][0]['content']['parts'][0]['text'])) {
        pk_json([
            'ok' => true,
            'mode' => 'vision',
            'modelUsed' => $vModel,
            'imageQuotaLimited' => $quotaLimited,
            'analysis' => trim($res['data']['candidates'][0]['content']['parts'][0]['text']),
        ]);
    }
}

pk_json([
    'ok' => false,
    'error' => 'Layanan AI sedang sibuk sementara. Anda tetap dapat langsung mengirim data halaman rumah dan nomor HP ke Admin.',
], 503);
