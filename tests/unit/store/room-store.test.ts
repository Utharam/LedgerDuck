/**
 * Tests for Room Store (LedgerDuck 2.0)
 * Licensed under AGPL-3.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

import { LOCAL_STORAGE_KEYS } from '../../../src/models/local-storage';
import { useRoomStore } from '../../../src/store/room-store';

describe('Room Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useRoomStore.setState({
      activeRoom: 'query',
      selectedTable: '',
      mapping: {
        dateColumn: '',
        particularsColumn: '',
        categoryColumn: '',
        amountColumn: '',
      },
    });
  });

  it('initializes to query room by default', () => {
    expect(useRoomStore.getState().activeRoom).toBe('query');
  });

  it('switches rooms and persists to localStorage', () => {
    useRoomStore.getState().setActiveRoom('forensic');
    expect(useRoomStore.getState().activeRoom).toBe('forensic');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_ROOM)).toBe('forensic');

    useRoomStore.getState().setActiveRoom('vocabulary');
    expect(useRoomStore.getState().activeRoom).toBe('vocabulary');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_ROOM)).toBe('vocabulary');

    useRoomStore.getState().setActiveRoom('query');
    expect(useRoomStore.getState().activeRoom).toBe('query');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_ROOM)).toBe('query');
  });

  it('manages shared table and column mapping', () => {
    useRoomStore.getState().setSelectedTable('gl_journal');
    expect(useRoomStore.getState().selectedTable).toBe('gl_journal');

    useRoomStore.getState().setMapping({
      particularsColumn: 'narration',
      categoryColumn: 'account_code',
    });

    const mapping = useRoomStore.getState().mapping;
    expect(mapping.particularsColumn).toBe('narration');
    expect(mapping.categoryColumn).toBe('account_code');
    expect(mapping.dateColumn).toBe('');

    useRoomStore.getState().resetMapping();
    expect(useRoomStore.getState().mapping.particularsColumn).toBe('');
  });
});
