/**
 * Tests for Query Manager Store
 * Licensed under AGPL-3.0
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { useQueryManagerStore, DEFAULT_QUERY_PROFILES } from '../../../src/store/query-manager-store';

describe('Query Manager Store', () => {
  beforeEach(() => {
    localStorage.clear();
    useQueryManagerStore.getState().resetToDefaults();
  });

  it('loads default audit profiles on initial startup', () => {
    const { profiles } = useQueryManagerStore.getState();
    expect(profiles.length).toBeGreaterThanOrEqual(3);

    const amexProfile = profiles.find((p) => p.name.includes('Amex'));
    expect(amexProfile).toBeDefined();
    expect(amexProfile?.queries.length).toBeGreaterThanOrEqual(2);

    const bankProfile = profiles.find((p) => p.name.includes('Bank'));
    expect(bankProfile).toBeDefined();
  });

  it('allows adding, updating, and deleting custom profiles', () => {
    const store = useQueryManagerStore.getState();

    // 1. Add Profile
    const newId = store.addProfile({
      name: 'Vendor Audit - SAP',
      icon: 'file-text',
      description: 'Vendor payment reconciliations',
      queries: [],
    });

    let profiles = useQueryManagerStore.getState().profiles;
    expect(profiles.some((p) => p.id === newId)).toBe(true);

    // 2. Update Profile
    store.updateProfile(newId, { description: 'Updated vendor rules' });
    profiles = useQueryManagerStore.getState().profiles;
    expect(profiles.find((p) => p.id === newId)?.description).toBe('Updated vendor rules');

    // 3. Delete Profile
    store.deleteProfile(newId);
    profiles = useQueryManagerStore.getState().profiles;
    expect(profiles.some((p) => p.id === newId)).toBe(false);
  });

  it('allows adding, editing, and deleting queries within a profile', () => {
    const store = useQueryManagerStore.getState();
    const profileId = store.profiles[0].id;

    // 1. Add query
    const qId = store.addQuery(profileId, {
      title: 'Custom Benford First Digit Check',
      description: 'Analyze distribution of leading digits',
      sql: 'SELECT SUBSTR(CAST(amount AS VARCHAR), 1, 1) AS leading_digit, COUNT(*) FROM table_name GROUP BY 1;',
      tags: ['Benford', 'Forensic'],
    });

    let profile = useQueryManagerStore.getState().profiles.find((p) => p.id === profileId);
    expect(profile?.queries.some((q) => q.id === qId)).toBe(true);

    // 2. Update query
    store.updateQuery(profileId, qId, { title: 'Updated Benford Check' });
    profile = useQueryManagerStore.getState().profiles.find((p) => p.id === profileId);
    expect(profile?.queries.find((q) => q.id === qId)?.title).toBe('Updated Benford Check');

    // 3. Delete query
    store.deleteQuery(profileId, qId);
    profile = useQueryManagerStore.getState().profiles.find((p) => p.id === profileId);
    expect(profile?.queries.some((q) => q.id === qId)).toBe(false);
  });

  it('correctly exports and imports query profiles as JSON', () => {
    const store = useQueryManagerStore.getState();
    const json = store.exportProfilesJson();

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0');
    expect(Array.isArray(parsed.profiles)).toBe(true);

    // Test import
    const customPack = JSON.stringify({
      version: '1.0',
      profiles: [
        {
          id: 'imported-pack-1',
          name: 'Quarter-End Cutoff Queries',
          icon: 'calendar',
          description: 'Cut-off date testing',
          queries: [
            {
              id: 'q-cutoff-1',
              title: 'Goods Received but Not Invoiced (GRNI)',
              sql: 'SELECT * FROM grni_table WHERE invoice_date IS NULL;',
              tags: ['Cutoff', 'Accruals'],
            },
          ],
        },
      ],
    });

    const result = store.importProfilesJson(customPack);
    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);

    const profiles = useQueryManagerStore.getState().profiles;
    expect(profiles.some((p) => p.name === 'Quarter-End Cutoff Queries')).toBe(true);
  });
});
