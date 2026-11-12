// Input validators shared by the booking chat (controllers/chatController.js) and the order pricer
// (.claude/skills/paalhu-assistant/order_total_validator.mjs). The CRUD API uses src/validators/ instead.
// The limits are the same as the CRUD validators', and phone and date reuse validators/common.js.
// Unlike the CRUD validators (which collect every problem for a form), these check one value at a time:
// each returns the clean value or throws a ValidationError with a message the customer can read.
// The error also says which field was wrong. HTTP status codes are chosen by the controllers, not here.
import { cleanPhone, isRealDate } from './validators/common.js';

export class ValidationError extends Error {
  constructor(message, field) { super(message); this.field = field; }
}
const fail = (msg, field) => { throw new ValidationError(msg, field); };

const isText = v => typeof v === 'string' && v.trim() !== '';
const isNumeric = s => s.trim() !== '' && !Number.isNaN(Number(s));
const toNumber = v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);

// ---------- orders (order pricer) ----------
// Same range as a dish price in dishesValidator.js.
export function price(v) {
  const n = toNumber(v);
  if (!Number.isFinite(n) || n < 0.5 || n > 50) fail(`Invalid price: "${v}" (must be a number from 0.50 to 50.00).`, 'price');
  return n;
}

export function quantity(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n <= 0) fail(`Invalid quantity: "${v}" (must be a whole number greater than 0).`, 'quantity');
  return n;
}

// Dish names: 2 to 60 characters (as in dishesValidator.js) and not just a number.
export function dish(v) {
  if (!isText(v) || isNumeric(v) || v.trim().length < 2 || v.trim().length > 60)
    fail(`Invalid dish: "${v}" (must be a name of 2 to 60 characters, not a number).`, 'dish');
  return v.trim();
}

// ---------- bookings (chat) ----------
// 9 digits. Spaces, dots, dashes and a +34 / 0034 prefix are accepted and removed (common.js).
export function phone(v) {
  const s = cleanPhone(typeof v === 'number' ? String(v) : v);
  if (!s) fail(`Invalid phone: "${v}" (must have 9 digits).`, 'phone');
  return s;
}

// 3 to 50 characters, as in reservationsValidator.js.
export function name(v) {
  if (!isText(v) || v.trim().length < 3 || v.trim().length > 50) fail(`Invalid name: "${v}" (must have 3 to 50 characters).`, 'name');
  return v.trim();
}

// 1 to 12, as in reservationsValidator.js.
export function guests(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n < 1 || n > 12) fail(`Invalid number of guests: "${v}" (must be a whole number from 1 to 12).`, 'guests');
  return n;
}

// A real YYYY-MM-DD date (common.js), strictly after today (Madrid time, see process.env.TZ in server.js).
// "After today" is only for chat bookings; staff can register any date through the CRUD API.
export function date(v, now = new Date()) {
  if (!isRealDate(v)) fail(`Invalid date: "${v}" (use YYYY-MM-DD).`, 'date');
  const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
  if (v <= today) fail(`Invalid date: ${v}. Bookings must be for a day after today (${today}).`, 'date');
  return v;
}
