const express = require('express');
const log = require('./logger');
const { init, pool } = require('./db');
const routes = require('./routes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(log.requestLogger);

app.get('/health', (_req, res) => res.send('ok'));
app.get('/ready', async (_req, res) => {
  try { await pool.query('SELECT 1'); res.send('ready'); } catch { res.status(503).send('db down'); }
});

app.use(routes);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  log.error('Unhandled error', { path: req.originalUrl, error: err.message, stack: err.stack });
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Server error' });
});

const PORT = process.env.PORT || 4000;
init()
  .then(() => app.listen(PORT, () => log.info(`API listening on :${PORT}`)))
  .catch((e) => { log.error('Startup failed', { error: e.message }); process.exit(1); });
