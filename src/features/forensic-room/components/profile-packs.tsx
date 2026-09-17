/**
 * Audit Profile Query Packs for LedgerDuck 2.0 Forensic Room
 * Pre-packaged investigation routines for specific accounting sources.
 * Licensed under AGPL-3.0
 */

import {
  Badge,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { AuditColumnMapping } from '@models/audit-template';
import {
  IconBuildingBank,
  IconCreditCard,
  IconFileInvoice,
  IconReceipt,
  IconSparkles,
} from '@tabler/icons-react';
import { toDuckDBTableIdentifier } from '@utils/audit-templates';
import { toDuckDBIdentifier } from '@utils/duckdb/identifier';

import { AuditProfilePack } from '../types';

interface ProfilePacksProps {
  tableName: string;
  mapping: AuditColumnMapping;
  onOpenQuery: (sql: string, title: string, scriptName: string) => void;
}

export const PROFILE_PACKS: AuditProfilePack[] = [
  {
    id: 'bank-statement',
    title: 'Bank Feed & Statement Scrutiny',
    badge: 'Bank Audit',
    badgeColor: 'teal',
    description: 'Scrutinizes bank transaction feeds for charges, reversals, and interest credits.',
    bestFor: 'Checking / Current Bank Accounts, Wire Transfer Logs',
    checks: ['Exact Duplicates', 'Round-Sum Audit', 'Weekend Bookings'],
    customQueryTitle: 'Bank Charges & Reversals Scrutiny',
    customQuerySql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');
      return `SELECT *\nFROM ${t}\nWHERE regexp_matches(lower(CAST(${p} AS VARCHAR)), '(charge|fee|penalt|interest|revers|bounce|tax|gst|tds)')\nORDER BY ABS(${a}) DESC;`;
    },
  },
  {
    id: 'corporate-card',
    title: 'Corporate Credit Card / Amex Audit',
    badge: 'T&E Cards',
    badgeColor: 'indigo',
    description: 'Pinpoints weekend swipes, duplicate card authorizations, and high-value dining/travel.',
    bestFor: 'Amex, Visa Corporate, Executive Card Statements',
    checks: ['Weekend Bookings', 'Potential Split Transactions', 'Outlier Materiality'],
    customQueryTitle: 'Weekend & Off-Hours Card Swipes',
    customQuerySql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const d = toDuckDBIdentifier(mapping.dateColumn || 'date');
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');
      return `SELECT ${d}, ${p}, ${a}, DAYNAME(TRY_CAST(${d} AS DATE)) AS day_of_week\nFROM ${t}\nWHERE DAYOFWEEK(TRY_CAST(${d} AS DATE)) IN (1, 7)\nORDER BY ABS(${a}) DESC;`;
    },
  },
  {
    id: 'petty-cash',
    title: 'Petty Cash Book Scrutiny',
    badge: 'Cash Audit',
    badgeColor: 'orange',
    description: 'Audits petty cash vouchers for split disbursements, missing remarks, and repetitive sums.',
    bestFor: 'Imprest Cash Books, Branch Petty Cash Ledgers',
    checks: ['Round-Sum Audit', 'Potential Split Transactions', 'Exact Duplicates'],
    customQueryTitle: 'Petty Cash Splitting & Round Sums',
    customQuerySql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');
      return `SELECT ${p}, ${a}\nFROM ${t}\nWHERE CAST(${a} AS BIGINT) = ${a}\n  AND ${a} > 0\nORDER BY ${a} DESC;`;
    },
  },
  {
    id: 'vendor-payables',
    title: 'Vendor Payables & Invoicing Integrity',
    badge: 'AP Audit',
    badgeColor: 'violet',
    description: 'Detects duplicate invoice amounts on identical dates and vendor payment anomalies.',
    bestFor: 'Accounts Payable Ledger, Vendor Invoice Register',
    checks: ['Exact Duplicates', 'Potential Split Transactions', 'Outlier Materiality'],
    customQueryTitle: 'Duplicate Vendor Payments Scrutiny',
    customQuerySql: (tableName, mapping) => {
      const t = toDuckDBTableIdentifier(tableName);
      const d = toDuckDBIdentifier(mapping.dateColumn || 'date');
      const a = toDuckDBIdentifier(mapping.amountColumn || 'amount');
      const p = toDuckDBIdentifier(mapping.particularsColumn || 'particulars');
      return `SELECT ${d}, ${p}, ${a}, COUNT(*) AS duplicate_count\nFROM ${t}\nGROUP BY ${d}, ${p}, ${a}\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC, ${a} DESC;`;
    },
  },
];

const PACK_ICONS: Record<string, any> = {
  'bank-statement': IconBuildingBank,
  'corporate-card': IconCreditCard,
  'petty-cash': IconReceipt,
  'vendor-payables': IconFileInvoice,
};

export const ProfilePacks = ({ tableName, mapping, onOpenQuery }: ProfilePacksProps) => {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {PROFILE_PACKS.map((pack) => {
        const IconComponent = PACK_ICONS[pack.id] || IconSparkles;
        const canRun = Boolean(tableName);

        return (
          <Card
            key={pack.id}
            withBorder
            padding="md"
            radius="md"
            className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark flex flex-col justify-between"
          >
            <Stack gap={10}>
              <Group justify="space-between" align="center">
                <Group gap={8}>
                  <ThemeIcon size={28} radius="sm" color={pack.badgeColor} variant="light">
                    <IconComponent size={16} />
                  </ThemeIcon>
                  <Text size="sm" fw={700} c="text-primary">
                    {pack.title}
                  </Text>
                </Group>
                <Badge size="xs" color={pack.badgeColor} variant="light">
                  {pack.badge}
                </Badge>
              </Group>

              <Text size="xs" c="text-secondary" className="leading-relaxed">
                {pack.description}
              </Text>

              <Group gap={6} align="center">
                <Text size="11px" fw={600} c="text-secondary">
                  Runs these checks:
                </Text>
                {pack.checks.map((check) => (
                  <Badge key={check} size="xs" variant="outline" color="gray">
                    {check}
                  </Badge>
                ))}
              </Group>
            </Stack>

            <Group justify="space-between" mt={14} pt={10} className="border-t border-borderPrimary-light dark:border-borderPrimary-dark">
              <Text size="10px" c="text-secondary" className="font-mono">
                {pack.bestFor}
              </Text>
              <Button
                size="xs"
                variant="light"
                color={pack.badgeColor}
                disabled={!canRun || !pack.customQuerySql}
                onClick={() => {
                  if (pack.customQuerySql) {
                    const sql = pack.customQuerySql(tableName, mapping);
                    onOpenQuery(
                      sql,
                      pack.customQueryTitle || pack.title,
                      `pack_${pack.id}`,
                    );
                  }
                }}
              >
                Open Pack Query
              </Button>
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  );
};
