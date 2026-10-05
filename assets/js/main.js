(function () {
  'use strict';
  var d = document;
  var header = d.querySelector('.site-header');
  var fab = d.querySelector('.call-fab');

  // Başlık: kaydırınca koyulaşır, mobil arama butonu belirir
  function onScroll() {
    var y = window.scrollY || 0;
    if (header) header.classList.toggle('is-scrolled', y > 40);
    if (fab) fab.classList.toggle('is-visible', y > 280 || !d.querySelector('.hero'));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobil menü
  var toggle = d.querySelector('.menu-toggle');
  var nav = d.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      d.body.style.overflow = open ? 'hidden' : '';
    });
  }

  // Ana sayfa slider: kendiliğinden ilerler
  var hero = d.querySelector('.hero');
  if (hero) {
    var slides = hero.querySelectorAll('.slide');
    var dots = hero.querySelectorAll('.hero-dots button');
    var ms = parseInt(hero.getAttribute('data-interval'), 10) || 8000;
    hero.style.setProperty('--slide-ms', ms + 'ms');
    var i = 0, timer;
    function show(n) {
      slides[i].classList.remove('is-active');
      if (dots[i]) { dots[i].classList.remove('is-active'); dots[i].setAttribute('aria-selected', 'false'); }
      i = (n + slides.length) % slides.length;
      // animasyonları yeniden başlat
      var media = slides[i].querySelector('.slide-media');
      if (media) { media.style.animation = 'none'; void media.offsetWidth; media.style.animation = ''; }
      slides[i].classList.add('is-active');
      if (dots[i]) { void dots[i].offsetWidth; dots[i].classList.add('is-active'); dots[i].setAttribute('aria-selected', 'true'); }
    }
    function start() { stop(); timer = setInterval(function () { show(i + 1); }, ms); }
    function stop() { if (timer) clearInterval(timer); }
    dots.forEach(function (b, k) { b.addEventListener('click', function () { show(k); start(); }); });
    d.addEventListener('visibilitychange', function () { d.hidden ? stop() : start(); });
    if (slides.length > 1) start();
  }

  // Kitap kapağı büyütme (lightbox)
  var lb = d.querySelector('.lightbox');
  if (lb) {
    var holder = lb.querySelector('.cover-wrap');
    var cap = lb.querySelector('.lightbox-cap');
    var last;
    function closeLb() { lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); d.body.style.overflow = ''; if (last) last.focus(); }
    d.querySelectorAll('[data-book]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        last = btn;
        var cover = btn.querySelector('.cover');
        holder.innerHTML = '';
        holder.appendChild(cover.cloneNode(true));
        cap.textContent = btn.getAttribute('data-title') || '';
        lb.classList.add('is-open');
        lb.setAttribute('aria-hidden', 'false');
        d.body.style.overflow = 'hidden';
        lb.querySelector('.lightbox-close').focus();
      });
    });
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('.lightbox-close')) closeLb(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lb.classList.contains('is-open')) closeLb(); });
  }

  // SSS: aynı grupta bir soru açılınca diğerini kapat
  d.querySelectorAll('.faq-group').forEach(function (g) {
    var items = g.querySelectorAll('details');
    items.forEach(function (it) {
      it.addEventListener('toggle', function () {
        if (it.open) items.forEach(function (o) { if (o !== it) o.open = false; });
      });
    });
  });

  // Görünüme girerken yumuşak belirme
  var els = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('is-in'); });
  }
})();
