// Engine of the PAALHU booking register. Used by the CLI (bookings.mjs, for the team)
// and the website chat (src/controllers/chatController.js).
// Reads config.json (tables, shifts, policy) and reads/writes the given JSON register.
// Every creation, change, cancellation and waiting-list entry is also appended to the history
// (<register>-history.jsonl, one line per event), which is never rewritten: it is the permanent record.
// Returns objects; each interface decides what to show (the customer chat never sees other customers' data).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const cfg = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
export const DEFAULT_DATA = path.join(DIR, 'bookings.json');
const TABLES = new Map(cfg.tables.map(t => [t.id, t.seats]));
export const CAPACITY = cfg.tables.reduce((s, t) => s + t.seats, 0);
const POLICY = cfg.policy;
// Day keys as used in config.json (index = JavaScript getUTCDay(), 0 = Sunday), and their display names.
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_NAMES = { sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday' };

// Input data error (badly written date, unknown id...). The CLI exits with 1.
export class InputError extends Error {}
const fail = msg => { throw new InputError(msg); };

// ---------- utilities ----------
export const minutes = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t ?? ''); if (!m) fail(`Invalid time: "${t}" (use HH:MM)`); return +m[1] * 60 + +m[2]; };
const hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function checkDate(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d ?? '');
  const date = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!date || date.toISOString().slice(0, 10) !== d) fail(`Invalid date: "${d}" (use YYYY-MM-DD)`);
  return date;
}
const dayKey = d => DAYS[checkDate(d).getUTCDay()];
export const dayName = d => DAY_NAMES[dayKey(d)];
const addDays = (d, n) => { const date = checkDate(d); date.setUTCDate(date.getUTCDate() + n); return date.toISOString().slice(0, 10); };
export const shiftsOn = d => cfg.shifts[dayKey(d)] ?? [];
export const shiftAt = (d, t) => shiftsOn(d).find(s => minutes(t) >= minutes(s.from) && minutes(t) <= minutes(s.to));
const moment = (d, t) => new Date(`${d}T${t}:00`);
export const seats = ids => ids.reduce((s, id) => s + TABLES.get(id), 0);
export const guestCount = v => { const n = Number(v); if (!Number.isInteger(n) || n < 1) fail(`Invalid number of guests: "${v}"`); return n; };
const text = v => (v === true || v == null ? '' : String(v));

