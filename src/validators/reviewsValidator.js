// Validator for reviews. Checks every field of the body and collects ALL the problems at once.
// Returns { valid, errors: [{ field, message }], value } (value = only the allowed fields).

export function validateReview(body) {
  const b = body ?? {};
  const errors = [];

  // author: text, 2 to 50 characters
  if (typeof b.author !== 'string' || b.author.trim().length < 2 || b.author.trim().length > 50) {
    errors.push({ field: 'author', message: 'Author is required and must have 2 to 50 characters.' });
  }

  // rating: whole number from 1 to 5
  if (!Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5) {
    errors.push({ field: 'rating', message: 'Rating must be a whole number from 1 to 5.' });
  }

  // comment: text, 5 to 500 characters
  if (typeof b.comment !== 'string' || b.comment.trim().length < 5 || b.comment.trim().length > 500) {
    errors.push({ field: 'comment', message: 'Comment is required and must have 5 to 500 characters.' });
  }

  // published: true or false only
  if (typeof b.published !== 'boolean') {
    errors.push({ field: 'published', message: 'Published must be true or false.' });
  }

  if (errors.length > 0) {
    return { valid: false, errors, value: null };
  }

  const value = {
    author: b.author.trim(),
    rating: b.rating,
    comment: b.comment.trim(),
    published: b.published,
  };
  return { valid: true, errors: [], value };
}
