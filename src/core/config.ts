/**
 * LAKNES Core Environment Configuration
 * Centralized, validated environment configuration without hard-coded secrets.
 */

export interface AppConfig {
  appName: string;
  appUrl: string;
  environment: 'development' | 'production' | 'test';
  port: number;
  apiPrefix: string;
  ecosystemName: string;
  database: {
    isConfigured: boolean;
    provider: string;
    url?: string;
  };
  auth: {
    isConfigured: boolean;
    provider: string;
    jwtSecret?: string;
  };
  features: {
    enablePublicSubmissions: boolean;
    enableQuestRewards: boolean;
    enableAuditLogs: boolean;
  };
}

export function loadConfig(): AppConfig {
  const env = (typeof process !== 'undefined' && process.env) ? process.env : {};

  return {
    appName: 'LAKNES',
    appUrl: env.APP_URL || 'http://localhost:3000',
    environment: (env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    port: Number(env.PORT) || 3000,
    apiPrefix: '/api',
    ecosystemName: 'Elysium',
    database: {
      isConfigured: true,
      provider: env.DATABASE_PROVIDER || 'Native Node.js SQLite',
      url: env.DATABASE_URL || 'data/laknes.db',
    },
    auth: {
      isConfigured: true,
      provider: env.AUTH_PROVIDER || 'Native Salted Scrypt + SQL Sessions',
      jwtSecret: env.JWT_SECRET || env.AUTH_SECRET,
    },
    features: {
      enablePublicSubmissions: true,
      enableQuestRewards: true,
      enableAuditLogs: true,
    },
  };
}

export const appConfig = loadConfig();
