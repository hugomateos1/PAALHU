// PAALHU website server.
//   npm start        ->  http://localhost:3000
//
// Serves the site's static files.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
// Server code, dependencies and hidden folders are never served.
const PRIVATE = /^\/(\.|node_modules\/|package(-lock)?\.json$|server\.js$)/;

function serveStatic(req, res) {
  let url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (url.endsWith('/')) url += 'index.html';
  const file = path.resolve(ROOT, '.' + url);
  if (PRIVATE.test(url) || !file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Not found');
  }
  res.writeHead(200, { 'content-type': MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

http.createServer((req, res) => {
  try {
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res);
    res.writeHead(405); res.end();
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Server error'); }
  }
}).listen(PORT, () => {
  console.log(`PAALHU at http://localhost:${PORT}`);
});
