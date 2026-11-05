// PAALHU Express app: middleware, website files and API routes. server.js starts it.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import logger from './middleware/logger.js';
import errorHandler from './middleware/errorHandler.js';
import chatRoutes from './routes/chat.js';
import apiRoutes from './routes/api.js';

// Repo root. ES modules have no __dirname, so it is worked out from this file's URL.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
// Everything the browser sees lives in public/. The home page is public/pages/index.html,
// so the site root redirects there.
app.get('/', (req, res) => res.redirect(302, '/pages/index.html'));
// Only this folder is served. Everything else (src/, .claude/ with customer data,node_modules/, package*.json, .env) is never reachable and answers 404.
app.use(express.static(path.join(ROOT, 'public')));
// Nothing above matched (no route, no file in public/): always a JSON 404.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});
// Registered last, after every route.
app.use(errorHandler);

export default app;