/**
 * LAKNES Administration API Routes
 */

import { Router } from 'express';
import { moderationService } from '../../modules/admin/moderation.service.ts';
import { auditService } from '../../modules/admin/audit.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/audit-logs', requireAdmin, async (req, res, next) => {
  try {
    const result = await auditService.getLogs(req.user!, req.query as any, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.get('/moderation', requireAdmin, async (req, res, next) => {
  try {
    const result = await moderationService.getPendingReports(req.user!, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.post('/reports/:id/resolve', requireAdmin, async (req, res, next) => {
  try {
    const report = await moderationService.resolveReport(req.user!, req.params.id, req.body.status);
    res.json(buildSuccessResponse(report));
  } catch (error) {
    next(error);
  }
});

export const adminRoutes = router;
