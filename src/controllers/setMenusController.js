// Set menus controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateSetMenu } from '../validators/setMenusValidator.js';

// GET /api/setMenus -> 200 with every set menu
export function listSetMenus(req, res) {
  res.json(store.getAll('setMenus'));
}

// GET /api/setMenus/:id -> 200, or 404
export function getSetMenu(req, res) {
  const setMenu = store.getById('setMenus', Number(req.params.id));
  if (!setMenu) return res.status(404).json({ error: 'Set menu not found.' });
  res.json(setMenu);
}

// POST /api/setMenus -> 201 + Location, or 400 with every error
export function createSetMenu(req, res) {
  const result = validateSetMenu(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const setMenu = store.create('setMenus', result.value);
  res.status(201).location(`/api/setMenus/${setMenu.id}`).json(setMenu);
}

// PUT /api/setMenus/:id -> 200, 404 or 400
export function replaceSetMenu(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('setMenus', id)) return res.status(404).json({ error: 'Set menu not found.' });

  const result = validateSetMenu(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('setMenus', id, result.value));
}

// DELETE /api/setMenus/:id -> 204, or 404
export function deleteSetMenu(req, res) {
  const deleted = store.remove('setMenus', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Set menu not found.' });
  res.status(204).end();
}
