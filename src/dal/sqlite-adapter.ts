/**
 * LAKNES Persistent SQLite Database Adapter
 * Native SQL storage using Node.js built-in node:sqlite with schemas, constraints, and indexes.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { IDatabaseAdapter, DatabaseStatus, DatabaseHealth } from './adapter.ts';
import {
  RepositoryRegistry,
  IUserRepository,
  IProjectRepository,
  IProjectMembershipRepository,
  IProjectUpdateRepository,
  IQuestRepository,
  IQuestParticipationRepository,
  IProjectFollowRepository,
  ISavedProjectRepository,
  IProjectReviewRepository,
  IContentReportRepository,
  IAuditLogRepository,
  ISessionRepository,
  ProjectQueryFilters,
  PaginatedResult,
} from './repositories.ts';
import {
  User,
  UserRecord,
  Project,
  ProjectMembership,
  ProjectMemberWithUser,
  ProjectUpdate,
  Quest,
  QuestParticipation,
  ProjectFollow,
  SavedProject,
  ProjectReview,
  ContentReport,
  AuditLog,
  ProjectCategory,
  ProjectVerificationStatus,
  PublicationStatus,
  QuestType,
  QuestParticipationStatus,
  QuestCompletionStatus,
  ReviewDecision,
  ContentReportTargetType,
  ContentReportStatus,
  AuditAction,
  MembershipRole,
  MembershipStatus,
} from '../types/contracts.ts';
import { PaginationParams } from '../types/api.ts';
import { sanitizePagination, buildPaginationMeta } from '../shared/pagination.ts';
import { nowISO } from '../shared/datetime.ts';

export class SqliteDatabaseAdapter implements IDatabaseAdapter {
  public readonly name = 'SqliteDatabaseAdapter (Native Node.js SQLite)';
  public status: DatabaseStatus = 'DISCONNECTED';
  public readonly isPersistent = true;

  private db!: DatabaseSync;
  private dbPath: string;
  private repositories!: RepositoryRegistry;

  constructor(customPath?: string) {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = customPath || path.resolve(dataDir, 'laknes.db');
    this.connectSync();
  }

  private connectSync(): void {
    try {
      this.status = 'CONNECTING';
      this.db = new DatabaseSync(this.dbPath, {
        enableForeignKeyConstraints: true,
      });
      this.initSchema();
      this.status = 'CONNECTED';
      this.repositories = this.buildRepositories();
    } catch (err) {
      this.status = 'ERROR';
      throw err;
    }
  }

  async connect(): Promise<void> {
    if (this.status !== 'CONNECTED') {
      this.connectSync();
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.status = 'DISCONNECTED';
    }
  }

  async checkHealth(): Promise<DatabaseHealth> {
    return {
      status: this.status,
      adapterName: this.name,
      isPersistent: true,
      message: `SQLite database operational at ${this.dbPath}`,
    };
  }

  getRepositories(): RepositoryRegistry {
    if (!this.repositories) {
      this.connectSync();
    }
    return this.repositories;
  }

  getDb(): DatabaseSync {
    if (!this.db) {
      this.connectSync();
    }
    return this.db;
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        profile_image TEXT,
        bio TEXT,
        x_account TEXT,
        social_links TEXT,
        roles TEXT NOT NULL,
        profile_completed INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        logo_url TEXT,
        banner_url TEXT,
        short_description TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        website_url TEXT NOT NULL,
        documentation_url TEXT,
        community_url TEXT,
        blockchain_network TEXT,
        social_links TEXT NOT NULL,
        contract_addresses TEXT,
        representative_info TEXT,
        supporting_info TEXT,
        ecosystem TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_memberships (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        role TEXT NOT NULL,
        membership_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_updates (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        author_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        links TEXT NOT NULL,
        publication_status TEXT NOT NULL,
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quests (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        instructions TEXT NOT NULL,
        quest_type TEXT NOT NULL,
        eligibility_rules TEXT NOT NULL,
        completion_criteria TEXT NOT NULL,
        start_at TEXT NOT NULL,
        deadline TEXT,
        reward_configuration TEXT NOT NULL,
        publication_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS quest_participations (
        id TEXT PRIMARY KEY,
        quest_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        participation_status TEXT NOT NULL,
        completion_status TEXT NOT NULL,
        verification_status TEXT NOT NULL,
        submission_proof TEXT,
        verified_by TEXT,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        UNIQUE(quest_id, user_id),
        FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_follows (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS saved_projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, project_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS project_reviews (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        review_notes TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS content_reports (
        id TEXT PRIMARY KEY,
        reporter_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        report_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(verification_status);
      CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
      CREATE INDEX IF NOT EXISTS idx_memberships_proj ON project_memberships(project_id);
      CREATE INDEX IF NOT EXISTS idx_memberships_user ON project_memberships(user_id);
      CREATE INDEX IF NOT EXISTS idx_updates_proj ON project_updates(project_id);
      CREATE INDEX IF NOT EXISTS idx_follows_user ON project_follows(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_proj ON project_reviews(project_id);
      CREATE INDEX IF NOT EXISTS idx_reports_status ON content_reports(report_status);
      CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    `);

    // Safe dynamic column additions for existing databases
    try { this.db.exec('ALTER TABLE users ADD COLUMN name TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE users ADD COLUMN x_account TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE users ADD COLUMN social_links TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE users ADD COLUMN interests TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE users ADD COLUMN header_image TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN community_url TEXT'); } catch {}
    try { this.db.exec('ALTER TABLE projects ADD COLUMN blockchain_network TEXT'); } catch {}
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS saved_quests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          quest_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(user_id, quest_id),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (quest_id) REFERENCES quests(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_saved_quests_user ON saved_quests(user_id);
      `);
    } catch {}

    this.seedCanonicalDataIfNeeded();
  }

  private seedCanonicalDataIfNeeded(): void {
    try {
      const now = new Date().toISOString();

      // Ensure system admin exists for review panel
      const adminExists = this.db.prepare("SELECT id FROM users WHERE email = 'admin@elysium.org'").get() as { id: string } | undefined;
      if (!adminExists) {
        const adminId = crypto.randomUUID();
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = crypto.pbkdf2Sync('AdminElysium2026!', salt, 10000, 64, 'sha512').toString('hex');
        this.db.prepare(`
          INSERT INTO users (id, username, email, password_hash, salt, profile_image, bio, roles, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          adminId,
          'elysium_admin',
          'admin@elysium.org',
          passwordHash,
          salt,
          'https://lh3.googleusercontent.com/aida/AEtjO1V5cyyaQTFsv5FnNtyApKuUcWoOSBmKQpBBqqKlsisjUy2HBlwR_lSTNLyzJzm9QhyVvAx8Xq2ko76Al4Wsbz6iDzK8MWNRKxDpEbXYWPk-qXv3fK5Kg-2xj_4pGl4yXPOr4m93QMmT_ny1urp5u4UlKpNeS_aKY88fn7_DVV4X0fv4kRZhGxvmamNUmyaxGGBdKA8KSQ9OswtwOtBuDCGyvmYreRkbAoOvu84DmMod7KSwYQ1Uz-DNGh4IYYQfX9lv8kXkEtNlRg',
          'Elysium Foundation Core Ecosystem Maintainer',
          JSON.stringify(['USER', 'ADMIN']),
          now,
          now
        );
      }
    } catch (err) {
      console.warn('Admin user setup notice:', err);
    }
  }

  private mapUserRow(row: Record<string, unknown>, includeCredentials = false): any {
    const user: User = {
      id: String(row.id),
      name: row.name ? String(row.name) : undefined,
      username: String(row.username),
      email: String(row.email),
      profileImage: row.profile_image ? String(row.profile_image) : undefined,
      headerImage: row.header_image ? String(row.header_image) : undefined,
      bio: row.bio ? String(row.bio) : undefined,
      interests: row.interests ? JSON.parse(String(row.interests)) : [],
      xAccount: row.x_account ? String(row.x_account) : undefined,
      socialLinks: row.social_links ? JSON.parse(String(row.social_links)) : undefined,
      roles: JSON.parse(String(row.roles || '[]')),
      profileCompleted: Boolean(row.profile_completed ?? 1),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };

    if (includeCredentials) {
      return {
        ...user,
        passwordHash: String(row.password_hash),
        salt: String(row.salt),
      } as UserRecord;
    }

    return user;
  }

  private mapProjectRow(row: Record<string, unknown>): Project {
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      logoUrl: row.logo_url ? String(row.logo_url) : undefined,
      bannerUrl: row.banner_url ? String(row.banner_url) : undefined,
      shortDescription: String(row.short_description),
      description: String(row.description),
      category: row.category as ProjectCategory,
      websiteUrl: String(row.website_url),
      documentationUrl: row.documentation_url ? String(row.documentation_url) : undefined,
      communityUrl: row.community_url ? String(row.community_url) : undefined,
      blockchainNetwork: row.blockchain_network ? String(row.blockchain_network) : undefined,
      socialLinks: JSON.parse(String(row.social_links || '{}')),
      contractAddresses: row.contract_addresses ? JSON.parse(String(row.contract_addresses)) : undefined,
      representativeInfo: row.representative_info ? JSON.parse(String(row.representative_info)) : undefined,
      supportingInfo: row.supporting_info ? String(row.supporting_info) : undefined,
      ecosystem: String(row.ecosystem),
      verificationStatus: row.verification_status as ProjectVerificationStatus,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private buildRepositories(): RepositoryRegistry {
    const db = this.db;
    const mapUser = this.mapUserRow;
    const mapProject = this.mapProjectRow;

    const users: IUserRepository = {
      async findById(id) {
        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return row ? mapUser(row, false) : null;
      },
      async findByIdWithCredentials(id) {
        const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
        return row ? mapUser(row, true) : null;
      },
      async findByEmail(email) {
        const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
        return row ? mapUser(row, false) : null;
      },
      async findByEmailWithCredentials(email) {
        const row = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
        return row ? mapUser(row, true) : null;
      },
      async findByUsername(username) {
        const row = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
        return row ? mapUser(row, false) : null;
      },
      async create(userData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO users (
            id, name, username, email, password_hash, salt, profile_image, bio,
            x_account, social_links, roles, profile_completed, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          userData.name || null,
          userData.username,
          userData.email.toLowerCase(),
          userData.passwordHash,
          userData.salt,
          userData.profileImage || null,
          userData.bio || null,
          userData.xAccount || null,
          userData.socialLinks ? JSON.stringify(userData.socialLinks) : null,
          JSON.stringify(userData.roles),
          userData.profileCompleted === false ? 0 : 1,
          now,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        const existing = await this.findById(id);
        if (!existing) throw new Error(`User ${id} not found`);

        const sets: string[] = [];
        const params: unknown[] = [];

        if (updates.name !== undefined) {
          sets.push('name = ?');
          params.push(updates.name || null);
        }
        if (updates.username !== undefined) {
          sets.push('username = ?');
          params.push(updates.username);
        }
        if (updates.email !== undefined) {
          sets.push('email = ?');
          params.push(updates.email.toLowerCase());
        }
        if (updates.profileImage !== undefined) {
          sets.push('profile_image = ?');
          params.push(updates.profileImage || null);
        }
        if (updates.headerImage !== undefined) {
          sets.push('header_image = ?');
          params.push(updates.headerImage || null);
        }
        if (updates.bio !== undefined) {
          sets.push('bio = ?');
          params.push(updates.bio || null);
        }
        if (updates.interests !== undefined) {
          sets.push('interests = ?');
          params.push(updates.interests ? JSON.stringify(updates.interests) : null);
        }
        if (updates.xAccount !== undefined) {
          sets.push('x_account = ?');
          params.push(updates.xAccount || null);
        }
        if (updates.socialLinks !== undefined) {
          sets.push('social_links = ?');
          params.push(updates.socialLinks ? JSON.stringify(updates.socialLinks) : null);
        }
        if (updates.profileCompleted !== undefined) {
          sets.push('profile_completed = ?');
          params.push(updates.profileCompleted ? 1 : 0);
        }
        if (updates.roles !== undefined) {
          sets.push('roles = ?');
          params.push(JSON.stringify(updates.roles));
        }
        if (updates.passwordHash !== undefined && updates.salt !== undefined) {
          sets.push('password_hash = ?', 'salt = ?');
          params.push(updates.passwordHash, updates.salt);
        }

        sets.push('updated_at = ?');
        params.push(nowISO());
        params.push(id);

        db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
      async delete(id) {
        const res = db.prepare('DELETE FROM users WHERE id = ?').run(id);
        return res.changes > 0;
      },
      async count() {
        const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
        return row ? Number(row.c) : 0;
      },
    };

    const projects: IProjectRepository = {
      async findById(id) {
        const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        return row ? mapProject(row) : null;
      },
      async findBySlug(slug) {
        const row = db.prepare('SELECT * FROM projects WHERE LOWER(slug) = LOWER(?)').get(slug);
        return row ? mapProject(row) : null;
      },
      async findMany(filters: ProjectQueryFilters) {
        const where: string[] = [];
        const params: unknown[] = [];

        if (filters.verificationStatus) {
          where.push('verification_status = ?');
          params.push(filters.verificationStatus);
        }
        if (filters.category) {
          where.push('category = ?');
          params.push(filters.category);
        }
        if (filters.ecosystem) {
          where.push('LOWER(ecosystem) = LOWER(?)');
          params.push(filters.ecosystem);
        }
        if (filters.search) {
          where.push('(slug LIKE ? OR name LIKE ? OR short_description LIKE ? OR description LIKE ?)');
          const q = `%${filters.search}%`;
          params.push(q, q, q, q);
        }

        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

        // Count total
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM projects ${whereSql}`).get(...params) as { total: number };
        const totalItems = countRow ? Number(countRow.total) : 0;

        const { page, limit, offset, sortBy, sortOrder } = sanitizePagination(filters);
        const orderColumn = sortBy === 'name' ? 'name' : 'created_at';
        const orderDirection = sortOrder.toUpperCase();

        const rows = db.prepare(`
          SELECT * FROM projects
          ${whereSql}
          ORDER BY ${orderColumn} ${orderDirection}
          LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        const items = rows.map((r) => mapProject(r));
        return {
          items,
          meta: buildPaginationMeta(totalItems, page, limit),
        };
      },
      async create(projectData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO projects (
            id, name, slug, logo_url, banner_url, short_description, description,
            category, website_url, documentation_url, community_url, blockchain_network,
            social_links, contract_addresses, representative_info, supporting_info,
            ecosystem, verification_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          projectData.name,
          projectData.slug.toLowerCase(),
          projectData.logoUrl || null,
          projectData.bannerUrl || null,
          projectData.shortDescription,
          projectData.description,
          projectData.category,
          projectData.websiteUrl,
          projectData.documentationUrl || null,
          projectData.communityUrl || null,
          projectData.blockchainNetwork || null,
          JSON.stringify(projectData.socialLinks || {}),
          projectData.contractAddresses ? JSON.stringify(projectData.contractAddresses) : null,
          projectData.representativeInfo ? JSON.stringify(projectData.representativeInfo) : null,
          projectData.supportingInfo || null,
          projectData.ecosystem,
          projectData.verificationStatus,
          now,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        const sets: string[] = [];
        const params: unknown[] = [];

        if (updates.name !== undefined) {
          sets.push('name = ?');
          params.push(updates.name);
        }
        if (updates.slug !== undefined) {
          sets.push('slug = ?');
          params.push(updates.slug.toLowerCase());
        }
        if (updates.logoUrl !== undefined) {
          sets.push('logo_url = ?');
          params.push(updates.logoUrl);
        }
        if (updates.bannerUrl !== undefined) {
          sets.push('banner_url = ?');
          params.push(updates.bannerUrl);
        }
        if (updates.shortDescription !== undefined) {
          sets.push('short_description = ?');
          params.push(updates.shortDescription);
        }
        if (updates.description !== undefined) {
          sets.push('description = ?');
          params.push(updates.description);
        }
        if (updates.category !== undefined) {
          sets.push('category = ?');
          params.push(updates.category);
        }
        if (updates.websiteUrl !== undefined) {
          sets.push('website_url = ?');
          params.push(updates.websiteUrl);
        }
        if (updates.documentationUrl !== undefined) {
          sets.push('documentation_url = ?');
          params.push(updates.documentationUrl);
        }
        if (updates.communityUrl !== undefined) {
          sets.push('community_url = ?');
          params.push(updates.communityUrl);
        }
        if (updates.blockchainNetwork !== undefined) {
          sets.push('blockchain_network = ?');
          params.push(updates.blockchainNetwork);
        }
        if (updates.socialLinks !== undefined) {
          sets.push('social_links = ?');
          params.push(JSON.stringify(updates.socialLinks));
        }
        if (updates.contractAddresses !== undefined) {
          sets.push('contract_addresses = ?');
          params.push(JSON.stringify(updates.contractAddresses));
        }
        if (updates.representativeInfo !== undefined) {
          sets.push('representative_info = ?');
          params.push(JSON.stringify(updates.representativeInfo));
        }
        if (updates.supportingInfo !== undefined) {
          sets.push('supporting_info = ?');
          params.push(updates.supportingInfo);
        }
        if (updates.verificationStatus !== undefined) {
          sets.push('verification_status = ?');
          params.push(updates.verificationStatus);
        }

        sets.push('updated_at = ?');
        params.push(nowISO());
        params.push(id);

        db.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
      async count(filters = {}) {
        const where: string[] = [];
        const params: unknown[] = [];

        if (filters.verificationStatus) {
          where.push('verification_status = ?');
          params.push(filters.verificationStatus);
        }
        if (filters.category) {
          where.push('category = ?');
          params.push(filters.category);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const row = db.prepare(`SELECT COUNT(*) as c FROM projects ${whereSql}`).get(...params) as { c: number };
        return row ? Number(row.c) : 0;
      },
    };

    const memberships: IProjectMembershipRepository = {
      async findById(id) {
        const row = db.prepare('SELECT * FROM project_memberships WHERE id = ?').get(id);
        if (!row) return null;
        return {
          id: String(row.id),
          userId: String(row.user_id),
          projectId: String(row.project_id),
          role: row.role as MembershipRole,
          membershipStatus: row.membership_status as MembershipStatus,
          createdAt: String(row.created_at),
        };
      },
      async findByUserAndProject(userId, projectId) {
        const row = db.prepare('SELECT * FROM project_memberships WHERE user_id = ? AND project_id = ?').get(userId, projectId);
        if (!row) return null;
        return {
          id: String(row.id),
          userId: String(row.user_id),
          projectId: String(row.project_id),
          role: row.role as MembershipRole,
          membershipStatus: row.membership_status as MembershipStatus,
          createdAt: String(row.created_at),
        };
      },
      async findByProject(projectId) {
        const rows = db.prepare(`
          SELECT pm.*, u.username, u.profile_image, u.bio, u.created_at as user_created_at
          FROM project_memberships pm
          LEFT JOIN users u ON pm.user_id = u.id
          WHERE pm.project_id = ?
        `).all(projectId);

        return rows.map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          role: r.role as MembershipRole,
          membershipStatus: r.membership_status as MembershipStatus,
          createdAt: String(r.created_at),
          user: r.username ? {
            id: String(r.user_id),
            username: String(r.username),
            profileImage: r.profile_image ? String(r.profile_image) : undefined,
            bio: r.bio ? String(r.bio) : undefined,
            createdAt: String(r.user_created_at),
          } : undefined,
        }));
      },
      async findByUser(userId) {
        const rows = db.prepare('SELECT * FROM project_memberships WHERE user_id = ?').all(userId);
        return rows.map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          role: r.role as MembershipRole,
          membershipStatus: r.membership_status as MembershipStatus,
          createdAt: String(r.created_at),
        }));
      },
      async create(membership) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO project_memberships (id, user_id, project_id, role, membership_status, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          id,
          membership.userId,
          membership.projectId,
          membership.role,
          membership.membershipStatus,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (updates.role !== undefined) {
          sets.push('role = ?');
          params.push(updates.role);
        }
        if (updates.membershipStatus !== undefined) {
          sets.push('membership_status = ?');
          params.push(updates.membershipStatus);
        }
        params.push(id);
        db.prepare(`UPDATE project_memberships SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
      async delete(id) {
        const res = db.prepare('DELETE FROM project_memberships WHERE id = ?').run(id);
        return res.changes > 0;
      },
    };

    const updates: IProjectUpdateRepository = {
      async findById(id) {
        const r = db.prepare('SELECT * FROM project_updates WHERE id = ?').get(id);
        if (!r) return null;
        return {
          id: String(r.id),
          projectId: String(r.project_id),
          authorId: String(r.author_id),
          title: String(r.title),
          content: String(r.content),
          links: JSON.parse(String(r.links || '[]')),
          publicationStatus: r.publication_status as PublicationStatus,
          publishedAt: r.published_at ? String(r.published_at) : undefined,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        };
      },
      async findByProject(projectId, pagination, includeNonPublished = false) {
        const whereClause = includeNonPublished
          ? 'WHERE project_id = ?'
          : "WHERE project_id = ? AND publication_status = 'PUBLISHED'";

        const countRow = db.prepare(`SELECT COUNT(*) as c FROM project_updates ${whereClause}`).get(projectId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;

        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`
          SELECT * FROM project_updates
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `).all(projectId, limit, offset);

        const items = rows.map((r) => ({
          id: String(r.id),
          projectId: String(r.project_id),
          authorId: String(r.author_id),
          title: String(r.title),
          content: String(r.content),
          links: JSON.parse(String(r.links || '[]')),
          publicationStatus: r.publication_status as PublicationStatus,
          publishedAt: r.published_at ? String(r.published_at) : undefined,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        }));

        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async create(updateData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO project_updates (id, project_id, author_id, title, content, links, publication_status, published_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          updateData.projectId,
          updateData.authorId,
          updateData.title,
          updateData.content,
          JSON.stringify(updateData.links || []),
          updateData.publicationStatus,
          updateData.publishedAt || null,
          now,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, u) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (u.title !== undefined) {
          sets.push('title = ?');
          params.push(u.title);
        }
        if (u.content !== undefined) {
          sets.push('content = ?');
          params.push(u.content);
        }
        if (u.links !== undefined) {
          sets.push('links = ?');
          params.push(JSON.stringify(u.links));
        }
        if (u.publicationStatus !== undefined) {
          sets.push('publication_status = ?');
          params.push(u.publicationStatus);
        }
        if (u.publishedAt !== undefined) {
          sets.push('published_at = ?');
          params.push(u.publishedAt);
        }
        sets.push('updated_at = ?');
        params.push(nowISO());
        params.push(id);

        db.prepare(`UPDATE project_updates SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
      async delete(id) {
        const res = db.prepare('DELETE FROM project_updates WHERE id = ?').run(id);
        return res.changes > 0;
      },
    };

    const quests: IQuestRepository = {
      async findById(id) {
        const r = db.prepare('SELECT * FROM quests WHERE id = ?').get(id);
        if (!r) return null;
        return {
          id: String(r.id),
          projectId: String(r.project_id),
          title: String(r.title),
          description: String(r.description),
          instructions: String(r.instructions),
          questType: r.quest_type as QuestType,
          eligibilityRules: JSON.parse(String(r.eligibility_rules || '{}')),
          completionCriteria: JSON.parse(String(r.completion_criteria || '{}')),
          startAt: String(r.start_at),
          deadline: r.deadline ? String(r.deadline) : undefined,
          rewardConfiguration: JSON.parse(String(r.reward_configuration || '{}')),
          publicationStatus: r.publication_status as PublicationStatus,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        };
      },
      async findByProject(projectId, pagination) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM quests WHERE project_id = ?').get(projectId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare('SELECT * FROM quests WHERE project_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(projectId, limit, offset);
        const items = rows.map((r) => ({
          id: String(r.id),
          projectId: String(r.project_id),
          title: String(r.title),
          description: String(r.description),
          instructions: String(r.instructions),
          questType: r.quest_type as QuestType,
          eligibilityRules: JSON.parse(String(r.eligibility_rules || '{}')),
          completionCriteria: JSON.parse(String(r.completion_criteria || '{}')),
          startAt: String(r.start_at),
          deadline: r.deadline ? String(r.deadline) : undefined,
          rewardConfiguration: JSON.parse(String(r.reward_configuration || '{}')),
          publicationStatus: r.publication_status as PublicationStatus,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async findActive(pagination) {
        const now = nowISO();
        const countRow = db.prepare(`
          SELECT COUNT(*) as c FROM quests
          WHERE publication_status = 'PUBLISHED' AND (deadline IS NULL OR deadline > ?)
        `).get(now) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`
          SELECT * FROM quests
          WHERE publication_status = 'PUBLISHED' AND (deadline IS NULL OR deadline > ?)
          ORDER BY created_at DESC LIMIT ? OFFSET ?
        `).all(now, limit, offset);

        const items = rows.map((r) => ({
          id: String(r.id),
          projectId: String(r.project_id),
          title: String(r.title),
          description: String(r.description),
          instructions: String(r.instructions),
          questType: r.quest_type as QuestType,
          eligibilityRules: JSON.parse(String(r.eligibility_rules || '{}')),
          completionCriteria: JSON.parse(String(r.completion_criteria || '{}')),
          startAt: String(r.start_at),
          deadline: r.deadline ? String(r.deadline) : undefined,
          rewardConfiguration: JSON.parse(String(r.reward_configuration || '{}')),
          publicationStatus: r.publication_status as PublicationStatus,
          createdAt: String(r.created_at),
          updatedAt: String(r.updated_at),
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async create(q) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO quests (
            id, project_id, title, description, instructions, quest_type,
            eligibility_rules, completion_criteria, start_at, deadline,
            reward_configuration, publication_status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          q.projectId,
          q.title,
          q.description,
          q.instructions,
          q.questType,
          JSON.stringify(q.eligibilityRules || {}),
          JSON.stringify(q.completionCriteria || {}),
          q.startAt,
          q.deadline || null,
          JSON.stringify(q.rewardConfiguration || {}),
          q.publicationStatus,
          now,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (updates.title !== undefined) {
          sets.push('title = ?');
          params.push(updates.title);
        }
        if (updates.description !== undefined) {
          sets.push('description = ?');
          params.push(updates.description);
        }
        if (updates.instructions !== undefined) {
          sets.push('instructions = ?');
          params.push(updates.instructions);
        }
        if (updates.publicationStatus !== undefined) {
          sets.push('publication_status = ?');
          params.push(updates.publicationStatus);
        }
        sets.push('updated_at = ?');
        params.push(nowISO());
        params.push(id);
        db.prepare(`UPDATE quests SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
      async delete(id) {
        const res = db.prepare('DELETE FROM quests WHERE id = ?').run(id);
        return res.changes > 0;
      },
    };

    const questParticipations: IQuestParticipationRepository = {
      async findById(id) {
        const r = db.prepare('SELECT * FROM quest_participations WHERE id = ?').get(id);
        if (!r) return null;
        return {
          id: String(r.id),
          questId: String(r.quest_id),
          userId: String(r.user_id),
          participationStatus: r.participation_status as QuestParticipationStatus,
          completionStatus: r.completion_status as QuestCompletionStatus,
          verificationStatus: r.verification_status as QuestCompletionStatus,
          submissionProof: r.submission_proof ? String(r.submission_proof) : undefined,
          verifiedBy: r.verified_by ? String(r.verified_by) : undefined,
          startedAt: String(r.started_at),
          completedAt: r.completed_at ? String(r.completed_at) : undefined,
        };
      },
      async findByUserAndQuest(userId, questId) {
        const r = db.prepare('SELECT * FROM quest_participations WHERE user_id = ? AND quest_id = ?').get(userId, questId);
        if (!r) return null;
        return {
          id: String(r.id),
          questId: String(r.quest_id),
          userId: String(r.user_id),
          participationStatus: r.participation_status as QuestParticipationStatus,
          completionStatus: r.completion_status as QuestCompletionStatus,
          verificationStatus: r.verification_status as QuestCompletionStatus,
          submissionProof: r.submission_proof ? String(r.submission_proof) : undefined,
          verifiedBy: r.verified_by ? String(r.verified_by) : undefined,
          startedAt: String(r.started_at),
          completedAt: r.completed_at ? String(r.completed_at) : undefined,
        };
      },
      async findByUser(userId, pagination) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM quest_participations WHERE user_id = ?').get(userId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare('SELECT * FROM quest_participations WHERE user_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?').all(userId, limit, offset);
        const items = rows.map((r) => ({
          id: String(r.id),
          questId: String(r.quest_id),
          userId: String(r.user_id),
          participationStatus: r.participation_status as QuestParticipationStatus,
          completionStatus: r.completion_status as QuestCompletionStatus,
          verificationStatus: r.verification_status as QuestCompletionStatus,
          submissionProof: r.submission_proof ? String(r.submission_proof) : undefined,
          verifiedBy: r.verified_by ? String(r.verified_by) : undefined,
          startedAt: String(r.started_at),
          completedAt: r.completed_at ? String(r.completed_at) : undefined,
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async findByQuest(questId, pagination) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM quest_participations WHERE quest_id = ?').get(questId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare('SELECT * FROM quest_participations WHERE quest_id = ? ORDER BY started_at DESC LIMIT ? OFFSET ?').all(questId, limit, offset);
        const items = rows.map((r) => ({
          id: String(r.id),
          questId: String(r.quest_id),
          userId: String(r.user_id),
          participationStatus: r.participation_status as QuestParticipationStatus,
          completionStatus: r.completion_status as QuestCompletionStatus,
          verificationStatus: r.verification_status as QuestCompletionStatus,
          submissionProof: r.submission_proof ? String(r.submission_proof) : undefined,
          verifiedBy: r.verified_by ? String(r.verified_by) : undefined,
          startedAt: String(r.started_at),
          completedAt: r.completed_at ? String(r.completed_at) : undefined,
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async create(p) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare(`
          INSERT INTO quest_participations (
            id, quest_id, user_id, participation_status, completion_status,
            verification_status, submission_proof, verified_by, started_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          p.questId,
          p.userId,
          p.participationStatus,
          p.completionStatus,
          p.verificationStatus,
          p.submissionProof || null,
          p.verifiedBy || null,
          now,
          p.completedAt || null
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        const sets: string[] = [];
        const params: unknown[] = [];
        if (updates.participationStatus !== undefined) {
          sets.push('participation_status = ?');
          params.push(updates.participationStatus);
        }
        if (updates.completionStatus !== undefined) {
          sets.push('completion_status = ?');
          params.push(updates.completionStatus);
        }
        if (updates.verificationStatus !== undefined) {
          sets.push('verification_status = ?');
          params.push(updates.verificationStatus);
        }
        if (updates.submissionProof !== undefined) {
          sets.push('submission_proof = ?');
          params.push(updates.submissionProof);
        }
        if (updates.verifiedBy !== undefined) {
          sets.push('verified_by = ?');
          params.push(updates.verifiedBy);
        }
        if (updates.completedAt !== undefined) {
          sets.push('completed_at = ?');
          params.push(updates.completedAt);
        }
        params.push(id);
        db.prepare(`UPDATE quest_participations SET ${sets.join(', ')} WHERE id = ?`).run(...params);
        return (await this.findById(id))!;
      },
    };

    const follows: IProjectFollowRepository = {
      async find(userId, projectId) {
        const r = db.prepare('SELECT * FROM project_follows WHERE user_id = ? AND project_id = ?').get(userId, projectId);
        if (!r) return null;
        return {
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          createdAt: String(r.created_at),
        };
      },
      async findByUser(userId, pagination) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM project_follows WHERE user_id = ?').get(userId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`
          SELECT pf.*, p.name as p_name, p.slug as p_slug, p.logo_url as p_logo, p.category as p_cat, p.verification_status as p_stat
          FROM project_follows pf
          LEFT JOIN projects p ON pf.project_id = p.id
          WHERE pf.user_id = ?
          ORDER BY pf.created_at DESC
          LIMIT ? OFFSET ?
        `).all(userId, limit, offset);

        const items = rows.map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          createdAt: String(r.created_at),
          project: r.p_name ? {
            id: String(r.project_id),
            name: String(r.p_name),
            slug: String(r.p_slug),
            logoUrl: r.p_logo ? String(r.p_logo) : undefined,
            category: r.p_cat as ProjectCategory,
            verificationStatus: r.p_stat as ProjectVerificationStatus,
          } as Project : undefined,
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async countByProject(projectId) {
        const row = db.prepare('SELECT COUNT(*) as c FROM project_follows WHERE project_id = ?').get(projectId) as { c: number };
        return row ? Number(row.c) : 0;
      },
      async create(userId, projectId) {
        const existing = await this.find(userId, projectId);
        if (existing) return existing;

        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare('INSERT INTO project_follows (id, user_id, project_id, created_at) VALUES (?, ?, ?, ?)').run(id, userId, projectId, now);
        return (await this.find(userId, projectId))!;
      },
      async delete(userId, projectId) {
        const res = db.prepare('DELETE FROM project_follows WHERE user_id = ? AND project_id = ?').run(userId, projectId);
        return res.changes > 0;
      },
    };

    const savedProjects: ISavedProjectRepository = {
      async find(userId, projectId) {
        const r = db.prepare('SELECT * FROM saved_projects WHERE user_id = ? AND project_id = ?').get(userId, projectId);
        if (!r) return null;
        return {
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          createdAt: String(r.created_at),
        };
      },
      async findByUser(userId, pagination) {
        const countRow = db.prepare('SELECT COUNT(*) as c FROM saved_projects WHERE user_id = ?').get(userId) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`
          SELECT sp.*, p.name as p_name, p.slug as p_slug, p.logo_url as p_logo, p.category as p_cat, p.verification_status as p_stat
          FROM saved_projects sp
          LEFT JOIN projects p ON sp.project_id = p.id
          WHERE sp.user_id = ?
          ORDER BY sp.created_at DESC
          LIMIT ? OFFSET ?
        `).all(userId, limit, offset);

        const items = rows.map((r) => ({
          id: String(r.id),
          userId: String(r.user_id),
          projectId: String(r.project_id),
          createdAt: String(r.created_at),
          project: r.p_name ? {
            id: String(r.project_id),
            name: String(r.p_name),
            slug: String(r.p_slug),
            logoUrl: r.p_logo ? String(r.p_logo) : undefined,
            category: r.p_cat as ProjectCategory,
            verificationStatus: r.p_stat as ProjectVerificationStatus,
          } as Project : undefined,
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async countByProject(projectId) {
        const row = db.prepare('SELECT COUNT(*) as c FROM saved_projects WHERE project_id = ?').get(projectId) as { c: number };
        return row ? Number(row.c) : 0;
      },
      async create(userId, projectId) {
        const existing = await this.find(userId, projectId);
        if (existing) return existing;

        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare('INSERT INTO saved_projects (id, user_id, project_id, created_at) VALUES (?, ?, ?, ?)').run(id, userId, projectId, now);
        return (await this.find(userId, projectId))!;
      },
      async delete(userId, projectId) {
        const res = db.prepare('DELETE FROM saved_projects WHERE user_id = ? AND project_id = ?').run(userId, projectId);
        return res.changes > 0;
      },
    };

    const reviews: IProjectReviewRepository = {
      async findById(id) {
        const r = db.prepare('SELECT * FROM project_reviews WHERE id = ?').get(id);
        if (!r) return null;
        return {
          id: String(r.id),
          projectId: String(r.project_id),
          reviewerId: String(r.reviewer_id),
          decision: r.decision as ReviewDecision,
          reviewNotes: String(r.review_notes),
          createdAt: String(r.created_at),
        };
      },
      async findByProject(projectId) {
        const rows = db.prepare('SELECT * FROM project_reviews WHERE project_id = ? ORDER BY created_at DESC').all(projectId);
        return rows.map((r) => ({
          id: String(r.id),
          projectId: String(r.project_id),
          reviewerId: String(r.reviewer_id),
          decision: r.decision as ReviewDecision,
          reviewNotes: String(r.review_notes),
          createdAt: String(r.created_at),
        }));
      },
      async findPending(pagination) {
        // Query projects that are in PENDING_REVIEW or CHANGES_REQUESTED
        const countRow = db.prepare("SELECT COUNT(*) as c FROM projects WHERE verification_status IN ('PENDING_REVIEW', 'CHANGES_REQUESTED')").get() as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`
          SELECT p.*, r.id as review_id, r.reviewer_id, r.decision, r.review_notes, r.created_at as review_created_at
          FROM projects p
          LEFT JOIN project_reviews r ON p.id = r.project_id
          WHERE p.verification_status IN ('PENDING_REVIEW', 'CHANGES_REQUESTED')
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `).all(limit, offset);

        const items = rows.map((r) => ({
          id: r.review_id ? String(r.review_id) : String(r.id),
          projectId: String(r.id),
          reviewerId: r.reviewer_id ? String(r.reviewer_id) : 'SYSTEM',
          decision: (r.decision || 'PENDING') as ReviewDecision,
          reviewNotes: r.review_notes ? String(r.review_notes) : 'Pending administrative evaluation',
          createdAt: r.review_created_at ? String(r.review_created_at) : String(r.created_at),
          project: mapProject(r),
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async create(reviewData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare('INSERT INTO project_reviews (id, project_id, reviewer_id, decision, review_notes, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          id,
          reviewData.projectId,
          reviewData.reviewerId,
          reviewData.decision,
          reviewData.reviewNotes,
          now
        );
        return (await this.findById(id))!;
      },
    };

    const reports: IContentReportRepository = {
      async findById(id) {
        const r = db.prepare('SELECT * FROM content_reports WHERE id = ?').get(id);
        if (!r) return null;
        return {
          id: String(r.id),
          reporterId: String(r.reporter_id),
          targetType: r.target_type as ContentReportTargetType,
          targetId: String(r.target_id),
          reason: String(r.reason),
          reportStatus: r.report_status as ContentReportStatus,
          createdAt: String(r.created_at),
        };
      },
      async findPending(pagination) {
        const countRow = db.prepare("SELECT COUNT(*) as c FROM content_reports WHERE report_status = 'PENDING'").get() as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare("SELECT * FROM content_reports WHERE report_status = 'PENDING' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
        const items = rows.map((r) => ({
          id: String(r.id),
          reporterId: String(r.reporter_id),
          targetType: r.target_type as ContentReportTargetType,
          targetId: String(r.target_id),
          reason: String(r.reason),
          reportStatus: r.report_status as ContentReportStatus,
          createdAt: String(r.created_at),
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
      async create(reportData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare('INSERT INTO content_reports (id, reporter_id, target_type, target_id, reason, report_status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id,
          reportData.reporterId,
          reportData.targetType,
          reportData.targetId,
          reportData.reason,
          reportData.reportStatus,
          now
        );
        return (await this.findById(id))!;
      },
      async update(id, updates) {
        if (updates.reportStatus) {
          db.prepare('UPDATE content_reports SET report_status = ? WHERE id = ?').run(updates.reportStatus, id);
        }
        return (await this.findById(id))!;
      },
    };

    const auditLogs: IAuditLogRepository = {
      async create(logData) {
        const id = crypto.randomUUID();
        const now = nowISO();
        db.prepare('INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, details, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          id,
          logData.actorId,
          logData.action,
          logData.targetType,
          logData.targetId,
          logData.details ? JSON.stringify(logData.details) : null,
          now
        );
        return {
          id,
          actorId: logData.actorId,
          action: logData.action,
          targetType: logData.targetType,
          targetId: logData.targetId,
          details: logData.details,
          timestamp: now,
        };
      },
      async findMany(filters, pagination) {
        const where: string[] = [];
        const params: unknown[] = [];
        if (filters?.actorId) {
          where.push('actor_id = ?');
          params.push(filters.actorId);
        }
        if (filters?.targetType) {
          where.push('target_type = ?');
          params.push(filters.targetType);
        }
        if (filters?.targetId) {
          where.push('target_id = ?');
          params.push(filters.targetId);
        }
        const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const countRow = db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${whereSql}`).get(...params) as { c: number };
        const total = countRow ? Number(countRow.c) : 0;
        const { page, limit, offset } = sanitizePagination(pagination);
        const rows = db.prepare(`SELECT * FROM audit_logs ${whereSql} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
        const items = rows.map((r) => ({
          id: String(r.id),
          actorId: String(r.actor_id),
          action: r.action as AuditAction,
          targetType: String(r.target_type),
          targetId: String(r.target_id),
          details: r.details ? JSON.parse(String(r.details)) : undefined,
          timestamp: String(r.timestamp),
        }));
        return { items, meta: buildPaginationMeta(total, page, limit) };
      },
    };

    const sessions: ISessionRepository = {
      async createSession(userId, token, expiresAt) {
        const now = nowISO();
        db.prepare('INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').run(token, userId, expiresAt, now);
      },
      async findSession(token) {
        const r = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
        if (!r) return null;
        return {
          token: String(r.token),
          userId: String(r.user_id),
          expiresAt: String(r.expires_at),
        };
      },
      async deleteSession(token) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      },
      async deleteExpiredSessions() {
        const now = nowISO();
        db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
      },
    };

    return {
      users,
      projects,
      memberships,
      updates,
      quests,
      questParticipations,
      follows,
      savedProjects,
      reviews,
      reports,
      auditLogs,
      sessions,
    };
  }
}
