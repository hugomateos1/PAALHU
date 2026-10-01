#!/usr/bin/env node
// Libro de reservas de PAALHU (CLI para el equipo): asigna mesa y turno, controla el aforo y la lista de espera.
// La lógica vive en reservas-core.mjs, que también usa el servidor web.
//
//   node reservas.mjs turnos       <fecha>
//   node reservas.mjs disponibilidad <fecha> <hora> <personas>
//   node reservas.mjs alta         <fecha> <hora> <personas> --nombre "García" --telefono "600..." [--notas "..."] [--mesas M7,M8] [--de-espera E-...]
//   node reservas.mjs cambiar      <id> [--fecha ...] [--hora ...] [--personas ...] [--notas ...] [--mesas ...]
//   node reservas.mjs cancelar     <id>
//   node reservas.mjs espera       <fecha> <hora> <personas> --nombre "..." --telefono "..." [--notas "..."]
//   node reservas.mjs buscar       <texto>
//   node reservas.mjs cuadro       <fecha> [--dias 7]
//
// Fechas YYYY-MM-DD, horas HH:MM. --ahora "YYYY-MM-DDTHH:MM" fija el momento actual (para pruebas).
// Salida: 0 = hecho, 2 = no cabe / rechazado por norma (se proponen alternativas), 1 = error de datos.
import { abrirLibro, DatoError, AFORO, diaTxt, plazas } from './reservas-core.mjs';

const pos = [], opt = {};
for (let a = process.argv.slice(2), i = 0; i < a.length; i++) {
  if (a[i].startsWith('--')) opt[a[i].slice(2)] = a[i + 1]?.startsWith('--') || a[i + 1] === undefined ? true : a[++i];
  else pos.push(a[i]);
}
const val = v => (v === true ? undefined : v);
const libro = abrirLibro({ datos: val(opt.datos), ahora: val(opt.ahora) });

const linea = r => `${r.id} · ${diaTxt(r.fecha)} ${r.fecha} ${r.hora} · ${r.turno} · ${r.personas} pers. · mesa ${r.mesas.join('+')} · ${r.nombre} · ${r.telefono}${r.notas ? ' · notas: ' + r.notas : ''}`;
const aviso = o => `${o.estado} — ${o.nombreTurno} ${diaTxt(o.fecha)} ${o.fecha}: ${o.ocup}/${AFORO} plazas ocupadas (${o.comensales} comensales), mesas libres: ${o.libres.join(', ') || 'ninguna'}`;
const avisarEspera = lista => lista.forEach(e => console.log(`AVISAR LISTA DE ESPERA — ahora cabe: ${e.id} · ${e.nombre} · ${e.telefono} · ${e.personas} pers. ${e.hora}`));

function imprimirRechazo(c, f, h, n) {
  console.log(`NO CABE — ${c.motivo}`);
  if (c.norma) process.exit(2);
  if (c.alternativas.length) {
    console.log('Alternativas con sitio:');
    for (const a of c.alternativas) console.log(`  - ${diaTxt(a.fecha)} ${a.fecha} ${a.hora} · ${a.turno.nombre} · mesa ${a.mesas.join('+')} · ${a.o.ocup}/${AFORO} plazas ocupadas`);
  } else console.log('No hay alternativas con sitio en los próximos 7 días.');
  console.log(`Lista de espera: node reservas.mjs espera ${f} ${h} ${n} --nombre "..." --telefono "..."`);
  process.exit(2);
}

