// Validator for customers. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).
import { cleanPhone } from './common.js';

// Something@something.something, with no spaces.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomer(body) {
  const b = body ?? {};
  const errors = [];

  // name: text, 3 to 50 characters
  if (typeof b.name !== 'string' || b.name.trim().length < 3 || b.name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Name is required and must have 3 to 50 characters.' });
  }

  // email: a valid address, at most 100 characters (saved in lowercase)
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(email) || email.length > 100) {
    errors.push({ field: 'email', message: 'Email must be a valid address (at most 100 characters).' });
  }

  // phone: 9 digits (spaces and a +34 prefix are accepted and removed)
  const phone = cleanPhone(b.phone);
  if (!phone) {
    errors.push({ field: 'phone', message: 'Phone must have 9 digits.' });
  }

  // newsletter: true or false only
  if (typeof b.newsletter !== 'boolean') {
    errors.push({ field: 'newsletter', message: 'Newsletter must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    name: b.name.trim(),
    email,
    phone,
    newsletter: b.newsletter,
  };
  return { valid: true, errors: [], value };
}
