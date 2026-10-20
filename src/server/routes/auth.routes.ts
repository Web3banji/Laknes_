/**
 * LAKNES Authentication API Routes
 */

import { Router } from 'express';
import { authService } from '../../modules/auth/auth.service.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.ts';

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const session = await authService.register(req.body);
    res.status(201).json(buildSuccessResponse(session));
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const session = await authService.login(req.body);
    res.json(buildSuccessResponse(session));
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json(buildSuccessResponse(user));
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const token = req.headers.authorization?.substring(7) || '';
    await authService.logout(token);
    res.json(buildSuccessResponse({ message: 'Logged out successfully' }));
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/request', async (req, res, next) => {
  try {
    const result = await authService.requestPasswordReset(req.body);
    res.json(buildSuccessResponse(result));
  } catch (error) {
    next(error);
  }
});

router.post('/password-reset/confirm', async (req, res, next) => {
  try {
    await authService.confirmPasswordReset(req.body);
    res.json(buildSuccessResponse({ message: 'Password has been reset successfully.' }));
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json(buildSuccessResponse({ message: 'Password has been updated successfully.' }));
  } catch (error) {
    next(error);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const session = await authService.authenticateWithGoogle(req.body);
    res.json(buildSuccessResponse(session));
  } catch (error) {
    next(error);
  }
});

router.get('/google/config', async (_req, res) => {
  let clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
  let firebaseConfig: any = null;
  
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!clientId && firebaseConfig.oAuthClientId) {
        clientId = firebaseConfig.oAuthClientId;
      }
    }
  } catch {
    // Ignore error
  }

  res.json(buildSuccessResponse({
    clientId,
    isConfigured: Boolean(clientId),
    firebaseConfig,
  }));
});

router.post('/grant-role', requireAdmin, async (req, res, next) => {
  try {
    const user = await authService.grantRole(req.user!.id, req.body.targetUserId, req.body.role);
    res.json(buildSuccessResponse(user));
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;
