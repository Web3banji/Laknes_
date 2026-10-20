/**
 * LAKNES Database Adapter Contract & Health Checks
 */

import { RepositoryRegistry } from './repositories.ts';

export type DatabaseStatus = 'UNCONFIGURED' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface DatabaseHealth {
  status: DatabaseStatus;
  adapterName: string;
  isPersistent: boolean;
  message: string;
  latencyMs?: number;
}

export interface IDatabaseAdapter {
  readonly name: string;
  readonly status: DatabaseStatus;
  readonly isPersistent: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  checkHealth(): Promise<DatabaseHealth>;
  getRepositories(): RepositoryRegistry;
}
