/**
 * Tests for the spreadsheet first-row-as-header import toggle.
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';

import { validateAndSanitizeSpreadsheet } from '../../../src/utils/ingestion-guardrails';
import { createXlsxSheetViewQuery } from '../../../src/utils/xlsx';

describe('createXlsxSheetViewQuery header flag', () => {
  it('defaults to header = true (backward compatible)', () => {
    const sql = createXlsxSheetViewQuery('file.xlsx', 'Sheet1', 'file_Sheet1');
    expect(sql).toContain('header = true');
  });

  it('emits header = false when the first row is data', () => {
    const sql = createXlsxSheetViewQuery('file.xlsx', 'Sheet1', 'file_Sheet1', false);
    expect(sql).toContain('header = false');
    expect(sql).not.toContain('header = true');
  });
});

describe('validateAndSanitizeSpreadsheet header flag', () => {
  const makeXlsxFile = async (rows: any[][], name = 'test.xlsx'): Promise<File> => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new File([out], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  it('keeps the first row as data when hasHeader is false', async () => {
    const file = await makeXlsxFile([
      ['2026-03-02', 'Office Supplies', 342.5],
      ['2026-03-03', 'Freight', 1845.2],
    ]);
    const { sanitizedFile, sheetNames } = await validateAndSanitizeSpreadsheet(file, false);
    // No header rewrite: file passes through untouched
    expect(sheetNames).toEqual(['Sheet1']);
    expect(sanitizedFile).toBe(file);
  });

  it('still sanitizes headers by default', async () => {
    const file = await makeXlsxFile([
      ['txn date', 'particulars!', 'debit'],
      ['2026-03-02', 'Office Supplies', 342.5],
    ]);
    const { sanitizedFile } = await validateAndSanitizeSpreadsheet(file, true);
    expect(sanitizedFile.name).toBe(file.name);
    // Sanitized headers differ from raw ('txn date' -> 'txn_date'), so a new File is produced
    expect(sanitizedFile).not.toBe(file);
  });
});
