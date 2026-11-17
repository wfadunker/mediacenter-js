-- Dapat dipakai untuk MySQL 8 / MariaDB 10.5+.
CREATE DATABASE IF NOT EXISTS mediacenter_demo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mediacenter_demo;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS berita (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  isi LONGTEXT NOT NULL,
  gambar VARCHAR(255) DEFAULT NULL,
  kategori VARCHAR(100) NOT NULL,
  tanggal DATE NOT NULL,
  penulis VARCHAR(150) DEFAULT NULL,
  sumber VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_berita_tanggal (tanggal),
  INDEX idx_berita_kategori (kategori),
  INDEX idx_berita_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin_sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires BIGINT NOT NULL,
  data MEDIUMTEXT NOT NULL,
  INDEX idx_admin_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Unggahan gambar admin. Di Vercel filesystem hanya-baca, jadi biner gambar
-- disimpan di sini dan disajikan lewat /mediacenter-demo/assets/img/berita/:file.
CREATE TABLE IF NOT EXISTS media_gambar (
  name VARCHAR(160) PRIMARY KEY,
  mime VARCHAR(60) NOT NULL,
  size INT UNSIGNED NOT NULL,
  data MEDIUMBLOB NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
