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
// (tema seçimi kaldırıldı — tek tasarım: modern)

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
  ['/calisma-alanlari/', 'Çalışma Alanları'],
  ['/yayimlanmis-eserler/', 'Eserler'],
  ['/hakkimda/', 'Özgeçmiş'],
  ['/makaleler/', 'Makaleler'],
  ['/sikca-sorulan-sorular/', 'S.S.S.'],
  ['/iletisim/', 'İletişim']
];
const NAV_FULL = { '/yayimlanmis-eserler/': 'Yayımlanmış Eserler ve Kitaplar', '/sikca-sorulan-sorular/': 'Sıkça Sorulan Sorular', '/iletisim/': 'İletişim Bilgileri' };
const shortTitle = t => t.replace(/ Avukatlığı$/, '');
const crypto = require('crypto');
const ver = f => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex').slice(0, 8);
const CSS_V = ver('assets/css/style.css'), JS_V = ver('assets/js/main.js');
const hasThemisPhoto = () => fs.existsSync(path.join(ROOT, 'assets/img/themis.jpg'));

const brandInner = () => `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="7" r="2.2"/><path d="M24 9.2V40"/><path d="M9 14.5c5 1.6 10 1.6 15 0 5 1.6 10 1.6 15 0"/><path d="M11 15.2 5.5 28M11 15.2 16.5 28M37 15.2 31.5 28M37 15.2 42.5 28"/><path d="M4.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M30.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M17 40.5h14M19.5 43.5h9"/></svg></span><i class="brand-bar" aria-hidden="true"></i><span class="brand-text"><small class="brand-kicker">Avukat</small><span class="brand-name">Yılmaz Çağlayan</span><span class="brand-sub">${esc(site.tagline)}</span></span>`;

