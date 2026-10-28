/*
 * Site şablonu — hem sunucuda/GitHub'da (Node) hem de yönetim panelinde (tarayıcı) aynı şekilde çalışır.
 * renderSite(veri, secenek) -> { 'index.html': '...', 'makaleler/x/index.html': '...', ... }
 * veri: { site, anasayfa, alanlar, eserler, ozgecmis, sss, metinler, makaleler }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./icons.js'));
  else root.YCRender = factory(root.YCIcons);
})(typeof self !== 'undefined' ? self : this, function (ICONS) {
  'use strict';
  const icon = ICONS.icon;

  /* ---------------- yardımcılar ---------------- */
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const str = v => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
  const slugify = s => String(s || '').toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const shortTitle = t => String(t || '').replace(/ Avukatlığı$/, '');
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  // Başlangıç verisi (varsayılan) ile kayıtlı veriyi birleştirir: yeni eklenen alanlar otomatik gelir.
  function birlestir(ilk, veri) {
    if (veri === undefined || veri === null) return ilk;
    if (isObj(ilk) && isObj(veri)) {
      const o = {};
      for (const k of new Set([...Object.keys(ilk), ...Object.keys(veri)])) o[k] = birlestir(ilk[k], veri[k]);
      return o;
    }
    return veri;
  }
  const IMG_RE = /^(\/(assets|yuklemeler)\/[\w\-./]+\.(jpe?g|png|webp|svg|gif)|https:\/\/[^\s"'<>]+)$/i;
  const safeImg = p => (IMG_RE.test(str(p)) && !/\.\./.test(p) ? str(p) : '');
  const safeHref = h => {
    h = str(h);
    if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(h) && !/^\/\//.test(h)) return h;
    return '#';
  };
  const cut = (t, n) => t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1) > 60 ? t.lastIndexOf(' ', n - 1) : n - 1).replace(/[,;:]$/, '') + '…';
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const fmtDate = d => { const [y, m, g] = d.split('-').map(Number); return `${g} ${AYLAR[m - 1]} ${y}`; };
  const paras = t => str(t).replace(/\r/g, '').split(/\n\s*\n/).map(s => s.trim().replace(/\s*\n\s*/g, ' ')).filter(Boolean);

  /* ---------------- basit markdown ---------------- */
  function inline(s) {
    return esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+?)\]\(([^)\s]+?)\)/g, (m, t, h) => {
        const href = safeHref(h.replace(/&amp;/g, '&'));
        const ext = /^https?:\/\//i.test(href);
        return `<a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
      });
  }
  function md(src) {
    const lines = String(src || '').replace(/\r/g, '').split('\n');
    let html = '', para = [], list = [], ol = false;
    const flushP = () => { if (para.length) { html += `<p>${inline(para.join(' '))}</p>\n`; para = []; } };
    const flushL = () => { if (list.length) { const t = ol ? 'ol' : 'ul'; html += `<${t}>${list.map(i => `<li>${inline(i)}</li>`).join('')}</${t}>\n`; list = []; } };
    for (const raw of lines) {
      const l = raw.trim();
      if (!l) { flushP(); flushL(); continue; }
      if (l.startsWith('### ')) { flushP(); flushL(); const t = l.slice(4); html += `<h3 id="${slugify(t)}">${inline(t)}</h3>\n`; continue; }
      if (l.startsWith('## ') || l.startsWith('# ')) { flushP(); flushL(); const t = l.replace(/^#+ /, ''); html += `<h2 id="${slugify(t)}">${inline(t)}</h2>\n`; continue; }
      if (l.startsWith('> ')) { flushP(); flushL(); html += `<blockquote><p>${inline(l.slice(2))}</p></blockquote>\n`; continue; }
      const im = l.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (im) {
        flushP(); flushL();
        const src2 = safeImg(im[2]);
        if (src2) html += `<figure class="md-img"><img src="${esc(src2)}" alt="${esc(im[1])}" loading="lazy">${im[1] ? `<figcaption>${esc(im[1])}</figcaption>` : ''}</figure>\n`;
        continue;
      }
      if (/^[*-] /.test(l)) { flushP(); if (list.length && ol) flushL(); ol = false; list.push(l.slice(2)); continue; }
      const on = l.match(/^\d+[.)] (.*)$/);
      if (on) { flushP(); if (list.length && !ol) flushL(); ol = true; list.push(on[1]); continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return html;
  }

  /* ---------------- ana fonksiyon ---------------- */
  function renderSite(V, O) {
    O = O || {};
    const files = {};
    const write = (rel, s) => { files[rel] = s; };
    const BUILD_DATE = O.buildDate || new Date().toISOString().slice(0, 10);
    const YEAR = O.year || Number(BUILD_DATE.slice(0, 4));
    const CSS_V = O.cssV || '1', JS_V = O.jsV || '1';
    const NOINDEX_ALL = !!O.noindex;

    /* ---- site ayarları ---- */
    const S = V.site || {};
    const site = {
      url: (str(S.url) || 'https://yilmazcaglayan.av.tr').replace(/\/$/, ''),
      name: str(S.name) || 'Avukat Yılmaz ÇAĞLAYAN',
      siteTitle: str(S.siteTitle) || 'Av. Yılmaz Çağlayan',
      slogan: str(S.slogan),
      tagline: str(S.tagline),
      homeDescription: str(S.homeDescription),
      phone: str(S.phone), email: str(S.email),
      address: { street: str(S.street), district: str(S.district), city: str(S.city), country: 'TR' },
      hours: str(S.hours), hoursNote: str(S.hoursNote),
      areaServed: str(S.areaServed).split(',').map(s => s.trim()).filter(Boolean),
      gaId: /^G-[A-Z0-9]{4,}$/i.test(str(S.gaId)) ? str(S.gaId) : '',
      gscVerification: str(S.gscVerification).replace(/^.*content="([^"]+)".*$/, '$1')
    };
    site.address.full = [site.address.street, [site.address.district, site.address.city].filter(Boolean).join(' / ')].filter(Boolean).join(', ');
    {
      const d = site.phone.replace(/\D/g, '');
      site.phoneHref = d.startsWith('90') ? '+' + d : d.startsWith('0') ? '+9' + d : d ? '+90' + d : '';
    }
    {
      const lat = Number(S.lat), lng = Number(S.lng);
      site.geo = S.lat !== '' && S.lng !== '' && S.lat != null && S.lng != null && isFinite(lat) && isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat || lng) ? { lat, lng } : null;
    }
    if (!site.areaServed.length) site.areaServed = ['Milas', 'Muğla'];
    const abs = p => site.url + p;

    /* ---- içerikler ---- */
    const T = V.metinler || {};
    const H = V.anasayfa || {};
    const seen = new Set();
    const areas = (V.alanlar || []).filter(a => a && str(a.title)).map(a => {
      let slug = slugify(a.slug || a.title) || 'alan';
      while (seen.has(slug)) slug += '-2';
      seen.add(slug);
      return { slug, title: str(a.title), footerLabel: str(a.footerLabel) || str(a.title), icon: ICONS.raw[a.icon] ? a.icon : 'scales', short: str(a.short), text: str(a.text), detay: str(a.detay), seoTitle: str(a.seoTitle) || shortTitle(str(a.title)), seoDesc: str(a.seoDesc) || cut(str(a.text) || str(a.short), 160) };
    });
    const areaBySlug = {};
    areas.forEach(a => { areaBySlug[a.slug] = a; });
    const fallbackArea = areaBySlug['hukuki-danismanlik'] ? 'hukuki-danismanlik' : (areas[0] ? areas[0].slug : '');
    const bseen = new Set();
    const books = (V.eserler || []).filter(b => b && str(b.title)).map(b => {
      let slug = slugify(b.slug || b.title) || 'eser';
      while (bseen.has(slug)) slug += '-2';
      bseen.add(slug);
      return { slug, title: str(b.title), coverTitle: str(b.coverTitle) || str(b.title), nitelik: str(b.nitelik), kapsam: str(b.kapsam), kapak: safeImg(b.kapak) };
    });
    const F = V.sss || {};
    const faq = (F.gruplar || []).filter(g => g && str(g.group)).map(g => ({ group: str(g.group), area: str(g.area), items: (g.items || []).filter(i => i && str(i.q) && str(i.a)).map(i => ({ q: str(i.q), a: str(i.a) })) })).filter(g => g.items.length);
    faq.forEach((g, k) => { g.id = g.area && areaBySlug[g.area] ? g.area : slugify(g.group) || 'grup-' + (k + 1); });

    const aseen = new Set();
    const articles = (V.makaleler || []).map((d, idx) => ({ d, idx })).filter(x => x.d && x.d.yayinda !== false && str(x.d.title)).map(({ d, idx }) => {
      let slug = slugify(d.slug || d.title) || 'makale';
      while (aseen.has(slug)) slug += '-2';
      aseen.add(slug);
      const body = String(d.body || '').replace(/\r/g, '');
      const plain = body.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*]/g, '');
      const words = plain.split(/\s+/).filter(Boolean).length;
      const firstPara = (plain.split(/\n\s*\n/).map(s => s.trim().replace(/\s+/g, ' ')).find(s => s && !/^[-*] /.test(s) && !/^\d+[.)] /.test(s)) || '');
      const area = areaBySlug[d.area] ? d.area : fallbackArea;
      const related = (Array.isArray(d.related) ? d.related : String(d.related || '').split(',')).map(s => str(s)).filter((r, i, arr) => areaBySlug[r] && r !== area && arr.indexOf(r) === i);
      return {
        idx, slug, title: str(d.title), date: /^\d{4}-\d{2}-\d{2}$/.test(str(d.date)) ? str(d.date) : BUILD_DATE, area, related,
        description: str(d.description) || cut(firstPara, 155), image: safeImg(d.image),
        excerpt: cut(firstPara.split(/(?<=\.)\s/).slice(0, 2).join(' '), 420),
        html: md(body), minutes: Math.max(2, Math.round(words / 200)), url: `/makaleler/${slug}/`
      };
    }).sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : a.idx - b.idx));

    /* ---------------- yapılandırılmış veri ---------------- */
    const ORG_ID = abs('/#buro');
    const PERSON_ID = abs('/hakkimda/#yilmaz-caglayan');
    const ozg = V.ozgecmis || {};
    const portrait = safeImg((H.hakkinda || {}).gorsel) || '/assets/img/yilmaz-caglayan.jpg';
    function orgSchema() {
      const o = {
        '@type': ['LegalService', 'Attorney'],
        '@id': ORG_ID,
        name: 'Av. Yılmaz Çağlayan Hukuk Bürosu',
        alternateName: [site.siteTitle, 'Milas Avukat Yılmaz Çağlayan', 'Avukat Yılmaz Çağlayan'],
        slogan: site.slogan,
        description: `${site.slogan}. Ceza, tazminat, icra, iş, ticaret, gayrimenkul, idare, miras ve aile hukuku.`,
        url: abs('/'),
        image: abs(portrait),
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
      const hm = str(site.hours).match(/(\d{1,2}[:.]\d{2})\s*[–-]\s*(\d{1,2}[:.]\d{2})/);
      if (hm) { o.openingHoursSpecification[0].opens = hm[1].replace('.', ':').padStart(5, '0'); o.openingHoursSpecification[0].closes = hm[2].replace('.', ':').padStart(5, '0'); }
      if (site.geo) { o.geo = { '@type': 'GeoCoordinates', latitude: site.geo.lat, longitude: site.geo.lng }; o.hasMap = `https://www.google.com/maps?q=${site.geo.lat},${site.geo.lng}`; }
      return o;
    }
    function personSchema() {
      return {
        '@type': 'Person', '@id': PERSON_ID, name: 'Yılmaz Çağlayan', jobTitle: 'Avukat', honorificPrefix: 'Av.',
        image: abs(portrait), url: abs('/hakkimda/'), worksFor: { '@id': ORG_ID },
        birthPlace: 'İstanbul', alumniOf: { '@type': 'CollegeOrUniversity', name: 'İstanbul Üniversitesi Hukuk Fakültesi' },
        knowsLanguage: 'tr'
      };
    }
    const crumbsSchema = items => ({ '@type': 'BreadcrumbList', itemListElement: items.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: abs(c[1]) })) });
    const ld = graph => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`;

    /* ---------------- şablon parçaları ---------------- */
    const DEF_NAV = [['/', 'Ana Sayfa'], ['/calisma-alanlari/', 'Çalışma Alanları'], ['/yayimlanmis-eserler/', 'Yayımlanmış Eserler'], ['/hakkimda/', 'Özgeçmiş'], ['/makaleler/', 'Makaleler'], ['/sikca-sorulan-sorular/', 'Sıkça Sorulan Sorular'], ['/iletisim/', 'İletişim']];
    const navData = Array.isArray(T.menu) ? T.menu : [];
    const NAV = DEF_NAV.map(([href, label]) => {
      const m = navData.find(x => x && x.href === href) || {};
      return { href, label: str(m.label) || label, full: str(m.uzun) || str(m.label) || label };
    });
    const navLabel = href => (NAV.find(n => n.href === href) || {}).label || '';
    const callLabel = str(T.aramaButonu) || 'Hemen Ara';

    const brandInner = () => `<span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="7" r="2.2"/><path d="M24 9.2V40"/><path d="M9 14.5c5 1.6 10 1.6 15 0 5 1.6 10 1.6 15 0"/><path d="M11 15.2 5.5 28M11 15.2 16.5 28M37 15.2 31.5 28M37 15.2 42.5 28"/><path d="M4.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M30.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M17 40.5h14M19.5 43.5h9"/></svg></span><i class="brand-bar" aria-hidden="true"></i><span class="brand-text"><small class="brand-kicker">Avukat</small><span class="brand-name">Yılmaz Çağlayan</span><span class="brand-sub">${esc(site.tagline)}</span></span>`;

    function header(current) {
      const links = NAV.map(({ href, label }) => {
        const active = current === href || (href !== '/' && current.startsWith(href));
        return `<a href="${href}"${active ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
      }).join('');
      return `
<header class="site-header">
  <div class="wrap">
    <div class="nav-pill">
      <a class="brand" href="/" aria-label="${esc(site.name)} – Ana Sayfa">
        ${brandInner()}
      </a>
      <nav class="nav" id="site-nav" aria-label="Ana menü">${links}<a class="nav-call" href="tel:${site.phoneHref}">${icon('phone')} ${esc(callLabel)}</a></nav>
      <a class="nav-cta" href="tel:${site.phoneHref}">${icon('phone')}<span>${esc(site.phone)}</span></a>
      <button class="menu-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Menüyü aç">${icon('menu')}</button>
    </div>
  </div>
</header>`;
    }

    function contactBand() {
      const B = T.iletisimBandi || {};
      return `
<section class="contact-band-wrap"><div class="wrap">
  <div class="contact-band reveal">
    <div class="cb-text">
      ${str(B.ust) ? `<span class="eyebrow on-dark">${esc(B.ust)}</span>` : ''}
      <h2>${esc(str(B.baslik) || 'Hukuki danışmanlık için randevu alın.')}</h2>
      ${str(B.metin) ? `<p>${esc(B.metin)}</p>` : ''}
      <div class="btn-row">
        <a class="btn btn-gold" href="tel:${site.phoneHref}">${icon('phone')} ${esc(callLabel)}</a>
        <a class="btn btn-ghost" href="/iletisim/">${esc((NAV.find(n => n.href === '/iletisim/') || {}).full)}</a>
      </div>
    </div>
    <ul class="cb-list">
      <li><span class="ib">${icon('phone')}</span><span><small>Telefon</small><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></span></li>
      <li><span class="ib">${icon('mail')}</span><span><small>E-posta</small><a href="mailto:${esc(site.email)}">${esc(site.email)}</a></span></li>
      <li><span class="ib">${icon('pin')}</span><span><small>Adres</small><b>${esc(site.address.full)}</b></span></li>
      <li><span class="ib">${icon('clock')}</span><span><small>Çalışma saatleri</small><b>${esc(site.hours)}</b></span></li>
    </ul>
  </div>
</div></section>`;
    }

    function footer() {
      const A = T.altBilgi || {};
      return `
<footer class="site-footer"><div class="wrap">
  <div class="ft-top">
    <div class="ft-brand">
      <a class="brand" href="/">${brandInner()}</a>
      ${str(A.metin) ? `<p>${esc(A.metin)}</p>` : ''}
    </div>
    <nav class="ft-links" aria-label="Alt menü">${NAV.map(n => `<a href="${n.href}">${esc(n.full)}</a>`).join('')}</nav>
    <nav class="ft-links" aria-label="Çalışma alanları">${areas.map(a => `<a href="/calisma-alanlari/${a.slug}/">${esc(a.footerLabel)}</a>`).join('')}</nav>
  </div>
  <div class="ft-bottom">
    <span>© ${YEAR} ${esc(site.siteTitle)}</span>
    ${str(A.uyari) ? `<span>${esc(A.uyari)}</span>` : ''}
  </div>
</div></footer>
<a class="call-fab" href="tel:${site.phoneHref}" aria-label="Telefonla ara: ${esc(site.phone)}">${icon('phone')} Ara</a>`;
    }

    function layout({ path: p, title, description, body, schema = [], ogType = 'website', image = '/assets/img/og-image.jpg', home = false, noindex = false, preload = '' }) {
      const canonical = abs(p);
      title = str(title) || site.siteTitle;
      description = str(description) || site.slogan;
      if (title.length > 65) title = title.replace(/ \| Av\. Yılmaz Çağlayan$/, '');
      if (description.length > 165) description = description.slice(0, description.lastIndexOf(' ', 160)).replace(/[,;:.]$/, '') + '…';
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
${NOINDEX_ALL ? '<meta name="robots" content="noindex, nofollow">' : noindex ? '<meta name="robots" content="noindex">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
${site.gscVerification ? `<meta name="google-site-verification" content="${esc(site.gscVerification)}">` : ''}
<meta name="theme-color" content="#0B1324">
<meta name="geo.region" content="TR-48">
<meta name="geo.placename" content="${esc([site.address.district, site.address.city].filter(Boolean).join(', '))}">
<meta property="og:locale" content="tr_TR">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(site.siteTitle)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(/^https:/.test(image) ? image : abs(image))}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600&display=swap">
<link rel="stylesheet" href="/assets/css/style.css?v=${CSS_V}">
${preload}
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
  ${eyebrow ? `<span class="tag"><b>${esc(eyebrow)}</b> ${esc([site.address.district, site.address.city].filter(Boolean).join(' · '))}</span>` : ''}
  <h1>${esc(title)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
</div></section>`;
    }

    const sectionHead = (eyebrow, title, text, tag = 'h2') => `<div class="sh reveal"><div>${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ''}<${tag} class="h2">${esc(title)}</${tag}></div>${text ? `<p>${esc(text)}</p>` : ''}</div>`;

    function areaCard(a) {
      return `<a class="card area-card reveal" href="/calisma-alanlari/${a.slug}/">
    <span class="ib">${icon(a.icon)}</span>
    <h3>${esc(shortTitle(a.title))}</h3>
    <p>${esc(a.short)}</p>
    <span class="more">İncele ${icon('arrow')}</span>
  </a>`;
    }

    function bento() {
      const sel = Array.isArray((H.alanlar || {}).secili) ? H.alanlar.secili : [];
      let pick = sel.map(s => areaBySlug[s]).filter((a, i, arr) => a && arr.indexOf(a) === i);
      if (!pick.length) pick = areas.slice(0, 8);
      const others = areas.filter(a => !pick.includes(a));
      return `<div class="bento">
  ${pick.map(a => areaCard(a)).join('')}
  ${others.length ? `<a class="card area-gold reveal" href="/calisma-alanlari/">
    <span class="ib">${icon('plus')}</span>
    <h3>+${others.length} alan daha</h3>
    <p>${esc(others.map(a => shortTitle(a.title).replace(/ Hukuku.*$/, ' hukuku').replace(/ ve Sözleşme Hazırlanması$/, '')).join(', '))}.</p>
    <span class="more">Tümünü gör ${icon('arrow')}</span>
  </a>` : ''}
</div>`;
    }

    function cover(b) {
      if (b.kapak) return `<span class="cover has-img"><img src="${esc(b.kapak)}" alt="${esc(b.title)} kitap kapağı" loading="lazy"></span>`;
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
    ${withText ? `<dl>${b.nitelik ? `<dt>Niteliği</dt><dd>${esc(b.nitelik)}</dd>` : ''}${b.kapsam ? `<dt>Kapsam</dt><dd>${esc(b.kapsam)}</dd>` : ''}</dl>` : ''}
  </article>`).join('')}
