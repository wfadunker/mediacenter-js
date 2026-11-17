/* =====================================================================
   MEDIA CENTER HST — UI SCRIPT
   Peningkatan progresif: halaman tetap berfungsi tanpa JavaScript.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var STORAGE_KEY = 'mc-theme';

  /* ---------------------------------------------------------------
     1. TEMA GELAP / TERANG
     --------------------------------------------------------------- */

  function systemPrefersDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function currentTheme() {
    var explicit = root.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') return explicit;
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function paintToggles(theme) {
    var isDark = theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      var label = button.querySelector('[data-theme-label]');
      if (label) label.textContent = isDark ? 'Mode terang' : 'Mode gelap';
      button.setAttribute('title', isDark ? 'Beralih ke mode terang' : 'Beralih ke mode gelap');
    });
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#061624' : '#0b2e4f');
  }

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* penyimpanan diblokir: tema tetap berlaku untuk sesi ini */ }
    paintToggles(theme);
  }

  document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
    button.addEventListener('click', function () {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });
  });
  paintToggles(currentTheme());

  // Mengikuti perubahan tema sistem bila pengguna belum memilih manual.
  if (window.matchMedia) {
    var media = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () {
      var saved = null;
      try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { saved = null; }
      if (saved !== 'light' && saved !== 'dark') paintToggles(currentTheme());
    };
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
  }

  /* ---------------------------------------------------------------
     2. NAVIGASI PUBLIK (MOBILE)
     --------------------------------------------------------------- */

  var navToggle = document.querySelector('.nav-toggle');
  var siteNav = document.getElementById('site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = !siteNav.classList.contains('is-open');
      siteNav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.querySelector('[data-nav-label]').textContent = open ? 'Tutup' : 'Menu';
    });
  }

  /* ---------------------------------------------------------------
     3. SIDEBAR ADMIN (MOBILE)
     --------------------------------------------------------------- */

  var sidebar = document.getElementById('admin-sidebar');
  var backdrop = document.querySelector('[data-admin-backdrop]');
  var menuButton = document.querySelector('[data-sidebar-open]');
  var lastFocus = null;

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', open);
    if (backdrop) backdrop.hidden = !open;
    if (menuButton) menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      lastFocus = document.activeElement;
      var first = sidebar.querySelector('a, button');
      if (first) first.focus();
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
    }
  }

  if (sidebar) {
    if (menuButton) menuButton.addEventListener('click', function () { setSidebar(!sidebar.classList.contains('is-open')); });
    document.querySelectorAll('[data-sidebar-close]').forEach(function (el) {
      el.addEventListener('click', function () { setSidebar(false); });
    });
    if (backdrop) backdrop.addEventListener('click', function () { setSidebar(false); });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    if (sidebar && sidebar.classList.contains('is-open')) setSidebar(false);
    if (siteNav && siteNav.classList.contains('is-open') && navToggle) navToggle.click();
  });

  /* ---------------------------------------------------------------
     4. JAM WITA
     --------------------------------------------------------------- */

  var clockTime = document.querySelector('[data-clock-time]');
  var clockDate = document.querySelector('[data-clock-date]');

  if (clockTime) {
    var timeFormat = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    var dateFormat = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    var tick = function () {
      var now = new Date();
      clockTime.textContent = timeFormat.format(now).replace(/[:.]/g, '.') + ' WITA';
      if (clockDate) clockDate.textContent = dateFormat.format(now);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------------------------------------------------------------
     5. AKSI DETAIL BERITA
     --------------------------------------------------------------- */

  var live = document.querySelector('[data-live]');

  function announce(message) {
    if (live) live.textContent = message;
  }

  var printButton = document.querySelector('[data-print]');
  if (printButton) printButton.addEventListener('click', function () { window.print(); });

  var copyButton = document.querySelector('[data-copy]');
  if (copyButton) {
    copyButton.addEventListener('click', function () {
      var url = window.location.href;
      var fallback = function () {
        var area = document.createElement('textarea');
        area.value = url;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(area);
        announce(ok ? 'Tautan berhasil disalin.' : 'Gagal menyalin. Salin tautan dari bilah alamat.');
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(
          function () { announce('Tautan berhasil disalin.'); },
          fallback
        );
      } else {
        fallback();
      }
    });
  }

  var shareButton = document.querySelector('[data-share]');
  if (shareButton && navigator.share) {
    shareButton.hidden = false;
    shareButton.addEventListener('click', function () {
      var title = document.title;
      navigator.share({ title: title, url: window.location.href }).catch(function () { /* dibatalkan pengguna */ });
    });
  }

  /* ---------------------------------------------------------------
     6. PRATINJAU GAMBAR & KONFIRMASI HAPUS
     --------------------------------------------------------------- */

  document.querySelectorAll('[data-preview-input]').forEach(function (input) {
    var target = document.querySelector(input.getAttribute('data-preview-input'));
    if (!target) return;
    var img = target.querySelector('img');
    var empty = target.querySelector('[data-preview-empty]');
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) {
        if (img) { img.hidden = true; img.removeAttribute('src'); }
        if (empty) empty.hidden = false;
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        if (img) { img.src = e.target.result; img.hidden = false; }
        if (empty) empty.hidden = true;
      };
      reader.readAsDataURL(file);
    });
  });

  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.getAttribute('data-confirm'))) event.preventDefault();
    });
  });
})();
