const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const log = require('./logger');

const {
  DB_HOST = 'mysql', DB_PORT = 3306, DB_USER, DB_PASSWORD, DB_NAME = 'blog',
  ADMIN_EMAIL, ADMIN_PASSWORD,
} = process.env;

const pool = mysql.createPool({
  host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME,
  connectionLimit: 10, waitForConnections: true, charset: 'utf8mb4',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function init() {
  for (let i = 1; i <= 30; i++) {
    try { await pool.query('SELECT 1'); break; }
    catch (e) {
      log.warn(`MySQL not ready (${i}/30)`, { error: e.message });
      if (i === 30) throw e;
      await sleep(3000);
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL,
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(200) NOT NULL,
      content MEDIUMTEXT NOT NULL,
      status ENUM('pending','published','rejected') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status_created (status, created_at),
      CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`);

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL.toLowerCase()]);
    if (!rows.length) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role) VALUES ('Administrator', ?, ?, 'admin')",
        [ADMIN_EMAIL.toLowerCase(), hash]);
      log.info('Admin user created', { email: ADMIN_EMAIL });
    }
  }
  log.info('Database ready');
}

module.exports = { pool, init };
