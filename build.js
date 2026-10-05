#!/usr/bin/env node
/*
 * Statik site üreticisi — bağımlılık gerektirmez (Node 18+).
 * Kullanım:  node build.js            -> dist/ klasörüne üretir
 *            node build.js --theme=b  -> farklı tema ile üretir
 * İçerikler content/ klasöründedir. Yeni makale için content/makaleler/ içine .md dosyası eklemek yeterlidir.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const ROOT = __dirname;
const OUT = path.join(ROOT, args.out || 'dist');
const THEME = args.theme || require('./content/tema.js');

const site = require('./content/site.js');
const areas = require('./content/alanlar.js');
const books = require('./content/eserler.js');
const faq = require('./content/sss.js');
const { icon } = require('./content/icons.js');

/* ---------------- yardımcılar ---------------- */
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trUpper = s => s.toLocaleUpperCase('tr-TR');
const slugify = s => s.toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const abs = p => site.url.replace(/\/$/, '') + p;
const areaBySlug = Object.fromEntries(areas.map(a => [a.slug, a]));
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// --base=/depo-adi : GitHub Pages gibi alt klasörde yayın için tüm site içi linklerin önüne eklenir
const BASE = (args.base || '').replace(/\/$/, '');
const PREVIEW = !!BASE || args.preview === 'true';
function write(rel, html) {
  const file = path.join(OUT, rel);
  if (BASE && rel.endsWith('.html')) html = html.replace(/(href|src|srcset)="\/(?!\/)/g, `$1="${BASE}/`);
  if (PREVIEW && rel.endsWith('.html')) html = html.replace(/<meta name="robots" content="[^"]*">/, '<meta name="robots" content="noindex, nofollow">');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
function copyDir(src, dst, skip = () => false) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f), d = path.join(dst, f);
    if (skip(f)) continue;
    fs.statSync(s).isDirectory() ? copyDir(s, d, skip) : fs.copyFileSync(s, d);
  }
}

/* ---------------- basit markdown ---------------- */
function inline(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}
function md(src) {
  const lines = src.replace(/\r/g, '').split('\n');
  let html = '', para = [], list = [];
  const flushP = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
  const flushL = () => { if (list.length) { html += `<ul>${list.map(i => `<li>${inline(i)}</li>`).join('')}</ul>\n`; list = []; } };
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { flushP(); flushL(); continue; }
    if (l.startsWith('## ')) { flushP(); flushL(); const t = l.slice(3); html += `<h2 id="${slugify(t)}">${inline(t)}</h2>\n`; continue; }
    if (l.startsWith('> ')) { flushP(); flushL(); html += `<blockquote><p>${inline(l.slice(2))}</p></blockquote>\n`; continue; }
    if (/^[*-] /.test(l)) { flushP(); list.push(l.slice(2)); continue; }
    flushL(); para.push(l);
  }
  flushP(); flushL();
  return html;
}
function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: m[2] };
}

/* ---------------- makaleler ---------------- */
const ART_DIR = path.join(ROOT, 'content', 'makaleler');
const articles = fs.readdirSync(ART_DIR).filter(f => f.endsWith('.md')).sort().map(f => {
  const { data, body } = frontMatter(fs.readFileSync(path.join(ART_DIR, f), 'utf8'));
  const slug = data.slug || slugify(f.replace(/\.md$/, '').replace(/^\d+-/, ''));
  const text = body.replace(/[#>*\[\]()]/g, '');
  const words = text.split(/\s+/).filter(Boolean).length;
  const firstPara = body.split('\n\n').map(s => s.trim()).find(s => s && !s.startsWith('#')) || '';
  return {
    file: f, slug, title: data.title, date: data.date || BUILD_DATE, area: data.area, related: (data.related || '').split(',').map(s => s.trim()).filter(Boolean),
    description: data.description || firstPara.slice(0, 155),
    excerpt: firstPara.replace(/\*\*/g, '').split(/(?<=\.)\s/).slice(0, 2).join(' '),
    html: md(body), minutes: Math.max(2, Math.round(words / 200)), url: `/makaleler/${slug}/`
  };
}).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : a.file.localeCompare(b.file)));

const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

/* ---------------- yapılandırılmış veri ---------------- */
const ORG_ID = abs('/#buro');
const PERSON_ID = abs('/hakkimda/#yilmaz-caglayan');
function orgSchema() {
  const o = {
    '@type': ['LegalService', 'Attorney'],
    '@id': ORG_ID,
    name: `${site.name} – ${site.tagline}`,
    alternateName: 'Av. Yılmaz Çağlayan Hukuk Bürosu',
    url: abs('/'),
    image: abs('/assets/img/yilmaz-caglayan.jpg'),
    logo: abs('/assets/img/og-image.jpg'),
    telephone: site.phone.replace(/\s/g, ''),
    email: site.email,
    priceRange: '₺₺',
    address: { '@type': 'PostalAddress', streetAddress: site.address.street, addressLocality: site.address.district, addressRegion: site.address.city, addressCountry: site.address.country },
    areaServed: site.areaServed.map(n => ({ '@type': 'City', name: n })),
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' }],
    founder: { '@id': PERSON_ID },
    knowsAbout: areas.map(a => a.title),
    hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Çalışma Alanları', itemListElement: areas.map(a => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: a.title, url: abs(`/calisma-alanlari/${a.slug}/`) } })) }
  };
  if (site.geo) o.geo = { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng };
  return o;
}
function personSchema() {
  return {
    '@type': 'Person', '@id': PERSON_ID, name: 'Yılmaz Çağlayan', jobTitle: 'Avukat', honorificPrefix: 'Av.',
    image: abs('/assets/img/yilmaz-caglayan.jpg'), url: abs('/hakkimda/'), worksFor: { '@id': ORG_ID },
    birthPlace: 'İstanbul', alumniOf: { '@type': 'CollegeOrUniversity', name: 'İstanbul Üniversitesi Hukuk Fakültesi' },
    knowsLanguage: 'tr'
  };
}
function crumbsSchema(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: abs(c[1]) })) };
}
const ld = graph => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;

/* ---------------- şablon parçaları ---------------- */
const NAV = [
  ['/', 'Ana Sayfa'],
  ['/calisma-alanlari/', 'Çalışma Alanlarımız'],
  ['/yayimlanmis-eserler/', 'Eserler ve Kitaplar'],
  ['/hakkimda/', 'Özgeçmiş'],
  ['/makaleler/', 'Makaleler'],
  ['/sikca-sorulan-sorular/', 'S.S.S.'],
  ['/iletisim/', 'İletişim']
];

function header(current) {
  const links = NAV.map(([href, label]) => {
    const active = current === href || (href !== '/' && current.startsWith(href));
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  return `
<header class="site-header">
  <div class="topbar"><div class="wrap">
    <div class="tb-l"><a href="tel:${site.phoneHref}">${esc(site.phone)}</a><a href="mailto:${site.email}">${esc(site.email)}</a></div>
    <div class="tb-r"><span>${esc(site.hours)}</span></div>
  </div></div>
  <div class="wrap">
    <a class="brand" href="/" aria-label="${esc(site.name)} – Ana Sayfa">
      <span class="brand-mark" aria-hidden="true">YÇ</span>
      <span class="brand-text">
        <span class="brand-name">${esc(site.name)}</span>
        <span class="brand-sub">${esc(site.tagline)}</span>
      </span>
    </a>
    <button class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Menüyü aç">${icon('menu')}</button>
    <nav class="nav" id="site-nav" aria-label="Ana menü">${links}<a class="btn nav-cta" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a></nav>
  </div>
</header>`;
}

function footer() {
  return `
<section class="cta-band">
  <div class="wrap">
    <div>
      <h2>Hukuki danışmanlık randevusu için</h2>
      <p>${esc(site.hours)} · ${esc(site.hoursNote)}</p>
    </div>
    <div class="btn-row">
      <a class="btn btn-gold" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a>
      <a class="btn btn-ghost-light" href="/iletisim/">İletişim Bilgileri</a>
    </div>
  </div>
</section>
<footer class="site-footer">
  <div class="wrap footer-top">
    <div>
      <div class="brand"><span class="brand-name">${esc(site.name)}</span><span class="brand-sub">${esc(site.tagline)}</span></div>
      <p>Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
    </div>
    <div>
      <h3>Site Haritası</h3>
      <ul class="footer-links">${NAV.map(([h, l]) => `<li><a href="${h}">${l === 'S.S.S.' ? 'Sıkça Sorulan Sorular' : l}</a></li>`).join('')}</ul>
    </div>
    <div>
      <h3>İletişim</h3>
      <ul class="footer-contact">
        <li>${icon('phone')}<a href="tel:${site.phoneHref}">${esc(site.phone)}</a></li>
        <li>${icon('mail')}<a href="mailto:${site.email}">${esc(site.email)}</a></li>
        <li>${icon('pin')}<span>${esc(site.address.full)}</span></li>
        <li>${icon('clock')}<span>${esc(site.hours)}</span></li>
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>© ${new Date().getFullYear()} ${esc(site.name)} · Tüm hakları saklıdır.</span>
    <span>Bu sitedeki içerikler genel bilgilendirme amaçlıdır; hukuki tavsiye niteliği taşımaz.</span>
  </div>
</footer>
<a class="call-fab" href="tel:${site.phoneHref}" aria-label="Telefonla ara: ${esc(site.phone)}">${icon('phone')} Ara</a>`;
}

function layout({ path: p, title, description, body, schema = [], ogType = 'website', image = '/assets/img/og-image.jpg', home = false, noindex = false }) {
  const canonical = abs(p);
  const ga = site.gaId ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaId}',{anonymize_ip:true});</script>` : '';
  return `<!doctype html>
<html lang="tr" data-theme="${THEME}"${home ? ' class="is-home"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${site.gscVerification ? `<meta name="google-site-verification" content="${esc(site.gscVerification)}">` : ''}
<meta name="theme-color" content="#1A2B4C">
<meta name="geo.region" content="TR-48">
<meta name="geo.placename" content="Milas, Muğla">
<meta property="og:locale" content="tr_TR">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${abs(image)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500&family=Inter:wght@400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap">
<link rel="stylesheet" href="/assets/css/style.css">
${home ? `<link rel="preload" as="image" href="/assets/img/${fs.existsSync(path.join(ROOT, 'assets/img/themis.jpg')) ? 'themis.jpg' : 'themis.svg'}">` : ''}
<noscript><style>.reveal,.hero-reveal{opacity:1!important;transform:none!important}</style></noscript>
${ld([orgSchema(), ...schema])}${ga}
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>
${header(p)}
<main id="icerik">
${body}
</main>
${footer()}
<script src="/assets/js/main.js" defer></script>
</body>
</html>
`;
}

function pageHero({ title, lead, crumbs }) {
  const c = crumbs.map(([n, h], i) => i < crumbs.length - 1 ? `<a href="${h}">${esc(n)}</a><span aria-hidden="true">/</span>` : `<span>${esc(n)}</span>`).join('');
  return `<section class="page-hero"><div class="wrap">
  <nav class="crumbs" aria-label="Sayfa konumu">${c}</nav>
  <h1>${esc(title)}</h1>${lead ? `<p>${esc(lead)}</p>` : ''}
</div></section>`;
}

const sectionHead = (eyebrow, title, text, tag = 'h2') => `<div class="section-head reveal"><span class="eyebrow">${esc(eyebrow)}</span><${tag} class="h-section">${esc(title)}</${tag}><span class="rule"></span>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

function areaCards(list = areas) {
  return `<div class="areas">${list.map(a => `
  <a class="area-card reveal" href="/calisma-alanlari/${a.slug}/">
    <span class="area-ico">${icon(a.icon)}</span>
    <h3>${esc(a.title)}</h3>
    <p>${esc(a.short)}</p>
    <span class="more">İncele ${icon('arrow')}</span>
  </a>`).join('')}
  <a class="area-card area-card-cta reveal" href="/iletisim/">
    <span class="area-ico">${icon('phone')}</span>
    <h3>Randevu ve bilgi için</h3>
    <p>Somut olayınızın değerlendirilmesi için randevulu görüşme planlayabilirsiniz.</p>
    <span class="more">İletişim ${icon('arrow')}</span>
  </a>
</div>`;
}

function cover(b) {
  const img = fs.existsSync(path.join(ROOT, 'assets/img/kitaplar', b.slug + '.jpg'));
  if (img) return `<span class="cover"><img src="/assets/img/kitaplar/${b.slug}.jpg" alt="${esc(b.title)} kitap kapağı" loading="lazy"></span>`;
  return `<span class="cover" role="img" aria-label="${esc(b.title)} kitap kapağı">
    <span class="cover-frame"></span>
    <span class="cover-over">Açıklamalı – İçtihatlı</span>
    <span class="cover-title">${esc(b.coverTitle)}</span>
    <span class="cover-rule"></span>
    <span class="cover-seal">${icon('scales')}</span>
    <span class="cover-author">Yılmaz Çağlayan</span>
  </span>`;
}
function bookGrid(withText = true) {
  return `<div class="books">${books.map(b => `
  <article class="book reveal" id="${b.slug}">
    <button class="book-btn" type="button" data-book data-title="${esc(b.title)}" aria-label="${esc(b.title)} kapağını büyüt">
      <span class="book-3d" style="display:block">${cover(b)}</span>
    </button>
    <h3>${esc(b.title)}</h3>
    ${withText ? `<dl><dt>Niteliği</dt><dd>${esc(b.nitelik)}</dd><dt>Kapsam</dt><dd>${esc(b.kapsam)}</dd></dl>` : ''}
  </article>`).join('')}
</div>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Kitap kapağı" aria-hidden="true">
  <button class="lightbox-close" type="button" aria-label="Kapat">${icon('close')}</button>
  <div class="lightbox-inner"><div class="cover-wrap"></div><p class="lightbox-cap"></p></div>
</div>`;
}

function postCards(list) {
  return `<div class="posts">${list.map(a => `
  <article class="post-card reveal">
    <div class="post-meta">${esc(areaBySlug[a.area]?.title.replace(/ Avukatlığı$/, '') || 'Makale')}</div>
    <h3><a href="${a.url}">${esc(a.title)}</a></h3>
    <p>${esc(a.excerpt)}</p>
    <a class="more" href="${a.url}">Devamını oku ${icon('arrow')}</a>
  </article>`).join('')}
</div>`;
}

const yearsProsecutor = 2024 - 2007;

/* ---------------- SAYFALAR ---------------- */

// Themis görseli: assets/img/themis.jpg eklenirse fotoğraf, yoksa çizim kullanılır
function themisMedia() {
  if (fs.existsSync(path.join(ROOT, 'assets/img/themis.jpg')))
    return '<picture><source media="(max-width: 680px)" srcset="/assets/img/themis-mobile.jpg"><img class="themis-photo" src="/assets/img/themis.jpg" alt="Bronz Themis (adalet) heykeli" width="1536" height="1024" fetchpriority="high"></picture>';
  return '<img class="themis-figure" src="/assets/img/themis.svg" alt="" width="800" height="1420" fetchpriority="high">';
}

// ANA SAYFA
function home() {
  const body = `
<section class="hero" data-interval="8000" aria-label="Karşılama">
  <div class="slide slide-themis${fs.existsSync(path.join(ROOT, 'assets/img/themis.jpg')) ? ' has-photo' : ''} is-active" aria-roledescription="slayt" aria-label="1 / 2">
    <div class="slide-media">${themisMedia()}</div>
    <div class="slide-shade"></div>
    <div class="slide-content"><div class="wrap">
      <span class="hero-eyebrow hero-reveal">Milas · Muğla</span>
      <h1 class="hero-quote hero-reveal d2">Haklı olmak bir başlangıçtır, ancak yeterli değildir; <em>asıl olan haklılığı hukukun diliyle anlatabilmektir…</em></h1>
    </div></div>
  </div>
  <div class="slide slide-portrait" aria-roledescription="slayt" aria-label="2 / 2">
    <div class="slide-media"></div>
    <div class="slide-shade"></div>
    <div class="slide-content"><div class="wrap">
      <span class="hero-eyebrow hero-reveal">Motivasyonumuz</span>
      <p class="hero-text hero-reveal d2">Motivasyonumuz; Muğla Milas ve çevresinde, hukukun mutlak üstünlüğünü ve savunma hakkının kutsallığını temel alarak, hak arama mücadelesinde kararlı bir şekilde mesleki bilgi ve deneyimimizi sergilemektir.</p>
      <p class="hero-sign hero-reveal d3">Av. Yılmaz Çağlayan</p>
    </div></div>
  </div>
  <div class="hero-dots" role="tablist" aria-label="Slaytlar">
    <button type="button" class="is-active" role="tab" aria-selected="true" aria-label="1. slayt"></button>
    <button type="button" role="tab" aria-selected="false" aria-label="2. slayt"></button>
  </div>
  <span class="hero-scroll" aria-hidden="true">Kaydır</span>
</section>

<div class="stats-strip"><div class="wrap"><div class="stats-box">
  <div class="stat"><b>${yearsProsecutor}+</b><span>yıl Cumhuriyet Savcılığı tecrübesi</span></div>
  <div class="stat"><b>4</b><span>açıklamalı ve içtihatlı kanun şerhi</span></div>
  <div class="stat"><b>${areas.length}</b><span>çalışma alanında hukuki hizmet</span></div>
  <div class="stat"><b>Milas</b><span>Muğla, Bodrum ve çevre adliyeleri</span></div>
</div></div></div>

<section class="section">
  <div class="wrap">
    ${sectionHead('Çalışma Alanlarımız', 'Hukukun her aşamasında yanınızdayız', 'Soruşturmadan kanun yollarına, sözleşme hazırlığından uyuşmazlığın çözümüne kadar; Milas ve çevresinde bireylere ve kurumlara hukuki destek.')}
    ${areaCards()}
    <p class="areas-note reveal">Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap about-split">
    <div class="reveal">
      <span class="eyebrow">Özgeçmiş</span>
      <h2 class="h-section">Avukat Yılmaz ÇAĞLAYAN</h2>
      <span class="rule rule-left"></span>
      <p class="lead">2007–2024 yılları arasında Bartın, Ardahan, Manisa, Adana ve Bolu'da Cumhuriyet Savcısı olarak görev yaptı. 2024 yılından bu yana mesleki bilgi ve deneyimini avukat olarak Muğla Milas'ta sürdürmektedir.</p>
      <div class="facts">
        <div class="fact"><b>${yearsProsecutor}+</b><span>yıl savcılık</span></div>
        <div class="fact"><b>4</b><span>yayımlanmış eser</span></div>
        <div class="fact"><b>1996</b><span>İstanbul Üniversitesi Hukuk Fakültesi</span></div>
      </div>
      <a class="btn" href="/hakkimda/">Özgeçmişi incele ${icon('arrow')}</a>
    </div>
    <div class="about-photo reveal">
      <img src="/assets/img/yilmaz-caglayan.jpg" alt="Avukat Yılmaz Çağlayan, Milas'taki bürosunda" width="1170" height="856" loading="lazy">
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    ${sectionHead('Yayımlanmış Eserler', 'Hukuk literatürüne katkı', 'Yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele alan açıklamalı ve içtihatlı kanun şerhleri.')}
    ${bookGrid(false)}
    <p style="text-align:center;margin-top:56px" class="reveal"><a class="btn" href="/yayimlanmis-eserler/">Tüm eserler ${icon('arrow')}</a></p>
  </div>
</section>

<section class="section section-alt">
  <div class="wrap">
    ${sectionHead('Makaleler', 'Hukuki bilgilendirme yazıları')}
    ${postCards(articles.slice(0, 3))}
    <p style="text-align:center;margin-top:56px" class="reveal"><a class="btn" href="/makaleler/">Tüm makaleler ${icon('arrow')}</a></p>
  </div>
</section>`;
  write('index.html', layout({
    path: '/', home: true,
    title: 'Avukat Yılmaz Çağlayan | Milas Avukat – Muğla Milas Avukatlık Bürosu',
    description: 'Milas avukatı Yılmaz Çağlayan: ceza, tazminat, icra, iş, gayrimenkul, miras ve aile hukuku. Muğla, Milas ve Bodrum\'da dava takibi ve hukuki danışmanlık.',
    body,
    schema: [{ '@type': 'WebSite', '@id': abs('/#site'), url: abs('/'), name: site.name, inLanguage: 'tr-TR', publisher: { '@id': ORG_ID } }, personSchema()]
  }));
}

// ÇALIŞMA ALANLARI
function areasPage() {
  const body = `${pageHero({ title: 'Çalışma Alanlarımız', lead: 'Milas, Bodrum ve Muğla genelinde; dava süreçlerinden önleyici hukuki danışmanlığa kadar geniş bir alanda hizmet veriyoruz.', crumbs: [['Ana Sayfa', '/'], ['Çalışma Alanlarımız', '/calisma-alanlari/']] })}
<section class="section"><div class="wrap">
  <div class="area-list">${areas.map(a => `
    <article class="area-row reveal" id="${a.slug}">
      <span class="area-ico">${icon(a.icon)}</span>
      <div><h2><a href="/calisma-alanlari/${a.slug}/">${esc(a.title)}</a></h2><p>${esc(a.text)}</p></div>
      <a class="more" href="/calisma-alanlari/${a.slug}/">Detaylı bilgi ${icon('arrow')}</a>
    </article>`).join('')}
  </div>
  <p class="areas-note reveal">Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
</div></section>`;
  write('calisma-alanlari/index.html', layout({
    path: '/calisma-alanlari/',
    title: 'Çalışma Alanlarımız | Milas Avukat Yılmaz Çağlayan',
    description: 'Milas ve Muğla\'da ceza, borçlar ve tazminat, icra-iflas, iş, ticaret, gayrimenkul ve imar, idare ve vergi, miras, aile, otelcilik hukuku ve hukuki danışmanlık.',
    body,
    schema: [crumbsSchema([['Ana Sayfa', '/'], ['Çalışma Alanlarımız', '/calisma-alanlari/']])]
  }));

  for (const a of areas) {
    const rel = articles.filter(x => x.area === a.slug || x.related.includes(a.slug));
    const q = faq.find(g => g.area === a.slug);
    const others = areas.filter(x => x.slug !== a.slug);
    const crumbs = [['Ana Sayfa', '/'], ['Çalışma Alanlarımız', '/calisma-alanlari/'], [a.title, `/calisma-alanlari/${a.slug}/`]];
    const body = `${pageHero({ title: a.title, lead: a.short, crumbs })}
<section class="article"><div class="wrap-narrow">
  <div class="prose">
    <p>${esc(a.text)}</p>
    <p>Milas, Bodrum ve Muğla genelindeki adli ve idari yargı mercilerinde, ${esc(a.title.replace(/ Avukatlığı$/, '').toLocaleLowerCase('tr-TR'))} alanındaki süreçler; yasal süreler ve şekil şartları gözetilerek, dosyanın her aşamasında titizlikle takip edilmektedir.</p>
  </div>
  ${q ? `<div class="faq-group" style="margin-top:56px"><h2 style="margin-bottom:18px">Sıkça Sorulan Sorular</h2>${q.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}</div>` : ''}
  ${rel.length ? `<aside class="article-aside"><h2>İlgili Makaleler</h2><div class="post-list" style="border:0">${rel.map(r => `<div><a class="chip" href="${r.url}">${icon('book')} ${esc(r.title)}</a></div>`).join('')}</div></aside>` : ''}
  <aside class="article-aside" style="margin-top:24px"><h2>Diğer Çalışma Alanları</h2><div class="chip-row">${others.map(o => `<a class="chip" href="/calisma-alanlari/${o.slug}/">${icon(o.icon)} ${esc(o.title.replace(/ Avukatlığı$/, ''))}</a>`).join('')}</div></aside>
  <p class="legal-note">Bu sayfadaki bilgiler genel bilgilendirme amaçlıdır; somut olayınıza ilişkin değerlendirme için randevu alabilirsiniz.</p>
</div></section>`;
    write(`calisma-alanlari/${a.slug}/index.html`, layout({
      path: `/calisma-alanlari/${a.slug}/`, title: `${a.seoTitle} | Av. Yılmaz Çağlayan`, description: a.seoDesc, body,
      schema: [crumbsSchema(crumbs), { '@type': 'Service', name: a.title, serviceType: a.title, description: a.text, provider: { '@id': ORG_ID }, areaServed: site.areaServed.map(n => ({ '@type': 'City', name: n })), url: abs(`/calisma-alanlari/${a.slug}/`) }]
    }));
  }
}

// ESERLER
function booksPage() {
  const crumbs = [['Ana Sayfa', '/'], ['Yayımlanmış Eserler ve Kitaplar', '/yayimlanmis-eserler/']];
  const body = `${pageHero({ title: 'Yayımlanmış Eserler ve Kitaplar', crumbs })}
<section class="section"><div class="wrap">
  <div class="section-head reveal"><p style="font-family:var(--f-display);font-size:21px;color:var(--navy);line-height:1.6">Hukuk literatürüne katkı sağlamak, yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele almak amacıyla kaleme alınmış yayımlanmış hukuki eserlerimiz şunlardır:</p><span class="rule"></span></div>
  ${bookGrid(true)}
</div></section>`;
  write('yayimlanmis-eserler/index.html', layout({
    path: '/yayimlanmis-eserler/', title: 'Yayımlanmış Eserler ve Kitaplar | Av. Yılmaz Çağlayan',
    description: 'Av. Yılmaz Çağlayan\'ın açıklamalı ve içtihatlı kanun şerhleri: Hukuk Muhakemeleri Kanunu, Ceza Muhakemesi Kanunu, Türk Medeni Kanunu ve Türk Borçlar Kanunu.',
    body,
    schema: [crumbsSchema(crumbs), ...books.map(b => ({ '@type': 'Book', name: b.title, author: { '@id': PERSON_ID }, inLanguage: 'tr', about: b.nitelik, url: abs(`/yayimlanmis-eserler/#${b.slug}`) }))]
  }));
}

