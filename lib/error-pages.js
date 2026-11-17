'use strict';

// Halaman 404 dan pemeliharaan. Memakai stylesheet dan tema yang sama
// dengan situs utama (ui.css), sehingga tampilannya konsisten.

const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const themeScript = `<script>(function(){try{var t=localStorage.getItem('mc-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();</script>`;

function page({ base, title, robots, code, heading, text, actions, eyebrow }) {
  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${robots}">
  <meta name="theme-color" content="#0b2e4f">
  <title>${escape(title)}</title>
  ${themeScript}
  <link rel="icon" type="image/png" href="${escape(base)}/assets/img/favicon-hst.png">
  <link rel="stylesheet" href="${escape(base)}/assets/css/ui.css">
</head>
<body>
  <a class="skip-link" href="#konten-utama">Lewati ke konten</a>
  <main id="konten-utama" class="error-page">
    <div class="container">
      <div class="error-card">
        <header class="error-card__head">
          <img src="${escape(base)}/assets/img/logo-hst.png" alt="Lambang Kabupaten Hulu Sungai Tengah" width="44" height="48">
          <div>
            <span class="eyebrow">${escape(eyebrow)}</span>
            <strong>Media Center HST</strong>
          </div>
          <span class="badge">${escape(code)}</span>
        </header>
        <div class="error-card__body">
          <h1>${escape(heading)}</h1>
          <p class="lead">${text}</p>
          <div class="actions">${actions}</div>
        </div>
      </div>
    </div>
  </main>
</body>
</html>`;
}

function renderNotFound({ base, isAdmin }) {
  const admin = `${base}/masuksini`;

  return page({
    base,
    title: '404 · Halaman tidak ditemukan | Media Center HST',
    robots: 'noindex, nofollow',
    code: '404',
    eyebrow: 'Kesalahan',
    heading: 'Halaman tidak ditemukan',
    text: 'Alamat yang Anda tuju tidak tersedia, telah dipindahkan, atau tidak sesuai. Silakan kembali ke halaman utama.',
    actions: isAdmin
      ? `<a class="btn btn--primary" href="${escape(admin)}">Buka area administrator</a>
         <a class="btn" href="${escape(base)}/berita">Lihat berita</a>`
      : `<a class="btn btn--primary" href="${escape(base)}/">Kembali ke beranda</a>
         <a class="btn" href="${escape(base)}/berita">Lihat berita</a>`
  });
}

function renderMaintenance({ base }) {
  return page({
    base,
    title: 'Pemeliharaan sistem | Media Center HST',
    robots: 'noindex, nofollow',
    code: '503',
    eyebrow: 'Pemberitahuan layanan',
    heading: 'Website sedang dalam pemeliharaan',
    text: 'Kami sedang melakukan pemeliharaan untuk meningkatkan keandalan layanan informasi publik. Silakan coba kembali beberapa saat lagi.',
    actions: `<a class="btn btn--primary" href="${escape(base)}/">Coba lagi</a>
      <a class="btn" href="https://www.hstkab.go.id/" target="_blank" rel="noopener noreferrer">Portal Pemkab HST <span aria-hidden="true">↗</span><span class="sr-only"> (membuka tab baru)</span></a>`
  });
}

module.exports = { renderNotFound, renderMaintenance };
