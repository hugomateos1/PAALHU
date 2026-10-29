// Website API routes: each URL points to its function in controllers/controller.js.
import express from 'express';
import * as controller from '../controllers/controller.js';

const router = express.Router();

// Menu screen
router.get('/categories', controller.getCategories);

export default router;
