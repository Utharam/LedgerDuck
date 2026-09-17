/**
 * Vocabulary / Narration-consistency helpers for LedgerDuck (Phase 2 slim).
 * Pure SQL builders + small deterministic JS helpers. No new dependencies,
 * no data leaves the browser. All queries run through the existing
 * insert-into-editor flow so the audit trail keeps working.
 * Licensed under AGPL-3.0
 */

import { toDuckDBTableIdentifier } from './audit-templates';
import { toDuckDBIdentifier } from './duckdb/identifier';

/**
 * Fixed English + accounting-noise stop list for the first version.
 * Deliberately NOT configurable yet — export/import comes later.
 */
export const VOCAB_STOPWORDS: readonly string[] = [
  'is',
  'are',
  'am',
  'was',
  'were',
  'being',
  'been',
  'towards',
  'could',
  'should',
  'shall',
  'will',
  'would',
  'the',
  'a',
  'an',
  'to',
  'for',
  'from',
  'of',
  'and',
  'or',
  'in',
  'on',
  'at',
  'by',
  'with',
  'as',
  'it',
  'its',
  'this',
  'that',
  'these',
  'those',
  'paid',
  'payment',
  'being',
  'toward',
  'rs',
  'inr',
  'dr',
  'cr',
  'no',
  'nos',
  'ref',
  'vide',
];

/** Max rows the vocabulary scan reads. Accountant scope: tool, not solution. */
export const VOCAB_MAX_ROWS = 100000;

/** Cap distinct narrations scanned for near-duplicate detection (bounds O(n^2)). */
export const VARIANTS_DISTINCT_CAP = 200;

const stopListSql = (extraStopwords: string[] = []): string => {
  const merged = Array.from(
    new Set([...VOCAB_STOPWORDS, ...extraStopwords.map((w) => w.trim().toLowerCase())]),
  ).filter((w) => w.length > 0);
  return merged.map((w) => `'${escapeSqlStringLiteral(w)}'`).join(', ');
};

/** Escape a value for use inside a single-quoted SQL string literal. */
export function escapeSqlStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

/** Escape LIKE wildcards so a user-typed word matches literally. */
export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

const normalizeWord = (word: string): string => word.trim().toLowerCase();

/** OR-ed LIKE predicate for a synonym set (taxi|cab|uber). Capped at 20 terms. */
export function buildSynonymLikeClause(columnSql: string, words: string[]): string {
  const clean = Array.from(new Set(words.map((w) => w.trim().toLowerCase()).filter((w) => w.length > 0))).slice(0, 20);
  if (clean.length === 0) return 'FALSE';
  const parts = clean.map((w) => {
    const lit = escapeSqlStringLiteral(escapeLikePattern(w));
    return `lower(CAST(${columnSql} AS VARCHAR)) LIKE '%${lit}%' ESCAPE '\\'`;
  });
  return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
}

/**
 * Row-count + distinct-count profile. Single query, works on views.
 */
export function buildDatasetProfileSql(
  tableName: string,
  mapping: { particularsColumn?: string; categoryColumn?: string; amountColumn?: string },
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const selects: string[] = [`(SELECT COUNT(*) FROM ${t}) AS row_count`];

  if (mapping.particularsColumn) {
    const p = toDuckDBIdentifier(mapping.particularsColumn);
    selects.push(`(SELECT COUNT(DISTINCT ${p}) FROM ${t}) AS distinct_particulars`);
    selects.push(
      `(SELECT SUM(CASE WHEN ${p} IS NULL OR TRIM(CAST(${p} AS VARCHAR)) = '' THEN 1 ELSE 0 END) FROM ${t}) AS empty_particulars`,
    );
  }
  if (mapping.categoryColumn) {
    const c = toDuckDBIdentifier(mapping.categoryColumn);
    selects.push(`(SELECT COUNT(DISTINCT ${c}) FROM ${t}) AS distinct_ledgers`);
  }
  if (mapping.amountColumn) {
    const a = toDuckDBIdentifier(mapping.amountColumn);
    selects.push(`(SELECT SUM(CASE WHEN ${a} IS NULL THEN 1 ELSE 0 END) FROM ${t}) AS null_amounts`);
  }

  return `SELECT\n  ${selects.join(',\n  ')};`;
}

