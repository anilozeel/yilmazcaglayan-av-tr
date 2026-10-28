<?php
// Yönetim paneli API'si (PHP 7.4+). Tüm istekler oturum ve güvenlik anahtarı ile korunur.
define('YC', 1);
require __DIR__ . '/cekirdek.php';

header('X-Robots-Tag: noindex, nofollow');
header('Referrer-Policy: same-origin');

$eylem = isset($_GET['a']) ? (string)$_GET['a'] : '';
$yontem = $_SERVER['REQUEST_METHOD'] ?? 'GET';

/* ---------------- oturum ---------------- */
yc_veri_hazirla();
$oturumDizin = YC_VERI . '/oturum';
if (yc_klasor($oturumDizin) && is_writable($oturumDizin)) {
  @file_put_contents($oturumDizin . '/.htaccess', "Require all denied\n");
  session_save_path($oturumDizin);
}
ini_set('session.gc_maxlifetime', '43200');
ini_set('session.use_strict_mode', '1');
session_name('YCPANEL');
session_set_cookie_params(['lifetime' => 0, 'path' => '/yonetim/', 'secure' => yc_https(), 'httponly' => true, 'samesite' => 'Strict']);
@session_start();

function yc_kullanici_bilgisi() {
  $f = YC_VERI . '/kullanici.php';
  if (is_file($f)) { $k = include $f; if (is_array($k) && !empty($k['ozet'])) return $k; }
  return include __DIR__ . '/kullanici-ilk.php';
}

function yc_girisli() {
  if (empty($_SESSION['giris']) || empty($_SESSION['kullanici'])) return false;
  if (time() - (int)($_SESSION['son'] ?? 0) > 12 * 3600) { $_SESSION = []; return false; }
  $_SESSION['son'] = time();
  return true;
}

function yc_girdi() {
  static $g = null;
  if ($g !== null) return $g;
  $ham = file_get_contents('php://input');
  $g = json_decode((string)$ham, true);
  if (!is_array($g)) $g = [];
  return $g;
}

function yc_csrf() {
  if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(24));
  return $_SESSION['csrf'];
}

function yc_post_kontrol($oturumGerekli = true) {
  global $yontem;
  if ($yontem !== 'POST') yc_hata('Geçersiz istek yöntemi.', 405);
  if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'yc-panel') yc_hata('Geçersiz istek.', 403);
  if ($oturumGerekli) {
    if (!yc_girisli()) yc_hata('Oturumunuz sona erdi. Lütfen yeniden giriş yapın.', 401);
    $t = (string)($_SERVER['HTTP_X_YC_TOKEN'] ?? '');
    if ($t === '' || !hash_equals(yc_csrf(), $t)) yc_hata('Güvenlik anahtarı geçersiz. Sayfayı yenileyin.', 403);
  }
}

function yc_get_kontrol() {
  if (!yc_girisli()) yc_hata('Oturumunuz sona erdi. Lütfen yeniden giriş yapın.', 401);
}

/* ---------------- giriş denemesi sınırı ---------------- */
function yc_deneme_dosyasi() { return YC_VERI . '/giris-denemeleri.dat.php'; }
function yc_denemeler() {
  $d = yc_json_oku(yc_deneme_dosyasi());
  if (!is_array($d)) $d = [];
  $sinir = time() - 900;
  foreach ($d as $k => $liste) { $d[$k] = array_values(array_filter((array)$liste, function ($t) use ($sinir) { return $t > $sinir; })); if (!$d[$k]) unset($d[$k]); }
  return $d;
}
function yc_ip_anahtar() { return substr(hash('sha256', yc_tuz() . '|giris|' . yc_ip()), 0, 20); }

/* ---------------- yardımcılar ---------------- */
function yc_surum() {
  $v = function ($f) { $p = YC_KOK . '/' . $f; return is_file($p) ? substr(md5_file($p), 0, 8) : '1'; };
  return ['cssV' => $v('assets/css/style.css'), 'jsV' => $v('assets/js/main.js')];
}

