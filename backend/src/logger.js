// JSON logs -> stdout AND /var/log/app/backend.log (backend-only; MySQL has its own logs)
const fs = require('fs');
const path = require('path');

const dir = process.env.LOG_DIR || './logs';
let file = null;
try {
  fs.mkdirSync(dir, { recursive: true });
  file = fs.createWriteStream(path.join(dir, 'backend.log'), { flags: 'a' });
} catch (e) {
  console.error('File logging disabled:', e.message);
}

function write(level, msg, meta = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...meta });
  (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
  if (file) file.write(line + '\n');
}

module.exports = {
  info: (m, x) => write('info', m, x),
  warn: (m, x) => write('warn', m, x),
  error: (m, x) => write('error', m, x),
  requestLogger: (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      if (req.path === '/health') return;
      write('info', 'request', {
        method: req.method, url: req.originalUrl, status: res.statusCode,
        ms: Date.now() - start, ip: req.ip,
      });
    });
    next();
  },
};
