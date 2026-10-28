<?php
// Ziyaretçi sayacı: sayfa görüntülemelerini anonim olarak kaydeder (ham IP adresi ve çerez saklanmaz).
define('YC', 1);
require __DIR__ . '/yonetim/cekirdek.php';

header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
function yc_bitir() { http_response_code(204); exit; }

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') yc_bitir();
if (!empty($_COOKIE['yc_yonetici'])) yc_bitir();                  // panel kullanıcısının kendi ziyaretleri sayılmaz

$ua = substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 400);
if ($ua === '' || preg_match('~bot|crawl|spider|slurp|scrape|facebookexternalhit|embedly|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python|java/|go-http|okhttp|axios|node-fetch|httpclient|phantom|selenium|playwright|puppeteer~i', $ua)) yc_bitir();

// Yalnızca bu siteden gelen istekler
$host = strtolower(preg_replace('~:\d+$~', '', (string)($_SERVER['HTTP_HOST'] ?? '')));
$kaynak = (string)($_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? ''));
if ($kaynak !== '') {
  $kh = strtolower((string)parse_url($kaynak, PHP_URL_HOST));
  if ($kh !== '' && $kh !== $host) yc_bitir();
}

$ham = file_get_contents('php://input', false, null, 0, 2048);
$g = json_decode((string)$ham, true);
if (!is_array($g)) yc_bitir();

$yol = (string)($g['p'] ?? '/');
$yol = preg_replace('~[?#].*$~', '', $yol);
if (!preg_match('~^/[A-Za-z0-9\-._/%]{0,200}$~', $yol) || yc_bas($yol, '/yonetim')) yc_bitir();
$yol = rawurldecode($yol);
if (substr($yol, -11) === '/index.html') $yol = substr($yol, 0, -10);

$ref = '';
$r = (string)($g['r'] ?? '');
if ($r !== '') {
  $rh = strtolower((string)parse_url($r, PHP_URL_HOST));
  $rh = preg_replace('~^(www\.|m\.|l\.|lm\.)~', '', $rh);
  if ($rh !== '' && $rh !== preg_replace('~^www\.~', '', $host)) $ref = substr($rh, 0, 80);
}

$w = (int)($g['w'] ?? 0);
if (preg_match('~iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))~i', $ua)) $cihaz = 't';
elseif (preg_match('~Mobi|iPhone|iPod|Android.*Mobile|Windows Phone~i', $ua) || ($w > 0 && $w < 768)) $cihaz = 'm';
else $cihaz = 'd';

$tarayici = 'Diğer';
foreach (['Edg/' => 'Edge', 'OPR/' => 'Opera', 'YaBrowser' => 'Yandex', 'SamsungBrowser' => 'Samsung', 'Firefox/' => 'Firefox', 'FxiOS' => 'Firefox', 'CriOS' => 'Chrome', 'Chrome/' => 'Chrome', 'Safari/' => 'Safari'] as $k => $ad) {
  if (strpos($ua, $k) !== false) { $tarayici = $ad; break; }
}
$sistem = 'Diğer';
foreach (['Windows' => 'Windows', 'iPhone' => 'iOS', 'iPad' => 'iOS', 'Android' => 'Android', 'Mac OS X' => 'macOS', 'CrOS' => 'ChromeOS', 'Linux' => 'Linux'] as $k => $ad) {
  if (strpos($ua, $k) !== false) { $sistem = $ad; break; }
}

if (!yc_veri_hazirla()) yc_bitir();
$gun = date('Y-m-d');
$ip = yc_ip();
$z = substr(hash('sha256', yc_tuz() . '|' . $gun . '|' . $ip . '|' . $ua), 0, 16);   // günlük değişen anonim kimlik

$konum = ['c' => '', 'ci' => '', 'rg' => ''];
if (is_file(YC_VERI . '/geo/dbip-city-lite.mmdb') || is_file(YC_VERI . '/geo/dbip-country-lite.mmdb')) {
  require __DIR__ . '/yonetim/mmdb.php';
  $konum = yc_konum($ip);
}

$kayit = ['t' => time(), 'p' => $yol, 'z' => $z, 'r' => $ref, 'd' => $cihaz, 'b' => $tarayici, 'o' => $sistem, 'c' => $konum['c'], 'ci' => $konum['ci'], 'rg' => $konum['rg']];
$dir = YC_VERI . '/istatistik';
yc_klasor($dir);
$dosya = $dir . '/' . $gun . '.jsonl.php';
$satir = json_encode($kayit, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
if (!is_file($dosya)) $satir = YC_KORUMA . $satir;
@file_put_contents($dosya, $satir, FILE_APPEND | LOCK_EX);

// Ara sıra 400 günden eski kayıtları temizle
if (mt_rand(1, 200) === 1) {
  $sinir = date('Y-m-d', time() - 400 * 86400);
  foreach ((array)glob($dir . '/*.jsonl.php') as $f) { if (basename($f) < $sinir) @unlink($f); }
}
yc_bitir();
