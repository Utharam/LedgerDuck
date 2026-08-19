/**
 * Tests for Audit Templates and Column Auto-Detection
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';
import {
  autoDetectAuditColumns,
  AUDIT_TEMPLATES,
  toDuckDBTableIdentifier,
} from '../../../src/utils/audit-templates';

describe('Audit Templates & Column Auto-Detection', () => {
  it('formats simple, qualified, and special character table identifiers for DuckDB', () => {
    expect(toDuckDBTableIdentifier('expenses')).toBe('expenses');
    expect(toDuckDBTableIdentifier('my-expenses 2024')).toBe('"my-expenses 2024"');
    expect(toDuckDBTableIdentifier('company_db.main.sales')).toBe('company_db.main.sales');
    expect(toDuckDBTableIdentifier('company db.main.sales table')).toBe('"company db".main."sales table"');
  });

  it('correctly auto-detects date, particulars, category, and amount columns', () => {
    const columns = [
      { name: 'txn_date', type: 'DATE' },
      { name: 'vendor_description', type: 'VARCHAR' },
      { name: 'expense_category', type: 'VARCHAR' },
      { name: 'total_amount', type: 'DOUBLE' },
    ];

    const mapping = autoDetectAuditColumns(columns);
    expect(mapping.dateColumn).toBe('txn_date');
    expect(mapping.particularsColumn).toBe('vendor_description');
    expect(mapping.categoryColumn).toBe('expense_category');
    expect(mapping.amountColumn).toBe('total_amount');
  });

  it('generates valid SQL for all 5 audit templates', () => {
    const mapping = {
      dateColumn: 'booking_date',
      particularsColumn: 'narration',
      categoryColumn: 'gl_account',
      amountColumn: 'txn_amount',
    };
    const tableName = 'journal_entries';

    AUDIT_TEMPLATES.forEach((template) => {
      const sql = template.generateSql(tableName, mapping);
      expect(sql).toContain('journal_entries');
      expect(sql.length).toBeGreaterThan(20);
    });

    // Test specific templates
    const dupSql = AUDIT_TEMPLATES.find((t) => t.id === 'exact-duplicates')!.generateSql(tableName, mapping);
    expect(dupSql).toContain('COUNT(*) AS duplicate_count');
    expect(dupSql).toContain('HAVING COUNT(*) > 1');

    const roundSql = AUDIT_TEMPLATES.find((t) => t.id === 'round-sum-audit')!.generateSql(tableName, mapping);
    expect(roundSql).toContain('CAST(txn_amount AS BIGINT) = txn_amount');
    expect(roundSql).toContain('ABS(txn_amount) >= 1000');

    const weekendSql = AUDIT_TEMPLATES.find((t) => t.id === 'weekend-bookings')!.generateSql(tableName, mapping);
    expect(weekendSql).toContain('DAYOFWEEK(TRY_CAST(booking_date AS DATE)) IN (1, 7)');
  });
});
