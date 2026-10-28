<?php
// Bağımlılıksız MaxMind DB (.mmdb) okuyucu — DB-IP Lite ülke/şehir veritabanı için (PHP 7.4+).
if (!defined('YC')) { http_response_code(404); exit; }

class YcMmdb {
  private $f;
  private $nodeCount;
  private $recordSize;
  private $nodeBytes;
  private $treeSize;
  private $dataStart;
  private $ipVersion;
  private $ipv4Start = null;
  private $fileSize;
  public $meta;

  public function __construct($yol) {
    $this->f = @fopen($yol, 'rb');
    if (!$this->f) throw new Exception('Veritabanı açılamadı');
    $this->fileSize = filesize($yol);
    $okunacak = min(131072, $this->fileSize);
    fseek($this->f, $this->fileSize - $okunacak);
    $son = fread($this->f, $okunacak);
    $p = strrpos($son, "\xAB\xCD\xEFMaxMind.com");
    if ($p === false) throw new Exception('Geçersiz veritabanı');
    $metaStart = $this->fileSize - $okunacak + $p + 14;
    list($meta) = $this->decode($metaStart, $metaStart);
    $this->meta = $meta;
    $this->nodeCount = (int)$meta['node_count'];
    $this->recordSize = (int)$meta['record_size'];
    $this->ipVersion = (int)$meta['ip_version'];
    if (!in_array($this->recordSize, [24, 28, 32], true)) throw new Exception('Desteklenmeyen kayıt boyutu');
    $this->nodeBytes = $this->recordSize / 4;
    $this->treeSize = $this->nodeBytes * $this->nodeCount;
    $this->dataStart = $this->treeSize + 16;
  }

  public function __destruct() { if ($this->f) fclose($this->f); }

  private function read($offset, $len) {
    if ($len <= 0) return '';
    fseek($this->f, $offset);
    $s = fread($this->f, $len);
    if ($s === false || strlen($s) !== $len) throw new Exception('Okuma hatası');
    return $s;
  }

  private function uint($bytes) {
    $v = 0;
    $n = strlen($bytes);
    for ($i = 0; $i < $n; $i++) $v = ($v * 256) + ord($bytes[$i]);
    return $v;
  }

  private function record($node, $bit) {
    $b = $this->read($node * $this->nodeBytes, $this->nodeBytes);
    if ($this->recordSize === 24) return $this->uint(substr($b, $bit ? 3 : 0, 3));
    if ($this->recordSize === 32) return $this->uint(substr($b, $bit ? 4 : 0, 4));
    // 28 bit
    if ($bit === 0) return ((ord($b[3]) & 0xF0) << 20) | $this->uint(substr($b, 0, 3));
    return ((ord($b[3]) & 0x0F) << 24) | $this->uint(substr($b, 4, 3));
  }

  private function ipv4StartNode() {
    if ($this->ipv4Start !== null) return $this->ipv4Start;
    $node = 0;
    if ($this->ipVersion === 6) {
      for ($i = 0; $i < 96 && $node < $this->nodeCount; $i++) $node = $this->record($node, 0);
    }
    return $this->ipv4Start = $node;
  }

  public function lookup($ip) {
    $packed = @inet_pton($ip);
    if ($packed === false) return null;
    $bits = strlen($packed) * 8;
    if ($bits === 128 && $this->ipVersion === 4) return null;
    $node = $bits === 32 ? $this->ipv4StartNode() : 0;
    for ($i = 0; $i < $bits && $node < $this->nodeCount; $i++) {
      $bit = (ord($packed[$i >> 3]) >> (7 - ($i & 7))) & 1;
      $node = $this->record($node, $bit);
    }
    if ($node === $this->nodeCount) return null;
    if ($node < $this->nodeCount) return null;
    $off = $this->dataStart + ($node - $this->nodeCount - 16);
    if ($off >= $this->fileSize) return null;
    list($v) = $this->decode($off, $this->dataStart);
    return $v;
  }

