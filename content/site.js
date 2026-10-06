// Genel site ayarları. Alan adı, iletişim bilgileri ve analiz kodları buradan yönetilir.
module.exports = {
  url: 'https://yilmazcaglayan.av.tr',
  name: 'Avukat Yılmaz ÇAĞLAYAN',
  shortName: 'Av. Yılmaz Çağlayan',
  tagline: 'Muğla Milas Avukatlık Bürosu',
  lang: 'tr',
  phone: '+90 505 792 13 14',
  phoneHref: '+905057921314',
  email: 'y.caglayan57@hotmail.com',
  address: {
    street: 'Güllük Mahallesi Hermiyas Cd. No: 17 K: 2 N: 1',
    district: 'Milas',
    city: 'Muğla',
    country: 'TR',
    full: 'Güllük Mahallesi Hermiyas Cd. No: 17 K: 2 N: 1, Milas / Muğla'
  },
  // Google Haritalar'dan alınan koordinatlar girilirse yapılandırılmış veriye eklenir. Ör: { lat: 37.31, lng: 27.78 }
  geo: null,
  hours: 'Hafta İçi: 09:00 – 18:00',
  hoursNote: 'Randevulu müvekkil kabulleri gerçekleştirilmektedir.',
  areaServed: ['Milas', 'Bodrum', 'Muğla'],

  // Google Analytics 4 ölçüm kimliği (ör. 'G-XXXXXXXXXX'). Boş bırakılırsa kod eklenmez.
  gaId: '',
  // Google Search Console HTML etiketi doğrulama kodu (content değeri). Boş bırakılırsa eklenmez.
  gscVerification: ''
};
