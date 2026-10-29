// Customer booking chat. Routes only map URLs; the work is in controllers/chatController.js.
import express from 'express';
import { status, send } from '../controllers/chatController.js';

const router = express.Router();
router.get('/status', status);
router.post('/', send);

export default router;
