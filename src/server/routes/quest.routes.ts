/**
 * LAKNES Quest API Routes
 */

import { Router } from 'express';
import { questService } from '../../modules/quest/quest.service.ts';
import { questParticipationService } from '../../modules/quest/participation.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await questService.getActiveQuests(req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const quest = await questService.getQuestById(req.params.id);
    res.json(buildSuccessResponse(quest));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const participation = await questParticipationService.joinQuest(req.user!, req.params.id);
    res.status(201).json(buildSuccessResponse(participation));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/submit', requireAuth, async (req, res, next) => {
  try {
    const participation = await questParticipationService.submitProof(
      req.user!,
      req.params.id,
      req.body.submissionProof
    );
    res.json(buildSuccessResponse(participation));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/verify', requireAuth, async (req, res, next) => {
  try {
    const participation = await questParticipationService.verifyCompletion(
      req.user!,
      req.params.id,
      req.body.decision,
      req.body.verificationNotes
    );
    res.json(buildSuccessResponse(participation));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { getDatabase } = await import('../../dal/index.ts');
    const db = getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      db.prepare('INSERT INTO saved_quests (id, user_id, quest_id, created_at) VALUES (?, ?, ?, ?)').run(
        id,
        req.user!.id,
        req.params.id,
        now
      );
    } catch {
      // Ignore unique constraint if already saved
    }
    res.json(buildSuccessResponse({ saved: true }));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const { getDatabase } = await import('../../dal/index.ts');
    const db = getDatabase();
    db.prepare('DELETE FROM saved_quests WHERE user_id = ? AND quest_id = ?').run(
      req.user!.id,
      req.params.id
    );
    res.json(buildSuccessResponse({ saved: false }));
  } catch (error) {
    next(error);
  }
});

export const questRoutes = router;
