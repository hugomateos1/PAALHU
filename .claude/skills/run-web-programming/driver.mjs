#!/usr/bin/env node
// PAALHU static-site driver.
//
// Zero dependencies: serves the site with node:http, drives headless Chrome
// over the DevTools Protocol using Node's built-in WebSocket (Node >= 22).
// No npm install, no Playwright, no browser download.
//
// Usage (from the repo root):
//   node .claude/skills/run-web-programming/driver.mjs check
//   node .claude/skills/run-web-programming/driver.mjs shot index.html
//   node .claude/skills/run-web-programming/driver.mjs dom pages/menu.html
//   node .claude/skills/run-web-programming/driver.mjs eval index.html "document.title"
//   node .claude/skills/run-web-programming/driver.mjs serve

import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SKILL_DIR, '../../..'); // repo root = the unit
const SHOT_DIR = join(ROOT, '.screenshots');
const PORT = Number(process.env.PAALHU_PORT || 8111);
const CDP_PORT = Number(process.env.PAALHU_CDP_PORT || 9333);

// Every page in the site. index.html first; starter_practice_page.html is the
// in-progress lab exercise and is knowingly incomplete (see Gotchas).
const PAGES = [
  'index.html',
  'pages/about_us.html',
  'pages/set-menu.html',
  'pages/spice_guide.html',
  'pages/menu.html',
  'pages/opening_hours.html',
  'pages/location.html',
  'starter_practice_page.html',
];

// Chrome requests /favicon.ico unprompted on every navigation and the site
// ships none. Filtering it keeps `check` output about the site, not the browser.
const IGNORE_URL = /\/favicon\.ico$/;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  throw new Error('No Chrome/Edge found. Set CHROME_PATH to the browser binary.');
}

// ---------------------------------------------------------------- static server

