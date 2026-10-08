#!/usr/bin/env node
// PAALHU booking register (CLI for the team): assigns table and shift, tracks capacity and the waiting list.
// The logic lives in reservas-core.mjs, which the web server also uses.
//
//   node reservas.mjs turnos       <date>
//   node reservas.mjs disponibilidad <date> <time> <guests>
//   node reservas.mjs alta         <date> <time> <guests> --nombre "García" --telefono "600..." [--notas "..."] [--mesas M7,M8] [--de-espera E-...]
//   node reservas.mjs cambiar      <id> [--fecha ...] [--hora ...] [--personas ...] [--notas ...] [--mesas ...]
//   node reservas.mjs cancelar     <id>
//   node reservas.mjs espera       <date> <time> <guests> --nombre "..." --telefono "..." [--notas "..."]
//   node reservas.mjs buscar       <text>
//   node reservas.mjs cuadro       <date> [--dias 7]
//   node reservas.mjs historial    [--desde <date>] [--hasta <date>] [--csv file.csv] [--eventos]
//
// Dates YYYY-MM-DD, times HH:MM. --ahora "YYYY-MM-DDTHH:MM" sets the current time (for tests).
// Exit: 0 = done, 2 = doesn't fit / refused by a rule (alternatives are proposed), 1 = input data error.
import fs from 'node:fs';
import { abrirLibro, DatoError, AFORO, diaTxt, plazas } from './reservas-core.mjs';

const pos = [], opt = {};
for (let a = process.argv.slice(2), i = 0; i < a.length; i++) {
  if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[i + 1]?.startsWith('--') || a[i + 1] === undefined ? true : a[++i];
  else pos.push(a[i]);
}
const val = v => (v === true ? undefined : v);
const libro = abrirLibro({ datos: val(opt.datos), ahora: val(opt.ahora) });

// Madrid date and time "YYYY-MM-DD HH:MM" from an ISO string stored in UTC.
const horaMadrid = iso => iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16) : '';
const linea = r => `${r.id} · ${diaTxt(r.fecha)} ${r.fecha} ${r.hora} · ${r.turno} · ${r.personas} guests · table ${r.mesas.join('+')} · ${r.nombre} · ${r.telefono}${r.notas ? ' · notes: ' + r.notas : ''}`;
const aviso = o => `${o.estado} — ${o.nombreTurno} ${diaTxt(o.fecha)} ${o.fecha}: ${o.ocup}/${AFORO} seats taken (${o.comensales} guests), free tables: ${o.libres.join(', ') || 'none'}`;
const avisarEspera = lista => lista.forEach(e => console.log(`NOTIFY WAITING LIST — now fits: ${e.id} · ${e.nombre} · ${e.telefono} · ${e.personas} guests ${e.hora}`));

function imprimirRechazo(c, f, h, n) {
  console.log(`DOESN'T FIT — ${c.motivo}`);
  if (c.norma) process.exit(2);
  if (c.alternativas.length) {
    console.log('Alternatives with room:');
    for (const a of c.alternativas) console.log(`  - ${diaTxt(a.fecha)} ${a.fecha} ${a.hora} · ${a.turno.nombre} · table ${a.mesas.join('+')} · ${a.o.ocup}/${AFORO} seats taken`);
  } else console.log('No alternatives with room in the next 7 days.');
  console.log(`Waiting list: node reservas.mjs espera ${f} ${h} ${n} --nombre "..." --telefono "..."`);
  process.exit(2);
}

