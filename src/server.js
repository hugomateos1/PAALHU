// PAALHU website server.
//   npm start        ->  http://localhost:3000
//
// - Serves the website's static files (the home page is pages/index.html; / redirects there).
// - POST /api/chat: the customer booking chat. The assistant itself lives in controllers/chatController.js.
process.env.TZ = 'Europe/Madrid'; // shifts and "tonight" are Madrid time

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAT_ENABLED, answer } from './controllers/chatController.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..'); // repo root, where the website lives
const PORT = Number(process.env.PORT ?? 3000);

// ---------- HTTP utilities ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
// The server code, dependencies and booking data are never served.
const PRIVATE = /^\/(\.|node_modules\/|src\/|package(-lock)?\.json$)/;

const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', c => { data += c; if (data.length > limit) { reject(new Error('body too large')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url.endsWith('/')) url += 'index.html';
  const file = path.resolve(ROOT, '.' + url);
  if (PRIVATE.test(url) || !file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

// ---------- chat /api/chat ----------
async function chat(req, res) {
  if (!CHAT_ENABLED) return json(res, 503, { error: "The chat isn't available right now. Please try again in a little while." });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'Invalid request.' }); }
  const [code, reply] = await answer(body);
  json(res, code, reply);
}

// ---------- server ----------
http.createServer(async (req, res) => {
  try {
    const route = new URL(req.url, 'http://x').pathname;
    if (req.method === 'POST' && route === '/api/chat') return await chat(req, res);
    if (req.method === 'GET' && route === '/api/chat/status') return json(res, 200, { enabled: CHAT_ENABLED });
    // The home page lives in pages/, so the site root redirects there.
    if (route === '/' || route === '/index.html') { res.writeHead(302, { location: '/pages/index.html' }); return res.end(); }
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    res.writeHead(405); res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Server error'); }
  }
}).listen(PORT, () => {
  console.log(`PAALHU at http://localhost:${PORT}  ·  chat ${CHAT_ENABLED ? 'enabled' : 'disabled (pilot: no model connected)'}`);
});