  // [değer, sonraki konum]
  private function decode($off, $base) {
    $ctrl = ord($this->read($off, 1));
    $off++;
    $type = $ctrl >> 5;
    if ($type === 1) { // işaretçi
      $ss = ($ctrl >> 3) & 3;
      $vvv = $ctrl & 7;
      if ($ss === 0) { $p = ($vvv << 8) | ord($this->read($off, 1)); $off += 1; }
      elseif ($ss === 1) { $p = (($vvv << 16) | $this->uint($this->read($off, 2))) + 2048; $off += 2; }
      elseif ($ss === 2) { $p = (($vvv << 24) | $this->uint($this->read($off, 3))) + 526336; $off += 3; }
      else { $p = $this->uint($this->read($off, 4)); $off += 4; }
      list($v) = $this->decode($base + $p, $base);
      return [$v, $off];
    }
    if ($type === 0) { $type = 7 + ord($this->read($off, 1)); $off++; }
    $size = $ctrl & 0x1f;
    if ($size >= 29) {
      if ($size === 29) { $size = 29 + ord($this->read($off, 1)); $off += 1; }
      elseif ($size === 30) { $size = 285 + $this->uint($this->read($off, 2)); $off += 2; }
      else { $size = 65821 + $this->uint($this->read($off, 3)); $off += 3; }
    }
    switch ($type) {
      case 2: return [$this->read($off, $size), $off + $size];
      case 3: $u = unpack('E', $this->read($off, 8)); return [$u[1], $off + 8];
      case 4: return [$this->read($off, $size), $off + $size];
      case 5: case 6: case 9: case 10:
        return [$size ? $this->uint($this->read($off, $size)) : 0, $off + $size];
      case 8:
        $v = $size ? $this->uint($this->read($off, $size)) : 0;
        if ($size === 4 && $v >= 2147483648) $v -= 4294967296;
        return [$v, $off + $size];
      case 7:
        $m = [];
        for ($i = 0; $i < $size; $i++) {
          list($k, $off) = $this->decode($off, $base);
          list($v, $off) = $this->decode($off, $base);
          $m[(string)$k] = $v;
        }
        return [$m, $off];
      case 11:
        $a = [];
        for ($i = 0; $i < $size; $i++) { list($v, $off) = $this->decode($off, $base); $a[] = $v; }
        return [$a, $off];
      case 14: return [$size !== 0, $off];
      case 15: $u = unpack('G', $this->read($off, 4)); return [$u[1], $off + 4];
      default: return [null, $off + $size];
    }
  }
}

// Bir IP adresi için {c: ülke kodu, ci: şehir, rg: bölge} döndürür
function yc_konum($ip) {
  static $db = false;
  if ($db === false) {
    $db = null;
    foreach ([YC_VERI . '/geo/dbip-city-lite.mmdb', YC_VERI . '/geo/dbip-country-lite.mmdb'] as $yol) {
      if (is_file($yol)) { try { $db = new YcMmdb($yol); break; } catch (Exception $e) { $db = null; } }
    }
  }
  if (!$db) return ['c' => '', 'ci' => '', 'rg' => ''];
  try { $r = $db->lookup($ip); } catch (Exception $e) { $r = null; }
  if (!is_array($r)) return ['c' => '', 'ci' => '', 'rg' => ''];
  $ad = function ($x) {
    if (!is_array($x) || !isset($x['names']) || !is_array($x['names'])) return '';
    if (isset($x['names']['tr'])) return (string)$x['names']['tr'];
    if (isset($x['names']['en'])) return (string)$x['names']['en'];
    $v = reset($x['names']);
    return $v === false ? '' : (string)$v;
  };
  $c = isset($r['country']['iso_code']) ? (string)$r['country']['iso_code'] : '';
  $ci = isset($r['city']) ? $ad($r['city']) : '';
  $rg = isset($r['subdivisions'][0]) ? $ad($r['subdivisions'][0]) : '';
  return ['c' => substr($c, 0, 2), 'ci' => yc_kes($ci, 60), 'rg' => yc_kes($rg, 60)];
}