const cmd = pos.shift();
try {
  switch (cmd) {
    case 'turnos': {
      const f = pos[0], ts = libro.turnos(f);
      if (!ts.length) { console.log(`${diaTxt(f)} ${f}: closed.`); break; }
      for (const t of ts) console.log(`${t.id} (arrivals ${t.desde}–${t.hasta}) · ${aviso(t.o)}`);
      break;
    }

    case 'disponibilidad': {
      const [f, h, p] = pos;
      const c = libro.disponibilidad(f, h, p, { mesas: val(opt.mesas) });
      if (!c.ok) imprimirRechazo(c, f, h, p);
      console.log(`FITS — ${c.turno.nombre} ${diaTxt(f)} ${f} ${h}: ${p} guests at table ${c.mesas.join('+')} (${plazas(c.mesas)} seats).`);
      console.log(`Before booking: ${c.o.ocup}/${AFORO} seats taken · ${c.o.estado}`);
      break;
    }

    case 'alta': {
      const [f, h, p] = pos;
      const c = libro.alta({ fecha: f, hora: h, personas: p, nombre: val(opt.nombre), telefono: val(opt.telefono), notas: opt.notas, mesas: val(opt.mesas), deEspera: val(opt['de-espera']) });
      if (!c.ok) imprimirRechazo(c, f, h, p);
      console.log(`BOOKED — ${linea(c.reserva)}`);
      console.log(aviso(c.o));
      break;
    }

    case 'cambiar': {
      const c = libro.cambiar(pos[0], { fecha: val(opt.fecha), hora: val(opt.hora), personas: val(opt.personas), notas: opt.notas, mesas: val(opt.mesas) });
      if (!c.ok) {
        const r = c.reserva;
        console.log(`UNCHANGED — booking ${r.id} stays as it was (${r.fecha} ${r.hora}, table ${r.mesas.join('+')}).`);
        imprimirRechazo(c, val(opt.fecha) ?? r.fecha, val(opt.hora) ?? r.hora, val(opt.personas) ?? r.personas);
      }
      console.log(`BEFORE  — ${linea(c.antes)}`);
      console.log(`NOW     — ${linea(c.reserva)}`);
      console.log(aviso(c.o));
      if (c.oAnterior) { console.log(aviso(c.oAnterior)); avisarEspera(c.esperaQueCabe); }
      break;
    }

    case 'cancelar': {
      const c = libro.cancelar(pos[0]);
      console.log(`CANCELLED — ${linea(c.reserva)}`);
      console.log(c.tardia
        ? `Note: cancelled ${Math.max(0, c.horas).toFixed(1)} h in advance (free cancellation period: ${c.plazoHoras} h). ${c.deposito ? 'The deposit policy applies.' : 'There is no deposit: nothing is charged; it is recorded as a late cancellation.'}`
        : `Within the ${c.plazoHoras} h period: no charge.`);
      console.log(`Table ${c.reserva.mesas.join('+')} is free again.`);
      console.log(aviso(c.o));
      avisarEspera(c.esperaQueCabe);
      break;
    }

    case 'espera': {
      const [f, h, p] = pos;
      const { entrada: e, turno: t, posicion } = libro.espera({ fecha: f, hora: h, personas: p, nombre: val(opt.nombre), telefono: val(opt.telefono), notas: val(opt.notas) });
      console.log(`ON WAITING LIST — ${e.id} · ${t.nombre} ${diaTxt(f)} ${f} ${h} · ${e.personas} guests · ${e.nombre} · ${e.telefono} · position ${posicion}`);
      break;
    }

    case 'buscar': {
      const q = pos.join(' ');
      const hits = libro.buscar(q);
      if (!hits.length) { console.log(`No confirmed bookings matching "${q.toLowerCase()}".`); process.exit(2); }
      for (const r of hits) console.log(linea(r));
      break;
    }

    case 'cuadro':
      console.log(libro.cuadro(pos[0], Number(val(opt.dias) ?? 1)));
      break;

    // Every booking ever made (cancelled ones too), or with --eventos every creation, change and cancellation.
    case 'historial': {
      if (opt.eventos) {
        const evs = libro.eventos();
        if (!evs.length) { console.log('The history is empty.'); break; }
        for (const e of evs) {
          const r = e.reserva ?? e.entrada;
          console.log(`${horaMadrid(e.cuando)} ·${e.accion.toUpperCase()} · ${e.origen} · ${r.id} · ${r.fecha} ${r.hora} · ${r.personas} guests · ${r.nombre}`
            + (e.antes ? ` (before: ${e.antes.fecha} ${e.antes.hora}, ${e.antes.personas} guests)` : ''));
        }
        console.log(`\nFile: ${libro.archivoHistorial}`);
        break;
      }
      const rs = libro.todas({ desde: val(opt.desde), hasta: val(opt.hasta) });
      const cols = ['Reference', 'Date', 'Time', 'Guests', 'Name', 'Phone', 'Notes', 'Status', 'Origin', 'Created'];
      const fila = r => [r.id, r.fecha, r.hora, r.personas, r.nombre, r.telefono, r.notas || '', ({ confirmada: 'confirmed', cancelada: 'cancelled' }[r.estado] ?? r.estado) + (r.cancelacion_tardia ? ' (late)' : ''),
        r.origen ?? '', horaMadrid(r.creada)];
      if (val(opt.csv)) {
        // ";" separator and BOM so that Excel with Spanish regional settings opens it correctly.
        const celda = v => /[";\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v);
        fs.writeFileSync(opt.csv, '﻿' + [cols, ...rs.map(fila)].map(f => f.map(celda).join(';')).join('\r\n') + '\r\n');
        console.log(`${rs.length} bookings exported to ${opt.csv}`);
        break;
      }
      if (!rs.length) { console.log('No bookings.'); break; }
      console.log(`| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|`);
      for (const r of rs) console.log(`| ${fila(r).map(v => String(v).replaceAll('|', '/') || '—').join(' | ')} |`);
      const n = estado => rs.filter(r => r.estado === estado).length;
      console.log(`\n${rs.length} bookings · ${n('confirmada')} confirmed · ${n('cancelada')} cancelled`);
      break;
    }

    default:
      console.log('usage: node reservas.mjs turnos|disponibilidad|alta|cambiar|cancelar|espera|buscar|cuadro|historial ... (see the file header)');
      process.exit(1);
  }
} catch (e) {
  if (!(e instanceof DatoError)) throw e;
  console.error(e.message);
  process.exit(1);
}
