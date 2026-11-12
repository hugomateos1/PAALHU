#!/usr/bin/env node
// PAALHU booking register (CLI for the team): assigns table and shift, tracks capacity and the waiting list.
// The logic lives in bookings-core.mjs, which the web server also uses.
//
//   node bookings.mjs shifts       <date>
//   node bookings.mjs availability <date> <time> <guests>
//   node bookings.mjs add          <date> <time> <guests> --name "García" --phone "600..." [--notes "..."] [--tables M7,M8] [--from-waitlist W-...]
//   node bookings.mjs change       <id> [--date ...] [--time ...] [--guests ...] [--notes ...] [--tables ...]
//   node bookings.mjs cancel       <id>
//   node bookings.mjs waitlist     <date> <time> <guests> --name "..." --phone "..." [--notes "..."]
//   node bookings.mjs search       <text>
//   node bookings.mjs sheet        <date> [--days 7]
//   node bookings.mjs history      [--from <date>] [--to <date>] [--csv file.csv] [--events]
//
// Dates YYYY-MM-DD, times HH:MM. --now "YYYY-MM-DDTHH:MM" sets the current time (for tests).
// Exit: 0 = done, 2 = doesn't fit / refused by a rule (alternatives are proposed), 1 = input data error.
import fs from 'node:fs';
import { openRegister, InputError, CAPACITY, dayName, seats } from './bookings-core.mjs';

const pos = [], opt = {};
for (let a = process.argv.slice(2), i = 0; i < a.length; i++) {
  if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[i + 1]?.startsWith('--') || a[i + 1] === undefined ? true : a[++i];
  else pos.push(a[i]);
}
const val = v => (v === true ? undefined : v);
const register = openRegister({ data: val(opt.data), now: val(opt.now) });

// Madrid date and time "YYYY-MM-DD HH:MM" from an ISO string stored in UTC.
const madridTime = iso => iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16) : '';
const line = r => `${r.id} · ${dayName(r.date)} ${r.date} ${r.time} · ${r.shift} · ${r.guests} guests · table ${r.tables.join('+')} · ${r.name} · ${r.phone}${r.notes ? ' · notes: ' + r.notes : ''}`;
const summary = o => `${o.status} — ${o.shiftName} ${dayName(o.date)} ${o.date}: ${o.taken}/${CAPACITY} seats taken (${o.guests} guests), free tables: ${o.free.join(', ') || 'none'}`;
const notifyWaitlist = list => list.forEach(e => console.log(`NOTIFY WAITING LIST — now fits: ${e.id} · ${e.name} · ${e.phone} · ${e.guests} guests ${e.time}`));

function printRefusal(c, d, t, n) {
  console.log(`DOESN'T FIT — ${c.reason}`);
  if (c.rule) process.exit(2);
  if (c.alternatives.length) {
    console.log('Alternatives with room:');
    for (const a of c.alternatives) console.log(`  - ${dayName(a.date)} ${a.date} ${a.time} · ${a.shift.name} · table ${a.tables.join('+')} · ${a.occupancy.taken}/${CAPACITY} seats taken`);
  } else console.log('No alternatives with room in the next 7 days.');
  console.log(`Waiting list: node bookings.mjs waitlist ${d} ${t} ${n} --name "..." --phone "..."`);
  process.exit(2);
}