// HAKKIMDA
function aboutPage() {
  const crumbs = [['Ana Sayfa', '/'], ['Özgeçmiş', '/hakkimda/']];
  const body = `${pageHero({ title: 'Özgeçmiş', crumbs })}
<section class="section"><div class="wrap bio">
  <div class="bio-text">
    <span class="eyebrow">Hakkımda</span>
    <h2 class="h-section">Avukat Yılmaz ÇAĞLAYAN</h2>
    <span class="rule rule-left"></span>
    <div class="prose">
      <p>1979 yılında İstanbul'da doğdu. Aslen Sinop, Gerzelidir. İlk ve orta öğrenimini İstanbul'da tamamladı. 1996 yılında Ankara'da Adalet Bakanlığı bünyesinde adliye personeli yetiştirmek amacıyla eğitim veren liseden mezun olduktan sonra, 1996 yılında İstanbul Üniversitesi Hukuk Fakültesi'ni kazandı. Üniversite öğrenciliği yıllarında hukuk eğitimiyle birlikte İstanbul'da adliyede devlet memuru olarak görev yaptı.</p>
      <p>Hukuk fakültesinden mezuniyetinin ardından bir süre avukatlık stajı yaptı ve 2005 yılında Cumhuriyet Savcılığı stajına başladı. 2007–2024 yılları arasında sırasıyla Bartın, Ardahan, Manisa, Adana ve Bolu'da Cumhuriyet Savcısı olarak görev yaptı. Askerlik hizmetini ise Eskişehir'de askerî hâkim olarak yerine getirdi.</p>
      <p>Mesleki pratik ve yargı uygulamalarından edindiği tecrübeleri akademik alana da aktardı. Hukuk literatürüne katkı sağlayan dört adet açıklamalı ve içtihatlı kanun şerhi kaleme aldı.</p>
      <p>2024 yılında Cumhuriyet Savcılığından emekli olarak serbest avukatlık yapmaya başladı. Halen hukuk mesleğindeki bilgi ve deneyimini avukat olarak Muğla Milas ilçesinde sürdürmektedir.</p>
      <p>Evli ve iki çocuk babasıdır.</p>
    </div>
    <ul class="timeline">
      <li><b>1996</b><span>Adalet Bakanlığı adliye personeli lisesi, Ankara · İstanbul Üniversitesi Hukuk Fakültesi</span></li>
      <li><b>2005</b><span>Cumhuriyet Savcılığı stajı</span></li>
      <li><b>2007 – 2024</b><span>Cumhuriyet Savcısı · Bartın, Ardahan, Manisa, Adana, Bolu</span></li>
      <li><b>2024 –</b><span>Serbest avukat · Milas, Muğla</span></li>
    </ul>
    <h3 style="font-size:24px;margin-top:48px">Akademik Eserler</h3>
    <ol class="works">${books.map(b => `<li><a href="/yayimlanmis-eserler/#${b.slug}">${esc(b.title)}</a></li>`).join('')}</ol>
  </div>
  <aside class="bio-photo">
    <figure>
      <span class="ph"><img src="/assets/img/yilmaz-caglayan.jpg" alt="Avukat Yılmaz Çağlayan" width="1170" height="856"></span>
      <figcaption>Av. Yılmaz Çağlayan<span>Milas · Muğla</span></figcaption>
    </figure>
  </aside>
</div></section>`;
  write('hakkimda/index.html', layout({
    path: '/hakkimda/', title: 'Özgeçmiş | Avukat Yılmaz Çağlayan – Milas',
    description: 'Av. Yılmaz Çağlayan: 2007–2024 yılları arasında Cumhuriyet Savcısı, dört açıklamalı ve içtihatlı kanun şerhinin yazarı. 2024\'ten bu yana Milas\'ta serbest avukat.',
    body, ogType: 'profile', image: '/assets/img/yilmaz-caglayan.jpg',
    schema: [crumbsSchema(crumbs), personSchema(), { '@type': 'ProfilePage', mainEntity: { '@id': PERSON_ID }, url: abs('/hakkimda/') }]
  }));
}

