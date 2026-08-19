/**
 * Continuous / Flexible Query Insertion Helper for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showSuccess } from '@components/app-notifications';
import { createSQLScript, updateSQLScriptContent } from '@controllers/sql-script';
import { getOrCreateTabFromScript } from '@controllers/tab';
import { SQLScriptId } from '@models/sql-script';
import { TabId } from '@models/tab';
import { useAppStore } from '@store/app-store';

export interface InsertQueryOptions {
  sql: string;
  queryTitle?: string;
  targetMode?: 'active' | 'new-tab';
  scriptName?: string;
  silent?: boolean;
}

export interface InsertQueryResult {
  mode: 'active' | 'new-tab';
  scriptId: SQLScriptId;
  scriptName: string;
}

/**
 * Checks if there is an active script tab open.
 */
export function getActiveScriptTab(): { tabId: TabId; scriptId: SQLScriptId; scriptName: string } | null {
  const state = useAppStore.getState();
  const activeTabId = state.activeTabId;
  if (!activeTabId) return null;

  const tab = state.tabs.get(activeTabId);
  if (!tab || tab.type !== 'script') return null;

  const script = state.sqlScripts.get(tab.sqlScriptId);
  if (!script) return null;

  return {
    tabId: activeTabId,
    scriptId: script.id,
    scriptName: script.name,
  };
}

/**
 * Inserts SQL into the active query tab or opens a new query tab.
 */
export function insertOrOpenQuery({
  sql,
  queryTitle,
  targetMode = 'active',
  scriptName = 'audit_query',
  silent = false,
}: InsertQueryOptions): InsertQueryResult {
  const activeScript = getActiveScriptTab();

  // If user requested active tab and an active script is currently open
  if (targetMode === 'active' && activeScript) {
    const currentScript = useAppStore.getState().sqlScripts.get(activeScript.scriptId);
    const existingContent = currentScript?.content ?? '';

    const banner = queryTitle
      ? `-- ===============================================================\n-- ${queryTitle}\n-- ===============================================================\n`
      : '';

    const formattedBlock = `${banner}${sql}`;
    const newContent = existingContent.trim()
      ? `${existingContent.trim()}\n\n${formattedBlock}`
      : formattedBlock;

    updateSQLScriptContent(activeScript.scriptId, newContent);

    if (!silent) {
      showSuccess({
        title: 'Query Appended',
        message: `Appended "${queryTitle || 'query'}" to active script "${activeScript.scriptName}".`,
        autoClose: 2000,
      });
    }

    return {
      mode: 'active',
      scriptId: activeScript.scriptId,
      scriptName: activeScript.scriptName,
    };
  }

  // Otherwise, create a new script and tab
  const nameToUse = scriptName || (queryTitle ? `audit_${queryTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}` : 'query');
  const banner = queryTitle
    ? `-- ===============================================================\n-- ${queryTitle}\n-- ===============================================================\n`
    : '';

  const newScript = createSQLScript(nameToUse, `${banner}${sql}`);
  getOrCreateTabFromScript(newScript, true);

  if (!silent) {
    showSuccess({
      title: 'New Query Created',
      message: `Opened "${queryTitle || 'query'}" in a new tab.`,
      autoClose: 2000,
    });
  }

  return {
    mode: 'new-tab',
    scriptId: newScript.id,
    scriptName: newScript.name,
  };
}
