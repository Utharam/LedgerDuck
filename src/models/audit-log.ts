/**
 * Audit Trail & SQL Execution Log Models for LedgerDuck
 * Licensed under AGPL-3.0
 */

export interface AuditLogEntry {
  id: string;
  timestampIso: string;
  timestampLocal: string;
  executedSql: string;
  status: 'success' | 'error';
  rowsReturned: number | null;
  executionDurationMs: number;
  errorMessage?: string;
  scriptName?: string;
}

export type AuditLogFilterStatus = 'all' | 'success' | 'error';

export interface AuditLogFilter {
  searchQuery: string;
  status: AuditLogFilterStatus;
}
