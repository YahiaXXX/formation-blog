const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { sign, optionalAuth, requireAuth, requireAdmin } = require('./middleware');
const log = require('./logger');

const r = express.Router();
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ['pending', 'published', 'rejected'];

// ---------------- Auth ----------------
r.post('/auth/register', h(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || name.trim().length < 2) return bad(res, 'Name must be at least 2 characters');
  if (!EMAIL.test(email || '')) return bad(res, 'Invalid email');
  if (!password || password.length < 8) return bad(res, 'Password must be at least 8 characters');
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name.trim(), email.toLowerCase(), hash]);
    const user = { id: result.insertId, name: name.trim(), email: email.toLowerCase(), role: 'user' };
    log.info('User registered', { userId: user.id });
    res.status(201).json({ token: sign(user), user });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') return bad(res, 'Email already registered', 409);
    throw e;
  }
}));

r.post('/auth/login', h(async (req, res) => {
  const { email, password } = req.body || {};
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(String(password || ''), u.password_hash))) {
    log.warn('Failed login', { email, ip: req.ip });
    return bad(res, 'Invalid email or password', 401);
  }
  const user = { id: u.id, name: u.name, email: u.email, role: u.role };
  res.json({ token: sign(user), user });
}));

r.get('/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

// ---------------- Posts (users) ----------------
r.get('/posts', h(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = 10;
  const [items] = await pool.query(
    `SELECT p.id, p.title, LEFT(p.content, 220) AS excerpt, p.created_at, u.name AS author
       FROM posts p JOIN users u ON u.id = p.user_id
      WHERE p.status = 'published' ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [limit, (page - 1) * limit]);
  res.json({ items, page });
}));

r.get('/posts/mine', requireAuth, h(async (req, res) => {
  const [items] = await pool.query(
    'SELECT id, title, status, created_at FROM posts WHERE user_id = ? ORDER BY id DESC', [req.user.id]);
  res.json({ items });
}));

r.get('/posts/:id', optionalAuth, h(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT p.*, u.name AS author FROM posts p JOIN users u ON u.id = p.user_id WHERE p.id = ?', [req.params.id]);
  const p = rows[0];
  const allowed = p && (p.status === 'published' ||
    (req.user && (req.user.role === 'admin' || req.user.id === p.user_id)));
  if (!allowed) return bad(res, 'Not found', 404);
  res.json(p);
}));

r.post('/posts', requireAuth, h(async (req, res) => {
  const { title, content } = req.body || {};
  if (!title || title.trim().length < 3 || title.length > 200) return bad(res, 'Title must be 3-200 characters');
  if (!content || content.trim().length < 10 || content.length > 50000) return bad(res, 'Content must be 10-50000 characters');
  const [result] = await pool.query(
    "INSERT INTO posts (user_id, title, content, status) VALUES (?, ?, ?, 'pending')",
    [req.user.id, title.trim(), content.trim()]);
  log.info('Post submitted', { postId: result.insertId, userId: req.user.id });
  res.status(201).json({ id: result.insertId, status: 'pending' });
}));

r.delete('/posts/:id', requireAuth, h(async (req, res) => {
  const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [req.params.id]);
  if (!rows.length) return bad(res, 'Not found', 404);
  if (req.user.role !== 'admin' && rows[0].user_id !== req.user.id) return bad(res, 'Forbidden', 403);
  await pool.query('DELETE FROM posts WHERE id = ?', [req.params.id]);
  res.status(204).end();
}));

// ---------------- Admin ----------------
r.get('/admin/stats', requireAdmin, h(async (_req, res) => {
  const [[s]] = await pool.query(`
    SELECT (SELECT COUNT(*) FROM users) AS users,
           COUNT(*) AS posts,
           COALESCE(SUM(status='pending'),0) AS pending,
           COALESCE(SUM(status='published'),0) AS published,
           COALESCE(SUM(status='rejected'),0) AS rejected
      FROM posts`);
  res.json(s);
}));

r.get('/admin/posts', requireAdmin, h(async (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null;
  const [items] = await pool.query(
    `SELECT p.id, p.title, p.content, p.status, p.created_at, u.name AS author, u.email
       FROM posts p JOIN users u ON u.id = p.user_id
      ${status ? 'WHERE p.status = ?' : ''} ORDER BY p.created_at DESC LIMIT 100`,
    status ? [status] : []);
  res.json({ items });
}));

r.patch('/admin/posts/:id', requireAdmin, h(async (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return bad(res, 'Invalid status');
  const [result] = await pool.query('UPDATE posts SET status = ? WHERE id = ?', [status, req.params.id]);
  if (!result.affectedRows) return bad(res, 'Not found', 404);
  log.info('Post moderated', { postId: Number(req.params.id), status, adminId: req.user.id });
  res.json({ id: Number(req.params.id), status });
}));

r.get('/admin/users', requireAdmin, h(async (_req, res) => {
  const [items] = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM posts WHERE user_id = u.id) AS posts
       FROM users u ORDER BY u.id DESC LIMIT 200`);
  res.json({ items });
}));

r.delete('/admin/users/:id', requireAdmin, h(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return bad(res, 'You cannot delete yourself');
  const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role = 'user'", [req.params.id]);
  if (!result.affectedRows) return bad(res, 'User not found (admins cannot be deleted)', 404);
  log.info('User deleted', { userId: Number(req.params.id), adminId: req.user.id });
  res.status(204).end();
}));

module.exports = r;
