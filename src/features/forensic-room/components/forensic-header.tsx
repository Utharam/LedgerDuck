/**
 * Forensic Header Component for LedgerDuck 2.0
 * Includes table selector, column mapping indicators, dataset shape stats,
 * and batch audit actions.
 * Licensed under AGPL-3.0
 */

import { useDuckDBConnectionPool } from '@features/duckdb-context/duckdb-context';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AuditColumnMapping } from '@models/audit-template';
import {
  IconAdjustments,
  IconDownload,
  IconPlayerPlay,
  IconShieldCheck,
} from '@tabler/icons-react';
import { buildDatasetProfileSql } from '@utils/vocabulary';
import { useEffect, useState } from 'react';

interface ForensicHeaderProps {
  tables: string[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  columns: string[];
  mapping: AuditColumnMapping;
  onUpdateMapping: (updated: Partial<AuditColumnMapping>) => void;
  onRunAllTests: () => void;
  isBatchRunning: boolean;
  totalAnomalies: number;
  onExportPackage: () => void;
}

interface DatasetStats {
  rowCount: number;
  distinctParticulars: number;
  emptyParticulars: number;
  distinctLedgers: number;
  nullAmounts: number;
}

export const ForensicHeader = ({
  tables,
  selectedTable,
  onSelectTable,
  columns,
  mapping,
  onUpdateMapping,
  onRunAllTests,
  isBatchRunning,
  totalAnomalies,
  onExportPackage,
}: ForensicHeaderProps) => {
  const pool = useDuckDBConnectionPool();
  const [mappingModalOpened, { open: openMappingModal, close: closeMappingModal }] =
    useDisclosure(false);
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Compute profile stats when table or mapping changes
  useEffect(() => {
    if (!pool || !selectedTable) {
      setStats(null);
      return;
    }

    let cancelled = false;
    setStatsLoading(true);

    (async () => {
      try {
        const sql = buildDatasetProfileSql(selectedTable, {
          particularsColumn: mapping.particularsColumn,
          categoryColumn: mapping.categoryColumn,
          amountColumn: mapping.amountColumn,
        });

        const result = await pool.query(sql);
        if (cancelled) return;

        const rows = result.toArray();
        if (rows.length > 0) {
          const r = rows[0];
          setStats({
            rowCount: Number(r.row_count ?? 0),
            distinctParticulars: Number(r.distinct_particulars ?? 0),
            emptyParticulars: Number(r.empty_particulars ?? 0),
            distinctLedgers: Number(r.distinct_ledgers ?? 0),
            nullAmounts: Number(r.null_amounts ?? 0),
          });
        }
      } catch (err) {
        console.warn('Failed to load dataset profile stats:', err);
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pool, selectedTable, mapping.particularsColumn, mapping.categoryColumn, mapping.amountColumn]);

  const columnOptions = columns.map((c) => ({ value: c, label: c }));

  return (
    <>
      {/* Column Mapping Modal */}
      <Modal
        opened={mappingModalOpened}
        onClose={closeMappingModal}
        title={
          <Group gap={8}>
            <ThemeIcon size={24} color="blue" variant="light" radius="sm">
              <IconAdjustments size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Configure Audit Column Mapping
            </Text>
          </Group>
        }
        size="sm"
        radius="md"
      >
        <Stack gap={12}>
          <Text size="xs" c="text-secondary">
            Map your ledger columns to standardize substantive audit tests.
          </Text>

          <Select
            label="Date Column"
            description="Entry booking or invoice date"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.dateColumn}
            onChange={(val) => onUpdateMapping({ dateColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Particulars / Narration"
            description="Transaction description, payee, or memo"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.particularsColumn}
            onChange={(val) => onUpdateMapping({ particularsColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Category / Ledger Head"
            description="GL account code, expense head, or category"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.categoryColumn}
            onChange={(val) => onUpdateMapping({ categoryColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Amount Column"
            description="Transaction amount or net value"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.amountColumn}
            onChange={(val) => onUpdateMapping({ amountColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Button size="xs" onClick={closeMappingModal} fullWidth mt={8}>
            Save & Close
          </Button>
        </Stack>
      </Modal>

      {/* Main Header Bar */}
      <Box className="border-b px-4 py-3 bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark">
        <Group justify="space-between" align="center" wrap="wrap" gap={12}>
          {/* Left: Table selector + mapping */}
          <Group gap={12} align="center" wrap="wrap">
            <Group gap={8} align="center">
              <ThemeIcon size={32} radius="md" color="blue" variant="light">
                <IconShieldCheck size={18} />
              </ThemeIcon>
              <Stack gap={0}>
                <Group gap={6} align="center">
                  <Text size="sm" fw={700} c="text-primary">
                    Forensic Laboratory
                  </Text>
                  <Badge size="xs" variant="light" color="blue">
                    Substantive Testing
                  </Badge>
                </Group>
                <Text size="11px" c="text-secondary">
                  Automated substantive tests, anomaly detection & workpapers
                </Text>
              </Stack>
            </Group>

            {/* Table Selector */}
            <Select
              size="xs"
              placeholder="Select your Excel sheet"
              data={tables.map((t) => ({ value: t, label: t }))}
              value={selectedTable}
              onChange={(val) => onSelectTable(val || '')}
              searchable
              clearable={false}
              className="min-w-[200px]"
            />

            {/* Column Mapping Badges */}
            <Group gap={6} align="center" wrap="nowrap">
              <Tooltip label="Description column (Narration / Particulars)">
                <Badge
                  size="xs"
                  variant="light"
                  color={mapping.particularsColumn ? 'blue' : 'gray'}
                  radius="sm"
                >
                  Description: {mapping.particularsColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Ledger Head column (Account Head / Category)">
                <Badge
                  size="xs"
                  variant="light"
                  color={mapping.categoryColumn ? 'teal' : 'gray'}
                  radius="sm"
                >
                  Ledger Head: {mapping.categoryColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Amount column">
                <Badge
                  size="xs"
                  variant="light"
                  color={mapping.amountColumn ? 'violet' : 'gray'}
                  radius="sm"
                >
                  Amount: {mapping.amountColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Date column">
                <Badge
                  size="xs"
                  variant="light"
                  color={mapping.dateColumn ? 'cyan' : 'gray'}
                  radius="sm"
                >
                  Date: {mapping.dateColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Edit column mappings">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={openMappingModal}
                  aria-label="Edit Columns"
                >
                  <IconAdjustments size={14} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Right: Quick Stats & Batch Actions */}
          <Group gap={12} align="center" wrap="wrap">
            {/* Quick Stats */}
            {statsLoading && <Loader size="xs" />}
            {!statsLoading && stats && (
              <Group gap={8} align="center">
                <Tooltip label="Total vouchers / rows scanned">
                  <Badge size="xs" variant="light" color="gray" radius="sm">
                    {stats.rowCount.toLocaleString()} rows
                  </Badge>
                </Tooltip>
                {stats.distinctLedgers > 0 && (
                  <Tooltip label="Distinct ledger heads">
                    <Badge size="xs" variant="light" color="gray" radius="sm">
                      {stats.distinctLedgers.toLocaleString()} ledgers
                    </Badge>
                  </Tooltip>
                )}
                {stats.emptyParticulars > 0 && (
                  <Tooltip label="Vouchers with missing or blank narration">
                    <Badge size="xs" variant="filled" color="red" radius="sm">
                      {stats.emptyParticulars} blank narrations
                    </Badge>
                  </Tooltip>
                )}
                {totalAnomalies > 0 && (
                  <Tooltip label="Total substantive findings identified">
                    <Badge size="xs" variant="filled" color="orange" radius="sm">
                      {totalAnomalies} findings detected
                    </Badge>
                  </Tooltip>
                )}
              </Group>
            )}

            {/* Run All Tests Button */}
            <Tooltip label="Runs every check on your sheet and counts rows that need review">
              <Button
                size="xs"
                variant="filled"
                color="blue"
                leftSection={
                  isBatchRunning ? <Loader size={12} color="white" /> : <IconPlayerPlay size={13} />
                }
                onClick={onRunAllTests}
                disabled={!selectedTable || isBatchRunning}
              >
                Run all checks
              </Button>
            </Tooltip>

            {/* Export Audit Package */}
            <Tooltip label="Download a CSV summary of every check result for your files">
              <Button
                size="xs"
                variant="light"
                color="gray"
                leftSection={<IconDownload size={13} />}
                onClick={onExportPackage}
                disabled={!selectedTable}
              >
                Save summary (CSV)
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Box>
    </>
  );
};