// MAKALELER
function articlesPages() {
  const crumbs = [['Ana Sayfa', '/'], ['Makaleler', '/makaleler/']];
  const body = `${pageHero({ title: 'Makaleler', lead: 'Güncel mevzuat ve yargı uygulaması ışığında hazırlanan hukuki bilgilendirme yazıları.', crumbs })}
<section class="section"><div class="wrap">
  <div class="post-list">${articles.map(a => `
    <article class="post-row reveal">
      <div>
        <div class="post-meta"><a href="/calisma-alanlari/${a.area}/">${esc(areaBySlug[a.area]?.title || '')}</a> · ${a.minutes} dk okuma</div>
        <h2><a href="${a.url}">${esc(a.title)}</a></h2>
        <p>${esc(a.excerpt)}</p>
      </div>
      <a class="more" href="${a.url}">Oku ${icon('arrow')}</a>
    </article>`).join('')}
  </div>
</div></section>`;
  write('makaleler/index.html', layout({
    path: '/makaleler/', title: 'Hukuki Makaleler | Milas Avukat Yılmaz Çağlayan',
    description: 'Ceza, kira, icra, iş, ticaret, gayrimenkul, idare, miras ve aile hukukuna dair makaleler; Milas ve Muğla\'daki uygulamaya ilişkin değerlendirmeler.',
    body,
    schema: [crumbsSchema(crumbs), { '@type': 'CollectionPage', name: 'Makaleler', url: abs('/makaleler/'), hasPart: articles.map(a => ({ '@type': 'Article', headline: a.title, url: abs(a.url) })) }]
  }));

  for (const a of articles) {
    const area = areaBySlug[a.area];
    const relAreas = [a.area, ...a.related].map(s => areaBySlug[s]).filter(Boolean);
    const relPosts = articles.filter(x => x !== a && (x.area === a.area || a.related.includes(x.area) || x.related.includes(a.area)));
    const fill = articles.filter(x => x !== a && !relPosts.includes(x));
    const more = [...relPosts, ...fill].slice(0, 3);
    const c = [['Ana Sayfa', '/'], ['Makaleler', '/makaleler/'], [a.title, a.url]];
    const body = `${pageHero({ title: a.title, crumbs: c })}
<article class="article"><div class="wrap-narrow">
  <div class="post-meta">${area ? `<a href="/calisma-alanlari/${area.slug}/">${esc(area.title)}</a> · ` : ''}${a.minutes} dk okuma · <time datetime="${a.date}">${fmtDate(a.date)}</time></div>
  <div class="prose">${a.html}</div>
  <aside class="article-aside">
    <h2>İlgili Çalışma Alanı</h2>
    <div class="chip-row">${relAreas.map(r => `<a class="chip" href="/calisma-alanlari/${r.slug}/">${icon(r.icon)} ${esc(r.title)}</a>`).join('')}</div>
  </aside>
  <p class="legal-note">Bu makale genel bilgilendirme amacıyla hazırlanmış olup hukuki tavsiye niteliği taşımaz. Somut uyuşmazlıklar, yasal mevzuat ve süreler dikkate alınarak bir hukuk profesyoneli eşliğinde değerlendirilmelidir.</p>
</div></article>
<section class="section section-alt"><div class="wrap">
  ${sectionHead('Makaleler', 'Diğer yazılar')}
  ${postCards(more)}
</div></section>`;
    write(`makaleler/${a.slug}/index.html`, layout({
      path: a.url, title: `${a.title} | Av. Yılmaz Çağlayan`, description: a.description, body, ogType: 'article',
      schema: [crumbsSchema(c), {
        '@type': 'Article', headline: a.title.slice(0, 110), description: a.description, datePublished: a.date, dateModified: a.date,
        inLanguage: 'tr-TR', mainEntityOfPage: abs(a.url), author: { '@id': PERSON_ID }, publisher: { '@id': ORG_ID },
        image: abs('/assets/img/og-image.jpg'), about: area ? area.title : undefined
      }]
    }));
  }
}

