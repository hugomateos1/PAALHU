// Reviews controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateReview } from '../validators/reviewsValidator.js';

// GET /api/reviews -> 200 with every review
export function listReviews(req, res) {
  res.json(store.getAll('reviews'));
}

// GET /api/reviews/:id -> 200, or 404
export function getReview(req, res) {
  const review = store.getById('reviews', Number(req.params.id));
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  res.json(review);
}

// POST /api/reviews -> 201 + Location, or 400 with every error
export function createReview(req, res) {
  const result = validateReview(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const review = store.create('reviews', result.value);
  res.status(201).location(`/api/reviews/${review.id}`).json(review);
}

// PUT /api/reviews/:id -> 200, 404 or 400
export function replaceReview(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('reviews', id)) return res.status(404).json({ error: 'Review not found.' });

  const result = validateReview(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('reviews', id, result.value));
}

// DELETE /api/reviews/:id -> 204, or 404
export function deleteReview(req, res) {
  const deleted = store.remove('reviews', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Review not found.' });
  res.status(204).end();
}
