// Set menus routes: path -> controller. Mounted on /api/setMenus in app.js.
import express from 'express';
import * as controller from '../controllers/setMenusController.js';

const router = express.Router();

router.get('/', controller.listSetMenus);
router.get('/:id', controller.getSetMenu);
router.post('/', controller.createSetMenu);
router.put('/:id', controller.replaceSetMenu);
router.delete('/:id', controller.deleteSetMenu);

export default router;