function startServer() {
  const server = createServer((req, res) => {
    // Strip query/hash, decode, and refuse anything that escapes ROOT.
    const urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const rel = posix.normalize(urlPath).replace(/^\/+/, '');
    const file = resolve(ROOT, rel);
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    if (!isFile(file)) {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('404 ' + rel);
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((ok, bad) => {
    server.on('error', bad);
    server.listen(PORT, '127.0.0.1', () => ok(server));
  });
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- CDP client

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = [];
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { ok, bad } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? bad(new Error(msg.error.message)) : ok(msg.result);
      } else if (msg.method) {
        for (const h of this.handlers) h(msg);
      }
    });
  }

  static async connect(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((ok, bad) => {
      ws.addEventListener('open', ok, { once: true });
      ws.addEventListener('error', () => bad(new Error('ws error ' + wsUrl)), { once: true });
    });
    return new Cdp(ws);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((ok, bad) => this.pending.set(id, { ok, bad }));
  }

  on(fn) {
    this.handlers.push(fn);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== fn);
    };
  }

  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function launchChrome() {
  const bin = findChrome();
  const profile = mkdtempSync(join(tmpdir(), 'paalhu-chrome-'));
  const child = spawn(
    bin,
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  // Chrome logs harmless extension-registry errors on Windows; swallow them.
  child.stderr.on('data', () => {});

  let ver;
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (r.ok) {
        ver = await r.json();
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ver) {
    child.kill();
    throw new Error(`Chrome never opened a debugger on port ${CDP_PORT}`);
  }
  const cdp = await Cdp.connect(ver.webSocketDebuggerUrl);
  return {
    cdp,
    version: ver.Browser,
    async close() {
      cdp.close();
      child.kill();
      try {
        rmSync(profile, { recursive: true, force: true });
      } catch {}
    },
  };
}

// Open one page, collect everything interesting, return a report.
async function visit(cdp, url, { screenshot } = {}) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = sessionId;

  const netFailures = [];
  const consoleErrors = [];
  const requests = new Map();

  const off = cdp.on((msg) => {
    if (msg.sessionId !== s) return;
    if (msg.method === 'Network.requestWillBeSent') {
      requests.set(msg.params.requestId, msg.params.request.url);
    } else if (msg.method === 'Network.responseReceived') {
      const { status, url: u } = msg.params.response;
      if (status >= 400 && !IGNORE_URL.test(u)) netFailures.push(`${status} ${u}`);
    } else if (msg.method === 'Network.loadingFailed') {
      const u = requests.get(msg.params.requestId) || '(unknown)';
      if (!IGNORE_URL.test(u)) netFailures.push(`FAILED ${msg.params.errorText} ${u}`);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '?').join(' '));
    } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      if (!IGNORE_URL.test(msg.params.entry.url || '')) consoleErrors.push(msg.params.entry.text);
    }
  });

  await cdp.send('Network.enable', {}, s);
  await cdp.send('Runtime.enable', {}, s);
  await cdp.send('Log.enable', {}, s);
  await cdp.send('Page.enable', {}, s);
  await cdp.send('Emulation.setDeviceMetricsOverride',
    { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, s);

  const loaded = new Promise((ok) => {
    const stop = cdp.on((m) => {
      if (m.sessionId === s && m.method === 'Page.loadEventFired') {
        stop();
        ok();
      }
    });
  });
  await cdp.send('Page.navigate', { url }, s);
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))]);
  // let layout + image decode settle
  await new Promise((r) => setTimeout(r, 350));

  const probe = `(() => {
    const sheets = [...document.styleSheets];
    let ruleCount = 0;
    for (const sh of sheets) { try { ruleCount += sh.cssRules.length; } catch (e) {} }
    const cs = getComputedStyle(document.body);
    const imgs = [...document.images].map(i => ({
      src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0,
    }));
    const links = [...document.querySelectorAll('a[href]')]
      .map(a => a.getAttribute('href'))
      .filter(h => h && !/^(tel:|mailto:|https?:|#)/.test(h));
    return JSON.stringify({
      title: document.title,
      sheets: sheets.length,
      ruleCount,
      bodyBg: cs.backgroundColor,
      bodyFont: cs.fontFamily,
      h1: document.querySelector('h1')?.textContent?.trim() ?? null,
      textLen: document.body.innerText.trim().length,
      imgs, links,
      navDisplay: document.querySelector('nav') ? getComputedStyle(document.querySelector('nav')).display : null,
    });
  })()`;
  const { result } = await cdp.send('Runtime.evaluate', { expression: probe, returnByValue: true }, s);
  const info = JSON.parse(result.value);

  let shotPath = null;
  if (screenshot) {
    const m = await cdp.send('Page.getLayoutMetrics', {}, s);
    const size = m.cssContentSize || m.contentSize;
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: Math.ceil(size.width), height: Math.ceil(size.height), scale: 1 },
    }, s);
    mkdirSync(SHOT_DIR, { recursive: true });
    shotPath = join(SHOT_DIR, screenshot);
    writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  }

  off();
  await cdp.send('Target.closeTarget', { targetId });
  return { ...info, netFailures, consoleErrors, shotPath };
}

// ---------------------------------------------------------------- commands

