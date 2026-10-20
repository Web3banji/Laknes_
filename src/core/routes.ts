/**
 * LAKNES Central Route Registry
 * Declarative constants for API routes and prepared frontend routes for Google Stitch.
 */

export const API_ROUTES = {
  HEALTH: '/api/health',
  SYSTEM_STATUS: '/api/system/status',

  AUTH: {
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    ME: '/api/auth/me',
    LOGOUT: '/api/auth/logout',
  },

  USERS: {
    BASE: '/api/users',
    PROFILE: (id: string) => `/api/users/${id}`,
    FOLLOWED_PROJECTS: (id: string) => `/api/users/${id}/follows`,
    SAVED_PROJECTS: (id: string) => `/api/users/${id}/saved`,
    QUESTS: (id: string) => `/api/users/${id}/quests`,
  },

  PROJECTS: {
    BASE: '/api/projects',
    DISCOVER: '/api/projects/discover',
    BY_ID: (id: string) => `/api/projects/${id}`,
    BY_SLUG: (slug: string) => `/api/projects/slug/${slug}`,
    SUBMIT: '/api/projects/submit',
    UPDATES: (projectId: string) => `/api/projects/${projectId}/updates`,
    QUESTS: (projectId: string) => `/api/projects/${projectId}/quests`,
    ANALYTICS: (projectId: string) => `/api/projects/${projectId}/analytics`,
    MEMBERS: (projectId: string) => `/api/projects/${projectId}/members`,
    FOLLOW: (projectId: string) => `/api/projects/${projectId}/follow`,
    SAVE: (projectId: string) => `/api/projects/${projectId}/save`,
  },

  QUESTS: {
    BASE: '/api/quests',
    BY_ID: (id: string) => `/api/quests/${id}`,
    JOIN: (id: string) => `/api/quests/${id}/join`,
    SUBMIT_PROOF: (id: string) => `/api/quests/${id}/submit`,
    VERIFY: (id: string) => `/api/quests/${id}/verify`,
  },

  REVIEWS: {
    BASE: '/api/reviews',
    PENDING: '/api/reviews/pending',
    BY_PROJECT: (projectId: string) => `/api/reviews/project/${projectId}`,
    SUBMIT: (projectId: string) => `/api/reviews/project/${projectId}`,
  },

  REPORTS: {
    BASE: '/api/reports',
    SUBMIT: '/api/reports',
    BY_ID: (id: string) => `/api/reports/${id}`,
  },

  ADMIN: {
    BASE: '/api/admin',
    AUDIT_LOGS: '/api/admin/audit-logs',
    MODERATION_QUEUE: '/api/admin/moderation',
    RESOLVE_REPORT: (reportId: string) => `/api/admin/reports/${reportId}/resolve`,
  },
} as const;

/**
 * Prepared frontend routes for Google Stitch React UI
 */
export const STITCH_VIEW_ROUTES = {
  HOME: '/',
  EXPLORE_PROJECTS: '/projects',
  PROJECT_DETAILS: (slug = ':slug') => `/projects/${slug}`,
  PROJECT_SUBMIT: '/projects/submit',
  PROJECT_MANAGE: (projectId = ':id') => `/projects/${projectId}/manage`,
  QUESTS: '/quests',
  QUEST_DETAILS: (questId = ':id') => `/quests/${questId}`,
  USER_PROFILE: (userId = ':id') => `/profile/${userId}`,
  USER_SETTINGS: '/settings',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_MODERATION: '/admin/moderation',
  ADMIN_AUDIT: '/admin/audit',
} as const;
