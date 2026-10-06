# yilmazcaglayan.av.tr

Av. Yılmaz Çağlayan – Muğla Milas Avukatlık Bürosu web sitesi. Bağımlılık gerektirmeyen statik site.

## Çalıştırma (localhost)
- Windows: `baslat.bat` dosyasına çift tıklayın → http://localhost:8080
- Komut satırı: `node build.js` (siteyi `dist/` klasörüne üretir), ardından `node server.js`

`dist/` klasörü hazır sitedir; sunucuya yüklenecek olan budur.

## İçerik güncelleme
Tüm içerik `content/` klasöründedir. Değişiklikten sonra `node build.js` çalıştırın.

| Dosya | İçerik |
|---|---|
| `content/site.js` | Telefon, e-posta, adres, çalışma saatleri, **Google Analytics** ve **Search Console** kodları |
| `content/alanlar.js` | Çalışma alanları (yeni alan = listeye yeni kayıt) |
| `content/eserler.js` | Kitaplar |
| `content/sss.js` | Sıkça sorulan sorular ve sorumluluk reddi |
| `content/makaleler/*.md` | Makaleler |

### Yeni makale eklemek
`content/makaleler/` içine yeni bir `.md` dosyası ekleyin (ör. `12-yeni-makale.md`):

```
---
title: Makale başlığı
date: 2026-11-01
area: ceza-hukuku
related: hukuki-danismanlik
description: Google'da görünecek 150-160 karakterlik açıklama.
---
Giriş paragrafı...

## Ara başlık

Paragraf... **kalın** yazı için iki yıldız.

* liste maddesi
> Öne çıkan alıntı
```
`area` / `related` değerleri `content/alanlar.js` içindeki `slug` alanlarıdır. Makale; listeye, site haritasına, ilgili çalışma alanı sayfasına ve "Diğer yazılar" bölümlerine kendiliğinden eklenir.

### Görseller
- Themis: `assets/img/themis.jpg` eklenirse ana sayfada çizim yerine bu fotoğraf kullanılır.
- Kitap kapakları: `assets/img/kitaplar/<slug>.jpg` (ör. `ceza-muhakemesi-kanunu.jpg`) eklenirse tipografik kapak yerine gerçek kapak gösterilir.

## Yayına alırken
1. `content/site.js` içinde `gaId` (GA4 ölçüm kimliği) ve `gscVerification` (Search Console doğrulama kodu) alanlarını doldurun, `node build.js` çalıştırın.
2. `dist/` içeriğini sunucuya yükleyin.
3. Search Console'a `https://yilmazcaglayan.av.tr/sitemap.xml` adresini gönderin.
4. Google İşletme Profili'ni aynı adres/telefonla açıp siteye bağlayın (yerel aramalar için en etkili adım).

## GitHub Pages önizlemesi
`docs/` klasörü GitHub Pages için hazırlanmış önizleme sürümüdür (Google'a kapalı, `noindex`).
- Güncellemek için: `node build.js --out=docs --base=/yilmazcaglayan-av-tr` (veya `npm run build:github`)
- GitHub'da: Settings → Pages → Branch: `main`, klasör: `/docs`
- Gerçek alan adına (yilmazcaglayan.av.tr) geçerken `dist/` klasörü kullanılır; o sürüm Google'a açıktır.
