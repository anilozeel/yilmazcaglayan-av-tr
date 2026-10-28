# yilmazcaglayan.av.tr

Av. Yılmaz Çağlayan | Milas Avukat & Hukuk Bürosu web sitesi.

## Yönetim paneli
Adres: **http://yilmazcaglayan.av.tr/yonetim/** (SSL kurulduktan sonra https://)

Panel hosting'in kendi üzerinde (PHP) çalışır; GitHub hesabı veya anahtar gerektirmez. Panelden yapılan her kayıt
siteyi anında yeniden oluşturur. Düzenlenebilenler: makaleler, ana sayfa slaytları (geçiş süresi dahil), çalışma alanları,
yayımlanmış eserler, özgeçmiş, sıkça sorulan sorular, tüm sayfa metinleri, iletişim bilgileri ve harita konumu, görseller.
Ziyaretçi istatistikleri (ülke, şehir, sayfa, kaynak, cihaz) sitenin kendisinde, IP adresi saklanmadan tutulur.

## Yapı
| Klasör / dosya | Görev |
|---|---|
| `lib/render.js` | Sayfa şablonu. Hem `build.js` (Node) hem de yönetim paneli (tarayıcı) aynı dosyayı kullanır. |
| `veri-ilk/*.json` | Başlangıç içerikleri. Sunucuda kayıtlı içerik varsa o kullanılır (`yc-veri/`). |
| `sunucu/` | PHP dosyaları: `yonetim/` (panel + API), `sayac.php` (ziyaretçi sayacı). |
| `assets/` | CSS, JS, görseller. |
| `.github/workflows/yayinla.yml` | Her güncellemede sunucudaki panel verisini alır, siteyi derler ve FTP ile yükler. Konum veritabanını (DB-IP Lite) her ay yeniler. |

Sunucudaki `yc-veri/` klasörü panel verilerini, yedekleri ve istatistikleri tutar; dışarıdan erişime kapalıdır ve
otomatik yayın sırasında üzerine yazılmaz.

## Yerelde çalıştırma
```
node build.js            # dist/ klasörüne üretir
php -S localhost:8080 -t dist
```

`content/` klasörü eski yapıdan kalmıştır; içerikler artık `veri-ilk/` ve panel üzerinden yönetilir.
Ziyaretçi konum verisi: IP Geolocation by DB-IP (https://db-ip.com), CC BY 4.0.
