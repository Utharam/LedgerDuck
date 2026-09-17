/**
 * Types for LedgerDuck 2.0 Forensic Room
 * Licensed under AGPL-3.0
 */

import { AuditColumnMapping } from '@models/audit-template';

export interface SubstantiveTestResult {
  status: 'idle' | 'running' | 'success' | 'error';
  findingsCount: number;
  columns: string[];
  sampleRows: Record<string, any>[];
  allRows?: Record<string, any>[];
  errorMessage?: string;
  executionTimeMs?: number;
}

export interface AuditProfilePack {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  description: string;
  bestFor: string;
  checks: string[];
  customQueryTitle?: string;
  customQuerySql?: (tableName: string, mapping: AuditColumnMapping) => string;
}
