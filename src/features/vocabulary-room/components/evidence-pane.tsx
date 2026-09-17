/**
 * Pane 3: Transaction Evidence Pane for LedgerDuck 2.0 Vocabulary Map
 * Displays exact voucher rows matching the selected keyword and/or ledger head.
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconDownload,
  IconExternalLink,
  IconInfoCircle,
  IconTable,
} from '@tabler/icons-react';
import { useMemo } from 'react';

interface EvidencePaneProps {
  tableName: string;
  word: string;
  ledgerFilter: string;
  columns: string[];
  rows: Record<string, any>[];
  dateCol?: string;
  particularsCol?: string;
  categoryCol?: string;
  amountCol?: string;
  onOpenInQueryRoom: () => void;
  onExportWorkpaper: () => void;
  isLoading: boolean;
}

export const EvidencePane = ({
  tableName,
  word,
  ledgerFilter,
  columns,
  rows,
  dateCol,
  particularsCol,
  categoryCol,
  amountCol,
  onOpenInQueryRoom,
  onExportWorkpaper,
  isLoading,
}: EvidencePaneProps) => {
  // Sort columns so key accounting fields appear first
  const displayColumns = useMemo(() => {
    const priority = [dateCol, particularsCol, categoryCol, amountCol].filter(Boolean) as string[];
    const others = columns.filter((c) => !priority.includes(c));
    return [...priority, ...others];
  }, [columns, dateCol, particularsCol, categoryCol, amountCol]);

  // True once the user has picked something to look at (a word and/or a ledger head).
  const hasActiveSelection = Boolean(word || (ledgerFilter && ledgerFilter !== 'ALL'));

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark overflow-hidden">
      {/* Top Evidence Toolbar */}
      <Box className="p-3 border-b bg-backgroundSecondary-light/60 dark:bg-backgroundSecondary-dark/60 border-borderPrimary-light dark:border-borderPrimary-dark shrink-0">
        <Group justify="space-between" align="center" wrap="wrap" gap={8}>
          <Group gap={8} align="center">
            <Text size="xs" fw={700} c="text-primary" className="uppercase tracking-wider">
              3. Voucher Evidence ({rows.length})
            </Text>
            {word && (
              <Badge size="xs" variant="light" color="blue">
                {`Word: "${word}"`}
              </Badge>
            )}
            {ledgerFilter && ledgerFilter !== 'ALL' && (
              <Badge size="xs" variant="light" color="teal">
                {`Ledger: "${ledgerFilter}"`}
              </Badge>
            )}
            <Tooltip
              label="These are the actual rows from your sheet. Save them as a CSV record if you need them for your files."
              position="bottom"
              multiline
              w={220}
            >
              <ActionIcon size="xs" variant="transparent" color="gray" aria-label="What is this">
                <IconInfoCircle size={13} />
              </ActionIcon>
            </Tooltip>
            {isLoading && <Loader size={12} />}
          </Group>

          <Group gap={6}>
            <Tooltip label="Open evidence query in Query Room (SQL Editor)">
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                leftSection={<IconExternalLink size={13} />}
                onClick={onOpenInQueryRoom}
                disabled={!tableName || (!word && (!ledgerFilter || ledgerFilter === 'ALL'))}
              >
                Query Room
              </Button>
            </Tooltip>

            <Tooltip label="Download evidence rows as formatted CSV workpaper">
              <Button
                size="xs"
                variant="light"
                color="blue"
                leftSection={<IconDownload size={13} />}
                onClick={onExportWorkpaper}
                disabled={rows.length === 0}
              >
                Export Workpaper
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Box>

      {/* Evidence Table Area */}
      <Box className="flex-1 overflow-hidden relative">
        {rows.length === 0 && !isLoading && (
          <Box className="h-full flex items-center justify-center p-6 text-center">
            <Stack gap={6} align="center" maw={380}>
              <ThemeIcon size={40} color="gray" variant="light" radius="xl">
                <IconTable size={20} />
              </ThemeIcon>
              {hasActiveSelection ? (
                <>
                  <Text size="sm" fw={600} c="text-primary">
                    No rows match this combination
                  </Text>
                  <Text size="xs" c="text-secondary">
                    Nothing in your sheet pairs {word ? `"${word}"` : 'this word'} with{' '}
                    {ledgerFilter && ledgerFilter !== 'ALL'
                      ? `"${ledgerFilter}"`
                      : 'the selected head'}
                    . Clear the ledger filter in the middle pane or pick another word.
                  </Text>
                </>
              ) : (
                <>
                  <Text size="sm" fw={600} c="text-primary">
                    No Transaction Evidence Selected
                  </Text>
                  <Text size="xs" c="text-secondary">
                    Pick a word on the left. The middle shows where it was posted — tap a ledger
                    head there to narrow these rows down.
                  </Text>
                </>
              )}
            </Stack>
          </Box>
        )}

        {rows.length > 0 && (
          <ScrollArea className="h-full w-full" offsetScrollbars>
            <Table striped highlightOnHover withTableBorder={false} fz="11px" className="font-mono">
              <Table.Thead className="sticky top-0 z-10 bg-backgroundSecondary-light/90 dark:bg-backgroundSecondary-dark/90 backdrop-blur border-b border-borderPrimary-light dark:border-borderPrimary-dark">
                <Table.Tr>
                  <Table.Th className="text-[10px] w-12 text-center text-secondary">#</Table.Th>
                  {displayColumns.map((col) => (
                    <Table.Th
                      key={col}
                      className={`text-[10px] uppercase whitespace-nowrap ${
                        col === dateCol
                          ? 'text-cyan-600 dark:text-cyan-400'
                          : col === particularsCol
                          ? 'text-blue-600 dark:text-blue-400'
                          : col === categoryCol
                          ? 'text-teal-600 dark:text-teal-400'
                          : col === amountCol
                          ? 'text-right text-violet-600 dark:text-violet-400'
                          : 'text-textSecondary-light dark:text-textSecondary-dark'
                      }`}
                    >
                      {col}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td className="text-center text-[10px] text-secondary">{idx + 1}</Table.Td>
                    {displayColumns.map((col) => {
                      const val = row[col];
                      const isAmount = col === amountCol;
                      const formatted =
                        val !== null && val !== undefined
                          ? isAmount && typeof val === 'number'
                            ? val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : String(val)
                          : '-';

                      return (
                        <Table.Td
                          key={col}
                          className={`max-w-[240px] truncate whitespace-nowrap ${
                            isAmount ? 'text-right font-semibold' : ''
                          }`}
                        >
                          {formatted}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Box>
    </Box>
  );
};
