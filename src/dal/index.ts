/**
 * LAKNES Data Access Layer Registry and Factory
 * Automatically provisions persistent native SQLite adapter with fallback capability.
 */

import { IDatabaseAdapter } from './adapter.ts';
import { SqliteDatabaseAdapter } from './sqlite-adapter.ts';
import { RepositoryRegistry } from './repositories.ts';

let currentAdapter: IDatabaseAdapter = new SqliteDatabaseAdapter();

export function setDatabaseAdapter(adapter: IDatabaseAdapter): void {
  currentAdapter = adapter;
}

export function getDatabaseAdapter(): IDatabaseAdapter {
  return currentAdapter;
}

export function getRepositories(): RepositoryRegistry {
  return currentAdapter.getRepositories();
}

export function getDatabase(): any {
  if (currentAdapter instanceof SqliteDatabaseAdapter) {
    return currentAdapter.getDb();
  }
  throw new Error('Database adapter does not support direct sync access');
}

export * from './adapter.ts';
export * from './repositories.ts';
export * from './unconfigured-adapter.ts';
export * from './sqlite-adapter.ts';