</div>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="Kitap kapağı" aria-hidden="true">
  <button class="lightbox-close" type="button" aria-label="Kapat">${icon('close')}</button>
  <div class="lightbox-inner"><div class="cover-wrap"></div><p class="lightbox-cap"></p></div>
</div>`;
    }

    function postCard(a, dark = false) {
      return `<article class="card post${dark ? ' dark' : ''}${a.image ? ' has-thumb' : ''} reveal">
    ${a.image ? `<a class="post-thumb" href="${a.url}" tabindex="-1" aria-hidden="true"><img src="${esc(a.image)}" alt="" loading="lazy"></a>` : ''}
    <a class="chip" href="/calisma-alanlari/${a.area}/">${esc(shortTitle((areaBySlug[a.area] || {}).title || 'Makale'))}</a>
    <h3><a href="${a.url}">${esc(a.title)}</a></h3>
    <p>${esc(a.excerpt)}</p>
    <span class="meta"><span>${a.minutes} dk okuma</span><a href="${a.url}">Oku ${icon('arrow')}</a></span>
  </article>`;
    }

    /* ---------------- SAYFALAR ---------------- */
    const KNOWN_DIM = { '/assets/img/themis.jpg': [1536, 1024], '/assets/img/yilmaz-caglayan.jpg': [1170, 856], '/assets/img/yilmaz-caglayan-ozgecmis.jpg': [790, 856] };
    const dim = p => KNOWN_DIM[p] ? ` width="${KNOWN_DIM[p][0]}" height="${KNOWN_DIM[p][1]}"` : '';

    // ANA SAYFA
    function home() {
      const tel = site.phoneHref;
      let slides = (Array.isArray(H.slaytlar) ? H.slaytlar : []).filter(s => s && (safeImg(s.gorsel) || str(s.baslik) || str(s.baslikVurgu) || str(s.ust)));
      if (!slides.length) slides = [{ stil: 'baslik', ton: 'koyu', gorsel: '/assets/img/themis.jpg', gorselMobil: '/assets/img/themis-mobile.jpg', ustKalin: 'Av. Yılmaz Çağlayan', ust: site.tagline, baslik: site.slogan, butonlar: true }];
      const sec = Math.min(30, Math.max(1, Number(H.slaytSuresi) || 2));
      const preloads = [];
      const bg = slides.map((s, k) => {
        const img = safeImg(s.gorsel), mob = safeImg(s.gorselMobil);
        const portre = s.ton === 'portre';
        const alt = esc(str(s.gorselAlt));
        const pr = k === 0 ? ' fetchpriority="high"' : ' loading="lazy"';
        let media = '';
        if (img && mob) media = `<picture><source media="(max-width: 680px)" srcset="${esc(mob)}"><img src="${esc(img)}" alt="${alt}"${dim(img)}${pr}></picture>`;
        else if (img) media = `<img src="${esc(img)}" alt="${alt}"${dim(img)}${pr}>`;
        if (k === 0 && img) {
          if (mob) preloads.push(`<link rel="preload" as="image" href="${esc(img)}" media="(min-width: 681px)" fetchpriority="high">\n<link rel="preload" as="image" href="${esc(mob)}" media="(max-width: 680px)" fetchpriority="high">`);
          else preloads.push(`<link rel="preload" as="image" href="${esc(img)}" fetchpriority="high">`);
        }
        return `<div class="hp${k === 0 ? ' is-active' : ''}${portre ? ' hp-portrait' : ''}" data-slide="${k}" data-tone="${portre ? 'portrait' : 'dark'}"${k ? ' aria-hidden="true"' : ''}><div class="hp-media">${media}</div></div>`;
      }).join('\n    ');
      let h1Used = false;
      const tagEl = (inner, cls) => { const t = h1Used ? 'p' : 'h1'; h1Used = true; return `<${t} class="${cls}">${inner}</${t}>`; };
      const btns = `<div class="btn-row hero-btns">
          <a class="btn btn-gold" href="tel:${tel}">${esc(str(H.buton1) || 'Randevu Al')} ${icon('arrow')}</a>
          <a class="btn btn-ghost" href="/calisma-alanlari/">${esc(str(H.buton2) || navLabel('/calisma-alanlari/'))}</a>
        </div>`;
      const texts = slides.map((s, k) => {
        const first = k === 0;
        if (!first) h1Used = true;
        const ust = str(s.ustKalin) || str(s.ust) ? tagEl(`${str(s.ustKalin) ? `<b>${esc(s.ustKalin)}</b>` : ''}${str(s.ustKalin) && str(s.ust) ? ' ' : ''}${esc(str(s.ust))}`, 'tag hero-h1') : '';
        let main = '';
        if (s.stil === 'motto') {
          if (str(s.baslik) || str(s.baslikVurgu)) main = tagEl(`${str(s.baslik) ? `<b>${esc(s.baslik)}</b> ` : ''}${esc(str(s.baslikVurgu))}`, 'hero-motto');
        } else if (str(s.baslik) || str(s.baslikVurgu)) {
          main = tagEl(`${esc(str(s.baslik))}${str(s.baslikVurgu) ? ` <span>${esc(s.baslikVurgu)}</span>` : ''}`, 'hero-title');
        }
        return `<div class="hs${first ? ' is-active' : ''}${s.stil === 'motto' ? ' hs-mission' : ''}" data-slide="${k}"${first ? '' : ' aria-hidden="true"'}>
        ${ust}
        ${main}
        ${s.butonlar ? btns : ''}
      </div>`;
      }).join('\n      ');
      const h1Fallback = h1Used ? '' : `<h1 class="sr-only">${esc(site.siteTitle)}</h1>`;
      const dots = slides.length > 1 ? `
  <div class="hero-dots"><div class="wrap" role="tablist" aria-label="Slaytlar">
    <span>01</span>
    ${slides.map((s, k) => `<button type="button"${k === 0 ? ' class="is-active"' : ''} role="tab" aria-selected="${k === 0}" aria-label="${k + 1}. slayt"></button>`).join('\n    ')}
    <span>${String(slides.length).padStart(2, '0')}</span>
  </div></div>` : '';

      const HA = H.alanlar || {}, HB = H.hakkinda || {}, HE = H.eserler || {}, HM = H.makaleler || {};
      const adet = Math.min(9, Math.max(0, parseInt(HM.adet, 10) || 3));
      const stats = (Array.isArray(HB.sayilar) ? HB.sayilar : []).filter(x => x && (str(x.deger) || str(x.aciklama)));
      const body = `
