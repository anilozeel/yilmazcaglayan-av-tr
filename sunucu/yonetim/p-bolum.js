/* Yönetim paneli — bölümler */
(function () {
  'use strict';
  const P = window.YP, S = P.S, B = P.BOLUM, esc = P.esc;
  const R = window.YCRender;

  const alanSecenek = (bosEtiket) => {
    const l = (S.veri.alanlar || []).map(a => [a.slug || P.slug(a.title), a.title]);
    return bosEtiket ? [['', bosEtiket], ...l] : l;
  };
  const alanAdi = s => ((S.veri.alanlar || []).find(a => (a.slug || P.slug(a.title)) === s) || {}).title || '';
  const kisa = t => String(t || '').replace(/ Avukatlığı$/, '');

  /* ================= GENEL BAKIŞ ================= */
  B.genel = async function (kap) {
    const m = S.veri.makaleler || [];
    const yayinda = m.filter(x => x.yayinda !== false).length;
    const son = m.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    kap.innerHTML = `<div class="welcome card">
        <div><h2>Hoş geldiniz${S.kullanici ? ', ' + esc(S.kullanici) : ''}.</h2><p class="muted">Sitedeki tüm metinleri, slaytları, makaleleri ve görselleri buradan düzenleyebilirsiniz. Kaydettiğiniz anda site güncellenir.</p></div>
        <div class="quick">
          <a class="btn gold" href="#makaleler/yeni">${P.svg('plus')} Yeni makale</a>
          <a class="btn line" href="#anasayfa">${P.svg('slides')} Slaytlar</a>
          <a class="btn line" href="#site">${P.svg('phone')} İletişim bilgileri</a>
          <a class="btn line" href="/" target="_blank" rel="noopener">${P.svg('ext')} Siteyi görüntüle</a>
        </div>
      </div>
      <div class="kpis" id="kpi">${['Şu an sitede', 'Bugün ziyaretçi', 'Son 7 gün ziyaretçi', 'Son 7 gün görüntüleme'].map(l => `<div class="kpi card"><small>${l}</small><b>—</b></div>`).join('')}</div>
      <div class="cols">
        <section class="card">
          <div class="card-h"><h3>Son makaleler</h3><a href="#makaleler" class="lnk">Tümü</a></div>
          <ul class="mini-list">${son.map(a => `<li><a href="#makaleler/${esc(a.id)}"><b>${esc(a.title)}</b><small>${esc(kisa(alanAdi(a.area)))} · ${P.tarih(a.date)}${a.yayinda === false ? ' · <em>Taslak</em>' : ''}</small></a></li>`).join('') || '<li class="muted">Henüz makale yok.</li>'}</ul>
        </section>
        <section class="card">
          <div class="card-h"><h3>Site içeriği</h3></div>
          <ul class="facts">
            <li><span>Makaleler</span><b>${yayinda} yayında${m.length - yayinda ? ` · ${m.length - yayinda} taslak` : ''}</b></li>
            <li><span>Çalışma alanları</span><b>${(S.veri.alanlar || []).length}</b></li>
            <li><span>Yayımlanmış eserler</span><b>${(S.veri.eserler || []).length}</b></li>
            <li><span>Slaytlar</span><b>${((S.veri.anasayfa || {}).slaytlar || []).length} · ${(S.veri.anasayfa || {}).slaytSuresi || 2} sn arayla</b></li>
            <li><span>Görsel küçültme</span><b>${S.ortam.gd ? 'Açık' : 'Kapalı (görseller olduğu gibi yüklenir)'}</b></li>
            <li><span>Ziyaretçi konum verisi</span><b>${S.ortam.konum ? 'Etkin' : 'Hazırlanıyor'}</b></li>
          </ul>
          <button class="btn line sm" data-yeniden>${P.svg('refresh')} Siteyi yeniden oluştur</button>
        </section>
      </div>`;
    P.$('[data-yeniden]', kap).onclick = async e => {
      const b = e.currentTarget;
      P.mesgul(b, true, 'Oluşturuluyor…');
      try { const j = await P.yayinla(); P.toast(`Site yeniden oluşturuldu (${j.yazilan} sayfa).`); } catch (ex) { P.toast(ex.message, 'err'); }
      P.mesgul(b, false);
    };
    try {
      const j = await P.api('istatistik', undefined, { q: { gun: 7 } });
      const v = [j.toplam.simdi, j.toplam.bugunZiyaretci, j.toplam.ziyaretci, j.toplam.goruntuleme];
      P.$$('#kpi .kpi b', kap).forEach((b, i) => { b.textContent = P.sayi(v[i]); });
    } catch (e) { /* istatistik yoksa boş kalır */ }
  };

  /* ================= MAKALELER ================= */
  B.makaleler = function (kap, arg) {
    if (arg && arg[0]) return makaleDuzenle(kap, arg[0]);
    const liste = S.veri.makaleler;
    kap.innerHTML = `<div class="ed-head"><div><h2>Makaleler</h2><p class="muted">Makale ekleyin, düzenleyin veya silin. Her makale ilgili çalışma alanı sayfasına ve diğer makalelere otomatik bağlanır.</p></div>
      <div class="ed-actions"><a class="btn gold" href="#makaleler/yeni">${P.svg('plus')} Yeni makale</a></div></div>
      <div class="filters card"><label class="search">${P.svg('search')}<input type="search" placeholder="Makalelerde ara…" data-ara></label>
        <select data-alan><option value="">Tüm alanlar</option>${alanSecenek().map(([v, l]) => `<option value="${esc(v)}">${esc(kisa(l))}</option>`).join('')}</select></div>
      <div class="table card"><table><thead><tr><th>Başlık</th><th class="hide-sm">Alan</th><th class="hide-sm">Tarih</th><th>Durum</th><th></th></tr></thead><tbody></tbody></table></div>`;
    const tb = P.$('tbody', kap);
    const ciz = () => {
      const q = P.$('[data-ara]', kap).value.trim().toLocaleLowerCase('tr-TR');
      const al = P.$('[data-alan]', kap).value;
      const rows = liste.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .filter(a => (!al || a.area === al || (a.related || []).includes(al)) && (!q || (a.title + ' ' + (a.description || '') + ' ' + (a.body || '')).toLocaleLowerCase('tr-TR').includes(q)));
      tb.innerHTML = rows.map(a => `<tr>
        <td><a class="row-t" href="#makaleler/${esc(a.id)}">${esc(a.title || '(başlıksız)')}</a><small class="show-sm muted">${esc(kisa(alanAdi(a.area)))} · ${P.tarih(a.date)}</small></td>
        <td class="hide-sm"><span class="chip">${esc(kisa(alanAdi(a.area)) || '—')}</span></td>
        <td class="hide-sm nowrap">${P.tarih(a.date)}</td>
        <td>${a.yayinda === false ? '<span class="pill">Taslak</span>' : '<span class="pill ok">Yayında</span>'}</td>
        <td class="nowrap right"><a class="btn sm line" href="#makaleler/${esc(a.id)}">Düzenle</a>${a.yayinda === false ? '' : ` <a class="icon-btn" href="/makaleler/${esc(P.slug(a.slug || a.title))}/" target="_blank" rel="noopener" title="Sitede görüntüle">${P.svg('ext')}</a>`}</td>
      </tr>`).join('') || `<tr><td colspan="5" class="muted pad">Sonuç bulunamadı.</td></tr>`;
    };
    P.$('[data-ara]', kap).oninput = ciz;
    P.$('[data-alan]', kap).onchange = ciz;
    ciz();
  };

  function makaleDuzenle(kap, id) {
    const liste = S.veri.makaleler;
    let a;
    if (id === 'yeni') {
      a = { id: 'm' + Date.now().toString(36), slug: '', title: '', date: P.bugun(), area: alanSecenek()[0] ? alanSecenek()[0][0] : '', related: [], description: '', image: '', yayinda: true, body: '' };
      liste.unshift(a);
      history.replaceState(null, '', '#makaleler/' + a.id);
      P._sonHash = 'makaleler/' + a.id;
    } else a = liste.find(x => x.id === id);
    if (!a) { kap.innerHTML = `<div class="banner err">${P.svg('warn')}<span>Makale bulunamadı.</span><a class="btn sm line" href="#makaleler">Listeye dön</a></div>`; return; }
    const yeniMi = !S.kaydedilmis.makaleler.includes(`"id":"${a.id}"`);
    // Yayımlanmış makalenin adresi başlık değişince kendiliğinden değişmez (eski bağlantılar bozulmasın)
    let slugElle = !yeniMi || (!!a.slug && a.slug !== P.slug(a.title));
    P._aktifBelge = 'makaleler';
    const sayfa = P.h(`<div class="editor">
      <div class="ed-head"><div><a class="lnk back" href="#makaleler">${P.svg('back')} Makaleler</a><h2>${yeniMi ? 'Yeni makale' : 'Makaleyi düzenle'}</h2><p class="muted url-line"></p></div>
        <div class="ed-actions"><button type="button" class="btn line" data-onizle>${P.svg('eye')} Önizle</button>${yeniMi ? '' : `<button type="button" class="btn line danger" data-sil>${P.svg('trash')} Sil</button>`}</div></div>
      <div class="art-grid"><div class="fgrid art-main"></div><aside class="fgrid art-side card"></aside></div>
      <div class="savebar"><span class="sb-info muted">“Kaydet ve yayınla” ile makale sitede hemen görünür.</span><button type="button" class="btn gold" data-kaydet>${P.svg('save')} Kaydet ve yayınla</button></div>
    </div>`);
    kap.appendChild(sayfa);
    const urlGoster = () => { const s = P.slug(a.slug || a.title) || 'makale-adresi'; P.$('.url-line', sayfa).innerHTML = `Adres: <code>/makaleler/${esc(s)}/</code>`; };
    const degisti = () => { urlGoster(); P.durumCubugu(); };
    P.form(P.$('.art-main', sayfa), a, [
      { k: 'title', l: 'Başlık', zorunlu: true, genis: true, sayac: 90, anlik: v => { if (!slugElle) { a.slug = P.slug(v); const si = P.$('[data-slug] input', sayfa); if (si) si.value = a.slug; } } },
      { k: 'description', l: 'Kısa açıklama (Google’da görünen metin)', t: 'textarea', rows: 3, sayac: 160, h: 'Boş bırakılırsa makalenin ilk cümlelerinden otomatik oluşturulur.' },
      { k: 'body', l: 'Makale metni', t: 'markdown' }
    ], degisti);
    P.form(P.$('.art-side', sayfa), a, [
      { k: 'yayinda', l: 'Sitede yayında', t: 'check', h: 'İşareti kaldırırsanız makale taslak olarak saklanır ve sitede görünmez.' },
      { k: 'date', l: 'Yayın tarihi', tip: 'date' },
      { k: 'area', l: 'Çalışma alanı', t: 'select', opts: () => alanSecenek() },
      { k: 'related', l: 'İlgili diğer alanlar', t: 'multi', opts: () => alanSecenek(), h: 'Makale bu alanların sayfalarında da listelenir.' },
      { k: 'image', l: 'Kapak görseli (isteğe bağlı)', t: 'image', tur: 'makale', bos: 'Kapak görseli yok' },
      { k: 'slug', l: 'Sayfa adresi', yazim: false, h: 'Başlıktan otomatik oluşur. Yayımlandıktan sonra değiştirirseniz eski bağlantı çalışmaz.', anlik: () => { slugElle = true; } }
    ], degisti);
    const slugInput = P.$$('.art-side .fl', sayfa).pop();
    if (slugInput) slugInput.setAttribute('data-slug', '');
    urlGoster();
    const hazirla = () => {
      a.title = (a.title || '').trim();
      a.slug = P.slug(a.slug || a.title);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) a.date = P.bugun();
    };
    P.$('[data-kaydet]', sayfa).onclick = async e => {
      hazirla();
      if (!a.title) { P.toast('Makale başlığı boş olamaz.', 'err'); return; }
      if (!a.slug) { P.toast('Sayfa adresi oluşturulamadı; başlığı kontrol edin.', 'err'); return; }
      const cakisma = liste.find(x => x !== a && P.slug(x.slug || x.title) === a.slug);
      if (cakisma) { P.toast(`Bu adres başka bir makalede kullanılıyor: “${cakisma.title}”. Sayfa adresini değiştirin.`, 'err'); return; }
      if (!(a.body || '').trim()) { P.toast('Makale metni boş olamaz.', 'err'); return; }
      const ok = await P.kaydet('makaleler', e.currentTarget);
      if (ok && yeniMi) { P.git('makaleler/' + a.id, true); }
    };
    P.$('[data-onizle]', sayfa).onclick = () => {
      hazirla();
      if (!a.title) { P.toast('Önizleme için başlık girin.', 'err'); return; }
      const v = Object.assign({}, S.veri, { makaleler: S.veri.makaleler.map(x => x === a ? Object.assign({}, x, { yayinda: true }) : x) });
      const rel = Object.keys(P.siteDosyalari(v)).find(k => k === `makaleler/${a.slug}/index.html`) || `makaleler/${a.slug}/index.html`;
      P.onizle(rel, v);
    };
    const silBtn = P.$('[data-sil]', sayfa);
    if (silBtn) silBtn.onclick = async e => {
      if (!(await P.onay(`“${a.title}” makalesi kalıcı olarak silinsin mi? Bu işlem siteden de kaldırır.`, 'Makaleyi sil', true))) return;
      const i = liste.indexOf(a);
      if (i >= 0) liste.splice(i, 1);
      const ok = await P.kaydet('makaleler', e.currentTarget);
      if (ok) { P._aktifBelge = null; location.hash = 'makaleler'; }
    };
  }

  /* ================= ANA SAYFA ================= */
  B.anasayfa = function (kap) {
    const H = S.veri.anasayfa;
    P.duzenleyici(kap, {
      belge: 'anasayfa', baslik: 'Ana Sayfa & Slaytlar', aciklama: 'Üst kısımdaki slaytlar ve ana sayfadaki bölüm metinleri.', onizle: 'index.html', nesne: () => H,
      alanlar: [
        { t: 'group', l: 'Slayt ayarları', fields: [
          { k: 'slaytSuresi', l: 'Slayt geçiş süresi (saniye)', t: 'number', min: 1, max: 30, step: 0.5, h: 'Her slaytın ekranda kalma süresi. Ziyaretçi fareyle metnin üzerine gelince slayt durur.' },
          { k: 'buton1', l: '1. düğme yazısı (telefonla arar)' },
          { k: 'buton2', l: '2. düğme yazısı (Çalışma Alanları’na gider)' }
        ] },
        { k: 'slaytlar', l: 'Slaytlar', t: 'list', ekle: 'Yeni slayt ekle', min: 1, hepsiAcik: false,
          baslik: s => [s.ustKalin, s.baslik || s.baslikVurgu].filter(Boolean).join(' — ').slice(0, 90) || 'Slayt',
          h: 'Sıralamayı oklarla değiştirebilirsiniz. İlk slayttaki üst yazı, sayfanın ana başlığıdır (SEO).',
          yeni: () => ({ stil: 'baslik', ton: 'koyu', gorsel: '', gorselMobil: '', gorselAlt: '', ustKalin: '', ust: '', baslik: 'Yeni slayt başlığı', baslikVurgu: '', butonlar: true }),
          fields: [
            { k: 'stil', l: 'Yerleşim', t: 'select', opts: [['baslik', 'Büyük başlık (ortada)'], ['motto', 'Alt kısımda metin (misyon tarzı)']] },
            { k: 'ton', l: 'Görsel efekti', t: 'select', opts: [['koyu', 'Koyu fon (Themis görseli gibi)'], ['portre', 'Portre (sol taraf karartmalı)']] },
            { k: 'gorsel', l: 'Arka plan görseli', t: 'image', tur: 'slayt', h: 'Yatay ve en az 1600 piksel genişliğinde bir görsel önerilir.' },
            { k: 'gorselMobil', l: 'Telefon için görsel (isteğe bağlı)', t: 'image', tur: 'slayt', bos: 'Boş — telefonda da üstteki görsel kullanılır' },
            { k: 'gorselAlt', l: 'Görsel açıklaması (erişilebilirlik)' },
            { k: 'ustKalin', l: 'Üst yazı — kalın kısım', ph: 'Av. Yılmaz Çağlayan' },
            { k: 'ust', l: 'Üst yazı — devamı', ph: 'Milas Avukat & Hukuk Bürosu' },
            { k: 'baslik', l: 'Başlık (motto yerleşiminde altın renkli giriş)', t: 'textarea', rows: 2 },
            { k: 'baslikVurgu', l: 'Başlığın devamı (büyük başlıkta altın renkli satır)', t: 'textarea', rows: 3 },
            { k: 'butonlar', l: 'Düğmeleri göster (Randevu Al / Çalışma Alanları)', t: 'check' }
          ] },
        { t: 'group', k: 'alanlar', l: 'Çalışma alanları bölümü', fields: [
          { k: 'ust', l: 'Küçük üst başlık (boş bırakılabilir)' },
          { k: 'baslik', l: 'Başlık' },
          { k: 'metin', l: 'Açıklama', t: 'textarea', rows: 3 },
          { k: 'secili', l: 'Ana sayfada gösterilecek alanlar (en fazla 8 önerilir)', t: 'multi', opts: () => alanSecenek(), h: 'Seçilmeyenler “+N alan daha” kartında listelenir.' },
          { k: 'not', l: 'Alt not', t: 'textarea', rows: 2 }
        ] },
        { t: 'group', k: 'hakkinda', l: 'Özgeçmiş özeti bölümü', fields: [
          { k: 'ust', l: 'Küçük üst başlık' },
          { k: 'baslik', l: 'Başlık' },
          { k: 'metin', l: 'Metin', t: 'textarea', rows: 4 },
          { k: 'gorsel', l: 'Fotoğraf', t: 'image', tur: 'portre' },
          { k: 'sayilar', l: 'Öne çıkan bilgiler', t: 'list', ekle: 'Bilgi ekle', baslik: x => [x.deger, x.aciklama].filter(Boolean).join(' · '), yeni: () => ({ deger: '', aciklama: '' }), fields: [{ k: 'deger', l: 'Değer (ör. 1996)' }, { k: 'aciklama', l: 'Açıklama' }] },
          { k: 'link', l: 'Bağlantı yazısı' }
        ] },
        { t: 'group', k: 'eserler', l: 'Yayımlanmış eserler bölümü', fields: [{ k: 'ust', l: 'Küçük üst başlık' }, { k: 'baslik', l: 'Başlık' }, { k: 'metin', l: 'Açıklama', t: 'textarea', rows: 2 }] },
        { t: 'group', k: 'makaleler', l: 'Makaleler bölümü', fields: [{ k: 'ust', l: 'Küçük üst başlık' }, { k: 'baslik', l: 'Başlık' }, { k: 'metin', l: 'Açıklama', t: 'textarea', rows: 2 }, { k: 'adet', l: 'Gösterilecek makale sayısı', t: 'number', min: 0, max: 9 }, { k: 'buton', l: 'Düğme yazısı' }] }
      ],
      dogrula: () => { const n = Number(H.slaytSuresi); if (!(n >= 1 && n <= 30)) return 'Slayt süresi 1 ile 30 saniye arasında olmalı.'; return ''; }
    });
  };

  /* ================= ÇALIŞMA ALANLARI ================= */
  B.alanlar = function (kap) {
    const sar = { x: S.veri.alanlar };
    P.duzenleyici(kap, {
      belge: 'alanlar', baslik: 'Çalışma Alanları', aciklama: 'Her alanın kendi sayfası, menüdeki ve alt bilgideki adı burada düzenlenir. Sıralama sitedeki sıralamadır.', onizle: 'calisma-alanlari/index.html', nesne: () => sar,
      alanlar: [{ k: 'x', t: 'list', ekle: 'Yeni çalışma alanı ekle', min: 1, baslik: a => a.title,
        yeni: () => ({ slug: '', title: 'Yeni Çalışma Alanı', footerLabel: '', icon: 'scales', short: '', text: '', detay: '', seoTitle: '', seoDesc: '' }),
        fields: [
          { k: 'title', l: 'Alan adı', zorunlu: true, genis: true },
          { k: 'footerLabel', l: 'Sayfa altında görünen ad', h: 'Boşsa alan adı kullanılır.' },
          { k: 'slug', l: 'Sayfa adresi', yazim: false, h: 'Boşsa addan oluşturulur. Değiştirirseniz eski bağlantı çalışmaz.' },
          { k: 'icon', l: 'Simge', t: 'icon' },
          { k: 'short', l: 'Kısa açıklama (kartlarda görünür)', t: 'textarea', rows: 2, sayac: 140 },
          { k: 'text', l: 'Ayrıntılı açıklama', t: 'textarea', rows: 6, h: 'Paragraf ayırmak için bir satır boşluk bırakın.' },
          { k: 'detay', l: 'Ek paragraf (isteğe bağlı)', t: 'textarea', rows: 3 },
          { k: 'seoTitle', l: 'Google başlığı', sayac: 60 },
          { k: 'seoDesc', l: 'Google açıklaması', t: 'textarea', rows: 2, sayac: 160 }
        ] }],
      hazirla: () => {
        const goruldu = new Set();
        S.veri.alanlar.forEach(a => {
          a.title = (a.title || '').trim();
          let s = P.slug(a.slug || a.title) || 'alan';
          while (goruldu.has(s)) s += '-2';
          goruldu.add(s); a.slug = s;
        });
      },
      dogrula: () => S.veri.alanlar.some(a => !(a.title || '').trim()) ? 'Tüm alanların adı dolu olmalı.' : ''
    });
  };

  /* ================= ESERLER ================= */
  B.eserler = function (kap) {
    const sar = { x: S.veri.eserler };
    P.duzenleyici(kap, {
      belge: 'eserler', baslik: 'Yayımlanmış Eserler', aciklama: 'Kitaplar ve kapak görselleri. Kapak görseli yüklenmezse sitede yazılı bir kapak gösterilir.', onizle: 'yayimlanmis-eserler/index.html', nesne: () => sar,
      alanlar: [{ k: 'x', t: 'list', ekle: 'Yeni eser ekle', baslik: b => b.title,
        yeni: () => ({ slug: '', title: 'Yeni eser', coverTitle: '', nitelik: '', kapsam: '', kapak: '' }),
        fields: [
          { k: 'title', l: 'Eser adı', zorunlu: true, genis: true },
          { k: 'kapak', l: 'Kapak görseli', t: 'image', tur: 'kapak', h: 'Dikey (2:3 oranında) kapak görseli önerilir.' },
          { k: 'coverTitle', l: 'Yazılı kapakta görünecek kısa ad', h: 'Yalnızca kapak görseli yoksa kullanılır.' },
          { k: 'nitelik', l: 'Niteliği', t: 'textarea', rows: 3 },
          { k: 'kapsam', l: 'Kapsam', t: 'textarea', rows: 3 },
          { k: 'slug', l: 'Bağlantı kimliği', yazim: false, h: 'Boşsa addan oluşturulur.' }
        ] }],
      hazirla: () => { const g = new Set(); S.veri.eserler.forEach(b => { let s = P.slug(b.slug || b.title) || 'eser'; while (g.has(s)) s += '-2'; g.add(s); b.slug = s; }); },
      dogrula: () => S.veri.eserler.some(b => !(b.title || '').trim()) ? 'Tüm eserlerin adı dolu olmalı.' : ''
    });
  };

  /* ================= ÖZGEÇMİŞ ================= */
  B.ozgecmis = function (kap) {
    P.duzenleyici(kap, {
      belge: 'ozgecmis', baslik: 'Özgeçmiş', aciklama: 'Özgeçmiş sayfası. (Not: Cumhuriyet Savcılığı geçmişi yalnızca bu sayfada yer alabilir; tanıtım metinlerinde unvan olarak kullanılmamalıdır.)', onizle: 'hakkimda/index.html', nesne: () => S.veri.ozgecmis,
      alanlar: [
        { k: 'baslik', l: 'Sayfa başlığı', genis: true },
        { k: 'ust', l: 'Küçük üst etiket' },
        { k: 'icerikBaslik', l: 'Metin başlığı' },
        { k: 'giris', l: 'Başlık altı kısa metin', t: 'textarea', rows: 2 },
        { k: 'foto', l: 'Fotoğraf', t: 'image', tur: 'portre' },
        { k: 'metin', l: 'Özgeçmiş metni', t: 'textarea', rows: 16, h: 'Paragraf ayırmak için bir satır boşluk bırakın.' },
        { k: 'zaman', l: 'Zaman çizelgesi', t: 'list', ekle: 'Satır ekle', baslik: x => [x.yil, x.metin].filter(Boolean).join(' · '), yeni: () => ({ yil: '', metin: '' }), fields: [{ k: 'yil', l: 'Yıl' }, { k: 'metin', l: 'Açıklama', genis: true }] },
        { k: 'eserBaslik', l: 'Eserler listesi başlığı' },
        { k: 'seoTitle', l: 'Google başlığı', sayac: 60 },
        { k: 'seoDesc', l: 'Google açıklaması', t: 'textarea', rows: 2, sayac: 160 }
      ],
      hazirla: () => { const f = S.veri.ozgecmis; if (f.foto && !/yilmaz-caglayan-ozgecmis\.jpg$/.test(f.foto)) { delete f.fotoGenislik; delete f.fotoYukseklik; } }
    });
  };

  /* ================= SSS ================= */
  B.sss = function (kap) {
    P.duzenleyici(kap, {
      belge: 'sss', baslik: 'Sıkça Sorulan Sorular', aciklama: 'Bir çalışma alanına bağlanan sorular o alanın sayfasında da gösterilir ve Google için yapılandırılmış veri olarak eklenir.', onizle: 'sikca-sorulan-sorular/index.html', nesne: () => S.veri.sss,
      alanlar: [
        { k: 'gruplar', l: 'Konu grupları', t: 'list', ekle: 'Yeni konu ekle', baslik: g => `${g.group || 'Konu'} (${(g.items || []).length} soru)`,
          yeni: () => ({ group: 'Yeni konu', area: '', items: [{ q: '', a: '' }] }),
          fields: [
            { k: 'group', l: 'Konu başlığı', genis: true },
            { k: 'area', l: 'Bağlı çalışma alanı', t: 'select', opts: () => alanSecenek('— Bağlı değil —') },
            { k: 'items', l: 'Sorular', t: 'list', ekle: 'Soru ekle', baslik: x => x.q, yeni: () => ({ q: '', a: '' }), fields: [{ k: 'q', l: 'Soru', genis: true }, { k: 'a', l: 'Cevap', t: 'textarea', rows: 3 }] }
          ] },
        { k: 'uyariBaslik', l: 'Uyarı kutusu başlığı' },
        { k: 'uyari', l: 'Uyarı metni', t: 'textarea', rows: 4 }
      ]
    });
  };

  /* ================= SAYFA METİNLERİ ================= */
  B.metinler = function (kap) {
    const T = S.veri.metinler;
    const sayfa = (k, l, ek) => ({ t: 'group', k, l, fields: [
      { k: 'baslik', l: 'Sayfa başlığı' }, { k: 'giris', l: 'Başlık altı metin', t: 'textarea', rows: 3 }, ...(ek || []),
      { k: 'seoTitle', l: 'Google başlığı', sayac: 60 }, { k: 'seoDesc', l: 'Google açıklaması', t: 'textarea', rows: 2, sayac: 160 }
    ] });
    P.duzenleyici(kap, {
      belge: 'metinler', baslik: 'Sayfa Metinleri', aciklama: 'Menü adları, sayfa başlıkları, sayfa altı ve iletişim bandı metinleri.', onizle: 'index.html', nesne: () => T,
      alanlar: [
        { k: 'menu', l: 'Menü', t: 'list', sabit: true, baslik: m => `${m.label}  (${m.href})`, fields: [{ k: 'label', l: 'Menüde görünen ad' }, { k: 'uzun', l: 'Sayfa altında görünen ad' }] },
        { k: 'aramaButonu', l: '“Hemen Ara” düğmesi yazısı' },
        { t: 'group', k: 'iletisimBandi', l: 'Sayfaların altındaki iletişim bandı', fields: [{ k: 'ust', l: 'Küçük üst başlık' }, { k: 'baslik', l: 'Başlık' }, { k: 'metin', l: 'Metin', t: 'textarea', rows: 2 }] },
        { t: 'group', k: 'altBilgi', l: 'Sayfa altı (footer)', fields: [{ k: 'metin', l: 'Logo altındaki metin', t: 'textarea', rows: 3 }, { k: 'uyari', l: 'En alttaki uyarı', t: 'textarea', rows: 2 }] },
        sayfa('alanlarSayfa', 'Çalışma Alanları sayfası', [{ k: 'not', l: 'Alt not', t: 'textarea', rows: 2 }, { k: 'randevuBaslik', l: 'Alan sayfalarındaki randevu kutusu başlığı' }]),
        sayfa('eserlerSayfa', 'Yayımlanmış Eserler sayfası'),
        sayfa('makalelerSayfa', 'Makaleler sayfası', [{ k: 'uyari', l: 'Makale altındaki uyarı', t: 'textarea', rows: 3 }, { k: 'yanBaslik', l: 'Yan kutu başlığı' }, { k: 'yanMetin', l: 'Yan kutu metni', t: 'textarea', rows: 2 }, { k: 'digerBaslik', l: '“Diğer yazılar” başlığı' }]),
        sayfa('sssSayfa', 'Sıkça Sorulan Sorular sayfası'),
        sayfa('iletisimSayfa', 'İletişim sayfası')
      ]
    });
  };

  /* ================= SİTE AYARLARI ================= */
  function konumAyikla(t) {
    t = String(t || '').trim();
    const kal = [/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/, /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, /[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i, /^(-?\d{1,2}\.\d+)\s*[, ]\s*(-?\d{1,3}\.\d+)$/];
    for (const r of kal) { const m = t.match(r); if (m) return { lat: Number(m[1]), lng: Number(m[2]) }; }
    return null;
  }
  B.site = function (kap) {
    const s = S.veri.site;
    const ed = P.duzenleyici(kap, {
      belge: 'site', baslik: 'İletişim & Site Ayarları', aciklama: 'Telefon, adres ve harita konumu tüm sayfalarda, Google için yapılandırılmış veride ve yol tarifinde otomatik güncellenir.', onizle: 'iletisim/index.html', nesne: () => s,
      alanlar: [
        { t: 'group', l: 'İletişim bilgileri', fields: [
          { k: 'phone', l: 'Telefon', tip: 'tel', ph: '+90 5xx xxx xx xx' }, { k: 'email', l: 'E-posta', tip: 'email', yazim: false },
          { k: 'street', l: 'Adres (mahalle, cadde, no)', genis: true }, { k: 'district', l: 'İlçe' }, { k: 'city', l: 'İl' },
          { k: 'hours', l: 'Çalışma saatleri', ph: 'Hafta İçi: 09:00 – 18:00' }, { k: 'hoursNote', l: 'Çalışma saatleri notu' }
        ] },
        { t: 'group', l: 'Harita konumu', aciklama: 'İletişim sayfasındaki harita ve “Yol Tarifi Al” düğmesi bu konumu kullanır.', fields: [
          { t: 'html', html: '<label class="fl full"><span class="fl-l">Google Haritalar bağlantısı yapıştırın (koordinatlar otomatik alınır)</span><div class="row"><input type="text" data-harita placeholder="https://www.google.com/maps/place/...@37.23,27.59,17z" spellcheck="false"><button type="button" class="btn line" data-harita-al>Konumu al</button></div><small class="hint">Google Haritalar’da büroyu bulun, adres çubuğundaki bağlantıyı kopyalayıp buraya yapıştırın.</small></label>' },
          { k: 'lat', l: 'Enlem', t: 'number', step: 'any' }, { k: 'lng', l: 'Boylam', t: 'number', step: 'any' },
          { t: 'html', html: '<div class="map-prev" data-harita-onizle></div>' }
        ] },
        { t: 'group', l: 'Site kimliği ve Google görünümü', fields: [
          { k: 'siteTitle', l: 'Site başlığı (ana sayfa başlığı)', genis: true, sayac: 60 },
          { k: 'slogan', l: 'Alt mesaj (slogan)', genis: true },
          { k: 'tagline', l: 'Logo altındaki yazı' },
          { k: 'homeDescription', l: 'Ana sayfa Google açıklaması', t: 'textarea', rows: 2, sayac: 160 },
          { k: 'areaServed', l: 'Hizmet verilen yerler (virgülle)', ph: 'Milas, Bodrum, Muğla' },
          { k: 'url', l: 'Site adresi', tip: 'url', yazim: false, h: 'SSL kurulduktan sonra https:// ile başlamalıdır.' }
        ] },
        { t: 'group', l: 'Google araçları (isteğe bağlı)', fields: [
          { k: 'gaId', l: 'Google Analytics ölçüm kimliği', ph: 'G-XXXXXXXXXX', yazim: false },
          { k: 'gscVerification', l: 'Search Console doğrulama kodu', ph: 'content="..." değeri', yazim: false }
        ] }
      ],
      dogrula: () => {
        if (s.lat !== '' && s.lat != null && (Math.abs(Number(s.lat)) > 90 || !isFinite(Number(s.lat)))) return 'Enlem geçersiz.';
        if (s.lng !== '' && s.lng != null && (Math.abs(Number(s.lng)) > 180 || !isFinite(Number(s.lng)))) return 'Boylam geçersiz.';
        if (s.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) return 'E-posta adresi geçersiz.';
        return '';
      }
    });
    const harita = () => {
      const el = P.$('[data-harita-onizle]', ed);
      const lat = Number(s.lat), lng = Number(s.lng);
      el.innerHTML = isFinite(lat) && isFinite(lng) && (lat || lng) ? `<iframe title="Konum önizleme" loading="lazy" src="https://www.google.com/maps?q=${lat},${lng}&z=16&hl=tr&output=embed"></iframe>` : '<p class="muted">Konum girilmedi.</p>';
    };
    harita();
    P.$$('input[type=number]', ed).forEach(i => i.addEventListener('change', harita));
    P.$('[data-harita-al]', ed).onclick = () => {
      const k = konumAyikla(P.$('[data-harita]', ed).value);
      if (!k) { P.toast('Bağlantıdan koordinat bulunamadı. Haritada konuma sağ tıklayıp koordinatları da yapıştırabilirsiniz (ör. 37.2372, 27.5970).', 'err'); return; }
      s.lat = k.lat; s.lng = k.lng;
      const nums = P.$$('input[type=number]', ed);
      if (nums[0]) nums[0].value = k.lat; if (nums[1]) nums[1].value = k.lng;
      harita(); P.durumCubugu();
      P.$('[data-geri]', ed).hidden = false;
      P.toast('Konum alındı. Kaydetmeyi unutmayın.');
    };
  };

  /* ================= ZİYARETÇİLER ================= */
  let bolgeAdi;
  try { bolgeAdi = new Intl.DisplayNames(['tr'], { type: 'region' }); } catch (e) { bolgeAdi = null; }
  const ulke = c => (!c ? 'Bilinmiyor' : (bolgeAdi ? (bolgeAdi.of(c) || c) : c));
  const KAYNAK = [[/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/(^|\.)yandex\./, 'Yandex'], [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'], [/(^|\.)facebook\.com$|^fb\.me$/, 'Facebook'], [/(^|\.)instagram\.com$/, 'Instagram'], [/^t\.co$|(^|\.)(x|twitter)\.com$/, 'X (Twitter)'], [/(^|\.)linkedin\.com$|^lnkd\.in$/, 'LinkedIn'], [/whatsapp/, 'WhatsApp'], [/(^|\.)youtube\.com$/, 'YouTube'], [/(^|\.)yahoo\./, 'Yahoo']];
  const kaynakAdi = h => { if (!h) return 'Doğrudan / bilinmiyor'; const k = KAYNAK.find(([r]) => r.test(h)); return k ? k[1] : h; };
  const CIHAZ = { m: 'Telefon', t: 'Tablet', d: 'Bilgisayar' };
  function sayfaAdi(p) {
    const m = p.match(/^\/makaleler\/([^/]+)\/$/);
    if (m) { const a = (S.veri.makaleler || []).find(x => P.slug(x.slug || x.title) === m[1]); if (a) return a.title; }
    const c = p.match(/^\/calisma-alanlari\/([^/]+)\/$/);
    if (c) { const t = alanAdi(c[1]); if (t) return t; }
    const n = (S.veri.metinler.menu || []).find(x => x.href === p);
    if (n) return n.uzun || n.label;
    return p;
  }
  function tablo(baslik, satirlar, sutun, bos) {
    const max = Math.max(1, ...satirlar.map(r => r[1]));
    return `<section class="card stat-card"><div class="card-h"><h3>${esc(baslik)}</h3><small class="muted">${esc(sutun || 'Ziyaretçi')}</small></div>
      ${satirlar.length ? `<ul class="bars">${satirlar.map(r => `<li><span class="bar" style="width:${Math.max(2, Math.round(r[1] / max * 100))}%"></span><span class="bl" title="${esc(r[2] || r[0])}">${esc(r[0])}</span><b>${P.sayi(r[1])}</b></li>`).join('')}</ul>` : `<p class="muted pad">${esc(bos || 'Henüz veri yok.')}</p>`}</section>`;
  }
  function grafik(gunluk) {
    const W = 760, H = 220, pl = 34, pr = 10, pt = 14, pb = 26;
    const n = gunluk.length, max = Math.max(4, ...gunluk.map(g => g.v));
    const adim = (W - pl - pr) / n, bw = Math.max(2, Math.min(26, adim * 0.62));
    const y = v => pt + (H - pt - pb) * (1 - v / max);
    const izgara = [0, 0.25, 0.5, 0.75, 1].map(f => { const v = Math.round(max * f); return `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pl - 6}" y="${y(v) + 4}" class="ax" text-anchor="end">${v}</text>`; }).join('');
    const cubuk = gunluk.map((g, i) => { const x = pl + i * adim + (adim - bw) / 2; return `<rect x="${x.toFixed(1)}" y="${y(g.z).toFixed(1)}" width="${bw.toFixed(1)}" height="${(H - pb - y(g.z)).toFixed(1)}" rx="3" class="bz"><title>${P.tarih(g.g)}: ${g.z} ziyaretçi, ${g.v} görüntüleme</title></rect>`; }).join('');
    const cizgi = gunluk.map((g, i) => `${(pl + i * adim + adim / 2).toFixed(1)},${y(g.v).toFixed(1)}`).join(' ');
    const etiketAralik = Math.ceil(n / 8);
    const etiket = gunluk.map((g, i) => (i % etiketAralik === 0 || i === n - 1) ? `<text x="${(pl + i * adim + adim / 2).toFixed(1)}" y="${H - 6}" class="ax" text-anchor="middle">${g.g.slice(8)}.${g.g.slice(5, 7)}</text>` : '').join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Günlük ziyaretçi grafiği">${izgara}${cubuk}<polyline points="${cizgi}" class="lv"/>${etiket}</svg>
      <div class="legend"><span><i class="lz"></i>Ziyaretçi</span><span><i class="ll"></i>Sayfa görüntüleme</span></div>`;
  }
  B.ziyaretci = async function (kap) {
    let gun = 30;
    kap.innerHTML = `<div class="ed-head"><div><h2>Ziyaretçiler</h2><p class="muted">Siteyi ziyaret eden kişi sayısı, en çok okunan sayfalar ve ziyaretçilerin geldiği ülke ve şehirler. Kişisel veri (IP adresi) saklanmaz; sizin panel girişli ziyaretleriniz sayılmaz.</p></div>
      <div class="ed-actions"><div class="seg" data-aralik>${[[1, 'Bugün'], [7, '7 gün'], [30, '30 gün'], [90, '90 gün'], [365, '1 yıl']].map(([v, l]) => `<button type="button" data-g="${v}"${v === gun ? ' class="on"' : ''}>${l}</button>`).join('')}</div></div></div>
      <div id="st"><div class="muted pad"><span class="spin"></span> Yükleniyor…</div></div>`;
    const yukle = async (sessiz) => {
      const st = P.$('#st', kap);
      if (!st) return;
      try {
        const j = await P.api('istatistik', undefined, { q: { gun } });
        const T = j.toplam;
        const sehir = j.sehirler.map(([k, v]) => { const [ci, c] = k.split('|'); return [`${ci}${c ? ' · ' + ulke(c) : ''}`, v]; });
        const bolge = j.bolgeler.map(([k, v]) => { const [rg, c] = k.split('|'); return [`${rg}${c ? ' · ' + ulke(c) : ''}`, v]; });
        const saat = j.saatler.map((v, h) => [String(h).padStart(2, '0') + ':00', v]).filter(x => x[1]);
        st.innerHTML = `${j.konumVeritabani ? '' : `<div class="banner">${P.svg('globe')}<span>Ülke/şehir bilgisi için konum veritabanı bir sonraki site güncellemesinde otomatik yüklenecek. Bu süre içindeki ziyaretler “Bilinmiyor” görünebilir.</span></div>`}
          <div class="kpis">
            <div class="kpi card live"><small><i class="pulse"></i>Şu an sitede</small><b>${P.sayi(T.simdi)}</b></div>
            <div class="kpi card"><small>Bugün ziyaretçi</small><b>${P.sayi(T.bugunZiyaretci)}</b><span class="muted">${P.sayi(T.bugunGoruntuleme)} görüntüleme</span></div>
            <div class="kpi card"><small>${gun === 1 ? 'Bugün' : 'Son ' + gun + ' gün'} ziyaretçi</small><b>${P.sayi(T.ziyaretci)}</b></div>
            <div class="kpi card"><small>${gun === 1 ? 'Bugün' : 'Son ' + gun + ' gün'} görüntüleme</small><b>${P.sayi(T.goruntuleme)}</b><span class="muted">${T.ziyaretci ? (T.goruntuleme / T.ziyaretci).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' sayfa / kişi' : ''}</span></div>
          </div>
          ${gun > 1 ? `<section class="card"><div class="card-h"><h3>Günlük ziyaret</h3></div>${grafik(j.gunluk)}</section>` : ''}
          <div class="stat-grid">
            ${tablo('En çok görüntülenen sayfalar', j.sayfalar.map(r => [sayfaAdi(r[0]), r[1], r[0]]), 'Görüntüleme')}
            ${tablo('Ülkeler', j.ulkeler.map(([c, v]) => [ulke(c), v]))}
            ${tablo('Şehirler', sehir, 'Ziyaretçi', 'Şehir bilgisi henüz yok.')}
            ${tablo('Bölgeler / iller', bolge, 'Ziyaretçi', 'Bölge bilgisi henüz yok.')}
            ${tablo('Nereden geldiler?', j.kaynaklar.map(([h, v]) => [kaynakAdi(h), v, h]))}
            ${tablo('Cihaz', j.cihazlar.map(([d, v]) => [CIHAZ[d] || d, v]))}
            ${tablo('Tarayıcı', j.tarayicilar)}
            ${tablo('İşletim sistemi', j.sistemler)}
            ${tablo('Saatlere göre görüntüleme', saat, 'Görüntüleme')}
          </div>
          <p class="muted attr">Konum verisi: <a href="https://db-ip.com" target="_blank" rel="noopener">IP Geolocation by DB-IP</a> (CC BY 4.0). Konumlar yaklaşık değerdir.</p>`;
      } catch (e) { if (!sessiz) st.innerHTML = `<div class="banner err">${P.svg('warn')}<span>${esc(e.message)}</span></div>`; }
    };
    P.$$('[data-g]', kap).forEach(b => b.onclick = () => { gun = Number(b.dataset.g); P.$$('[data-g]', kap).forEach(x => x.classList.toggle('on', x === b)); yukle(); });
    await yukle();
    const t = setInterval(() => { if (!document.hidden) yukle(true); }, 60000);
    P._temizle = () => clearInterval(t);
  };

  /* ================= GÖRSELLER ================= */
  B.gorseller = async function (kap) {
    kap.innerHTML = `<div class="ed-head"><div><h2>Görseller</h2><p class="muted">Yüklediğiniz görseller. Büyük fotoğraflar sunucuda otomatik olarak küçültülür.</p></div>
      <div class="ed-actions"><label class="btn gold">${P.svg('upload')} Görsel yükle<input type="file" accept="image/jpeg,image/png,image/webp" multiple hidden></label></div></div>
      <div class="media-grid" id="mg"><div class="muted pad"><span class="spin"></span> Yükleniyor…</div></div>`;
    const ciz = async () => {
      const mg = P.$('#mg', kap);
      try {
        const j = await P.api('gorseller');
        const tum = JSON.stringify(S.veri);
        mg.innerHTML = j.gorseller.map(g => `<figure class="media card"><a href="${esc(g.yol)}" target="_blank" rel="noopener"><img src="${esc(g.yol)}" alt="" loading="lazy"></a>
          <figcaption><small title="${esc(g.yol)}">${esc(g.yol.split('/').pop())}</small><span class="muted">${(g.boyut / 1024).toFixed(0)} KB${tum.includes(g.yol) ? ' · <b class="ok-t">kullanımda</b>' : ''}</span>
          <span class="media-act"><button type="button" class="icon-btn" data-kopya="${esc(g.yol)}" title="Adresi kopyala">${P.svg('copy')}</button><button type="button" class="icon-btn danger" data-sil="${esc(g.yol)}" title="Sil">${P.svg('trash')}</button></span></figcaption></figure>`).join('') || '<p class="muted pad">Henüz görsel yüklenmedi.</p>';
        P.$$('[data-kopya]', mg).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.kopya); P.toast('Görsel adresi kopyalandı.'); } catch (e) { prompt('Görsel adresi:', b.dataset.kopya); } });
        P.$$('[data-sil]', mg).forEach(b => b.onclick = async () => {
          const kul = JSON.stringify(S.veri).includes(b.dataset.sil);
          if (!(await P.onay(kul ? 'Bu görsel sitede kullanılıyor! Silerseniz ilgili yerde görünmez olur. Yine de silinsin mi?' : 'Görsel kalıcı olarak silinsin mi?', 'Sil', true))) return;
          try { await P.api('gorsel_sil', { yol: b.dataset.sil }); P.toast('Görsel silindi.'); ciz(); } catch (e) { P.toast(e.message, 'err'); }
        });
      } catch (e) { mg.innerHTML = `<div class="banner err">${P.svg('warn')}<span>${esc(e.message)}</span></div>`; }
    };
    const inp = P.$('input[type=file]', kap);
    inp.onchange = async () => {
      const lbl = inp.parentElement;
      const dosyalar = Array.from(inp.files);
      for (let i = 0; i < dosyalar.length; i++) {
        lbl.classList.add('busy');
        try { await P.gorselYukle(dosyalar[i], 'makale'); } catch (e) { P.toast(`${dosyalar[i].name}: ${e.message}`, 'err'); }
      }
      lbl.classList.remove('busy');
      inp.value = '';
      P.toast('Yükleme tamamlandı.');
      ciz();
    };
    ciz();
  };

  /* ================= HESAP & YEDEKLER ================= */
  B.hesap = function (kap) {
    const adlar = { site: 'İletişim & Site Ayarları', anasayfa: 'Ana Sayfa & Slaytlar', makaleler: 'Makaleler', alanlar: 'Çalışma Alanları', eserler: 'Yayımlanmış Eserler', ozgecmis: 'Özgeçmiş', sss: 'Sıkça Sorulan Sorular', metinler: 'Sayfa Metinleri' };
    kap.innerHTML = `<div class="cols">
      <section class="card">
        <div class="card-h"><h3>Kullanıcı adı ve şifre</h3></div>
        <form class="fgrid" data-sifre autocomplete="off">
          <label class="fl full"><span class="fl-l">Kullanıcı adı</span><input name="kullanici" autocomplete="username" value="${esc(S.kullanici)}" spellcheck="false"></label>
          <label class="fl full"><span class="fl-l">Mevcut şifre</span><input name="mevcut" type="password" autocomplete="current-password" required></label>
          <label class="fl full"><span class="fl-l">Yeni şifre (en az 8 karakter)</span><input name="yeni" type="password" autocomplete="new-password" minlength="8" required></label>
          <label class="fl full"><span class="fl-l">Yeni şifre (tekrar)</span><input name="yeni2" type="password" autocomplete="new-password" required></label>
          <div class="full"><button class="btn gold" type="submit">${P.svg('lock')} Şifreyi değiştir</button></div>
        </form>
      </section>
      <section class="card">
        <div class="card-h"><h3>Yedekler</h3></div>
        <p class="muted">Her kayıtta önceki hâl otomatik yedeklenir (her bölüm için son 40 kayıt). Yanlışlıkla yapılan bir değişikliği buradan geri alabilirsiniz.</p>
        <label class="fl full"><span class="fl-l">Bölüm</span><select data-yedek-bolum>${Object.entries(adlar).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></label>
        <div data-yedek-liste class="yedek-liste"></div>
      </section>
    </div>
    <section class="card"><div class="card-h"><h3>Sunucu bilgisi</h3></div><ul class="facts">
      <li><span>PHP sürümü</span><b>${esc(S.ortam.php || '—')}</b></li>
      <li><span>Site dosyalarına yazma</span><b>${S.ortam.yazilabilir ? 'Var' : 'YOK — hosting firmasıyla görüşün'}</b></li>
      <li><span>Görsel küçültme (GD)</span><b>${S.ortam.gd ? 'Var' : 'Yok'}</b></li>
      <li><span>Ziyaretçi konum veritabanı</span><b>${S.ortam.konum ? 'Yüklü' : 'Henüz yüklenmedi'}</b></li>
      <li><span>Güvenli bağlantı (SSL)</span><b>${S.ortam.https ? 'Açık' : 'Kapalı'}</b></li>
      <li><span>En büyük yükleme boyutu</span><b>${esc(S.ortam.yuklemeSiniri || '—')}</b></li>
    </ul></section>`;
    const f = P.$('[data-sifre]', kap);
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.yeni.value !== f.yeni2.value) { P.toast('Yeni şifreler birbiriyle aynı değil.', 'err'); return; }
      if (f.yeni.value.length < 8) { P.toast('Yeni şifre en az 8 karakter olmalı.', 'err'); return; }
      const b = P.$('button[type=submit]', f);
      P.mesgul(b, true, 'Kaydediliyor…');
      try {
        const j = await P.api('sifre', { kullanici: f.kullanici.value.trim(), mevcut: f.mevcut.value, yeni: f.yeni.value });
        S.kullanici = j.kullanici; S.ilkSifre = false;
        P.toast('Giriş bilgileri güncellendi.');
        f.mevcut.value = f.yeni.value = f.yeni2.value = '';
        const ban = P.$('.banner.warn'); if (ban) ban.remove();
        const ad = P.$('[data-cikis] small'); if (ad) ad.textContent = S.kullanici;
      } catch (ex) { P.toast(ex.message, 'err'); }
      P.mesgul(b, false);
    };
    const sel = P.$('[data-yedek-bolum]', kap), liste = P.$('[data-yedek-liste]', kap);
    const yedekler = async () => {
      liste.innerHTML = '<p class="muted pad"><span class="spin"></span></p>';
      try {
        const j = await P.api('yedekler', undefined, { q: { ad: sel.value } });
        liste.innerHTML = j.yedekler.length ? `<ul class="mini-list">${j.yedekler.map(y => `<li class="yrow"><span><b>${esc(y.tarih)}</b><small>${(y.boyut / 1024).toFixed(1)} KB</small></span><button type="button" class="btn sm line" data-geri="${esc(y.dosya)}">${P.svg('history')} Bu hâle dön</button></li>`).join('')}</ul>` : '<p class="muted pad">Bu bölüm için henüz yedek yok.</p>';
        P.$$('[data-geri]', liste).forEach(b => b.onclick = async () => {
          if (!(await P.onay(`“${adlar[sel.value]}” bölümü ${b.closest('li').querySelector('b').textContent} tarihli hâline döndürülsün mü? Şu anki hâl de yedeklenir.`, 'Geri yükle'))) return;
          try {
            const y = await P.api('yedek_oku', undefined, { q: { dosya: b.dataset.geri } });
            S.veri[y.ad] = R.birlestir(S.ilk[y.ad], y.icerik);
            const ok = await P.kaydet(y.ad, b);
            if (ok) yedekler();
          } catch (e) { P.toast(e.message, 'err'); }
        });
      } catch (e) { liste.innerHTML = `<p class="muted pad">${esc(e.message)}</p>`; }
    };
    sel.onchange = yedekler;
    yedekler();
  };
})();
