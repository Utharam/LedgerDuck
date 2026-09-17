/**
 * Tests for Workpaper Export Utility
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';

import { generateWorkpaperCsv } from '../../../src/utils/workpaper-export';

describe('Workpaper Export Utility', () => {
  it('generates standard audit header and valid CSV content', () => {
    const metadata = {
      title: 'WP-101 Duplicate Vouchers',
      tableName: 'journal_entries',
      testObjective: 'Detect potential duplicate journal postings',
      findingsCount: 2,
    };
    const headers = ['date', 'narration', 'amount'];
    const rows = [
      { date: '2026-03-01', narration: 'Office Rent, March', amount: 5000 },
      { date: '2026-03-01', narration: 'Office Rent, March', amount: 5000 },
    ];

    const csv = generateWorkpaperCsv(metadata, headers, rows);

    expect(csv).toContain('AUDIT WORKPAPER: WP-101 Duplicate Vouchers');
    expect(csv).toContain('DATA SOURCE TABLE: journal_entries');
    expect(csv).toContain('FINDINGS IDENTIFIED: 2');
    expect(csv).toContain('date,narration,amount');
    // Escaped string with comma
    expect(csv).toContain('"Office Rent, March"');
  });
});
