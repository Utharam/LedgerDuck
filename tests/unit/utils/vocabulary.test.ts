/**
 * Tests for Phase 2 slim vocabulary helpers.
 * Licensed under AGPL-3.0
 */

import { describe, it, expect } from '@jest/globals';

import { AUDIT_TEMPLATES } from '../../../src/utils/audit-templates';
import {
  buildDatasetProfileSql,
  buildLedgerBucketsSql,
  buildMultiClassificationSql,
  buildNarrationVariantsSql,
  buildReverseLedgerWordsSql,
  buildTopWordsInLedgerSql,
  buildVocabularyFrequencySql,
  buildWordLedgerMixSql,
  buildWordRowsFilteredSql,
  buildWordRowsSql,
  escapeLikePattern,
  escapeSqlStringLiteral,
  findVariantCandidates,
  isLikelyCode,
  levenshtein,
  wordSimilarity,
} from '../../../src/utils/vocabulary';

describe('vocabulary SQL builders', () => {
  const mapping = {
    dateColumn: 'booking_date',
    particularsColumn: 'narration',
    categoryColumn: 'gl_account',
    amountColumn: 'txn_amount',
  };

  it('profiles row counts without assuming a PK', () => {
    const sql = buildDatasetProfileSql('journal_entries', mapping);
    expect(sql).toContain('COUNT(*)');
    expect(sql).toContain('journal_entries');
    expect(sql).toContain('narration');
  });

  it('builds word frequency SQL with stopwords and letter guard', () => {
    const sql = buildVocabularyFrequencySql('journal_entries', 'narration', 200);
    expect(sql).toContain('string_split');
    expect(sql).toContain('NOT IN');
    expect(sql).toContain("regexp_matches(word, '[a-z]')");
    expect(sql).toContain('LIMIT 200');
  });

  it('escapes user words for LIKE and string literals', () => {
    expect(escapeSqlStringLiteral("o'brien")).toBe("o''brien");
    expect(escapeLikePattern('100%_x')).toBe('100\\%\\_x');
    const sql = buildWordRowsSql('journal_entries', 'narration', "Taxi'");
    expect(sql).toContain("taxi''");
    expect(sql).toContain("ESCAPE '\\'");
  });

  it('maps a word to ledger distribution', () => {
    const sql = buildWordLedgerMixSql('journal_entries', 'narration', 'gl_account', 'taxi');
    expect(sql).toContain('gl_account');
    expect(sql).toContain('%taxi%');
    expect(sql).toContain('GROUP BY');
  });

  it('lists ledger buckets and top words inside a ledger', () => {
    expect(buildLedgerBucketsSql('journal_entries', 'gl_account')).toContain('ORDER BY n_rows DESC');
    const sql = buildTopWordsInLedgerSql('journal_entries', 'narration', 'gl_account', "Misc's", 50);
    expect(sql).toContain("Misc''s");
    expect(sql).toContain('LIMIT 50');
  });

  it('bounds near-duplicate scan with a distinct cap', () => {
    const sql = buildNarrationVariantsSql('journal_entries', 'narration');
    expect(sql).toContain('levenshtein');
    expect(sql).toContain('LIMIT 200');
  });

  it('detects conflicting multi-classification across distinct ledgers', () => {
    const sql = buildMultiClassificationSql('journal_entries', 'narration', 'gl_account', 100);
    expect(sql).toContain('COUNT(DISTINCT ledger) > 1');
    expect(sql).toContain('ARRAY_AGG(DISTINCT');
    expect(sql).toContain('LIMIT 100');
  });

  it('builds reverse ledger words and filtered rows SQL', () => {
    const reverseSql = buildReverseLedgerWordsSql('journal_entries', 'narration', 'gl_account', 'Misc Expense', 50);
    expect(reverseSql).toContain("Misc Expense");

    const filteredSql = buildWordRowsFilteredSql('journal_entries', 'narration', 'gl_account', 'taxi', 'Travel');
    expect(filteredSql).toContain("taxi");
    expect(filteredSql).toContain("'Travel'");

    const unfilteredSql = buildWordRowsFilteredSql('journal_entries', 'narration', 'gl_account', 'taxi', 'ALL');
    expect(unfilteredSql).not.toContain("'ALL'");
  });

  it('exposes 4 new vocabulary templates alongside the original 5', () => {
    expect(AUDIT_TEMPLATES.length).toBe(9);
    for (const id of ['dataset-profile', 'vocabulary-frequency', 'ledger-buckets', 'narration-variants']) {
      const t = AUDIT_TEMPLATES.find((x) => x.id === id);
      expect(t).toBeDefined();
      const sql = t!.generateSql('journal_entries', mapping);
      expect(sql.length).toBeGreaterThan(20);
    }
  });
});

describe('variant helpers', () => {
  it('computes levenshtein and similarity', () => {
    expect(levenshtein('expense', 'expenses')).toBe(1);
    expect(wordSimilarity('expense', 'expenses')).toBeGreaterThan(0.85);
    expect(wordSimilarity('off', 'offer')).toBeLessThan(0.85);
  });

  it('flags expense/expenses but not off/offer', () => {
    const out = findVariantCandidates(['expense', 'expenses', 'off', 'offer', 'taxi']);
    const pair = out.find(
      (c) => (c.a === 'expense' && c.b === 'expenses') || (c.a === 'expenses' && c.b === 'expense'),
    );
    expect(pair).toBeDefined();
    expect(out.find((c) => c.a === 'off' || c.b === 'off')).toBeUndefined();
  });

  it('detects likely codes without overthinking', () => {
    expect(isLikelyCode('INV-1023')).toBe(true);
    expect(isLikelyCode('taxi')).toBe(false);
  });
});
