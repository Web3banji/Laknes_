import { Router } from 'express';
import { authRoutes } from './auth.routes.ts';
import { userRoutes } from './user.routes.ts';
import { projectRoutes } from './project.routes.ts';
import { questRoutes } from './quest.routes.ts';
import { reviewRoutes } from './review.routes.ts';
import { reportRoutes } from './report.routes.ts';
import { adminRoutes } from './admin.routes.ts';
import { systemRoutes } from './system.routes.ts';

const apiRouter = Router();

apiRouter.use('/system', systemRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/quests', questRoutes);
apiRouter.use('/reviews', reviewRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/admin', adminRoutes);

// Top level aliases
apiRouter.get('/health', (req, res) => res.redirect('/api/system/health'));

export { apiRouter };
