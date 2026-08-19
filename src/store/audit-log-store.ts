/**
 * Persistent Store for Audit Trail & SQL Execution Log
 * Licensed under AGPL-3.0
 */

import { AuditLogEntry, AuditLogFilter } from '@models/audit-log';
import { v4 as uuidv4 } from 'uuid';
import { create } from 'zustand';

const AUDIT_LOG_STORAGE_KEY = 'ledgerduck-audit-trail-log';
const MAX_AUDIT_LOG_ENTRIES = 5000;

interface AuditLogState {
  entries: AuditLogEntry[];
  filter: AuditLogFilter;
  addEntry: (
    entry: Omit<AuditLogEntry, 'id' | 'timestampIso' | 'timestampLocal'>,
  ) => AuditLogEntry;
  clearLog: () => void;
  setFilter: (filter: Partial<AuditLogFilter>) => void;
  exportToCsv: () => void;
  exportToJson: () => void;
}

function loadInitialEntries(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load audit trail log from localStorage:', error);
    return [];
  }
}

function saveEntries(entries: AuditLogEntry[]) {
  try {
    localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Failed to persist audit trail log to localStorage:', error);
  }
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  entries: loadInitialEntries(),
  filter: {
    searchQuery: '',
    status: 'all',
  },

  addEntry: (newEntry) => {
    const now = new Date();
    const entry: AuditLogEntry = {
      ...newEntry,
      id: uuidv4(),
      timestampIso: now.toISOString(),
      timestampLocal: now.toLocaleString(),
    };

    set((state) => {
      const updated = [entry, ...state.entries].slice(0, MAX_AUDIT_LOG_ENTRIES);
      saveEntries(updated);
      return { entries: updated };
    });

    return entry;
  },

  clearLog: () => {
    set({ entries: [] });
    saveEntries([]);
  },

  setFilter: (newFilter) => {
    set((state) => ({
      filter: { ...state.filter, ...newFilter },
    }));
  },

  exportToCsv: () => {
    const { entries } = get();
    const escapeCsv = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return '';
      const s = String(str);
      if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headers = [
      'Timestamp_ISO',
      'Timestamp_Local',
      'Status',
      'Execution_Duration_ms',
      'Rows_Returned',
      'Script_Name',
      'Executed_SQL',
      'Error_Message',
    ];

    const rows = entries.map((e) => [
      escapeCsv(e.timestampIso),
      escapeCsv(e.timestampLocal),
      escapeCsv(e.status),
      escapeCsv(e.executionDurationMs),
      escapeCsv(e.rowsReturned),
      escapeCsv(e.scriptName || 'adhoc_query'),
      escapeCsv(e.executedSql),
      escapeCsv(e.errorMessage || ''),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(csvContent, `audit_trail_workpaper_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  },

  exportToJson: () => {
    const { entries } = get();
    const jsonContent = JSON.stringify(
      {
        workspace: 'LedgerDuck Audit Trail',
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length,
        entries,
      },
      null,
      2,
    );

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    triggerDownload(
      jsonContent,
      `audit_trail_${dateStr}.json`,
      'application/json;charset=utf-8;',
    );
  },
}));
