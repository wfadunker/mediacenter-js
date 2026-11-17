# Catatan Optimasi Media Center JS

## Perubahan yang dilakukan

- Menambahkan panel aksesibilitas bersama untuk halaman publik dan admin.
- Menambahkan opsi mode terang/malam yang tersimpan lintas halaman, pembesaran teks, kontras tinggi, garis bawah tautan, pengurangan animasi, dan reset pengaturan.
- Menyimpan preferensi aksesibilitas di `localStorage` dengan validasi nilai dan penanganan saat penyimpanan browser tidak tersedia.
- Menambahkan tautan lewati ke konten utama serta landmark `main` yang dapat menerima fokus programatis.
- Menghubungkan opsi pengurangan animasi dengan slider berita tanpa mengubah perilaku slider jika opsi tidak diaktifkan.
- Menambahkan label aksesibel pada kolom pencarian dashboard dan pengumuman error login bagi pembaca layar.
- Mengurangi transformasi teks berulang di helper `excerpt` dan memakai kembali fungsi `slugify` yang sudah diimpor.
- Mengatur file data JSON lokal dengan permission terbatas pada sistem yang mendukung permission POSIX.
- Menambahkan `Cache-Control: no-store` pada area admin serta header keamanan tambahan (nosniff, anti-framing, referrer policy, permissions policy, COOP, dan HSTS saat production).
- Menambahkan pembatasan percobaan login 5 kali per 15 menit per IP pada satu proses aplikasi, respons 429 dan `Retry-After`.
- Memperketat validasi konfigurasi `SESSION_SECRET` pada production (minimal 32 karakter), membatasi panjang password yang diuji, dan membatasi parameter form.
- Memperbaiki nama database pada `database/schema.sql` agar konsisten dengan konfigurasi default `mediacenter_demo`.
- Menyediakan `.env.example`; file `.env` asli tidak disertakan ke arsip distribusi.
- Mengeluarkan `node_modules` dari ZIP agar lebih ringan. Dependensi tetap tercatat di `package-lock.json`.

## Verifikasi

- `node --check` pada file JavaScript proyek: lulus.
- `npm test`: lulus.
- `node --check` untuk server dan JavaScript aksesibilitas/slider: lulus.
- Smoke test HTTP untuk halaman publik dan login admin: HTTP 200; widget aksesibilitas dan tautan lewati ke konten utama ditemukan.

## Batasan

Perubahan ini merupakan optimasi dan pemeriksaan dasar, bukan audit penetrasi menyeluruh. Untuk deployment produksi, tetap gunakan HTTPS, `SESSION_SECRET` acak yang kuat, session store persisten (jangan gunakan MemoryStore bawaan Express untuk produksi), pembatasan login terpusat jika aplikasi berjalan multi-instance, backup data, dan audit dependensi. Pembatasan login yang ditambahkan saat ini berbasis memori proses sehingga bukan pengganti rate limiter terpusat pada deployment multi-instance. Tailwind Browser CDN tetap dipertahankan agar tampilan lama tidak berubah.
