/**
 * Persistent Query Manager Store for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { QueryProfile, SavedQuery, QueryManagerExport } from '@models/query-manager';
import { create } from 'zustand';

const STORAGE_KEY = 'ledgerduck_saved_query_profiles';

export const DEFAULT_QUERY_PROFILES: QueryProfile[] = [
  {
    id: 'profile-amex',
    name: 'Amex Card Statement',
    icon: 'credit-card',
    description: 'Audit routines for corporate American Express and credit card feeds',
    isDefault: true,
    queries: [
      {
        id: 'amex-q1',
        title: 'Foreign Currency & Markup Transactions',
        description: 'Detect non-USD foreign transactions, DCC markup, and overseas exchange fees',
        sql: `-- Foreign Currency & Markup Audit\nSELECT txn_date, particulars, amount, currency\nFROM table_name\nWHERE (currency IS NOT NULL AND currency != 'USD')\n   OR particulars ILIKE '%fx%'\n   OR particulars ILIKE '%foreign%'\n   OR particulars ILIKE '%intl%'\nORDER BY txn_date DESC;`,
        tags: ['FX', 'Compliance'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'amex-q2',
        title: 'Weekend Dining & Entertainment',
        description: 'Flag hospitality & entertainment expenses booked on Saturdays & Sundays',
        sql: `-- Weekend Hospitality Audit\nSELECT txn_date, particulars, amount, category\nFROM table_name\nWHERE DAYOFWEEK(TRY_CAST(txn_date AS DATE)) IN (1, 7)\n  AND (category ILIKE '%dining%' OR category ILIKE '%restaurant%' OR category ILIKE '%hotel%' OR particulars ILIKE '%bar%')\nORDER BY amount DESC;`,
        tags: ['Expense Policy', 'Weekend'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'amex-q3',
        title: 'Recurring SaaS & Subscriptions',
        description: 'Identify recurring software subscriptions and cloud service charges',
        sql: `-- Recurring Subscription Review\nSELECT particulars, amount, COUNT(*) AS frequency\nFROM table_name\nWHERE category ILIKE '%software%' OR category ILIKE '%it%' OR particulars ILIKE '%aws%' OR particulars ILIKE '%adobe%'\nGROUP BY particulars, amount\nHAVING COUNT(*) > 1\nORDER BY frequency DESC, amount DESC;`,
        tags: ['SaaS', 'Duplicates'],
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'profile-bank',
    name: 'Bank Statement (HDFC / Chase)',
    icon: 'building-bank',
    description: 'Bank reconciliation, high-value transfer analysis, and charges audit',
    isDefault: true,
    queries: [
      {
        id: 'bank-q1',
        title: 'High Value Debits (> $50,000)',
        description: 'Sample high-value outflows for substantive approval verification',
        sql: `-- High Value Outflows Sample\nSELECT txn_date, particulars, debit, balance\nFROM table_name\nWHERE debit >= 50000\nORDER BY debit DESC;`,
        tags: ['Materiality', 'Sampling'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bank-q2',
        title: 'Bank Penalties, Bounces & Surcharges',
        description: 'Detect dishonored checks, RTGS charges, and overdraft penalties',
        sql: `-- Bank Penalties & Fees Audit\nSELECT txn_date, particulars, debit\nFROM table_name\nWHERE particulars ILIKE '%charge%'\n   OR particulars ILIKE '%penalty%'\n   OR particulars ILIKE '%bounce%'\n   OR particulars ILIKE '%fee%'\n   OR particulars ILIKE '%return%'\nORDER BY txn_date DESC;`,
        tags: ['Bank Fees', 'Controls'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'bank-q3',
        title: 'Round-Sum Transfers',
        description: 'Filter round dollar amounts indicative of manual transfers or unapplied funds',
        sql: `-- Round-Sum Wire / ACH Transfers\nSELECT txn_date, particulars, debit\nFROM table_name\nWHERE CAST(debit AS BIGINT) = debit\n  AND debit >= 1000\nORDER BY debit DESC;`,
        tags: ['Round Sum', 'Reconciliation'],
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'profile-cash',
    name: 'Petty Cash / Cash Sheet',
    icon: 'cash',
    description: 'Cash disbursements, missing receipts, and internal control validations',
    isDefault: true,
    queries: [
      {
        id: 'cash-q1',
        title: 'Missing Voucher Numbers',
        description: 'Flag cash entries with missing, empty, or unnumbered voucher references',
        sql: `-- Missing Cash Vouchers\nSELECT txn_date, particulars, amount, voucher_no\nFROM table_name\nWHERE voucher_no IS NULL \n   OR TRIM(voucher_no) = '' \n   OR voucher_no ILIKE '%missing%'\n   OR voucher_no ILIKE '%n/a%'\nORDER BY txn_date DESC;`,
        tags: ['Documentation', 'Internal Controls'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'cash-q2',
        title: 'Disbursements Exceeding Limit (> $500)',
        description: 'Identify cash payouts exceeding statutory/petty cash disbursement thresholds',
        sql: `-- Excess Cash Payouts\nSELECT txn_date, particulars, amount, payee\nFROM table_name\nWHERE amount > 500\nORDER BY amount DESC;`,
        tags: ['Policy Violation', 'Limit Check'],
        createdAt: new Date().toISOString(),
      },
    ],
  },
];

interface QueryManagerState {
  profiles: QueryProfile[];
  activeProfileId: string | null;

  // Actions
  setActiveProfileId: (id: string | null) => void;
  addProfile: (profile: Omit<QueryProfile, 'id'>) => string;
  updateProfile: (id: string, updates: Partial<Omit<QueryProfile, 'id'>>) => void;
  deleteProfile: (id: string) => void;

  addQuery: (profileId: string, query: Omit<SavedQuery, 'id' | 'createdAt'>) => string;
  updateQuery: (profileId: string, queryId: string, updates: Partial<Omit<SavedQuery, 'id'>>) => void;
  deleteQuery: (profileId: string, queryId: string) => void;

  exportProfilesJson: () => string;
  importProfilesJson: (jsonString: string) => { success: boolean; importedCount: number; error?: string };
  resetToDefaults: () => void;
}

const loadStoredProfiles = (): QueryProfile[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_QUERY_PROFILES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_QUERY_PROFILES;
  } catch {
    return DEFAULT_QUERY_PROFILES;
  }
};

const saveProfiles = (profiles: QueryProfile[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save query profiles to localStorage:', err);
  }
};

export const useQueryManagerStore = create<QueryManagerState>((set, get) => ({
  profiles: loadStoredProfiles(),
  activeProfileId: 'profile-amex',

  setActiveProfileId: (id) => set({ activeProfileId: id }),

  addProfile: (profileData) => {
    const id = `profile-${Date.now()}`;
    const newProfile: QueryProfile = {
      ...profileData,
      id,
      queries: profileData.queries || [],
    };
    const nextProfiles = [...get().profiles, newProfile];
    saveProfiles(nextProfiles);
    set({ profiles: nextProfiles, activeProfileId: id });
    return id;
  },

  updateProfile: (id, updates) => {
    const nextProfiles = get().profiles.map((p) =>
      p.id === id ? { ...p, ...updates } : p,
    );
    saveProfiles(nextProfiles);
    set({ profiles: nextProfiles });
  },

  deleteProfile: (id) => {
    const nextProfiles = get().profiles.filter((p) => p.id !== id);
    saveProfiles(nextProfiles);
    const activeId = get().activeProfileId === id ? (nextProfiles[0]?.id ?? null) : get().activeProfileId;
    set({ profiles: nextProfiles, activeProfileId: activeId });
  },

  addQuery: (profileId, queryData) => {
    const id = `query-${Date.now()}`;
    const newQuery: SavedQuery = {
      ...queryData,
      id,
      createdAt: new Date().toISOString(),
    };
    const nextProfiles = get().profiles.map((p) => {
      if (p.id === profileId) {
        return {
          ...p,
          queries: [...p.queries, newQuery],
        };
      }
      return p;
    });
    saveProfiles(nextProfiles);
    set({ profiles: nextProfiles });
    return id;
  },

  updateQuery: (profileId, queryId, updates) => {
    const nextProfiles = get().profiles.map((p) => {
      if (p.id === profileId) {
        return {
          ...p,
          queries: p.queries.map((q) => (q.id === queryId ? { ...q, ...updates } : q)),
        };
      }
      return p;
    });
    saveProfiles(nextProfiles);
    set({ profiles: nextProfiles });
  },

  deleteQuery: (profileId, queryId) => {
    const nextProfiles = get().profiles.map((p) => {
      if (p.id === profileId) {
        return {
          ...p,
          queries: p.queries.filter((q) => q.id !== queryId),
        };
      }
      return p;
    });
    saveProfiles(nextProfiles);
    set({ profiles: nextProfiles });
  },

  exportProfilesJson: () => {
    const exportData: QueryManagerExport = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      profiles: get().profiles,
    };
    return JSON.stringify(exportData, null, 2);
  },

  importProfilesJson: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const incomingProfiles: QueryProfile[] = Array.isArray(parsed)
        ? parsed
        : parsed?.profiles && Array.isArray(parsed.profiles)
        ? parsed.profiles
        : null;

      if (!incomingProfiles || incomingProfiles.length === 0) {
        return { success: false, importedCount: 0, error: 'No valid query profiles found in JSON file.' };
      }

      // Merge incoming profiles avoiding duplicate IDs
      const current = get().profiles;
      const existingIds = new Set(current.map((p) => p.id));
      const merged = [...current];

      let importedCount = 0;
      for (const p of incomingProfiles) {
        if (!p.name) continue;
        const profileId = existingIds.has(p.id) ? `profile-${Date.now()}-${Math.random().toString(36).substring(2, 6)}` : p.id;
        merged.push({
          ...p,
          id: profileId,
          queries: Array.isArray(p.queries) ? p.queries : [],
        });
        existingIds.add(profileId);
        importedCount++;
      }

      saveProfiles(merged);
      set({ profiles: merged });
      return { success: true, importedCount };
    } catch (err) {
      return { success: false, importedCount: 0, error: err instanceof Error ? err.message : 'Invalid JSON format' };
    }
  },

  resetToDefaults: () => {
    saveProfiles(DEFAULT_QUERY_PROFILES);
    set({ profiles: DEFAULT_QUERY_PROFILES, activeProfileId: DEFAULT_QUERY_PROFILES[0].id });
  },
}));
