// Input validators shared by the booking chat (controllers/chatController.js) and the order pricer
// (.claude/skills/paalhu-assistant/order_total.mjs).
// Each validator returns the clean value or throws a ValidationError with a message the customer can read.
export class ValidationError extends Error {}
const fail = msg => { throw new ValidationError(msg); };

const isText = v => typeof v === 'string' && v.trim() !== '';
const isNumeric = s => s.trim() !== '' && !Number.isNaN(Number(s));
const toNumber = v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);

// ---------- orders ----------
export function price(v) {
  const n = toNumber(v);
  if (!Number.isFinite(n) || n <= 0) fail(`Invalid price: "${v}" (must be a number greater than 0).`);
  return n;
}

export function quantity(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n <= 0) fail(`Invalid quantity: "${v}" (must be a whole number greater than 0).`);
  return n;
}

// Dish and drink names: non-empty text that isn't just a number.
const itemName = kind => v => {
  if (!isText(v) || isNumeric(v)) fail(`Invalid ${kind}: "${v}" (must be a name, not a number).`);
  return v.trim();
};
export const dish = itemName('dish');
export const drink = itemName('drink');

// ---------- bookings ----------
// Tables are ids like "M7"; the number after the M must be a whole number greater than 0.
export function table(v) {
  const m = /^M?(\d+)$/i.exec(String(v ?? '').trim());
  const n = m ? Number(m[1]) : NaN;
  if (!Number.isInteger(n) || n <= 0) fail(`Invalid table: "${v}" (must be a table number greater than 0).`);
  return `M${n}`;
}

// 9 digits. Spaces, dots, dashes and a +34 / 0034 prefix are accepted and removed.
export function phone(v) {
  const s = String(v ?? '').replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
  if (!/^\d{9}$/.test(s)) fail(`Invalid phone: "${v}" (must have 9 digits).`);
  return s;
}

export function name(v) {
  if (!isText(v) || v.trim().length <= 2) fail(`Invalid name: "${v}" (must be more than 2 characters).`);
  return v.trim();
}

export function guests(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n <= 0 || n >= 15) fail(`Invalid number of guests: "${v}" (must be a whole number from 1 to 14).`);
  return n;
}

// YYYY-MM-DD, strictly after today (Madrid time, see process.env.TZ in server.js).
export function date(v, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.toISOString().slice(0, 10) !== v) fail(`Invalid date: "${v}" (use YYYY-MM-DD).`);
  const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
  if (v <= today) fail(`Invalid date: ${v}. Bookings must be for a day after today (${today}).`);
  return v;
}
