/**
 * LAKNES API Contracts
 * Standard response envelopes, pagination types, and endpoint payloads.
 */

import {
  EntityId,
  User,
  PublicUserProfile,
  Project,
  ProjectMembership,
  ProjectUpdate,
  Quest,
  QuestParticipation,
  ProjectReview,
  ContentReport,
  AuditLog,
  ProjectAnalytics,
  ProjectCategory,
  ProjectVerificationStatus,
  PublicationStatus,
  QuestType,
  ReviewDecision,
  ContentReportTargetType,
  RepresentativeInfo,
  MembershipRole,
} from './contracts.ts';

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
  meta?: {
    pagination?: PaginationMeta;
    timestamp: string;
    version?: string;
  };
}

// ==========================================
// Specific API Request & Response Payloads
// ==========================================

export interface ProjectSearchFilters extends PaginationParams {
  query?: string;
  category?: ProjectCategory;
  ecosystem?: string;
  verificationStatus?: ProjectVerificationStatus;
}

export interface SubmitProjectRequest {
  name: string;
  slug: string;
  logoUrl?: string;
  bannerUrl?: string;
  shortDescription: string;
  description: string;
  category: ProjectCategory;
  websiteUrl: string;
  documentationUrl?: string;
  communityUrl?: string;
  socialLinks?: Record<string, string>;
  contractAddresses?: string[];
  representativeInfo?: RepresentativeInfo;
  supportingInfo?: string;
  ecosystem?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  logoUrl?: string;
  bannerUrl?: string;
  shortDescription?: string;
  description?: string;
  category?: ProjectCategory;
  websiteUrl?: string;
  documentationUrl?: string;
  communityUrl?: string;
  socialLinks?: Record<string, string>;
  contractAddresses?: string[];
  supportingInfo?: string;
}

export interface SubmitProjectCorrectionsRequest {
  correctionsNotes: string;
  updatedFields?: UpdateProjectRequest;
}

export interface CreateProjectUpdateRequest {
  title: string;
  content: string;
  links?: string[];
  publicationStatus?: PublicationStatus;
}

export interface UpdateProjectUpdateRequest {
  title?: string;
  content?: string;
  links?: string[];
  publicationStatus?: PublicationStatus;
}

export interface InviteMemberRequest {
  userEmailOrUsername: string;
  role: MembershipRole;
}

export interface CreateQuestRequest {
  title: string;
  description: string;
  instructions: string;
  questType: QuestType;
  eligibilityRules?: {
    minFollowers?: number;
    ecosystemSpecificCondition?: string;
  };
  completionCriteria: {
    requiresProof: boolean;
    proofType?: 'URL' | 'TRANSACTION_HASH' | 'TEXT' | 'IMAGE';
    verificationMethod: 'MANUAL_REVIEW' | 'AUTOMATED_API';
  };
  startAt: string;
  deadline?: string;
  rewardConfiguration: {
    rewardType: 'POINTS' | 'TOKEN' | 'NFT' | 'BADGE' | 'ROLE';
    amount?: number;
    rewardDetails?: string;
  };
}

export interface SubmitQuestProofRequest {
  submissionProof: string;
}

export interface VerifyQuestCompletionRequest {
  decision: 'APPROVE' | 'REJECT';
  verificationNotes?: string;
}

export interface SubmitProjectReviewRequest {
  decision: ReviewDecision;
  reviewNotes: string;
}

export interface SubmitContentReportRequest {
  targetType: ContentReportTargetType;
  targetId: EntityId;
  reason: string;
}

export interface SystemStatusResponse {
  name: string;
  version: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'CONFIGURING';
  services: {
    coreApi: {
      status: 'AVAILABLE';
      routesConfigured: number;
    };
    database: {
      status: 'UNCONFIGURED' | 'CONFIGURED';
      adapter: string;
      message: string;
    };
    authentication: {
      status: 'UNCONFIGURED' | 'CONFIGURED';
      provider: string;
      message: string;
    };
    stitchIntegration: {
      status: 'READY';
      contractsVersion: string;
    };
  };
  timestamp: string;
}
