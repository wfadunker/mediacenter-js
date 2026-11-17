# Media Center HST — JavaScript / Node.js

Proyek ini adalah hasil migrasi dari **Media Center PHP** pada ZIP sumber menjadi **JavaScript Node.js** dengan **Express** (backend) dan **EJS** (template HTML berbasis JavaScript). **Tidak memerlukan PHP ataupun Apache/Laragon PHP untuk menjalankan aplikasinya.** Desain CSS, gambar/logo, tata letak HTML, dan interaksi JavaScript dari proyek asli tetap digunakan.

## Yang sudah dimigrasi

- Website publik: beranda, arsip berita (pencarian, kategori, tahun, urutan, pagination), detail berita, dan halaman tentang.
- Admin: login/logout, dashboard (statistik dan mini-chart), daftar berita (pencarian plus filter kategori), tambah/edit/hapus berita, dan unggah gambar. Di halaman edit, gambar juga dapat diisi dari tautan URL: server mengunduh gambarnya, memvalidasi isi berkas (JPG/PNG/WebP, maksimal 2 MB, memblokir alamat jaringan internal), lalu menyimpannya seperti unggahan biasa. Halaman pengaturan admin sudah dihapus, termasuk seluruh kode penyimpanan `pengaturan`.
- Proteksi sesi login, token CSRF, password hash bcrypt, validasi form, dan pembatasan ukuran/jenis unggahan.
- Login admin berada di jalur privat `/masuksini` (bukan `/admin`) agar tidak mudah diakses publik. Sesi memakai cookie `HttpOnly`, `SameSite=Strict`, batas tidak aktif 30 menit, dan batas absolut 8 jam. Halaman admin memakai header `Content-Security-Policy` dan selalu `no-store`. Penjaga sesi di peramban menampilkan peringatan dua menit sebelum sesi habis, memakai endpoint `GET /masuksini/sesi` untuk memperbarui batas waktu hanya saat ada aktivitas, dan otomatis mengarahkan ke halaman masuk (wajib login ulang) begitu sesi berakhir.
- Pengaturan aksesibilitas untuk pembesaran teks, kontras tinggi, garis bawah tautan, pengurangan animasi, dan tautan lewati ke konten utama tersedia di halaman publik; preferensi disimpan secara lokal di browser. Panel admin memakai tampilan terang yang konsisten tanpa mode malam.
- URL bersih (`/berita` bukan `/berita.php`). Beberapa URL PHP lama masih diarahkan ke URL baru untuk kompatibilitas.
- Penyimpanan **JSON lokal** atau **MySQL**. Semua logic backend ditulis dalam JavaScript.

## Persyaratan

- Node.js **20 atau lebih baru** dan npm.
- Opsional: MySQL/MariaDB jika ingin memakai database dari proyek PHP sebelumnya.

## Cara cepat menjalankan (tanpa MySQL)

Buka terminal di direktori `mediacenter-js`, lalu jalankan:

```bash
npm install
```

Salin `.env.example` menjadi `.env` dan ganti `SESSION_SECRET` dengan nilai acak yang panjang. Di Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Di terminal Linux/macOS:

```bash
cp .env.example .env
```

Pastikan baris `DB_MODE=json` di `.env`. Buat akun admin milik sendiri:

```bash
npm run seed:admin -- admin "PasswordKuatMinimal10Karakter!"
```

Jalankan aplikasi:

```bash
npm start
```

Buka:

- **Website publik:** http://localhost:3000/mediacenter-demo/
- **Login admin:** http://localhost:3000/mediacenter-demo/masuksini
- **Dashboard admin:** http://localhost:3000/mediacenter-demo/masuksini (setelah masuk)

Gunakan username dan password yang dibuat melalui perintah `seed:admin`. Data JSON tersimpan di `data/db.json` (file dibuat otomatis ketika diperlukan). **Simpan/backup file ini** agar data tidak hilang.

> Aplikasi tidak membuat user/password default secara otomatis. Ini disengaja agar password demo yang lemah tidak terbuka saat deployment.

## Cara menggunakan MySQL yang lama

Jika database `mediacenter_demo` dari situs PHP sebelumnya sudah ada dan memiliki tabel `users`, `berita`, `pengaturan`, **jangan impor file schema.sql untuk mereset data**. Gunakan database tersebut secara langsung; format tabel dan nama kolom yang diakses dipertahankan.

1. Ubah `.env` menjadi `DB_MODE=mysql`.
2. Isi `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` sesuai server MySQL.
3. Jika database masih kosong, impor `database/schema.sql` terlebih dahulu (misalnya lewat phpMyAdmin atau `mysql -u root -p < database/schema.sql`). **File SQL dari ZIP asli kosong**, jadi skema baru disertakan.
4. Jika tabel users belum punya admin, jalankan perintah `npm run seed:admin -- username "password"`.
5. Jalankan `npm start`.

Password PHP lama yang memakai bcrypt (`$2y$`) tetap didukung pada proses login Node.js. Berita lama yang menunjuk ke gambar `berita/nama-file.jpg` juga didukung jika filenya memang ada di `public/assets/img/berita/`.

## Deploy ke Vercel (MySQL cloud)

Filesystem Vercel hanya-baca dan tidak permanen, jadi saat deploy **wajib** memakai `DB_MODE=mysql` dengan database yang bisa diakses dari internet. Konfigurasi `vercel.json` dan `api/index.js` sudah disiapkan; semua request diarahkan ke Express.

Langkah dengan **TiDB Cloud Serverless** (MySQL-compatible, ada free tier):

