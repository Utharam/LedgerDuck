/**
 * Tests for Audit Log Store
 * Licensed under AGPL-3.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useAuditLogStore } from '../../../src/store/audit-log-store';

describe('Audit Log Store', () => {
  beforeEach(() => {
    useAuditLogStore.getState().clearLog();
  });

  it('adds log entry with ISO and local timestamps', () => {
    const entry = useAuditLogStore.getState().addEntry({
      executedSql: 'SELECT * FROM test_table;',
      status: 'success',
      rowsReturned: 42,
      executionDurationMs: 15,
      scriptName: 'test_script',
    });

    expect(entry.id).toBeDefined();
    expect(entry.timestampIso).toBeDefined();
    expect(entry.timestampLocal).toBeDefined();
    expect(entry.executedSql).toBe('SELECT * FROM test_table;');
    expect(entry.status).toBe('success');
    expect(entry.rowsReturned).toBe(42);

    const state = useAuditLogStore.getState();
    expect(state.entries.length).toBe(1);
    expect(state.entries[0].id).toBe(entry.id);
  });

  it('updates filter properly', () => {
    useAuditLogStore.getState().setFilter({ status: 'error', searchQuery: 'duplicate' });
    const { filter } = useAuditLogStore.getState();
    expect(filter.status).toBe('error');
    expect(filter.searchQuery).toBe('duplicate');
  });

  it('clears log entries', () => {
    useAuditLogStore.getState().addEntry({
      executedSql: 'SELECT 1;',
      status: 'success',
      rowsReturned: 1,
      executionDurationMs: 5,
    });
    expect(useAuditLogStore.getState().entries.length).toBe(1);

    useAuditLogStore.getState().clearLog();
    expect(useAuditLogStore.getState().entries.length).toBe(0);
  });
});
