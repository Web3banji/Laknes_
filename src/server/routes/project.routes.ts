/**
 * LAKNES Project API Routes
 */

import { Router } from 'express';
import { projectService } from '../../modules/project/project.service.ts';
import { projectUpdateService } from '../../modules/project/update.service.ts';
import { questService } from '../../modules/quest/quest.service.ts';
import { engagementService } from '../../modules/engagement/engagement.service.ts';
import { projectReviewService } from '../../modules/admin/review.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

// Public discovery
router.get('/discover', async (req, res, next) => {
  try {
    const result = await projectService.discoverProjects(req.query as any);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

// Single project lookups
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const project = await projectService.getProjectBySlug(req.params.slug);
    res.json(buildSuccessResponse(project));
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.id);
    res.json(buildSuccessResponse(project));
  } catch (error) {
    next(error);
  }
});

// Submissions
router.post('/submit', requireAuth, async (req, res, next) => {
  try {
    const project = await projectService.submitProject(req.user!, req.body);
    res.status(201).json(buildSuccessResponse(project));
  } catch (error) {
    next(error);
  }
});

// Profile management
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.user!, req.params.id, req.body);
    res.json(buildSuccessResponse(project));
  } catch (error) {
    next(error);
  }
});

// Resubmit corrections after changes requested
router.post('/:id/corrections', requireAuth, async (req, res, next) => {
  try {
    const project = await projectService.submitCorrections(req.user!, req.params.id, req.body);
    res.json(buildSuccessResponse(project));
  } catch (error) {
    next(error);
  }
});

// Project Representative Dashboard
router.get('/:id/dashboard', requireAuth, async (req, res, next) => {
  try {
    const dashboard = await projectService.getProjectDashboard(req.user!, req.params.id);
    res.json(buildSuccessResponse(dashboard));
  } catch (error) {
    next(error);
  }
});

// Memberships & Representatives
router.get('/:id/members', async (req, res, next) => {
  try {
    const members = await projectService.getProjectMembers(req.params.id);
    res.json(buildSuccessResponse(members));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/members/invite', requireAuth, async (req, res, next) => {
  try {
    const membership = await projectService.inviteMember(req.user!, req.params.id, req.body);
    res.status(201).json(buildSuccessResponse(membership));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    await projectService.removeMember(req.user!, req.params.id, req.params.userId);
    res.json(buildSuccessResponse({ removed: true }));
  } catch (error) {
    next(error);
  }
});

// Analytics
router.get('/:id/analytics', async (req, res, next) => {
  try {
    const analytics = await projectService.getProjectAnalytics(req.params.id);
    res.json(buildSuccessResponse(analytics));
  } catch (error) {
    next(error);
  }
});

// Follow / Unfollow
router.post('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    const follow = await engagementService.followProject(req.user!, req.params.id);
    res.json(buildSuccessResponse(follow));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/follow', requireAuth, async (req, res, next) => {
  try {
    await engagementService.unfollowProject(req.user!, req.params.id);
    res.json(buildSuccessResponse({ following: false }));
  } catch (error) {
    next(error);
  }
});

// Save / Unsave
router.post('/:id/save', requireAuth, async (req, res, next) => {
  try {
    const saved = await engagementService.saveProject(req.user!, req.params.id);
    res.json(buildSuccessResponse(saved));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/save', requireAuth, async (req, res, next) => {
  try {
    await engagementService.unsaveProject(req.user!, req.params.id);
    res.json(buildSuccessResponse({ saved: false }));
  } catch (error) {
    next(error);
  }
});

// Project Updates
router.get('/:id/updates', async (req, res, next) => {
  try {
    const result = await projectUpdateService.getProjectUpdates(req.params.id, req.query, false);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/updates', requireAuth, async (req, res, next) => {
  try {
    const update = await projectUpdateService.createUpdate(req.user!, req.params.id, req.body);
    res.status(201).json(buildSuccessResponse(update));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/updates/:updateId', requireAuth, async (req, res, next) => {
  try {
    const update = await projectUpdateService.editUpdate(req.user!, req.params.updateId, req.body);
    res.json(buildSuccessResponse(update));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/updates/:updateId/publish', requireAuth, async (req, res, next) => {
  try {
    const update = await projectUpdateService.setPublicationStatus(
      req.user!,
      req.params.updateId,
      req.body.publicationStatus || 'PUBLISHED'
    );
    res.json(buildSuccessResponse(update));
  } catch (error) {
    next(error);
  }
});

// Review History for Project Representatives
router.get('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const history = await projectReviewService.getProjectReviewHistory(req.user!, req.params.id);
    res.json(buildSuccessResponse(history));
  } catch (error) {
    next(error);
  }
});

// Quests associated with Project
router.get('/:id/quests', async (req, res, next) => {
  try {
    const result = await questService.getProjectQuests(req.params.id, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.post('/:id/quests', requireAuth, async (req, res, next) => {
  try {
    const quest = await questService.createQuest(req.user!, req.params.id, req.body);
    res.status(201).json(buildSuccessResponse(quest));
  } catch (error) {
    next(error);
  }
});

export const projectRoutes = router;