function yc_ortam() {
  $gd = function_exists('imagecreatetruecolor');
  return [
    'php' => PHP_VERSION,
    'gd' => $gd,
    'webp' => $gd && function_exists('imagecreatefromwebp'),
    'yazilabilir' => is_writable(YC_KOK) && (!is_file(YC_KOK . '/index.html') || is_writable(YC_KOK . '/index.html')),
    'veriYazilabilir' => is_writable(YC_VERI),
    'konum' => is_file(YC_VERI . '/geo/dbip-city-lite.mmdb') || is_file(YC_VERI . '/geo/dbip-country-lite.mmdb'),
    'https' => yc_https(),
    'yuklemeSiniri' => ini_get('upload_max_filesize'),
  ];
}

function yc_sayfa_gecerli($rel) {
  return (bool)preg_match('~^(index\.html|404\.html|sitemap\.xml|robots\.txt|(calisma-alanlari|makaleler)(/[a-z0-9-]+)?/index\.html|(hakkimda|yayimlanmis-eserler|sikca-sorulan-sorular|iletisim)/index\.html)$~', $rel);
}

function yc_slug($s) {
  $s = strtr((string)$s, ['ç' => 'c', 'Ç' => 'c', 'ğ' => 'g', 'Ğ' => 'g', 'ı' => 'i', 'I' => 'i', 'İ' => 'i', 'ö' => 'o', 'Ö' => 'o', 'ş' => 's', 'Ş' => 's', 'ü' => 'u', 'Ü' => 'u', 'â' => 'a', 'î' => 'i', 'û' => 'u']);
  $s = strtolower($s);
  $s = preg_replace('~[^a-z0-9]+~', '-', $s);
  return trim(substr(trim($s, '-'), 0, 50), '-');
}

