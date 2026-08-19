/**
 * Audit Template Models for LedgerDuck
 * Licensed under AGPL-3.0
 */

export interface AuditColumnMapping {
  dateColumn: string;
  particularsColumn: string;
  categoryColumn: string;
  amountColumn: string;
}

export type AuditTemplateId =
  | 'exact-duplicates'
  | 'potential-split-transactions'
  | 'round-sum-audit'
  | 'outlier-materiality'
  | 'weekend-bookings';

export interface AuditTemplate {
  id: AuditTemplateId;
  title: string;
  description: string;
  category: 'Integrity' | 'Fraud Risk' | 'Materiality' | 'Compliance';
  badgeColor: string;
  generateSql: (tableName: string, mapping: AuditColumnMapping) => string;
}
