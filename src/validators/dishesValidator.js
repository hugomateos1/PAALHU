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
