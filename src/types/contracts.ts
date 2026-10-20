/**
 * LAKNES Platform Core Data Contracts
 * Conceptual and persistent domain entities for the Elysium ecosystem hub.
 */

export type EntityId = string;
export type ISODateString = string;

// ==========================================
// Enums & Domain Taxonomies
// ==========================================

export enum UserRole {
  USER = 'USER',
  PROJECT_MEMBER = 'PROJECT_MEMBER',
  ADMIN = 'ADMIN',
}

export enum ProjectCategory {
  DEFI = 'DEFI',
  GAMING = 'GAMING',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  NFT_METAVERSE = 'NFT_METAVERSE',
  TOOLING = 'TOOLING',
  SOCIAL = 'SOCIAL',
  DAO = 'DAO',
  OTHER = 'OTHER',
}

export enum ProjectVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REJECTED = 'REJECTED',
  SUSPENDED = 'SUSPENDED',
}

export enum MembershipRole {
  OWNER = 'OWNER',
  MAINTAINER = 'MAINTAINER',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export enum MembershipStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum PublicationStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuestType {
  COMMUNITY = 'COMMUNITY',
  ONCHAIN = 'ONCHAIN',
  SOCIAL = 'SOCIAL',
  DEVELOPER = 'DEVELOPER',
  FEEDBACK = 'FEEDBACK',
}

export enum QuestParticipationStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum QuestCompletionStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum ReviewDecision {
  APPROVED = 'APPROVED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
  REQUEST_CHANGES = 'CHANGES_REQUESTED', // Alias for compatibility
  REJECTED = 'REJECTED',
}

export enum ContentReportTargetType {
  PROJECT = 'PROJECT',
  PROJECT_UPDATE = 'PROJECT_UPDATE',
  QUEST = 'QUEST',
  USER = 'USER',
}

export enum ContentReportStatus {
  PENDING = 'PENDING',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export enum AuditAction {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_UPDATED = 'USER_UPDATED',
  PROJECT_SUBMITTED = 'PROJECT_SUBMITTED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_CORRECTIONS_SUBMITTED = 'PROJECT_CORRECTIONS_SUBMITTED',
  PROJECT_REVIEWED = 'PROJECT_REVIEWED',
  PROJECT_VERIFIED = 'PROJECT_VERIFIED',
  PROJECT_SUSPENDED = 'PROJECT_SUSPENDED',
  MEMBERSHIP_GRANTED = 'MEMBERSHIP_GRANTED',
  MEMBERSHIP_REVOKED = 'MEMBERSHIP_REVOKED',
  UPDATE_CREATED = 'UPDATE_CREATED',
  UPDATE_UPDATED = 'UPDATE_UPDATED',
  UPDATE_PUBLISHED = 'UPDATE_PUBLISHED',
  UPDATE_ARCHIVED = 'UPDATE_ARCHIVED',
  QUEST_CREATED = 'QUEST_CREATED',
  QUEST_PUBLISHED = 'QUEST_PUBLISHED',
  QUEST_VERIFIED = 'QUEST_VERIFIED',
  CONTENT_REPORT_SUBMITTED = 'CONTENT_REPORT_SUBMITTED',
  CONTENT_MODERATED = 'CONTENT_MODERATED',
}

// ==========================================
// Sub-types & Interfaces
// ==========================================

export interface SocialLinks {
  twitter?: string;
  telegram?: string;
  instagram?: string;
  discord?: string;
  github?: string;
  medium?: string;
  linkedin?: string;
  website?: string;
  customLinks?: Array<{ label: string; url: string }>;
}

export interface RepresentativeInfo {
  name?: string;
  role?: string;
  email?: string;
  socialHandle?: string;
}

export interface EligibilityRules {
  minFollowers?: number;
  requiredRoles?: UserRole[];
  ecosystemSpecificCondition?: string;
}

export interface CompletionCriteria {
  requiresProof: boolean;
  proofType?: 'URL' | 'TRANSACTION_HASH' | 'TEXT' | 'IMAGE';
  verificationMethod: 'MANUAL_REVIEW' | 'AUTOMATED_API';
}

export interface RewardConfiguration {
  rewardType: 'POINTS' | 'TOKEN' | 'NFT' | 'BADGE' | 'ROLE';
  amount?: number;
  rewardDetails?: string;
}

// ==========================================
// Core Entity Contracts
// ==========================================

/**
 * 1. USER
 */
export interface User {
  id: EntityId;
  name?: string;
  username: string;
  email: string;
  profileImage?: string;
  headerImage?: string;
  bio?: string;
  interests?: string[];
  xAccount?: string;
  socialLinks?: SocialLinks;
  roles: UserRole[];
  profileCompleted?: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface PublicUserProfile {
  id: EntityId;
  name?: string;
  username: string;
  profileImage?: string;
  headerImage?: string;
  bio?: string;
  interests?: string[];
  xAccount?: string;
  socialLinks?: SocialLinks;
  createdAt: ISODateString;
}

/**
 * Internal persistent user record including hashed credentials
 */
export interface UserRecord extends User {
  passwordHash: string;
  salt: string;
}

/**
 * 2. PROJECT
 */
export interface Project {
  id: EntityId;
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
  blockchainNetwork?: string;
  socialLinks: SocialLinks;
  contractAddresses?: string[];
  representativeInfo?: RepresentativeInfo;
  supportingInfo?: string;
  ecosystem: string; // e.g. "Elysium"
  verificationStatus: ProjectVerificationStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * 3. PROJECT MEMBERSHIP
 */
export interface ProjectMembership {
  id: EntityId;
  userId: EntityId;
  projectId: EntityId;
  role: MembershipRole;
  membershipStatus: MembershipStatus;
  createdAt: ISODateString;
}

export interface ProjectMemberWithUser extends ProjectMembership {
  user?: PublicUserProfile;
}

/**
 * 4. PROJECT UPDATE
 */
export interface ProjectUpdate {
  id: EntityId;
  projectId: EntityId;
  authorId: EntityId;
  title: string;
  content: string;
  links: string[];
  publicationStatus: PublicationStatus;
  publishedAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * 5. QUEST
 */
export interface Quest {
  id: EntityId;
  projectId: EntityId;
  title: string;
  description: string;
  instructions: string;
  questType: QuestType;
  eligibilityRules: EligibilityRules;
  completionCriteria: CompletionCriteria;
  startAt: ISODateString;
  deadline?: ISODateString;
  rewardConfiguration: RewardConfiguration;
  publicationStatus: PublicationStatus;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/**
 * 6. QUEST PARTICIPATION
 */
export interface QuestParticipation {
  id: EntityId;
  questId: EntityId;
  userId: EntityId;
  participationStatus: QuestParticipationStatus;
  completionStatus: QuestCompletionStatus;
  verificationStatus: QuestCompletionStatus;
  submissionProof?: string;
  verifiedBy?: EntityId;
  startedAt: ISODateString;
  completedAt?: ISODateString;
}

/**
 * 7. PROJECT FOLLOW
 */
export interface ProjectFollow {
  id: EntityId;
  userId: EntityId;
  projectId: EntityId;
  createdAt: ISODateString;
}

/**
 * 8. SAVED PROJECT
 */
export interface SavedProject {
  id: EntityId;
  userId: EntityId;
  projectId: EntityId;
  createdAt: ISODateString;
}

/**
 * 9. PROJECT REVIEW
 */
export interface ProjectReview {
  id: EntityId;
  projectId: EntityId;
  reviewerId: EntityId;
  decision: ReviewDecision;
  reviewNotes: string;
  createdAt: ISODateString;
}

/**
 * 10. CONTENT REPORT
 */
export interface ContentReport {
  id: EntityId;
  reporterId: EntityId;
  targetType: ContentReportTargetType;
  targetId: EntityId;
  reason: string;
  reportStatus: ContentReportStatus;
  createdAt: ISODateString;
}

/**
 * 11. AUDIT LOG
 */
export interface AuditLog {
  id: EntityId;
  actorId: EntityId;
  action: AuditAction;
  targetType: string;
  targetId: EntityId;
  details?: Record<string, unknown>;
  timestamp: ISODateString;
}

/**
 * Project Analytics summary contract
 */
export interface ProjectAnalytics {
  projectId: EntityId;
  followerCount: number;
  savedCount: number;
  totalQuests: number;
  activeQuests: number;
  totalParticipants: number;
  completedQuests: number;
  updatesCount: number;
  lastUpdatedAt: ISODateString;
}

/**
 * Project Dashboard Data for authorized representatives
 */
export interface ProjectDashboardData {
  project: Project;
  userRole: MembershipRole;
  members: ProjectMemberWithUser[];
  recentUpdates: ProjectUpdate[];
  quests: Quest[];
  analytics: ProjectAnalytics;
  latestReview?: ProjectReview;
  reviewHistory: ProjectReview[];
}
