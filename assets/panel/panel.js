(function () {
  'use strict';

  var CFG = JSON.parse(document.getElementById('panel-config').textContent);
  var BASE = location.pathname.replace(/\/yonetim(\/.*)?$/, '');
  var GH = 'https://api.github.com';
  var UM = 'https://api.umami.is/v1';
  var REPO = '/repos/' + CFG.repo.owner + '/' + CFG.repo.name;
  var BRANCH = CFG.repo.branch || 'main';
  var ART_DIR = 'content/makaleler';
  var IMG_DIR = 'assets/img/makaleler';
  var AREAS = CFG.areas;
  var AREA = {};
  AREAS.forEach(function (a) { AREA[a.slug] = a.title; });
  var app = document.getElementById('app');
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  var S = {
    user: '', pass: '', secrets: null, vault: null,
    articles: null, articlesSource: '', umamiId: CFG.umamiWebsiteId || '',
    range: '7', draft: null, dirty: false, pubTimer: null
  };

  /* ---------- yardımcılar ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function fmtNum(n) { return Number(n || 0).toLocaleString('tr-TR'); }
  function todayISO() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function fmtDate(d) { var x = new Date(d + 'T12:00:00'); return isNaN(x) ? d : x.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function slugify(s) {
    return String(s).toLocaleLowerCase('tr-TR')
      .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function oneLine(s) { return String(s || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function b64(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function unb64(s) { var bin = atob(s), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function siteUrl(p) { return BASE + p; }

  var ICONS = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
    doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    ext: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    img: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14.5 8.5l2 2"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'
  };
  function ic(n) { return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[n] + '</svg>'; }
  var MARK = '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="7" r="2.2"/><path d="M24 9.2V40"/><path d="M9 14.5c5 1.6 10 1.6 15 0 5 1.6 10 1.6 15 0"/><path d="M11 15.2 5.5 28M11 15.2 16.5 28M37 15.2 31.5 28M37 15.2 42.5 28"/><path d="M4.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M30.5 28c0 3.6 3 6 6.5 6s6.5-2.4 6.5-6z"/><path d="M17 40.5h14M19.5 43.5h9"/></svg>';
  function brand(sub) { return '<span class="brand"><span class="brand-mark">' + MARK + '</span><i class="brand-bar"></i><span class="brand-text"><small>Avukat</small><b>Yılmaz Çağlayan</b><span>' + esc(sub) + '</span></span></span>'; }

  function toast(text, type) {
    var t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.setAttribute('role', 'status');
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, type === 'err' ? 6000 : 3500);
  }
  function modal(opts) {
    return new Promise(function (resolve) {
      var bg = document.createElement('div');
      bg.className = 'modal-bg';
      bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true"><h2>' + esc(opts.title) + '</h2>' + (opts.text ? '<p>' + esc(opts.text) + '</p>' : '') +
        (opts.input ? '<label class="field"><span>' + esc(opts.input) + '</span><input class="input" type="password" autocomplete="current-password"></label>' : '') +
        '<div class="btn-row"><button type="button" class="btn btn-line" data-r="0">Vazgeç</button><button type="button" class="btn ' + (opts.danger ? 'btn-danger' : 'btn-gold') + '" data-r="1">' + esc(opts.ok || 'Tamam') + '</button></div></div>';
      document.body.appendChild(bg);
      var inp = $('input', bg);
      (inp || $('[data-r="1"]', bg)).focus();
      function done(v) { bg.remove(); document.removeEventListener('keydown', key); resolve(v); }
      function key(e) { if (e.key === 'Escape') done(null); if (e.key === 'Enter' && inp) done(inp.value); }
      document.addEventListener('keydown', key);
      bg.addEventListener('click', function (e) {
        if (e.target === bg) return done(null);
        var b = e.target.closest('[data-r]');
        if (!b) return;
        if (b.getAttribute('data-r') === '0') return done(null);
        done(inp ? inp.value : true);
      });
    });
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + esc(label || 'Lütfen bekleyin'); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  /* ---------- şifreleme ---------- */
  function deriveKey(user, pass, salt, iter) {
    return crypto.subtle.importKey('raw', enc.encode(user.trim().toLowerCase() + '\n' + pass), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function openVault(v, user, pass) {
    return deriveKey(user, pass, unb64(v.salt), v.iter).then(function (key) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(v.iv) }, key, unb64(v.data));
    }).then(function (pt) { return JSON.parse(dec.decode(pt)); });
  }
  function sealVault(secrets, user, pass) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 600000;
    return deriveKey(user, pass, salt, iter).then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(secrets)));
    }).then(function (ct) { return { v: 1, kdf: 'PBKDF2-SHA256', iter: iter, salt: b64(salt), iv: b64(iv), data: b64(ct) }; });
  }
  function loadVault() {
    return fetch(siteUrl('/yonetim/panel.json') + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Panel ayar dosyası bulunamadı.');
      return r.json();
    });
  }
  function saveSession() {
    try { sessionStorage.setItem('yc-panel', JSON.stringify({ user: S.user, secrets: S.secrets, umamiId: S.umamiId })); } catch (e) { }
  }
  function restoreSession() {
    try {
      var x = JSON.parse(sessionStorage.getItem('yc-panel') || 'null');
      if (x && x.secrets) { S.user = x.user; S.secrets = x.secrets; S.umamiId = x.umamiId || S.umamiId; return true; }
    } catch (e) { }
    return false;
  }
  function needPassword() {
    if (S.pass) return Promise.resolve(S.pass);
    return modal({ title: 'Şifrenizi girin', text: 'Ayarları güvenli şekilde kaydetmek için panel şifrenizi tekrar girin.', input: 'Şifre', ok: 'Devam' }).then(function (p) {
      if (!p) throw new Error('İptal edildi.');
      return loadVault().then(function (v) { return openVault(v, S.user, p); }).then(function () { S.pass = p; return p; }, function (e) {
        if (e && e.name === 'OperationError') throw new Error('Şifre hatalı.');
        throw e;
      });
    });
  }

  /* ---------- GitHub ---------- */
  function ghToken() { return S.secrets && S.secrets.github; }
  function ghErr(status, msg) {
    if (status === 401) return 'GitHub anahtarı geçersiz veya süresi dolmuş. Ayarlar bölümünden yeni anahtar girin.';
    if (status === 403) return 'GitHub anahtarının bu depoya yazma izni yok. Anahtarı oluştururken "Contents: Read and write" izni verildiğinden emin olun.';
    if (status === 404) return 'Depo veya dosya bulunamadı. Anahtarı oluştururken ' + CFG.repo.name + ' deposunu seçtiğinizden emin olun.';
    if (status === 409 || status === 422) return 'Aynı anda başka bir değişiklik yapıldı. Lütfen tekrar deneyin.';
    return 'GitHub hatası (' + status + ')' + (msg ? ': ' + msg : '');
  }
  function gh(path, opts, token) {
    opts = opts || {};
    var headers = { 'Authorization': 'Bearer ' + (token || ghToken()), 'Accept': opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(GH + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' })
      .catch(function () { throw new Error('Bağlantı kurulamadı. İnternet bağlantınızı kontrol edin.'); })
      .then(function (r) {
        if (!r.ok) {
          return r.text().then(function (t) {
            var m = ''; try { m = JSON.parse(t).message; } catch (e) { }
            var err = new Error(ghErr(r.status, m)); err.status = r.status; throw err;
          });
        }
        if (r.status === 204) return null;
        return opts.raw ? r.text() : r.json();
      });
  }
  function encPath(p) { return p.split('/').map(encodeURIComponent).join('/'); }

  function commitFiles(add, del, message) {
    var blobs = [];
    var chain = Promise.resolve();
    add.forEach(function (f) {
      chain = chain.then(function () {
        return gh(REPO + '/git/blobs', { method: 'POST', body: { content: f.b64, encoding: 'base64' } }).then(function (b) { blobs.push({ path: f.path, sha: b.sha }); });
      });
    });
    function attempt(n) {
      var head, baseTree;
      return gh(REPO + '/git/ref/heads/' + BRANCH).then(function (ref) {
        head = ref.object.sha;
        return gh(REPO + '/git/commits/' + head);
      }).then(function (c) {
        baseTree = c.tree.sha;
        if (!del.length) return [];
        return gh(REPO + '/git/trees/' + baseTree + '?recursive=1').then(function (t) {
          var have = {};
          t.tree.forEach(function (x) { if (x.type === 'blob') have[x.path] = 1; });
          return del.filter(function (p) { return have[p]; });
        });
      }).then(function (dels) {
        var tree = blobs.map(function (b) { return { path: b.path, mode: '100644', type: 'blob', sha: b.sha }; })
          .concat(dels.map(function (p) { return { path: p, mode: '100644', type: 'blob', sha: null }; }));
        if (!tree.length) return null;
        return gh(REPO + '/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: tree } });
      }).then(function (nt) {
        if (!nt) return null;
        return gh(REPO + '/git/commits', { method: 'POST', body: { message: message, tree: nt.sha, parents: [head] } });
      }).then(function (nc) {
        if (!nc) return null;
        return gh(REPO + '/git/refs/heads/' + BRANCH, { method: 'PATCH', body: { sha: nc.sha, force: false } }).then(function () { return nc.sha; });
      }).catch(function (e) {
        if ((e.status === 422 || e.status === 409) && n < 3) return sleep(1500).then(function () { return attempt(n + 1); });
        throw e;
      });
    }
    return chain.then(function () { return attempt(1); });
  }

  function pubbar(html, state) {
    var el = $('.pubbar');
    if (!el) { el = document.createElement('div'); el.className = 'pubbar'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    var lead = state === 'ok' ? '<span class="ok">' + ic('check') + '</span>' : state === 'bad' ? '<span class="bad"></span>' : '<span class="spin"></span>';
    el.innerHTML = lead + '<div>' + html + '</div>' + (state ? '<button type="button" aria-label="Kapat">' + ic('x') + '</button>' : '');
    var b = $('button', el);
    if (b) b.onclick = function () { el.remove(); };
  }
  function trackDeploy(sha, link) {
    if (!sha) return;
    clearTimeout(S.pubTimer);
    var t0 = Date.now();
    var linkHtml = link ? ' <a href="' + esc(link) + '" target="_blank" rel="noopener">Sitede gör</a>' : '';
    pubbar('<b>Siteye gönderildi, yayınlanıyor…</b><small>Değişiklikler genellikle 1–2 dakika içinde sitede görünür.</small>');
    var latest = false;
    function tick() {
      gh(REPO + '/actions/runs?' + (latest ? 'branch=' + BRANCH + '&per_page=1' : 'head_sha=' + sha + '&per_page=5')).then(function (d) {
        var run = d && d.workflow_runs && d.workflow_runs[0];
        if (run && run.status === 'completed' && run.conclusion === 'cancelled') {
          latest = true;
          S.pubTimer = setTimeout(tick, 3000);
          return;
        }
        if (run && run.status === 'completed') {
          if (run.conclusion === 'success') { pubbar('<b>Yayında.</b><small>Değişiklik sitede görünüyor. Eski hâli görünürse sayfayı yenileyin.</small>' + linkHtml, 'ok'); }
          else { pubbar('<b>Yayınlama tamamlanamadı.</b><small>Site önceki hâliyle yayında kalmaya devam ediyor. <a href="' + esc(run.html_url) + '" target="_blank" rel="noopener">Ayrıntılar</a></small>', 'bad'); }
          return;
        }
        if (Date.now() - t0 > 8 * 60 * 1000) { pubbar('<b>Yayınlama beklenenden uzun sürüyor.</b><small>Birkaç dakika sonra siteyi kontrol edin.</small>' + linkHtml, 'ok'); return; }
        S.pubTimer = setTimeout(tick, 5000);
      }).catch(function () {
        S.pubTimer = setTimeout(function () { pubbar('<b>Kaydedildi.</b><small>Değişiklik 1–2 dakika içinde sitede görünür.</small>' + linkHtml, 'ok'); }, 90000);
      });
    }
    S.pubTimer = setTimeout(tick, 6000);
  }

  /* ---------- makale dosyaları ---------- */
  function frontMatter(src) {
    var m = src.replace(/^﻿/, '').replace(/\r/g, '').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: src };
    var data = {};
    m[1].split('\n').forEach(function (line) { var i = line.indexOf(':'); if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim(); });
    return { data: data, body: m[2] };
  }
  function parseArticle(name, src) {
    var fm = frontMatter(src), d = fm.data;
    return {
      file: name, path: ART_DIR + '/' + name,
      slug: slugify(d.slug || name.replace(/\.md$/, '').replace(/^\d+-/, '')),
      title: d.title || name, date: /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? d.date : todayISO(),
      area: AREA[d.area] ? d.area : 'hukuki-danismanlik',
      related: (d.related || '').split(',').map(function (s) { return s.trim(); }).filter(function (r) { return AREA[r]; }),
      description: d.description || '', image: d.image || '', body: fm.body.replace(/^\n+/, '')
    };
  }
  function serialize(a) {
    var lines = ['---', 'title: ' + oneLine(a.title), 'date: ' + a.date, 'slug: ' + a.slug, 'area: ' + a.area];
    if (a.related.length) lines.push('related: ' + a.related.join(', '));
    if (oneLine(a.description)) lines.push('description: ' + oneLine(a.description));
    if (a.image) lines.push('image: ' + a.image);
    lines.push('---');
    return lines.join('\n') + '\n' + normalizeBody(a.body);
  }
  function normalizeBody(t) {
    var out = [], prevList = false;
    String(t || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      var l = raw.trim();
      if (!l) return;
      if (/^#{1,6}\s+/.test(l)) l = '## ' + l.replace(/^#{1,6}\s+/, '');
      if (/^[•·]\s*/.test(l)) l = '- ' + l.replace(/^[•·]\s*/, '');
      var isList = /^[-*] /.test(l);
      if (out.length && !(isList && prevList)) out.push('');
      out.push(l);
      prevList = isList;
    });
    return out.join('\n') + '\n';
  }
  function utf8b64(text) { return b64(enc.encode(text)); }

  function loadArticles(force) {
    if (S.articles && !force) return Promise.resolve(S.articles);
    if (!ghToken()) {
      return fetch(siteUrl('/yonetim/makaleler.json') + '?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).then(function (list) {
        S.articles = list.map(function (a) { return { file: a.file, path: ART_DIR + '/' + a.file, slug: a.slug, title: a.title, date: a.date, area: a.area, image: a.image, related: [], description: '', body: null }; });
        S.articlesSource = 'site';
        return S.articles;
      });
    }
    return gh(REPO + '/contents/' + ART_DIR + '?ref=' + BRANCH).then(function (list) {
      var files = list.filter(function (f) { return f.type === 'file' && /\.md$/.test(f.name); });
      return Promise.all(files.map(function (f) {
        return gh(REPO + '/contents/' + encPath(f.path) + '?ref=' + BRANCH, { raw: true }).then(function (txt) { return parseArticle(f.name, txt); });
      }));
    }).then(function (items) {
      items.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.file.localeCompare(b.file); });
      S.articles = items;
      S.articlesSource = 'github';
      return items;
    });
  }

  /* ---------- markdown önizleme (sitedeki ile aynı kurallar) ---------- */
  function inlineMd(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function imgSrc(p) {
    if (S.draft && S.draft.pending[p]) return S.draft.pending[p].url;
    return /^\//.test(p) ? siteUrl(p) : p;
  }
  function mdHtml(src) {
    var html = '', para = [], list = [];
    function fp() { if (para.length) { html += '<p>' + inlineMd(para.join(' ')) + '</p>'; para = []; } }
    function fl() { if (list.length) { html += '<ul>' + list.map(function (i) { return '<li>' + inlineMd(i) + '</li>'; }).join('') + '</ul>'; list = []; } }
    normalizeBody(src).split('\n').forEach(function (raw) {
      var l = raw.trim();
      if (!l) { fp(); fl(); return; }
      if (l.indexOf('## ') === 0) { fp(); fl(); html += '<h2>' + inlineMd(l.slice(3)) + '</h2>'; return; }
      if (l.indexOf('> ') === 0) { fp(); fl(); html += '<blockquote><p>' + inlineMd(l.slice(2)) + '</p></blockquote>'; return; }
      var im = l.match(/^!\[([^\]]*)\]\((\/[^)\s]+|https:\/\/[^)\s]+)\)$/);
      if (im) { fp(); fl(); html += '<figure><img src="' + esc(imgSrc(im[2])) + '" alt="' + esc(im[1]) + '">' + (im[1] ? '<figcaption>' + esc(im[1]) + '</figcaption>' : '') + '</figure>'; return; }
      if (/^[*-] /.test(l)) { fp(); list.push(l.slice(2)); return; }
      fl(); para.push(l);
    });
    fp(); fl();
    return html || '<p class="empty">Önizlenecek metin yok.</p>';
  }

  /* ---------- görsel işleme ---------- */
  function processImage(file, maxW) {
    if (!file || !/^image\//.test(file.type)) return Promise.reject(new Error('Lütfen JPG, PNG veya WEBP biçiminde bir görsel seçin.'));
    if (file.size > 30 * 1024 * 1024) return Promise.reject(new Error('Görsel çok büyük (en fazla 30 MB).'));
    var url = URL.createObjectURL(file);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Bu görsel açılamadı. JPG veya PNG biçiminde bir görsel deneyin.')); };
      img.src = url;
    }).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight, sc = Math.min(1, maxW / w);
      var cw = Math.max(1, Math.round(w * sc)), ch = Math.max(1, Math.round(h * sc));
      var c = document.createElement('canvas');
      c.width = cw; c.height = ch;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
      URL.revokeObjectURL(url);
      return new Promise(function (r) { c.toBlob(r, 'image/webp', 0.82); }).then(function (blob) {
        if (blob && blob.type === 'image/webp') return { blob: blob, ext: 'webp' };
        return new Promise(function (r) { c.toBlob(r, 'image/jpeg', 0.85); }).then(function (jb) { return { blob: jb, ext: 'jpg' }; });
      });
    }).then(function (o) {
      if (!o.blob) throw new Error('Görsel işlenemedi.');
      return o.blob.arrayBuffer().then(function (buf) { return { b64: b64(buf), ext: o.ext, url: URL.createObjectURL(o.blob), size: o.blob.size }; });
    });
  }
  function newImagePath(slug, ext) {
    return '/' + IMG_DIR + '/' + (slug || 'gorsel').slice(0, 60) + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + '.' + ext;
  }
  function imagesIn(body) {
    var out = [], re = /!\[[^\]]*\]\((\/assets\/img\/makaleler\/[^)\s]+)\)/g, m;
    while ((m = re.exec(body || ''))) out.push(m[1]);
    return out;
  }

  /* ---------- Umami ---------- */
  function umKey() { return S.secrets && S.secrets.umami; }
  function um(path, params, key, id) {
    var u = new URL(UM + '/websites/' + (id || S.umamiId) + path);
    Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
    var k = key || umKey();
    return fetch(u.toString(), { headers: { 'x-umami-api-key': k, 'Authorization': 'Bearer ' + k, 'Accept': 'application/json' }, cache: 'no-store' })
      .catch(function () { throw new Error('İstatistik servisine bağlanılamadı.'); })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error('İstatistik anahtarı geçersiz. Ayarlar bölümünü kontrol edin.');
        if (r.status === 404) throw new Error('İstatistik sitesi bulunamadı. Website ID değerini kontrol edin.');
        if (!r.ok) { var e = new Error('İstatistik servisi hatası (' + r.status + ').'); e.status = r.status; throw e; }
        return r.json();
      });
  }
  function val(x) { return x == null ? 0 : typeof x === 'object' ? Number(x.value || 0) : Number(x); }
  function rangeOf(k) {
    var end = Date.now(), d = new Date();
    d.setHours(0, 0, 0, 0);
    if (k === 'today') return { startAt: d.getTime(), endAt: end, days: 1 };
    var n = Number(k);
    d.setDate(d.getDate() - (n - 1));
    return { startAt: d.getTime(), endAt: end, days: n };
  }
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Istanbul'; } catch (e) { return 'Europe/Istanbul'; } })();
  function stats(r) { return um('/stats', { startAt: r.startAt, endAt: r.endAt }); }
  function metrics(type, r, limit) {
    return um('/metrics', { startAt: r.startAt, endAt: r.endAt, type: type, limit: limit || 10 }).then(function (d) {
      var arr = Array.isArray(d) ? d : (d && (d.data || d.metrics)) || [];
      return arr.map(function (x) { return { x: x.x == null ? '' : String(x.x), y: Number(x.y || 0) }; });
    }).catch(function (e) {
      if (type === 'path' && e.status === 400) return metrics('url', r, limit);
      throw e;
    });
  }
  function series(r) {
    return um('/pageviews', { startAt: r.startAt, endAt: r.endAt, unit: r.days > 1 ? 'day' : 'hour', timezone: TZ }).then(function (d) {
      var s = (d && (d.sessions || d.visitors)) || [], p = (d && d.pageviews) || [];
      return { visitors: s.map(function (x) { return { x: String(x.x || x.t), y: Number(x.y || 0) }; }), views: p.map(function (x) { return { x: String(x.x || x.t), y: Number(x.y || 0) }; }) };
    });
  }
  function active() { return um('/active', {}).then(function (d) { return Number((d && (d.visitors != null ? d.visitors : d.x != null ? d.x : Array.isArray(d) ? d.length : 0)) || 0); }); }

  var REGION_TR = 'Adana,Adıyaman,Afyonkarahisar,Ağrı,Amasya,Ankara,Antalya,Artvin,Aydın,Balıkesir,Bilecik,Bingöl,Bitlis,Bolu,Burdur,Bursa,Çanakkale,Çankırı,Çorum,Denizli,Diyarbakır,Edirne,Elazığ,Erzincan,Erzurum,Eskişehir,Gaziantep,Giresun,Gümüşhane,Hakkari,Hatay,Isparta,Mersin,İstanbul,İzmir,Kars,Kastamonu,Kayseri,Kırklareli,Kırşehir,Kocaeli,Konya,Kütahya,Malatya,Manisa,Kahramanmaraş,Mardin,Muğla,Muş,Nevşehir,Niğde,Ordu,Rize,Sakarya,Samsun,Siirt,Sinop,Sivas,Tekirdağ,Tokat,Trabzon,Tunceli,Şanlıurfa,Uşak,Van,Yozgat,Zonguldak,Aksaray,Bayburt,Karaman,Kırıkkale,Batman,Şırnak,Bartın,Ardahan,Iğdır,Yalova,Karabük,Kilis,Osmaniye,Düzce'.split(',');
  var countryName = (function () {
    var dn = null;
    try { dn = new Intl.DisplayNames(['tr'], { type: 'region' }); } catch (e) { }
    return function (c) { if (!c) return 'Bilinmiyor'; try { return (dn && dn.of(c.toUpperCase())) || c; } catch (e) { return c; } };
  })();
  function regionName(r) {
    var m = /^TR-(\d{2})$/.exec(r || '');
    if (m) return REGION_TR[Number(m[1]) - 1] || r;
    return r || 'Bilinmiyor';
  }
  function pageName(p) {
    var path = String(p || '').split('?')[0];
    if (BASE && path.indexOf(BASE) === 0) path = path.slice(BASE.length) || '/';
    if (path === '/' || path === '') return 'Ana Sayfa';
    var known = { '/calisma-alanlari/': 'Çalışma Alanları', '/yayimlanmis-eserler/': 'Yayımlanmış Eserler', '/hakkimda/': 'Özgeçmiş', '/makaleler/': 'Makaleler', '/sikca-sorulan-sorular/': 'Sıkça Sorulan Sorular', '/iletisim/': 'İletişim' };
    if (!/\/$/.test(path)) path += '/';
    if (known[path]) return known[path];
    var m = /^\/calisma-alanlari\/([^/]+)\/$/.exec(path);
    if (m && AREA[m[1]]) return AREA[m[1]];
    m = /^\/makaleler\/([^/]+)\/$/.exec(path);
    if (m && S.articles) { var a = S.articles.filter(function (x) { return x.slug === m[1]; })[0]; if (a) return a.title; }
    return path;
  }
  function deviceName(d) { return { desktop: 'Bilgisayar', laptop: 'Dizüstü', mobile: 'Telefon', tablet: 'Tablet' }[d] || d || 'Bilinmiyor'; }

  function rankList(items, label) {
    if (!items.length) return '<p class="empty">Henüz veri yok.</p>';
    var max = items.reduce(function (m, x) { return Math.max(m, x.y); }, 1);
    return '<ul class="rank">' + items.map(function (x) {
      return '<li><i style="width:' + Math.max(2, Math.round(x.y / max * 100)) + '%"></i><span title="' + esc(label(x.x)) + '">' + esc(label(x.x)) + '</span><b>' + fmtNum(x.y) + '</b></li>';
    }).join('') + '</ul>';
  }
  function barChart(points, days, width) {
    if (!points.length) return '<p class="empty">Henüz veri yok.</p>';
    var W = Math.max(280, Math.round(width || 720)), H = 220, pl = 34, pb = 26, pt = 10, n = points.length;
    var max = Math.max(4, points.reduce(function (m, p) { return Math.max(m, p.y); }, 0));
    var mag = Math.pow(10, Math.floor(Math.log10(max / 4))), step = mag;
    [1, 2, 5, 10].some(function (k) { step = k * mag; return max / step <= 4; });
    var nice = step * 4;
    var bw = (W - pl) / n, out = '';
    for (var g = 0; g <= 4; g++) {
      var gy = pt + (H - pt - pb) * (1 - g / 4), gv = Math.round(nice * g / 4);
      out += '<line class="grid-l" x1="' + pl + '" x2="' + W + '" y1="' + gy + '" y2="' + gy + '"/><text x="' + (pl - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + gv + '</text>';
    }
    var every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor((W - pl) / 64))));
    points.forEach(function (p, i) {
      var h = (H - pt - pb) * (p.y / nice), x = pl + i * bw + bw * 0.15, y = H - pb - h;
      var d = new Date(p.x.replace(' ', 'T'));
      var lab = isNaN(d) ? p.x : days > 1 ? d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      out += '<rect class="bar" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * 0.7).toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="3" data-tip="' + esc(lab + ': ' + fmtNum(p.y) + ' ziyaretçi') + '"><title>' + esc(lab + ': ' + p.y) + '</title></rect>';
      if (i % every === 0) out += '<text x="' + (pl + i * bw + bw / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(lab) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Ziyaretçi grafiği">' + out + '</svg><div class="chart-tip">Ayrıntı için çubukların üzerine gelin veya dokunun.</div>';
  }
  function fillSeries(points, r) {
    if (r.days <= 1) return points;
    var map = {};
    points.forEach(function (p) { map[p.x.slice(0, 10)] = (map[p.x.slice(0, 10)] || 0) + p.y; });
    var out = [], d = new Date(r.startAt);
    for (var i = 0; i < r.days; i++) {
      var k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      out.push({ x: k + ' 00:00:00', y: map[k] || 0 });
      d.setDate(d.getDate() + 1);
    }
    return out;
  }
  function bindChartTips(root) {
    $$('.chart', root).forEach(function (svg) {
      var tip = svg.nextElementSibling;
      svg.addEventListener('mouseover', function (e) { var t = e.target.getAttribute && e.target.getAttribute('data-tip'); if (t && tip) tip.textContent = t; });
      svg.addEventListener('click', function (e) { var t = e.target.getAttribute && e.target.getAttribute('data-tip'); if (t && tip) tip.textContent = t; });
    });
  }

  /* ---------- görünümler ---------- */
  var NAV = [['ozet', 'Genel Bakış', 'home'], ['makaleler', 'Makaleler', 'doc'], ['ziyaretciler', 'Ziyaretçiler', 'chart'], ['ayarlar', 'Ayarlar', 'gear']];
  function route() { var h = location.hash.replace(/^#\/?/, ''); return h || 'ozet'; }
  function go(r) { location.hash = '#/' + r; }

  function shell(current, title, sub, actions, body) {
    var nav = NAV.map(function (n) { return '<a href="#/' + n[0] + '"' + (current === n[0] ? ' aria-current="page"' : '') + '>' + ic(n[2]) + '<span>' + n[1] + '</span></a>'; }).join('');
    app.innerHTML =
      '<div class="shell">' +
      '<aside class="side dark">' + brand('Yönetim Paneli') + '<nav class="nav" aria-label="Panel menüsü">' + nav + '</nav>' +
      '<div class="side-foot"><a href="' + esc(siteUrl('/')) + '" target="_blank" rel="noopener">' + ic('ext') + 'Siteyi görüntüle</a><button type="button" data-logout>' + ic('out') + 'Çıkış yap</button></div></aside>' +
      '<header class="mtop dark">' + brand('Yönetim Paneli') + '<a class="view" href="' + esc(siteUrl('/')) + '" target="_blank" rel="noopener">' + ic('ext') + 'Site</a></header>' +
      '<main class="main"><div class="top"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="btn-row">' + actions + '</div>' : '') + '</div><div id="view">' + body + '</div></main>' +
      '<nav class="tabbar" aria-label="Panel menüsü">' + nav + '</nav></div>';
    var lo = $('[data-logout]');
    if (lo) lo.onclick = logout;
    window.scrollTo(0, 0);
  }
  function logout() {
    try { sessionStorage.removeItem('yc-panel'); } catch (e) { }
    S.secrets = null; S.pass = ''; S.user = ''; S.articles = null;
    location.hash = '';
    renderLogin();
  }

  function renderLogin(msg) {
    app.innerHTML = '<div class="login"><form class="login-card" novalidate>' + brand('Milas Avukat & Hukuk Bürosu') +
      '<h1>Yönetim Paneli</h1><p class="sub">Devam etmek için giriş yapın.</p>' +
      (msg ? '<p class="msg msg-err">' + esc(msg) + '</p>' : '') +
      '<label class="field"><span>Kullanıcı adı</span><input class="input" name="u" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>' +
      '<label class="field"><span>Şifre</span><input class="input" name="p" type="password" autocomplete="current-password" required></label>' +
      '<button class="btn btn-gold btn-block" type="submit">' + ic('lock') + 'Giriş yap</button></form></div>';
    var f = $('form', app);
    f.u.focus();
    f.onsubmit = function (e) {
      e.preventDefault();
      var u = f.u.value.trim(), p = f.p.value, btn = $('button', f);
      if (!u || !p) { renderLogin('Kullanıcı adı ve şifre gerekli.'); return; }
      busy(btn, true, 'Giriş yapılıyor');
      loadVault().then(function (v) { return openVault(v, u, p); }).then(function (secrets) {
        S.user = u; S.pass = p; S.secrets = { github: secrets.github || '', umami: secrets.umami || '' };
        saveSession();
        render();
      }).catch(function (err) {
        renderLogin(err && err.name === 'OperationError' ? 'Kullanıcı adı veya şifre hatalı.' : (err.message || 'Giriş yapılamadı.'));
        var nf = $('form', app); nf.u.value = u; nf.p.focus();
      });
    };
  }

  function render() {
    if (!S.secrets) return renderLogin();
    var r = route();
    if (r === 'ozet') return viewOverview();
    if (r === 'makaleler') return viewArticles();
    if (r === 'ziyaretciler') return viewStats();
    if (r === 'ayarlar') return viewSettings();
    if (r === 'makale/yeni') return viewEditor(null);
    if (/^makale\//.test(r)) return viewEditor(decodeURIComponent(r.slice(7)));
    go('ozet');
  }

  function setupNotice() {
    var out = '';
    if (!ghToken()) out += '<div class="msg msg-warn"><b>Makale yayınlamak için GitHub bağlantısı gerekli.</b> <a href="#/ayarlar">Ayarlar</a> bölümünden bir kez kurmanız yeterli.</div>';
    return out;
  }

  function viewOverview() {
    var hasUm = !!(umKey() && S.umamiId);
    var newBtn = '<a class="btn btn-gold" href="#/makale/yeni">' + ic('plus') + 'Yeni makale</a>';
    shell('ozet', 'Genel Bakış', 'Hoş geldiniz. Sitenizin özetini buradan takip edebilirsiniz.', newBtn,
      setupNotice() +
      (hasUm ? '<div class="grid g4" id="ov-stats">' + [0, 1, 2, 3].map(function () { return '<div class="stat"><div class="skel" style="height:56px"></div></div>'; }).join('') + '</div>' +
        '<div class="card" style="margin-top:16px"><h2>Son 30 gün ziyaretçi</h2><div id="ov-chart"><div class="skel" style="height:200px"></div></div></div>' +
        '<div class="grid g2" style="margin-top:16px"><div class="card"><h2>En çok ziyaret eden şehirler</h2><div id="ov-city"><div class="skel"></div></div></div><div class="card"><h2>Ülkeler</h2><div id="ov-country"><div class="skel"></div></div></div></div>'
        : '<div class="card"><h2>' + ic('chart') + 'Ziyaretçi istatistikleri</h2><p>Sitenize kaç kişinin girdiğini, hangi ülke ve şehirden geldiğini burada görmek için istatistik bağlantısını kurun.</p><a class="btn btn-line" href="#/ayarlar">Kurulumu başlat</a></div>') +
      '<div class="card" style="margin-top:16px"><div class="set-head"><h2>' + ic('doc') + 'Son makaleler</h2><a class="btn btn-line btn-sm" href="#/makaleler">Tümü</a></div><div id="ov-arts"><div class="skel" style="height:120px"></div></div></div>');
    loadArticles().then(function (list) {
      var box = $('#ov-arts');
      if (!box) return;
      box.innerHTML = list.length ? '<div class="alist">' + list.slice(0, 4).map(articleRow).join('') + '</div>' : '<p class="empty">Henüz makale yok.</p>';
      bindArticleRows(box);
    }).catch(function (e) { var box = $('#ov-arts'); if (box) box.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
    if (!hasUm) return;
    var r1 = rangeOf('today'), r7 = rangeOf('7'), r30 = rangeOf('30');
    Promise.all([stats(r1), stats(r7), stats(r30), active().catch(function () { return null; })]).then(function (res) {
      var box = $('#ov-stats');
      if (!box) return;
      box.innerHTML =
        '<div class="stat live"><small>Şu an sitede</small><b>' + (res[3] == null ? '–' : fmtNum(res[3])) + '</b><span>son 5 dakika</span></div>' +
        '<div class="stat"><small>Bugün</small><b>' + fmtNum(val(res[0].visitors)) + '</b><span>ziyaretçi · ' + fmtNum(val(res[0].pageviews)) + ' sayfa görüntüleme</span></div>' +
        '<div class="stat"><small>Son 7 gün</small><b>' + fmtNum(val(res[1].visitors)) + '</b><span>ziyaretçi · ' + fmtNum(val(res[1].pageviews)) + ' görüntüleme</span></div>' +
        '<div class="stat"><small>Son 30 gün</small><b>' + fmtNum(val(res[2].visitors)) + '</b><span>ziyaretçi · ' + fmtNum(val(res[2].pageviews)) + ' görüntüleme</span></div>';
    }).catch(function (e) { var box = $('#ov-stats'); if (box) box.outerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
    series(r30).then(function (s) { var b = $('#ov-chart'); if (b) { b.innerHTML = barChart(fillSeries(s.visitors, r30), 30, b.clientWidth); bindChartTips(b); } }).catch(function (e) { var b = $('#ov-chart'); if (b) b.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
    metrics('city', r30, 6).then(function (d) { var b = $('#ov-city'); if (b) b.innerHTML = rankList(d, function (x) { return x || 'Bilinmiyor'; }); }).catch(function (e) { var b = $('#ov-city'); if (b) b.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
    metrics('country', r30, 6).then(function (d) { var b = $('#ov-country'); if (b) b.innerHTML = rankList(d, countryName); }).catch(function (e) { var b = $('#ov-country'); if (b) b.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
  }

  function articleRow(a) {
    var thumb = a.image ? '<img src="' + esc(siteUrl(a.image)) + '" alt="" loading="lazy" onerror="this.remove()">' : ic('doc');
    var editable = S.articlesSource === 'github';
    return '<div class="aitem" data-file="' + esc(a.file) + '"><div class="athumb">' + thumb + '</div><div><h3>' + esc(a.title) + '</h3><p>' + esc(AREA[a.area] || '') + ' · ' + esc(fmtDate(a.date)) + '</p></div>' +
      '<div class="acts">' + (editable ? '<a class="btn btn-line btn-sm" href="#/makale/' + encodeURIComponent(a.file) + '">' + ic('edit') + 'Düzenle</a>' : '') +
      '<a class="btn btn-line btn-sm" href="' + esc(siteUrl('/makaleler/' + a.slug + '/')) + '" target="_blank" rel="noopener">' + ic('eye') + 'Gör</a>' +
      (editable ? '<button type="button" class="btn btn-danger btn-sm" data-del>' + ic('trash') + '<span class="sr">Sil</span></button>' : '') + '</div></div>';
  }
  function bindArticleRows(root) {
    $$('[data-del]', root).forEach(function (b) {
      b.onclick = function () {
        var file = b.closest('.aitem').getAttribute('data-file');
        var a = S.articles.filter(function (x) { return x.file === file; })[0];
        if (a) deleteArticle(a, b);
      };
    });
  }
  function deleteArticle(a, btn) {
    modal({ title: 'Makale silinsin mi?', text: '"' + a.title + '" siteden kaldırılacak. Bu işlem geri alınamaz.', ok: 'Evet, sil', danger: true }).then(function (yes) {
      if (!yes) return;
      busy(btn, true, '');
      var del = [a.path];
      if (a.image && a.image.indexOf('/' + IMG_DIR + '/') === 0) del.push(a.image.slice(1));
      imagesIn(a.body).forEach(function (p) { del.push(p.slice(1)); });
      commitFiles([], del, 'Makale silindi: ' + oneLine(a.title)).then(function (sha) {
        S.articles = S.articles.filter(function (x) { return x !== a; });
        toast('Makale silindi.');
        trackDeploy(sha, siteUrl('/makaleler/'));
        render();
      }).catch(function (e) { busy(btn, false); toast(e.message, 'err'); });
    });
  }

  function viewArticles() {
    var newBtn = '<a class="btn btn-gold" href="#/makale/yeni">' + ic('plus') + 'Yeni makale</a>';
    shell('makaleler', 'Makaleler', 'Sitedeki makaleleri ekleyin, düzenleyin veya kaldırın.', newBtn,
      setupNotice() + '<div class="toolbar"><input class="input" type="search" placeholder="Makale ara…" aria-label="Makale ara"><span class="empty" id="a-count"></span></div><div id="a-list"><div class="skel" style="height:240px"></div></div>');
    var q = $('.toolbar input');
    function draw() {
      var list = (S.articles || []).filter(function (a) { return !q.value || a.title.toLocaleLowerCase('tr-TR').indexOf(q.value.toLocaleLowerCase('tr-TR')) > -1; });
      var box = $('#a-list');
      if (!box) return;
      $('#a-count').textContent = (S.articles || []).length + ' makale';
      box.innerHTML = list.length ? '<div class="alist">' + list.map(articleRow).join('') + '</div>' : '<p class="empty">Makale bulunamadı.</p>';
      bindArticleRows(box);
    }
    q.oninput = draw;
    loadArticles(true).then(draw).catch(function (e) { var b = $('#a-list'); if (b) b.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
  }

  /* ---------- düzenleyici ---------- */
  function draftKey(file) { return 'yc-taslak-' + (file || 'yeni'); }
  function viewEditor(file) {
    if (!ghToken()) {
      shell('makaleler', file ? 'Makaleyi düzenle' : 'Yeni makale', '', '', setupNotice());
      return;
    }
    shell('makaleler', file ? 'Makaleyi düzenle' : 'Yeni makale', '', '<a class="btn btn-line" href="#/makaleler">' + ic('back') + 'Makaleler</a>', '<div class="skel" style="height:420px"></div>');
    loadArticles().then(function (list) {
      var a = file ? list.filter(function (x) { return x.file === file; })[0] : null;
      if (file && !a) { $('#view').innerHTML = '<p class="msg msg-err">Makale bulunamadı. Silinmiş olabilir.</p>'; return; }
      S.draft = {
        orig: a || null,
        title: a ? a.title : '', date: a ? a.date : todayISO(), area: a ? a.area : '', related: a ? a.related.slice() : [],
        description: a ? a.description : '', image: a ? a.image : '', body: a ? a.body : '', pending: {}
      };
      drawEditor(file);
    }).catch(function (e) { $('#view').innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; });
  }
  function drawEditor(file) {
    var D = S.draft;
    var areaOpts = '<option value="">Seçin…</option>' + AREAS.map(function (x) { return '<option value="' + x.slug + '"' + (D.area === x.slug ? ' selected' : '') + '>' + esc(x.title) + '</option>'; }).join('');
    var rel = AREAS.map(function (x) { return '<label><input type="checkbox" value="' + x.slug + '"' + (D.related.indexOf(x.slug) > -1 ? ' checked' : '') + '>' + esc(x.title.replace(/ Avukatlığı$/, '')) + '</label>'; }).join('');
    $('#view').innerHTML =
      '<div id="ed-msg"></div>' +
      '<div class="editor"><div>' +
      '<div class="card"><label class="field"><span>Başlık <span class="count" data-c="title"></span></span><input class="input" name="title" maxlength="140" value="' + esc(D.title) + '" placeholder="Örn. Kira sözleşmelerinde tahliye sebepleri"></label>' +
      '<div class="field" style="margin-bottom:0"><span>Metin</span>' +
      '<div class="tabs" role="group" aria-label="Görünüm"><button type="button" aria-pressed="true" data-tab="w">Yaz</button><button type="button" aria-pressed="false" data-tab="p">Önizleme</button></div>' +
      '<div data-pane="w"><div class="tb" role="toolbar" aria-label="Biçimlendirme"><button type="button" data-f="h">Ara başlık</button><button type="button" data-f="b">Kalın</button><button type="button" data-f="l">• Madde</button><button type="button" data-f="q">Alıntı</button><button type="button" data-f="a">Bağlantı</button><span class="sep"></span><button type="button" data-f="i">' + ic('img') + 'Görsel ekle</button></div>' +
      '<textarea class="textarea" name="body" placeholder="Makale metnini buraya yazın veya yapıştırın. Her satır ayrı bir paragraf olur.">' + esc(D.body) + '</textarea>' +
      '<p class="hint">İpucu: Her satır ayrı paragraf olarak yayınlanır. Ara başlık için satırın başına <span class="code">##</span>, madde için <span class="code">-</span> yazabilir veya yukarıdaki düğmeleri kullanabilirsiniz.</p></div>' +
      '<div data-pane="p" hidden><div class="preview"></div></div></div></div></div>' +
      '<div class="ed-side">' +
      '<div class="card"><div class="btn-row" style="flex-direction:column;align-items:stretch"><button type="button" class="btn btn-gold btn-block" data-save>' + ic('check') + (file ? 'Değişiklikleri yayınla' : 'Yayınla') + '</button>' +
      (file ? '<a class="btn btn-line btn-block" href="' + esc(siteUrl('/makaleler/' + D.orig.slug + '/')) + '" target="_blank" rel="noopener">' + ic('eye') + 'Sitede gör</a>' : '') + '</div><p class="hint" id="ed-auto"></p></div>' +
      '<div class="card"><label class="field"><span>Çalışma alanı</span><select class="select" name="area">' + areaOpts + '</select><small>Makale bu alanın sayfasında da listelenir.</small></label>' +
      '<div class="field" style="margin-bottom:0"><span>İlgili diğer alanlar <small style="display:inline;margin:0">(isteğe bağlı)</small></span><div class="chips" data-rel>' + rel + '</div></div></div>' +
      '<div class="card"><div class="field" style="margin-bottom:0"><span>Kapak görseli <small style="display:inline;margin:0">(isteğe bağlı)</small></span><div id="cover"></div><input type="file" accept="image/*" hidden data-cover-input></div></div>' +
      '<div class="card"><label class="field"><span>Google açıklaması <span class="count" data-c="description"></span></span><textarea class="input" name="description" rows="3" maxlength="300" placeholder="Boş bırakılırsa ilk paragraftan otomatik alınır.">' + esc(D.description) + '</textarea><small>Arama sonuçlarında başlığın altında görünür. İdeal uzunluk 120–160 karakter.</small></label>' +
      '<label class="field" style="margin-bottom:0"><span>Yayın tarihi</span><input class="input" type="date" name="date" value="' + esc(D.date) + '"></label></div>' +
      '</div></div><input type="file" accept="image/*" hidden data-inline-input>';

    var view = $('#view');
    var ta = $('textarea[name=body]', view);
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(draftKey(file)) || 'null'); } catch (e) { }
    if (saved && (saved.body || saved.title) && (saved.body !== D.body || saved.title !== D.title || saved.description !== D.description)) {
      $('#ed-msg').innerHTML = '<div class="msg msg-info">Kaydedilmemiş bir taslak bulundu (' + esc(new Date(saved.at).toLocaleString('tr-TR')) + '). <button type="button" class="btn btn-line btn-sm" data-restore>Taslağı geri yükle</button> <button type="button" class="btn btn-line btn-sm" data-discard>Sil</button></div>';
      $('[data-restore]').onclick = function () {
        ['title', 'date', 'area', 'related', 'description', 'body'].forEach(function (k) { if (saved[k] != null) D[k] = saved[k]; });
        try { localStorage.removeItem(draftKey(file)); } catch (e) { }
        drawEditor(file);
        S.dirty = true;
      };
      $('[data-discard]').onclick = function () { try { localStorage.removeItem(draftKey(file)); } catch (e) { } $('#ed-msg').innerHTML = ''; };
    }

    function counts() {
      [['title', 70], ['description', 160]].forEach(function (c) {
        var el = $('[data-c="' + c[0] + '"]', view), v = $('[name="' + c[0] + '"]', view).value.length;
        el.textContent = v + ' / ' + c[1];
        el.classList.toggle('over', v > c[1]);
      });
    }
    var autoT;
    function collect() {
      D.title = $('[name=title]', view).value;
      D.body = ta.value;
      D.area = $('[name=area]', view).value;
      D.description = $('[name=description]', view).value;
      D.date = $('[name=date]', view).value || todayISO();
      D.related = $$('[data-rel] input:checked', view).map(function (x) { return x.value; });
    }
    function changed() {
      collect(); counts(); S.dirty = true;
      clearTimeout(autoT);
      autoT = setTimeout(function () {
        try {
          localStorage.setItem(draftKey(file), JSON.stringify({ at: Date.now(), title: D.title, date: D.date, area: D.area, related: D.related, description: D.description, body: D.body, image: D.pending[D.image] ? '' : D.image }));
          $('#ed-auto').textContent = 'Taslak bu cihaza kaydedildi · ' + new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { }
      }, 800);
    }
    view.oninput = changed;
    view.onchange = changed;
    counts();

    function drawCover() {
      var box = $('#cover');
      if (D.image) {
        box.innerHTML = '<div class="cover-prev"><img src="' + esc(imgSrc(D.image)) + '" alt=""><button type="button" class="btn btn-line btn-sm" data-rm>' + ic('x') + 'Kaldır</button></div><button type="button" class="btn btn-line btn-sm" style="margin-top:8px" data-pick>Değiştir</button>';
        $('[data-rm]', box).onclick = function () { D.image = ''; changed(); drawCover(); };
      } else {
        box.innerHTML = '<div class="cover-box" data-pick role="button" tabindex="0">' + ic('img') + '<div><b>Görsel seçin</b><br>JPG, PNG veya WEBP. Otomatik küçültülür.</div></div>';
      }
      $$('[data-pick]', box).forEach(function (el) {
        el.onclick = function () { $('[data-cover-input]', view).click(); };
        el.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } };
      });
    }
    drawCover();
    $('[data-cover-input]', view).onchange = function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      var box = $('#cover'); box.innerHTML = '<div class="skel" style="height:150px"></div>';
      processImage(f, 1600).then(function (o) {
        var p = newImagePath(slugify(D.title) || 'kapak', o.ext);
        D.pending[p] = o; D.image = p; changed(); drawCover();
      }).catch(function (err) { toast(err.message, 'err'); drawCover(); });
    };
    $('[data-inline-input]', view).onchange = function (e) {
      var f = e.target.files[0]; e.target.value = '';
      if (!f) return;
      var s = ta.selectionStart;
      processImage(f, 1400).then(function (o) {
        var p = newImagePath(slugify(D.title) || 'gorsel', o.ext);
        D.pending[p] = o;
        var before = ta.value.slice(0, s), after = ta.value.slice(s);
        var line = '![Görsel açıklaması](' + p + ')';
        ta.value = before + (before && !/\n$/.test(before) ? '\n' : '') + line + '\n' + after;
        ta.focus();
        var st = (before && !/\n$/.test(before) ? before.length + 1 : before.length) + 2;
        ta.setSelectionRange(st, st + 'Görsel açıklaması'.length);
        changed();
        toast('Görsel eklendi. Köşeli parantez içindeki açıklamayı düzenleyebilirsiniz.');
      }).catch(function (err) { toast(err.message, 'err'); });
    };

    $$('[data-tab]', view).forEach(function (b) {
      b.onclick = function () {
        var p = b.getAttribute('data-tab') === 'p';
        collect();
        $$('[data-tab]', view).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        $('[data-pane="w"]', view).hidden = p;
        $('[data-pane="p"]', view).hidden = !p;
        if (p) $('.preview', view).innerHTML = (D.image ? '<figure><img src="' + esc(imgSrc(D.image)) + '" alt=""></figure>' : '') + '<h2>' + esc(D.title || 'Başlıksız') + '</h2>' + mdHtml(D.body);
      };
    });

    function lineRange() {
      var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      var ls = v.lastIndexOf('\n', s - 1) + 1, le = v.indexOf('\n', e); if (le < 0) le = v.length;
      return { s: ls, e: le };
    }
    function prefixLines(pre) {
      var r = lineRange(), v = ta.value;
      var block = v.slice(r.s, r.e).split('\n').map(function (l) {
        var clean = l.replace(/^(## |- |> )/, '');
        return l.indexOf(pre) === 0 ? clean : (clean.trim() ? pre + clean : clean);
      }).join('\n');
      ta.value = v.slice(0, r.s) + block + v.slice(r.e);
      ta.focus(); ta.setSelectionRange(r.s, r.s + block.length);
      changed();
    }
    $$('[data-f]', view).forEach(function (b) {
      b.onclick = function () {
        var f = b.getAttribute('data-f'), s = ta.selectionStart, e = ta.selectionEnd, v = ta.value, sel = v.slice(s, e);
        if (f === 'h') return prefixLines('## ');
        if (f === 'l') return prefixLines('- ');
        if (f === 'q') return prefixLines('> ');
        if (f === 'i') return $('[data-inline-input]', view).click();
        if (f === 'b') {
          var t = sel || 'kalın metin';
          ta.value = v.slice(0, s) + '**' + t + '**' + v.slice(e);
          ta.focus(); ta.setSelectionRange(s + 2, s + 2 + t.length); changed(); return;
        }
        if (f === 'a') {
          var txt = sel || 'bağlantı metni', ins = '[' + txt + '](https://)';
          ta.value = v.slice(0, s) + ins + v.slice(e);
          ta.focus(); ta.setSelectionRange(s + txt.length + 3, s + txt.length + 11); changed();
          toast('Parantez içine bağlantı adresini yazın.');
        }
      };
    });

    $('[data-save]', view).onclick = function () { saveArticle(file, this); };
  }

  function saveArticle(file, btn) {
    var D = S.draft;
    var view = $('#view');
    D.title = $('[name=title]', view).value;
    D.body = $('textarea[name=body]', view).value;
    D.area = $('[name=area]', view).value;
    D.description = $('[name=description]', view).value;
    D.date = $('[name=date]', view).value || todayISO();
    D.related = $$('[data-rel] input:checked', view).map(function (x) { return x.value; });
    var errs = [];
    if (oneLine(D.title).length < 5) errs.push('Başlık en az 5 karakter olmalı.');
    if (!D.area) errs.push('Çalışma alanı seçin.');
    if (normalizeBody(D.body).replace(/\s/g, '').length < 40) errs.push('Makale metni çok kısa.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(D.date)) errs.push('Geçerli bir tarih girin.');
    var msg = $('#ed-msg');
    if (errs.length) { msg.innerHTML = '<div class="msg msg-err">' + errs.map(esc).join('<br>') + '</div>'; window.scrollTo(0, 0); return; }
    msg.innerHTML = '';

    var orig = D.orig;
    var slug = orig ? orig.slug : slugify(D.title).slice(0, 80).replace(/-+$/, '') || 'makale';
    if (!orig) {
      var taken = {}; (S.articles || []).forEach(function (x) { taken[x.slug] = 1; });
      var base = slug, n = 2;
      while (taken[slug]) slug = base + '-' + n++;
    }
    var mdPath = orig ? orig.path : ART_DIR + '/' + D.date + '-' + slug + '.md';
    var art = { title: D.title, date: D.date, slug: slug, area: D.area, related: D.related.filter(function (r) { return r !== D.area; }), description: D.description, image: D.image, body: D.body };
    art.body = String(art.body).split('![Görsel açıklaması](').join('![](');
    var text = serialize(art);
    var used = imagesIn(text).concat(D.image ? [D.image] : []);
    var add = [{ path: mdPath, b64: utf8b64(text) }];
    Object.keys(D.pending).forEach(function (p) { if (used.indexOf(p) > -1) add.push({ path: p.slice(1), b64: D.pending[p].b64 }); });
    var del = [];
    if (orig) {
      var old = imagesIn(orig.body).concat(orig.image ? [orig.image] : []);
      old.forEach(function (p) { if (p.indexOf('/' + IMG_DIR + '/') === 0 && used.indexOf(p) < 0) del.push(p.slice(1)); });
    }
    busy(btn, true, 'Yayınlanıyor');
    commitFiles(add, del, (orig ? 'Makale güncellendi: ' : 'Yeni makale: ') + oneLine(D.title)).then(function (sha) {
      try { localStorage.removeItem(draftKey(file)); } catch (e) { }
      S.dirty = false;
      var updated = parseArticle(mdPath.split('/').pop(), text);
      if (orig) S.articles = S.articles.map(function (x) { return x === orig ? updated : x; });
      else S.articles = [updated].concat(S.articles || []);
      S.articles.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.file.localeCompare(b.file); });
      toast(orig ? 'Değişiklikler kaydedildi.' : 'Makale kaydedildi.');
      trackDeploy(sha, siteUrl('/makaleler/' + slug + '/'));
      go('makaleler');
    }).catch(function (e) {
      busy(btn, false);
      msg.innerHTML = '<div class="msg msg-err">' + esc(e.message) + '</div>';
      window.scrollTo(0, 0);
    });
  }

  /* ---------- istatistikler ---------- */
  function viewStats() {
    var hasUm = !!(umKey() && S.umamiId);
    var ranges = [['today', 'Bugün'], ['7', '7 gün'], ['30', '30 gün'], ['90', '90 gün']];
    var seg = '<div class="seg" role="group" aria-label="Zaman aralığı">' + ranges.map(function (r) { return '<button type="button" data-r="' + r[0] + '" aria-pressed="' + (S.range === r[0]) + '">' + r[1] + '</button>'; }).join('') + '</div>';
    if (!hasUm) {
      shell('ziyaretciler', 'Ziyaretçiler', 'Sitenize gelen ziyaretçiler, ülke ve şehir dağılımı.', '',
        '<div class="card"><h2>' + ic('chart') + 'İstatistik bağlantısı kurulmamış</h2><p>Ziyaretçi sayısını, hangi ülke ve şehirden girildiğini, en çok okunan sayfaları burada görmek için istatistik bağlantısını kurun.</p><a class="btn btn-gold" href="#/ayarlar">Kurulumu başlat</a></div>');
      return;
    }
    shell('ziyaretciler', 'Ziyaretçiler', 'Sitenize gelen ziyaretçiler, ülke ve şehir dağılımı.', seg, '<div id="st"></div>');
    $$('.seg button').forEach(function (b) { b.onclick = function () { S.range = b.getAttribute('data-r'); viewStats(); }; });
    var r = rangeOf(S.range);
    var sk = function (h) { return '<div class="skel" style="height:' + h + 'px"></div>'; };
    $('#st').innerHTML =
      '<div class="grid g4" id="st-n">' + [0, 1, 2, 3].map(function () { return '<div class="stat">' + sk(56) + '</div>'; }).join('') + '</div>' +
      '<div class="card" style="margin-top:16px"><h2>Ziyaretçi grafiği</h2><div id="st-c">' + sk(200) + '</div></div>' +
      '<div class="grid g3" style="margin-top:16px">' +
      '<div class="card"><h2>Şehirler</h2><div id="st-city">' + sk(160) + '</div></div>' +
      '<div class="card"><h2>İller</h2><div id="st-region">' + sk(160) + '</div></div>' +
      '<div class="card"><h2>Ülkeler</h2><div id="st-country">' + sk(160) + '</div></div></div>' +
      '<div class="grid g3" style="margin-top:16px">' +
      '<div class="card"><h2>En çok görüntülenen sayfalar</h2><div id="st-path">' + sk(160) + '</div></div>' +
      '<div class="card"><h2>Nereden geldiler</h2><div id="st-ref">' + sk(160) + '</div></div>' +
      '<div class="card"><h2>Cihazlar</h2><div id="st-dev">' + sk(160) + '</div></div></div>';
    function fail(id) { return function (e) { var b = $(id); if (b) b.innerHTML = '<p class="msg msg-err">' + esc(e.message) + '</p>'; }; }
    stats(r).then(function (s) {
      var v = val(s.visitors), vi = val(s.visits), pv = val(s.pageviews), bo = val(s.bounces), tt = val(s.totaltime);
      var avg = vi ? Math.round(tt / vi) : 0;
      var b = $('#st-n'); if (!b) return;
      b.innerHTML =
        '<div class="stat"><small>Ziyaretçi</small><b>' + fmtNum(v) + '</b><span>tekil kişi</span></div>' +
        '<div class="stat"><small>Ziyaret</small><b>' + fmtNum(vi) + '</b><span>oturum</span></div>' +
        '<div class="stat"><small>Sayfa görüntüleme</small><b>' + fmtNum(pv) + '</b><span>toplam</span></div>' +
        '<div class="stat"><small>Ortalama süre</small><b>' + (avg >= 60 ? Math.floor(avg / 60) + ' dk ' + (avg % 60) + ' sn' : avg + ' sn') + '</b><span>hemen çıkma %' + (vi ? Math.round(Math.min(bo, vi) / vi * 100) : 0) + '</span></div>';
    }).catch(fail('#st-n'));
    series(r).then(function (s) { var b = $('#st-c'); if (b) { b.innerHTML = barChart(fillSeries(s.visitors, r), r.days, b.clientWidth); bindChartTips(b); } }).catch(fail('#st-c'));
    metrics('city', r, 12).then(function (d) { var b = $('#st-city'); if (b) b.innerHTML = rankList(d, function (x) { return x || 'Bilinmiyor'; }); }).catch(fail('#st-city'));
    metrics('region', r, 12).then(function (d) { var b = $('#st-region'); if (b) b.innerHTML = rankList(d, regionName); }).catch(fail('#st-region'));
    metrics('country', r, 12).then(function (d) { var b = $('#st-country'); if (b) b.innerHTML = rankList(d, countryName); }).catch(fail('#st-country'));
    loadArticles().catch(function () { }).then(function () {
      return metrics('path', r, 10).then(function (d) { var b = $('#st-path'); if (b) b.innerHTML = rankList(d, pageName); });
    }).catch(fail('#st-path'));
    metrics('referrer', r, 10).then(function (d) { var b = $('#st-ref'); if (b) b.innerHTML = rankList(d, function (x) { return x || 'Doğrudan giriş'; }); }).catch(fail('#st-ref'));
    metrics('device', r, 6).then(function (d) { var b = $('#st-dev'); if (b) b.innerHTML = rankList(d, deviceName); }).catch(fail('#st-dev'));
  }

  /* ---------- ayarlar ---------- */
  function saveVault(extraFiles, msg) {
    return needPassword().then(function (pass) {
      return sealVault(S.secrets, S.user, pass);
    }).then(function (v) {
      var files = [{ path: 'content/panel.json', b64: utf8b64(JSON.stringify(v, null, 2) + '\n') }].concat(extraFiles || []);
      return commitFiles(files, [], msg);
    });
  }
  function tokenUrl() {
    var q = 'name=' + encodeURIComponent('Yilmaz Caglayan Panel') + '&description=' + encodeURIComponent('yilmazcaglayan.av.tr yonetim paneli: makale yayinlama') +
      '&target_name=' + encodeURIComponent(CFG.repo.owner) + '&expires_in=none&contents=write&actions=read';
    return 'https://github.com/settings/personal-access-tokens/new?' + q;
  }
  function parseGeo(t) {
    var v = String(t || '').trim(), m;
    if (!v) return null;
    m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(v) || /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/.exec(v) || /[?&](?:q|query|destination|ll)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i.exec(v) || /^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/.exec(v);
    if (!m) return false;
    var lat = parseFloat(String(m[1]).replace(',', '.')), lng = parseFloat(String(m[2]).replace(',', '.'));
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
    return { lat: Math.round(lat * 1e7) / 1e7, lng: Math.round(lng * 1e7) / 1e7 };
  }
  function contactCard() {
    var c = S.contact || CFG.contact || {};
    var geo = c.lat !== '' && c.lat != null ? c.lat + ', ' + c.lng : '';
    function f(name, label, val, extra) { return '<label class="field"><span>' + label + '</span><input class="input" name="' + name + '" value="' + esc(val || '') + '"' + (extra || '') + '></label>'; }
    return '<div class="card" id="set-ct"><div class="set-head"><h2>' + ic('home') + 'İletişim bilgileri ve konum</h2></div>' +
      '<p>Sitedeki adres, telefon, e-posta, çalışma saatleri, harita ve "Yol Tarifi Al" bağlantısı buradaki bilgilerden oluşturulur. Ofis taşındığında buradan güncellemeniz yeterlidir.</p>' +
      f('ct_street', 'Adres', c.street) +
      '<div class="row2">' + f('ct_district', 'İlçe', c.district) + f('ct_city', 'İl', c.city) + '</div>' +
      '<div class="row2">' + f('ct_phone', 'Telefon', c.phone, ' inputmode="tel"') + f('ct_email', 'E-posta', c.email, ' type="email"') + '</div>' +
      '<div class="row2">' + f('ct_hours', 'Çalışma saatleri', c.hours) + f('ct_note', 'Kısa not', c.hoursNote) + '</div>' +
      '<label class="field"><span>Harita konumu</span><input class="input" name="ct_geo" value="' + esc(geo) + '" placeholder="37.2372505, 27.5970421" spellcheck="false">' +
      '<small>Google Haritalar\'da ofisin tam yerine sağ tıklayın (telefonda basılı tutun); çıkan koordinatı kopyalayıp buraya yapıştırın. Google Haritalar bağlantısını da yapıştırabilirsiniz. Boş bırakılırsa adres kullanılır. <a href="#" data-geo-check>Konumu haritada kontrol et</a></small></label>' +
      '<div id="ct-msg"></div><button type="button" class="btn btn-gold" data-ct>İletişim bilgilerini kaydet</button></div>';
  }
  function bindContact() {
    var chk = $('[data-geo-check]');
    if (chk) chk.onclick = function (e) {
      e.preventDefault();
      var g = parseGeo($('[name=ct_geo]').value);
      var q = g ? g.lat + ',' + g.lng : [$('[name=ct_street]').value, $('[name=ct_district]').value, $('[name=ct_city]').value].join(' ');
      window.open('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q), '_blank', 'noopener');
    };
    $('[data-ct]').onclick = function () {
      var btn = this, box = '#ct-msg';
      function say(t, m) { $(box).innerHTML = '<p class="msg msg-' + t + '">' + m + '</p>'; }
      if (!ghToken()) return say('err', 'Kaydetmek için önce GitHub bağlantısını kurun.');
      var v = function (n) { return oneLine($('[name=' + n + ']').value); };
      var data = { street: v('ct_street'), district: v('ct_district'), city: v('ct_city'), phone: v('ct_phone'), email: v('ct_email'), hours: v('ct_hours'), hoursNote: v('ct_note'), lat: '', lng: '' };
      if (!data.street || !data.district || !data.city) return say('err', 'Adres, ilçe ve il alanları boş bırakılamaz.');
      if (data.phone.replace(/\D/g, '').length < 10) return say('err', 'Telefon numarası eksik görünüyor.');
      if (data.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return say('err', 'E-posta adresi geçerli görünmüyor.');
      var g = parseGeo($('[name=ct_geo]').value);
      if (g === false) return say('err', 'Harita konumu anlaşılamadı. Örnek biçim: <span class="code">37.2372505, 27.5970421</span>');
      if (g) { data.lat = g.lat; data.lng = g.lng; }
      busy(btn, true, 'Kaydediliyor');
      $(box).innerHTML = '';
      commitFiles([{ path: 'content/iletisim.json', b64: utf8b64(JSON.stringify(data, null, 2) + '\n') }], [], 'Panel: iletişim bilgileri güncellendi').then(function (sha) {
        S.contact = data;
        say('ok', 'Kaydedildi. Site 1–2 dakika içinde yeni bilgilerle güncellenir.');
        trackDeploy(sha, siteUrl('/iletisim/'));
      }).catch(function (e) { say('err', esc(e.message)); }).then(function () { busy(btn, false); });
    };
  }
  function viewSettings() {
    var ghOn = !!ghToken(), umOn = !!(umKey() && S.umamiId);
    shell('ayarlar', 'Ayarlar', 'Bağlantılar ve giriş bilgileri.', '',
      '<div class="card" id="set-gh"><div class="set-head"><h2>' + ic('key') + 'GitHub bağlantısı</h2><span class="status ' + (ghOn ? 'on">Bağlı' : 'off">Kurulmadı') + '</span></div>' +
      '<p>Makalelerin siteye kaydedilip yayınlanması için gereklidir. Bir kez kurmanız yeterlidir; tüm cihazlarda geçerli olur.</p>' +
      '<ol class="steps"><li><a href="' + esc(tokenUrl()) + '" target="_blank" rel="noopener"><b>Bu bağlantıyla anahtar oluşturma sayfasını açın</b></a> (GitHub hesabınıza giriş yapmış olmanız gerekir).</li>' +
      '<li><b>Repository access</b> bölümünde <b>Only select repositories</b> seçeneğini işaretleyip <span class="code">' + esc(CFG.repo.name) + '</span> deposunu seçin.</li>' +
      '<li>İzinler hazır gelir (Contents: Read and write, Actions: Read). Sayfanın altındaki <b>Generate token</b> düğmesine basın.</li>' +
      '<li>Oluşan ve <span class="code">github_pat_</span> ile başlayan anahtarı kopyalayıp aşağıya yapıştırın.</li></ol>' +
      '<label class="field"><span>GitHub anahtarı</span><input class="input" name="gh" type="password" autocomplete="off" spellcheck="false" placeholder="' + (ghOn ? 'Kayıtlı anahtar var. Değiştirmek için yenisini yapıştırın.' : 'github_pat_…') + '"></label>' +
      '<div id="gh-msg"></div><button type="button" class="btn btn-gold" data-gh>Bağlantıyı test et ve kaydet</button></div>' +

      '<div class="card" id="set-um"><div class="set-head"><h2>' + ic('chart') + 'Ziyaretçi istatistikleri</h2><span class="status ' + (umOn ? 'on">Bağlı' : 'off">Kurulmadı') + '</span></div>' +
      '<p>Ziyaretçi sayıları, ülke ve şehir bilgileri ücretsiz ve çerez kullanmayan Umami servisiyle ölçülür.</p>' +
      '<ol class="steps"><li><a href="https://cloud.umami.is/signup" target="_blank" rel="noopener"><b>cloud.umami.is</b></a> adresinde ücretsiz hesap açın.</li>' +
      '<li><b>Websites → Add website</b> ile sitenizi ekleyin (Domain: <span class="code">' + esc(location.hostname) + '</span>). Sitenin <b>Website ID</b> değerini kopyalayın.</li>' +
      '<li>Sağ üstteki profil menüsünden <b>Settings → API keys → Create key</b> ile bir anahtar oluşturup kopyalayın.</li>' +
      '<li>İkisini aşağıya yapıştırıp kaydedin. Sayaç birkaç dakika içinde sitede çalışmaya başlar.</li></ol>' +
      '<div class="row2"><label class="field"><span>Website ID</span><input class="input" name="umid" autocomplete="off" spellcheck="false" value="' + esc(S.umamiId) + '" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"></label>' +
      '<label class="field"><span>API anahtarı</span><input class="input" name="umkey" type="password" autocomplete="off" spellcheck="false" placeholder="' + (umKey() ? 'Kayıtlı anahtar var' : 'api_…') + '"></label></div>' +
      '<div id="um-msg"></div><button type="button" class="btn btn-gold" data-um>Test et ve kaydet</button></div>' +

      contactCard() +
      '<div class="card" id="set-pw"><div class="set-head"><h2>' + ic('lock') + 'Giriş bilgileri</h2></div>' +
      '<p>Panelin kullanıcı adı ve şifresini değiştirin. Güçlü bir şifre seçmeniz önerilir (en az 10 karakter, harf ve rakam).</p>' +
      '<div class="row2"><label class="field"><span>Mevcut şifre</span><input class="input" name="cur" type="password" autocomplete="current-password"></label>' +
      '<label class="field"><span>Kullanıcı adı</span><input class="input" name="nu" autocapitalize="none" spellcheck="false" autocomplete="username" value="' + esc(S.user) + '"></label></div>' +
      '<div class="row2"><label class="field"><span>Yeni şifre</span><input class="input" name="np" type="password" autocomplete="new-password"></label>' +
      '<label class="field"><span>Yeni şifre (tekrar)</span><input class="input" name="np2" type="password" autocomplete="new-password"></label></div>' +
      '<div id="pw-msg"></div><button type="button" class="btn btn-gold" data-pw>Şifreyi değiştir</button></div>' +

      '<div class="card"><div class="set-head"><h2>' + ic('out') + 'Oturum</h2><button type="button" class="btn btn-line" data-out>Çıkış yap</button></div><p style="margin:0">Ortak kullanılan bir bilgisayardaysanız işiniz bitince çıkış yapın.</p></div>');

    $('[data-out]').onclick = logout;
    bindContact();
    function say(id, type, text) { $(id).innerHTML = '<p class="msg msg-' + type + '">' + text + '</p>'; }

    $('[data-gh]').onclick = function () {
      var btn = this, tok = $('[name=gh]').value.trim();
      if (!tok) return say('#gh-msg', 'err', 'Lütfen GitHub anahtarını yapıştırın.');
      if (!/^(github_pat_|ghp_)[A-Za-z0-9_]+$/.test(tok)) return say('#gh-msg', 'err', 'Bu bir GitHub anahtarına benzemiyor. <span class="code">github_pat_</span> ile başlayan anahtarın tamamını kopyalayın.');
      busy(btn, true, 'Kontrol ediliyor');
      $('#gh-msg').innerHTML = '';
      gh(REPO, {}, tok).then(function (repo) {
        if (repo.permissions && repo.permissions.push === false) throw new Error('Anahtarın bu depoya yazma izni yok. "Contents: Read and write" izni verin.');
        return gh(REPO + '/actions/runs?per_page=1', {}, tok).then(function () { return true; }, function () { return false; });
      }).then(function (actionsOk) {
        var prev = S.secrets.github;
        S.secrets.github = tok;
        return saveVault([], 'Panel: GitHub bağlantısı güncellendi').then(function (sha) {
          saveSession(); S.articles = null;
          say('#gh-msg', 'ok', 'Bağlantı kuruldu ve kaydedildi.' + (actionsOk ? '' : ' (Yayın durumu takibi için "Actions: Read" izni eklenmemiş; yayınlama yine de çalışır.)'));
          $('#set-gh .status').className = 'status on'; $('#set-gh .status').textContent = 'Bağlı';
          $('[name=gh]').value = '';
          trackDeploy(sha);
        }, function (e) { S.secrets.github = prev; throw e; });
      }).catch(function (e) { say('#gh-msg', 'err', esc(e.message)); }).then(function () { busy(btn, false); });
    };

    $('[data-um]').onclick = function () {
      var btn = this, id = $('[name=umid]').value.trim(), key = $('[name=umkey]').value.trim() || umKey();
      if (!ghToken()) return say('#um-msg', 'err', 'Önce GitHub bağlantısını kurun; ayarlar siteye onunla kaydedilir.');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return say('#um-msg', 'err', 'Website ID geçerli görünmüyor. Umami\'deki site ayarlarından kopyalayın.');
      if (!key) return say('#um-msg', 'err', 'API anahtarını yapıştırın.');
      busy(btn, true, 'Kontrol ediliyor');
      $('#um-msg').innerHTML = '';
      um('/stats', { startAt: Date.now() - 864e5, endAt: Date.now() }, key, id).then(function () {
        var prevK = S.secrets.umami, prevId = S.umamiId;
        S.secrets.umami = key; S.umamiId = id;
        var cfg = [{ path: 'content/analitik.json', b64: utf8b64(JSON.stringify({ umamiWebsiteId: id }, null, 2) + '\n') }];
        return saveVault(cfg, 'Panel: istatistik bağlantısı güncellendi').then(function (sha) {
          saveSession();
          say('#um-msg', 'ok', 'İstatistik bağlantısı kuruldu. Sayaç birkaç dakika içinde sitede çalışmaya başlar.');
          $('#set-um .status').className = 'status on'; $('#set-um .status').textContent = 'Bağlı';
          $('[name=umkey]').value = '';
          trackDeploy(sha);
        }, function (e) { S.secrets.umami = prevK; S.umamiId = prevId; throw e; });
      }).catch(function (e) { say('#um-msg', 'err', esc(e.message)); }).then(function () { busy(btn, false); });
    };

    $('[data-pw]').onclick = function () {
      var btn = this, cur = $('[name=cur]').value, nu = $('[name=nu]').value.trim(), np = $('[name=np]').value, np2 = $('[name=np2]').value;
      if (!ghToken()) return say('#pw-msg', 'err', 'Şifre değişikliğinin kaydedilmesi için önce GitHub bağlantısını kurun.');
      if (!cur) return say('#pw-msg', 'err', 'Mevcut şifrenizi girin.');
      if (nu.length < 3) return say('#pw-msg', 'err', 'Kullanıcı adı en az 3 karakter olmalı.');
      if (np.length < 8) return say('#pw-msg', 'err', 'Yeni şifre en az 8 karakter olmalı.');
      if (np !== np2) return say('#pw-msg', 'err', 'Yeni şifreler birbiriyle aynı değil.');
      busy(btn, true, 'Kaydediliyor');
      $('#pw-msg').innerHTML = '';
      loadVault().then(function (v) { return openVault(v, S.user, cur); }).catch(function (e) {
        throw new Error(e && e.name === 'OperationError' ? 'Mevcut şifre hatalı.' : e.message);
      }).then(function () {
        return sealVault(S.secrets, nu, np);
      }).then(function (v) {
        return commitFiles([{ path: 'content/panel.json', b64: utf8b64(JSON.stringify(v, null, 2) + '\n') }], [], 'Panel: giriş bilgileri değiştirildi');
      }).then(function (sha) {
        S.user = nu; S.pass = np; saveSession();
        ['cur', 'np', 'np2'].forEach(function (n) { $('[name=' + n + ']').value = ''; });
        say('#pw-msg', 'ok', 'Giriş bilgileri değiştirildi. Yeni şifre yaklaşık 1–2 dakika içinde tüm cihazlarda geçerli olur.');
        trackDeploy(sha);
      }).catch(function (e) { say('#pw-msg', 'err', esc(e.message)); }).then(function () { busy(btn, false); });
    };
  }

  /* ---------- başlat ---------- */
  var lastRoute = route();
  window.addEventListener('hashchange', function () {
    if (S.skipHash) { S.skipHash = false; return; }
    var r = route();
    if (S.dirty && /^makale\//.test(lastRoute) && r !== lastRoute) {
      if (!window.confirm('Yayınlanmamış değişiklikler var. Sayfadan çıkılsın mı? (Taslak bu cihazda saklanır.)')) {
        S.skipHash = true;
        location.hash = '#/' + lastRoute;
        return;
      }
      S.dirty = false;
    }
    lastRoute = r;
    render();
  });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  if (!window.crypto || !crypto.subtle) {
    app.innerHTML = '<div class="login"><div class="login-card"><h1>Tarayıcı desteklenmiyor</h1><p class="sub">Lütfen güncel bir tarayıcıyla (Chrome, Safari, Edge, Firefox) güvenli bağlantı (https) üzerinden açın.</p></div></div>';
    return;
  }
  if (restoreSession()) render(); else renderLogin();
})();