1. Buat cluster Serverless di https://tidbcloud.com (pilih region terdekat, mis. Singapore), lalu buat database lewat SQL Editor: `CREATE DATABASE mediacenter;`.
2. Catat **host**, **port** (biasanya `4000`), **user**, dan **password** dari halaman Connect. TiDB mewajibkan TLS.
3. Impor data awal `database/seed-data.sql` (berisi tabel `users` dan `berita` dari database lokal) ke TiDB, lewat SQL Editor atau:
   ```bash
   mysql -h HOST -P 4000 -u USER -p --ssl-mode=REQUIRED mediacenter < database/seed-data.sql
   ```
   Tabel `admin_sessions` dan `media_gambar` dibuat otomatis oleh aplikasi saat pertama dipakai.
4. Push proyek ini ke repositori GitHub, lalu di dashboard Vercel pilih **Add New > Project** dan import repo tersebut. Tidak perlu build command; framework biarkan terdeteksi otomatis.
5. Isi **Environment Variables** (Production dan Preview):

   | Variable | Nilai |
   | --- | --- |
   | `DB_MODE` | `mysql` |
   | `DB_HOST` | host TiDB |
   | `DB_PORT` | `4000` |
   | `DB_USER` | user TiDB |
   | `DB_PASSWORD` | password TiDB |
   | `DB_NAME` | `mediacenter` |
   | `DB_SSL` | `true` |
   | `DB_POOL_SIZE` | `3` |
   | `SESSION_SECRET` | string acak minimal 32 karakter |
   | `NODE_ENV` | `production` |

   Buat `SESSION_SECRET` dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
6. Deploy. Situs tersedia di `https://NAMA-PROYEK.vercel.app/mediacenter-demo/` dan login admin di `/mediacenter-demo/masuksini`.

Catatan: unggahan gambar admin baru disimpan di tabel `media_gambar` dan disajikan lewat `/mediacenter-demo/assets/img/berita/<nama-file>`; gambar lama yang ada di `public/assets/img/berita/` tetap disajikan sebagai aset statis. Setiap perubahan environment variable perlu redeploy.

## Struktur folder

```text
mediacenter-js/
├── server.js                  # HTTP routes dan aksi admin (Express)
├── lib/
│   ├── repository.js          # Penyimpanan JSON / MySQL
│   └── helpers.js             # Format tanggal, slug, link, escape HTML
├── views/
│   ├── public/                # Halaman publik .ejs
│   ├── admin/                 # Halaman admin .ejs
│   └── partials/              # Header, footer, brand, sidebar
├── public/assets/            # Gambar, stylesheet dan JS bawaan
├── scripts/seed-admin.js      # Buat admin dengan hash bcrypt
├── scripts/verify-templates.js
├── test/                      # Unit test Node.js
├── database/schema.sql       # Struktur tabel saat MySQL kosong
├── data/                      # JSON database dibuat saat digunakan
├── .env.example
└── package.json
```

## Aksesibilitas

Tombol **Aksesibilitas** tersedia di halaman publik. Pengguna dapat memperbesar teks, mengaktifkan kontras tinggi, menambahkan garis bawah pada tautan, mengurangi animasi, atau mengembalikan semua pengaturan ke kondisi awal. Tautan **Lewati ke konten utama** membantu navigasi keyboard. Preferensi disimpan di browser dan tidak mengubah data berita. Panel admin tetap menyediakan tautan lewati ke konten serta dukungan `prefers-reduced-motion` tanpa mode malam.

## Catatan keamanan dan distribusi

- Jangan bagikan file `.env`; file itu dapat berisi kredensial database dan secret sesi. Buat `.env` sendiri dari `.env.example` dan isi `SESSION_SECRET` dengan nilai acak yang kuat sebelum deployment.
- Folder `node_modules` sengaja tidak disertakan dalam arsip distribusi agar ZIP lebih ringan. Jalankan `npm install` setelah mengekstrak project.
- Jika `DB_MODE=mysql`, sesi admin otomatis disimpan ke tabel `admin_sessions` agar tetap valid lintas instance. Untuk deployment produksi, wajib gunakan HTTPS dan `SESSION_SECRET` acak minimal 32 karakter.
- Login dibatasi 5 percobaan per IP dan 10 percobaan per username dalam 15 menit. Logout menghapus sesi, cookie, dan cache halaman admin.

## Pemeriksaan

```bash
npm test
```

Tes menggunakan Node.js bawaan untuk memeriksa helpers, CRUD JSON, dan rendering/percabangan seluruh halaman EJS. **Tes ini bukan pengganti pengujian browser penuh**. Untuk pengujian HTTP login/unggah file/database MySQL, npm package dan layanan terkait harus tersedia di komputer yang menjalankan aplikasi.

## Catatan migrasi

- File asli `database/mediacenter.sql` berukuran **0 byte** sehingga tidak ada data awal yang dapat dimigrasikan dari ZIP. Gambar dalam ZIP tetap disalin ke proyek ini.
- Nama file tampilan berubah dari `.php` menjadi `.ejs`. Backend menjadi `server.js` dan file-file JavaScript dalam `lib/`.
- Data MySQL yang **ada di instalasi lama** tidak ikut terbawa dalam ZIP. Hubungkan Node.js ke database lama atau impor backup database jika tersedia.
- `express-session` memakai penyimpanan MySQL saat `DB_MODE=mysql`, dan penyimpanan memori untuk mode JSON lokal. Mode JSON cocok untuk pengembangan satu proses; untuk produksi gunakan MySQL, `SESSION_SECRET` kuat, HTTPS, dan backup rutin.
- Halaman login admin tidak lagi memuat Tailwind dari CDN. Seluruh tampilan admin memakai `public/assets/css/admin.css` dan `public/assets/js/admin.js` secara lokal.
