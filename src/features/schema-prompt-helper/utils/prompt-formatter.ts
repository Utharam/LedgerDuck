/**
 * Schema Prompt Formatter for Zero-Knowledge LLM Query Builder
 * Licensed under AGPL-3.0
 */

export interface SchemaColumnInfo {
  name: string;
  type: string;
}

export interface SchemaTableInfo {
  tableName: string;
  columns: SchemaColumnInfo[];
}

/**
 * Maps raw DuckDB types to clear accounting/SQL data types (DATE, TEXT, REAL, INTEGER, etc.)
 */
export function normalizeDataType(rawType?: string): string {
  if (!rawType) return 'TEXT';
  const upper = rawType.toUpperCase();
  if (upper.includes('DATE') || upper.includes('TIME')) return 'DATE';
  if (upper.includes('INT') || upper.includes('BIGINT') || upper.includes('HUGEINT')) return 'INTEGER';
  if (
    upper.includes('FLOAT') ||
    upper.includes('DOUBLE') ||
    upper.includes('DECIMAL') ||
    upper.includes('REAL') ||
    upper.includes('NUMERIC')
  ) {
    return 'REAL / AMOUNT';
  }
  if (upper.includes('BOOL')) return 'BOOLEAN';
  return 'TEXT';
}

/**
 * Assembles a structured zero-knowledge prompt formatted for ChatGPT, Claude, and Gemini.
 */
export function formatSchemaPrompt(
  tableInfo: SchemaTableInfo,
  userIntent: string,
  allTables?: SchemaTableInfo[],
): string {
  const columnLines = tableInfo.columns
    .map((col) => `  - ${col.name} (${normalizeDataType(col.type)})`)
    .join('\n');

  let otherTablesSection = '';
  if (allTables && allTables.length > 1) {
    const otherTables = allTables.filter((t) => t.tableName !== tableInfo.tableName);
    if (otherTables.length > 0) {
      otherTablesSection = `\nOther Available Tables in Schema:\n` +
        otherTables
          .map(
            (t) =>
              `Table: ${t.tableName}\nColumns:\n` +
              t.columns.map((c) => `  - ${c.name} (${normalizeDataType(c.type)})`).join('\n'),
          )
          .join('\n\n');
    }
  }

  return `You are an expert SQL assistant for financial auditors and accountants working in DuckDB.
Generate a high-performance, accurate DuckDB SQL query to achieve the audit objective described below.

---
### Database Schema (Zero-Knowledge: Structure Only, No Row Data)
Primary Table: ${tableInfo.tableName}
Columns:
${columnLines}
${otherTablesSection}
---
### Audit Objective / Question:
${userIntent || 'Please write an audit query to explore and validate this dataset.'}

---
### Rules & DuckDB Guidelines:
1. Write valid, optimized DuckDB SQL syntax.
2. Only reference columns and tables that explicitly exist in the schema above.
3. For date manipulation, use functions like TRY_CAST(col AS DATE), DAYOFWEEK(), STRFTIME(), etc.
4. For monetary and quantitative checks, handle nulls and absolute values (e.g. ABS(amount)) where appropriate.
5. Provide the SQL query in a clean markdown code block (\`\`\`sql) followed by a concise 1-2 sentence explanation of what tests it performs.`;
}