/* ---------------- görsel yükleme ---------------- */
function yc_gorsel_kaydet($dosya, $tur) {
  if (!isset($dosya['tmp_name']) || !is_uploaded_file($dosya['tmp_name'])) {
    $kod = isset($dosya['error']) ? (int)$dosya['error'] : -1;
    if ($kod === UPLOAD_ERR_INI_SIZE || $kod === UPLOAD_ERR_FORM_SIZE) yc_hata('Görsel çok büyük. Sunucunun izin verdiği en büyük boyut: ' . ini_get('upload_max_filesize'));
    yc_hata('Görsel yüklenemedi.');
  }
  if ($dosya['size'] > 20 * 1024 * 1024) yc_hata('Görsel 20 MB\'den büyük olamaz.');
  $bilgi = @getimagesize($dosya['tmp_name']);
  if (!$bilgi) yc_hata('Dosya bir görsel değil. JPG, PNG veya WEBP yükleyin.');
  $tip = (int)$bilgi[2];
  $uzantilar = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif'];
  if (defined('IMAGETYPE_WEBP')) $uzantilar[IMAGETYPE_WEBP] = 'webp';
  if (!isset($uzantilar[$tip])) yc_hata('Desteklenmeyen görsel türü. JPG, PNG veya WEBP yükleyin.');
  $w = (int)$bilgi[0]; $h = (int)$bilgi[1];
  if ($w < 1 || $h < 1 || $w * $h > 60000000) yc_hata('Görsel boyutları geçersiz.');

  $enFazla = ['slayt' => 2400, 'kapak' => 1200, 'portre' => 1800, 'makale' => 1800][$tur] ?? 1800;
  $ad = yc_slug(pathinfo((string)$dosya['name'], PATHINFO_FILENAME)) ?: 'gorsel';
  $altKlasor = 'yuklemeler/' . date('Y') . '/' . date('m');
  $hedefDizin = YC_KOK . '/' . $altKlasor;
  if (!yc_klasor($hedefDizin)) yc_hata('Yükleme klasörü oluşturulamadı (sunucu yazma izni).', 500);
  $kok = YC_KOK . '/yuklemeler/.htaccess';
  if (!is_file($kok)) @file_put_contents($kok, "Options -Indexes\n<FilesMatch \"\\.(php|php\\d|phtml|phar|pl|py|cgi|sh|htaccess)$\">\n  Require all denied\n</FilesMatch>\n");
  $rasgele = substr(bin2hex(random_bytes(4)), 0, 6);

  $gd = function_exists('imagecreatetruecolor');
  $okuyucu = [IMAGETYPE_JPEG => 'imagecreatefromjpeg', IMAGETYPE_PNG => 'imagecreatefrompng', IMAGETYPE_GIF => 'imagecreatefromgif'];
  if (defined('IMAGETYPE_WEBP')) $okuyucu[IMAGETYPE_WEBP] = 'imagecreatefromwebp';
  if ($gd && $tip !== IMAGETYPE_GIF && function_exists($okuyucu[$tip])) {
    @ini_set('memory_limit', '512M');
    $kaynak = @call_user_func($okuyucu[$tip], $dosya['tmp_name']);
    if ($kaynak) {
      // Telefon fotoğraflarının yönünü düzelt
      if ($tip === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $exif = @exif_read_data($dosya['tmp_name']);
        $yon = isset($exif['Orientation']) ? (int)$exif['Orientation'] : 1;
        $aci = [3 => 180, 6 => -90, 8 => 90][$yon] ?? 0;
        if ($aci) { $d = imagerotate($kaynak, $aci, 0); if ($d) { imagedestroy($kaynak); $kaynak = $d; } }
      }
      $w = imagesx($kaynak); $h = imagesy($kaynak);
      $oran = min(1, $enFazla / max($w, $h));
      $nw = max(1, (int)round($w * $oran)); $nh = max(1, (int)round($h * $oran));
      $saydam = $tip === IMAGETYPE_PNG && yc_saydam_mi($kaynak);
      $hedef = imagecreatetruecolor($nw, $nh);
      if ($saydam) { imagealphablending($hedef, false); imagesavealpha($hedef, true); imagefill($hedef, 0, 0, imagecolorallocatealpha($hedef, 0, 0, 0, 127)); }
      else imagefill($hedef, 0, 0, imagecolorallocate($hedef, 255, 255, 255));
      imagecopyresampled($hedef, $kaynak, 0, 0, 0, 0, $nw, $nh, $w, $h);
      imagedestroy($kaynak);
      $uz = $saydam ? 'png' : 'jpg';
      $rel = $altKlasor . '/' . $ad . '-' . $rasgele . '.' . $uz;
      if ($saydam) $ok = imagepng($hedef, YC_KOK . '/' . $rel, 8);
      else { imageinterlace($hedef, true); $ok = imagejpeg($hedef, YC_KOK . '/' . $rel, 84); }
      imagedestroy($hedef);
      if (!$ok) yc_hata('Görsel kaydedilemedi.', 500);
      @chmod(YC_KOK . '/' . $rel, 0644);
      return ['yol' => '/' . $rel, 'genislik' => $nw, 'yukseklik' => $nh];
    }
  }
  if ($dosya['size'] > 8 * 1024 * 1024) yc_hata('Sunucuda görsel küçültme desteği yok; lütfen 8 MB\'den küçük bir görsel yükleyin.');
  $rel = $altKlasor . '/' . $ad . '-' . $rasgele . '.' . $uzantilar[$tip];
  if (!@move_uploaded_file($dosya['tmp_name'], YC_KOK . '/' . $rel)) yc_hata('Görsel kaydedilemedi.', 500);
  @chmod(YC_KOK . '/' . $rel, 0644);
  return ['yol' => '/' . $rel, 'genislik' => $w, 'yukseklik' => $h];
}

