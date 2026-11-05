// Tables routes: path -> controller. Mounted on /api/tables in app.js.
import express from 'express';
import * as controller from '../controllers/tablesController.js';

const router = express.Router();

router.get('/', controller.listTables);
router.get('/:id', controller.getTable);
router.post('/', controller.createTable);
router.put('/:id', controller.replaceTable);
router.delete('/:id', controller.deleteTable);

export default router;