// SSS
function faqPage() {
  const crumbs = [['Ana Sayfa', '/'], ['Sıkça Sorulan Sorular', '/sikca-sorulan-sorular/']];
  const body = `${pageHero({ title: 'Sıkça Sorulan Sorular', lead: 'Çalışma alanlarımıza ilişkin en çok merak edilen sorular ve kısa cevapları.', crumbs })}
<section class="section"><div class="wrap-narrow">
  ${faq.map(g => {
    const a = areaBySlug[g.area];
    return `<div class="faq-group reveal" id="${g.area}">
    <div class="faq-group-head">${a ? `<span class="area-ico">${icon(a.icon)}</span>` : ''}<h2>${a ? `<a href="/calisma-alanlari/${a.slug}/">${esc(g.group)}</a>` : esc(g.group)}</h2></div>
    ${g.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}
  </div>`;
  }).join('')}
  <div class="disclaimer"><strong>Yasal Sorumluluk Reddi Uyarısı</strong>${esc(faq.disclaimer)}</div>
</div></section>`;
  write('sikca-sorulan-sorular/index.html', layout({
    path: '/sikca-sorulan-sorular/', title: 'Sıkça Sorulan Sorular | Milas Avukat Yılmaz Çağlayan',
    description: 'Ceza, tazminat, icra, iş, ticaret, gayrimenkul, idare, miras, boşanma ve otelcilik hukukuna ilişkin sıkça sorulan sorular ve cevapları – Milas, Muğla.',
    body,
    schema: [crumbsSchema(crumbs), { '@type': 'FAQPage', mainEntity: faq.flatMap(g => g.items.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))) }]
  }));
}

