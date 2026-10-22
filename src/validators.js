// Input validators shared by the booking chat (controllers/chatController.js) and the order pricer
// (.claude/skills/paalhu-assistant/order_total_validator.mjs).
// Each validator returns the clean value or throws a ValidationError with a message the customer can read.
// The error also says which field was wrong. HTTP status codes are chosen by the controllers, not here.
export class ValidationError extends Error {
  constructor(message, field) { super(message); this.field = field; }
}
const fail = (msg, field) => { throw new ValidationError(msg, field); };

const isText = v => typeof v === 'string' && v.trim() !== '';
const isNumeric = s => s.trim() !== '' && !Number.isNaN(Number(s));
const toNumber = v => (typeof v === 'string' && v.trim() !== '' ? Number(v) : typeof v === 'number' ? v : NaN);
const minutes = hhmm => +hhmm.slice(0, 2) * 60 + +hhmm.slice(3);

// Optional text: absent or empty gives '', otherwise trimmed and at most `max` characters.
const optionalText = (field, label, max) => v => {
  if (v === undefined || v === null) return '';
  if (typeof v !== 'string') fail(`Invalid ${label}: must be text.`, field);
  if (v.trim().length > max) fail(`${label[0].toUpperCase() + label.slice(1)} too long (maximum ${max} characters).`, field);
  return v.trim();
};
// One of a fixed list of values.
const oneOf = (field, label, values) => v => {
  if (!values.includes(v)) fail(`Invalid ${label}: "${v}" (must be ${values.join(' or ')}).`, field);
  return v;
};

// ---------- orders ----------
export function price(v) {
  const n = toNumber(v);
  if (!Number.isFinite(n) || n <= 0) fail(`Invalid price: "${v}" (must be a number greater than 0).`, 'price');
  return n;
}

export function quantity(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n <= 0) fail(`Invalid quantity: "${v}" (must be a whole number greater than 0).`, 'quantity');
  return n;
}

// Dish and drink names: non-empty text that isn't just a number.
const itemName = kind => v => {
  if (!isText(v) || isNumeric(v)) fail(`Invalid ${kind}: "${v}" (must be a name, not a number).`, kind);
  return v.trim();
};
export const dish = itemName('dish');
export const drink = itemName('drink');

export function spiceLevel(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n < 1 || n > 5) fail(`Invalid spice level: "${v}" (must be a whole number from 1 to 5).`, 'spiceLevel');
  return n;
}

// [{ dish, quantity, spiceLevel }, ...] with at least one item.
export function items(v) {
  if (!Array.isArray(v) || !v.length) fail('The order needs at least one item.', 'items');
  return v.map(i => ({ dish: dish(i?.dish), quantity: quantity(i?.quantity), spiceLevel: spiceLevel(i?.spiceLevel) }));
}

export const type = oneOf('type', 'order type', ['takeaway', 'delivery']);

// Required for delivery, ignored ('') for takeaway.
export function address(v, orderType) {
  if (orderType !== 'delivery') return '';
  if (!isText(v)) fail('A delivery order needs an address.', 'address');
  if (v.trim().length > 200) fail('Address too long (maximum 200 characters).', 'address');
  return v.trim();
}

// Order status and the changes allowed between statuses.
const ORDER_STATUS = { received: ['confirmed', 'cancelled'], confirmed: ['ready', 'cancelled'], ready: ['delivered', 'cancelled'], delivered: [], cancelled: [] };
export const orderStatus = oneOf('status', 'order status', Object.keys(ORDER_STATUS));
export function statusChange(from, to) {
  orderStatus(to);
  if (!ORDER_STATUS[from]?.includes(to)) fail(`An order that is ${from} cannot change to ${to}.`, 'status');
  return to;
}

