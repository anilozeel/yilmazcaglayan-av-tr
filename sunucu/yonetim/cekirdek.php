<?php
// Yönetim paneli ve ziyaretçi sayacının ortak fonksiyonları (PHP 7.4+). Doğrudan açılamaz.
if (!defined('YC')) { http_response_code(404); exit; }

define('YC_KOK', dirname(__DIR__));                 // sitenin kök klasörü (public_html)
define('YC_VERI', YC_KOK . '/yc-veri');             // panel verileri (dışarıdan erişime kapalı)
define('YC_ILK', __DIR__ . '/veri-ilk');            // başlangıç verileri
define('YC_KORUMA', "<?php http_response_code(404); exit; ?>\n");
define('YC_BELGELER', 'site,anasayfa,alanlar,eserler,ozgecmis,sss,metinler,makaleler');

date_default_timezone_set('Europe/Istanbul');

function yc_kes($s, $n) { $s = (string)$s; return preg_match('/^.{0,' . (int)$n . '}/us', $s, $m) ? $m[0] : substr($s, 0, $n); }

function yc_bas($s, $on) { return strncmp($s, $on, strlen($on)) === 0; }

function yc_klasor($yol) {
  if (!is_dir($yol)) @mkdir($yol, 0755, true);
  return is_dir($yol);
}

// Veri klasörünü hazırlar ve dışarıdan erişimi kapatır
function yc_veri_hazirla() {
  static $hazir = false;
  if ($hazir) return true;
  if (!yc_klasor(YC_VERI)) return false;
  $ht = YC_VERI . '/.htaccess';
  if (!is_file($ht)) @file_put_contents($ht, "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n");
  if (!is_file(YC_VERI . '/index.html')) @file_put_contents(YC_VERI . '/index.html', '');
  $hazir = true;
  return true;
}

// Korumalı dosya: başında PHP çıkış satırı bulunur, tarayıcıdan açılırsa içerik gösterilmez
function yc_korumali_oku($dosya) {
  if (!is_file($dosya)) return null;
  $t = file_get_contents($dosya);
  if ($t === false) return null;
  if (yc_bas($t, '<?php')) { $p = strpos($t, '?>'); $t = $p === false ? '' : substr($t, $p + 2); }
  return ltrim($t, "\n");
}

function yc_atomik_yaz($dosya, $icerik) {
  yc_klasor(dirname($dosya));
  $gecici = $dosya . '.' . bin2hex(random_bytes(4)) . '.tmp';
  if (@file_put_contents($gecici, $icerik, LOCK_EX) === false) return false;
  @chmod($gecici, 0644);
  if (!@rename($gecici, $dosya)) {
    // bazı sistemlerde hedef varken rename başarısız olabilir
    $ok = @copy($gecici, $dosya);
    @unlink($gecici);
    return $ok;
  }
  return true;
}

function yc_json_oku($dosya) {
  $t = yc_korumali_oku($dosya);
  if ($t === null || $t === '') return null;
  $v = json_decode($t, true);
  return json_last_error() === JSON_ERROR_NONE ? $v : null;
}

function yc_json_yaz($dosya, $veri) {
  $j = json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
  if ($j === false) return false;
  return yc_atomik_yaz($dosya, YC_KORUMA . $j . "\n");
}

function yc_belge_gecerli($ad) { return in_array($ad, explode(',', YC_BELGELER), true); }

function yc_belge_oku($ad) {
  if (!yc_belge_gecerli($ad)) return null;
  return yc_json_oku(YC_VERI . '/' . $ad . '.json.php');
}

function yc_ilk_oku($ad) {
  if (!yc_belge_gecerli($ad)) return null;
  $f = YC_ILK . '/' . $ad . '.json';
  if (!is_file($f)) return null;
  $v = json_decode(file_get_contents($f), true);
  return is_array($v) ? $v : null;
}

function yc_belge_yaz($ad, $veri) {
  if (!yc_belge_gecerli($ad) || !yc_veri_hazirla()) return false;
  $dosya = YC_VERI . '/' . $ad . '.json.php';
  if (is_file($dosya)) {
    $yd = YC_VERI . '/yedek';
    yc_klasor($yd);
    @copy($dosya, $yd . '/' . $ad . '-' . date('Ymd-His') . '.json.php');
    $liste = glob($yd . '/' . $ad . '-*.json.php');
    if ($liste && count($liste) > 40) { sort($liste); foreach (array_slice($liste, 0, count($liste) - 40) as $eski) @unlink($eski); }
  }
  return yc_json_yaz($dosya, $veri);
}

// Gizli tuz: ziyaretçi kimliklerini anonimleştirmek için (ham IP saklanmaz)
function yc_tuz() {
  $f = YC_VERI . '/tuz.php';
  if (is_file($f)) { $t = trim((string)yc_korumali_oku($f)); if (strlen($t) >= 32) return $t; }
  yc_veri_hazirla();
  $t = bin2hex(random_bytes(32));
  @file_put_contents($f, YC_KORUMA . $t . "\n", LOCK_EX);
  return $t;
}

function yc_ip() { return isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '0.0.0.0'; }

function yc_https() {
  if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') return true;
  if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && strtolower($_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https') return true;
  return isset($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443;
}

function yc_json_cevap($veri, $kod = 200) {
  http_response_code($kod);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store, max-age=0');
  header('X-Content-Type-Options: nosniff');
  echo json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function yc_hata($mesaj, $kod = 400) { yc_json_cevap(['ok' => false, 'hata' => $mesaj], $kod); }
