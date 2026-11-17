# Catatan Perbaikan

Daftar perubahan dari peninjauan menyeluruh terhadap proyek ini.

## Keamanan

- **Dashboard admin bisa dibuka tanpa login** (`server.js`). Ada dua rute `GET /` di router admin; yang pertama didaftarkan sebelum `requireAdmin`, sehingga statistik dan berita terbaru tampil tanpa sesi. Rute pertama dihapus. Rute yang tersisa (setelah `requireAdmin`) yang dipakai.
- **Field sistem bisa tertimpa isi form** (`lib/repository.js`, `createNews`). `id`, `slug`, dan timestamp sekarang ditulis setelah data. Pada `updateNews` mode JSON, `id` tetap dikunci.

## Bug fungsional

- **Halaman publik tidak valid** (`views/partials/header.ejs`). File ini memuat dua blok `<head>` dan dua `<body>` yang tidak tertutup, serta `<link>` CSS yang ganda setelah `<body>`. Sekarang menjadi satu dokumen utuh: head -> body (`mc-site`) -> intro.
- **Tabel `kualitas_udara` tidak ada di skema** (`database/schema.sql`). Ditambahkan beserta `UNIQUE KEY (lokasi, waktu_data)` yang dibutuhkan `ON DUPLICATE KEY UPDATE`.
- **Skema memakai dua nama database berbeda** (`CREATE DATABASE mediacenter_demo` tetapi `USE mediacenterhstkab`). `CREATE DATABASE` dan `USE` dihapus; database dipilih saat impor.
- **Default nama database tidak konsisten** (`server.js`, `lib/kualitas-udara.js`). Sekarang seragam `mediacenter_demo`. Nilai `DB_NAME` di `.env` tetap menjadi prioritas.
- **Tanggal grafik aktivitas 7 hari memakai UTC** (`lib/repository.js`, `activity`). Sekarang memakai zona Asia/Makassar sehingga tidak bergeser sehari sebelum pukul 08.00 WITA.
- **Path `/mediacenter-demo/` di-hardcode** pada beberapa view. Diganti `<%= baseUrl %>`.

## Pengujian dan build

- `mysql2` hanya dimuat saat `DB_MODE=mysql`, sehingga mode JSON dan tes tidak membutuhkan paket tersebut.
- `scripts/verify-templates.js` gagal pada `<%# ... %>` (komentar EJS). Sudah didukung.
- Tes baru: perlindungan field sistem dan tanggal aktivitas WITA (`test/core.test.js`).

## Berkas dihapus (sisa migrasi)

- `views/public/*.sebelum-header-bersama.bak`, `views.zip`, `public.zip`: salinan lama yang tidak dipakai.
- `fix-public-layout-hst.js`, `PASANG-HEADER.bat`: skrip sekali-jalan yang sudah diterapkan dan merujuk folder `setup/` yang tidak ada.

## Berkas baru

- `.env.example`: dirujuk README tetapi tidak ada di arsip. Berisi placeholder, tanpa rahasia.

## Hal yang belum diubah (perlu keputusan)

- **`express-mysql-session` belum ada di `package.json`.** Mode produksi memerlukannya, tetapi tidak dideklarasikan. Tambahkan dengan `npm install express-mysql-session` lalu commit `package-lock.json` yang baru.
- **Dua metode kualitas udara berjalan bersamaan.** Halaman beranda menghitung ISPU langsung di browser (`partials/home-air-toast.ejs`). Server menyediakan `/api/kualitas-udara` dengan US AQI, yang tidak dipakai frontend. `lib/kualitas-udara.js` juga tidak dipakai siapa pun. Pilih satu metode, lalu hapus sisanya.
- **Aset `public/assets/img/intro-hst-poster.jpg` tidak ada.** Intro beranda akan menampilkan 404 untuk poster-nya.
- **`public/assets/css/air-ui.css` tidak dirujuk** oleh view mana pun.
- **Tailwind browser CDN di `admin/login.ejs`** memakai `@tailwindcss/browser@4` tanpa versi tetap.
- **`.env` berisi kredensial.** Jangan dibagikan. Jika `SESSION_SECRET` pernah terekspos, ganti nilainya.

