// Validator for dishes. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value }:
//   value = the clean dish with only the allowed fields (unknown fields and any id are dropped).

export const CATEGORIES = ['starters', 'curries', 'vegetarian', 'rice', 'breads', 'desserts'];

export function validateDish(body) {
  const b = body ?? {}; // no body at all -> every field is missing
  const errors = [];

  // name: text, 2 to 60 characters
  if (typeof b.name !== 'string' || b.name.trim().length < 2 || b.name.trim().length > 60) {
    errors.push({ field: 'name', message: 'Name is required and must have 2 to 60 characters.' });
  }

  // category: one of the fixed list
  if (!CATEGORIES.includes(b.category)) {
    errors.push({ field: 'category', message: `Category must be one of: ${CATEGORIES.join(', ')}.` });
  }

  // price: number from 0.50 to 50.00
  if (typeof b.price !== 'number' || !Number.isFinite(b.price) || b.price < 0.5 || b.price > 50) {
    errors.push({ field: 'price', message: 'Price must be a number from 0.50 to 50.00.' });
  }

  // spiceLevel: whole number from 0 to 5, the levels of the spice guide (0 = not spicy)
  if (!Number.isInteger(b.spiceLevel) || b.spiceLevel < 0 || b.spiceLevel > 5) {
    errors.push({ field: 'spiceLevel', message: 'Spice level must be a whole number from 0 (not spicy) to 5 (very hot).' });
  }

  // vegetarian and available: true or false only
  if (typeof b.vegetarian !== 'boolean') {
    errors.push({ field: 'vegetarian', message: 'Vegetarian must be true or false.' });
  }
  if (typeof b.available !== 'boolean') {
    errors.push({ field: 'available', message: 'Available must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  // Only the allowed fields are kept.
  const value = {
    name: b.name.trim(),
    category: b.category,
    price: b.price,
    spiceLevel: b.spiceLevel,
    vegetarian: b.vegetarian,
    available: b.available,
  };
  return { valid: true, errors: [], value };
}

// Validator for the query string of GET /api/dishes: ?search=&category=&vegetarian=&available=
// Same shape as validateDish: { valid, errors: [{ field, message }], value }.
//   value = only the filters that were given, already converted:
//           { search: 'naan', category: 'breads', vegetarian: true, available: false }
// Rules:
// - Every parameter is optional. An empty value (?category=) means "no filter",
//   which is what a <select> with an "All" option sends.
// - Query values always arrive as text, so vegetarian/available must be the text "true" or "false".
// - A repeated parameter (?category=rice&category=breads) arrives as an array and is an error.
// - Unknown parameters are ignored, like unknown fields in a body.
export function validateDishQuery(query) {
  const q = query ?? {};
  const errors = [];
  const value = {};

  // search: any text up to 60 characters (a dish name is at most 60)
  if (q.search !== undefined) {
    if (typeof q.search !== 'string' || q.search.trim().length > 60) {
      errors.push({ field: 'search', message: 'Search must be a single text of at most 60 characters.' });
    } else if (q.search.trim() !== '') {
      value.search = q.search.trim();
    }
  }

  // category: one of the fixed list
  if (q.category !== undefined && q.category !== '') {
    if (!CATEGORIES.includes(q.category)) {
      errors.push({ field: 'category', message: `Category must be one of: ${CATEGORIES.join(', ')}.` });
    } else {
      value.category = q.category;
    }
  }

  // vegetarian and available: the text "true" or "false", turned into a boolean
  for (const field of ['vegetarian', 'available']) {
    const text = q[field];
    if (text === undefined || text === '') continue;
    if (text !== 'true' && text !== 'false') {
      errors.push({ field, message: `${field[0].toUpperCase()}${field.slice(1)} must be true or false.` });
    } else {
      value[field] = text === 'true';
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }
  return { valid: true, errors: [], value };
}
