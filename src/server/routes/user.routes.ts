/**
 * LAKNES User Management API Routes
 */

import { Router } from 'express';
import { userService } from '../../modules/user/user.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAuth } from '../middleware/auth.middleware.ts';

const router = Router();

// Public profile endpoint (omits email, roles, private metadata)
router.get('/:id/public', async (req, res, next) => {
  try {
    const profile = await userService.getPublicProfile(req.params.id);
    res.json(buildSuccessResponse(profile));
  } catch (error) {
    next(error);
  }
});

// Private profile endpoint (owner or admin only)
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const user = await userService.getPrivateProfile(req.user!, req.params.id);
    res.json(buildSuccessResponse(user));
  } catch (error) {
    next(error);
  }
});

// Update profile endpoint (owner or admin only)
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user!, req.params.id, req.body);
    res.json(buildSuccessResponse(updated));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/follows', async (req, res, next) => {
  try {
    const result = await userService.getUserFollows(req.params.id, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/saved', requireAuth, async (req, res, next) => {
  try {
    const result = await userService.getUserSavedProjects(req.params.id, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/quests', async (req, res, next) => {
  try {
    const result = await userService.getUserQuests(req.params.id, req.query);
    res.json(buildSuccessResponse(result.items, result.meta));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/projects', requireAuth, async (req, res, next) => {
  try {
    const { getRepositories } = await import('../../dal/index.ts');
    const repos = getRepositories();
    const memberships = await repos.memberships.findByUser(req.params.id);
    const activeMemberships = memberships.filter((m) => m.membershipStatus === 'ACTIVE');
    const userProjects = [];
    for (const m of activeMemberships) {
      const p = await repos.projects.findById(m.projectId);
      if (p) {
        userProjects.push({ ...p, myMembershipRole: m.role });
      }
    }
    res.json(buildSuccessResponse(userProjects));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/following-feed', requireAuth, async (req, res, next) => {
  try {
    const { getRepositories } = await import('../../dal/index.ts');
    const repos = getRepositories();
    const followsResult = await repos.follows.findByUser(req.params.id, { limit: 100 });
    const feed = [];
    for (const f of followsResult.items) {
      const p = await repos.projects.findById(f.projectId);
      if (p) {
        const updatesResult = await repos.updates.findByProject(f.projectId, { limit: 10 });
        for (const u of updatesResult.items) {
          if (u.publicationStatus === 'PUBLISHED') {
            feed.push({
              ...u,
              project: {
                id: p.id,
                name: p.name,
                slug: p.slug,
                logoUrl: p.logoUrl,
                category: p.category,
                verificationStatus: p.verificationStatus,
              },
            });
          }
        }
      }
    }
    feed.sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime());
    res.json(buildSuccessResponse(feed));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/saved-quests', requireAuth, async (req, res, next) => {
  try {
    const { getDatabase, getRepositories } = await import('../../dal/index.ts');
    const db = getDatabase();
    const repos = getRepositories();
    const rows = db.prepare('SELECT quest_id, created_at FROM saved_quests WHERE user_id = ? ORDER BY created_at DESC').all(req.params.id) as Array<{ quest_id: string; created_at: string }>;
    
    const savedQuests = [];
    for (const r of rows) {
      const q = await repos.quests.findById(r.quest_id);
      if (q) {
        const p = await repos.projects.findById(q.projectId);
        savedQuests.push({
          ...q,
          savedAt: r.created_at,
          project: p ? { id: p.id, name: p.name, logoUrl: p.logoUrl, verificationStatus: p.verificationStatus } : undefined,
        });
      }
    }
    res.json(buildSuccessResponse(savedQuests));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/following-quests', requireAuth, async (req, res, next) => {
  try {
    const { getRepositories } = await import('../../dal/index.ts');
    const repos = getRepositories();
    const followsResult = await repos.follows.findByUser(req.params.id, { limit: 100 });
    const quests = [];
    for (const f of followsResult.items) {
      const p = await repos.projects.findById(f.projectId);
      if (p) {
        const pQuests = await repos.quests.findByProject(f.projectId, { limit: 15 });
        for (const q of pQuests.items) {
          if (q.publicationStatus === 'PUBLISHED') {
            quests.push({
              ...q,
              project: {
                id: p.id,
                name: p.name,
                logoUrl: p.logoUrl,
                category: p.category,
                verificationStatus: p.verificationStatus,
              },
            });
          }
        }
      }
    }
    quests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(buildSuccessResponse(quests));
  } catch (error) {
    next(error);
  }
});

export const userRoutes = router;
