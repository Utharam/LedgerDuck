/**
 * Substantive Audit Test Card for LedgerDuck 2.0 Forensic Room
 * Displays 1-click test execution, inline findings preview, and workpaper actions.
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Code,
  Collapse,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { AuditColumnMapping, AuditTemplate } from '@models/audit-template';
import {
  IconAlertTriangle,
  IconCheck,
  IconCode,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { useState } from 'react';

import { SubstantiveTestResult } from '../types';

interface SubstantiveCardProps {
  template: AuditTemplate;
  tableName: string;
  mapping: AuditColumnMapping;
  result?: SubstantiveTestResult;
  onRunTest: () => void;
  onOpenInQueryRoom: () => void;
  onExportCsv: () => void;
}

export const SubstantiveCard = ({
  template,
  tableName,
  mapping,
  result,
  onRunTest,
  onOpenInQueryRoom,
  onExportCsv,
}: SubstantiveCardProps) => {
  const [showSql, setShowSql] = useState(false);
  const clipboard = useClipboard({ timeout: 2000 });

  const generatedSql = tableName ? template.generateSql(tableName, mapping) : '';
  const isRunning = result?.status === 'running';
  const hasRun = result?.status === 'success';
  const hasError = result?.status === 'error';
  const findingsCount = result?.findingsCount ?? 0;

  return (
    <Card
      withBorder
      padding="md"
      radius="md"
      className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark flex flex-col justify-between"
    >
      <Stack gap={10}>
        {/* Top bar: Category + Status Badge */}
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <Badge size="xs" color={template.badgeColor} variant="light">
              {template.category}
            </Badge>
            <Text size="sm" fw={700} c="text-primary" className="line-clamp-1">
              {template.title}
            </Text>
          </Group>

          <Group gap={6} wrap="nowrap">
            {isRunning && <Loader size={14} />}
            {hasRun && findingsCount > 0 && (
              <Badge size="xs" variant="filled" color="red" leftSection={<IconAlertTriangle size={11} />}>
                {findingsCount} Findings
              </Badge>
            )}
            {hasRun && findingsCount === 0 && (
              <Badge size="xs" variant="light" color="teal" leftSection={<IconCheck size={11} />}>
                No problems found
              </Badge>
            )}
            {hasError && (
              <Badge size="xs" variant="filled" color="orange">
                Error
              </Badge>
            )}

            <Tooltip label={showSql ? 'Hide SQL' : 'View SQL'}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setShowSql((prev) => !prev)}
                aria-label="Toggle SQL"
              >
                <IconCode size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Audit Objective Description */}
        <Text size="xs" c="text-secondary" className="leading-relaxed min-h-[36px]">
          {template.description}
        </Text>

        {/* SQL Preview Collapse */}
        <Collapse in={showSql}>
          <Box className="p-2 rounded bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border border-borderPrimary-light dark:border-borderPrimary-dark">
            <Group justify="space-between" mb={4}>
              <Text size="10px" fw={600} c="text-secondary">
                HOW THIS CHECK WORKS (SQL — OPTIONAL READING)
              </Text>
              <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy SQL'}>
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color={clipboard.copied ? 'teal' : 'gray'}
                  onClick={() => clipboard.copy(generatedSql)}
                >
                  {clipboard.copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                </ActionIcon>
              </Tooltip>
            </Group>
            <Code block className="text-[11px] font-mono whitespace-pre-wrap max-h-[140px] overflow-auto">
              {generatedSql}
            </Code>
          </Box>
        </Collapse>

        {/* Findings Preview Table */}
        {hasRun && findingsCount > 0 && result && result.sampleRows.length > 0 && (
          <Box className="rounded border border-borderPrimary-light dark:border-borderPrimary-dark overflow-hidden bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark">
            <Box className="px-2 py-1 bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-b border-borderPrimary-light dark:border-borderPrimary-dark">
              <Group justify="space-between">
                <Text size="10px" fw={600} c="text-secondary">
                  ROWS THAT NEED REVIEW (SHOWING {result.sampleRows.length} OF {findingsCount})
                </Text>
                {result.executionTimeMs !== undefined && (
                  <Text size="10px" c="text-secondary">
                    {result.executionTimeMs}ms
                  </Text>
                )}
              </Group>
            </Box>
            <ScrollArea.Autosize mah={160} offsetScrollbars>
              <Table striped highlightOnHover withTableBorder={false} fz="11px" className="font-mono">
                <Table.Thead>
                  <Table.Tr>
                    {result.columns.slice(0, 4).map((col) => (
                      <Table.Th key={col} className="text-[10px] uppercase text-textSecondary-light dark:text-textSecondary-dark">
                        {col}
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.sampleRows.map((row, idx) => (
                    <Table.Tr key={idx}>
                      {result.columns.slice(0, 4).map((col) => (
                        <Table.Td key={col} className="max-w-[140px] truncate">
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </Box>
        )}

        {/* Error message */}
        {hasError && result?.errorMessage && (
          <Box className="p-2 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <Text size="xs" c="red">
              {result.errorMessage}
            </Text>
          </Box>
        )}
      </Stack>

      {/* Footer Actions */}
      <Group justify="space-between" mt={12} pt={8} className="border-t border-borderPrimary-light dark:border-borderPrimary-dark">
        <Button
          size="xs"
          variant="filled"
          color="blue"
          leftSection={<IconPlayerPlay size={13} />}
          onClick={onRunTest}
          loading={isRunning}
          disabled={!tableName}
        >
          {hasRun ? 'Re-run Check' : 'Run Check'}
        </Button>

        <Group gap={6}>
          <Tooltip label="Open in Query Room (SQL Editor) for deep analysis">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconExternalLink size={13} />}
              onClick={onOpenInQueryRoom}
              disabled={!tableName}
            >
              Query Room
            </Button>
          </Tooltip>

          {hasRun && findingsCount > 0 && (
            <Tooltip label="Download these rows as a CSV record for your files">
              <Button
                size="xs"
                variant="light"
                color="red"
                leftSection={<IconDownload size={13} />}
                onClick={onExportCsv}
              >
                Save rows (CSV)
              </Button>
            </Tooltip>
          )}
        </Group>
      </Group>
    </Card>
  );
};
