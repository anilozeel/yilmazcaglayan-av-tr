/* Yönetim paneli — form motoru, görsel seçici, markdown düzenleyici */
(function () {
  'use strict';
  const P = window.YP;
  const esc = P.esc;
  let uid = 0;
  const yeniId = () => 'f' + (++uid);

  const al = (o, k) => (k ? o[k] : o);
  const koy = (o, k, v) => { o[k] = v; };

  /* ---------------- görsel yükleme ve seçici ---------------- */
  P.gorselYukle = async function (dosya, tur) {
    if (!dosya) return null;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(dosya.type)) throw new Error('Lütfen JPG, PNG veya WEBP biçiminde bir görsel seçin.');
    if (dosya.size > 20 * 1024 * 1024) throw new Error('Görsel 20 MB\'den küçük olmalı.');
    const fd = new FormData();
    fd.append('dosya', dosya);
    fd.append('tur', tur || 'makale');
    const j = await P.api('yukle', fd);
    return j;
  };

  P.gorselSec = function (tur) {
    return new Promise(async res => {
      let secildi = null;
      const kutu = P.h(`<div class="picker">
        <div class="picker-top">
          <label class="btn gold">${P.svg('upload')} Bilgisayardan / telefondan yükle<input type="file" accept="image/jpeg,image/png,image/webp" hidden></label>
          <span class="muted">veya yüklenmiş görsellerden birini seçin</span>
        </div>
        <div class="picker-grid"><div class="muted pad"><span class="spin"></span> Görseller yükleniyor…</div></div>
      </div>`);
      const m = P.modal('Görsel seç', kutu, { genis: true, kapaninca: () => res(secildi) });
      const inp = P.$('input[type=file]', kutu);
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        const lbl = inp.parentElement;
        lbl.classList.add('busy');
        lbl.firstChild.textContent = '';
        lbl.insertAdjacentHTML('afterbegin', '<span class="spin"></span> Yükleniyor… ');
        try { const j = await P.gorselYukle(f, tur); secildi = j.yol; P.toast('Görsel yüklendi.'); m.kapat(); }
        catch (e) { P.toast(e.message, 'err'); lbl.classList.remove('busy'); }
      };
      try {
        const j = await P.api('gorseller');
        const grid = P.$('.picker-grid', kutu);
        const sabit = ['/assets/img/themis.jpg', '/assets/img/yilmaz-caglayan.jpg', '/assets/img/yilmaz-caglayan-ozgecmis.jpg', '/assets/img/yilmaz-caglayan-soft.jpg', '/assets/img/og-image.jpg'];
        const liste = [...j.gorseller.map(g => g.yol), ...sabit];
        grid.innerHTML = liste.map(y => `<button type="button" class="pick" data-yol="${esc(y)}"><img src="${esc(y)}" alt="" loading="lazy"><small>${esc(y.split('/').pop())}</small></button>`).join('') || '<p class="muted pad">Henüz yüklenmiş görsel yok.</p>';
        P.$$('.pick', grid).forEach(b => b.onclick = () => { secildi = b.dataset.yol; m.kapat(); });
      } catch (e) { P.$('.picker-grid', kutu).innerHTML = `<p class="muted pad">${esc(e.message)}</p>`; }
    });
  };

  /* ---------------- markdown düzenleyici ---------------- */
  function mdEditor(deger, degisti) {
    const id = yeniId();
    const el = P.h(`<div class="md">
      <div class="md-tools" role="toolbar" aria-label="Biçimlendirme">
        <button type="button" data-md="h2" title="Ara başlık">Başlık</button>
        <button type="button" data-md="h3" title="Küçük başlık">Alt başlık</button>
        <button type="button" data-md="b" title="Kalın"><b>K</b></button>
        <button type="button" data-md="i" title="İtalik"><i>İ</i></button>
        <button type="button" data-md="ul" title="Madde işaretli liste">• Liste</button>
        <button type="button" data-md="ol" title="Numaralı liste">1. Liste</button>
        <button type="button" data-md="q" title="Alıntı">“ Alıntı</button>
        <button type="button" data-md="a" title="Bağlantı">Bağlantı</button>
        <button type="button" data-md="img" title="Görsel ekle">${P.svg('image')} Görsel</button>
        <span class="grow"></span>
        <div class="seg"><button type="button" class="on" data-gor="yaz">Yaz</button><button type="button" data-gor="onizle">Önizle</button></div>
      </div>
      <textarea id="${id}" class="md-area" rows="22" spellcheck="true"></textarea>
      <div class="md-prev prose" hidden></div>
      <p class="hint">İpucu: Paragraflar arasında bir satır boşluk bırakın. Kalın için <code>**metin**</code>, bağlantı için <code>[yazı](https://...)</code> kullanılır; düğmeler bunu sizin yerinize yapar.</p>
    </div>`);
    const ta = P.$('textarea', el), prev = P.$('.md-prev', el);
    ta.value = deger || '';
    const oto = () => { ta.style.height = 'auto'; ta.style.height = Math.max(380, ta.scrollHeight + 4) + 'px'; };
    ta.addEventListener('input', () => { degisti(ta.value); oto(); });
    setTimeout(oto, 0);
    const sar = (on, son, ornek) => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const secim = ta.value.slice(s, e) || ornek;
      ta.setRangeText(on + secim + son, s, e, 'end');
      if (!ta.value.slice(s, e - 0)) { ta.selectionStart = s + on.length; ta.selectionEnd = s + on.length + secim.length; }
      ta.focus(); degisti(ta.value); oto();
    };
    const satir = (onek, ornek) => {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const bas = ta.value.lastIndexOf('\n', s - 1) + 1;
      const parca = ta.value.slice(bas, e) || ornek;
      let yeni = parca.split('\n').map((l, i) => (typeof onek === 'function' ? onek(i) : onek) + l.replace(/^(#{1,3} |[-*] |\d+[.)] |> )/, '')).join('\n');
      const once = bas > 0 && ta.value[bas - 1] === '\n' && ta.value[bas - 2] !== '\n' && /^#/.test(onek) ? '\n' : '';
      ta.setRangeText(once + yeni, bas, Math.max(e, bas + (ta.value.slice(bas, e) ? parca.length : 0)), 'end');
      ta.focus(); degisti(ta.value); oto();
    };
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-md]');
      if (b) {
        const t = b.dataset.md;
        if (t === 'h2') satir('## ', 'Ara başlık');
        else if (t === 'h3') satir('### ', 'Alt başlık');
        else if (t === 'b') sar('**', '**', 'kalın metin');
        else if (t === 'i') sar('*', '*', 'italik metin');
        else if (t === 'ul') satir('- ', 'Liste maddesi');
        else if (t === 'ol') satir(i => (i + 1) + '. ', 'Liste maddesi');
        else if (t === 'q') satir('> ', 'Alıntı metni');
        else if (t === 'a') {
          const url = prompt('Bağlantı adresi (ör. https://... veya /calisma-alanlari/ceza-hukuku/):', 'https://');
          if (url && url !== 'https://') sar('[', `](${url.trim()})`, 'bağlantı yazısı');
        } else if (t === 'img') {
          const yol = await P.gorselSec('makale');
          if (yol) {
            const alt = prompt('Görsel açıklaması (görselin altında görünür, boş bırakılabilir):', '') || '';
            const s = ta.selectionStart;
            const once = s > 0 && ta.value[s - 1] !== '\n' ? '\n\n' : (s > 1 && ta.value[s - 2] !== '\n' ? '\n' : '');
            ta.setRangeText(`${once}![${alt.replace(/[[\]]/g, '')}](${yol})\n\n`, s, ta.selectionEnd, 'end');
            ta.focus(); degisti(ta.value); oto();
          }
        }
        return;
      }
      const g = e.target.closest('[data-gor]');
      if (g) {
        P.$$('[data-gor]', el).forEach(x => x.classList.toggle('on', x === g));
        const onizle = g.dataset.gor === 'onizle';
        prev.hidden = !onizle; ta.hidden = onizle;
        P.$$('[data-md]', el).forEach(x => { x.disabled = onizle; });
        if (onizle) prev.innerHTML = window.YCRender.md(ta.value) || '<p class="muted">Henüz metin yok.</p>';
      }
    });
    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); sar('**', '**', 'kalın metin'); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') { e.preventDefault(); sar('*', '*', 'italik metin'); }
    });
    return el;
  }

  /* ---------------- alan çizimi ---------------- */
  function alanCiz(f, obj, degisti) {
    const id = yeniId();
    const etiket = f.l ? `<span class="fl-l">${esc(f.l)}${f.zorunlu ? ' <em>*</em>' : ''}</span>` : '';
    const ipucu = f.h ? `<small class="hint">${f.hHtml ? f.h : esc(f.h)}</small>` : '';
    const v = al(obj, f.k);
    let el;
    switch (f.t) {
      case 'html': return P.h(`<div class="fhtml">${f.html}</div>`);
      case 'baslik': return P.h(`<h3 class="fsub">${esc(f.l)}</h3>`);
      case 'textarea': {
        el = P.h(`<label class="fl ${f.genis === false ? '' : 'full'}">${etiket}<textarea id="${id}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}"></textarea>${f.sayac ? '<small class="count"></small>' : ''}${ipucu}</label>`);
        const ta = P.$('textarea', el);
        ta.value = v == null ? '' : v;
        const sayac = P.$('.count', el);
        const say = () => { if (sayac) { const n = ta.value.length; sayac.textContent = `${n} karakter${f.sayac > 1 ? ` · önerilen en fazla ${f.sayac}` : ''}`; sayac.classList.toggle('over', f.sayac > 1 && n > f.sayac); } };
        say();
        ta.addEventListener('input', () => { koy(obj, f.k, ta.value); say(); degisti(); });
        return el;
      }
      case 'number': {
        el = P.h(`<label class="fl">${etiket}<input id="${id}" type="number" inputmode="decimal" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 1}">${ipucu}</label>`);
        const i = P.$('input', el);
        i.value = v == null ? '' : v;
        i.addEventListener('input', () => { const n = parseFloat(i.value.replace(',', '.')); koy(obj, f.k, isFinite(n) ? n : ''); degisti(); });
        return el;
      }
      case 'check': {
        el = P.h(`<label class="fl check"><input id="${id}" type="checkbox"><span>${esc(f.l)}</span>${ipucu}</label>`);
        const i = P.$('input', el);
        i.checked = !!v;
        i.addEventListener('change', () => { koy(obj, f.k, i.checked); degisti(); if (f.yenile) f.yenile(); });
        return el;
      }
      case 'select': {
        const opts = typeof f.opts === 'function' ? f.opts() : f.opts;
        el = P.h(`<label class="fl">${etiket}<select id="${id}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}">${esc(ol)}</option>`).join('')}</select>${ipucu}</label>`);
        const s = P.$('select', el);
        s.value = v == null ? (opts[0] ? opts[0][0] : '') : v;
        if (s.value !== String(v == null ? '' : v) && v != null && v !== '') { s.insertAdjacentHTML('afterbegin', `<option value="${esc(v)}">${esc(v)}</option>`); s.value = v; }
        s.addEventListener('change', () => { koy(obj, f.k, s.value); degisti(); if (f.yenile) f.yenile(); });
        return el;
      }
      case 'multi': {
        const opts = typeof f.opts === 'function' ? f.opts() : f.opts;
        const sec = Array.isArray(v) ? v.slice() : [];
        el = P.h(`<div class="fl full">${etiket}<div class="multi">${opts.map(([ov, ol]) => `<label class="chk"><input type="checkbox" value="${esc(ov)}"${sec.includes(ov) ? ' checked' : ''}><span>${esc(ol)}</span></label>`).join('')}</div>${ipucu}</div>`);
        P.$$('input', el).forEach(i => i.addEventListener('change', () => {
          let cur = Array.isArray(al(obj, f.k)) ? al(obj, f.k).slice() : [];
          if (i.checked && !cur.includes(i.value)) cur.push(i.value);
          if (!i.checked) cur = cur.filter(x => x !== i.value);
          koy(obj, f.k, cur); degisti();
        }));
        return el;
      }
      case 'icon': {
        const adlar = Object.keys(window.YCIcons.raw).filter(n => !['phone', 'mail', 'pin', 'clock', 'arrow', 'plus', 'close', 'menu'].includes(n));
        el = P.h(`<div class="fl full">${etiket}<div class="icons">${adlar.map(n => `<button type="button" class="icn${n === v ? ' on' : ''}" data-i="${n}" title="${n}">${P.icon(n, 'ico')}</button>`).join('')}</div>${ipucu}</div>`);
        P.$$('.icn', el).forEach(b => b.onclick = () => { P.$$('.icn', el).forEach(x => x.classList.toggle('on', x === b)); koy(obj, f.k, b.dataset.i); degisti(); });
        return el;
      }
      case 'image': {
        el = P.h(`<div class="fl full img-field">${etiket}<div class="imgf">
          <div class="imgf-prev"></div>
          <div class="imgf-act">
            <button type="button" class="btn sm gold" data-sec>${P.svg('image')} Görsel seç / yükle</button>
            <button type="button" class="btn sm line" data-kaldir>${P.svg('trash')} Kaldır</button>
            <input class="imgf-yol" type="text" spellcheck="false" placeholder="/yuklemeler/... veya https://..." aria-label="Görsel adresi">
          </div></div>${ipucu}</div>`);
        const prev = P.$('.imgf-prev', el), yol = P.$('.imgf-yol', el);
        const goster = () => {
          const y = al(obj, f.k) || '';
          yol.value = y;
          prev.innerHTML = y ? `<img src="${esc(y)}" alt="">` : `<span class="muted">${esc(f.bos || 'Görsel yok')}</span>`;
          P.$('[data-kaldir]', el).hidden = !y;
        };
        goster();
        P.$('[data-sec]', el).onclick = async () => { const s = await P.gorselSec(f.tur); if (s) { koy(obj, f.k, s); goster(); degisti(); } };
        P.$('[data-kaldir]', el).onclick = () => { koy(obj, f.k, ''); goster(); degisti(); };
        yol.addEventListener('change', () => { koy(obj, f.k, yol.value.trim()); goster(); degisti(); });
        return el;
      }
      case 'markdown': {
        el = P.h(`<div class="fl full">${etiket}</div>`);
        el.appendChild(mdEditor(v, val => { koy(obj, f.k, val); degisti(); }));
        if (ipucu) el.insertAdjacentHTML('beforeend', ipucu);
        return el;
      }
      case 'group': {
        let alt = f.k ? obj[f.k] : obj;
        if (f.k && (alt == null || typeof alt !== 'object')) { alt = obj[f.k] = {}; }
        el = P.h(`<fieldset class="group">${f.l ? `<legend>${esc(f.l)}</legend>` : ''}${f.aciklama ? `<p class="hint">${esc(f.aciklama)}</p>` : ''}<div class="fgrid"></div></fieldset>`);
        P.form(P.$('.fgrid', el), alt, f.fields, degisti);
        return el;
      }
      case 'list': return listeCiz(f, obj, degisti, etiket, ipucu);
      default: {
        el = P.h(`<label class="fl${f.genis ? ' full' : ''}">${etiket}<input id="${id}" type="${f.tip || 'text'}" placeholder="${esc(f.ph || '')}" ${f.oto ? `autocomplete="${f.oto}"` : ''} spellcheck="${f.yazim === false ? 'false' : 'true'}">${f.sayac ? '<small class="count"></small>' : ''}${ipucu}</label>`);
        const i = P.$('input', el);
        i.value = v == null ? '' : v;
        const sayac = P.$('.count', el);
        const say = () => { if (sayac) { const n = i.value.length; sayac.textContent = `${n} karakter${f.sayac > 1 ? ` · önerilen en fazla ${f.sayac}` : ''}`; sayac.classList.toggle('over', f.sayac > 1 && n > f.sayac); } };
        say();
        i.addEventListener('input', () => { koy(obj, f.k, f.donustur ? f.donustur(i.value) : i.value); say(); degisti(); if (f.anlik) f.anlik(i.value, i); });
        if (f.donustur) i.addEventListener('blur', () => { i.value = al(obj, f.k) == null ? '' : al(obj, f.k); });
        return el;
      }
    }
  }

  function listeCiz(f, obj, degisti, etiket, ipucu) {
    if (!Array.isArray(obj[f.k])) obj[f.k] = [];
    const el = P.h(`<div class="fl full listf">${etiket}${ipucu}<div class="items"></div>${f.sabit ? '' : `<button type="button" class="btn line sm add">${P.svg('plus')} ${esc(f.ekle || 'Yeni ekle')}</button>`}</div>`);
    const kap = P.$('.items', el);
    const acik = new Set(f.hepsiAcik ? obj[f.k].map((_, i) => i) : []);
    const ciz = () => {
      const arr = obj[f.k];
      kap.innerHTML = '';
      if (!arr.length) kap.innerHTML = `<p class="muted pad">${esc(f.bos || 'Henüz kayıt yok.')}</p>`;
      arr.forEach((it, i) => {
        const bas = (f.baslik ? f.baslik(it, i) : '') || `${i + 1}. kayıt`;
        const kart = P.h(`<div class="item${acik.has(i) ? ' open' : ''}">
          <div class="item-head">
            <button type="button" class="item-toggle" aria-expanded="${acik.has(i)}"><span class="num">${i + 1}</span><span class="item-t">${esc(bas)}</span>${P.svg('down', 'ico chev')}</button>
            <div class="item-act">
              <button type="button" class="icon-btn" data-yukari title="Yukarı taşı" ${i === 0 ? 'disabled' : ''}>${P.svg('up')}</button>
              <button type="button" class="icon-btn" data-asagi title="Aşağı taşı" ${i === arr.length - 1 ? 'disabled' : ''}>${P.svg('down')}</button>
              ${f.sabit ? '' : `<button type="button" class="icon-btn danger" data-sil title="Sil">${P.svg('trash')}</button>`}
            </div>
          </div>
          <div class="item-body"><div class="fgrid"></div></div>
        </div>`);
        const body = P.$('.fgrid', kart);
        let cizildi = false;
        const govdeCiz = () => { if (cizildi) return; cizildi = true; P.form(body, it, typeof f.fields === 'function' ? f.fields(it) : f.fields, () => { P.$('.item-t', kart).textContent = (f.baslik ? f.baslik(it, i) : '') || `${i + 1}. kayıt`; degisti(); }); };
        if (acik.has(i)) govdeCiz();
        P.$('.item-toggle', kart).onclick = () => {
          const on = !kart.classList.contains('open');
          kart.classList.toggle('open', on);
          P.$('.item-toggle', kart).setAttribute('aria-expanded', on);
          if (on) { acik.add(i); govdeCiz(); } else acik.delete(i);
        };
        const tasi = d => {
          const j = i + d; if (j < 0 || j >= arr.length) return;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          const ai = acik.has(i), aj = acik.has(j);
          acik.delete(i); acik.delete(j); if (ai) acik.add(j); if (aj) acik.add(i);
          degisti(); ciz();
        };
        P.$('[data-yukari]', kart).onclick = () => tasi(-1);
        P.$('[data-asagi]', kart).onclick = () => tasi(1);
        const sil = P.$('[data-sil]', kart);
        if (sil) sil.onclick = async () => {
          if (f.min && arr.length <= f.min) { P.toast(`En az ${f.min} kayıt bulunmalı.`, 'err'); return; }
          if (!(await P.onay(`“${bas}” silinsin mi?`, 'Sil', true))) return;
          arr.splice(i, 1);
          const yeni = new Set(); acik.forEach(x => { if (x < i) yeni.add(x); else if (x > i) yeni.add(x - 1); });
          acik.clear(); yeni.forEach(x => acik.add(x));
          degisti(); ciz();
        };
        kap.appendChild(kart);
      });
    };
    ciz();
    const add = P.$('.add', el);
    if (add) add.onclick = () => {
      const yeni = f.yeni ? f.yeni() : {};
      obj[f.k].push(yeni);
      acik.add(obj[f.k].length - 1);
      degisti(); ciz();
      const son = kap.lastElementChild;
      if (son) { son.scrollIntoView({ behavior: 'smooth', block: 'center' }); const i = P.$('input, textarea', son); if (i) setTimeout(() => i.focus(), 250); }
    };
    return el;
  }

  // Alanları bir kapsayıcıya çizer
  P.form = function (kap, obj, alanlar, degisti) {
    const d = () => { if (degisti) degisti(); P.durumCubugu(); };
    for (const f of alanlar) { if (!f) continue; kap.appendChild(alanCiz(f, obj, d)); }
    return kap;
  };

  // Standart düzenleme sayfası: başlık, açıklama, form ve kaydet çubuğu
  P.duzenleyici = function (kap, opt) {
    P._aktifBelge = opt.belge;
    const sayfa = P.h(`<div class="editor">
      <div class="ed-head"><div><h2>${esc(opt.baslik)}</h2>${opt.aciklama ? `<p class="muted">${opt.aciklama}</p>` : ''}</div>
        <div class="ed-actions">${opt.onizle ? `<button type="button" class="btn line" data-onizle>${P.svg('eye')} Önizle</button>` : ''}</div></div>
      <div class="fgrid ed-form"></div>
      <div class="savebar"><span class="sb-info muted">Değişiklikler, “Kaydet ve yayınla” ile sitede hemen görünür.</span><button type="button" class="btn line" data-geri hidden>Değişiklikleri geri al</button><button type="button" class="btn gold" data-kaydet>${P.svg('save')} Kaydet ve yayınla</button></div>
    </div>`);
    kap.appendChild(sayfa);
    const geri = P.$('[data-geri]', sayfa);
    const guncelle = () => { const k = P.kirliMi(opt.belge); geri.hidden = !k; sayfa.classList.toggle('dirty', k); };
    P.form(P.$('.ed-form', sayfa), opt.nesne(), opt.alanlar, () => { guncelle(); if (opt.degisti) opt.degisti(); });
    P.$('[data-kaydet]', sayfa).onclick = async e => {
      if (opt.dogrula) { const h = opt.dogrula(); if (h) { P.toast(h, 'err'); return; } }
      if (opt.hazirla) opt.hazirla();
      await P.kaydet(opt.belge, e.currentTarget);
      guncelle();
    };
    geri.onclick = async () => {
      if (!(await P.onay('Kaydedilmemiş değişiklikler geri alınsın mı?', 'Geri al'))) return;
      P.S.veri[opt.belge] = JSON.parse(P.S.kaydedilmis[opt.belge]);
      P.git(P._sonHash, true);
    };
    if (opt.onizle) P.$('[data-onizle]', sayfa).onclick = () => P.onizle(typeof opt.onizle === 'function' ? opt.onizle() : opt.onizle);
    guncelle();
    return sayfa;
  };
})();
