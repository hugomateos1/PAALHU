#!/usr/bin/env node
// Prices a PAALHU order from the menu in reference.md.
//   node order_total.mjs "2x Chicken tikka masala" "1x Garlic naan" "Set menu"
// Exits 1 if any dish is unknown or ambiguous.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ref = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'reference.md'), 'utf8');
const menu = [...ref.matchAll(/^- (.+?) — €(\d+\.\d{2})$/gm)].map(([, name, price]) => ({ name, cents: Math.round(price * 100) }));
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
const eur = c => `€${(c / 100).toFixed(2)}`;

const items = process.argv.slice(2);
if (!items.length) { console.log('usage: node order_total.mjs "2x Dish name" ["1x Other dish" ...]'); process.exit(1); }

let total = 0, errors = [];
for (const raw of items) {
  const m = raw.trim().match(/^(\d+)\s*x?\s+(.+)$/i);
  const qty = m ? Number(m[1]) : 1, query = norm(m ? m[2] : raw);
  const exact = menu.filter(d => norm(d.name) === query);
  const hits = exact.length ? exact : menu.filter(d => norm(d.name).includes(query));
  if (hits.length !== 1) {
    errors.push(`"${raw}": ${hits.length ? 'ambiguous — ' + hits.map(h => h.name).join(' / ') : 'not on the menu'}`);
    continue;
  }
  const line = qty * hits[0].cents;
  total += line;
  console.log(`${String(qty).padStart(2)} x ${hits[0].name.padEnd(24)} ${eur(hits[0].cents).padStart(7)}  ${eur(line).padStart(8)}`);
}
if (errors.length) { console.error('\nCannot price:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`${'TOTAL (VAT included)'.padEnd(38)} ${eur(total).padStart(8)}`);
