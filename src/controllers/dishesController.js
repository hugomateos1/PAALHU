// Dishes controller: one function per endpoint. Each one reads the request, validates it,
// asks the store and answers with the right status code. It never touches the data directly.
import * as store from '../data/store.js';
import { validateDish, validateDishQuery, CATEGORIES } from '../validators/dishesValidator.js';

// GET /api/dishes -> 200 with the dishes that match the filters (every dish if there are none)
//   ?search=     part of the name, upper or lower case doesn't matter
//   ?category=   one of CATEGORIES
//   ?spiceLevel= 0 to 5, only dishes of that level
//   ?vegetarian= true | false
//   ?available=  true | false
// Filters combine: ?search=naan&vegetarian=true. 400 with every error if a filter is invalid.
// Filtering happens here on the server, so the browser only receives what matches.
export function listDishes(req, res) {
  const result = validateDishQuery(req.query);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const { search, category, spiceLevel, vegetarian, available } = result.value;
  let dishes = store.getAll('dishes');
  if (search !== undefined) {
    const text = search.toLowerCase();
    dishes = dishes.filter(dish => dish.name.toLowerCase().includes(text));
  }
  if (category !== undefined) dishes = dishes.filter(dish => dish.category === category);
  if (spiceLevel !== undefined) dishes = dishes.filter(dish => dish.spiceLevel === spiceLevel);
  if (vegetarian !== undefined) dishes = dishes.filter(dish => dish.vegetarian === vegetarian);
  if (available !== undefined) dishes = dishes.filter(dish => dish.available === available);

  res.json(dishes);
}

// GET /api/dishes/stats -> 200 { total, vegetarian, available, averagePrice, byCategory }
// Calculated from the current dishes on every request, never stored, so it always matches the data.
// byCategory has every category, also those with 0 dishes. averagePrice has 2 decimals (0 if there are no dishes).
export function getDishStats(req, res) {
  const dishes = store.getAll('dishes');

  const byCategory = {};
  for (const category of CATEGORIES) byCategory[category] = 0;
  for (const dish of dishes) byCategory[dish.category] += 1;

  const priceSum = dishes.reduce((sum, dish) => sum + dish.price, 0);
  const averagePrice = dishes.length === 0 ? 0 : Math.round((priceSum / dishes.length) * 100) / 100;

  res.json({
    total: dishes.length,
    vegetarian: dishes.filter(dish => dish.vegetarian).length,
    available: dishes.filter(dish => dish.available).length,
    averagePrice,
    byCategory,
  });
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