/**
 * Top words in a narration column with occurrences + row coverage.
 * Tokenization happens in DuckDB: lowercase, non-alphanumerics -> space, split.
 * Pure-numeric tokens are dropped via regexp_matches(word, '[a-z]').
 */
export function buildVocabularyFrequencySql(
  tableName: string,
  sourceColumn: string,
  limit = 200,
  extraStopwords: string[] = [],
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const lim = Math.max(1, Math.min(1000, Math.floor(limit)));

  return [
    `WITH base AS (`,
    `  SELECT CAST(${s} AS VARCHAR) AS _txt, ROW_NUMBER() OVER () AS _rid`,
    `  FROM ${t}`,
    `  WHERE ${s} IS NOT NULL AND TRIM(CAST(${s} AS VARCHAR)) <> ''`,
    `  LIMIT ${VOCAB_MAX_ROWS}`,
    `),`,
    `tokens AS (`,
    `  SELECT _rid, UNNEST(string_split(regexp_replace(lower(_txt), '[^a-z0-9 ]+', ' ', 'g'), ' ')) AS word`,
    `  FROM base`,
    `)`,
    `SELECT`,
    `  word,`,
    `  COUNT(*) AS occurrences,`,
    `  COUNT(DISTINCT _rid) AS n_rows,`,
    `  ROUND(100.0 * COUNT(DISTINCT _rid) / NULLIF((SELECT COUNT(*) FROM ${t}), 0), 2) AS pct_rows`,
    `FROM tokens`,
    `WHERE length(word) > 2`,
    `  AND word NOT IN (${stopListSql(extraStopwords)})`,
    `  AND regexp_matches(word, '[a-z]')`,
    `GROUP BY word`,
    `ORDER BY occurrences DESC`,
    `LIMIT ${lim};`,
  ].join('\n');
}

/** All rows whose narration contains a word (case-insensitive, literal match). */
export function buildWordRowsSql(tableName: string, sourceColumn: string, word: string): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const w = escapeLikePattern(normalizeWord(word));
  return `SELECT *\nFROM ${t}\nWHERE lower(CAST(${s} AS VARCHAR)) LIKE '%${escapeSqlStringLiteral(w)}%' ESCAPE '\\'\nLIMIT 500;`;
}

/** Ledger distribution for one word: description -> classification. */
export function buildWordLedgerMixSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string,
  word: string,
  synonyms: string[] = [],
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const c = toDuckDBIdentifier(targetColumn);
  const allWords = Array.from(
    new Set([normalizeWord(word), ...synonyms.map((x) => normalizeWord(x))]),
  ).filter((w) => w.length > 0);
  const likeClause = buildSynonymLikeClause(s, allWords.length > 0 ? allWords : [word]);
  return [
    `SELECT ${c} AS ledger, COUNT(*) AS n_rows,`,
    `  ROUND(100.0 * COUNT(*) / NULLIF(SUM(COUNT(*)) OVER (), 0), 1) AS pct`,
    `FROM ${t}`,
    `WHERE ${likeClause}`,
    `GROUP BY ${c}`,
    `ORDER BY n_rows DESC;`,
  ].join('\n');
}

/** Ledger bucket sizes — entry point for reverse investigation ("what's inside Misc?"). */
export function buildLedgerBucketsSql(tableName: string, targetColumn: string, limit = 50): string {
  const t = toDuckDBTableIdentifier(tableName);
  const c = toDuckDBIdentifier(targetColumn);
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));
  return `SELECT ${c} AS ledger, COUNT(*) AS n_rows\nFROM ${t}\nGROUP BY ${c}\nORDER BY n_rows DESC\nLIMIT ${lim};`;
}

/** Top words used inside one ledger value. */
export function buildTopWordsInLedgerSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string,
  ledgerValue: string,
  limit = 100,
  extraStopwords: string[] = [],
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const c = toDuckDBIdentifier(targetColumn);
  const lit = escapeSqlStringLiteral(ledgerValue);
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));

  return [
    `WITH base AS (`,
    `  SELECT CAST(${s} AS VARCHAR) AS _txt, ROW_NUMBER() OVER () AS _rid`,
    `  FROM ${t}`,
    `  WHERE CAST(${c} AS VARCHAR) = '${lit}'`,
    `    AND ${s} IS NOT NULL`,
    `  LIMIT ${VOCAB_MAX_ROWS}`,
    `),`,
    `tokens AS (`,
    `  SELECT UNNEST(string_split(regexp_replace(lower(_txt), '[^a-z0-9 ]+', ' ', 'g'), ' ')) AS word`,
    `  FROM base`,
    `)`,
    `SELECT word, COUNT(*) AS occurrences`,
    `FROM tokens`,
    `WHERE length(word) > 2`,
    `  AND word NOT IN (${stopListSql(extraStopwords)})`,
    `  AND regexp_matches(word, '[a-z]')`,
    `GROUP BY word`,
    `ORDER BY occurrences DESC`,
    `LIMIT ${lim};`,
  ].join('\n');
}

