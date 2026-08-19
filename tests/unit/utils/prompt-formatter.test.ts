/**
 * Tests for Schema Prompt Formatter
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';
import { formatSchemaPrompt, normalizeDataType } from '../../../src/features/schema-prompt-helper/utils/prompt-formatter';

describe('Schema Prompt Formatter', () => {
  it('normalizes DuckDB data types to accounting friendly categories', () => {
    expect(normalizeDataType('TIMESTAMP_WITH_TIME_ZONE')).toBe('DATE');
    expect(normalizeDataType('DATE')).toBe('DATE');
    expect(normalizeDataType('BIGINT')).toBe('INTEGER');
    expect(normalizeDataType('DECIMAL(18,2)')).toBe('REAL / AMOUNT');
    expect(normalizeDataType('DOUBLE')).toBe('REAL / AMOUNT');
    expect(normalizeDataType('VARCHAR')).toBe('TEXT');
    expect(normalizeDataType('BOOLEAN')).toBe('BOOLEAN');
  });

  it('formats zero-knowledge prompt with table and column names without row data', () => {
    const tableInfo = {
      tableName: 'disbursements',
      columns: [
        { name: 'post_date', type: 'DATE' },
        { name: 'vendor_name', type: 'VARCHAR' },
        { name: 'amount', type: 'DOUBLE' },
      ],
    };

    const prompt = formatSchemaPrompt(tableInfo, 'Find weekend payments over $10k');

    expect(prompt).toContain('Primary Table: disbursements');
    expect(prompt).toContain('- post_date (DATE)');
    expect(prompt).toContain('- vendor_name (TEXT)');
    expect(prompt).toContain('- amount (REAL / AMOUNT)');
    expect(prompt).toContain('Find weekend payments over $10k');
    expect(prompt).toContain('Zero-Knowledge: Structure Only, No Row Data');
  });
});
