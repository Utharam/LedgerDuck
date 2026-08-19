/**
 * Sample Audit Ledger Generator and Loader for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showSuccess, showError } from '@components/app-notifications';
import { createSQLScript } from '@controllers/sql-script';
import { getOrCreateTabFromScript } from '@controllers/tab';
import { refreshDatabaseMetadata } from '@features/data-explorer/utils/metadata-refresh';
import { PERSISTENT_DB_NAME } from '@models/db-persistence';
import { AsyncDuckDBConnectionPool } from '@services/duckdb-pool/duckdb-connection-pool';

export interface SampleTransaction {
  txn_id: string;
  txn_date: string;
  particulars: string;
  gl_account: string;
  debit: number;
  credit: number;
  net_amount: number;
  invoice_ref: string;
  payment_mode: string;
}

export const SAMPLE_LEDGER_DATA: SampleTransaction[] = [
  {
    txn_id: 'TXN-1001',
    txn_date: '2026-03-02',
    particulars: 'Office Supplies & Stationery Depot',
    gl_account: '6100 - Office Expense',
    debit: 342.5,
    credit: 0.0,
    net_amount: 342.5,
    invoice_ref: 'INV-7721',
    payment_mode: 'Corporate Card',
  },
  {
    txn_id: 'TXN-1002',
    txn_date: '2026-03-03',
    particulars: 'Acme Logistics Freight Charges',
    gl_account: '5200 - Shipping & Delivery',
    debit: 1845.2,
    credit: 0.0,
    net_amount: 1845.2,
    invoice_ref: 'INV-7729',
    payment_mode: 'ACH Transfer',
  },
  {
    txn_id: 'TXN-1003',
    txn_date: '2026-03-04',
    particulars: 'Global Telecom Fiber Internet',
    gl_account: '6200 - Utilities',
    debit: 520.0,
    credit: 0.0,
    net_amount: 520.0,
    invoice_ref: 'INV-7740',
    payment_mode: 'Auto-Debit',
  },
  // Anomaly 1: Exact Duplicate A
  {
    txn_id: 'TXN-1004',
    txn_date: '2026-03-12',
    particulars: 'Apex Cloud Services Hosting',
    gl_account: '6300 - IT & Software',
    debit: 1250.0,
    credit: 0.0,
    net_amount: 1250.0,
    invoice_ref: 'INV-8831',
    payment_mode: 'Credit Card',
  },
  // Anomaly 1: Exact Duplicate B (Duplicate of TXN-1004)
  {
    txn_id: 'TXN-1005',
    txn_date: '2026-03-12',
    particulars: 'Apex Cloud Services Hosting',
    gl_account: '6300 - IT & Software',
    debit: 1250.0,
    credit: 0.0,
    net_amount: 1250.0,
    invoice_ref: 'INV-8831',
    payment_mode: 'Credit Card',
  },
  // Anomaly 2: Split Transaction 1 (Same day & amount to bypass $5k limit)
  {
    txn_id: 'TXN-1006',
    txn_date: '2026-03-15',
    particulars: 'Strategic Advisory Partners - Phase 1',
    gl_account: '6400 - Professional Fees',
    debit: 4950.0,
    credit: 0.0,
    net_amount: 4950.0,
    invoice_ref: 'INV-9011',
    payment_mode: 'Wire Transfer',
  },
  // Anomaly 2: Split Transaction 2
  {
    txn_id: 'TXN-1007',
    txn_date: '2026-03-15',
    particulars: 'Strategic Advisory Partners - Phase 2',
    gl_account: '6400 - Professional Fees',
    debit: 4950.0,
    credit: 0.0,
    net_amount: 4950.0,
    invoice_ref: 'INV-9012',
    payment_mode: 'Wire Transfer',
  },
  // Anomaly 3 & 4: Round sum + Weekend posting (2026-03-15 was Sunday)
  {
    txn_id: 'TXN-1008',
    txn_date: '2026-03-15',
    particulars: 'Executive Management Bonus Retainer',
    gl_account: '6500 - Management Fees',
    debit: 5000.0,
    credit: 0.0,
    net_amount: 5000.0,
    invoice_ref: 'ADJ-004',
    payment_mode: 'Manual Journal',
  },
  // Regular Revenue entry
  {
    txn_id: 'TXN-1009',
    txn_date: '2026-03-18',
    particulars: 'Client Retainer - OmniCorp North America',
    gl_account: '4100 - Service Revenue',
    debit: 0.0,
    credit: 18500.0,
    net_amount: -18500.0,
    invoice_ref: 'REC-3091',
    payment_mode: 'Wire Inward',
  },
  // Anomaly 4: Weekend posting (2026-03-21 was Saturday)
  {
    txn_id: 'TXN-1010',
    txn_date: '2026-03-21',
    particulars: 'Weekend Emergency HVAC Repair',
    gl_account: '6600 - Repairs & Maintenance',
    debit: 2150.0,
    credit: 0.0,
    net_amount: 2150.0,
    invoice_ref: 'INV-9204',
    payment_mode: 'Cheque #4091',
  },
  // Anomaly 5: Materiality Top Outlier ($98,500)
  {
    txn_id: 'TXN-1011',
    txn_date: '2026-03-24',
    particulars: 'Industrial Server Rack Hardware Infrastructure',
    gl_account: '1500 - Capital Equipment',
    debit: 98500.0,
    credit: 0.0,
    net_amount: 98500.0,
    invoice_ref: 'CAPEX-104',
    payment_mode: 'Wire Transfer',
  },
  // Anomaly 3: Round sum ($10,000)
  {
    txn_id: 'TXN-1012',
    txn_date: '2026-03-28',
    particulars: 'Quarterly Corporate Tax Advisory Retainer',
    gl_account: '6400 - Professional Fees',
    debit: 10000.0,
    credit: 0.0,
    net_amount: 10000.0,
    invoice_ref: 'INV-9550',
    payment_mode: 'ACH Transfer',
  },
  {
    txn_id: 'TXN-1013',
    txn_date: '2026-03-30',
    particulars: 'Municipal Utilities Water & Power',
    gl_account: '6200 - Utilities',
    debit: 840.65,
    credit: 0.0,
    net_amount: 840.65,
    invoice_ref: 'INV-9610',
    payment_mode: 'Auto-Debit',
  },
];

/**
 * Loads the sample audit ledger into DuckDB as an in-memory table `sample_ledger`
 * and creates a ready-to-run audit inspection tab.
 */
