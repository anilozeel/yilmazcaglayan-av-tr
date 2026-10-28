#!/usr/bin/env node
/*
 * Siteyi üretir (Node 18+, bağımlılık yok).
 *   node build.js                     -> dist/ (veri-ilk/ başlangıç verisiyle)
 *   node build.js --out=_hosting --veri=_sunucu
 *       --veri: sunucudaki yönetim paneli verilerinin indirildiği klasör (*.json.php veya *.json)
 * Sayfa şablonu lib/render.js içindedir; yönetim paneli aynı dosyayı kullanarak siteyi sunucuda yeniden üretir.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { renderSite, birlestir } = require('./lib/render.js');

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || 'true']; }));
const ROOT = __dirname;
const OUT = path.resolve(ROOT, args.out || 'dist');
const VERI = args.veri ? path.resolve(ROOT, args.veri) : '';
const DOCS = ['site', 'anasayfa', 'alanlar', 'eserler', 'ozgecmis', 'sss', 'metinler', 'makaleler'];

function readDoc(name) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'veri-ilk', name + '.json'), 'utf8'));
  if (!VERI) return seed;
  for (const f of [name + '.json.php', name + '.json']) {
    const p = path.join(VERI, f);
    if (!fs.existsSync(p)) continue;
    let txt = fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
    if (txt.startsWith('<?php')) txt = txt.slice(txt.indexOf('?>') + 2);
    try { return birlestir(seed, JSON.parse(txt)); } catch (e) { console.warn(`! ${f} okunamadı, başlangıç verisi kullanılıyor: ${e.message}`); }
  }
  return seed;
}
const V = Object.fromEntries(DOCS.map(n => [n, readDoc(n)]));
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);

function copyDir(src, dst, skip = () => false) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    if (skip(f)) continue;
    const s = path.join(src, f), d = path.join(dst, f);
    fs.statSync(s).isDirectory() ? copyDir(s, d, skip) : fs.copyFileSync(s, d);
  }
}
const write = (rel, s) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), f => f.startsWith('src-') || f === '.DS_Store' || f === 'panel');

const files = renderSite(V, { cssV: ver('assets/css/style.css'), jsV: ver('assets/js/main.js'), noindex: args.noindex === 'true' });
for (const [rel, html] of Object.entries(files)) write(rel, html);

// Sunucu (PHP) dosyaları: yönetim paneli ve ziyaretçi sayacı
copyDir(path.join(ROOT, 'sunucu'), OUT);
copyDir(path.join(ROOT, 'veri-ilk'), path.join(OUT, 'yonetim', 'veri-ilk'));
fs.copyFileSync(path.join(ROOT, 'lib', 'render.js'), path.join(OUT, 'yonetim', 'render.js'));
fs.copyFileSync(path.join(ROOT, 'lib', 'icons.js'), path.join(OUT, 'yonetim', 'icons.js'));

write('.htaccess', `DirectoryIndex index.html index.php
ErrorDocument 404 /404.html
Options -Indexes
AddDefaultCharset UTF-8
<IfModule mod_mime.c>
  AddType image/webp .webp
  AddType image/svg+xml .svg
</IfModule>
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript text/javascript application/json image/svg+xml text/xml text/plain
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/javascript "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/webp "access plus 1 month"
  ExpiresByType image/svg+xml "access plus 1 month"
  ExpiresByType text/html "access plus 0 seconds"
  ExpiresByType application/json "access plus 0 seconds"
</IfModule>
<FilesMatch "\\.(mmdb|jsonl|log|md)$">
  <IfModule mod_authz_core.c>
    Require all denied
  </IfModule>
  <IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
  </IfModule>
</FilesMatch>
`);

const n = k => (V[k] || []).length;
console.log(`✓ ${path.relative(ROOT, OUT) || OUT} üretildi · ${Object.keys(files).length} sayfa · ${n('alanlar')} alan · ${(V.makaleler || []).filter(m => m.yayinda !== false).length} makale${VERI ? ' · sunucu verisi: ' + (fs.existsSync(VERI) ? 'var' : 'yok') : ''}`);
