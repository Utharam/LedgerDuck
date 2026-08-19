/**
 * Audit Templates and Column Auto-Detection for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { AuditColumnMapping, AuditTemplate } from '@models/audit-template';
import { toDuckDBIdentifier } from './duckdb/identifier';

interface ColumnInfo {
  name: string;
  type?: string;
}

/**
 * Heuristically auto-detects accounting column roles (Date, Particulars, Category, Amount)
 * based on column names and data types.
 */
export function autoDetectAuditColumns(columns: (string | ColumnInfo)[]): AuditColumnMapping {
  const colList: ColumnInfo[] = columns.map((c) => (typeof c === 'string' ? { name: c } : c));

  let detectedDate = '';
  let detectedParticulars = '';
  let detectedCategory = '';
  let detectedAmount = '';

  const datePatterns = [
    /^(trans|txn|entry|booking|posting|value|doc|invoice)?_?date$/i,
    /date/i,
    /^(time|timestamp|datetime|period|day)$/i,
    /time/i,
  ];

  const particularsPatterns = [
    /^(particulars|narration|description|memo|details)$/i,
    /^(desc|remark|remarks|notes|note|comment|comments)$/i,
    /^(payee|vendor|customer|party|beneficiary|supplier|name|merchant)$/i,
    /description|particular/i,
  ];

  const categoryPatterns = [
    /^(category|account|ledger|gl_account|account_name|acc_name|cost_center|head)$/i,
    /^(category_name|type|class|classification|department|expense_type)$/i,
    /category|ledger|account/i,
  ];

  const amountPatterns = [
    /^(amount|amt|total|net_amount|gross_amount|value|val|balance|debit|credit)$/i,
    /^(total_amount|trans_amount|txn_amount|invoice_amount|price)$/i,
    /amount|amt|balance|total|price/i,
  ];

  // 1. Detect Date Column
  for (const pattern of datePatterns) {
    const match = colList.find(
      (c) => pattern.test(c.name) || (c.type && /DATE|TIMESTAMP/i.test(c.type)),
    );
    if (match) {
      detectedDate = match.name;
      break;
    }
  }

  // 2. Detect Amount Column
  for (const pattern of amountPatterns) {
    const match = colList.find(
      (c) =>
        c.name !== detectedDate &&
        (pattern.test(c.name) || (c.type && /DOUBLE|FLOAT|DECIMAL|REAL|NUMERIC|BIGINT|INT/i.test(c.type))),
    );
    if (match) {
      detectedAmount = match.name;
      break;
    }
  }

  // 3. Detect Particulars / Description Column
  for (const pattern of particularsPatterns) {
    const match = colList.find(
      (c) => c.name !== detectedDate && c.name !== detectedAmount && pattern.test(c.name),
    );
    if (match) {
      detectedParticulars = match.name;
      break;
    }
  }

  // 4. Detect Category / Ledger Column
  for (const pattern of categoryPatterns) {
    const match = colList.find(
      (c) =>
        c.name !== detectedDate &&
        c.name !== detectedAmount &&
        c.name !== detectedParticulars &&
        pattern.test(c.name),
    );
    if (match) {
      detectedCategory = match.name;
      break;
    }
  }

  // Fallbacks if not matched: pick the first unused columns
  const firstUnused = (exclude: string[]) => colList.find((c) => !exclude.includes(c.name))?.name || '';

  if (!detectedDate) detectedDate = firstUnused([]);
  if (!detectedParticulars) detectedParticulars = firstUnused([detectedDate]);
  if (!detectedAmount) detectedAmount = firstUnused([detectedDate, detectedParticulars]);
  if (!detectedCategory) detectedCategory = firstUnused([detectedDate, detectedParticulars, detectedAmount]);

  return {
    dateColumn: detectedDate,
    particularsColumn: detectedParticulars,
    categoryColumn: detectedCategory,
    amountColumn: detectedAmount,
  };
}

/**
 * Formats a table identifier for DuckDB.
 * If qualified (e.g. db.schema.table), quotes each segment individually.
 */
export function toDuckDBTableIdentifier(tableName: string): string {
  if (!tableName) return 'table_name';
  if (tableName.includes('.')) {
    return tableName
      .split('.')
      .map((part) => toDuckDBIdentifier(part))
      .join('.');
  }
  return toDuckDBIdentifier(tableName);
}

/**
 * Pre-loaded 1-Click DuckDB Audit Templates for Accountants & Auditors
 */
export const AUDIT_TEMPLATES: AuditTemplate[] = [
  {
    id: 'exact-duplicates',
    title: 'Exact Duplicates',
    description: 'Find identical transactions with duplicate date, particulars, and amount',
    category: 'Integrity',
    badgeColor: 'blue',
    generateSql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const d = toDuckDBIdentifier(mapping.dateColumn || 'date');
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');

      return `SELECT ${d}, ${p}, ${a}, COUNT(*) AS duplicate_count\nFROM ${t}\nGROUP BY ${d}, ${p}, ${a}\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC, ${a} DESC;`;
    },
  },
  {
    id: 'potential-split-transactions',
    title: 'Potential Split Transactions',
    description: 'Identify transactions on the same day with identical amount (splitting risk to bypass approval limits)',
    category: 'Fraud Risk',
    badgeColor: 'orange',
    generateSql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const d = toDuckDBIdentifier(mapping.dateColumn || 'date');
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');

      return `SELECT ${d}, ${a}, COUNT(*) AS split_count, ARRAY_AGG(${p}) AS particulars_list\nFROM ${t}\nGROUP BY ${d}, ${a}\nHAVING COUNT(*) > 1\nORDER BY split_count DESC, ${a} DESC;`;
    },
  },
  {
    id: 'round-sum-audit',
    title: 'Round-Sum Audit',
    description: 'Filter round dollar amounts (>= $1,000) that often indicate estimations, manual overrides, or fictitious entries',
    category: 'Fraud Risk',
    badgeColor: 'red',
    generateSql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');

      return `SELECT *\nFROM ${t}\nWHERE CAST(${a} AS BIGINT) = ${a}\n  AND ABS(${a}) >= 1000\nORDER BY ABS(${a}) DESC;`;
    },
  },
  {
    id: 'outlier-materiality',
    title: 'Outlier / Materiality Top 10',
    description: 'Top materiality outliers ranked by absolute transaction value for substantive testing',
    category: 'Materiality',
    badgeColor: 'violet',
    generateSql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');

      return `SELECT *\nFROM ${t}\nORDER BY ABS(${a}) DESC\nLIMIT 10;`;
    },
  },
  {
    id: 'weekend-bookings',
    title: 'Weekend / Non-Business Day Bookings',
    description: 'Identify journal entries or disbursements posted on Saturdays and Sundays (days 1 & 7)',
    category: 'Compliance',
    badgeColor: 'teal',
    generateSql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const d = toDuckDBIdentifier(mapping.dateColumn || 'date');

      return `SELECT *, DAYNAME(TRY_CAST(${d} AS DATE)) AS day_of_week\nFROM ${t}\nWHERE DAYOFWEEK(TRY_CAST(${d} AS DATE)) IN (1, 7)\nORDER BY ${d} DESC;`;
    },
  },
];
