/**
 * Query Manager Models for LedgerDuck
 * Licensed under AGPL-3.0
 */

export interface SavedQuery {
  id: string;
  title: string;
  description?: string;
  sql: string;
  tags?: string[];
  createdAt: string;
}

export interface QueryProfile {
  id: string;
  name: string;
  icon: string;
  description: string;
  queries: SavedQuery[];
  isDefault?: boolean;
}

export interface QueryManagerExport {
  version: '1.0';
  exportedAt: string;
  profiles: QueryProfile[];
}
