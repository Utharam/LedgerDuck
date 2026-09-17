/**
 * Room State Store for LedgerDuck 2.0
 * Manages the active workspace room ('query' | 'forensic' | 'vocabulary')
 * and shared audit table / column mapping context.
 * Licensed under AGPL-3.0
 */

import { AuditColumnMapping } from '@models/audit-template';
import { LOCAL_STORAGE_KEYS } from '@models/local-storage';
import { create } from 'zustand';

export type AppRoom = 'query' | 'forensic' | 'vocabulary';

interface RoomState {
  activeRoom: AppRoom;
  selectedTable: string;
  mapping: AuditColumnMapping;
  setActiveRoom: (room: AppRoom) => void;
  setSelectedTable: (table: string) => void;
  setMapping: (mapping: Partial<AuditColumnMapping>) => void;
  resetMapping: () => void;
}

const DEFAULT_MAPPING: AuditColumnMapping = {
  dateColumn: '',
  particularsColumn: '',
  categoryColumn: '',
  amountColumn: '',
};

export const useRoomStore = create<RoomState>((set) => ({
  activeRoom: (() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_ROOM);
      if (saved && (saved === 'query' || saved === 'forensic' || saved === 'vocabulary')) {
        return saved as AppRoom;
      }
      return 'query';
    } catch {
      return 'query';
    }
  })(),
  selectedTable: '',
  mapping: { ...DEFAULT_MAPPING },
  setActiveRoom: (room) =>
    set(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_ROOM, room);
      } catch {
        // ignore localStorage error
      }
      return { activeRoom: room };
    }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setMapping: (partial) =>
    set((state) => ({
      mapping: { ...state.mapping, ...partial },
    })),
  resetMapping: () => set({ mapping: { ...DEFAULT_MAPPING } }),
}));