function yc_saydam_mi($im) {
  $w = imagesx($im); $h = imagesy($im);
  $adim = max(1, (int)floor(max($w, $h) / 60));
  for ($x = 0; $x < $w; $x += $adim) for ($y = 0; $y < $h; $y += $adim) {
    if (((imagecolorat($im, $x, $y) >> 24) & 0x7F) > 0) return true;
  }
  return false;
}

function yc_gorsel_listesi() {
  $sonuc = [];
  $kok = YC_KOK . '/yuklemeler';
  if (is_dir($kok)) {
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($kok, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
      if (!$f->isFile() || !preg_match('~\.(jpe?g|png|webp|gif)$~i', $f->getFilename())) continue;
      $rel = '/yuklemeler/' . str_replace('\\', '/', substr($f->getPathname(), strlen($kok) + 1));
      $sonuc[] = ['yol' => $rel, 'boyut' => $f->getSize(), 'tarih' => $f->getMTime()];
    }
  }
  usort($sonuc, function ($a, $b) { return $b['tarih'] - $a['tarih']; });
  return array_slice($sonuc, 0, 600);
}

/* ---------------- istatistik ---------------- */
function yc_istatistik($gunSayisi) {
  $gunSayisi = max(1, min(366, $gunSayisi));
  $dir = YC_VERI . '/istatistik';
  $bugun = date('Y-m-d');
  $gunluk = []; $sayfalar = []; $ulkeler = []; $sehirler = []; $bolgeler = []; $kaynaklar = []; $cihazlar = []; $tarayicilar = []; $sistemler = []; $saatler = array_fill(0, 24, 0);
  $toplamZ = 0; $toplamG = 0; $simdi = []; $bugunZ = 0; $bugunG = 0;
  $simdiSinir = time() - 300;
  for ($i = $gunSayisi - 1; $i >= 0; $i--) {
    $gun = date('Y-m-d', strtotime($bugun . ' -' . $i . ' day'));
    $z = []; $g = 0;
    $f = $dir . '/' . $gun . '.jsonl.php';
    if (is_file($f) && ($h = @fopen($f, 'r'))) {
      while (($satir = fgets($h)) !== false) {
        if ($satir[0] !== '{') continue;
        $k = json_decode($satir, true);
        if (!is_array($k) || empty($k['z'])) continue;
        $g++;
        $yeni = !isset($z[$k['z']]);
        $z[$k['z']] = 1;
        $p = (string)($k['p'] ?? '/');
        if (!isset($sayfalar[$p])) $sayfalar[$p] = ['g' => 0, 'z' => []];
        $sayfalar[$p]['g']++;
        $sayfalar[$p]['z'][$gun . $k['z']] = 1;
        if ($yeni) {
          $c = (string)($k['c'] ?? ''); $ulkeler[$c] = ($ulkeler[$c] ?? 0) + 1;
          $ci = trim((string)($k['ci'] ?? '')); if ($ci !== '') { $key = $ci . '|' . $c; $sehirler[$key] = ($sehirler[$key] ?? 0) + 1; }
          $rg = trim((string)($k['rg'] ?? '')); if ($rg !== '') { $key = $rg . '|' . $c; $bolgeler[$key] = ($bolgeler[$key] ?? 0) + 1; }
          $r = (string)($k['r'] ?? ''); $kaynaklar[$r] = ($kaynaklar[$r] ?? 0) + 1;
          $d = (string)($k['d'] ?? 'd'); $cihazlar[$d] = ($cihazlar[$d] ?? 0) + 1;
          $b = (string)($k['b'] ?? 'Diğer'); $tarayicilar[$b] = ($tarayicilar[$b] ?? 0) + 1;
          $o = (string)($k['o'] ?? 'Diğer'); $sistemler[$o] = ($sistemler[$o] ?? 0) + 1;
        }
        $t = (int)($k['t'] ?? 0);
        if ($t) $saatler[(int)date('G', $t)]++;
        if ($t >= $simdiSinir) $simdi[$k['z']] = 1;
      }
      fclose($h);
    }
    $gunluk[] = ['g' => $gun, 'z' => count($z), 'v' => $g];
    $toplamZ += count($z); $toplamG += $g;
    if ($gun === $bugun) { $bugunZ = count($z); $bugunG = $g; }
  }
  $sirala = function ($dizi, $n = 15) {
    arsort($dizi);
    $o = [];
    foreach (array_slice($dizi, 0, $n, true) as $k => $v) $o[] = [(string)$k, $v];
    return $o;
  };
  $sayfaListe = [];
  foreach ($sayfalar as $p => $s) $sayfaListe[] = [$p, $s['g'], count($s['z'])];
  usort($sayfaListe, function ($a, $b) { return $b[1] - $a[1]; });
  return [
    'ok' => true, 'gun' => $gunSayisi,
    'toplam' => ['ziyaretci' => $toplamZ, 'goruntuleme' => $toplamG, 'bugunZiyaretci' => $bugunZ, 'bugunGoruntuleme' => $bugunG, 'simdi' => count($simdi)],
    'gunluk' => $gunluk,
    'sayfalar' => array_slice($sayfaListe, 0, 25),
    'ulkeler' => $sirala($ulkeler, 30), 'sehirler' => $sirala($sehirler, 30), 'bolgeler' => $sirala($bolgeler, 20),
    'kaynaklar' => $sirala($kaynaklar, 20), 'cihazlar' => $sirala($cihazlar, 5), 'tarayicilar' => $sirala($tarayicilar, 8), 'sistemler' => $sirala($sistemler, 8),
    'saatler' => $saatler,
    'konumVeritabani' => is_file(YC_VERI . '/geo/dbip-city-lite.mmdb') || is_file(YC_VERI . '/geo/dbip-country-lite.mmdb'),
  ];
}