async function cmdCheck() {
  const server = await startServer();
  const browser = await launchChrome();
  console.log(`server  http://127.0.0.1:${PORT}  (root ${ROOT})`);
  console.log(`browser ${browser.version}\n`);

  const problems = [];
  try {
    for (const page of PAGES) {
      const url = `http://127.0.0.1:${PORT}/${page}`;
      const name = page.replace(/[\/\\]/g, '_').replace(/\.html$/, '') + '.png';
      const r = await visit(browser.cdp, url, { screenshot: name });

      const badImgs = r.imgs.filter((i) => !i.ok).map((i) => i.src);
      const styled = r.ruleCount > 0;
      const flags = [];
      if (!styled) flags.push('NO-CSS');
      if (badImgs.length) flags.push(`BROKEN-IMG:${badImgs.join(',')}`);
      if (r.netFailures.length) flags.push(`NET:${r.netFailures.join(' | ')}`);
      if (r.consoleErrors.length) flags.push(`CONSOLE:${r.consoleErrors.join(' | ')}`);
      if (r.textLen < 20) flags.push('EMPTY-BODY');

      // Resolve in-page relative links against the server.
      const broken = [];
      for (const href of new Set(r.links)) {
        const target = new URL(href, url);
        const res = await fetch(target, { method: 'GET' });
        if (!res.ok) broken.push(`${href} -> ${res.status}`);
      }
      if (broken.length) flags.push(`DEAD-LINK:${broken.join(', ')}`);

      const status = flags.length ? 'FAIL' : 'ok  ';
      console.log(`${status} ${page}`);
      console.log(`      title="${r.title}" h1="${r.h1}" chars=${r.textLen}`);
      console.log(`      css: ${r.sheets} sheet(s), ${r.ruleCount} rules | bg ${r.bodyBg} | font ${r.bodyFont.split(',')[0]}`);
      console.log(`      imgs: ${r.imgs.length} (${r.imgs.filter((i) => i.ok).length} loaded) | links: ${new Set(r.links).size}`);
      if (r.navDisplay) console.log(`      nav display: ${r.navDisplay}`);
      console.log(`      shot: ${r.shotPath}`);
      for (const f of flags) console.log(`      !! ${f}`);
      console.log();
      if (flags.length) problems.push({ page, flags });
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (problems.length) {
    console.log(`${problems.length} page(s) with problems:`);
    for (const p of problems) console.log(`  ${p.page}: ${p.flags.join('; ')}`);
    process.exitCode = 1;
  } else {
    console.log(`All ${PAGES.length} pages rendered clean. Screenshots in ${SHOT_DIR}`);
  }
}

async function cmdShot(page) {
  const server = await startServer();
  const browser = await launchChrome();
  try {
    const name = page.replace(/[\/\\]/g, '_').replace(/\.html$/, '') + '.png';
    const r = await visit(browser.cdp, `http://127.0.0.1:${PORT}/${page}`, { screenshot: name });
    console.log(`${r.shotPath}  (title="${r.title}", ${r.ruleCount} css rules)`);
  } finally {
    await browser.close();
    server.close();
  }
}

async function cmdDom(page) {
  const server = await startServer();
  const browser = await launchChrome();
  try {
    const r = await visitEval(browser.cdp, page, 'document.documentElement.outerHTML');
    console.log(r);
  } finally {
    await browser.close();
    server.close();
  }
}

async function cmdEval(page, expr) {
  const server = await startServer();
  const browser = await launchChrome();
  try {
    const r = await visitEval(browser.cdp, page, expr);
    console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2));
  } finally {
    await browser.close();
    server.close();
  }
}

// Navigate then evaluate an arbitrary expression (used by dom/eval).
async function visitEval(cdp, page, expr) {
  const url = `http://127.0.0.1:${PORT}/${page}`;
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId: s } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  await cdp.send('Page.enable', {}, s);
  const loaded = new Promise((ok) => {
    const stop = cdp.on((m) => {
      if (m.sessionId === s && m.method === 'Page.loadEventFired') {
        stop();
        ok();
      }
    });
  });
  await cdp.send('Page.navigate', { url }, s);
  await Promise.race([loaded, new Promise((r) => setTimeout(r, 15000))]);
  await new Promise((r) => setTimeout(r, 250));
  const { result, exceptionDetails } = await cdp.send(
    'Runtime.evaluate',
    { expression: expr, returnByValue: true, awaitPromise: true },
    s,
  );
  await cdp.send('Target.closeTarget', { targetId });
  if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
  return result.value;
}

async function cmdServe() {
  await startServer();
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}/index.html`);
  console.log('Ctrl-C to stop.');
  await new Promise(() => {});
}

// ---------------------------------------------------------------- main

const [cmd = 'check', ...rest] = process.argv.slice(2);
try {
  if (cmd === 'check') await cmdCheck();
  else if (cmd === 'shot') await cmdShot(rest[0] || 'index.html');
  else if (cmd === 'dom') await cmdDom(rest[0] || 'index.html');
  else if (cmd === 'eval') await cmdEval(rest[0], rest.slice(1).join(' '));
  else if (cmd === 'serve') await cmdServe();
  else {
    console.error(`unknown command: ${cmd}
commands:
  check                 render every page, verify css/images/links, screenshot all
  shot <page>           full-page screenshot of one page
  dom <page>            print the rendered DOM
  eval <page> <expr>    evaluate JS in the page and print the result
  serve                 just serve the site (foreground)`);
    process.exitCode = 2;
  }
} catch (e) {
  console.error('driver error:', e.message);
  process.exitCode = 1;
}
