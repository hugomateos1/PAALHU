// Dishes controller: one function per endpoint. Each one reads the request, validates it,
// asks the store and answers with the right status code. It never touches the data directly.
import * as store from '../data/store.js';
import { validateDish } from '../validators/dishesValidator.js';

// GET /api/dishes -> 200 with every dish
export function listDishes(req, res) {
  res.json(store.getAll('dishes'));
}

// GET /api/dishes/:id -> 200 with the dish, 404 if there is none
// An id that isn't a number (e.g. "abc") becomes NaN, finds nothing and answers 404.
export function getDish(req, res) {
  const dish = store.getById('dishes', Number(req.params.id));
  if (!dish) return res.status(404).json({ error: 'Dish not found.' });
  res.json(dish);
}

// POST /api/dishes -> 201 + Location with the new dish, 400 with every error
export function createDish(req, res) {
  const result = validateDish(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const dish = store.create('dishes', result.value);
  res.status(201).location(`/api/dishes/${dish.id}`).json(dish);
}

// PUT /api/dishes/:id -> 200 with the replaced dish, 404 if there is none, 400 with every error
export function replaceDish(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('dishes', id)) return res.status(404).json({ error: 'Dish not found.' });

  const result = validateDish(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('dishes', id, result.value));
}

// DELETE /api/dishes/:id -> 204 with no body, 404 if there is none
export function deleteDish(req, res) {
  const deleted = store.remove('dishes', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Dish not found.' });
  res.status(204).end();
}
