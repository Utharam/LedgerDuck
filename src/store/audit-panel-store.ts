/**
 * Audit Panel State Store
 * Licensed under AGPL-3.0
 */

import { LOCAL_STORAGE_KEYS } from '@models/local-storage';
import { create } from 'zustand';

interface AuditPanelState {
  isOpen: boolean;
  activeTab: 'templates' | 'queries';
  openPanel: (tab?: 'templates' | 'queries') => void;
  closePanel: () => void;
  togglePanel: () => void;
  setActiveTab: (tab: 'templates' | 'queries') => void;
}

export const useAuditPanelStore = create<AuditPanelState>((set) => ({
  isOpen: (() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.AUDIT_PANEL_OPEN);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  })(),
  activeTab: 'templates',
  openPanel: (tab) =>
    set((state) => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_PANEL_OPEN, JSON.stringify(true));
      } catch {}
      return { isOpen: true, activeTab: tab || state.activeTab };
    }),
  closePanel: () =>
    set(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_PANEL_OPEN, JSON.stringify(false));
      } catch {}
      return { isOpen: false };
    }),
  togglePanel: () =>
    set((state) => {
      const next = !state.isOpen;
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.AUDIT_PANEL_OPEN, JSON.stringify(next));
      } catch {}
      return { isOpen: next };
    }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
