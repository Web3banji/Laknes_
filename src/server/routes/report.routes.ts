/**
 * LAKNES Content Report API Routes
 */

import { Router } from 'express';
import { moderationService } from '../../modules/admin/moderation.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const report = await moderationService.submitReport(req.user!, req.body);
    res.status(201).json(buildSuccessResponse(report));
  } catch (error) {
    next(error);
  }
});

export const reportRoutes = router;
