#!/usr/bin/env node
/*
 * Yönetim paneli giriş bilgilerini sıfırlar.
 * Kullanım: node scripts/panel-sifre.js <kullanici-adi> <sifre>
 * content/panel.json dosyasını yeniden oluşturur. Kayıtlı GitHub ve istatistik anahtarları silinir;
 * panele girdikten sonra Ayarlar bölümünden yeniden eklenmeleri gerekir.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const [user, pass] = process.argv.slice(2);
if (!user || !pass) {
  console.error('Kullanım: node scripts/panel-sifre.js <kullanici-adi> <sifre>');
  process.exit(1);
}
const iter = 600000;
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(Buffer.from(user.trim().toLowerCase() + '\n' + pass, 'utf8'), salt, iter, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ct = Buffer.concat([cipher.update(JSON.stringify({ github: '', umami: '' }), 'utf8'), cipher.final(), cipher.getAuthTag()]);
const vault = { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: salt.toString('base64'), iv: iv.toString('base64'), data: ct.toString('base64') };
fs.writeFileSync(path.join(__dirname, '..', 'content', 'panel.json'), JSON.stringify(vault, null, 2) + '\n');
console.log('content/panel.json oluşturuldu.');
