// Orders controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateOrder } from '../validators/ordersValidator.js';

// GET /api/orders -> 200 with every order
export function listOrders(req, res) {
  res.json(store.getAll('orders'));
}

// GET /api/orders/:id -> 200, or 404
export function getOrder(req, res) {
  const order = store.getById('orders', Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json(order);
}

// POST /api/orders -> 201 + Location, or 400 with every error
export function createOrder(req, res) {
  const result = validateOrder(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const order = store.create('orders', result.value);
  res.status(201).location(`/api/orders/${order.id}`).json(order);
}

// PUT /api/orders/:id -> 200, 404 or 400
export function replaceOrder(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('orders', id)) return res.status(404).json({ error: 'Order not found.' });

  const result = validateOrder(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('orders', id, result.value));
}

// DELETE /api/orders/:id -> 204, or 404
export function deleteOrder(req, res) {
  const deleted = store.remove('orders', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Order not found.' });
  res.status(204).end();
}