// Opens a booking register on a file. `now` sets the current time (tests).
export function openRegister({ data = DEFAULT_DATA, now: fixedNow } = {}) {
  const DATA = path.resolve(data);
  const HISTORY = DATA.replace(/\.json$/i, '') + '-history.jsonl';
  const now = () => fixedNow ? new Date(fixedNow) : new Date();

  function load() {
    if (!fs.existsSync(DATA)) return { bookings: [], waitlist: [] };
    const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));
    db.bookings ??= []; db.waitlist ??= [];
    return db;
  }
  const save = db => fs.writeFileSync(DATA, JSON.stringify(db, null, 2) + '\n');
  const record = (action, fields) => fs.appendFileSync(HISTORY, JSON.stringify({ at: now().toISOString(), action, ...fields }) + '\n');
  const newId = (list, prefix, d) => {
    const base = `${prefix}-${d.replaceAll('-', '')}-`;
    return base + String(list.filter(r => r.id.startsWith(base)).length + 1).padStart(3, '0');
  };

  // ---------- occupancy and assignment ----------
  const active = (db, d, s, except) => db.bookings.filter(r => r.status === 'confirmed' && r.date === d && r.shift === s && r.id !== except);
  function occupancy(db, d, s, except) {
    const bookings = active(db, d, s, except);
    const used = new Set(bookings.flatMap(r => r.tables));
    const taken = seats([...used]);
    const free = cfg.tables.map(t => t.id).filter(id => !used.has(id));
    const status = free.length === 0 ? 'FULL' : taken >= POLICY.nearly_full_from_seats ? 'NEARLY FULL' : 'AVAILABLE';
    const shift = shiftsOn(d).find(x => x.id === s) ?? { id: s, name: s };
    return { date: d, shift: s, shiftName: shift.name, bookings, free, taken, capacity: CAPACITY, guests: bookings.reduce((sum, r) => sum + r.guests, 0), status };
  }

  // Best combination of free tables for n guests: one table, or 2–3 adjacent ones in the same row.
  // Criteria: fewest spare seats, then fewest tables, then dining-room order.
  function assign(free, n) {
    const isFree = new Set(free), options = [];
    for (const id of free) options.push([id]);
    for (const row of cfg.joinable)
      for (let i = 0; i < row.length; i++)
        for (let len = 2; len <= 3 && i + len <= row.length; len++) {
          const run = row.slice(i, i + len);
          if (run.every(id => isFree.has(id))) options.push(run);
        }
    const order = id => cfg.tables.findIndex(t => t.id === id);
    return options
      .filter(o => seats(o) >= n)
      .sort((a, b) => (seats(a) - n) - (seats(b) - n) || a.length - b.length || order(a[0]) - order(b[0]))[0] ?? null;
  }

  function checkTables(list, free, n) {
    const ids = String(list).split(/[,+ ]+/).filter(Boolean).map(s => s.toUpperCase());
    for (const id of ids) if (!TABLES.has(id)) fail(`Unknown table: ${id}. Tables: ${[...TABLES.keys()].join(', ')}`);
    const taken = ids.filter(id => !free.includes(id));
    if (taken.length) return { error: `Table(s) already taken in that shift: ${taken.join(', ')}` };
    if (ids.length > 1 && !cfg.joinable.some(row => { const i = row.indexOf(ids[0]); return i >= 0 && ids.every((id, k) => row[i + k] === id); }))
      return { error: `Tables ${ids.join('+')} are not adjacent in the same row, so they can't be joined.` };
    if (seats(ids) < n) return { error: `${ids.join('+')} has ${seats(ids)} seats; ${n} guests don't fit.` };
    return { tables: ids };
  }

  // Does (date, time, n) fit? → { ok, shift, tables, occupancy } or { ok:false, reason, rule?, closed?, noShift?, past?, occupancy? }
  function check(db, d, t, n, except, requestedTables) {
    if (n > POLICY.max_group)
      return { ok: false, rule: true, reason: `Group of ${n}: the maximum per booking is ${POLICY.max_group} guests. Larger groups are handled by email with the owners (${cfg.email}); there is no published group menu.` };
    const ss = shiftsOn(d);
    if (!ss.length) return { ok: false, closed: true, reason: `The restaurant is closed on ${dayName(d)} ${d}.` };
    const s = shiftAt(d, t);
    if (!s) {
      const list = ss.map(x => `${x.name} (arrivals ${x.from}–${x.to})`).join('; ');
      return { ok: false, noShift: true, reason: `There is no shift at ${t} on ${dayName(d)}. Shifts that day: ${list}.` };
    }
    if (moment(d, t) < now()) return { ok: false, past: true, reason: `${d} ${t} has already passed.` };
    const o = occupancy(db, d, s.id, except);
    if (requestedTables) {
      const v = checkTables(requestedTables, o.free, n);
      return v.error ? { ok: false, shift: s, reason: v.error, occupancy: o } : { ok: true, shift: s, tables: v.tables, occupancy: o };
    }
    const tables = assign(o.free, n);
    return tables ? { ok: true, shift: s, tables, occupancy: o }
      : { ok: false, shift: s, occupancy: o, reason: `A group of ${n} doesn't fit in ${s.name} on ${dayName(d)} ${d}: ${o.status}, ${o.taken}/${CAPACITY} seats taken, free tables: ${o.free.join(', ') || 'none'}.` };
  }

  // Alternatives, in this order: the same service (lunch/dinner) that day, that service over the next 7 days,
  // and finally the other service on the same day. Within each group, the closest to the requested time.
  function alternatives(db, d, t, n, except) {
    const requested = minutes(t);
    const service = requested >= 18 * 60 || requested < 6 * 60 ? 'dinner' : 'lunch';
    const current = shiftAt(d, t)?.id;
    // The requested time if it falls within the shift; otherwise the closest one allowed in that shift.
    const timeIn = s => {
      if (requested >= minutes(s.from) && requested <= minutes(s.to)) return t;
      const m = Math.min(Math.max(requested, minutes(s.from)), minutes(s.to));
      return hhmm(m - (m % 15));
    };
    const closest = (a, b) => Math.abs(minutes(a.from) - requested) - Math.abs(minutes(b.from) - requested);
    const options = [];
    const sameDay = shiftsOn(d).filter(s => s.id !== current).sort(closest);
    sameDay.filter(s => s.id.startsWith(service)).forEach(s => options.push([d, s]));
    for (let i = 1; i <= 7; i++) {
      const d2 = addDays(d, i);
      const s = shiftsOn(d2).find(x => x.id === current) ?? shiftsOn(d2).filter(x => x.id.startsWith(service)).sort(closest)[0];
      if (s) options.push([d2, s]);
    }
    sameDay.filter(s => !s.id.startsWith(service)).forEach(s => options.push([d, s]));
    const out = [];
    for (const [d2, s] of options) {
      if (out.length >= 3) break;
      const time = timeIn(s);
      const c = check(db, d2, time, n, except);
      if (c.ok) out.push({ date: d2, time, shift: s, tables: c.tables, occupancy: c.occupancy });
    }
    return out;
  }

  const refusal = (db, c, d, t, n, except) => ({ ...c, ok: false, alternatives: c.rule ? [] : alternatives(db, d, t, n, except) });

  const waitlistThatFits = (db, d, s) => db.waitlist
    .filter(e => e.status === 'waiting' && e.date === d && e.shift === s)
    .filter(e => check(db, e.date, e.time, e.guests).ok);

  // ---------- operations ----------
  return {
    shifts(d) {
      checkDate(d);
      const db = load();
      return shiftsOn(d).map(s => ({ ...s, occupancy: occupancy(db, d, s.id) }));
    },

    availability(d, t, g, { tables } = {}) {
      checkDate(d); const n = guestCount(g); const db = load();
      const c = check(db, d, t, n, undefined, tables);
      return c.ok ? c : refusal(db, c, d, t, n);
    },

    add({ date: d, time: t, guests: g, name, phone, notes, tables, fromWaitlist, origin = 'team' }) {
      checkDate(d); const n = guestCount(g);
      if (!text(name).trim() || !text(phone).trim()) fail('Missing --name and/or --phone.');
      const db = load();
      const c = check(db, d, t, n, undefined, tables);
      if (!c.ok) return refusal(db, c, d, t, n);
      const r = { id: newId(db.bookings, 'R', d), date: d, time: t, shift: c.shift.id, guests: n, tables: c.tables,
        name: text(name).trim(), phone: text(phone).trim(), notes: text(notes), status: 'confirmed', origin, created: now().toISOString() };
      db.bookings.push(r);
      if (fromWaitlist) { const e = db.waitlist.find(x => x.id === fromWaitlist); if (e) e.status = 'served'; }
      save(db);
      record('add', { origin, booking: r });
      return { ok: true, booking: r, shift: c.shift, occupancy: occupancy(db, d, r.shift) };
    },

    change(id, { date, time, guests: g, notes, tables: requestedTables, origin = 'team' } = {}) {
      const db = load();
      const r = db.bookings.find(x => x.id === id && x.status === 'confirmed');
      if (!r) fail(`No confirmed booking with id "${id}". Use: node bookings.mjs search <name>`);
      const d = date ?? r.date, t = time ?? r.time, n = g != null ? guestCount(g) : r.guests;
      checkDate(d);
      let tables = r.tables, shift = r.shift;
      if (d !== r.date || t !== r.time || n !== r.guests || requestedTables) {
        // If it stays in the same shift and its current table still works, it keeps that table.
        const s = shiftAt(d, t);
        const keeps = !requestedTables && s && d === r.date && s.id === r.shift && seats(r.tables) >= n;
        const c = check(db, d, t, n, r.id, requestedTables ?? (keeps ? r.tables.join(',') : undefined));
        if (!c.ok) return { ...refusal(db, c, d, t, n, r.id), booking: r };
        tables = c.tables; shift = c.shift.id;
      }
      const before = { ...r }, shiftBefore = r.shift, dateBefore = r.date;
      Object.assign(r, { date: d, time: t, guests: n, tables, shift, notes: notes === undefined ? r.notes : text(notes), modified: now().toISOString() });
      save(db);
      record('change', { origin, before, booking: r });
      const moved = dateBefore !== r.date || shiftBefore !== r.shift;
      return { ok: true, before, booking: r, occupancy: occupancy(db, r.date, r.shift),
        previousOccupancy: moved ? occupancy(db, dateBefore, shiftBefore) : null,
        waitlistThatFits: moved ? waitlistThatFits(db, dateBefore, shiftBefore) : [] };
    },

    cancel(id, { origin = 'team' } = {}) {
      const db = load();
      const r = db.bookings.find(x => x.id === id);
      if (!r) fail(`No booking with id "${id}". Use: node bookings.mjs search <name>`);
      if (r.status !== 'confirmed') fail(`Booking ${r.id} was already ${r.status}.`);
      const hours = (moment(r.date, r.time) - now()) / 36e5;
      r.status = 'cancelled'; r.cancelledAt = now().toISOString();
      r.lateCancellation = hours < POLICY.free_cancellation_hours;
      save(db);
      record('cancel', { origin, booking: r });
      return { ok: true, booking: r, hours, late: r.lateCancellation, freeCancellationHours: POLICY.free_cancellation_hours, deposit: POLICY.deposit,
        occupancy: occupancy(db, r.date, r.shift), waitlistThatFits: waitlistThatFits(db, r.date, r.shift) };
    },

    waitlist({ date: d, time: t, guests: g, name, phone, notes, origin = 'team' }) {
      checkDate(d); const n = guestCount(g);
      if (!text(name).trim() || !text(phone).trim()) fail('Missing --name and/or --phone.');
      const s = shiftAt(d, t);
      if (!s) fail(`There is no shift at ${t} on ${dayName(d)} ${d}.`);
      const db = load();
      const e = { id: newId(db.waitlist, 'W', d), date: d, time: t, shift: s.id, guests: n, name: text(name).trim(), phone: text(phone).trim(),
        notes: text(notes), status: 'waiting', origin, created: now().toISOString() };
      db.waitlist.push(e);
      save(db);
      record('waitlist', { origin, entry: e });
      const position = db.waitlist.filter(x => x.status === 'waiting' && x.date === d && x.shift === s.id).length;
      return { ok: true, entry: e, shift: s, position };
    },

    // All bookings in any status (cancelled ones too), by date and time.
    all({ from, to } = {}) {
      if (from) checkDate(from);
      if (to) checkDate(to);
      return load().bookings
        .filter(r => (!from || r.date >= from) && (!to || r.date <= to))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.id.localeCompare(b.id));
    },

    // Events from the permanent history, in the order they happened.
    events() {
      if (!fs.existsSync(HISTORY)) return [];
      return fs.readFileSync(HISTORY, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    },

    historyFile: HISTORY,

    get(id) { return load().bookings.find(r => r.id === id) ?? null; },

    search(q) {
      const s = String(q ?? '').toLowerCase();
      return load().bookings
        .filter(r => r.status === 'confirmed' && [r.id, r.name, r.phone].some(v => String(v).toLowerCase().includes(s)))
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    },

    // Markdown booking sheet with fixed columns: Time | Name | Guests | Table | Notes.
    sheet(d0, days = 1) {
      checkDate(d0);
      const db = load(), out = [];
      for (let i = 0; i < days; i++) {
        const d = addDays(d0, i);
        out.push(`## ${dayName(d)} ${d}\n`);
        const ss = shiftsOn(d);
        if (!ss.length) { out.push('Closed.\n'); continue; }
        for (const s of ss) {
          const o = occupancy(db, d, s.id);
          out.push(`### ${s.name} (${s.from}) — ${o.taken}/${CAPACITY} seats · ${o.guests} guests · ${o.status}\n`);
          if (o.bookings.length) {
            out.push('| Time | Name | Guests | Table | Notes |\n|---|---|---|---|---|');
            for (const r of o.bookings.sort((a, b) => a.time.localeCompare(b.time) || a.tables[0].localeCompare(b.tables[0], 'en', { numeric: true })))
              out.push(`| ${r.time} | ${r.name} | ${r.guests} | ${r.tables.join('+')} | ${(r.notes || '—').replaceAll('|', '/')} |`);
          } else out.push('No bookings.');
          out.push(`\nFree tables: ${o.free.join(', ') || 'none'}`);
          const waiting = db.waitlist.filter(e => e.status === 'waiting' && e.date === d && e.shift === s.id);
          if (waiting.length) out.push(`Waiting list: ${waiting.map(e => `${e.name} (${e.guests}, ${e.time}, ${e.phone})`).join('; ')}`);
          out.push('');
        }
      }
      return out.join('\n');
    },
  };
}
