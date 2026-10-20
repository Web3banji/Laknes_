/**
 * LAKNES Project Review API Routes
 */

import { Router } from 'express';
import { projectReviewService } from '../../modules/admin/review.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/pending', requireAdmin, async (req, res, next) => {
  try {
    const result = await projectReviewService.getPendingReviews(req.user!, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.post('/project/:id', requireAdmin, async (req, res, next) => {
  try {
    const review = await projectReviewService.reviewProject(
      req.user!,
      req.params.id,
      req.body.decision,
      req.body.reviewNotes
    );
    res.status(201).json(buildSuccessResponse(review));
  } catch (error) {
    next(error);
  }
});

router.get('/project/:id/history', requireAuth, async (req, res, next) => {
  try {
    const history = await projectReviewService.getProjectReviewHistory(req.user!, req.params.id);
    res.json(buildSuccessResponse(history));
  } catch (error) {
    next(error);
  }
});

export const reviewRoutes = router;
