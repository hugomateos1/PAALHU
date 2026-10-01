---
name: run-web-programming
description: Run, serve, screenshot and verify the PAALHU static restaurant site (HTML/CSS, no build step). Use when asked to run, start, serve, preview, screenshot, render, or visually check this site, to confirm a CSS or markup change actually renders, or to check pages for broken images, dead links and missing stylesheets.
---

# Run the PAALHU site

A static multi-page HTML/CSS site (a Web Application Programming course
project). **No build step, no package.json, no dependencies** — the pages
are opened directly.

The agent path is `driver.mjs`: it serves the repo over `node:http`, drives
headless Chrome over the DevTools Protocol using Node's built-in
`WebSocket`, and reports per-page rendering facts plus full-page
screenshots. **Zero `npm install`** — only Node and Chrome are needed.

All paths below are relative to the repo root (the directory holding
`index.html`).

## Prerequisites

Already present on this machine; nothing to install.

- **Node >= 22** (verified on v26.9.0) — needs the global `WebSocket`,
  which the driver checks for implicitly.
- **Google Chrome** — found at
  `C:/Program Files/Google/Chrome/Application/chrome.exe` (verified
  Chrome/154.0.8037.92). The driver also probes the x86 path,
  `%LOCALAPPDATA%`, Edge, and the usual Linux locations. Override with
  `CHROME_PATH=/path/to/chrome`.

No `apt-get`/`npm`/`pip` step exists for this project. There is nothing to
build.

## Run (agent path) — do this first

From the repo root:

```bash
node .claude/skills/run-web-programming/driver.mjs check
```

This serves the site, loads **all 8 pages** in headless Chrome, writes a
full-page PNG per page to `.screenshots/`, and prints for each page: title,
`h1`, text length, stylesheet + CSS rule count, computed body background and
font, image load results, link count, and `nav`'s computed `display`. It
flags `NO-CSS`, `BROKEN-IMG`, `DEAD-LINK`, `NET:`, `CONSOLE:` and
`EMPTY-BODY`, and **exits 1 if any page has a problem.**

Expected current output: 7 pages `ok`, and
`starter_practice_page.html` **FAIL** on `BROKEN-IMG:featured.jpg` — that
one is a known pre-existing gap, see Gotchas. Treat *any other* failure as
a real regression.

Other subcommands (all verified):

```bash
# full-page screenshot of one page -> .screenshots/pages_menu.png
node .claude/skills/run-web-programming/driver.mjs shot pages/menu.html

# print the rendered DOM (post-parse, as Chrome sees it)
node .claude/skills/run-web-programming/driver.mjs dom pages/location.html

# evaluate JS in the page — the tool for inspecting computed CSS
node .claude/skills/run-web-programming/driver.mjs eval pages/menu.html "document.querySelectorAll('main li').length"

# just serve it, foreground, Ctrl-C to stop
node .claude/skills/run-web-programming/driver.mjs serve
```

`eval` is how you verify a CSS change took effect. Real example that
diagnosed the nav bug below:

```bash
node .claude/skills/run-web-programming/driver.mjs eval index.html "JSON.stringify({navDisplay:getComputedStyle(document.querySelector('nav')).display, navChildren:[...document.querySelector('nav').children].map(e=>e.tagName), ulDisplay:getComputedStyle(document.querySelector('nav ul')).display, firstLiTop:document.querySelector('nav li').getBoundingClientRect().top, lastLiTop:[...document.querySelectorAll('nav li')].pop().getBoundingClientRect().top})"
```

→ `{"navDisplay":"flex","navChildren":["UL"],"ulDisplay":"block","firstLiTop":330.2,"lastLiTop":522.2}`

**After taking a screenshot, actually open the PNG.** The driver reports
that CSS loaded; it cannot tell you the layout looks wrong.

The driver derives the repo root from its own location, so it works from
any working directory:

```bash
cd pages && node ../.claude/skills/run-web-programming/driver.mjs eval index.html "document.title"
```

## Run (human path)

There is no dev server and no `npm start`. Either:

```bash
node .claude/skills/run-web-programming/driver.mjs serve   # http://127.0.0.1:8111/index.html
```

or just double-click `index.html` — the site is pure static files and works
over `file://` too. Prefer `serve`: over `file://` the root-relative
behaviour and 404s differ from how the site is actually hosted.

## Test

There is no test suite — no test runner, no CI workflow, nothing to run.
`driver.mjs check` **is** the test suite for this project; its exit code is
the signal.

