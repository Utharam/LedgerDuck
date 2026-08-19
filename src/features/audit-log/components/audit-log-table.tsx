/**
 * Audit Log Table Component for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showSuccess } from '@components/app-notifications';
import { createSQLScript } from '@controllers/sql-script';
import { getOrCreateTabFromScript } from '@controllers/tab';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Modal,
  ScrollArea,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { AuditLogEntry } from '@models/audit-log';
import { useAuditLogStore } from '@store/audit-log-store';
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconFileSpreadsheet,
  IconPlayerPlay,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import React, { useMemo, useState } from 'react';

export const AuditLogTable: React.FC = () => {
  const entries = useAuditLogStore((state) => state.entries);
  const filter = useAuditLogStore((state) => state.filter);
  const setFilter = useAuditLogStore((state) => state.setFilter);
  const clearLog = useAuditLogStore((state) => state.clearLog);
  const exportToCsv = useAuditLogStore((state) => state.exportToCsv);
  const exportToJson = useAuditLogStore((state) => state.exportToJson);
  const clipboard = useClipboard({ timeout: 2000 });

  const [selectedEntryForDetails, setSelectedEntryForDetails] = useState<AuditLogEntry | null>(
    null,
  );
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      // Status filter
      if (filter.status === 'success' && entry.status !== 'success') return false;
      if (filter.status === 'error' && entry.status !== 'error') return false;

      // Search filter
      if (filter.searchQuery) {
        const q = filter.searchQuery.toLowerCase();
        const matchesSql = entry.executedSql.toLowerCase().includes(q);
        const matchesScript = (entry.scriptName || '').toLowerCase().includes(q);
        const matchesError = (entry.errorMessage || '').toLowerCase().includes(q);
        if (!matchesSql && !matchesScript && !matchesError) return false;
      }

      return true;
    });
  }, [entries, filter]);

  const handleReRun = (entry: AuditLogEntry) => {
    const script = createSQLScript(`rerun_${entry.scriptName || 'query'}`, entry.executedSql);
    getOrCreateTabFromScript(script, true);
    showSuccess({
      title: 'Query Loaded',
      message: 'Past audit query opened in a new script tab ready for execution.',
      autoClose: 2000,
    });
  };

  const handleCopySql = (sql: string) => {
    clipboard.copy(sql);
    showSuccess({
      title: 'SQL Copied',
      message: 'SQL statement copied to clipboard.',
      autoClose: 1500,
    });
  };

  return (
    <Stack gap={12} className="flex-1 overflow-hidden">
      {/* Controls Bar */}
      <Group justify="space-between" align="center" wrap="wrap" gap={8}>
        <Group gap={8} className="flex-1 max-w-md">
          <TextInput
            placeholder="Search executed SQL or script name..."
            size="xs"
            leftSection={<IconSearch size={14} />}
            value={filter.searchQuery}
            onChange={(e) => setFilter({ searchQuery: e.currentTarget.value })}
            className="flex-1"
          />
          <SegmentedControl
            size="xs"
            value={filter.status}
            onChange={(val) => setFilter({ status: val as any })}
            data={[
              { label: 'All', value: 'all' },
              { label: 'Success', value: 'success' },
              { label: 'Errors', value: 'error' },
            ]}
          />
        </Group>

        <Group gap={8}>
          <Button
            size="xs"
            variant="outline"
            color="blue"
            leftSection={<IconFileSpreadsheet size={14} />}
            onClick={exportToCsv}
            disabled={entries.length === 0}
          >
            Export Workpaper (CSV)
          </Button>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconDownload size={14} />}
            onClick={exportToJson}
            disabled={entries.length === 0}
          >
            Export JSON
          </Button>
          <Button
            size="xs"
            variant="subtle"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setConfirmClearOpen(true)}
            disabled={entries.length === 0}
          >
            Clear Log
          </Button>
        </Group>
      </Group>

      {/* Log Table */}
      <Card withBorder padding={0} radius="sm" className="flex-1 overflow-hidden flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border-borderPrimary-light dark:border-borderPrimary-dark">
        <ScrollArea className="h-full flex-1" offsetScrollbars>
          {filteredEntries.length === 0 ? (
            <Stack align="center" justify="center" p={40} gap={6}>
              <Text size="sm" fw={500} c="text-secondary">
                {entries.length === 0
                  ? 'No SQL queries executed in this session yet.'
                  : 'No queries match your search filter.'}
              </Text>
              <Text size="xs" c="text-tertiary">
                Every query executed in LedgerDuck is automatically timestamped and logged here for your audit workpapers.
              </Text>
            </Stack>
          ) : (
            <Table striped highlightOnHover withColumnBorders={false} className="text-xs">
              <Table.Thead className="sticky top-0 bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark z-10">
                <Table.Tr>
                  <Table.Th style={{ width: 170 }}>Timestamp</Table.Th>
                  <Table.Th style={{ width: 85 }}>Status</Table.Th>
                  <Table.Th style={{ width: 80 }}>Duration</Table.Th>
                  <Table.Th style={{ width: 120 }}>Script</Table.Th>
                  <Table.Th>Executed SQL Statement</Table.Th>
                  <Table.Th style={{ width: 110, textAlign: 'right' }}>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredEntries.map((entry) => (
                  <Table.Tr key={entry.id}>
                    <Table.Td>
                      <Tooltip label={entry.timestampIso} position="right" withArrow>
                        <Text size="xs" className="font-mono text-[11px] whitespace-nowrap">
                          {entry.timestampLocal}
                        </Text>
                      </Tooltip>
                    </Table.Td>

                    <Table.Td>
                      <Badge
                        size="xs"
                        variant="light"
                        color={entry.status === 'success' ? 'teal' : 'red'}
                      >
                        {entry.status === 'success' ? 'Success' : 'Error'}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" c="text-secondary" className="font-mono text-[11px]">
                        {entry.executionDurationMs} ms
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Text size="xs" fw={500} className="truncate max-w-[110px]" title={entry.scriptName}>
                        {entry.scriptName || 'query'}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Group gap={6} align="center" wrap="nowrap">
                        <Code
                          block={false}
                          className="text-[11px] font-mono truncate max-w-xl cursor-pointer hover:underline"
                          onClick={() => setSelectedEntryForDetails(entry)}
                        >
                          {entry.executedSql.replace(/[\n\r]+/g, ' ').slice(0, 120)}
                          {entry.executedSql.length > 120 ? '...' : ''}
                        </Code>
                      </Group>
                      {entry.errorMessage && (
                        <Text size="xs" c="red" className="truncate text-[10px] mt-0.5">
                          {entry.errorMessage}
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td style={{ textAlign: 'right' }}>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip label="Copy SQL">
                          <ActionIcon
                            size="xs"
                            variant="subtle"
                            color="gray"
                            onClick={() => handleCopySql(entry.executedSql)}
                          >
                            <IconCopy size={13} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Re-run Query">
                          <ActionIcon
                            size="xs"
                            variant="light"
                            color="blue"
                            onClick={() => handleReRun(entry)}
                          >
                            <IconPlayerPlay size={13} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </ScrollArea>
      </Card>

      {/* Query Detail Modal */}
      {selectedEntryForDetails && (
        <Modal
          opened={Boolean(selectedEntryForDetails)}
          onClose={() => setSelectedEntryForDetails(null)}
          title={
            <Group gap={8}>
              <Badge
                color={selectedEntryForDetails.status === 'success' ? 'teal' : 'red'}
                size="sm"
              >
                {selectedEntryForDetails.status.toUpperCase()}
              </Badge>
              <Text fw={600} size="sm">
                Execution Details ({selectedEntryForDetails.timestampLocal})
              </Text>
            </Group>
          }
          size="lg"
          radius="md"
        >
          <Stack gap={10}>
            <Group justify="space-between">
              <Text size="xs" c="text-secondary">
                Duration: <strong>{selectedEntryForDetails.executionDurationMs} ms</strong>
              </Text>
              <Text size="xs" c="text-secondary">
                Script: <strong>{selectedEntryForDetails.scriptName || 'query'}</strong>
              </Text>
            </Group>

            {selectedEntryForDetails.errorMessage && (
              <Card withBorder padding="xs" radius="sm" className="bg-red-500/10 border-red-500/30">
                <Text size="xs" fw={600} c="red">
                  Error Message:
                </Text>
                <Text size="xs" c="red" className="font-mono mt-1">
                  {selectedEntryForDetails.errorMessage}
                </Text>
              </Card>
            )}

            <div>
              <Text size="xs" fw={600} mb={4} c="text-secondary">
                Executed SQL Statement:
              </Text>
              <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
                <ScrollArea.Autosize mah={250}>
                  <Code block className="text-xs font-mono whitespace-pre-wrap">
                    {selectedEntryForDetails.executedSql}
                  </Code>
                </ScrollArea.Autosize>
              </Card>
            </div>

            <Group justify="flex-end" gap={8} mt={10}>
              <Button
                size="xs"
                variant="default"
                leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                onClick={() => handleCopySql(selectedEntryForDetails.executedSql)}
              >
                {clipboard.copied ? 'Copied' : 'Copy SQL'}
              </Button>
              <Button
                size="xs"
                color="blue"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={() => {
                  handleReRun(selectedEntryForDetails);
                  setSelectedEntryForDetails(null);
                }}
              >
                Open in Script Tab
              </Button>
            </Group>
          </Stack>
        </Modal>
      )}

      {/* Confirm Clear Modal */}
      <Modal
        opened={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        title="Clear Audit Trail Log"
        size="sm"
        radius="md"
        centered
      >
        <Stack gap={14}>
          <Text size="xs">
            Are you sure you want to clear your local audit trail log? This will remove all session query execution history.
          </Text>
          <Group justify="flex-end" gap={8}>
            <Button size="xs" variant="default" onClick={() => setConfirmClearOpen(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="red"
              onClick={() => {
                clearLog();
                setConfirmClearOpen(false);
              }}
            >
              Clear Log
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
