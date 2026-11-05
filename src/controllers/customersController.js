// Customers controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateCustomer } from '../validators/customersValidator.js';

// GET /api/customers -> 200 with every customer
export function listCustomers(req, res) {
  res.json(store.getAll('customers'));
}

// GET /api/customers/:id -> 200, or 404
export function getCustomer(req, res) {
  const customer = store.getById('customers', Number(req.params.id));
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });
  res.json(customer);
}

// POST /api/customers -> 201 + Location, or 400 with every error
export function createCustomer(req, res) {
  const result = validateCustomer(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const customer = store.create('customers', result.value);
  res.status(201).location(`/api/customers/${customer.id}`).json(customer);
}

// PUT /api/customers/:id -> 200, 404 or 400
export function replaceCustomer(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('customers', id)) return res.status(404).json({ error: 'Customer not found.' });

  const result = validateCustomer(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('customers', id, result.value));
}

// DELETE /api/customers/:id -> 204, or 404
export function deleteCustomer(req, res) {
  const deleted = store.remove('customers', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Customer not found.' });
  res.status(204).end();
}