function header(current) {
  const links = NAV.map(([href, label]) => {
    const active = current === href || (href !== '/' && current.startsWith(href));
    return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  return `
<header class="site-header">
  <div class="wrap">
    <div class="nav-pill">
      <a class="brand" href="/" aria-label="${esc(site.name)} – Ana Sayfa">
        ${brandInner()}
      </a>
      <nav class="nav" id="site-nav" aria-label="Ana menü">${links}<a class="nav-call" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a></nav>
      <a class="nav-cta" href="tel:${site.phoneHref}">${icon('phone')}<span>${esc(site.phone)}</span></a>
      <button class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Menüyü aç">${icon('menu')}</button>
    </div>
  </div>
</header>`;
}

function contactBand() {
  return `
<section class="contact-band-wrap"><div class="wrap">
  <div class="contact-band reveal">
    <div class="cb-text">
      <span class="eyebrow on-dark">İletişim</span>
      <h2>Hukuki danışmanlık için randevu alın.</h2>
      <p>${esc(site.hoursNote)} Somut olayınızı yasal süreler gözetilerek birlikte değerlendirelim.</p>
      <div class="btn-row">
        <a class="btn btn-gold" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a>
        <a class="btn btn-ghost" href="/iletisim/">İletişim Bilgileri</a>
      </div>
    </div>
    <ul class="cb-list">
      <li><span class="ib">${icon('phone')}</span><span><small>Telefon</small><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></span></li>
      <li><span class="ib">${icon('mail')}</span><span><small>E-posta</small><a href="mailto:${site.email}">${esc(site.email)}</a></span></li>
      <li><span class="ib">${icon('pin')}</span><span><small>Adres</small><b>${esc(site.address.full)}</b></span></li>
      <li><span class="ib">${icon('clock')}</span><span><small>Çalışma saatleri</small><b>${esc(site.hours)}</b></span></li>
    </ul>
  </div>
</div></section>`;
}

function footer() {
  return `
<footer class="site-footer"><div class="wrap">
  <div class="ft-top">
    <div class="ft-brand">
      <a class="brand" href="/">${brandInner()}</a>
      <p>Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
    </div>
    <nav class="ft-links" aria-label="Alt menü">${NAV.map(([h, l]) => `<a href="${h}">${NAV_FULL[h] || l}</a>`).join('')}</nav>
    <nav class="ft-links" aria-label="Çalışma alanları">${areas.slice(0, 7).map(a => `<a href="/calisma-alanlari/${a.slug}/">${esc(shortTitle(a.title))}</a>`).join('')}</nav>
  </div>
  <div class="ft-bottom">
    <span>© ${new Date().getFullYear()} ${esc(site.name)} · ${esc(site.tagline)}</span>
    <span>İçerikler genel bilgilendirme amaçlıdır; hukuki tavsiye niteliği taşımaz.</span>
  </div>
</div></footer>
<a class="call-fab" href="tel:${site.phoneHref}" aria-label="Telefonla ara: ${esc(site.phone)}">${icon('phone')} Ara</a>`;
}

function layout({ path: p, title, description, body, schema = [], ogType = 'website', image = '/assets/img/og-image.jpg', home = false, noindex = false }) {
  const canonical = abs(p);
  const ga = site.gaId ? `
<script async src="https://www.googletagmanager.com/gtag/js?id=${site.gaId}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.gaId}',{anonymize_ip:true});</script>` : '';
  return `<!doctype html>
<html lang="tr"${home ? ' class="is-home"' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
${noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${site.gscVerification ? `<meta name="google-site-verification" content="${esc(site.gscVerification)}">` : ''}
<meta name="theme-color" content="#0B1324">
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600&display=swap">
<link rel="stylesheet" href="/assets/css/style.css?v=${CSS_V}">
${home ? `<link rel="preload" as="image" href="/assets/img/${hasThemisPhoto() ? 'themis.jpg' : 'themis.svg'}">` : ''}
<noscript><style>.reveal{opacity:1!important;transform:none!important}</style></noscript>
${ld([orgSchema(), ...schema])}${ga}
</head>
<body>
<a class="skip" href="#icerik">İçeriğe geç</a>
${header(p)}
<main id="icerik">
${body}
${contactBand()}
</main>
${footer()}
<script src="/assets/js/main.js?v=${JS_V}" defer></script>
</body>
</html>
`;
}

function pageHero({ title, lead, crumbs, eyebrow }) {
  const c = crumbs.map(([n, h], i) => i < crumbs.length - 1 ? `<a href="${h}">${esc(n)}</a><span aria-hidden="true">/</span>` : `<span aria-current="page">${esc(n)}</span>`).join('');
  return `<section class="page-hero"><div class="wrap">
  <nav class="crumbs" aria-label="Sayfa konumu">${c}</nav>
  ${eyebrow ? `<span class="tag"><b>${esc(eyebrow)}</b> Milas · Muğla</span>` : ''}
  <h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
</div></section>`;
}

const sectionHead = (eyebrow, title, text, tag = 'h2') => `<div class="sh reveal"><div><span class="eyebrow">${esc(eyebrow)}</span><${tag} class="h2">${esc(title)}</${tag}></div>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

function areaCard(a, extra = '') {
  return `<a class="card area-card reveal${extra}" href="/calisma-alanlari/${a.slug}/">
    <span class="ib">${icon(a.icon)}</span>
    <h3>${esc(shortTitle(a.title))}</h3>
    <p>${esc(a.short)}</p>
    <span class="more">İncele ${icon('arrow')}</span>
  </a>`;
}

function bento() {
  const big = areas[0];
  const rest = areas.slice(1);
  const pick = [rest[0], rest[1], rest[2], rest[4], rest[6], rest[7], rest[8]]; // borçlar, icra, iş, gayrimenkul, miras, aile, otelcilik
  const others = rest.filter(a => !pick.includes(a));
  return `<div class="bento">
  <a class="card area-big reveal" href="/calisma-alanlari/${big.slug}/">
    <span class="ib">${icon(big.icon)}</span>
    <h3>${esc(big.title)}</h3>
    <p>Kolluk ve savcılık ifadelerinden Ağır Ceza yargılamasına, tutukluluğa itirazdan Yargıtay temyizine kadar savunmanın her aşaması.</p>
    <span class="pills"><span>İfade ve sorgu</span><span>Tutukluluğa itiraz</span><span>İstinaf · Temyiz</span><span>Bilişim suçları</span></span>
    <span class="more">Detaylı bilgi ${icon('arrow')}</span>
  </a>
  ${pick.map(a => areaCard(a)).join('')}
  <a class="card area-gold reveal" href="/calisma-alanlari/">
    <span class="ib">${icon('plus')}</span>
    <h3>+${others.length} alan daha</h3>
    <p>${esc(others.map(a => shortTitle(a.title).replace(/ Hukuku.*$/, ' hukuku').replace(/ ve Sözleşme Hazırlanması$/, '')).join(', '))}.</p>
    <span class="more">Tümünü gör ${icon('arrow')}</span>
  </a>
</div>`;
}

function cover(b) {
  const img = fs.existsSync(path.join(ROOT, 'assets/img/kitaplar', b.slug + '.jpg'));
  if (img) return `<span class="cover has-img"><img src="/assets/img/kitaplar/${b.slug}.jpg" alt="${esc(b.title)} kitap kapağı" loading="lazy"></span>`;
  return `<span class="cover" role="img" aria-label="${esc(b.title)} kitap kapağı">
    <small>AÇIKLAMALI · İÇTİHATLI</small>
    <b>${esc(b.coverTitle)}</b>
    <span class="seal">${icon('scales')}</span>
    <i>Yılmaz Çağlayan</i>
  </span>`;
}
function bookGrid(withText = true) {
  return `<div class="books">${books.map(b => `
  <article class="card book reveal" id="${b.slug}">
    <button class="book-btn" type="button" data-book data-title="${esc(b.title)}" aria-label="${esc(b.title)} kapağını büyüt"><span class="book-3d">${cover(b)}</span></button>
    <h3>${esc(b.title)}</h3>
    ${withText ? `<dl><dt>Niteliği</dt><dd>${esc(b.nitelik)}</dd><dt>Kapsam</dt><dd>${esc(b.kapsam)}</dd></dl>` : ''}
  </article>`).join('')}
</div>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Kitap kapağı" aria-hidden="true">
  <button class="lightbox-close" type="button" aria-label="Kapat">${icon('close')}</button>
  <div class="lightbox-inner"><div class="cover-wrap"></div><p class="lightbox-cap"></p></div>
</div>`;
}

function postCard(a, dark = false) {
  return `<article class="card post${dark ? ' dark' : ''} reveal">
    <a class="chip" href="/calisma-alanlari/${a.area}/">${esc(shortTitle(areaBySlug[a.area]?.title || 'Makale'))}</a>
    <h3><a href="${a.url}">${esc(a.title)}</a></h3>
    <p>${esc(a.excerpt)}</p>
    <span class="meta"><span>${a.minutes} dk okuma</span><a href="${a.url}">Oku ${icon('arrow')}</a></span>
  </article>`;
}

/* ---------------- SAYFALAR ---------------- */

function themisMedia() {
  if (hasThemisPhoto())
    return '<picture><source media="(max-width: 680px)" srcset="/assets/img/themis-mobile.jpg"><img src="/assets/img/themis.jpg" alt="Bronz Themis (adalet) heykeli" width="1536" height="1024" fetchpriority="high"></picture>';
  return '<img class="svg" src="/assets/img/themis.svg" alt="Bronz Themis (adalet) heykeli" width="800" height="1420" fetchpriority="high">';
}

// ANA SAYFA
function home() {
  const body = `
<section class="hero" data-interval="8000" data-tone="dark" aria-label="Karşılama">
  <div class="hero-bg">
    <div class="hp is-active" data-slide="0" data-tone="dark"><div class="hp-media">${themisMedia()}</div></div>
    <div class="hp hp-portrait" data-slide="1" data-tone="portrait" aria-hidden="true"><div class="hp-media"><img src="/assets/img/yilmaz-caglayan.jpg" alt="Avukat Yılmaz Çağlayan" width="1170" height="856" loading="lazy"></div></div>
  </div>
  <div class="wrap hero-inner">
    <div class="hero-stack">
      <div class="hs is-active" data-slide="0">
        <span class="tag"><b>Milas</b> Muğla, Bodrum ve çevre adliyeleri</span>
        <h1 class="hero-title">Haklı olmak bir başlangıçtır, ancak yeterli değildir; <span>asıl olan haklılığı hukukun diliyle anlatabilmektir…</span></h1>
      </div>
      <div class="hs" data-slide="1" aria-hidden="true">
        <span class="tag"><b>Motivasyonumuz</b></span>
        <p class="hero-motto">Muğla Milas ve çevresinde, hukukun mutlak üstünlüğünü ve savunma hakkının kutsallığını temel alarak, <span>hak arama mücadelesinde kararlı bir şekilde mesleki bilgi ve deneyimimizi sergilemek.</span></p>
      </div>
    </div>
    <div class="btn-row hero-btns">
      <a class="btn btn-gold" href="tel:${site.phoneHref}">Randevu Al ${icon('arrow')}</a>
      <a class="btn btn-ghost" href="/calisma-alanlari/">Çalışma Alanları</a>
    </div>
  </div>
  <div class="hero-dots"><div class="wrap" role="tablist" aria-label="Slaytlar">
    <span>01</span>
    <button type="button" class="is-active" role="tab" aria-selected="true" aria-label="1. slayt"></button>
    <button type="button" role="tab" aria-selected="false" aria-label="2. slayt"></button>
    <span>02</span>
  </div></div>
</section>

<section class="section"><div class="wrap">
  ${sectionHead('Çalışma Alanlarımız', 'Hukukun her aşamasında yanınızdayız.', 'Soruşturmadan kanun yollarına, sözleşme hazırlığından uyuşmazlığın çözümüne kadar bireylere ve kurumlara hukuki destek.')}
  ${bento()}
  <p class="note reveal">Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
</div></section>

<section class="section"><div class="wrap about">
  <div class="about-photo reveal"><img src="/assets/img/yilmaz-caglayan.jpg" alt="Avukat Yılmaz Çağlayan, Milas'taki bürosunda" width="1170" height="856" loading="lazy"></div>
  <div class="card about-text reveal">
    <span class="eyebrow">Özgeçmiş</span>
    <h2 class="h2">Hukuku, hukukun diliyle savunmak.</h2>
    <p>1979 İstanbul doğumlu, aslen Sinop Gerzeli. İstanbul Üniversitesi Hukuk Fakültesi mezunu; dört açıklamalı ve içtihatlı kanun şerhinin yazarı. Muğla Milas'ta serbest avukat.</p>
    <div class="tl"><div><b>1996</b><span>İÜ Hukuk Fakültesi</span></div><div><b>4</b><span>Kanun şerhi</span></div><div><b>Milas</b><span>Avukatlık bürosu</span></div></div>
    <a class="more" href="/hakkimda/">Özgeçmişin tamamı ${icon('arrow')}</a>
  </div>
</div></section>

<section class="section"><div class="wrap">
  ${sectionHead('Yayımlanmış Eserler', 'Hukuk literatürüne katkı.', 'Yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele alan açıklamalı ve içtihatlı kanun şerhleri.')}
  ${bookGrid(false)}
</div></section>

<section class="section"><div class="wrap">
  ${sectionHead('Makaleler', 'Hukuki bilgilendirme.', "Güncel mevzuat ve Milas, Muğla'daki uygulama ışığında hazırlanan yazılar.")}
  <div class="posts posts-home">${articles.slice(0, 3).map((a, k) => postCard(a, k === 0)).join('')}</div>
  <p class="center reveal"><a class="btn btn-line" href="/makaleler/">Tüm makaleler ${icon('arrow')}</a></p>
</div></section>`;
  write('index.html', layout({
    path: '/', home: true,
    title: 'Avukat Yılmaz Çağlayan | Milas Avukat – Muğla Milas Avukatlık Bürosu',
    description: "Milas avukatı Yılmaz Çağlayan: ceza, tazminat, icra, iş, gayrimenkul, miras ve aile hukuku. Muğla, Milas ve Bodrum'da dava takibi ve hukuki danışmanlık.",
    body,
    schema: [{ '@type': 'WebSite', '@id': abs('/#site'), url: abs('/'), name: site.name, inLanguage: 'tr-TR', publisher: { '@id': ORG_ID } }, personSchema()]
  }));
}

// ÇALIŞMA ALANLARI
function areasPage() {
  const body = `${pageHero({ title: 'Çalışma Alanlarımız', eyebrow: `${areas.length} alan`, lead: 'Milas, Bodrum ve Muğla genelinde; dava süreçlerinden önleyici hukuki danışmanlığa kadar geniş bir alanda hizmet veriyoruz.', crumbs: [['Ana Sayfa', '/'], ['Çalışma Alanlarımız', '/calisma-alanlari/']] })}
<section class="section"><div class="wrap">
  <div class="area-list">${areas.map((a, k) => `
    <article class="card area-row reveal" id="${a.slug}">
      <span class="num">${String(k + 1).padStart(2, '0')}</span>
      <span class="ib">${icon(a.icon)}</span>
      <div><h2><a href="/calisma-alanlari/${a.slug}/">${esc(a.title)}</a></h2><p>${esc(a.text)}</p></div>
      <a class="arrow-btn" href="/calisma-alanlari/${a.slug}/" aria-label="${esc(a.title)} detayları">${icon('arrow')}</a>
    </article>`).join('')}
  </div>
  <p class="note reveal">Faaliyetlerimiz ağırlıklı olarak Muğla, Milas, Bodrum ve çevre adliyelerindeki adli ve idari yargı mercilerini kapsamaktadır.</p>
</div></section>`;
  write('calisma-alanlari/index.html', layout({
    path: '/calisma-alanlari/',
    title: 'Çalışma Alanlarımız | Milas Avukat Yılmaz Çağlayan',
    description: "Milas ve Muğla'da ceza, borçlar ve tazminat, icra-iflas, iş, ticaret, gayrimenkul ve imar, idare ve vergi, miras, aile, otelcilik hukuku ve hukuki danışmanlık.",
    body,
    schema: [crumbsSchema([['Ana Sayfa', '/'], ['Çalışma Alanlarımız', '/calisma-alanlari/']])]
  }));

  for (const a of areas) {
    const rel = articles.filter(x => x.area === a.slug || x.related.includes(a.slug));
    const q = faq.find(g => g.area === a.slug);
    const others = areas.filter(x => x.slug !== a.slug);
    const crumbs = [['Ana Sayfa', '/'], ['Çalışma Alanları', '/calisma-alanlari/'], [shortTitle(a.title), `/calisma-alanlari/${a.slug}/`]];
    const body = `${pageHero({ title: a.title, eyebrow: 'Çalışma alanı', lead: a.short, crumbs })}
<section class="section"><div class="wrap detail">
  <div class="detail-main">
    <div class="card prose-card reveal">
      <span class="ib big">${icon(a.icon)}</span>
      <div class="prose">
        <p>${esc(a.text)}</p>
        <p>Milas, Bodrum ve Muğla genelindeki adli ve idari yargı mercilerinde, ${esc(shortTitle(a.title).toLocaleLowerCase('tr-TR'))} alanındaki süreçler; yasal süreler ve şekil şartları gözetilerek, dosyanın her aşamasında titizlikle takip edilmektedir.</p>
      </div>
    </div>
    ${q ? `<div class="faq-group reveal"><h2 class="h3">Sıkça Sorulan Sorular</h2>${q.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}</div>` : ''}
    ${rel.length ? `<div class="reveal"><h2 class="h3">İlgili Makaleler</h2><div class="posts posts-2">${rel.map(r => postCard(r)).join('')}</div></div>` : ''}
  </div>
  <aside class="detail-side">
    <div class="card side-card">
      <h2 class="h4">Diğer çalışma alanları</h2>
      <nav class="side-links">${others.map(o => `<a href="/calisma-alanlari/${o.slug}/">${icon(o.icon)}<span>${esc(shortTitle(o.title))}</span></a>`).join('')}</nav>
    </div>
    <div class="card side-cta">
      <h2 class="h4">Randevu için</h2>
      <p>${esc(site.hours)}<br>${esc(site.hoursNote)}</p>
      <a class="btn btn-gold btn-block" href="tel:${site.phoneHref}">${icon('phone')} ${esc(site.phone)}</a>
    </div>
  </aside>
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
  const body = `${pageHero({ title: 'Yayımlanmış Eserler ve Kitaplar', eyebrow: `${books.length} eser`, lead: 'Hukuk literatürüne katkı sağlamak, yargı uygulamasını ve mevzuat hükümlerini akademik bir perspektifle ele almak amacıyla kaleme alınmış yayımlanmış hukuki eserlerimiz şunlardır:', crumbs })}
<section class="section"><div class="wrap">
  ${bookGrid(true)}
</div></section>`;
  write('yayimlanmis-eserler/index.html', layout({
    path: '/yayimlanmis-eserler/', title: 'Yayımlanmış Eserler ve Kitaplar | Av. Yılmaz Çağlayan',
    description: "Av. Yılmaz Çağlayan'ın açıklamalı ve içtihatlı kanun şerhleri: Hukuk Muhakemeleri Kanunu, Ceza Muhakemesi Kanunu, Türk Medeni Kanunu ve Türk Borçlar Kanunu.",
    body,
    schema: [crumbsSchema(crumbs), ...books.map(b => ({ '@type': 'Book', name: b.title, author: { '@id': PERSON_ID }, inLanguage: 'tr', about: b.nitelik, url: abs(`/yayimlanmis-eserler/#${b.slug}`) }))]
  }));
}

// HAKKIMDA
function aboutPage() {
  const crumbs = [['Ana Sayfa', '/'], ['Özgeçmiş', '/hakkimda/']];
  const body = `${pageHero({ title: 'Avukat Yılmaz ÇAĞLAYAN', eyebrow: 'Özgeçmiş', lead: 'Dört açıklamalı ve içtihatlı kanun şerhinin yazarı; Muğla Milas\'ta serbest avukat.', crumbs })}
<section class="section"><div class="wrap bio">
  <div class="bio-text">
    <div class="card prose-card reveal">
      <div class="prose">
        <p>1979 yılında İstanbul'da doğdu. Aslen Sinop, Gerzelidir. İlk ve orta öğrenimini İstanbul'da tamamladı. 1996 yılında Ankara'da Adalet Bakanlığı bünyesinde adliye personeli yetiştirmek amacıyla eğitim veren liseden mezun olduktan sonra, 1996 yılında İstanbul Üniversitesi Hukuk Fakültesi'ni kazandı. Üniversite öğrenciliği yıllarında hukuk eğitimiyle birlikte İstanbul'da adliyede devlet memuru olarak görev yaptı.</p>
        <p>Hukuk fakültesinden mezuniyetinin ardından bir süre avukatlık stajı yaptı ve 2005 yılında Cumhuriyet Savcılığı stajına başladı. 2007–2024 yılları arasında sırasıyla Bartın, Ardahan, Manisa, Adana ve Bolu'da Cumhuriyet Savcısı olarak görev yaptı. Askerlik hizmetini ise Eskişehir'de askerî hâkim olarak yerine getirdi.</p>
        <p>Mesleki pratik ve yargı uygulamalarından edindiği tecrübeleri akademik alana da aktardı. Hukuk literatürüne katkı sağlayan dört adet açıklamalı ve içtihatlı kanun şerhi kaleme aldı.</p>
        <p>2024 yılında Cumhuriyet Savcılığından emekli olarak serbest avukatlık yapmaya başladı. Halen hukuk mesleğindeki bilgi ve deneyimini avukat olarak Muğla Milas ilçesinde sürdürmektedir.</p>
        <p>Evli ve iki çocuk babasıdır.</p>
      </div>
    </div>
    <div class="tl tl-cards reveal">
      <div><b>1996</b><span>İstanbul Üniversitesi Hukuk Fakültesi</span></div>
      <div><b>2005</b><span>Cumhuriyet Savcılığı stajı</span></div>
      <div><b>2007–2024</b><span>Cumhuriyet Savcısı · Bartın, Ardahan, Manisa, Adana, Bolu</span></div>
      <div><b>2024</b><span>Serbest avukat · Milas, Muğla</span></div>
    </div>
    <div class="card works-card reveal">
      <h2 class="h3">Akademik Eserler</h2>
      <ol class="works">${books.map(b => `<li><a href="/yayimlanmis-eserler/#${b.slug}">${esc(b.title)}</a></li>`).join('')}</ol>
    </div>
  </div>
  <aside class="bio-photo reveal">
    <figure><img src="/assets/img/yilmaz-caglayan.jpg" alt="Avukat Yılmaz Çağlayan" width="1170" height="856">
      <figcaption><b>Av. Yılmaz Çağlayan</b><span>Milas · Muğla</span></figcaption></figure>
  </aside>
</div></section>`;
  write('hakkimda/index.html', layout({
    path: '/hakkimda/', title: 'Özgeçmiş | Avukat Yılmaz Çağlayan – Milas',
    description: "Av. Yılmaz Çağlayan'ın özgeçmişi: İstanbul Üniversitesi Hukuk Fakültesi mezunu, dört açıklamalı ve içtihatlı kanun şerhinin yazarı, Muğla Milas'ta serbest avukat.",
    body, ogType: 'profile', image: '/assets/img/yilmaz-caglayan.jpg',
    schema: [crumbsSchema(crumbs), personSchema(), { '@type': 'ProfilePage', mainEntity: { '@id': PERSON_ID }, url: abs('/hakkimda/') }]
  }));
}

// MAKALELER
function articlesPages() {
  const crumbs = [['Ana Sayfa', '/'], ['Makaleler', '/makaleler/']];
  const body = `${pageHero({ title: 'Makaleler', eyebrow: `${articles.length} yazı`, lead: 'Güncel mevzuat ve yargı uygulaması ışığında hazırlanan hukuki bilgilendirme yazıları.', crumbs })}
<section class="section"><div class="wrap">
  <div class="posts posts-grid">${articles.map((a, k) => postCard(a, k === 0)).join('')}</div>
</div></section>`;
  write('makaleler/index.html', layout({
    path: '/makaleler/', title: 'Hukuki Makaleler | Milas Avukat Yılmaz Çağlayan',
    description: "Ceza, kira, icra, iş, ticaret, gayrimenkul, idare, miras ve aile hukukuna dair makaleler; Milas ve Muğla'daki uygulamaya ilişkin değerlendirmeler.",
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
    const body = `${pageHero({ title: a.title, eyebrow: area ? shortTitle(area.title) : 'Makale', crumbs: c })}
<section class="section"><div class="wrap detail">
  <article class="detail-main">
    <div class="card prose-card article-card reveal">
      <div class="post-meta">${area ? `<a href="/calisma-alanlari/${area.slug}/">${esc(area.title)}</a> · ` : ''}${a.minutes} dk okuma · <time datetime="${a.date}">${fmtDate(a.date)}</time></div>
      <div class="prose">${a.html}</div>
      <p class="legal-note">Bu makale genel bilgilendirme amacıyla hazırlanmış olup hukuki tavsiye niteliği taşımaz. Somut uyuşmazlıklar, yasal mevzuat ve süreler dikkate alınarak bir hukuk profesyoneli eşliğinde değerlendirilmelidir.</p>
    </div>
  </article>
  <aside class="detail-side">
    <div class="card side-card">
      <h2 class="h4">İlgili çalışma alanı</h2>
      <nav class="side-links">${relAreas.map(r => `<a href="/calisma-alanlari/${r.slug}/">${icon(r.icon)}<span>${esc(shortTitle(r.title))}</span></a>`).join('')}</nav>
    </div>
    <div class="card side-cta">
      <h2 class="h4">Hukuki destek</h2>
      <p>Somut olayınızın değerlendirilmesi için randevu alabilirsiniz.</p>
      <a class="btn btn-gold btn-block" href="tel:${site.phoneHref}">${icon('phone')} ${esc(site.phone)}</a>
    </div>
  </aside>
</div></section>
<section class="section"><div class="wrap">
  ${sectionHead('Makaleler', 'Diğer yazılar.')}
  <div class="posts posts-home">${more.map(m => postCard(m)).join('')}</div>
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
  const body = `${pageHero({ title: 'Sıkça Sorulan Sorular', eyebrow: 'S.S.S.', lead: 'Çalışma alanlarımıza ilişkin en çok merak edilen sorular ve kısa cevapları.', crumbs })}
<section class="section"><div class="wrap faq-wrap">
  <nav class="card faq-index" aria-label="Konular">${faq.map(g => `<a href="#${g.area}">${icon(areaBySlug[g.area]?.icon || 'fileSearch')}<span>${esc(g.group.replace(/ Avukatlığı$/, ''))}</span></a>`).join('')}</nav>
  <div class="faq-list">
  ${faq.map(g => {
    const a = areaBySlug[g.area];
    return `<div class="faq-group reveal" id="${g.area}">
    <div class="faq-head">${a ? `<span class="ib">${icon(a.icon)}</span>` : ''}<h2 class="h3">${a ? `<a href="/calisma-alanlari/${a.slug}/">${esc(g.group)}</a>` : esc(g.group)}</h2></div>
    ${g.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}
  </div>`;
  }).join('')}
  <div class="card disclaimer"><strong>Yasal Sorumluluk Reddi Uyarısı</strong><p>${esc(faq.disclaimer)}</p></div>
  </div>
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
  const body = `${pageHero({ title: 'İletişim Bilgileri', eyebrow: 'Randevu', lead: 'Hukuki danışmanlık randevuları ve yasal süreçlerle ilgili bilgilendirmeler için aşağıdaki kanallar üzerinden iletişim sağlayabilirsiniz.', crumbs })}
<section class="section"><div class="wrap contact-grid">
  <div class="contact-cards">
    <a class="card cc reveal" href="tel:${site.phoneHref}"><span class="ib">${icon('phone')}</span><small>Telefon</small><b>${esc(site.phone)}</b></a>
    <a class="card cc reveal" href="mailto:${site.email}"><span class="ib">${icon('mail')}</span><small>E-posta</small><b>${esc(site.email)}</b></a>
    <div class="card cc reveal"><span class="ib">${icon('pin')}</span><small>Adres</small><b>${esc(site.address.street)}<br>${esc(site.address.district)} / ${esc(site.address.city)}</b></div>
    <div class="card cc reveal"><span class="ib">${icon('clock')}</span><small>Çalışma Saatleri</small><b>${esc(site.hours)}</b><span class="sub">${esc(site.hoursNote)}</span></div>
    <div class="btn-row">
      <a class="btn btn-dark" href="tel:${site.phoneHref}">${icon('phone')} Hemen Ara</a>
      <a class="btn btn-line" href="https://www.google.com/maps/dir/?api=1&amp;destination=${q}" target="_blank" rel="noopener">${icon('pin')} Yol Tarifi Al</a>
    </div>
  </div>
  <div class="map reveal">
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
<section class="section"><div class="wrap"><div class="btn-row"><a class="btn btn-dark" href="/">Ana sayfaya dön</a><a class="btn btn-line" href="/iletisim/">İletişim</a></div></div></section>`
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
console.log(`✓ ${OUT} üretildi${BASE ? ' (önizleme, taban: ' + BASE + ')' : ''} · ${areas.length} alan · ${articles.length} makale`);
