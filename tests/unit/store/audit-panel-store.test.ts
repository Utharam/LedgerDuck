/**
 * Tests for Audit Panel Store
 * Licensed under AGPL-3.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useAuditPanelStore } from '../../../src/store/audit-panel-store';

describe('Audit Panel Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuditPanelStore.setState({
      isOpen: true,
      activeTab: 'templates',
    });
  });

  it('toggles audit panel open and closed', () => {
    expect(useAuditPanelStore.getState().isOpen).toBe(true);

    useAuditPanelStore.getState().togglePanel();
    expect(useAuditPanelStore.getState().isOpen).toBe(false);

    useAuditPanelStore.getState().togglePanel();
    expect(useAuditPanelStore.getState().isOpen).toBe(true);
  });

  it('opens panel to specific tab', () => {
    useAuditPanelStore.getState().closePanel();
    expect(useAuditPanelStore.getState().isOpen).toBe(false);

    useAuditPanelStore.getState().openPanel('queries');
    expect(useAuditPanelStore.getState().isOpen).toBe(true);
    expect(useAuditPanelStore.getState().activeTab).toBe('queries');
  });

  it('switches active tab', () => {
    useAuditPanelStore.getState().setActiveTab('queries');
    expect(useAuditPanelStore.getState().activeTab).toBe('queries');

    useAuditPanelStore.getState().setActiveTab('templates');
    expect(useAuditPanelStore.getState().activeTab).toBe('templates');
  });
});
