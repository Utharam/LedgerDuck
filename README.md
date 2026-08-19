# LedgerDuck - Zero-Knowledge SQL Investigation Workspace for Accountants & Auditors 🦆

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Created by: Utharam](https://img.shields.io/badge/Created%20by-Utharam-indigo.svg)](https://utharam.github.io/)
[![Engine: DuckDB--Wasm](https://img.shields.io/badge/Engine-DuckDB--Wasm-yellow.svg)](https://duckdb.org/)

**LedgerDuck** is a privacy-first, zero-knowledge in-browser SQL investigation workspace designed specifically for financial auditors, forensic accountants, and controllers.

Powered by **DuckDB-Wasm** and React, all analytical processing runs **100% locally in your browser**. No remote servers, no cloud uploads, and zero data leakage — your sensitive financial records and client ledger rows never leave your computer.

---

## 💡 Why LedgerDuck?

Auditing large general ledgers, trial balances, and bank statements in traditional spreadsheets (`.xlsx`, `.csv`) is slow, prone to formula errors, and struggles with files over 100,000 rows. Conversely, traditional database tools require technical IT setup and risk leaking confidential client data to third-party servers.

**LedgerDuck solves this by offering:**
1. **Zero-Knowledge Privacy**: 100% in-browser execution. No client data is ever transmitted over the network.
2. **Instant Ingestion**: Drag and drop multi-gigabyte CSVs or Excel spreadsheets and query millions of rows in milliseconds using DuckDB SQL.
3. **Pre-Built Audit Automation**: Built-in 1-click audit checks designed by accountants for accountants.

---

## 🔍 Key Audit Features

### 🛡️ 1. Ingestion Guardrails (Rectangular & Clean Data Check)
- **Merged Cell Rejection**: Scans Excel sheets on upload and rejects merged cells (`!merges`) with clear instructions to flatten the spreadsheet before processing.
- **Rectangular Uniformity**: Automatically checks for uniform column counts across every row, preventing misaligned debit/credit columns.
- **Header Sanitization**: Trims whitespace, cleans invalid characters, and resolves duplicate column headers.
- **Broad File Support**: `.xlsx`, `.xls` (legacy), `.csv`, `.parquet`, and DuckDB database files.

---

### 📋 2. Pre-Loaded Accounting Command Drawer
A dedicated right-hand audit panel featuring heuristic column detection (`Date`, `Particulars`, `Category`, `Amount`) and instant 1-click SQL audit templates:
- **Exact Duplicates**: Detects identical invoice references, dates, and amounts.
- **Potential Split Transactions**: Identifies multiple payments to the same vendor on the same date just below authorization thresholds (e.g. $4,950 x 2).
- **Round-Sum Audit**: Flags round dollar transfers ($\ge \$1,000$, $\$5,000$, $\$10,000$) indicative of manual journal entries or unapplied balances.
- **Materiality Outliers (Top 10)**: Surfaces the highest-value debit and credit postings for substantive sampling.
- **Weekend / Non-Business Day Bookings**: Detects journal entries booked on Saturdays and Sundays.

---

### 🔖 3. Profile-Based Query Manager
Organize recurring monthly and quarterly audit routines by account type:
- 💳 **Amex Card Statement**: FX markup analysis, weekend dining/travel review, recurring SaaS subscriptions.
- 🏦 **Bank Statements (HDFC / Chase)**: High-value debits (> $50k), bounce/penalty surcharges, round-sum wire transfers.
- 💵 **Petty Cash / Cash Sheets**: Missing voucher numbers, excess cash payouts over statutory limits.
- **Custom Profiles & JSON Sharing**: Create custom profiles and export/import `.json` query packs to standardize audit workflows across your audit team.

---

### 🔄 4. Continuous Query Insertion Engine
Avoid tab clutter by choosing how to execute queries:
- **"Insert in Active"**: Appends the query directly into the active script tab with clean header comments (`-- Audit Check: ...`) so you can chain your testing into a single audit workpaper.
- **"New Tab"**: Opens in an isolated query tab.
- **"Copy SQL"**: Copies query directly to your clipboard.

---

### 🔒 5. Zero-Knowledge Schema-to-Prompt Helper
- Need help writing complex SQL from an LLM (ChatGPT, Claude, Gemini)?
- The helper extracts **strictly structural metadata** (table name, column names, and data types) and formats a structured prompt.
- **Zero financial rows or balances are ever included**, giving you the power of AI assistance with complete data confidentiality.

---

### 📜 6. Audit Trail & Workpaper Export
- Automatically records every SQL query executed with ISO timestamp, local time, duration (ms), row count, and execution status.
- Dedicated **Audit Trail** tab with 1-click **Export Workpaper (CSV / JSON)** for workpaper documentation and compliance files.

---

### ⚡ 7. 1-Click Demo Ledger
- New to SQL? Click **"Load Sample Audit Ledger"** on the welcome page to provision a mock company general ledger pre-seeded with real-world fraud and error scenarios for hands-on exploration.

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/ledgerduck.git
cd ledgerduck

# 2. Install dependencies
npm install
# or: yarn

# 3. Start the local development server
npm run dev
# or: yarn dev
```

Open `http://localhost:5173` in your browser.

---

## 🛠️ Testing & Verification

```bash
# Run TypeScript typecheck
npm run typecheck

# Run full Jest unit test suite
npx jest
```

---

## 📜 License & Open Source Attribution

LedgerDuck is open-source software licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

### Upstream Attribution:
LedgerDuck is built upon the open-source foundation of **[PondPilot](https://github.com/pondpilot/pondpilot)** (AGPL-3.0) by T1A. We gratefully acknowledge the PondPilot team and the **[DuckDB-Wasm](https://github.com/duckdb/duckdb-wasm)** project for their browser database architecture.

---

<p align="center">
  Created with ❤️ by <a href="https://utharam.github.io/">Utharam</a>
</p>
