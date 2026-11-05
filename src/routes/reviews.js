// Reviews routes: path -> controller. Mounted on /api/reviews in app.js.
import express from 'express';
import * as controller from '../controllers/reviewsController.js';

const router = express.Router();

router.get('/', controller.listReviews);
router.get('/:id', controller.getReview);
router.post('/', controller.createReview);
router.put('/:id', controller.replaceReview);
router.delete('/:id', controller.deleteReview);

export default router;