/**
 * Near-duplicate distinct narrations via levenshtein on a capped sample.
 * Bounded by VARIANTS_DISTINCT_CAP so the self-join stays cheap in Wasm.
 */
export function buildNarrationVariantsSql(tableName: string, sourceColumn: string): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  return [
    `WITH distinct_vals AS (`,
    `  SELECT DISTINCT CAST(${s} AS VARCHAR) AS v`,
    `  FROM ${t}`,
    `  WHERE ${s} IS NOT NULL AND TRIM(CAST(${s} AS VARCHAR)) <> ''`,
    `  LIMIT ${VARIANTS_DISTINCT_CAP}`,
    `)`,
    `SELECT`,
    `  a.v AS narration_1,`,
    `  b.v AS narration_2,`,
    `  levenshtein(lower(a.v), lower(b.v)) AS dist`,
    `FROM distinct_vals a`,
    `JOIN distinct_vals b ON a.v < b.v`,
    `WHERE levenshtein(lower(a.v), lower(b.v)) BETWEEN 1 AND 3`,
    `ORDER BY dist ASC, narration_1`,
    `LIMIT 100;`,
  ].join('\n');
}

/** Classic iterative Levenshtein distance (small strings only). */
export function levenshtein(a: string, b: string): number {
  const s = normalizeWord(a);
  const t = normalizeWord(b);
  if (s === t) return 0;
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  let prev = new Array<number>(t.length + 1);
  let curr = new Array<number>(t.length + 1);
  for (let j = 0; j <= t.length; j++) prev[j] = j;
  for (let i = 1; i <= s.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }
  return prev[t.length];
}

export function wordSimilarity(a: string, b: string): number {
  const s = normalizeWord(a);
  const t = normalizeWord(b);
  if (s === t) return 1;
  const maxLen = Math.max(s.length, t.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(s, t) / maxLen;
}

export interface VariantCandidate {
  a: string;
  b: string;
  similarity: number;
  distance: number;
}

const isSkippableToken = (w: string): boolean => {
  const n = normalizeWord(w);
  if (n.length < 3) return true;
  if (!/[a-z]/.test(n)) return true;
  return (VOCAB_STOPWORDS as readonly string[]).includes(n);
};

/**
 * Possible textual variants from an already-fetched word list.
 * Runs in JS on <=500 words — no SQL, no Wasm cost.
 * Never auto-merges: caller must present Accept / Ignore.
 */
export function findVariantCandidates(words: string[], threshold = 0.85, maxOut = 100): VariantCandidate[] {
  const uniq = Array.from(new Set(words.map(normalizeWord).filter((w) => w && !isSkippableToken(w)))).slice(
    0,
    500,
  );
  const out: VariantCandidate[] = [];
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const a = uniq[i];
      const b = uniq[j];
      if (Math.abs(a.length - b.length) > 3) continue;
      const d = levenshtein(a, b);
      const maxLen = Math.max(a.length, b.length);
      const sim = 1 - d / maxLen;
      if (sim >= threshold && d > 0) out.push({ a, b, similarity: Math.round(sim * 1000) / 1000, distance: d });
    }
  }
  return out.sort((x, y) => y.similarity - x.similarity || x.distance - y.distance).slice(0, maxOut);
}

/** Heuristic: digit-bearing tokens of length >= 6 are probably codes (INV-1023, GSTIN fragments). */
export function isLikelyCode(token: string): boolean {
  const n = normalizeWord(token);
  return n.length >= 6 && /\d/.test(n) && /[a-z0-9-]{6,}/.test(n);
}

/**
 * Detects transactions where identical narrations/vendors are booked across
 * MORE THAN ONE distinct ledger head (conflicting multi-classification).
 */