## Cara memeriksa

```bash
npm install
npm test
```

Catatan: pada lingkungan peninjauan, dependensi npm tidak dapat dipasang, sehingga server dan halaman EJS tidak dijalankan secara langsung. Yang sudah diverifikasi: sintaks semua file JavaScript, tes unit (4/4), dan smoke test seluruh 11 template.

# Tahap 2: UI/UX, tema gelap, aksesibilitas, dan Vercel

## Desain ulang
- Seluruh halaman publik (beranda, berita, detail, tentang) dan admin (dashboard, kelola berita, tambah/edit, pengaturan, login) memakai sistem desain baru di `public/assets/css/ui.css`.
- Komponen bersama dipecah ke `views/partials/`: `header`, `public-top`, `footer`, `admin-start`, `admin-end`, `sidebar`, `news-form`.
- Tailwind CDN dan CSS lama (`home.css`, `admin.css`, `app.css`, `air-ui.css`) dihapus. Satu berkas CSS dan satu berkas JS (`ui.js`) menggantikan semuanya.

## Tema gelap
- Tombol tema pada header publik dan admin. Pilihan disimpan di `localStorage` (`mc-theme`) dengan fallback bila penyimpanan diblokir.
- Tanpa pilihan, tema mengikuti `prefers-color-scheme`.
- Skrip kecil di `<head>` menerapkan tema sebelum CSS dimuat, sehingga tidak ada kedipan.

## Aksesibilitas
- Skip link, landmark (`header`, `nav`, `main`, `footer`, `aside`), dan `aria-current` pada navigasi.
- Label eksplisit untuk setiap input, `aria-describedby` untuk bantuan dan `aria-invalid` untuk galat.
- Tabel dengan `scope`, `caption`, dan `data-label` untuk tampilan mobile.
- Menu mobile dan sidebar admin: `aria-expanded`, `aria-controls`, tutup dengan Escape, fokus terkelola.
- Hasil pencarian dan notifikasi memakai `aria-live`.
- Fokus terlihat, kontras teks dibuat sesuai, dan dukungan `prefers-reduced-motion`, `forced-colors`, serta gaya cetak.
- Navigasi tetap berfungsi tanpa JavaScript.

## Deploy Vercel
- `api/index.js` mengekspor aplikasi Express sebagai fungsi serverless. `vercel.json` memetakan semua rute ke fungsi tersebut dan menyertakan folder `views` serta gambar bawaan.
- `.vercelignore` mengecualikan `.env`, `data/`, `test/`, `scripts/`, dan `database/`.
- `BASE_PATH` dapat diisi `/` untuk root domain. Validasi nilainya ada di `server.js`.
- Gambar berita di mode MySQL disimpan di tabel `berita_gambar` dan dilayani di `/media/:file`.
- Sesi admin disimpan di MySQL (`lib/session-store.js`, tabel `admin_sessions`). Dependensi `express-mysql-session` tidak lagi diperlukan.
- Halaman galat 404 dan pemeliharaan dipindah ke `lib/error-pages.js`.

## Pembersihan
- Rute diagnostik CSS (`/diagnostik-css`) dihapus.
- Variabel tidak terpakai dihapus dari `ui.js`.

## Pemeriksaan
- `node --check` untuk `server.js`, `api/index.js`, `lib/*.js`, dan `ui.js`: lolos.
- `node --test`: 4/4 lolos.
- `node scripts/verify-templates.js`: PASS untuk 10 halaman dan kondisi kosong/bersyarat.
- Render visual di Chromium (terang dan gelap, desktop 1280px dan mobile 390px): tidak ada overflow horizontal, tidak ada error JavaScript, dan toggle tema berfungsi.
- Belum dijalankan dengan MySQL asli dan belum di-deploy ke Vercel. Dependensi npm tidak dapat dipasang di lingkungan ini.
