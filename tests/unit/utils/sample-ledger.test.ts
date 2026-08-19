/**
 * Tests for Sample Audit Ledger Generator
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';
import { SAMPLE_LEDGER_DATA } from '../../../src/utils/sample-ledger';

describe('Sample Audit Ledger Data', () => {
  it('contains expected schema columns and valid non-empty data', () => {
    expect(SAMPLE_LEDGER_DATA.length).toBeGreaterThanOrEqual(10);

    SAMPLE_LEDGER_DATA.forEach((row) => {
      expect(row.txn_id).toBeDefined();
      expect(row.txn_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(row.particulars.length).toBeGreaterThan(0);
      expect(row.gl_account.length).toBeGreaterThan(0);
      expect(typeof row.debit).toBe('number');
      expect(typeof row.credit).toBe('number');
      expect(typeof row.net_amount).toBe('number');
    });
  });

  it('contains intentional audit anomalies for testing', () => {
    // 1. Exact duplicates test case
    const duplicates = SAMPLE_LEDGER_DATA.filter((r) => r.invoice_ref === 'INV-8831');
    expect(duplicates.length).toBe(2);
    expect(duplicates[0].net_amount).toBe(duplicates[1].net_amount);

    // 2. Potential split transactions test case
    const splitTxns = SAMPLE_LEDGER_DATA.filter(
      (r) => r.txn_date === '2026-03-15' && r.debit === 4950.0,
    );
    expect(splitTxns.length).toBe(2);

    // 3. Round-sum test case
    const roundSums = SAMPLE_LEDGER_DATA.filter((r) => r.debit >= 1000 && r.debit % 1000 === 0);
    expect(roundSums.length).toBeGreaterThanOrEqual(2);

    // 4. Material outlier test case
    const maxDebit = Math.max(...SAMPLE_LEDGER_DATA.map((r) => r.debit));
    expect(maxDebit).toBe(98500.0);
  });
});
