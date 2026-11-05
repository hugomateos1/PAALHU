// Dishes routes: path -> controller. Mounted on /api/dishes in app.js, so "/" here is /api/dishes.
import express from 'express';
import * as controller from '../controllers/dishesController.js';

const router = express.Router();

// Step 5: GET /stats goes here, BEFORE /:id (otherwise Express reads "stats" as an id).
router.get('/', controller.listDishes);
router.get('/:id', controller.getDish);
router.post('/', controller.createDish);
router.put('/:id', controller.replaceDish);
router.delete('/:id', controller.deleteDish);

export default router;
