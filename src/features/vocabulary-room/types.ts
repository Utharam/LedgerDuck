/**
 * Types for LedgerDuck 2.0 Vocabulary Map
 * Licensed under AGPL-3.0
 */

export type InvestigationMode =
  | 'forward'
  | 'reverse'
  | 'multi-classification'
  | 'variants';

export interface VocabToken {
  word: string;
  occurrences: number;
  n_rows: number;
  pct_rows: number;
}

export interface LedgerDistribution {
  ledger: string;
  n_rows: number;
  pct: number;
  isAnomaly?: boolean;
}

export interface MultiClassificationItem {
  narration: string;
  distinct_ledgers: number;
  total_rows: number;
  ledgers_used: string;
}

export interface LedgerBucket {
  ledger: string;
  n_rows: number;
}