// İLETİŞİM
function contactPage() {
  const crumbs = [['Ana Sayfa', '/'], ['İletişim', '/iletisim/']];
  const q = encodeURIComponent(site.address.full.replace(' / ', ' '));
  const body = `${pageHero({ title: 'İletişim Bilgileri', lead: 'Hukuki danışmanlık randevuları ve yasal süreçlerle ilgili bilgilendirmeler için aşağıdaki kanallar üzerinden iletişim sağlayabilirsiniz.', crumbs })}
<section class="section"><div class="wrap contact-grid">
  <div>
    <ul class="contact-list">
      <li><span class="area-ico">${icon('phone')}</span><div><small>Telefon</small><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></div></li>
      <li><span class="area-ico">${icon('mail')}</span><div><small>E-posta</small><a href="mailto:${site.email}">${esc(site.email)}</a></div></li>
      <li><span class="area-ico">${icon('pin')}</span><div><small>Adres</small><p>${esc(site.address.street)}<br>${esc(site.address.district)} / ${trUpper(site.address.city)}</p></div></li>
      <li><span class="area-ico">${icon('clock')}</span><div><small>Çalışma Saatleri</small><p>${esc(site.hours)}</p><p class="note">${esc(site.hoursNote)}</p></div></li>
    </ul>
    <div class="btn-row">
      <a class="btn btn-solid" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a>
      <a class="btn" href="https://www.google.com/maps/dir/?api=1&amp;destination=${q}" target="_blank" rel="noopener">${icon('pin')} Yol Tarifi Al</a>
    </div>
  </div>
  <div class="map">
    <iframe title="Büro konumu – Google Haritalar" src="https://www.google.com/maps?q=${q}&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
  </div>
</div></section>`;
  write('iletisim/index.html', layout({
    path: '/iletisim/', title: 'İletişim | Avukat Yılmaz Çağlayan – Milas, Muğla',
    description: `Av. Yılmaz Çağlayan, Milas avukatlık bürosu: ${site.phone} · Hermiyas Cd. No: 17, Milas / Muğla. Hafta içi 09:00–18:00, randevulu kabul.`,
    body,
    schema: [crumbsSchema(crumbs), { '@type': 'ContactPage', url: abs('/iletisim/'), about: { '@id': ORG_ID } }]
  }));
}

