'use strict';

// Entry point Vercel (Node.js Serverless Function).
// Seluruh permintaan diarahkan ke sini lewat vercel.json.
// Express app diekspor dari server.js; server.js tidak menjalankan listen()
// ketika dimuat sebagai modul.
module.exports = require('../server');
