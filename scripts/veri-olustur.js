#!/usr/bin/env node
// Tek seferlik: content/ klasöründeki eski içerikleri veri-ilk/*.json başlangıç verilerine dönüştürür.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'veri-ilk');
fs.mkdirSync(OUT, { recursive: true });
const site = require('../content/site.js');
const areas = require('../content/alanlar.js');
const books = require('../content/eserler.js');
const faq = require('../content/sss.js');
const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/iletisim.json'), 'utf8'));
const save = (n, d) => fs.writeFileSync(path.join(OUT, n + '.json'), JSON.stringify(d, null, 2) + '\n');
const shortTitle = t => t.replace(/ Avukatlığı$/, '');

save('site', {
  url: site.url,
  name: site.name,
  shortName: site.shortName,
  siteTitle: site.siteTitle,
  slogan: site.slogan,
  tagline: site.tagline,
  homeDescription: `${site.slogan}. Ceza, tazminat, icra, iş, gayrimenkul, miras ve aile hukukunda dava takibi ve danışmanlık.`,
  phone: c.phone,
  email: c.email,
  street: c.street,
  district: c.district,
  city: c.city,
  lat: c.lat,
  lng: c.lng,
  hours: c.hours,
  hoursNote: c.hoursNote,
  areaServed: site.areaServed.join(', '),
  gaId: '',
  gscVerification: ''
});

save('anasayfa', {
  slaytSuresi: 2,
  slaytlar: [
    {
      stil: 'baslik', ton: 'koyu', gorsel: '/assets/img/themis.jpg', gorselMobil: '/assets/img/themis-mobile.jpg', gorselAlt: 'Bronz Themis (adalet) heykeli',
      ustKalin: 'Av. Yılmaz Çağlayan', ust: 'Milas Avukat & Hukuk Bürosu',
      baslik: 'Haklı olmak bir başlangıçtır, ancak yeterli değildir;', baslikVurgu: 'asıl olan haklılığı hukukun diliyle anlatabilmektir…',
      butonlar: true
    },
    {
      stil: 'motto', ton: 'portre', gorsel: '/assets/img/yilmaz-caglayan.jpg', gorselMobil: '', gorselAlt: 'Avukat Yılmaz Çağlayan',
      ustKalin: '', ust: '',
      baslik: 'Misyonumuz;', baslikVurgu: 'Muğla ve Milas çevresinde, hukukun mutlak üstünlüğünü ve savunma hakkının kutsallığını temel alarak, hak arama mücadelesinde kararlı bir şekilde mesleki bilgi ve deneyimimizi sergilemek.',
      butonlar: false
    }
  ],
  buton1: 'Randevu Al',
  buton2: 'Çalışma Alanları',
  alanlar: {
    ust: '',
    baslik: 'Hukukun her aşamasında yanınızdayız.',
    metin: `${site.slogan}: soruşturmadan kanun yollarına, sözleşme hazırlığından uyuşmazlığın çözümüne kadar bireylere ve kurumlara hukuki destek.`,
    secili: ['ceza-hukuku', 'borclar-hukuku-ve-tazminat', 'icra-iflas-hukuku', 'is-hukuku', 'gayrimenkul-ve-imar-hukuku', 'miras-hukuku', 'aile-hukuku-ve-bosanma', 'otelcilik-hukuku'],
    not: 'Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.'
  },
  hakkinda: {
    ust: 'Özgeçmiş',
    baslik: 'Hukuku, hukukun diliyle savunmak.',
    metin: "1979 İstanbul doğumlu, aslen Sinop Gerzeli. İstanbul Üniversitesi Hukuk Fakültesi mezunu; dört açıklamalı ve içtihatlı kanun şerhinin yazarı. Muğla Milas'ta serbest avukat.",
    gorsel: '/assets/img/yilmaz-caglayan.jpg',
    sayilar: [{ deger: '1996', aciklama: 'İÜ Hukuk Fakültesi' }, { deger: '4', aciklama: 'Kanun şerhi' }, { deger: 'Milas', aciklama: 'Avukatlık bürosu' }],
    link: 'Özgeçmişin tamamı'
  },
  eserler: { ust: 'Yayımlanmış Eserler', baslik: 'Hukuk literatürüne katkı.', metin: 'Yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele alan açıklamalı ve içtihatlı kanun şerhleri.' },
  makaleler: { ust: 'Makaleler', baslik: 'Hukuki bilgilendirme.', metin: "Güncel mevzuat ve Milas, Muğla'daki uygulama ışığında hazırlanan yazılar.", adet: 3, buton: 'Tüm makaleler' }
});