const cmd = pos.shift();
try {
  switch (cmd) {
    case 'shifts': {
      const d = pos[0], ss = register.shifts(d);
      if (!ss.length) { console.log(`${dayName(d)} ${d}: closed.`); break; }
      for (const s of ss) console.log(`${s.id} (arrivals ${s.from}–${s.to}) · ${summary(s.occupancy)}`);
      break;
    }

    case 'availability': {
      const [d, t, g] = pos;
      const c = register.availability(d, t, g, { tables: val(opt.tables) });
      if (!c.ok) printRefusal(c, d, t, g);
      console.log(`FITS — ${c.shift.name} ${dayName(d)} ${d} ${t}: ${g} guests at table ${c.tables.join('+')} (${seats(c.tables)} seats).`);
      console.log(`Before booking: ${c.occupancy.taken}/${CAPACITY} seats taken · ${c.occupancy.status}`);
      break;
    }

    case 'add': {
      const [d, t, g] = pos;
      const c = register.add({ date: d, time: t, guests: g, name: val(opt.name), phone: val(opt.phone), notes: opt.notes, tables: val(opt.tables), fromWaitlist: val(opt['from-waitlist']) });
      if (!c.ok) printRefusal(c, d, t, g);
      console.log(`BOOKED — ${line(c.booking)}`);
      console.log(summary(c.occupancy));
      break;
    }

    case 'change': {
      const c = register.change(pos[0], { date: val(opt.date), time: val(opt.time), guests: val(opt.guests), notes: opt.notes, tables: val(opt.tables) });
      if (!c.ok) {
        const r = c.booking;
        console.log(`UNCHANGED — booking ${r.id} stays as it was (${r.date} ${r.time}, table ${r.tables.join('+')}).`);
        printRefusal(c, val(opt.date) ?? r.date, val(opt.time) ?? r.time, val(opt.guests) ?? r.guests);
      }
      console.log(`BEFORE  — ${line(c.before)}`);
      console.log(`NOW     — ${line(c.booking)}`);
      console.log(summary(c.occupancy));
      if (c.previousOccupancy) { console.log(summary(c.previousOccupancy)); notifyWaitlist(c.waitlistThatFits); }
      break;
    }

    case 'cancel': {
      const c = register.cancel(pos[0]);
      console.log(`CANCELLED — ${line(c.booking)}`);
      console.log(c.late
        ? `Note: cancelled ${Math.max(0, c.hours).toFixed(1)} h in advance (free cancellation period: ${c.freeCancellationHours} h). ${c.deposit ? 'The deposit policy applies.' : 'There is no deposit: nothing is charged; it is recorded as a late cancellation.'}`
        : `Within the ${c.freeCancellationHours} h period: no charge.`);
      console.log(`Table ${c.booking.tables.join('+')} is free again.`);
      console.log(summary(c.occupancy));
      notifyWaitlist(c.waitlistThatFits);
      break;
    }

    case 'waitlist': {
      const [d, t, g] = pos;
      const { entry: e, shift: s, position } = register.waitlist({ date: d, time: t, guests: g, name: val(opt.name), phone: val(opt.phone), notes: val(opt.notes) });
      console.log(`ON WAITING LIST — ${e.id} · ${s.name} ${dayName(d)} ${d} ${t} · ${e.guests} guests · ${e.name} · ${e.phone} · position ${position}`);
      break;
    }

    case 'search': {
      const q = pos.join(' ');
      const hits = register.search(q);
      if (!hits.length) { console.log(`No confirmed bookings matching "${q.toLowerCase()}".`); process.exit(2); }
      for (const r of hits) console.log(line(r));
      break;
    }

    case 'sheet':
      console.log(register.sheet(pos[0], Number(val(opt.days) ?? 1)));
      break;

    // Every booking ever made (cancelled ones too), or with --events every creation, change and cancellation.
    case 'history': {
      if (opt.events) {
        const evs = register.events();
        if (!evs.length) { console.log('The history is empty.'); break; }
        for (const e of evs) {
          const r = e.booking ?? e.entry;
          console.log(`${madridTime(e.at)} · ${e.action.toUpperCase()} · ${e.origin} · ${r.id} · ${r.date} ${r.time} · ${r.guests} guests · ${r.name}`
            + (e.before ? ` (before: ${e.before.date} ${e.before.time}, ${e.before.guests} guests)` : ''));
        }
        console.log(`\nFile: ${register.historyFile}`);
        break;
      }
      const rs = register.all({ from: val(opt.from), to: val(opt.to) });
      const cols = ['Reference', 'Date', 'Time', 'Guests', 'Name', 'Phone', 'Notes', 'Status', 'Origin', 'Created'];
      const row = r => [r.id, r.date, r.time, r.guests, r.name, r.phone, r.notes || '', r.status + (r.lateCancellation ? ' (late)' : ''),
        r.origin ?? '', madridTime(r.created)];
      if (val(opt.csv)) {
        // ";" separator and BOM so that Excel with Spanish regional settings opens it correctly.
        const cell = v => /[";\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
        fs.writeFileSync(opt.csv, '﻿' +[cols, ...rs.map(row)].map(f => f.map(cell).join(';')).join('\r\n') + '\r\n');
        console.log(`${rs.length} bookings exported to ${opt.csv}`);
        break;
      }
      if (!rs.length) { console.log('No bookings.'); break; }
      console.log(`| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|`);
      for (const r of rs) console.log(`| ${row(r).map(v => String(v).replaceAll('|', '/') || '—').join(' | ')} |`);
      const count = status => rs.filter(r => r.status === status).length;
      console.log(`\n${rs.length} bookings · ${count('confirmed')} confirmed · ${count('cancelled')} cancelled`);
      break;
    }

    default:
      console.log('usage: node bookings.mjs shifts|availability|add|change|cancel|waitlist|search|sheet|history ... (see the file header)');
      process.exit(1);
  }
} catch (e) {
  if (!(e instanceof InputError)) throw e;
  console.error(e.message);
  process.exit(1);
}
