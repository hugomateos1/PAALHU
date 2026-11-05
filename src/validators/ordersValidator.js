// Validator for orders (takeaway and delivery). Checks every field and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).
import { cleanPhone } from './common.js';

export const ORDER_TYPES = ['takeaway', 'delivery'];
export const ORDER_STATUSES = ['received', 'confirmed', 'ready', 'delivered', 'cancelled'];

export function validateOrder(body) {
  const b = body ?? {};
  const errors = [];

  // name: text, 3 to 50 characters
  if (typeof b.name !== 'string' || b.name.trim().length < 3 || b.name.trim().length > 50) {
    errors.push({ field: 'name', message: 'Name is required and must have 3 to 50 characters.' });
  }

  // phone: 9 digits
  const phone = cleanPhone(b.phone);
  if (!phone) {
    errors.push({ field: 'phone', message: 'Phone must have 9 digits.' });
  }

  // type: takeaway or delivery
  if (!ORDER_TYPES.includes(b.type)) {
    errors.push({ field: 'type', message: `Type must be one of: ${ORDER_TYPES.join(', ')}.` });
  }

  // address: required only for delivery, at most 200 characters. For takeaway it is ignored ('').
  let address = '';
  if (b.type === 'delivery') {
    if (typeof b.address !== 'string' || b.address.trim() === '' || b.address.trim().length > 200) {
      errors.push({ field: 'address', message: 'A delivery order needs an address (at most 200 characters).' });
    } else {
      address = b.address.trim();
    }
  }

  // total: number from 0.50 to 500.00
  if (typeof b.total !== 'number' || !Number.isFinite(b.total) || b.total < 0.5 || b.total > 500) {
    errors.push({ field: 'total', message: 'Total must be a number from 0.50 to 500.00.' });
  }

  // status: one of the fixed list
  if (!ORDER_STATUSES.includes(b.status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${ORDER_STATUSES.join(', ')}.` });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    name: b.name.trim(),
    phone,
    type: b.type,
    address,
    total: b.total,
    status: b.status,
  };
  return { valid: true, errors: [], value };
}
