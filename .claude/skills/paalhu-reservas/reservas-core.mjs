// Motor del libro de reservas de PAALHU. Lo usan la CLI (reservas.mjs, para el equipo)
// y el servidor web (server.js, chat de clientes).
// Lee config.json (mesas, turnos, política) y lee/escribe el registro JSON indicado.
// Además, cada alta, cambio, cancelación y entrada en lista de espera se añade al historial
// (<registro>-historial.jsonl, una línea por evento), que nunca se reescribe: es el archivo permanente.
// Devuelve objetos; cada interfaz decide qué mostrar (el chat de clientes nunca ve datos de otros clientes).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const cfg = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
export const DATOS_POR_DEFECTO = path.join(DIR, 'reservas.json');
const MESAS = new Map(cfg.mesas.map(m => [m.id, m.plazas]));
export const AFORO = cfg.mesas.reduce((s, m) => s + m.plazas, 0);
const POL = cfg.politica;
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const DIAS_TXT = { miercoles: 'miércoles', sabado: 'sábado' };

// Error de datos de entrada (fecha mal escrita, id inexistente...). La CLI sale con 1.
export class DatoError extends Error {}
const fail = msg => { throw new DatoError(msg); };

// ---------- utilidades ----------
export const min = h => { const m = /^(\d{1,2}):(\d{2})$/.exec(h ?? ''); if (!m) fail(`Hora no válida: "${h}" (usa HH:MM)`); return +m[1] * 60 + +m[2]; };
const hhmm = n => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
export function checkFecha(f) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f ?? '');
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.toISOString().slice(0, 10) !== f) fail(`Fecha no válida: "${f}" (usa YYYY-MM-DD)`);
  return d;
}
const diaDe = f => DIAS[checkFecha(f).getUTCDay()];
export const diaTxt = f => { const d = diaDe(f); return DIAS_TXT[d] ?? d; };
const sumarDias = (f, n) => { const d = checkFecha(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const turnosDe = f => cfg.turnos[diaDe(f)] ?? [];
export const turnoDe = (f, h) => turnosDe(f).find(t => min(h) >= min(t.desde) && min(h) <= min(t.hasta));
const momento = (f, h) => new Date(`${f}T${h}:00`);
export const plazas = ids => ids.reduce((s, id) => s + MESAS.get(id), 0);
export const personas = v => { const n = Number(v); if (!Number.isInteger(n) || n < 1) fail(`Número de personas no válido: "${v}"`); return n; };
const texto = v => (v === true || v == null ? '' : String(v));

// Abre un libro de reservas sobre un archivo. `ahora` fija el momento actual (pruebas).
export function abrirLibro({ datos = DATOS_POR_DEFECTO, ahora } = {}) {
  const DATOS = path.resolve(datos);
  const HISTORIAL = DATOS.replace(/\.json$/i, '') + '-historial.jsonl';
  const now = () => ahora ? new Date(ahora) : new Date();

  function cargar() {
    if (!fs.existsSync(DATOS)) return { reservas: [], espera: [] };
    const db = JSON.parse(fs.readFileSync(DATOS, 'utf8'));
    db.reservas ??= []; db.espera ??= [];
    return db;
  }
  const guardar = db => fs.writeFileSync(DATOS, JSON.stringify(db, null, 2) + '\n');
  const anotar = (accion, datos) => fs.appendFileSync(HISTORIAL, JSON.stringify({ cuando: now().toISOString(), accion, ...datos }) + '\n');
  const nuevoId = (lista, pref, f) => {
    const base = `${pref}-${f.replaceAll('-', '')}-`;
    return base + String(lista.filter(r => r.id.startsWith(base)).length + 1).padStart(3, '0');
  };

  // ---------- ocupación y asignación ----------
  const activas = (db, f, t, salvo) => db.reservas.filter(r => r.estado === 'confirmada' && r.fecha === f && r.turno === t && r.id !== salvo);
  function ocupacion(db, f, t, salvo) {
    const rs = activas(db, f, t, salvo);
    const usadas = new Set(rs.flatMap(r => r.mesas));
    const ocup = plazas([...usadas]);
    const libres = cfg.mesas.map(m => m.id).filter(id => !usadas.has(id));
    const estado = libres.length === 0 ? 'COMPLETO' : ocup >= POL.casi_completo_desde_plazas ? 'CASI COMPLETO' : 'DISPONIBLE';
    const turno = turnosDe(f).find(x => x.id === t) ?? { id: t, nombre: t };
    return { fecha: f, turno: t, nombreTurno: turno.nombre, rs, libres, ocup, aforo: AFORO, comensales: rs.reduce((s, r) => s + r.personas, 0), estado };
  }

  // Mejor combinación de mesas libres para n personas: una mesa, o 2–3 seguidas de la misma fila.
  // Criterio: menos plazas sobrantes, luego menos mesas, luego el orden del salón.
  function asignar(libres, n) {
    const libre = new Set(libres), cands = [];
    for (const id of libres) cands.push([id]);
    for (const fila of cfg.juntables)
      for (let i = 0; i < fila.length; i++)
        for (let len = 2; len <= 3 && i + len <= fila.length; len++) {
          const tramo = fila.slice(i, i + len);
          if (tramo.every(id => libre.has(id))) cands.push(tramo);
        }
    const orden = id => cfg.mesas.findIndex(m => m.id === id);
    return cands
      .filter(c => plazas(c) >= n)
      .sort((a, b) => (plazas(a) - n) - (plazas(b) - n) || a.length - b.length || orden(a[0]) - orden(b[0]))[0] ?? null;
  }

  function validarMesas(lista, libres, n) {
    const ids = String(lista).split(/[,+ ]+/).filter(Boolean).map(s => s.toUpperCase());
    for (const id of ids) if (!MESAS.has(id)) fail(`Mesa desconocida: ${id}. Mesas: ${[...MESAS.keys()].join(', ')}`);
    const ocupadas = ids.filter(id => !libres.includes(id));
    if (ocupadas.length) return { error: `Mesa(s) ya ocupada(s) en ese turno: ${ocupadas.join(', ')}` };
    if (ids.length > 1 && !cfg.juntables.some(f => { const i = f.indexOf(ids[0]); return i >= 0 && ids.every((id, k) => f[i + k] === id); }))
      return { error: `Las mesas ${ids.join('+')} no están seguidas en la misma fila; no se pueden juntar.` };
    if (plazas(ids) < n) return { error: `${ids.join('+')} tiene ${plazas(ids)} plazas; no caben ${n} personas.` };
    return { mesas: ids };
  }

  // ¿Cabe (fecha, hora, n)? → { ok, turno, mesas, o } o { ok:false, motivo, norma?, cerrado?, o? }
  function comprobar(db, f, h, n, salvo, mesasPedidas) {
    if (n > POL.grupo_maximo)
      return { ok: false, norma: true, motivo: `Grupo de ${n}: el máximo por reserva es ${POL.grupo_maximo} personas. Los grupos mayores se tratan por email con los dueños (${cfg.email}); no hay menú de grupos publicado.` };
    const ts = turnosDe(f);
    if (!ts.length) return { ok: false, cerrado: true, motivo: `El ${diaTxt(f)} ${f} el restaurante está cerrado.` };
    const t = turnoDe(f, h);
    if (!t) {
      const servicios = ts.map(x => `${x.nombre} (llegadas ${x.desde}–${x.hasta})`).join('; ');
      return { ok: false, sinTurno: true, motivo: `A las ${h} del ${diaTxt(f)} no hay turno. Turnos de ese día: ${servicios}.` };
    }
    if (momento(f, h) < now()) return { ok: false, pasado: true, motivo: `${f} ${h} ya ha pasado.` };
    const o = ocupacion(db, f, t.id, salvo);
    if (mesasPedidas) {
      const v = validarMesas(mesasPedidas, o.libres, n);
      return v.error ? { ok: false, turno: t, motivo: v.error, o } : { ok: true, turno: t, mesas: v.mesas, o };
    }
    const mesas = asignar(o.libres, n);
    return mesas ? { ok: true, turno: t, mesas, o }
      : { ok: false, turno: t, o, motivo: `No cabe un grupo de ${n} en ${t.nombre} del ${diaTxt(f)} ${f}: ${o.estado}, ${o.ocup}/${AFORO} plazas ocupadas, mesas libres: ${o.libres.join(', ') || 'ninguna'}.` };
  }

  // Alternativas, en este orden: el mismo servicio (comida/cena) ese día, ese servicio los 7 días siguientes,
  // y por último el otro servicio del mismo día. Dentro de cada grupo, lo más cercano a la hora pedida.
  function alternativas(db, f, h, n, salvo) {
    const pedida = min(h);
    const servicio = pedida >= 18 * 60 || pedida < 6 * 60 ? 'cena' : 'comida';
    const actual = turnoDe(f, h)?.id;
    // La hora pedida si cae dentro del turno; si no, la más cercana admitida en ese turno.
    const horaEn = t => {
      if (pedida >= min(t.desde) && pedida <= min(t.hasta)) return h;
      const m = Math.min(Math.max(pedida, min(t.desde)), min(t.hasta));
      return hhmm(m - (m % 15));
    };
    const cerca = (a, b) => Math.abs(min(a.desde) - pedida) - Math.abs(min(b.desde) - pedida);
    const cands = [];
    const hoy = turnosDe(f).filter(t => t.id !== actual).sort(cerca);
    hoy.filter(t => t.id.startsWith(servicio)).forEach(t => cands.push([f, t]));
    for (let d = 1; d <= 7; d++) {
      const f2 = sumarDias(f, d);
      const t = turnosDe(f2).find(x => x.id === actual) ?? turnosDe(f2).filter(x => x.id.startsWith(servicio)).sort(cerca)[0];
      if (t) cands.push([f2, t]);
    }
    hoy.filter(t => !t.id.startsWith(servicio)).forEach(t => cands.push([f, t]));
    const out = [];
    for (const [f2, t] of cands) {
      if (out.length >= 3) break;
      const hora = horaEn(t);
      const c = comprobar(db, f2, hora, n, salvo);
      if (c.ok) out.push({ fecha: f2, hora, turno: t, mesas: c.mesas, o: c.o });
    }
    return out;
  }

  const rechazo = (db, c, f, h, n, salvo) => ({ ...c, ok: false, alternativas: c.norma ? [] : alternativas(db, f, h, n, salvo) });

  const esperaQueCabe = (db, f, t) => db.espera
    .filter(e => e.estado === 'esperando' && e.fecha === f && e.turno === t)
    .filter(e => comprobar(db, e.fecha, e.hora, e.personas).ok);

  // ---------- operaciones ----------
  return {
    turnos(f) {
      checkFecha(f);
      const db = cargar();
      return turnosDe(f).map(t => ({ ...t, o: ocupacion(db, f, t.id) }));
    },

    disponibilidad(f, h, p, { mesas } = {}) {
      checkFecha(f); const n = personas(p); const db = cargar();
      const c = comprobar(db, f, h, n, undefined, mesas);
      return c.ok ? c : rechazo(db, c, f, h, n);
    },

    alta({ fecha: f, hora: h, personas: p, nombre, telefono, notas, mesas, deEspera, origen = 'equipo' }) {
      checkFecha(f); const n = personas(p);
      if (!texto(nombre).trim() || !texto(telefono).trim()) fail('Faltan --nombre y/o --telefono.');
      const db = cargar();
      const c = comprobar(db, f, h, n, undefined, mesas);
      if (!c.ok) return rechazo(db, c, f, h, n);
      const r = { id: nuevoId(db.reservas, 'R', f), fecha: f, hora: h, turno: c.turno.id, personas: n, mesas: c.mesas,
        nombre: texto(nombre).trim(), telefono: texto(telefono).trim(), notas: texto(notas), estado: 'confirmada', origen, creada: now().toISOString() };
      db.reservas.push(r);
      if (deEspera) { const e = db.espera.find(x => x.id === deEspera); if (e) e.estado = 'atendida'; }
      guardar(db);
      anotar('alta', { origen, reserva: r });
      return { ok: true, reserva: r, turno: c.turno, o: ocupacion(db, f, r.turno) };
    },

    cambiar(id, { fecha, hora, personas: p, notas, mesas: mesasPedidas, origen = 'equipo' } = {}) {
      const db = cargar();
      const r = db.reservas.find(x => x.id === id && x.estado === 'confirmada');
      if (!r) fail(`No hay ninguna reserva confirmada con id "${id}". Usa: node reservas.mjs buscar <nombre>`);
      const f = fecha ?? r.fecha, h = hora ?? r.hora, n = p != null ? personas(p) : r.personas;
      checkFecha(f);
      let mesas = r.mesas, turno = r.turno;
      if (f !== r.fecha || h !== r.hora || n !== r.personas || mesasPedidas) {
        // Si sigue en el mismo turno y la mesa actual vale, se queda en su mesa.
        const t = turnoDe(f, h);
        const mantiene = !mesasPedidas && t && f === r.fecha && t.id === r.turno && plazas(r.mesas) >= n;
        const c = comprobar(db, f, h, n, r.id, mesasPedidas ?? (mantiene ? r.mesas.join(',') : undefined));
        if (!c.ok) return { ...rechazo(db, c, f, h, n, r.id), reserva: r };
        mesas = c.mesas; turno = c.turno.id;
      }
      const antes = { ...r }, turnoAntes = r.turno, fechaAntes = r.fecha;
      Object.assign(r, { fecha: f, hora: h, personas: n, mesas, turno, notas: notas === undefined ? r.notas : texto(notas), modificada: now().toISOString() });
      guardar(db);
      anotar('cambio', { origen, antes, reserva: r });
      const movido = fechaAntes !== r.fecha || turnoAntes !== r.turno;
      return { ok: true, antes, reserva: r, o: ocupacion(db, r.fecha, r.turno),
        oAnterior: movido ? ocupacion(db, fechaAntes, turnoAntes) : null,
        esperaQueCabe: movido ? esperaQueCabe(db, fechaAntes, turnoAntes) : [] };
    },

    cancelar(id, { origen = 'equipo' } = {}) {
      const db = cargar();
      const r = db.reservas.find(x => x.id === id);
      if (!r) fail(`No hay ninguna reserva con id "${id}". Usa: node reservas.mjs buscar <nombre>`);
      if (r.estado !== 'confirmada') fail(`La reserva ${r.id} ya estaba ${r.estado}.`);
      const horas = (momento(r.fecha, r.hora) - now()) / 36e5;
      r.estado = 'cancelada'; r.cancelada_en = now().toISOString();
      r.cancelacion_tardia = horas < POL.cancelacion_sin_cargo_horas;
      guardar(db);
      anotar('cancelacion', { origen, reserva: r });
      return { ok: true, reserva: r, horas, tardia: r.cancelacion_tardia, plazoHoras: POL.cancelacion_sin_cargo_horas, deposito: POL.deposito,
        o: ocupacion(db, r.fecha, r.turno), esperaQueCabe: esperaQueCabe(db, r.fecha, r.turno) };
    },

    espera({ fecha: f, hora: h, personas: p, nombre, telefono, notas, origen = 'equipo' }) {
      checkFecha(f); const n = personas(p);
      if (!texto(nombre).trim() || !texto(telefono).trim()) fail('Faltan --nombre y/o --telefono.');
      const t = turnoDe(f, h);
      if (!t) fail(`A las ${h} del ${diaTxt(f)} ${f} no hay turno.`);
      const db = cargar();
      const e = { id: nuevoId(db.espera, 'E', f), fecha: f, hora: h, turno: t.id, personas: n, nombre: texto(nombre).trim(), telefono: texto(telefono).trim(),
        notas: texto(notas), estado: 'esperando', origen, creada: now().toISOString() };
      db.espera.push(e);
      guardar(db);
      anotar('espera', { origen, entrada: e });
      const posicion = db.espera.filter(x => x.estado === 'esperando' && x.fecha === f && x.turno === t.id).length;
      return { ok: true, entrada: e, turno: t, posicion };
    },

    // Todas las reservas en cualquier estado (también las canceladas), por fecha y hora.
    todas({ desde, hasta } = {}) {
      if (desde) checkFecha(desde);
      if (hasta) checkFecha(hasta);
      return cargar().reservas
        .filter(r => (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta))
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora) || a.id.localeCompare(b.id));
    },

    // Eventos del historial permanente, en el orden en que pasaron.
    eventos() {
      if (!fs.existsSync(HISTORIAL)) return [];
      return fs.readFileSync(HISTORIAL, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
    },

    archivoHistorial: HISTORIAL,

    obtener(id) { return cargar().reservas.find(r => r.id === id) ?? null; },

    buscar(q) {
      const s = String(q ?? '').toLowerCase();
      return cargar().reservas
        .filter(r => r.estado === 'confirmada' && [r.id, r.nombre, r.telefono].some(v => String(v).toLowerCase().includes(s)))
        .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    },

    // Cuadro en Markdown con columnas fijas: Hora | Nombre | Personas | Mesa | Notas.
    cuadro(f0, dias = 1) {
      checkFecha(f0);
      const db = cargar(), out = [];
      for (let d = 0; d < dias; d++) {
        const f = sumarDias(f0, d);
        out.push(`## ${diaTxt(f)} ${f}\n`);
        const ts = turnosDe(f);
        if (!ts.length) { out.push('Cerrado.\n'); continue; }
        for (const t of ts) {
          const o = ocupacion(db, f, t.id);
          out.push(`### ${t.nombre} (${t.desde}) — ${o.ocup}/${AFORO} plazas · ${o.comensales} comensales · ${o.estado}\n`);
          if (o.rs.length) {
            out.push('| Hora | Nombre | Personas | Mesa | Notas |\n|---|---|---|---|---|');
            for (const r of o.rs.sort((a, b) => a.hora.localeCompare(b.hora) || a.mesas[0].localeCompare(b.mesas[0], 'es', { numeric: true })))
              out.push(`| ${r.hora} | ${r.nombre} | ${r.personas} | ${r.mesas.join('+')} | ${(r.notas || '—').replaceAll('|', '/')} |`);
          } else out.push('Sin reservas.');
          out.push(`\nMesas libres: ${o.libres.join(', ') || 'ninguna'}`);
          const esp = db.espera.filter(e => e.estado === 'esperando' && e.fecha === f && e.turno === t.id);
          if (esp.length) out.push(`Lista de espera: ${esp.map(e => `${e.nombre} (${e.personas}, ${e.hora}, ${e.telefono})`).join('; ')}`);
          out.push('');
        }
      }
      return out.join('\n');
    },
  };
}
