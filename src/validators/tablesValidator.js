// Validator for tables. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).

// "M" followed by a whole number from 1: M1, M7, M13...
const CODE_PATTERN = /^M[1-9]\d*$/;

export function validateTable(body) {
  const b = body ?? {};
  const errors = [];

  // code: like M7 (a lowercase m is accepted and saved as M)
  const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
  if (!CODE_PATTERN.test(code)) {
    errors.push({ field: 'code', message: 'Code must be M followed by a table number, e.g. M7.' });
  }

  // seats: whole number from 1 to 10
  if (!Number.isInteger(b.seats) || b.seats < 1 || b.seats > 10) {
    errors.push({ field: 'seats', message: 'Seats must be a whole number from 1 to 10.' });
  }

  // joinable and active: true or false only
  if (typeof b.joinable !== 'boolean') {
    errors.push({ field: 'joinable', message: 'Joinable must be true or false.' });
  }
  if (typeof b.active !== 'boolean') {
    errors.push({ field: 'active', message: 'Active must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    code,
    seats: b.seats,
    joinable: b.joinable,
    active: b.active,
  };
  return { valid: true, errors: [], value };
}
