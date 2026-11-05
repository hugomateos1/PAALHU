// Small checks shared by several validators (customers, reservations, orders),
// so the same code isn't copied into each file.

// Phone: removes spaces, dots, dashes, brackets and a +34 / 0034 prefix.
// Returns the 9 digits, or null if what is left isn't exactly 9 digits.
export function cleanPhone(value) {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
  return /^\d{9}$/.test(digits) ? digits : null;
}

// Date: "YYYY-MM-DD" and a day that really exists (2026-02-30 is not valid).
export function isRealDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // If the day doesn't exist, JavaScript moves it to another day (Feb 30 -> Mar 2).
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Time: "HH:MM", 24 h, from 00:00 to 23:59.
export function isTime(value) {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