<section class="hero" data-interval="${Math.round(sec * 1000)}" data-tone="${slides[0].ton === 'portre' ? 'portrait' : 'dark'}" aria-label="Karşılama">
  <div class="hero-bg">
    ${bg}
  </div>
  <div class="wrap hero-inner">${h1Fallback}
    <div class="hero-stack">
      ${texts}
    </div>
  </div>${dots}
</section>

<section class="section"><div class="wrap">
  ${sectionHead(str(HA.ust), str(HA.baslik), str(HA.metin))}
  ${bento()}
  ${str(HA.not) ? `<p class="note reveal">${esc(HA.not)}</p>` : ''}
</div></section>

<section class="section"><div class="wrap about">
  <div class="about-photo reveal"><img src="${esc(portrait)}" alt="Avukat Yılmaz Çağlayan, Milas'taki bürosunda"${dim(portrait)} loading="lazy"></div>
  <div class="card about-text reveal">
    ${str(HB.ust) ? `<span class="eyebrow">${esc(HB.ust)}</span>` : ''}
    <h2 class="h2">${esc(HB.baslik)}</h2>
    ${paras(HB.metin).map(p => `<p>${esc(p)}</p>`).join('')}
    ${stats.length ? `<div class="tl">${stats.map(x => `<div><b>${esc(x.deger)}</b><span>${esc(x.aciklama)}</span></div>`).join('')}</div>` : ''}
    <a class="more" href="/hakkimda/">${esc(str(HB.link) || 'Özgeçmişin tamamı')} ${icon('arrow')}</a>
  </div>