const cmd = pos.shift();
try {
  switch (cmd) {
    case 'turnos': {
      const f = pos[0], ts = libro.turnos(f);
      if (!ts.length) { console.log(`${diaTxt(f)} ${f}: cerrado.`); break; }
      for (const t of ts) console.log(`${t.id} (llegadas ${t.desde}–${t.hasta}) · ${aviso(t.o)}`);
      break;
    }

    case 'disponibilidad': {
      const [f, h, p] = pos;
      const c = libro.disponibilidad(f, h, p, { mesas: val(opt.mesas) });
      if (!c.ok) imprimirRechazo(c, f, h, p);
      console.log(`CABE — ${c.turno.nombre} ${diaTxt(f)} ${f} ${h}: ${p} pers. en mesa ${c.mesas.join('+')} (${plazas(c.mesas)} plazas).`);
      console.log(`Antes de reservar: ${c.o.ocup}/${AFORO} plazas ocupadas · ${c.o.estado}`);
      break;
    }

    case 'alta': {
      const [f, h, p] = pos;
      const c = libro.alta({ fecha: f, hora: h, personas: p, nombre: val(opt.nombre), telefono: val(opt.telefono), notas: opt.notas, mesas: val(opt.mesas), deEspera: val(opt['de-espera']) });
      if (!c.ok) imprimirRechazo(c, f, h, p);
      console.log(`RESERVADA — ${linea(c.reserva)}`);
      console.log(aviso(c.o));
      break;
    }

    case 'cambiar': {
      const c = libro.cambiar(pos[0], { fecha: val(opt.fecha), hora: val(opt.hora), personas: val(opt.personas), notas: opt.notas, mesas: val(opt.mesas) });
      if (!c.ok) {
        const r = c.reserva;
        console.log(`SIN CAMBIOS — la reserva ${r.id} sigue como estaba (${r.fecha} ${r.hora}, mesa ${r.mesas.join('+')}).`);
        imprimirRechazo(c, val(opt.fecha) ?? r.fecha, val(opt.hora) ?? r.hora, val(opt.personas) ?? r.personas);
      }
      console.log(`ANTES   — ${linea(c.antes)}`);
      console.log(`AHORA   — ${linea(c.reserva)}`);
      console.log(aviso(c.o));
      if (c.oAnterior) { console.log(aviso(c.oAnterior)); avisarEspera(c.esperaQueCabe); }
      break;
    }

    case 'cancelar': {
      const c = libro.cancelar(pos[0]);
      console.log(`CANCELADA — ${linea(c.reserva)}`);
      console.log(c.tardia
        ? `Aviso: cancelada con ${Math.max(0, c.horas).toFixed(1)} h de antelación (plazo sin cargo: ${c.plazoHoras} h). ${c.deposito ? 'Se aplica la política de depósito.' : 'No hay depósito: no se cobra nada; queda anotado como cancelación tardía.'}`
        : `Dentro del plazo de ${c.plazoHoras} h: sin cargo.`);
      console.log(`Mesa ${c.reserva.mesas.join('+')} libre de nuevo.`);
      console.log(aviso(c.o));
      avisarEspera(c.esperaQueCabe);
      break;
    }

    case 'espera': {
      const [f, h, p] = pos;
      const { entrada: e, turno: t, posicion } = libro.espera({ fecha: f, hora: h, personas: p, nombre: val(opt.nombre), telefono: val(opt.telefono), notas: val(opt.notas) });
      console.log(`EN LISTA DE ESPERA — ${e.id} · ${t.nombre} ${diaTxt(f)} ${f} ${h} · ${e.personas} pers. · ${e.nombre} · ${e.telefono} · posición ${posicion}`);
      break;
    }

    case 'buscar': {
      const q = pos.join(' ');
      const hits = libro.buscar(q);
      if (!hits.length) { console.log(`Sin reservas confirmadas que coincidan con "${q.toLowerCase()}".`); process.exit(2); }
      for (const r of hits) console.log(linea(r));
      break;
    }

    case 'cuadro':
      console.log(libro.cuadro(pos[0], Number(val(opt.dias) ?? 1)));
      break;

    default:
      console.log('uso: node reservas.mjs turnos|disponibilidad|alta|cambiar|cancelar|espera|buscar|cuadro ... (ver cabecera del archivo)');
      process.exit(1);
  }
} catch (e) {
  if (!(e instanceof DatoError)) throw e;
  console.error(e.message);
  process.exit(1);
}
