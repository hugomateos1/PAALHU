// Validator for drinks. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).

export const DRINK_TYPES = ['lassi', 'tea', 'soft-drink', 'beer', 'water'];

export function validateDrink(body) {
  const b = body ?? {};
  const errors = [];

  // name: text, 2 to 60 characters
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 60) {
    errors.push({ field: 'name', message: 'Name is required and must have 2 to 60 characters.' });
  }

  // type: one of the fixed list
  if (!DRINK_TYPES.includes(b.type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${DRINK_TYPES.join(', ')}.` });
  }

  // price: number from 0.50 to 20.00
  if (typeof b.price !== 'number' || !Number.isFinite(b.price) || b.price < 0.5 || b.price > 20) {
    errors.push({ field: 'price', message: 'Price must be a number from 0.50 to 20.00.' });
  }

  // alcoholic: true or false only
  if (typeof b.alcoholic !== 'boolean') {
    errors.push({ field: 'alcoholic', message: 'Alcoholic must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    name: b.name.trim(),
    type: b.type,
    price: b.price,
    alcoholic: b.alcoholic,
  };
  return { valid: true, errors: [], value };
}