## Pages

`index.html` is the hub; the six `pages/*.html` are leaf pages each linking
back via `../index.html`. All seven share the single stylesheet
`css/styles.css` (10 rules).

`starter_practice_page.html` is **unrelated** to PAALHU — it is a separate
lab exercise ("DevNews", course G247) with its own `practice-styles.css`
(8 rules). It is included in `check` on purpose so its state stays visible.

## Gotchas

- **`starter_practice_page.html` references `featured.jpg`, which does not
  exist in the repo.** Confirmed: `ls featured.jpg` → missing. This is why
  `check` exits 1 out of the box. It is the unfinished lab exercise, not a
  regression — don't "fix" it by inventing an image. The expected clean
  state is *exactly* this one failure.
- **The nav never became a horizontal bar.** `css/styles.css` puts
  `display:flex; justify-content:space-between` on `nav`, but `nav`'s only
  child is the `<ul>` — so the flex container has one item, the `<ul>`
  stays `display:block`, and the `<li>`s stack vertically (first `li` top
  330px, last 522px). `justify-content` does nothing. To get a row, the
  flex belongs on `nav ul` (or set `nav ul { display:flex }`). The
  screenshot shows this clearly; the CSS reads as though it works.
- **Chrome requests `/favicon.ico` on every navigation and the site ships
  none.** That produced a spurious `404` + console error on every page. The
  driver filters it via `IGNORE_URL`. If you add real asset checks, don't
  undo that filter or every page goes red.
- **`index.html` carries legacy presentational attributes**
  (`<body bgcolor text link vlink>`) *alongside* `css/styles.css`, which
  sets the same colours. The CSS wins; the attributes are dead weight. The
  other pages have a bare `<body>`. If you change the body background in
  CSS and index.html doesn't follow, this is why to check both.
- **`starter_practice_page.html` has a transparent body background**
  (`rgba(0,0,0,0)`) and falls back to Times New Roman, because
  `practice-styles.css` styles neither. Only the PAALHU pages get the cream
  `rgb(255,245,230)` + Georgia. `check` prints both, so don't read the
  practice page's values as a PAALHU regression.
- **Two stylesheets, one site.** A past reorg commit deleted
  `menu.css`, `edit_about_us.css`, `setmenu&Location.css` and
  `spice_guide&ophours.css`, consolidating into `css/styles.css`. If you
  find a doc or commit referencing those, it is stale.
- **The driver runs Chrome with a throwaway profile** in the temp dir and
  deletes it on exit. Don't point `--user-data-dir` at a real profile;
  headless Chrome will refuse if that profile is already open.
- **`check` is sequential and launches one Chrome for all 8 pages** —
  roughly 10–15s total. It is not flaky, but it is not instant. `shot` on a
  single page is the fast path.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `driver error: listen EADDRINUSE: address already in use 127.0.0.1:8111` | Something already holds the port — usually a `serve` you left running, or a stray `python -m http.server`. Either kill it (`netstat -ano \| grep :8111 \| grep LISTENING` then `taskkill //PID <pid> //F`) or run on another port: `PAALHU_PORT=8222 PAALHU_CDP_PORT=9444 node ... shot index.html` (verified working). |
| `No Chrome/Edge found. Set CHROME_PATH to the browser binary.` | Chrome isn't in any probed location. `CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node ... check` |
| `Chrome never opened a debugger on port 9333` | A previous run's Chrome is still holding the CDP port. `taskkill //IM chrome.exe //F` kills *all* Chrome including the user's real browser — prefer `PAALHU_CDP_PORT=9444`. |
| Chrome stderr noise about `external_registry_loader_win.cc` / `Missing value path for key Software\Google\Chrome\Extensions\...` | Harmless Windows extension-registry warning on every headless launch. The driver swallows Chrome's stderr for this reason. Not an error. |
| A page reports `0 rules` / `NO-CSS` | The `<link rel="stylesheet">` href is wrong for that page's depth. Root pages use `css/styles.css`, `pages/*.html` use `../css/styles.css`. |
| `check` passes but the page looks wrong in the PNG | Expected — `check` verifies CSS *loaded*, not that it's *correct*. Use `eval` with `getComputedStyle` / `getBoundingClientRect` to assert layout, as in the nav example above. |
| Screenshots missing | They land in `.screenshots/` at the repo root (gitignored), named after the page with `/` → `_`, e.g. `pages_set-menu.png`. |