save('alanlar', areas.map(a => ({
  slug: a.slug, title: a.title, footerLabel: a.footerLabel || a.title, icon: a.icon, short: a.short, text: a.text,
  detay: `Milas, Bodrum ve Muğla genelindeki adli ve idari yargı mercilerinde, ${shortTitle(a.title).toLocaleLowerCase('tr-TR')} alanındaki süreçler; yasal süreler ve şekil şartları gözetilerek, dosyanın her aşamasında titizlikle takip edilmektedir.`,
  seoTitle: a.seoTitle, seoDesc: a.seoDesc
})));

save('eserler', books.map(b => ({
  slug: b.slug, title: b.title, coverTitle: b.coverTitle, nitelik: b.nitelik, kapsam: b.kapsam,
  kapak: fs.existsSync(path.join(ROOT, 'assets/img/kitaplar', b.slug + '.jpg')) ? `/assets/img/kitaplar/${b.slug}.jpg` : ''
})));

save('ozgecmis', {
  baslik: 'Avukat Yılmaz ÇAĞLAYAN',
  ust: 'Özgeçmiş',
  giris: "Dört açıklamalı ve içtihatlı kanun şerhinin yazarı; Muğla Milas'ta serbest avukat.",
  foto: '/assets/img/yilmaz-caglayan-ozgecmis.jpg',
  fotoGenislik: 790, fotoYukseklik: 856,
  icerikBaslik: 'Özgeçmiş',
  metin: [
    "1979 yılında İstanbul'da doğdu. Aslen Sinop, Gerzelidir. İlk ve orta öğrenimini İstanbul'da tamamladı. 1996 yılında Ankara'da Adalet Bakanlığı bünyesinde adliye personeli yetiştirmek amacıyla eğitim veren liseden mezun olduktan sonra, 1996 yılında İstanbul Üniversitesi Hukuk Fakültesi'ni kazandı. Üniversite öğrenciliği yıllarında hukuk eğitimiyle birlikte İstanbul'da adliyede devlet memuru olarak görev yaptı.",
    "Hukuk fakültesinden mezuniyetinin ardından bir süre avukatlık stajı yaptı ve 2005 yılında Cumhuriyet Savcılığı stajına başladı. 2007–2024 yılları arasında sırasıyla Bartın, Ardahan, Manisa, Adana ve Bolu'da Cumhuriyet Savcısı olarak görev yaptı. Askerlik hizmetini ise Eskişehir'de askerî hâkim olarak yerine getirdi.",
    'Mesleki pratik ve yargı uygulamalarından edindiği tecrübeleri akademik alana da aktardı. Hukuk literatürüne katkı sağlayan dört adet açıklamalı ve içtihatlı kanun şerhi kaleme aldı.',
    '2024 yılında Cumhuriyet Savcılığından emekli olarak serbest avukatlık yapmaya başladı. Halen hukuk mesleğindeki bilgi ve deneyimini avukat olarak Muğla Milas ilçesinde sürdürmektedir.',
    'Evli ve iki çocuk babasıdır.'
  ].join('\n\n'),
  zaman: [
    { yil: '1996', metin: 'İstanbul Üniversitesi Hukuk Fakültesi' },
    { yil: '2005', metin: 'Cumhuriyet Savcılığı stajı' },
    { yil: '2007–2024', metin: 'Cumhuriyet Savcısı · Bartın, Ardahan, Manisa, Adana, Bolu' },
    { yil: '2024', metin: 'Serbest avukat · Milas, Muğla' }
  ],
  eserBaslik: 'Akademik Eserler',
  seoTitle: 'Özgeçmiş | Avukat Yılmaz Çağlayan – Milas',
  seoDesc: "Av. Yılmaz Çağlayan'ın özgeçmişi: İstanbul Üniversitesi Hukuk Fakültesi mezunu, dört açıklamalı ve içtihatlı kanun şerhinin yazarı, Muğla Milas'ta serbest avukat."
});

save('sss', {
  gruplar: faq.map(g => ({ group: g.group, area: g.area, items: g.items.map(i => ({ q: i.q, a: i.a })) })),
  uyariBaslik: 'Yasal Sorumluluk Reddi Uyarısı',
  uyari: faq.disclaimer
});