export async function loadSampleLedger(pool: AsyncDuckDBConnectionPool): Promise<void> {
  const conn = await pool.getBackgroundConnection();
  try {
    // 1. Create table structure
    await conn.query(`
      CREATE OR REPLACE TABLE sample_ledger (
        txn_id VARCHAR,
        txn_date DATE,
        particulars VARCHAR,
        gl_account VARCHAR,
        debit DOUBLE,
        credit DOUBLE,
        net_amount DOUBLE,
        invoice_ref VARCHAR,
        payment_mode VARCHAR
      );
    `);

    // 2. Insert sample transactions
    const values = SAMPLE_LEDGER_DATA.map(
      (r) =>
        `('${r.txn_id}', '${r.txn_date}', '${r.particulars.replace(/'/g, "''")}', '${r.gl_account}', ${r.debit}, ${r.credit}, ${r.net_amount}, '${r.invoice_ref}', '${r.payment_mode}')`,
    ).join(',\n');

    await conn.query(`INSERT INTO sample_ledger VALUES ${values};`);

    // 3. Refresh DuckDB metadata so Accounting Drawer and Explorer pick it up
    await refreshDatabaseMetadata(pool, [PERSISTENT_DB_NAME]);

    // 4. Open a pre-populated SQL exploration tab
    const initialSql = `-- ===============================================================
-- Sample Audit Ledger Loaded (table: sample_ledger)
-- Use the "Audit Templates" panel on the left to run 1-click tests!
-- ===============================================================

SELECT 
  txn_id,
  txn_date,
  particulars,
  gl_account,
  debit,
  credit,
  net_amount,
  invoice_ref,
  payment_mode
FROM sample_ledger
ORDER BY txn_date ASC;`;

    const script = createSQLScript('sample_ledger_audit', initialSql);
    getOrCreateTabFromScript(script, true);

    showSuccess({
      title: 'Sample Ledger Loaded',
      message: 'Loaded mock company ledger with test audit cases into "sample_ledger".',
      autoClose: 3500,
    });
  } catch (err) {
    console.error('Failed to load sample ledger:', err);
    showError({
      title: 'Failed to Load Sample Ledger',
      message: err instanceof Error ? err.message : String(err),
    });
  } finally {
    await conn.close();
  }
}
