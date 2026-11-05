// Orders routes: path -> controller. Mounted on /api/orders in app.js.
import express from 'express';
import * as controller from '../controllers/ordersController.js';

const router = express.Router();

router.get('/', controller.listOrders);
router.get('/:id', controller.getOrder);
router.post('/', controller.createOrder);
router.put('/:id', controller.replaceOrder);
router.delete('/:id', controller.deleteOrder);

export default router;
