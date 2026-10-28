<?php
// Yönetim paneli giriş noktası
define('YC', 1);
require __DIR__ . '/cekirdek.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; frame-src 'self' https://www.google.com https://maps.google.com; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'");
$v = function ($f) { $p = __DIR__ . '/' . $f; return is_file($p) ? substr(md5_file($p), 0, 8) : '1'; };
?><!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Yönetim Paneli | Av. Yılmaz Çağlayan</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#0B1324">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600&display=swap">
<link rel="stylesheet" href="panel.css?v=<?= $v('panel.css') ?>">
</head>
<body>
<div id="app" aria-live="polite"><div class="boot"><span class="spin"></span> Yükleniyor…</div></div>
<noscript><p class="boot">Yönetim panelini kullanmak için tarayıcınızda JavaScript açık olmalıdır.</p></noscript>
<script src="icons.js?v=<?= $v('icons.js') ?>"></script>
<script src="render.js?v=<?= $v('render.js') ?>"></script>
<script src="p-temel.js?v=<?= $v('p-temel.js') ?>"></script>
<script src="p-form.js?v=<?= $v('p-form.js') ?>"></script>
<script src="p-bolum.js?v=<?= $v('p-bolum.js') ?>"></script>
</body>
</html>