</div></section>
${books.length ? `
<section class="section"><div class="wrap">
  ${sectionHead(str(HE.ust), str(HE.baslik), str(HE.metin))}
  ${bookGrid(false)}
</div></section>` : ''}
${articles.length && adet ? `
<section class="section"><div class="wrap">
  ${sectionHead(str(HM.ust), str(HM.baslik), str(HM.metin))}
  <div class="posts posts-home">${articles.slice(0, adet).map((a, k) => postCard(a, k === 0)).join('')}</div>
  <p class="center reveal"><a class="btn btn-line" href="/makaleler/">${esc(str(HM.buton) || 'Tüm makaleler')} ${icon('arrow')}</a></p>
</div></section>` : ''}`;
      write('index.html', layout({
        path: '/', home: true,
        title: site.siteTitle,
        description: site.homeDescription || site.slogan,
        body, preload: preloads.join('\n'),
        schema: [{ '@type': 'WebSite', '@id': abs('/#site'), url: abs('/'), name: site.siteTitle, alternateName: 'Av. Yılmaz Çağlayan', description: site.slogan, inLanguage: 'tr-TR', publisher: { '@id': ORG_ID } }, personSchema()]
      }));
    }

    const sideCta = (title, text) => `<div class="card side-cta">
      <h2 class="h4">${esc(title)}</h2>
      <p>${text}</p>
      <a class="btn btn-gold btn-block" href="tel:${site.phoneHref}">${icon('phone')} ${esc(site.phone)}</a>
    </div>`;

    // ÇALIŞMA ALANLARI
    function areasPage() {
      const P = T.alanlarSayfa || {};
      const title = str(P.baslik) || 'Çalışma Alanlarımız';
      const body = `${pageHero({ title, eyebrow: `${areas.length} alan`, lead: str(P.giris), crumbs: [['Ana Sayfa', '/'], [title, '/calisma-alanlari/']] })}
