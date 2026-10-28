/* Yönetim paneli — temel: API, durum, arayüz yardımcıları, giriş ve yayınlama */
(function () {
  'use strict';
  const P = window.YP = {};
  const R = window.YCRender;
  const DOCS = ['site', 'anasayfa', 'alanlar', 'eserler', 'ozgecmis', 'sss', 'metinler', 'makaleler'];
  P.DOCS = DOCS;
  const S = P.S = { csrf: '', kullanici: '', ilkSifre: false, veri: {}, ilk: {}, surum: {}, ortam: {}, kirli: {}, bolum: 'genel' };

  /* ---------------- yardımcılar ---------------- */
  const esc = P.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  P.$ = (sel, el) => (el || document).querySelector(sel);
  P.$$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  P.h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  P.kopya = v => JSON.parse(JSON.stringify(v));
  P.icon = (n, cls) => window.YCIcons.icon(n, cls || 'ico');
  P.bugun = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  P.slug = R.slugify;
  P.tarih = d => (/^\d{4}-\d{2}-\d{2}$/.test(d || '') ? R.fmtDate(d) : '—');
  P.sayi = n => Number(n || 0).toLocaleString('tr-TR');

  const SVG = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    slides: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m3 14 5-5 4 4 3-3 6 6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5v.01"/>',
    text: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    ext: '<path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>',
    up: '<path d="m18 15-6-6-6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', close: '<path d="M18 6 6 18M6 6l12 12"/>',
    back: '<path d="m15 18-6-6 6-6"/>', refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', warn: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'
  };
  P.svg = (n, cls) => `<svg class="${cls || 'ico'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[n] || ''}</svg>`;

  /* ---------------- API ---------------- */
  P.api = async function (eylem, govde, opt) {
    opt = opt || {};
    const q = opt.q ? '&' + new URLSearchParams(opt.q).toString() : '';
    const init = { method: govde === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: { 'X-Requested-With': 'yc-panel' } };
    if (S.csrf) init.headers['X-YC-Token'] = S.csrf;
    if (govde instanceof FormData) init.body = govde;
    else if (govde !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(govde); }
    let r;
    try { r = await fetch('api.php?a=' + encodeURIComponent(eylem) + q, init); }
    catch (e) { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.'); }
    let j = null;
    const metin = await r.text();
    try { j = JSON.parse(metin); } catch (e) { /* PHP hata çıktısı */ }
    if (!j) {
      if (r.status === 413) throw new Error('Gönderilen veri sunucu sınırını aşıyor.');
      throw new Error(`Sunucu beklenmeyen bir yanıt verdi (${r.status}). PHP desteğinin açık olduğundan emin olun.`);
    }
    if (r.status === 401 && eylem !== 'giris' && !opt.sessiz) { P.oturumBitti(); }
    if (!j.ok) { const e = new Error(j.hata || 'İşlem tamamlanamadı.'); e.yanit = j; e.kod = r.status; throw e; }
    return j;
  };

  /* ---------------- bildirim / pencere ---------------- */
  P.toast = function (msg, tur) {
    let box = P.$('.toasts');
    if (!box) { box = P.h('<div class="toasts" role="status"></div>'); document.body.appendChild(box); }
    const t = P.h(`<div class="toast ${tur || 'ok'}">${P.svg(tur === 'err' ? 'warn' : 'check')}<span>${esc(msg)}</span></div>`);
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), tur === 'err' ? 7000 : 3600);
    setTimeout(() => t.remove(), tur === 'err' ? 7600 : 4200);
  };
  P.modal = function (baslik, icerik, opt) {
    opt = opt || {};
    const m = P.h(`<div class="modal-bg"><div class="modal ${opt.genis ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(baslik)}">
      <div class="modal-head"><h3>${esc(baslik)}</h3><button class="icon-btn" data-kapat aria-label="Kapat">${P.svg('close')}</button></div>
      <div class="modal-body"></div>
      ${opt.alt ? `<div class="modal-foot">${opt.alt}</div>` : ''}
    </div></div>`);
    const body = P.$('.modal-body', m);
    if (typeof icerik === 'string') body.innerHTML = icerik; else if (icerik) body.appendChild(icerik);
    const kapat = () => { m.remove(); document.removeEventListener('keydown', esck); if (opt.kapaninca) opt.kapaninca(); };
    const esck = e => { if (e.key === 'Escape') kapat(); };
    m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-kapat]')) kapat(); });
    document.addEventListener('keydown', esck);
    document.body.appendChild(m);
    m.kapat = kapat;
    return m;
  };
  P.onay = function (mesaj, evetYazi, tehlike) {
    return new Promise(res => {
      const m = P.modal('Onay', `<p class="onay-metin">${esc(mesaj)}</p>`, {
        alt: `<button class="btn line" data-hayir>Vazgeç</button><button class="btn ${tehlike ? 'danger' : 'gold'}" data-evet>${esc(evetYazi || 'Tamam')}</button>`,
        kapaninca: () => res(false)
      });
      P.$('[data-hayir]', m).onclick = () => m.kapat();
      P.$('[data-evet]', m).onclick = () => { m.querySelector('.modal').dataset.ok = 1; res(true); m.remove(); };
    });
  };
  P.mesgul = function (btn, on, yazi) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="spin"></span> ${esc(yazi || 'Kaydediliyor…')}`; }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };

  /* ---------------- veri ---------------- */
  P.yukle = async function () {
    const j = await P.api('veri');
    S.ilk = j.ilk || {};
    S.surum = j.surum || {};
    S.ortam = j.ortam || {};
    S.kaydedilmis = {};
    for (const d of DOCS) {
      S.veri[d] = R.birlestir(S.ilk[d], j.veri ? j.veri[d] : null);
      if (S.veri[d] == null) S.veri[d] = d === 'alanlar' || d === 'eserler' || d === 'makaleler' ? [] : {};
      S.kaydedilmis[d] = JSON.stringify(S.veri[d]);
    }
    S.kirli = {};
  };
  P.kirliMi = d => S.kaydedilmis && JSON.stringify(S.veri[d]) !== S.kaydedilmis[d];
  P.herhangiKirli = () => DOCS.some(P.kirliMi);

  P.siteDosyalari = function (veri) {
    const d = new Date();
    return R.renderSite(veri || S.veri, { cssV: S.surum.cssV, jsV: S.surum.jsV, buildDate: P.bugun(), year: d.getFullYear() });
  };

  // Siteyi yeniden üretip sunucuya yazar
  P.yayinla = async function () {
    const dosyalar = P.siteDosyalari();
    const j = await P.api('yayinla', { dosyalar });
    return j;
  };

  // Belgeleri kaydeder ve siteyi yayımlar
  P.kaydet = async function (belgeler, btn) {
    belgeler = (Array.isArray(belgeler) ? belgeler : [belgeler]).filter(Boolean);
    P.mesgul(btn, true, 'Kaydediliyor…');
    try {
      for (const d of belgeler) {
        await P.api('kaydet', { ad: d, icerik: S.veri[d] });
        S.kaydedilmis[d] = JSON.stringify(S.veri[d]);
      }
      if (btn) btn.innerHTML = '<span class="spin"></span> Site güncelleniyor…';
      const j = await P.yayinla();
      P.toast(`Kaydedildi ve sitede yayımlandı (${j.yazilan} sayfa güncellendi).`);
      P.durumCubugu();
      return true;
    } catch (e) {
      P.toast(e.message, 'err');
      return false;
    } finally {
      P.mesgul(btn, false);
      P.durumCubugu();
    }
  };

  /* ---------------- giriş ---------------- */
  const app = () => P.$('#app');
  P.girisEkrani = function (mesaj) {
    document.body.className = 'login-page';
    app().innerHTML = `<div class="login">
      <form class="login-card" autocomplete="on" novalidate>
        <div class="login-brand"><span class="lb-mark">${P.icon('scales', 'ico')}</span><div><small>Yönetim Paneli</small><b>Av. Yılmaz Çağlayan</b></div></div>
        <label class="fl"><span>Kullanıcı adı</span><input name="kullanici" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
        <label class="fl"><span>Şifre</span><div class="pw"><input name="sifre" type="password" autocomplete="current-password" required><button type="button" class="pw-eye" aria-label="Şifreyi göster">${P.svg('eye')}</button></div></label>
        <p class="login-err" role="alert">${esc(mesaj || '')}</p>
        <button class="btn gold block" type="submit">Giriş yap</button>
        <a class="login-site" href="/">${P.svg('back')} Siteye dön</a>
      </form></div>`;
    const f = P.$('form', app());
    P.$('.pw-eye', f).onclick = () => { const i = f.sifre; i.type = i.type === 'password' ? 'text' : 'password'; };
    f.kullanici.focus();
    f.onsubmit = async e => {
      e.preventDefault();
      const err = P.$('.login-err', f);
      err.textContent = '';
      if (!f.kullanici.value.trim() || !f.sifre.value) { err.textContent = 'Kullanıcı adı ve şifreyi girin.'; return; }
      const btn = P.$('button[type=submit]', f);
      P.mesgul(btn, true, 'Giriş yapılıyor…');
      try {
        const j = await P.api('giris', { kullanici: f.kullanici.value.trim(), sifre: f.sifre.value });
        S.csrf = j.csrf; S.kullanici = j.kullanici; S.ilkSifre = !!j.ilkSifre;
        await P.basla();
      } catch (ex) {
        err.textContent = ex.message;
        P.mesgul(btn, false);
        f.sifre.select();
      }
    };
  };
  P.oturumBitti = function () {
    if (P._oturumUyari) return;
    P._oturumUyari = true;
    S.csrf = '';
    P.girisEkrani('Oturumunuz sona erdi. Lütfen yeniden giriş yapın. (Kaydedilmemiş değişiklikler kaybolmuş olabilir.)');
    setTimeout(() => { P._oturumUyari = false; }, 1500);
  };

  /* ---------------- ana yerleşim ---------------- */
  P.MENU = [
    ['genel', 'Genel Bakış', 'home'],
    ['makaleler', 'Makaleler', 'doc'],
    ['anasayfa', 'Ana Sayfa & Slaytlar', 'slides'],
    ['alanlar', 'Çalışma Alanları', 'grid'],
    ['eserler', 'Yayımlanmış Eserler', 'book'],
    ['ozgecmis', 'Özgeçmiş', 'user'],
    ['sss', 'Sıkça Sorulan Sorular', 'help'],
    ['metinler', 'Sayfa Metinleri', 'text'],
    ['site', 'İletişim & Site Ayarları', 'phone'],
    ['ziyaretci', 'Ziyaretçiler', 'chart'],
    ['gorseller', 'Görseller', 'image'],
    ['hesap', 'Hesap & Yedekler', 'lock']
  ];
  P.BOLUM = {};

  P.basla = async function () {
    document.body.className = 'panel-page';
    app().innerHTML = '<div class="boot"><span class="spin"></span> İçerikler yükleniyor…</div>';
    await P.yukle();
    app().innerHTML = `<div class="shell">
      <aside class="side" id="yan">
        <div class="side-brand"><span class="lb-mark">${P.icon('scales', 'ico')}</span><div><small>Yönetim Paneli</small><b>Av. Yılmaz Çağlayan</b></div></div>
        <nav class="side-nav">${P.MENU.map(([k, l, i]) => `<a href="#${k}" data-b="${k}">${P.svg(i)}<span>${esc(l)}</span><i class="dot" hidden></i></a>`).join('')}</nav>
        <div class="side-foot">
          <a class="side-link" href="/" target="_blank" rel="noopener">${P.svg('ext')} Siteyi görüntüle</a>
          <button class="side-link" data-cikis>${P.svg('out')} Çıkış yap <small>${esc(S.kullanici)}</small></button>
        </div>
      </aside>
      <div class="side-veil" data-menu-kapat></div>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" data-menu aria-label="Menü">${P.svg('menu')}</button>
          <h1 class="top-title"></h1>
          <div class="top-actions"><span class="durum" id="durum"></span><a class="btn line sm hide-sm" href="/" target="_blank" rel="noopener">${P.svg('ext')} Site</a></div>
        </header>
        ${S.ilkSifre ? `<div class="banner warn">${P.svg('warn')}<span>Güvenliğiniz için ilk şifreyi değiştirmeniz önerilir.</span><a class="btn sm gold" href="#hesap">Şifreyi değiştir</a></div>` : ''}
        ${S.ortam.yazilabilir === false ? `<div class="banner err">${P.svg('warn')}<span>Sunucu, site dosyalarına yazma izni vermiyor; değişiklikler kaydedilir ancak siteye yansıtılamaz. Hosting firmanızdan PHP'nin dosya yazma iznini açmasını isteyin.</span></div>` : ''}
        <main class="content" id="icerik"></main>
      </div>
    </div>`;
    P.$('[data-menu]').onclick = () => document.body.classList.add('menu-open');
    P.$('[data-menu-kapat]').onclick = () => document.body.classList.remove('menu-open');
    P.$('[data-cikis]').onclick = async () => {
      if (P.herhangiKirli() && !(await P.onay('Kaydedilmemiş değişiklikler var. Yine de çıkış yapılsın mı?', 'Çıkış yap', true))) return;
      try { await P.api('cikis', {}); } catch (e) { /* yine de çık */ }
      S.csrf = ''; S.kaydedilmis = null;
      P.girisEkrani();
    };
    window.onhashchange = () => P.git(location.hash.slice(1) || 'genel');
    P.git(location.hash.slice(1) || 'genel', true);
  };

  P.git = async function (b, ilk) {
    const [bolum, ...arg] = b.split('/');
    const tanim = P.BOLUM[bolum] ? bolum : 'genel';
    if (!ilk && P._aktifBelge && P.kirliMi(P._aktifBelge) && P._sonHash !== b) {
      const ok = await P.onay('Bu bölümde kaydedilmemiş değişiklikler var. Kaydetmeden ayrılırsanız değişiklikler kaybolur.', 'Kaydetmeden ayrıl', true);
      if (!ok) { history.replaceState(null, '', '#' + P._sonHash); return; }
      S.veri[P._aktifBelge] = JSON.parse(S.kaydedilmis[P._aktifBelge]);
    }
    P._sonHash = b;
    P._aktifBelge = null;
    if (P._temizle) { try { P._temizle(); } catch (e) { /* */ } P._temizle = null; }
    document.body.classList.remove('menu-open');
    P.$$('.side-nav a').forEach(a => a.classList.toggle('on', a.dataset.b === tanim));
    const m = P.MENU.find(x => x[0] === tanim);
    P.$('.top-title').textContent = m ? m[1] : '';
    const kap = P.$('#icerik');
    kap.innerHTML = '';
    kap.scrollTop = 0;
    window.scrollTo(0, 0);
    try { await P.BOLUM[tanim](kap, arg); } catch (e) { kap.innerHTML = `<div class="banner err">${P.svg('warn')}<span>${esc(e.message)}</span></div>`; }
    P.durumCubugu();
  };

  P.durumCubugu = function () {
    const el = P.$('#durum');
    if (!el) return;
    const kirli = P.DOCS.filter(P.kirliMi);
    el.innerHTML = kirli.length ? `<span class="pill warn">Kaydedilmemiş değişiklik</span>` : `<span class="pill ok">${P.svg('check')} Tüm değişiklikler kayıtlı</span>`;
    const harita = { makaleler: 'makaleler', anasayfa: 'anasayfa', alanlar: 'alanlar', eserler: 'eserler', ozgecmis: 'ozgecmis', sss: 'sss', metinler: 'metinler', site: 'site' };
    P.$$('.side-nav a').forEach(a => { const d = Object.keys(harita).find(k => harita[k] === a.dataset.b); const dot = P.$('.dot', a); if (dot) dot.hidden = !(d && kirli.includes(d)); });
  };

  window.addEventListener('beforeunload', e => { if (S.kaydedilmis && P.herhangiKirli()) { e.preventDefault(); e.returnValue = ''; } });

  // Önizleme: üretilen sayfayı panel içinde gösterir
  P.onizle = function (rel, veri) {
    let html;
    try { html = P.siteDosyalari(veri)[rel]; } catch (e) { P.toast('Önizleme oluşturulamadı: ' + e.message, 'err'); return; }
    if (!html) { P.toast('Bu sayfa için önizleme yok (yayında değil olabilir).', 'err'); return; }
    html = html.replace(/<script src="\/assets\/js\/main\.js[^"]*" defer><\/script>/, '<style>.reveal{opacity:1!important;transform:none!important}</style>');
    html = html.replace('<head>', '<head><base target="_blank">');
    const fr = document.createElement('iframe');
    fr.className = 'preview-frame';
    fr.setAttribute('sandbox', 'allow-same-origin allow-popups');
    fr.srcdoc = html;
    const kutu = P.h('<div class="preview-wrap"><div class="pv-bar"><button class="btn sm line" data-w="390">Telefon</button><button class="btn sm line" data-w="820">Tablet</button><button class="btn sm line on" data-w="">Bilgisayar</button></div></div>');
    kutu.appendChild(fr);
    P.$$('[data-w]', kutu).forEach(b => b.onclick = () => { P.$$('[data-w]', kutu).forEach(x => x.classList.toggle('on', x === b)); fr.style.maxWidth = b.dataset.w ? b.dataset.w + 'px' : ''; });
    P.modal('Önizleme — kaydedilmemiş hâli', kutu, { genis: true });
  };

  /* ---------------- açılış ---------------- */
  async function acilis() {
    try {
      const j = await P.api('durum', undefined, { sessiz: true });
      if (j.girisli) { S.csrf = j.csrf; S.kullanici = j.kullanici; S.ilkSifre = !!j.ilkSifre; await P.basla(); }
      else P.girisEkrani(j.ortam && j.ortam.veri === false ? 'Uyarı: sunucuda veri klasörü oluşturulamıyor (yazma izni).' : '');
    } catch (e) {
      app().innerHTML = `<div class="login"><div class="login-card"><p class="login-err">${esc(e.message)}</p><button class="btn gold block" type="button" data-yenile>Tekrar dene</button></div></div>`;
      P.$('[data-yenile]').addEventListener('click', () => location.reload());
    }
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(acilis, 0));
})();