function notFound() {
  write('404.html', layout({
    path: '/404.html', title: 'Sayfa bulunamadı | Av. Yılmaz Çağlayan', description: 'Aradığınız sayfa bulunamadı.', noindex: true,
    body: `${pageHero({ title: 'Sayfa bulunamadı', lead: 'Aradığınız sayfa taşınmış veya kaldırılmış olabilir.', crumbs: [['Ana Sayfa', '/'], ['404', '/404.html']] })}
<section class="section"><div class="wrap"><div class="btn-row"><a class="btn btn-solid" href="/">Ana sayfaya dön</a><a class="btn" href="/iletisim/">İletişim</a></div></div></section>`
  }));
}

function sitemapAndRobots() {
  const urls = [
    ['/', '1.0', 'weekly'], ['/calisma-alanlari/', '0.9', 'monthly'], ...areas.map(a => [`/calisma-alanlari/${a.slug}/`, '0.8', 'monthly']),
    ['/yayimlanmis-eserler/', '0.6', 'yearly'], ['/hakkimda/', '0.7', 'yearly'], ['/makaleler/', '0.8', 'weekly'],
    ...articles.map(a => [a.url, '0.7', 'monthly', a.date]), ['/sikca-sorulan-sorular/', '0.7', 'monthly'], ['/iletisim/', '0.8', 'yearly']
  ];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p, f, d]) => `  <url><loc>${abs(u)}</loc><lastmod>${d || BUILD_DATE}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
  write('robots.txt', PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${abs('/sitemap.xml')}\n`);
  if (PREVIEW) write('.nojekyll', '');
}

/* ---------------- çalıştır ---------------- */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'), f => f.startsWith('src-') || f === '.DS_Store');
home(); areasPage(); booksPage(); aboutPage(); articlesPages(); faqPage(); contactPage(); notFound(); sitemapAndRobots();
console.log(`✓ ${OUT} üretildi${BASE ? ' (önizleme, taban: ' + BASE + ')' : ''} · tema: ${THEME} · ${areas.length} alan · ${articles.length} makale`);