export function buildMultiClassificationSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string,
  limit = 100,
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const c = toDuckDBIdentifier(targetColumn);
  const lim = Math.max(1, Math.min(500, Math.floor(limit)));

  return [
    `WITH clean AS (`,
    `  SELECT`,
    `    LOWER(TRIM(CAST(${s} AS VARCHAR))) AS narration,`,
    `    CAST(${c} AS VARCHAR) AS ledger`,
    `  FROM ${t}`,
    `  WHERE ${s} IS NOT NULL AND TRIM(CAST(${s} AS VARCHAR)) <> ''`,
    `    AND ${c} IS NOT NULL AND TRIM(CAST(${c} AS VARCHAR)) <> ''`,
    `  LIMIT ${VOCAB_MAX_ROWS}`,
    `),`,
    `summary AS (`,
    `  SELECT`,
    `    narration,`,
    `    COUNT(DISTINCT ledger) AS distinct_ledgers,`,
    `    COUNT(*) AS total_rows,`,
    `    ARRAY_TO_STRING(ARRAY_AGG(DISTINCT ledger), ', ') AS ledgers_used`,
    `  FROM clean`,
    `  GROUP BY narration`,
    `  HAVING COUNT(DISTINCT ledger) > 1`,
    `)`,
    `SELECT narration, distinct_ledgers, total_rows, ledgers_used`,
    `FROM summary`,
    `ORDER BY total_rows DESC, distinct_ledgers DESC`,
    `LIMIT ${lim};`,
  ].join('\n');
}

/**
 * Top words used inside one ledger value (reverse scrutiny: "what's inside Misc Expense?").
 */
export function buildReverseLedgerWordsSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string,
  ledgerValue: string,
  limit = 100,
  extraStopwords: string[] = [],
): string {
  return buildTopWordsInLedgerSql(tableName, sourceColumn, targetColumn, ledgerValue, limit, extraStopwords);
}

/**
 * Retrieves exact transaction rows matching a keyword and optionally a specific ledger head.
 */
export function buildWordRowsFilteredSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string | undefined,
  word: string,
  ledgerValue?: string,
  limit = 500,
  synonyms: string[] = [],
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const allWords = Array.from(
    new Set([normalizeWord(word), ...synonyms.map((x) => normalizeWord(x))]),
  ).filter((w) => w.length > 0);
  const likeClause = buildSynonymLikeClause(s, allWords.length > 0 ? allWords : [word]);
  const lim = Math.max(1, Math.min(1000, Math.floor(limit)));

  let sql = `SELECT *\nFROM ${t}\nWHERE ${likeClause}`;

  if (targetColumn && ledgerValue && ledgerValue !== 'ALL') {
    const c = toDuckDBIdentifier(targetColumn);
    const lit = escapeSqlStringLiteral(ledgerValue);
    sql += `\n  AND CAST(${c} AS VARCHAR) = '${lit}'`;
  }

  sql += `\nLIMIT ${lim};`;
  return sql;
}

/**
 * UBO / forbidden-ledger violations: rows where `word` appears in the narration
 * AND the ledger equals `forbiddenLedger` (case-insensitive exact match).
 * Used for rules like John must never sit in Staff Expense.
 */
export function buildUboViolationSql(
  tableName: string,
  sourceColumn: string,
  targetColumn: string,
  word: string,
  forbiddenLedger: string,
  limit = 200,
  synonyms: string[] = [],
): string {
  const t = toDuckDBTableIdentifier(tableName);
  const s = toDuckDBIdentifier(sourceColumn);
  const c = toDuckDBIdentifier(targetColumn);
  const allWords = Array.from(
    new Set([normalizeWord(word), ...synonyms.map((x) => normalizeWord(x))]),
  ).filter((w) => w.length > 0);
  const likeClause = buildSynonymLikeClause(s, allWords.length > 0 ? allWords : [word]);
  const lit = escapeSqlStringLiteral(forbiddenLedger.trim());
  const lim = Math.max(1, Math.min(1000, Math.floor(limit)));
  return `SELECT *\nFROM ${t}\nWHERE ${likeClause}\n  AND LOWER(TRIM(CAST(${c} AS VARCHAR))) = LOWER(TRIM('${lit}'))\nLIMIT ${lim};`;
}