/* ================= EYLEMLER ================= */
switch ($eylem) {

  case 'durum':
    $k = yc_kullanici_bilgisi();
    if (!yc_girisli()) yc_json_cevap(['ok' => true, 'girisli' => false, 'ortam' => ['yazilabilir' => is_writable(YC_KOK), 'veri' => is_dir(YC_VERI) && is_writable(YC_VERI)]]);
    yc_json_cevap(['ok' => true, 'girisli' => true, 'kullanici' => $_SESSION['kullanici'], 'csrf' => yc_csrf(), 'ilkSifre' => !empty($k['ilk'])]);

  case 'giris':
    yc_post_kontrol(false);
    if (!yc_veri_hazirla() || !is_writable(YC_VERI)) yc_hata('Sunucuda veri klasörü oluşturulamadı (yazma izni yok). Hosting dosya izinlerini kontrol edin.', 500);
    $den = yc_denemeler();
    $ipk = yc_ip_anahtar();
    if (count($den[$ipk] ?? []) >= 8) yc_hata('Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.', 429);
    $g = yc_girdi();
    $ku = trim((string)($g['kullanici'] ?? ''));
    $si = (string)($g['sifre'] ?? '');
    $k = yc_kullanici_bilgisi();
    usleep(250000);
    if ($ku === '' || $si === '' || !hash_equals(strtolower((string)$k['kullanici']), strtolower($ku)) || !password_verify($si, (string)$k['ozet'])) {
      $den[$ipk][] = time();
      yc_json_yaz(yc_deneme_dosyasi(), $den);
      yc_hata('Kullanıcı adı veya şifre hatalı.', 401);
    }
    unset($den[$ipk]);
    yc_json_yaz(yc_deneme_dosyasi(), $den);
    session_regenerate_id(true);
    $_SESSION = ['giris' => true, 'kullanici' => (string)$k['kullanici'], 'son' => time(), 'csrf' => bin2hex(random_bytes(24))];
    // Panel kullanıcısının siteyi gezerken ziyaretçi sayısına eklenmemesi için işaret
    setcookie('yc_yonetici', '1', ['expires' => time() + 365 * 86400, 'path' => '/', 'secure' => yc_https(), 'httponly' => true, 'samesite' => 'Lax']);
    yc_json_cevap(['ok' => true, 'kullanici' => $_SESSION['kullanici'], 'csrf' => $_SESSION['csrf'], 'ilkSifre' => !empty($k['ilk'])]);

  case 'cikis':
    yc_post_kontrol();
    $_SESSION = [];
    session_destroy();
    yc_json_cevap(['ok' => true]);

  case 'veri':
    yc_get_kontrol();
    $veri = []; $ilk = [];
    foreach (explode(',', YC_BELGELER) as $ad) { $veri[$ad] = yc_belge_oku($ad); $ilk[$ad] = yc_ilk_oku($ad); }
    yc_json_cevap(['ok' => true, 'veri' => $veri, 'ilk' => $ilk, 'surum' => yc_surum(), 'ortam' => yc_ortam()]);

  case 'kaydet':
    yc_post_kontrol();
    $g = yc_girdi();
    $ad = (string)($g['ad'] ?? '');
    if (!yc_belge_gecerli($ad)) yc_hata('Geçersiz kayıt türü.');
    if (!array_key_exists('icerik', $g) || !is_array($g['icerik'])) yc_hata('Kaydedilecek içerik bulunamadı.');
    if (strlen(json_encode($g['icerik'])) > 4 * 1024 * 1024) yc_hata('İçerik çok büyük.');
    if (!yc_belge_yaz($ad, $g['icerik'])) yc_hata('Kayıt yazılamadı (sunucu yazma izni).', 500);
    yc_json_cevap(['ok' => true]);

  case 'yayinla':
    yc_post_kontrol();
    $g = yc_girdi();
    $dosyalar = $g['dosyalar'] ?? null;
    if (!is_array($dosyalar) || !isset($dosyalar['index.html'])) yc_hata('Yayımlanacak sayfalar eksik.');
    $yazilan = 0; $hatali = [];
    foreach ($dosyalar as $rel => $icerik) {
      $rel = (string)$rel;
      if (!yc_sayfa_gecerli($rel) || !is_string($icerik) || strlen($icerik) > 3 * 1024 * 1024) { $hatali[] = $rel; continue; }
      if (yc_atomik_yaz(YC_KOK . '/' . $rel, $icerik)) $yazilan++; else $hatali[] = $rel;
    }
    // Silinen makale / alan sayfalarını kaldır
    $silinen = [];
    foreach (['makaleler', 'calisma-alanlari'] as $ust) {
      foreach ((array)glob(YC_KOK . '/' . $ust . '/*/index.html') as $f) {
        $rel = $ust . '/' . basename(dirname($f)) . '/index.html';
        if (!yc_sayfa_gecerli($rel) || isset($dosyalar[$rel])) continue;
        if (@unlink($f)) { $silinen[] = $rel; @rmdir(dirname($f)); }
      }
    }
    if ($hatali) yc_json_cevap(['ok' => false, 'hata' => count($hatali) . ' sayfa yazılamadı. Sunucu dosya izinlerini kontrol edin.', 'hatali' => array_slice($hatali, 0, 10), 'yazilan' => $yazilan], 500);
    yc_json_cevap(['ok' => true, 'yazilan' => $yazilan, 'silinen' => $silinen]);

  case 'yukle':
    yc_post_kontrol();
    if (empty($_FILES['dosya'])) yc_hata('Görsel seçilmedi veya sunucu sınırını aşıyor (' . ini_get('post_max_size') . ').');
    $tur = preg_replace('~[^a-z]~', '', (string)($_POST['tur'] ?? 'makale'));
    yc_json_cevap(['ok' => true] + yc_gorsel_kaydet($_FILES['dosya'], $tur));

  case 'gorseller':
    yc_get_kontrol();
    yc_json_cevap(['ok' => true, 'gorseller' => yc_gorsel_listesi()]);

  case 'gorsel_sil':
    yc_post_kontrol();
    $yol = (string)(yc_girdi()['yol'] ?? '');
    if (!preg_match('~^/yuklemeler/\d{4}/\d{2}/[a-z0-9-]+\.(jpe?g|png|webp|gif)$~', $yol)) yc_hata('Geçersiz görsel.');
    if (!is_file(YC_KOK . $yol) || !@unlink(YC_KOK . $yol)) yc_hata('Görsel silinemedi.');
    yc_json_cevap(['ok' => true]);

  case 'istatistik':
    yc_get_kontrol();
    yc_json_cevap(yc_istatistik((int)($_GET['gun'] ?? 30)));

  case 'sifre':
    yc_post_kontrol();
    $g = yc_girdi();
    $k = yc_kullanici_bilgisi();
    if (!password_verify((string)($g['mevcut'] ?? ''), (string)$k['ozet'])) yc_hata('Mevcut şifre hatalı.');
    $yeni = (string)($g['yeni'] ?? '');
    if (strlen($yeni) < 8) yc_hata('Yeni şifre en az 8 karakter olmalı.');
    if ($yeni === (string)($g['mevcut'] ?? '')) yc_hata('Yeni şifre eskisiyle aynı olamaz.');
    $ad = trim((string)($g['kullanici'] ?? $k['kullanici']));
    if (!preg_match('~^[A-Za-z0-9._@-]{3,40}$~', $ad)) yc_hata('Kullanıcı adı 3-40 karakter olmalı; harf, rakam ve . _ - @ içerebilir.');
    $icerik = "<?php\nif (!defined('YC')) { http_response_code(404); exit; }\nreturn " . var_export(['kullanici' => $ad, 'ozet' => password_hash($yeni, PASSWORD_DEFAULT), 'ilk' => false, 'tarih' => date('c')], true) . ";\n";
    if (!yc_atomik_yaz(YC_VERI . '/kullanici.php', $icerik)) yc_hata('Şifre kaydedilemedi (sunucu yazma izni).', 500);
    if (function_exists('opcache_invalidate')) @opcache_invalidate(YC_VERI . '/kullanici.php', true);
    $_SESSION['kullanici'] = $ad;
    yc_json_cevap(['ok' => true, 'kullanici' => $ad]);

  case 'yedekler':
    yc_get_kontrol();
    $ad = (string)($_GET['ad'] ?? '');
    if (!yc_belge_gecerli($ad)) yc_hata('Geçersiz kayıt türü.');
    $liste = (array)glob(YC_VERI . '/yedek/' . $ad . '-*.json.php');
    rsort($liste);
    $o = [];
    foreach ($liste as $f) {
      if (preg_match('~-(\d{8})-(\d{6})\.json\.php$~', $f, $m)) $o[] = ['dosya' => basename($f), 'tarih' => substr($m[1], 0, 4) . '-' . substr($m[1], 4, 2) . '-' . substr($m[1], 6, 2) . ' ' . substr($m[2], 0, 2) . ':' . substr($m[2], 2, 2), 'boyut' => filesize($f)];
    }
    yc_json_cevap(['ok' => true, 'yedekler' => $o]);

  case 'yedek_oku':
    yc_get_kontrol();
    $dosya = basename((string)($_GET['dosya'] ?? ''));
    if (!preg_match('~^([a-z]+)-\d{8}-\d{6}\.json\.php$~', $dosya, $m) || !yc_belge_gecerli($m[1])) yc_hata('Geçersiz yedek.');
    $v = yc_json_oku(YC_VERI . '/yedek/' . $dosya);
    if ($v === null) yc_hata('Yedek okunamadı.');
    yc_json_cevap(['ok' => true, 'ad' => $m[1], 'icerik' => $v]);

  default:
    yc_hata('Bilinmeyen işlem.', 404);
}
