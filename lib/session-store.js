'use strict';

// Penyimpanan sesi admin di MySQL.
// Dibutuhkan di Vercel: setiap pemanggilan fungsi bisa berjalan di instance
// berbeda, sehingga MemoryStore tidak cukup. Hanya memakai express-session
// dan mysql2 yang sudah ada di package.json.

const { Store } = require('express-session');

const TABLE = 'admin_sessions';
const SID_COL = 'session_id'; // Sesuai tabel database yang sudah ada.
const CREATE_SQL = `CREATE TABLE IF NOT EXISTS ${TABLE} (
  ${SID_COL} VARCHAR(128) PRIMARY KEY,
  expires BIGINT NOT NULL,
  data MEDIUMTEXT NOT NULL,
  INDEX idx_admin_sessions_expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

class MySQLSessionStore extends Store {
  constructor({ pool, ttlMs = 8 * 60 * 60 * 1000 }) {
    super();
    this.pool = pool;
    this.ttlMs = ttlMs;

    // Tabel dibuat bila belum ada (juga tersedia di database/schema.sql).
    // Bila tabel lama memakai nama kolom berbeda (mis. "sid"), kolomnya diubah
    // ke "session_id" supaya versi kode yang satu ini selalu cocok.
    this.ready = this.pool
      .query(CREATE_SQL)
      .then(() => this.pool.query(`SHOW COLUMNS FROM ${TABLE}`))
      .then(result => {
        const names = result[0].map(c => c.Field);
        if (names.includes('sid') && !names.includes(SID_COL)) {
          return this.pool.query(`ALTER TABLE ${TABLE} RENAME COLUMN sid TO ${SID_COL}`)
            .then(() => console.log('Kolom sesi "sid" diubah menjadi "session_id".'))
            .catch(err => console.error('Mengubah kolom sesi:', err.message));
        }
        return undefined;
      })
      .catch(error => {
        console.error('Menyiapkan tabel sesi:', error.message);
      });
  }

  expiresAt(session) {
    const expires = session && session.cookie && session.cookie.expires;

    return expires
      ? new Date(expires).getTime()
      : Date.now() + this.ttlMs;
  }

  get(sid, callback) {
    this.ready.then(() => this.pool
      .execute(
        `SELECT data FROM ${TABLE} WHERE ${SID_COL} = ? AND expires > ? LIMIT 1`,
        [sid, Date.now()]
      ))
      .then((result) => {
        const rows = result && result[0] ? result[0] : [];
        const row = rows[0];
        if (!row) return callback(null, null);
        try {
          callback(null, JSON.parse(row.data));
        } catch (error) {
          // Data sesi lama yang tidak bisa dibaca dianggap tidak ada.
          callback(null, null);
        }
      })
      .catch(callback);
  }

  set(sid, session, callback) {
    this.ready.then(() => this.pool
      .execute(
        `INSERT INTO ${TABLE} (${SID_COL}, expires, data) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
        [sid, this.expiresAt(session), JSON.stringify(session)]
      ))
      .then(() => callback && callback(null))
      .catch(error => callback && callback(error));
  }

  touch(sid, session, callback) {
    this.ready.then(() => this.pool
      .execute(
        `UPDATE ${TABLE} SET expires = ? WHERE ${SID_COL} = ?`,
        [this.expiresAt(session), sid]
      ))
      .then(() => callback && callback(null))
      .catch(error => callback && callback(error));
  }

  destroy(sid, callback) {
    this.ready.then(() => this.pool
      .execute(`DELETE FROM ${TABLE} WHERE ${SID_COL} = ?`, [sid]))
      .then(() => callback && callback(null))
      .catch(error => callback && callback(error));
  }
}

module.exports = { MySQLSessionStore };
