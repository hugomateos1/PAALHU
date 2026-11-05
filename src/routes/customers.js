// Customers routes: path -> controller. Mounted on /api/customers in app.js.
import express from 'express';
import * as controller from '../controllers/customersController.js';

const router = express.Router();

router.get('/', controller.listCustomers);
router.get('/:id', controller.getCustomer);
router.post('/', controller.createCustomer);
router.put('/:id', controller.replaceCustomer);
router.delete('/:id', controller.deleteCustomer);

export default router;
