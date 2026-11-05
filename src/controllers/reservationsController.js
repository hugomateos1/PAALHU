// Reservations controller: one function per endpoint. Same pattern as dishesController.js.
import * as store from '../data/store.js';
import { validateReservation } from '../validators/reservationsValidator.js';

// GET /api/reservations -> 200 with every reservation
export function listReservations(req, res) {
  res.json(store.getAll('reservations'));
}

// GET /api/reservations/:id -> 200, or 404
export function getReservation(req, res) {
  const reservation = store.getById('reservations', Number(req.params.id));
  if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
  res.json(reservation);
}

// POST /api/reservations -> 201 + Location, or 400 with every error
export function createReservation(req, res) {
  const result = validateReservation(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  const reservation = store.create('reservations', result.value);
  res.status(201).location(`/api/reservations/${reservation.id}`).json(reservation);
}

// PUT /api/reservations/:id -> 200, 404 or 400
export function replaceReservation(req, res) {
  const id = Number(req.params.id);
  if (!store.getById('reservations', id)) return res.status(404).json({ error: 'Reservation not found.' });

  const result = validateReservation(req.body);
  if (!result.valid) return res.status(400).json({ errors: result.errors });

  res.json(store.update('reservations', id, result.value));
}

// DELETE /api/reservations/:id -> 204, or 404
export function deleteReservation(req, res) {
  const deleted = store.remove('reservations', Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Reservation not found.' });
  res.status(204).end();
}
