// Reservations routes: path -> controller. Mounted on /api/reservations in app.js.
import express from 'express';
import * as controller from '../controllers/reservationsController.js';

const router = express.Router();

router.get('/', controller.listReservations);
router.get('/:id', controller.getReservation);
router.post('/', controller.createReservation);
router.put('/:id', controller.replaceReservation);
router.delete('/:id', controller.deleteReservation);

export default router;
