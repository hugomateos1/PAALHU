// Dishes routes: path -> controller. Mounted on /api/dishes in app.js, so "/" here is /api/dishes.
import express from 'express';
import * as controller from '../controllers/dishesController.js';

const router = express.Router();

router.get('/', controller.listDishes); // also ?search=&category=&vegetarian=&available=
// /stats must be declared BEFORE /:id: Express tries routes in order, and /:id would read "stats" as an id.
router.get('/stats', controller.getDishStats);
router.get('/:id', controller.getDish);
router.post('/', controller.createDish);
router.put('/:id', controller.replaceDish);
router.delete('/:id', controller.deleteDish);

export default router;
