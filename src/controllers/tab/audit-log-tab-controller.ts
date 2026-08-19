/**
 * Audit Log Tab Controller for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { AuditLogTab, TabId } from '@models/tab';
import { createTabFromAuditLog, useAppStore } from '@store/app-store';
import { makeTabId } from '@utils/tab';
import { persistCreateTab } from './persist';
import { setActiveTabId } from './tab-controller';

/**
 * Finds an existing open audit log tab if one exists
 */
export const findExistingAuditLogTab = (): AuditLogTab | undefined => {
  const state = useAppStore.getState();
  for (const tab of state.tabs.values()) {
    if (tab.type === 'audit-log') {
      return tab;
    }
  }
  return undefined;
};

/**
 * Gets the existing Audit Log tab or creates a new one and opens it
 */
export const getOrCreateAuditLogTab = (options?: { setActive?: boolean }): AuditLogTab => {
  const existing = findExistingAuditLogTab();
  if (existing) {
    if (options?.setActive) {
      setActiveTabId(existing.id);
    }
    return existing;
  }

  return createAuditLogTab(options);
};

/**
 * Creates a new Audit Log tab
 */
export const createAuditLogTab = (options?: { setActive?: boolean }): AuditLogTab => {
  const state = useAppStore.getState();
  const tabId = makeTabId();

  const tab: AuditLogTab = {
    type: 'audit-log',
    id: tabId,
    dataViewStateCache: null,
  };

  const { activeTabId: newActiveTabId, tabOrder: newTabOrder } = createTabFromAuditLog(
    tab,
    options?.setActive ? tabId : undefined,
  );

  const iDb = state._iDbConn;
  if (iDb) {
    persistCreateTab(iDb, tab, newTabOrder, newActiveTabId);
  }

  return tab;
};
