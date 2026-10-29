// PAALHU Express app: middleware, website files and API routes. server.js starts it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import chatRoutes from './routes/chat.js';
import apiRoutes from './routes/api.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); // repo root, where the website lives

const app = express();
app.disable('x-powered-by');

app.use(logger);
app.use(express.json({ limit: '16kb' }));

// ---------- API ----------
// Health check: answers as long as the server is up (for hosting / monitoring).
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/chat', chatRoutes);
app.use('/api', apiRoutes);

// ---------- website ----------
// The home page lives in pages/, so the site root redirects there.
app.get(['/', '/index.html'], (req, res) => res.redirect(302, '/pages/index.html'));
// Only these folders are served. Everything else (src/, .claude/ with customer data,
// node_modules/, package*.json, .env) is never reachable and answers 404.
for (const dir of ['pages', 'css', 'js', 'img']) app.use(`/${dir}`, express.static(path.join(ROOT, dir)));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.status(404).type('text').send('Not found');
});
// Registered last, after every route.
app.use(errorHandler);

export default app;
