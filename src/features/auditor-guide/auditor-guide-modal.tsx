/**
 * Auditor User Guide & Documentation Modal for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showSuccess } from '@components/app-notifications';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Divider,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconBook,
  IconCheck,
  IconChecklist,
  IconCopy,
  IconDatabase,
  IconFileSpreadsheet,
  IconHistory,
  IconLockCheck,
  IconShieldCheck,
  IconSparkles,
} from '@tabler/icons-react';
import React from 'react';

interface AuditorGuideModalProps {
  opened: boolean;
  onClose: () => void;
}

export const AUDITOR_GUIDE_MARKDOWN = `# LedgerDuck - Auditor & Accountant User Guide

## What is LedgerDuck?
LedgerDuck is a 100% private, client-side SQL investigation workspace designed specifically for financial auditors, forensic accountants, and controllers. It runs an embedded DuckDB database engine directly inside your web browser.

## What LedgerDuck is NOT
- NOT a cloud database. Your sensitive financial data is NEVER uploaded to any cloud server or third-party database.
- NOT an online AI scraper. No row data, vendor names, bank balances, or transaction details ever leave your browser.

---

## Core Capabilities for Financial Audits

### 1. Ingestion Guardrails (Clean & Rectangular Data)
- **Supported Formats**: Excel (.xlsx, .xls) and CSV (.csv).
- **Merged Cell Rejection**: Merged cells corrupt accounting aggregations. LedgerDuck intercepts and rejects spreadsheets with merged cells with a clear alert ("Merged cells detected. Please flatten your spreadsheet.").
- **Rectangular Uniformity**: Validates that all data rows have a uniform number of columns (no ragged or jagged lines).
- **Automatic Header Sanitization**: Trims leading/trailing whitespace, cleans illegal special characters, resolves quotes, and deduplicates identical header names.

### 2. Pre-Loaded Accounting Command Drawer
Located in the left sidebar under "Audit Templates", this panel auto-detects your accounting columns (Date, Particulars, Category, Amount) and gives 1-click DuckDB SQL templates:
- **Exact Duplicates**: Detects potential duplicate billings or double payments with identical date, particulars, and amount.
- **Potential Split Transactions**: Flags same-day identical amounts across multiple entries (risk of smurfing or structuring transactions to bypass management approval thresholds).
- **Round-Sum Audit**: Identifies round-dollar transactions (e.g. $5,000, $50,000) that often signal subjective management estimates, manual journal overrides, or fictitious entries.
- **Outlier / Materiality Top 10**: Ranks top materiality items by absolute value for substantive audit sampling.
- **Weekend / Non-Business Day Bookings**: Catches journal entries or disbursements posted on Saturdays and Sundays.

### 3. Zero-Knowledge Schema-to-Prompt Helper
When you need a custom SQL query:
- Click the "AI Prompt Helper" button in the top navigation bar.
- LedgerDuck extracts ONLY the table structure (column names and data types). ZERO row records or transaction values are ever extracted.
- Click column pill badges to insert column names into your objective.
- Click "Copy Formatted Prompt" and paste it into ChatGPT, Claude, or Gemini.
- Paste the generated DuckDB SQL directly into a query tab in LedgerDuck.

### 4. Audit Trail & SQL Execution Log
- Every SQL query you execute is automatically recorded in a local session log with ISO timestamps, human-readable local time, execution duration (ms), row counts, and status (Success/Error).
- Access the "Audit Trail" tab from the tab bar.
- Re-run any past query with 1 click.
- Click "Export Workpaper (CSV)" or "Export JSON" to generate formal documentation for your audit workpapers and regulatory workfiles.

---
### Attribution & Licensing
LedgerDuck is licensed under AGPL-3.0 and is built upon PondPilot by T1A.`;

export const AuditorGuideModal: React.FC<AuditorGuideModalProps> = ({
  opened,
  onClose,
}) => {
  const clipboard = useClipboard({ timeout: 2500 });

  const handleCopyGuide = () => {
    clipboard.copy(AUDITOR_GUIDE_MARKDOWN);
    showSuccess({
      title: 'Guide Copied to Clipboard!',
      message: 'Full documentation copied. Paste it into ChatGPT, Claude, or Gemini to guide your SQL generation.',
      autoClose: 3500,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <ThemeIcon size="md" radius="sm" color="blue" variant="light">
            <IconBook size={18} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm" c="text-primary">
              LedgerDuck Auditor Guide & Documentation
            </Text>
            <Text size="xs" c="text-secondary">
              Zero-knowledge accounting investigation and SQL audit documentation
            </Text>
          </div>
        </Group>
      }
      size="xl"
      radius="md"
      centered
    >
      <ScrollArea.Autosize mah="75vh" offsetScrollbars>
        <Stack gap={16} className="pr-2 pb-2">
          {/* Privacy Guarantee Alert */}
          <Alert
            icon={<IconLockCheck size={20} />}
            title="100% Client-Side Privacy Guarantee"
            color="teal"
            variant="light"
            radius="sm"
          >
            <Text size="xs" c="teal.9">
              <strong>Your financial data never leaves your computer.</strong> All spreadsheet parsing, DuckDB SQL execution, and audit logging happen locally inside your browser memory.
            </Text>
          </Alert>

          {/* Quick Overview Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="blue" variant="light">
                  <IconFileSpreadsheet size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  1. Ingestion Guardrails
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Upload .xlsx, .xls, or .csv files. Rejects merged cells, enforces rectangular row consistency, and automatically sanitizes column titles.
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="orange" variant="light">
                  <IconChecklist size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  2. Accounting Command Drawer
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                1-Click DuckDB SQL templates for Exact Duplicates, Split Transactions, Round-Sum Fraud Risk, Materiality Outliers, and Weekend Bookings.
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="grape" variant="light">
                  <IconSparkles size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  3. Zero-Knowledge Prompt Helper
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Build structured prompts for ChatGPT/Claude/Gemini with clickable column pills. Extracts schema only (zero row data leaves your device).
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="teal" variant="light">
                  <IconHistory size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  4. Audit Trail & Workpaper Export
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Automatically logs every SQL query execution with timestamps, duration, and status. Export as CSV/JSON workpapers for audit files.
              </Text>
            </Card>
          </SimpleGrid>

          <Divider label="Audit Templates Explained" labelPosition="left" />

          {/* Audit Templates Details */}
          <Stack gap={10}>
            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="blue">Integrity</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Exact Duplicates
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Groups by Date, Description, and Amount to find entries with count &gt; 1. Catches double payments, duplicate vendor billings, and re-entry errors.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="orange">Fraud Risk</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Potential Split Transactions
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Identifies transactions on the same date with identical amounts. Used in forensic accounting to detect structuring (splitting large invoices into sub-$5,000 chunks to avoid executive signature thresholds).
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="red">Fraud Risk</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Round-Sum Audit (&gt;= $1,000)
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Filters entries where Amount has no decimals and absolute value &gt;= 1,000. In general ledgers, authentic operating expenses usually include cents/cents variance, while estimates and unauthorized draws are often round sums.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="violet">Materiality</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Outlier / High-Value Materiality Top 10
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Orders records by absolute magnitude for testing transactions exceeding your performance materiality threshold.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="teal">Compliance</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Weekend / Non-Business Day Bookings
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Uses DuckDB&apos;s <Code>DAYOFWEEK()</Code> to flag postings on Saturday and Sunday.
              </Text>
            </Box>
          </Stack>

          <Divider label="Credits & Attribution" labelPosition="left" />
          <Text size="xs" c="text-secondary">
            LedgerDuck is an open-source privacy-first fork built upon <strong>PondPilot</strong> by T1A under the AGPL-3.0 license.
          </Text>

          <Divider />

          {/* Action Buttons */}
          <Group justify="space-between" align="center">
            <Button
              size="xs"
              variant="outline"
              color="blue"
              leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              onClick={handleCopyGuide}
            >
              {clipboard.copied ? 'Guide Copied!' : 'Copy Full Documentation for AI'}
            </Button>

            <Button size="xs" variant="default" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
};