<section class="section"><div class="wrap">
  <div class="area-list">${areas.map((a, k) => `
    <article class="card area-row reveal" id="${a.slug}">
      <span class="num">${String(k + 1).padStart(2, '0')}</span>
      <span class="ib">${icon(a.icon)}</span>
      <div><h2><a href="/calisma-alanlari/${a.slug}/">${esc(a.title)}</a></h2><p>${esc(a.text || a.short)}</p></div>
      <a class="arrow-btn" href="/calisma-alanlari/${a.slug}/" aria-label="${esc(a.title)} detayları">${icon('arrow')}</a>
    </article>`).join('')}
  </div>
  ${str(P.not) ? `<p class="note reveal">${esc(P.not)}</p>` : ''}
</div></section>`;
      write('calisma-alanlari/index.html', layout({
        path: '/calisma-alanlari/', title: str(P.seoTitle) || title, description: str(P.seoDesc), body,
        schema: [crumbsSchema([['Ana Sayfa', '/'], [title, '/calisma-alanlari/']])]
      }));

      const SP = T.sssSayfa || {};
      for (const a of areas) {
        const rel = articles.filter(x => x.area === a.slug || x.related.includes(a.slug));
        const q = faq.find(g => g.area === a.slug);
        const others = areas.filter(x => x.slug !== a.slug);
        const crumbs = [['Ana Sayfa', '/'], [navLabel('/calisma-alanlari/'), '/calisma-alanlari/'], [shortTitle(a.title), `/calisma-alanlari/${a.slug}/`]];
        const body = `${pageHero({ title: a.title, eyebrow: 'Çalışma alanı', lead: a.short, crumbs })}
