/**
 * Ingestion Guardrails for LedgerDuck (PondPilot-Audit)
 *
 * Enforces rectangular, clean data for accounting and financial audits:
 * 1. Rejects merged cells in spreadsheets (.xlsx, .xls) with descriptive warning.
 * 2. Checks for uniform column lengths across all rows (no ragged lines).
 * 3. Automatically sanitizes column headers (trims spaces, strips invalid chars, handles quotes, deduplicates).
 *
 * Licensed under AGPL-3.0 (forked from PondPilot).
 */

import * as XLSX from 'xlsx';

export class IngestionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IngestionValidationError';
  }
}

/**
 * Sanitizes a single column header:
 * - Trims leading/trailing whitespace.
 * - Removes enclosing quotes.
 * - Replaces problematic characters with underscores.
 * - Fallbacks to column_{index} if empty.
 * - Deduplicates names using a Set of already seen headers.
 */
export function sanitizeColumnHeader(
  rawHeader: any,
  index: number,
  seenHeaders: Set<string>,
): string {
  let header = String(rawHeader ?? '').trim();

  // Strip enclosing single or double quotes
  if (
    (header.startsWith('"') && header.endsWith('"')) ||
    (header.startsWith("'") && header.endsWith("'"))
  ) {
    header = header.slice(1, -1).trim();
  }

  // Remove newline and carriage return characters
  header = header.replace(/[\r\n\t]+/g, ' ').trim();

  // Replace special characters / punctuation with underscores
  header = header.replace(/[^a-zA-Z0-9_]+/g, '_');

  // Remove leading/trailing underscores
  header = header.replace(/^_+|_+$/g, '');

  // If empty after cleanup, assign fallback name
  if (!header) {
    header = `column_${index + 1}`;
  }

  // Deduplicate if name was already used in this table
  let uniqueName = header;
  let counter = 2;
  while (seenHeaders.has(uniqueName.toLowerCase())) {
    uniqueName = `${header}_${counter}`;
    counter += 1;
  }

  seenHeaders.add(uniqueName.toLowerCase());
  return uniqueName;
}

/**
 * Sanitizes an array of column headers
 */
export function sanitizeHeaderRow(headers: (string | number | undefined | null)[]): string[] {
  const seenHeaders = new Set<string>();
  return headers.map((h, i) => sanitizeColumnHeader(h, i, seenHeaders));
}

/**
 * Checks if a worksheet contains merged cells
 */
export function hasMergedCells(sheet: XLSX.WorkSheet): boolean {
  return Boolean(sheet['!merges'] && sheet['!merges'].length > 0);
}

/**
 * Validates and sanitizes a spreadsheet (.xlsx, .xls) file.
 * Rejects merged cells and non-rectangular data.
 * Sanitizes column headers and returns a clean File object.
 */
