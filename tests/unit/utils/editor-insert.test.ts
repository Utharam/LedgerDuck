/**
 * Tests for Editor Insert Helper
 * Licensed under AGPL-3.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useAppStore } from '../../../src/store/app-store';
import { getActiveScriptTab, insertOrOpenQuery } from '../../../src/utils/editor-insert';
import { makeSQLScriptId } from '../../../src/utils/sql-script';
import { TabId } from '../../../src/models/tab';

describe('Editor Insert Helper', () => {
  beforeEach(() => {
    useAppStore.setState({
      tabs: new Map(),
      activeTabId: null as any,
      sqlScripts: new Map(),
    });
  });

  it('returns null when no active script tab is open', () => {
    const active = getActiveScriptTab();
    expect(active).toBeNull();
  });

  it('opens a new tab when targetMode is new-tab or no tab is active', () => {
    const result = insertOrOpenQuery({
      sql: 'SELECT * FROM sample_ledger;',
      queryTitle: 'Test Duplicate Check',
      targetMode: 'new-tab',
      silent: true,
    });

    expect(result.mode).toBe('new-tab');
    expect(result.scriptId).toBeDefined();

    const state = useAppStore.getState();
    const createdScript = state.sqlScripts.get(result.scriptId as any);
    expect(createdScript).toBeDefined();
    expect(createdScript?.content).toContain('Test Duplicate Check');
    expect(createdScript?.content).toContain('SELECT * FROM sample_ledger;');
  });

  it('appends SQL with banner comment when an active script tab is open and targetMode is active', () => {
    const scriptId = makeSQLScriptId();
    const tabId = 'tab-1' as TabId;

    useAppStore.setState({
      sqlScripts: new Map([
        [
          scriptId,
          {
            id: scriptId,
            name: 'Audit_Workpaper_1',
            content: 'SELECT count(*) FROM table_1;',
          },
        ],
      ]),
      tabs: new Map([
        [
          tabId,
          {
            id: tabId,
            name: 'Audit_Workpaper_1',
            type: 'script',
            sqlScriptId: scriptId,
          } as any,
        ],
      ]),
      activeTabId: tabId,
    });

    const active = getActiveScriptTab();
    expect(active).not.toBeNull();
    expect(active?.scriptName).toBe('Audit_Workpaper_1');

    const result = insertOrOpenQuery({
      sql: 'SELECT * FROM split_payments;',
      queryTitle: 'Split Payments Check',
      targetMode: 'active',
      silent: true,
    });

    expect(result.mode).toBe('active');
    expect(result.scriptId).toBe(scriptId);

    const updatedScript = useAppStore.getState().sqlScripts.get(scriptId);
    expect(updatedScript?.content).toContain('SELECT count(*) FROM table_1;');
    expect(updatedScript?.content).toContain('Split Payments Check');
    expect(updatedScript?.content).toContain('SELECT * FROM split_payments;');
  });
});
