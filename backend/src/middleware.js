const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
if (!SECRET) { console.error('JWT_SECRET is required'); process.exit(1); }

const sign = (u) => jwt.sign({ id: u.id, role: u.role, name: u.name }, SECRET, { expiresIn: '7d' });

function parse(req) {
  const h = req.get('authorization') || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return null;
  try { return jwt.verify(t, SECRET); } catch { return null; }
}

const optionalAuth = (req, _res, next) => { req.user = parse(req); next(); };
const requireAuth = (req, res, next) => {
  req.user = parse(req);
  return req.user ? next() : res.status(401).json({ error: 'Authentication required' });
};
const requireAdmin = (req, res, next) =>
  requireAuth(req, res, () =>
    req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin only' }));

module.exports = { sign, optionalAuth, requireAuth, requireAdmin };