// Opening hours, per day of the week (0 = Sunday). Keep in sync with reference.md. "24:00" = midnight.
const OPENING_HOURS = [
  [['13:00', '16:30'], ['20:00', '23:00']], // Sunday
  [['13:00', '16:00']],                     // Monday
  [['13:00', '16:00'], ['20:00', '23:30']],
  [['13:00', '16:00'], ['20:00', '23:30']],
  [['13:00', '16:00'], ['20:00', '23:30']],
  [['13:00', '16:00'], ['20:00', '24:00']], // Friday
  [['13:00', '16:30'], ['20:00', '24:00']], // Saturday
];
// Order time: HH:MM inside the opening hours of that date (a valid YYYY-MM-DD).
export function orderTime(v, onDate) {
  const t = time(v);
  const day = new Date(`${onDate}T00:00:00Z`).getUTCDay();
  if (!OPENING_HOURS[day].some(([from, to]) => minutes(t) >= minutes(from) && minutes(t) <= minutes(to)))
    fail(`We are closed at ${t} that day. Please choose a time within our opening hours.`, 'time');
  return t;
}

// ---------- bookings ----------
// Tables are ids like "M7"; the number after the M must be a whole number greater than 0.
export function table(v) {
  const m = /^M?(\d+)$/i.exec(String(v ?? '').trim());
  const n = m ? Number(m[1]) : NaN;
  if (!Number.isInteger(n) || n <= 0) fail(`Invalid table: "${v}" (must be a table number greater than 0).`, 'table');
  return `M${n}`;
}

// 9 digits. Spaces, dots, dashes and a +34 / 0034 prefix are accepted and removed.
export function phone(v) {
  const s = String(v ?? '').replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
  if (!/^\d{9}$/.test(s)) fail(`Invalid phone: "${v}" (must have 9 digits).`, 'phone');
  return s;
}

export function name(v) {
  if (!isText(v) || v.trim().length <= 2) fail(`Invalid name: "${v}" (must be more than 2 characters).`, 'name');
  return v.trim();
}

export function guests(v) {
  const n = toNumber(v);
  if (!Number.isInteger(n) || n <= 0 || n >= 15) fail(`Invalid number of guests: "${v}" (must be a whole number from 1 to 14).`, 'guests');
  return n;
}

// YYYY-MM-DD, strictly after today (Madrid time, see process.env.TZ in server.js).
export function date(v, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!d || d.toISOString().slice(0, 10) !== v) fail(`Invalid date: "${v}" (use YYYY-MM-DD).`, 'date');
  const today = now.toLocaleDateString('sv-SE'); // YYYY-MM-DD in local time
  if (v <= today) fail(`Invalid date: ${v}. Bookings must be for a day after today (${today}).`, 'date');
  return v;
}

// HH:MM, 24 h. Whether it falls inside a shift is checked by the booking model (reservas-core.mjs).
export function time(v) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(v ?? '').trim());
  if (!m) fail(`Invalid time: "${v}" (use HH:MM, 24 h).`, 'time');
  return m[0];
}

export const notes = optionalText('notes', 'notes', 500);

// Booking references look like R-20261024-001, waiting list entries like E-20261024-001.
export function reference(v, prefix = 'R') {
  const s = String(v ?? '').trim().toUpperCase();
  if (!new RegExp(`^${prefix}-\\d{8}-\\d{3}$`).test(s)) fail(`Invalid reference: "${v}" (looks like ${prefix}-20261024-001).`, 'reference');
  return s;
}

// ---------- shared ----------
// How a booking or order arrived when staff register it. The server sets 'chat' itself.
export const channel = oneOf('channel', 'channel', ['phone', 'email']);

// Staff login: both fields required. Whether they are correct is checked by the auth controller.
export function login(v) {
  if (!isText(v?.username)) fail('Username is required.', 'username');
  if (!isText(v?.password)) fail('Password is required.', 'password');
  return { username: v.username.trim(), password: v.password };
}

// ---------- pagination ----------
// page: 1 by default. limit: 20 by default, maximum 100.
export function page(v) {
  if (v === undefined || v === '') return 1;
  const n = toNumber(v);
  if (!Number.isInteger(n) || n < 1) fail(`Invalid page: "${v}" (must be a whole number from 1).`, 'page');
  return n;
}

export function limit(v) {
  if (v === undefined || v === '') return 20;
  const n = toNumber(v);
  if (!Number.isInteger(n) || n < 1 || n > 100) fail(`Invalid limit: "${v}" (must be a whole number from 1 to 100).`, 'limit');
  return n;
}
