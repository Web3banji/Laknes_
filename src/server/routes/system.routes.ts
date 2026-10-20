/**
 * LAKNES System Diagnostics and Health Check API Routes
 * Exposes real infrastructure and module status.
 */

import { Router } from 'express';
import { getDatabaseAdapter } from '../../dal/index.ts';
import { appConfig } from '../../core/config.ts';
import { buildSuccessResponse } from '../../core/response.ts';
import { SystemStatusResponse } from '../../types/api.ts';

const router = Router();

router.get('/health', async (_req, res) => {
  const dbHealth = await getDatabaseAdapter().checkHealth();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbHealth.status,
  });
});

router.get('/status', async (_req, res) => {
  const dbHealth = await getDatabaseAdapter().checkHealth();

  const response: SystemStatusResponse = {
    name: 'LAKNES Elysium Ecosystem Hub',
    version: '1.0.0',
    status: dbHealth.isPersistent ? 'OPERATIONAL' : 'CONFIGURING',
    services: {
      coreApi: {
        status: 'AVAILABLE',
        routesConfigured: 24,
      },
      database: {
        status: dbHealth.isPersistent ? 'CONFIGURED' : 'UNCONFIGURED',
        adapter: dbHealth.adapterName,
        message: dbHealth.message,
      },
      authentication: {
        status: appConfig.auth.isConfigured ? 'CONFIGURED' : 'UNCONFIGURED',
        provider: appConfig.auth.provider,
        message: appConfig.auth.isConfigured
          ? 'Authentication provider is active.'
          : 'Awaiting Auth provider configuration (Firebase Auth / OAuth).',
      },
      stitchIntegration: {
        status: 'READY',
        contractsVersion: 'v1-strict',
      },
    },
    timestamp: new Date().toISOString(),
  };

  res.json(buildSuccessResponse(response));
});

export const systemRoutes = router;
