// Drinks routes: path -> controller. Mounted on /api/drinks in app.js.
import express from 'express';
import * as controller from '../controllers/drinksController.js';

const router = express.Router();

router.get('/', controller.listDrinks);
router.get('/:id', controller.getDrink);
router.post('/', controller.createDrink);
router.put('/:id', controller.replaceDrink);
router.delete('/:id', controller.deleteDrink);

export default router;