<section class="section"><div class="wrap detail">
  <div class="detail-main">
    <div class="card prose-card reveal">
      <span class="ib big">${icon(a.icon)}</span>
      <div class="prose">
        ${paras(a.text).map(p => `<p>${esc(p)}</p>`).join('\n        ')}
        ${paras(a.detay).map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>
    </div>
    ${q ? `<div class="faq-group reveal"><h2 class="h3">${esc(str(SP.baslik) || 'Sıkça Sorulan Sorular')}</h2>${q.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}</div>` : ''}
    ${rel.length ? `<div class="reveal"><h2 class="h3">İlgili Makaleler</h2><div class="posts posts-2">${rel.map(r => postCard(r)).join('')}</div></div>` : ''}
  </div>
  <aside class="detail-side">
    ${others.length ? `<div class="card side-card">
      <h2 class="h4">Diğer çalışma alanları</h2>
      <nav class="side-links">${others.map(o => `<a href="/calisma-alanlari/${o.slug}/">${icon(o.icon)}<span>${esc(shortTitle(o.title))}</span></a>`).join('')}</nav>
    </div>` : ''}
    ${sideCta(str(P.randevuBaslik) || 'Randevu için', `${esc(site.hours)}<br>${esc(site.hoursNote)}`)}
  </aside>
</div></section>`;
        write(`calisma-alanlari/${a.slug}/index.html`, layout({
          path: `/calisma-alanlari/${a.slug}/`, title: `${a.seoTitle} | Av. Yılmaz Çağlayan`, description: a.seoDesc, body,
          schema: [crumbsSchema(crumbs), { '@type': 'Service', name: a.title, serviceType: a.title, description: a.text || a.short, provider: { '@id': ORG_ID }, areaServed: site.areaServed.map(n => ({ '@type': 'City', name: n })), url: abs(`/calisma-alanlari/${a.slug}/`) }]
        }));
      }
    }

    // ESERLER
    function booksPage() {
      const P = T.eserlerSayfa || {};
      const title = str(P.baslik) || 'Yayımlanmış Eserler ve Kitaplar';
      const crumbs = [['Ana Sayfa', '/'], [title, '/yayimlanmis-eserler/']];
      const body = `${pageHero({ title, eyebrow: `${books.length} eser`, lead: str(P.giris), crumbs })}
<section class="section"><div class="wrap">
  ${bookGrid(true)}
</div></section>`;
      write('yayimlanmis-eserler/index.html', layout({
        path: '/yayimlanmis-eserler/', title: str(P.seoTitle) || title, description: str(P.seoDesc), body,
        schema: [crumbsSchema(crumbs), ...books.map(b => ({ '@type': 'Book', name: b.title, author: { '@id': PERSON_ID }, inLanguage: 'tr', about: b.nitelik, url: abs(`/yayimlanmis-eserler/#${b.slug}`) }))]
      }));
    }

    // ÖZGEÇMİŞ
    function aboutPage() {
      const crumbs = [['Ana Sayfa', '/'], [navLabel('/hakkimda/'), '/hakkimda/']];
      const foto = safeImg(ozg.foto);
      const tl = (Array.isArray(ozg.zaman) ? ozg.zaman : []).filter(x => x && (str(x.yil) || str(x.metin)));
      const fw = Number(ozg.fotoGenislik), fh = Number(ozg.fotoYukseklik);
      const fdim = foto && KNOWN_DIM[foto] ? dim(foto) : (fw > 0 && fh > 0 ? ` width="${fw}" height="${fh}"` : '');
      const body = `${pageHero({ title: str(ozg.baslik) || 'Avukat Yılmaz ÇAĞLAYAN', eyebrow: str(ozg.ust), lead: str(ozg.giris), crumbs })}
<section class="section"><div class="wrap bio">
  ${foto ? `<figure class="bio-photo reveal"><img src="${esc(foto)}" alt="Avukat Yılmaz Çağlayan"${fdim} fetchpriority="high"></figure>` : ''}
  <div class="card prose-card bio-card reveal">
    ${str(ozg.icerikBaslik) ? `<h2 class="h2 bio-title">${esc(ozg.icerikBaslik)}</h2>` : ''}
    <div class="prose">
        ${paras(ozg.metin).map(p => `<p>${esc(p)}</p>`).join('\n        ')}
      </div>
  </div>
  ${tl.length ? `<div class="tl tl-cards reveal">
      ${tl.map(x => `<div><b>${esc(x.yil)}</b><span>${esc(x.metin)}</span></div>`).join('\n      ')}
    </div>` : ''}
    ${books.length ? `<div class="card works-card reveal">
      <h2 class="h3">${esc(str(ozg.eserBaslik) || 'Akademik Eserler')}</h2>
      <ol class="works">${books.map(b => `<li><a href="/yayimlanmis-eserler/#${b.slug}">${esc(b.title)}</a></li>`).join('')}</ol>
    </div>` : ''}
</div></section>`;
      write('hakkimda/index.html', layout({
        path: '/hakkimda/', title: str(ozg.seoTitle) || 'Özgeçmiş | Avukat Yılmaz Çağlayan', description: str(ozg.seoDesc) || str(ozg.giris),
        body, ogType: 'profile', image: portrait,
        schema: [crumbsSchema(crumbs), personSchema(), { '@type': 'ProfilePage', mainEntity: { '@id': PERSON_ID }, url: abs('/hakkimda/') }]
      }));
    }

    // MAKALELER
    function articlesPages() {
      const P = T.makalelerSayfa || {};
      const title = str(P.baslik) || 'Makaleler';
      const crumbs = [['Ana Sayfa', '/'], [title, '/makaleler/']];
      const body = `${pageHero({ title, eyebrow: `${articles.length} yazı`, lead: str(P.giris), crumbs })}
<section class="section"><div class="wrap">
  ${articles.length ? `<div class="posts posts-grid">${articles.map((a, k) => postCard(a, k === 0)).join('')}</div>` : '<p class="note">Henüz yayımlanmış makale bulunmuyor.</p>'}
</div></section>`;
      write('makaleler/index.html', layout({
        path: '/makaleler/', title: str(P.seoTitle) || title, description: str(P.seoDesc), body,
        schema: [crumbsSchema(crumbs), { '@type': 'CollectionPage', name: title, url: abs('/makaleler/'), hasPart: articles.map(a => ({ '@type': 'Article', headline: a.title, url: abs(a.url) })) }]
      }));

      for (const a of articles) {
        const area = areaBySlug[a.area];
        const relAreas = [a.area, ...a.related].map(s => areaBySlug[s]).filter(Boolean);
        const relPosts = articles.filter(x => x !== a && (x.area === a.area || a.related.includes(x.area) || x.related.includes(a.area)));
        const fill = articles.filter(x => x !== a && !relPosts.includes(x));
        const more = [...relPosts, ...fill].slice(0, 3);
        const c = [['Ana Sayfa', '/'], [title, '/makaleler/'], [a.title, a.url]];
        const body = `${pageHero({ title: a.title, eyebrow: area ? shortTitle(area.title) : 'Makale', crumbs: c })}
<section class="section"><div class="wrap detail">
  <article class="detail-main">
    <div class="card prose-card article-card reveal">
      ${a.image ? `<figure class="article-cover"><img src="${esc(a.image)}" alt="${esc(a.title)}" fetchpriority="high"></figure>` : ''}
      <div class="post-meta">${area ? `<a href="/calisma-alanlari/${area.slug}/">${esc(area.title)}</a> · ` : ''}${a.minutes} dk okuma · <time datetime="${a.date}">${fmtDate(a.date)}</time></div>
      <div class="prose">${a.html}</div>
      ${str(P.uyari) ? `<p class="legal-note">${esc(P.uyari)}</p>` : ''}
    </div>
  </article>
  <aside class="detail-side">
    ${relAreas.length ? `<div class="card side-card">
      <h2 class="h4">İlgili çalışma alanı</h2>
      <nav class="side-links">${relAreas.map(r => `<a href="/calisma-alanlari/${r.slug}/">${icon(r.icon)}<span>${esc(shortTitle(r.title))}</span></a>`).join('')}</nav>
    </div>` : ''}
    ${sideCta(str(P.yanBaslik) || 'Hukuki destek', esc(str(P.yanMetin)))}
  </aside>
</div></section>
${more.length ? `<section class="section"><div class="wrap">
  ${sectionHead(title, str(P.digerBaslik) || 'Diğer yazılar.')}
  <div class="posts posts-home">${more.map(m => postCard(m)).join('')}</div>
</div></section>` : ''}`;
        write(`makaleler/${a.slug}/index.html`, layout({
          path: a.url, title: `${a.title} | Av. Yılmaz Çağlayan`, description: a.description, body, ogType: 'article', image: a.image || undefined,
          schema: [crumbsSchema(c), {
            '@type': 'Article', headline: a.title.slice(0, 110), description: a.description, datePublished: a.date, dateModified: a.date,
            inLanguage: 'tr-TR', mainEntityOfPage: abs(a.url), author: { '@id': PERSON_ID }, publisher: { '@id': ORG_ID },
            image: a.image && /^https:/.test(a.image) ? a.image : abs(a.image || '/assets/img/og-image.jpg'), about: area ? area.title : undefined
          }]
        }));
      }
    }

    // SSS
    function faqPage() {
      const P = T.sssSayfa || {};
      const title = str(P.baslik) || 'Sıkça Sorulan Sorular';
      const crumbs = [['Ana Sayfa', '/'], [title, '/sikca-sorulan-sorular/']];
      const body = `${pageHero({ title, eyebrow: 'S.S.S.', lead: str(P.giris), crumbs })}
<section class="section"><div class="wrap faq-wrap">
  <nav class="card faq-index" aria-label="Konular">${faq.map(g => `<a href="#${g.id}">${icon((areaBySlug[g.area] || {}).icon || 'fileSearch')}<span>${esc(g.group.replace(/ Avukatlığı$/, ''))}</span></a>`).join('')}</nav>
  <div class="faq-list">
  ${faq.map(g => {
    const a = areaBySlug[g.area];
    return `<div class="faq-group reveal" id="${g.id}">
    <div class="faq-head">${a ? `<span class="ib">${icon(a.icon)}</span>` : ''}<h2 class="h3">${a ? `<a href="/calisma-alanlari/${a.slug}/">${esc(g.group)}</a>` : esc(g.group)}</h2></div>
    ${g.items.map(it => `<details class="acc"><summary>${esc(it.q)}<span class="pm" aria-hidden="true"></span></summary><div class="acc-body"><p>${esc(it.a)}</p></div></details>`).join('')}
  </div>`;
  }).join('')}
  ${str(F.uyari) ? `<div class="card disclaimer"><strong>${esc(str(F.uyariBaslik) || 'Yasal Sorumluluk Reddi Uyarısı')}</strong><p>${esc(F.uyari)}</p></div>` : ''}
  </div>
</div></section>`;
      write('sikca-sorulan-sorular/index.html', layout({
        path: '/sikca-sorulan-sorular/', title: str(P.seoTitle) || title, description: str(P.seoDesc), body,
        schema: [crumbsSchema(crumbs), { '@type': 'FAQPage', mainEntity: faq.flatMap(g => g.items.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } }))) }]
      }));
    }

    // İLETİŞİM
    function contactPage() {
      const P = T.iletisimSayfa || {};
      const title = str(P.baslik) || 'İletişim Bilgileri';
      const crumbs = [['Ana Sayfa', '/'], [navLabel('/iletisim/'), '/iletisim/']];
      const q = site.geo ? `${site.geo.lat},${site.geo.lng}` : encodeURIComponent(site.address.full.replace(' / ', ' '));
      const body = `${pageHero({ title, eyebrow: 'Randevu', lead: str(P.giris), crumbs })}
<section class="section"><div class="wrap contact-grid">
  <div class="contact-cards">
    <a class="card cc reveal" href="tel:${site.phoneHref}"><span class="ib">${icon('phone')}</span><small>Telefon</small><b>${esc(site.phone)}</b></a>
    <a class="card cc reveal" href="mailto:${esc(site.email)}"><span class="ib">${icon('mail')}</span><small>E-posta</small><b>${esc(site.email)}</b></a>
    <div class="card cc reveal"><span class="ib">${icon('pin')}</span><small>Adres</small><b>${esc(site.address.street)}<br>${esc([site.address.district, site.address.city].filter(Boolean).join(' / '))}</b></div>
    <div class="card cc reveal"><span class="ib">${icon('clock')}</span><small>Çalışma Saatleri</small><b>${esc(site.hours)}</b><span class="sub">${esc(site.hoursNote)}</span></div>
    <div class="btn-row">
      <a class="btn btn-dark" href="tel:${site.phoneHref}">${icon('phone')} ${esc(callLabel)}</a>
      <a class="btn btn-line" href="https://www.google.com/maps/dir/?api=1&amp;destination=${q}" target="_blank" rel="noopener">${icon('pin')} Yol Tarifi Al</a>
    </div>
  </div>
  <div class="map reveal">
    <iframe title="Büro konumu – Google Haritalar" src="https://www.google.com/maps?q=${q}&amp;z=17&amp;hl=tr&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>
  </div>
</div></section>`;
      write('iletisim/index.html', layout({
        path: '/iletisim/', title: str(P.seoTitle) || title,
        description: str(P.seoDesc) || `Av. Yılmaz Çağlayan, ${site.address.district || 'Milas'} avukatlık bürosu: ${site.phone} · ${site.address.full}. ${site.hours.replace('Hafta İçi:', 'Hafta içi')}, randevulu kabul.`,
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
${urls.map(([u, p, f, d]) => `  <url><loc>${abs(u)}</loc><lastmod>${d && d < BUILD_DATE ? d : BUILD_DATE}</lastmod><changefreq>${f}</changefreq><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
      write('robots.txt', NOINDEX_ALL ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /yonetim/\n\nSitemap: ${abs('/sitemap.xml')}\n`);
    }

    home(); areasPage(); booksPage(); aboutPage(); articlesPages(); faqPage(); contactPage(); notFound(); sitemapAndRobots();
    return files;
  }

  // Yayımlanabilecek dosya adları (sunucu tarafı aynı kuralı uygular)
  const PAGE_RE = /^(index\.html|404\.html|sitemap\.xml|robots\.txt|(calisma-alanlari|makaleler)(\/[a-z0-9-]+)?\/index\.html|(hakkimda|yayimlanmis-eserler|sikca-sorulan-sorular|iletisim)\/index\.html)$/;

  return { renderSite, birlestir, md, slugify, esc, PAGE_RE, fmtDate, AYLAR };
});
