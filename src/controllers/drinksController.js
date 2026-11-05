// Drinks controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateDrink } from '../validators/drinksValidator.js';

// GET /api/drinks -> 200 with every drink
export function listDrinks(req, res) {
  res.json(store.getAll('drinks'));
}

// GET /api/drinks/:id -> 200, or 404
export function getDrink(req, res) {
  const drink = store.getById('drinks', Number(req.params.id));
  if (!drink) return res.status(404).json({ error: 'Drink not found.' });
  res.json(drink);
}

// POST /api/drinks -> 201 + Location, or 400 with every error
export function createDrink(req, res) {
  const result = validateDrink(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const drink = store.create('drinks', result.value);
  res.status(201).location(`/api/drinks/${drink.id}`).json(drink);
}

// PUT /api/drinks/:id -> 200, 404 or 400
export function replaceDrink(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('drinks', id)) return res.status(404).json({ error: 'Drink not found.' });

  const result = validateDrink(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('drinks', id, result.value));
}

// DELETE /api/drinks/:id -> 204, or 404
export function deleteDrink(req, res) {
  const deleted = store.remove('drinks', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Drink not found.' });
  res.status(204).end();
}
