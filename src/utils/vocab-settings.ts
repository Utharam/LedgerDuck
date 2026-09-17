/**
 * User-configurable vocabulary settings for LedgerDuck.
 * Local-first: stopwords, synonym groups, and UBO watch rules persist in
 * localStorage. No external dictionary dependency.
 * Licensed under AGPL-3.0
 */

import { LOCAL_STORAGE_KEYS } from '@models/local-storage';

export interface UboRule {
  /** Word/person to watch, e.g. "john" (matched case-insensitive via LIKE). */
  word: string;
  /** Forbidden ledger head, e.g. "staff expense" (exact match, case-insensitive). */
  forbiddenLedger: string;
  note?: string;
}

const normalizeToken = (w: string): string => w.trim().toLowerCase();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota/private-mode errors
  }
}

/** User-added stopwords (lowercased, deduped). */
export function getCustomStopwords(): string[] {
  const raw = readJson<string[]>(LOCAL_STORAGE_KEYS.VOCAB_CUSTOM_STOPWORDS, []);
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.map(normalizeToken).filter((w) => w.length > 0))).slice(0, 500);
}

export function setCustomStopwords(words: string[]): void {
  const clean = Array.from(new Set(words.map(normalizeToken).filter((w) => w.length > 0))).slice(
    0,
    500,
  );
  writeJson(LOCAL_STORAGE_KEYS.VOCAB_CUSTOM_STOPWORDS, clean);
}

/**
 * Synonym groups, e.g. [["taxi","cab","uber","conveyance"],["expense","expenses"]].
 * Each inner array is one equivalence set. Stored lowercased.
 */
export function getSynonymGroups(): string[][] {
  const raw = readJson<string[][]>(LOCAL_STORAGE_KEYS.VOCAB_SYNONYM_GROUPS, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g) => Array.isArray(g))
    .map((g) => Array.from(new Set(g.map(normalizeToken).filter((w) => w.length > 0))))
    .filter((g) => g.length >= 2)
    .slice(0, 200);
}

export function setSynonymGroups(groups: string[][]): void {
  const clean = groups
    .filter((g) => Array.isArray(g))
    .map((g) => Array.from(new Set(g.map(normalizeToken).filter((w) => w.length > 0))))
    .filter((g) => g.length >= 2)
    .slice(0, 200);
  writeJson(LOCAL_STORAGE_KEYS.VOCAB_SYNONYM_GROUPS, clean);
}

/** Expand a word to its full synonym set (includes the word itself). */
export function expandWithSynonyms(word: string, groups?: string[][]): string[] {
  const n = normalizeToken(word);
  if (!n) return [];
  const list = groups ?? getSynonymGroups();
  for (const g of list) {
    if (g.includes(n)) return g;
  }
  return [n];
}

/** UBO / forbidden-ledger watch rules. */
export function getUboRules(): UboRule[] {
  const raw = readJson<UboRule[]>(LOCAL_STORAGE_KEYS.VOCAB_UBO_RULES, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((r) => r && typeof r.word === 'string' && typeof r.forbiddenLedger === 'string')
    .map((r) => ({
      word: normalizeToken(r.word),
      forbiddenLedger: r.forbiddenLedger.trim(),
      note: typeof r.note === 'string' ? r.note.slice(0, 300) : undefined,
    }))
    .filter((r) => r.word.length >= 2 && r.forbiddenLedger.length > 0)
    .slice(0, 200);
}

export function setUboRules(rules: UboRule[]): void {
  const clean = rules
    .filter((r) => r && typeof r.word === 'string' && typeof r.forbiddenLedger === 'string')
    .map((r) => ({
      word: normalizeToken(r.word),
      forbiddenLedger: r.forbiddenLedger.trim(),
      note: typeof r.note === 'string' ? r.note.slice(0, 300) : undefined,
    }))
    .filter((r) => r.word.length >= 2 && r.forbiddenLedger.length > 0)
    .slice(0, 200);
  writeJson(LOCAL_STORAGE_KEYS.VOCAB_UBO_RULES, clean);
}

/** Default starter synonyms so taxi/conveyance/uber link out of the box. */
export const DEFAULT_SYNONYM_GROUPS: string[][] = [
  ['taxi', 'cab', 'uber', 'ola', 'conveyance', 'fare', 'travel'],
  ['expense', 'expenses', 'expenditure'],
  ['salary', 'salaries', 'wages', 'payroll'],
  ['vendor', 'supplier', 'payee'],
];

/** Seed defaults once (never overwrites user edits). */
export function ensureDefaultSynonyms(): void {
  try {
    if (!localStorage.getItem(LOCAL_STORAGE_KEYS.VOCAB_SYNONYM_GROUPS)) {
      writeJson(LOCAL_STORAGE_KEYS.VOCAB_SYNONYM_GROUPS, DEFAULT_SYNONYM_GROUPS);
    }
  } catch {
    // ignore
  }
}
