// Validator for reservations. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).
// It checks the format only: whether the restaurant is open or a table is free is not checked here.
import { cleanPhone, isRealDate, isTime } from './common.js';

export const RESERVATION_STATUSES = ['confirmed', 'seated', 'cancelled', 'no-show'];

export function validateReservation(body) {
  const b = body ?? {};
  const errors = [];

  // name: text, 3 to 50 characters (the person who books)
  if (typeof b.name !== 'string' || b.name.trim().length < 3 || b.name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Name is required and must have 3 to 50 characters.' });
  }

  // phone: 9 digits
  const phone = cleanPhone(b.phone);
  if (!phone) {
    errors.push({ field: 'phone', message: 'Phone must have 9 digits.' });
  }

  // date: YYYY-MM-DD, a day that exists
  if (!isRealDate(b.date)) {
    errors.push({ field: 'date', message: 'Date must be a real date written as YYYY-MM-DD.' });
  }

  // time: HH:MM, 24 h
  if (!isTime(b.time)) {
    errors.push({ field: 'time', message: 'Time must be written as HH:MM (24 h).' });
  }

  // guests: whole number from 1 to 12
  if (!Number.isInteger(b.guests) || b.guests < 1 || b.guests > 12) {
    errors.push({ field: 'guests', message: 'Guests must be a whole number from 1 to 12.' });
  }

  // status: one of the fixed list
  if (!RESERVATION_STATUSES.includes(b.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${RESERVATION_STATUSES.join(', ')}.` });
  }

  // notes: optional; missing -> '', otherwise text of at most 500 characters
  let notes = '';
  if (b.notes !== undefined && b.notes !== null) {
    if (typeof b.notes !== 'string' || b.notes.trim().length > 500) {
      errors.push({ field: 'notes', message: 'Notes must be text of at most 500 characters.' });
    } else {
      notes = b.notes.trim();
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    name: b.name.trim(),
    phone,
    date: b.date,
    time: b.time,
    guests: b.guests,
    status: b.status,
    notes,
  };
  return { valid: true, errors: [], value };
}
