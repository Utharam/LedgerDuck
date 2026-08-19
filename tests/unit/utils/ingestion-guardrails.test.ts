/**
 * Tests for Ingestion Guardrails
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';

import {
  sanitizeColumnHeader,
  sanitizeHeaderRow,
  hasMergedCells,
  validateAndSanitizeSpreadsheet,
  validateAndSanitizeCsv,
} from '../../../src/utils/ingestion-guardrails';

describe('Ingestion Guardrails', () => {
  describe('sanitizeColumnHeader', () => {
    it('trims leading and trailing spaces', () => {
      const seen = new Set<string>();
      expect(sanitizeColumnHeader('  Transaction Date  ', 0, seen)).toBe('Transaction_Date');
    });

    it('strips quotes from header', () => {
      const seen = new Set<string>();
      expect(sanitizeColumnHeader('"Amount (USD)"', 0, seen)).toBe('Amount_USD');
    });

    it('falls back to column_{index} if empty', () => {
      const seen = new Set<string>();
      expect(sanitizeColumnHeader('', 0, seen)).toBe('column_1');
      expect(sanitizeColumnHeader('   ', 1, seen)).toBe('column_2');
    });

    it('deduplicates duplicate header names', () => {
      const seen = new Set<string>();
      expect(sanitizeColumnHeader('Amount', 0, seen)).toBe('Amount');
      expect(sanitizeColumnHeader('Amount', 1, seen)).toBe('Amount_2');
      expect(sanitizeColumnHeader('amount', 2, seen)).toBe('amount_3');
    });

    it('sanitizes full header rows', () => {
      const headers = [' Date ', 'Description', 'Amount', 'Amount', ''];
      const sanitized = sanitizeHeaderRow(headers);
      expect(sanitized).toEqual(['Date', 'Description', 'Amount', 'Amount_2', 'column_5']);
    });
  });

  describe('Spreadsheet validation', () => {
    it('detects and rejects merged cells', async () => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Date', 'Particulars', 'Amount'],
        ['2026-01-01', 'Rent', 1000],
      ]);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

      expect(hasMergedCells(ws)).toBe(true);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      const wbBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const file = new File([wbBuffer], 'merged_test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await expect(validateAndSanitizeSpreadsheet(file)).rejects.toThrow(
        /Merged cells detected in sheet "Transactions"/,
      );
    });

    it('passes and cleans clean rectangular spreadsheets', async () => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['  Date  ', 'Description / Narration', 'Amount'],
        ['2026-01-01', 'Office Supplies', 150.5],
        ['2026-01-02', 'Software License', 499.0],
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ledger');
      const wbBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const file = new File([wbBuffer], 'clean_test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const result = await validateAndSanitizeSpreadsheet(file);
      expect(result.sheetNames).toEqual(['Ledger']);
      expect(result.sanitizedFile).toBeDefined();
    });
  });

  describe('CSV validation', () => {
    it('rejects CSV with non-uniform row column lengths', async () => {
      const csvContent = `Date,Particulars,Amount\n2026-01-01,Rent,1000\n2026-01-02,Utilities,200,ExtraValue\n`;
      const file = new File([csvContent], 'ragged.csv', { type: 'text/csv' });

      await expect(validateAndSanitizeCsv(file)).rejects.toThrow(
        /Non-uniform column length detected in "ragged.csv"/,
      );
    });

    it('sanitizes headers in valid CSV files', async () => {
      const csvContent = ` Date , Description , Amount \n2026-01-01,Office Rent,1200\n2026-01-02,Internet,100\n`;
      const file = new File([csvContent], 'spaces.csv', { type: 'text/csv' });

      const result = await validateAndSanitizeCsv(file);
      const text = await result.sanitizedFile.text();
      const firstLine = text.split('\n')[0];
      expect(firstLine).toBe('Date,Description,Amount');
    });
  });
});