save('metinler', {
  menu: [
    { href: '/', label: 'Ana Sayfa', uzun: 'Ana Sayfa' },
    { href: '/calisma-alanlari/', label: 'Çalışma Alanları', uzun: 'Çalışma Alanları' },
    { href: '/yayimlanmis-eserler/', label: 'Yayımlanmış Eserler', uzun: 'Yayımlanmış Eserler ve Kitaplar' },
    { href: '/hakkimda/', label: 'Özgeçmiş', uzun: 'Özgeçmiş' },
    { href: '/makaleler/', label: 'Makaleler', uzun: 'Makaleler' },
    { href: '/sikca-sorulan-sorular/', label: 'Sıkça Sorulan Sorular', uzun: 'Sıkça Sorulan Sorular' },
    { href: '/iletisim/', label: 'İletişim', uzun: 'İletişim Bilgileri' }
  ],
  aramaButonu: 'Hemen Ara',
  alanlarSayfa: {
    baslik: 'Çalışma Alanlarımız',
    giris: 'Milas, Bodrum ve Muğla genelinde; dava süreçlerinden önleyici hukuki danışmanlığa kadar geniş bir alanda hizmet veriyoruz.',
    not: 'Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.',
    seoTitle: 'Çalışma Alanlarımız | Milas Avukat Yılmaz Çağlayan',
    seoDesc: "Milas ve Muğla'da ceza, borçlar ve tazminat, icra-iflas, iş, ticaret, gayrimenkul ve imar, idare ve vergi, miras, aile, otelcilik hukuku ve hukuki danışmanlık.",
    randevuBaslik: 'Randevu için'
  },
  eserlerSayfa: {
    baslik: 'Yayımlanmış Eserler ve Kitaplar',
    giris: 'Hukuk literatürüne katkı sağlamak, yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele almak amacıyla kaleme alınmış yayımlanmış hukuki eserlerimiz şunlardır:',
    seoTitle: 'Yayımlanmış Eserler ve Kitaplar | Av. Yılmaz Çağlayan',
    seoDesc: "Av. Yılmaz Çağlayan'ın açıklamalı ve içtihatlı kanun şerhleri: Hukuk Muhakemeleri Kanunu, Ceza Muhakemesi Kanunu, Türk Medeni Kanunu ve Türk Borçlar Kanunu."
  },
  makalelerSayfa: {
    baslik: 'Makaleler',
    giris: 'Güncel mevzuat ve yargı uygulaması ışığında hazırlanan hukuki bilgilendirme yazıları.',
    seoTitle: 'Hukuki Makaleler | Milas Avukat Yılmaz Çağlayan',
    seoDesc: "Ceza, kira, icra, iş, ticaret, gayrimenkul, idare, miras ve aile hukukuna dair makaleler; Milas ve Muğla'daki uygulamaya ilişkin değerlendirmeler.",
    uyari: 'Bu makale genel bilgilendirme amacıyla hazırlanmış olup hukuki tavsiye niteliği taşımaz. Somut uyuşmazlıklar, yasal mevzuat ve süreler dikkate alınarak bir hukuk profesyoneli eşliğinde değerlendirilmelidir.',
    yanBaslik: 'Hukuki destek',
    yanMetin: 'Somut olayınızın değerlendirilmesi için randevu alabilirsiniz.',
    digerBaslik: 'Diğer yazılar.'
  },
  sssSayfa: {
    baslik: 'Sıkça Sorulan Sorular',
    giris: 'Çalışma alanlarımıza ilişkin en çok merak edilen sorular ve kısa cevapları.',
    seoTitle: 'Sıkça Sorulan Sorular | Milas Avukat Yılmaz Çağlayan',
    seoDesc: 'Ceza, tazminat, icra, iş, ticaret, gayrimenkul, idare, miras, boşanma ve otelcilik hukukuna ilişkin sıkça sorulan sorular ve cevapları – Milas, Muğla.'
  },
  iletisimSayfa: {
    baslik: 'İletişim Bilgileri',
    giris: 'Hukuki danışmanlık randevuları ve yasal süreçlerle ilgili bilgilendirmeler için aşağıdaki kanallar üzerinden iletişim sağlayabilirsiniz.',
    seoTitle: 'İletişim | Avukat Yılmaz Çağlayan – Milas, Muğla',
    seoDesc: ''
  },
  iletisimBandi: {
    ust: 'İletişim',
    baslik: 'Hukuki danışmanlık için randevu alın.',
    metin: 'Randevulu müvekkil kabulleri gerçekleştirilmektedir. Somut olayınızı yasal süreler gözetilerek birlikte değerlendirelim.'
  },
  altBilgi: {
    metin: "Milas ve Muğla'da Hukuki Danışmanlık ve Avukatlık Hizmetleri. Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.",
    uyari: 'İçerikler genel bilgilendirme amaçlıdır; hukuki tavsiye niteliği taşımaz.'
  }
});

// makaleler
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { data, body: m[2] };
}
const dir = path.join(ROOT, 'content/makaleler');
const arts = fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort().map((f, k) => {
  const { data, body } = frontMatter(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '').replace(/\r/g, ''));
  return {
    id: 'm' + String(k + 1).padStart(3, '0'),
    slug: data.slug || f.replace(/\.md$/, '').replace(/^\d+-/, ''),
    title: data.title, date: data.date, area: data.area,
    related: (data.related || '').split(',').map(s => s.trim()).filter(Boolean),
    description: data.description || '', image: data.image || '', yayinda: true,
    body: body.trim() + '\n'
  };
});
save('makaleler', arts);
console.log('veri-ilk hazır:', fs.readdirSync(OUT).join(', '), '·', arts.length, 'makale');
