// Validator for set menus. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).

export const SERVICES = ['lunch', 'dinner'];

export function validateSetMenu(body) {
  const b = body ?? {};
  const errors = [];

  // name: text, 2 to 60 characters
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 60) {
    errors.push({ field: 'name', message: 'Name is required and must have 2 to 60 characters.' });
  }

  // price: number from 5.00 to 60.00
  if (typeof b.price !== 'number' || !Number.isFinite(b.price) || b.price < 5 || b.price > 60) {
    errors.push({ field: 'price', message: 'Price must be a number from 5.00 to 60.00.' });
  }

  // service: lunch or dinner
  if (!SERVICES.includes(b.service)) {
    errors.push({ field: 'service', message: `Service must be one of: ${SERVICES.join(', ')}.` });
  }

  // weekdaysOnly and active: true or false only
  if (typeof b.weekdaysOnly !== 'boolean') {
    errors.push({ field: 'weekdaysOnly', message: 'WeekdaysOnly must be true or false.' });
  }
  if (typeof b.active !== 'boolean') {
    errors.push({ field: 'active', message: 'Active must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    name: b.name.trim(),
    price: b.price,
    service: b.service,
    weekdaysOnly: b.weekdaysOnly,
    active: b.active,
  };
  return { valid: true, errors: [], value };
}
