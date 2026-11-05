// Tables controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateTable } from '../validators/tablesValidator.js';

// GET /api/tables -> 200 with every table
export function listTables(req, res) {
  res.json(store.getAll('tables'));
}

// GET /api/tables/:id -> 200, or 404
export function getTable(req, res) {
  const table = store.getById('tables', Number(req.params.id));
  if (!table) return res.status(404).json({ error: 'Table not found.' });
  res.json(table);
}

// POST /api/tables -> 201 + Location, or 400 with every error
export function createTable(req, res) {
  const result = validateTable(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const table = store.create('tables', result.value);
  res.status(201).location(`/api/tables/${table.id}`).json(table);
}

// PUT /api/tables/:id -> 200, 404 or 400
export function replaceTable(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('tables', id)) return res.status(404).json({ error: 'Table not found.' });

  const result = validateTable(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('tables', id, result.value));
}

// DELETE /api/tables/:id -> 204, or 404
export function deleteTable(req, res) {
  const deleted = store.remove('tables', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Table not found.' });
  res.status(204).end();
}