export async function validateAndSanitizeSpreadsheet(file: File): Promise<{
  sanitizedFile: File;
  sheetNames: string[];
}> {
  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;

  try {
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      cellStyles: true,
    });
  } catch (error) {
    throw new IngestionValidationError(
      `Unable to parse spreadsheet "${file.name}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new IngestionValidationError(`Spreadsheet "${file.name}" contains no sheets.`);
  }

  let modified = false;

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;

    // 1. Guardrail: Reject merged cells
    if (hasMergedCells(ws)) {
      throw new IngestionValidationError(
        `Merged cells detected in sheet "${sheetName}". Please flatten your spreadsheet before importing.`,
      );
    }

    // Convert sheet to 2D array of raw values
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rows.length === 0) {
      continue;
    }

    // 2. Guardrail: Validate header & rectangular uniformity
    const rawHeaderRow = rows[0] || [];
    const expectedColCount = rawHeaderRow.length;

    if (expectedColCount === 0) {
      continue;
    }

    // Check for uniform column length across all data rows
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      // If row has populated cells beyond the expected header column count
      if (row.length > expectedColCount) {
        // Check if extra cells actually contain non-empty values
        const hasExtraData = row.slice(expectedColCount).some((cell) => cell !== '' && cell != null);
        if (hasExtraData) {
          throw new IngestionValidationError(
            `Non-uniform column length detected in sheet "${sheetName}". Row ${r + 1} contains data outside the header columns. Spreadsheets must be rectangular.`,
          );
        }
      }
    }

    // 3. Guardrail: Sanitize headers
    const sanitizedHeaders = sanitizeHeaderRow(rawHeaderRow);
    const headersChanged = sanitizedHeaders.some((h, idx) => h !== rawHeaderRow[idx]);

    if (headersChanged) {
      modified = true;
      const sanitizedRows = [sanitizedHeaders, ...rows.slice(1)];
      const newWs = XLSX.utils.aoa_to_sheet(sanitizedRows);
      workbook.Sheets[sheetName] = newWs;
    }
  }

  // If the file was .xls (legacy binary Excel) or headers were sanitized,
  // export as clean standard .xlsx for DuckDB compatibility
  const isXls = file.name.toLowerCase().endsWith('.xls') && !file.name.toLowerCase().endsWith('.xlsx');
  if (modified || isXls) {
    const outBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const cleanFileName = isXls ? file.name.replace(/\.xls$/i, '.xlsx') : file.name;
    const sanitizedFile = new File([outBuffer], cleanFileName, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      lastModified: file.lastModified || Date.now(),
    });

    return { sanitizedFile, sheetNames: workbook.SheetNames };
  }

  return { sanitizedFile: file, sheetNames: workbook.SheetNames };
}

/**
 * Simple robust CSV row parser that handles quoted fields with commas and newlines
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        currentField += '"';
        i += 2;
      } else if (char === '"') {
        inQuotes = false;
        i += 1;
      } else {
        currentField += char;
        i += 1;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i += 1;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i += 1;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i += 2;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        currentField = '';
        rows.push(currentRow);
        currentRow = [];
        i += 1;
      } else {
        currentField += char;
        i += 1;
      }
    }
  }

  // Push remaining field / row
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  // Filter out trailing blank rows
  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim() !== ''));
}

/**
 * Validates and sanitizes a CSV file:
 * - Checks for uniform column lengths across all rows.
 * - Sanitizes column headers.
 */
export async function validateAndSanitizeCsv(file: File): Promise<{
  sanitizedFile: File;
}> {
  const text = await file.text();
  const rows = parseCsvRows(text);

  if (rows.length === 0) {
    return { sanitizedFile: file };
  }

  const rawHeaders = rows[0];
  const expectedColCount = rawHeaders.length;

  if (expectedColCount === 0) {
    throw new IngestionValidationError(`CSV file "${file.name}" has an empty header row.`);
  }

  // 1. Guardrail: Check uniform column count
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length !== expectedColCount) {
      throw new IngestionValidationError(
        `Non-uniform column length detected in "${file.name}". Row ${r + 1} has ${row.length} columns, expected ${expectedColCount}. All rows must have the same number of columns.`,
      );
    }
  }

  // 2. Guardrail: Sanitize headers
  const sanitizedHeaders = sanitizeHeaderRow(rawHeaders);
  const headersChanged = sanitizedHeaders.some((h, idx) => h !== rawHeaders[idx]);

  if (headersChanged) {
    // Rebuild CSV with sanitized headers
    const formatField = (field: string) => {
      if (field.includes(',') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };

    const newHeaderLine = sanitizedHeaders.map(formatField).join(',');
    const dataLines = rows.slice(1).map((row) => row.map(formatField).join(','));
    const newCsvText = [newHeaderLine, ...dataLines].join('\n');

    const sanitizedFile = new File([newCsvText], file.name, {
      type: 'text/csv',
      lastModified: file.lastModified || Date.now(),
    });

    return { sanitizedFile };
  }

  return { sanitizedFile: file };
}
