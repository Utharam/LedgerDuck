/**
 * Pane 1: Keywords & Categories Pane for LedgerDuck 2.0 Vocabulary Map
 * Lists tokens, ledger buckets, or multi-classified entries with instant filtering.
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
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react';
import { VariantCandidate } from '@utils/vocabulary';
import { useMemo, useState } from 'react';

import {
  InvestigationMode,
  LedgerBucket,
  MultiClassificationItem,
  VocabToken,
} from '../types';

interface KeywordsPaneProps {
  mode: InvestigationMode;
  tokens: VocabToken[];
  buckets: LedgerBucket[];
  multiItems: MultiClassificationItem[];
  variants: VariantCandidate[];
  selectedWord: string;
  onSelectWord: (word: string) => void;
  selectedLedger: string;
  onSelectLedger: (ledger: string) => void;
  selectedMultiItem: MultiClassificationItem | null;
  onSelectMultiItem: (item: MultiClassificationItem) => void;
  selectedVariant: VariantCandidate | null;
  onSelectVariant: (variant: VariantCandidate) => void;
  isLoading: boolean;
}

export const KeywordsPane = ({
  mode,
  tokens,
  buckets,
  multiItems,
  variants,
  selectedWord,
  onSelectWord,
  selectedLedger,
  onSelectLedger,
  selectedMultiItem,
  onSelectMultiItem,
  selectedVariant,
  onSelectVariant,
  isLoading,
}: KeywordsPaneProps) => {
  const [filterText, setFilterText] = useState('');

  // Filter lists based on user search
  const filteredTokens = useMemo(() => {
    if (!filterText.trim()) return tokens;
    const q = filterText.toLowerCase();
    return tokens.filter((t) => t.word.toLowerCase().includes(q));
  }, [tokens, filterText]);

  const filteredBuckets = useMemo(() => {
    if (!filterText.trim()) return buckets;
    const q = filterText.toLowerCase();
    return buckets.filter((b) => b.ledger.toLowerCase().includes(q));
  }, [buckets, filterText]);

  const filteredMultiItems = useMemo(() => {
    if (!filterText.trim()) return multiItems;
    const q = filterText.toLowerCase();
    return multiItems.filter(
      (m) =>
        m.narration.toLowerCase().includes(q) ||
        m.ledgers_used.toLowerCase().includes(q),
    );
  }, [multiItems, filterText]);

  const filteredVariants = useMemo(() => {
    if (!filterText.trim()) return variants;
    const q = filterText.toLowerCase();
    return variants.filter((v) => v.a.includes(q) || v.b.includes(q));
  }, [variants, filterText]);

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border-r border-borderPrimary-light dark:border-borderPrimary-dark overflow-hidden">
      {/* Pane Title & Search */}
      <Box className="p-3 border-b bg-backgroundSecondary-light/60 dark:bg-backgroundSecondary-dark/60 border-borderPrimary-light dark:border-borderPrimary-dark shrink-0">
        <Group justify="space-between" align="center" mb={8}>
          <Group gap={4} align="center" wrap="nowrap">
            <Text size="xs" fw={700} c="text-primary" className="uppercase tracking-wider">
              {mode === 'forward' && `1. Words found (${tokens.length})`}
              {mode === 'reverse' && `1. Ledger heads (${buckets.length})`}
              {mode === 'multi-classification' && `1. Posted to 2+ heads (${multiItems.length})`}
              {mode === 'variants' && `1. Possible spelling pairs (${variants.length})`}
            </Text>
            <Tooltip
              label="Pick an item. The middle shows where it was posted; the right shows the actual rows."
              position="bottom"
              multiline
              w={220}
            >
              <ActionIcon size="xs" variant="transparent" color="gray" aria-label="What to do here">
                <IconInfoCircle size={13} />
              </ActionIcon>
            </Tooltip>
          </Group>
          {isLoading && <Loader size={12} />}
        </Group>

        <TextInput
          size="xs"
          radius="md"
          placeholder={
            mode === 'forward'
              ? 'Filter words (e.g. taxi)...'
              : mode === 'reverse'
              ? 'Filter ledgers...'
              : mode === 'multi-classification'
              ? 'Filter payees/narrations...'
              : 'Filter variants...'
          }
          value={filterText}
          onChange={(e) => setFilterText(e.currentTarget.value)}
          rightSection={
            filterText ? (
              <ActionIcon size="xs" variant="subtle" onClick={() => setFilterText('')}>
                <IconX size={12} />
              </ActionIcon>
            ) : null
          }
        />
      </Box>

      {/* Pane Content List */}
      <ScrollArea className="flex-1" offsetScrollbars>
        <Stack gap={1} p={4}>
          {/* Forward Mode: Tokens */}
          {mode === 'forward' &&
            filteredTokens.map((item) => {
              const isSelected = selectedWord.toLowerCase() === item.word.toLowerCase();
              return (
                <UnstyledButton
                  key={item.word}
                  onClick={() => onSelectWord(item.word)}
                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 ring-1 ring-inset ring-blue-200 dark:ring-blue-800 font-medium'
                      : 'hover:bg-backgroundSecondary-light dark:hover:bg-backgroundSecondary-dark'
                  }`}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" className="truncate" c={isSelected ? 'blue' : 'text-primary'}>
                      {item.word}
                    </Text>
                    <Group gap={4} wrap="nowrap">
                      <Badge
                        size="xs"
                        variant="light"
                        color={isSelected ? 'blue' : 'gray'}
                        className="tabular-nums"
                      >
                        {item.occurrences}
                      </Badge>
                      {item.pct_rows > 0 && (
                        <Text size="10px" c="text-secondary" className="font-mono tabular-nums">
                          {item.pct_rows}%
                        </Text>
                      )}
                    </Group>
                  </Group>
                </UnstyledButton>
              );
            })}

          {/* Reverse Mode: Ledger Buckets */}
          {mode === 'reverse' &&
            filteredBuckets.map((item) => {
              const isSelected = selectedLedger === item.ledger;
              return (
                <UnstyledButton
                  key={item.ledger}
                  onClick={() => onSelectLedger(item.ledger)}
                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/50 ring-1 ring-inset ring-teal-200 dark:ring-teal-800 font-medium'
                      : 'hover:bg-backgroundSecondary-light dark:hover:bg-backgroundSecondary-dark'
                  }`}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" className="truncate" c={isSelected ? 'teal' : 'text-primary'}>
                      {item.ledger || '<Blank / Null>'}
                    </Text>
                    <Badge
                      size="xs"
                      variant="light"
                      color={isSelected ? 'teal' : 'gray'}
                      className="tabular-nums"
                    >
                      {item.n_rows} rows
                    </Badge>
                  </Group>
                </UnstyledButton>
              );
            })}

          {/* Multi-Classification Mode */}
          {mode === 'multi-classification' &&
            filteredMultiItems.map((item) => {
              const isSelected = selectedMultiItem?.narration === item.narration;
              return (
                <UnstyledButton
                  key={item.narration}
                  onClick={() => onSelectMultiItem(item)}
                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-amber-50 dark:bg-amber-950/50 ring-1 ring-inset ring-amber-200 dark:ring-amber-800 font-medium'
                      : 'hover:bg-backgroundSecondary-light dark:hover:bg-backgroundSecondary-dark'
                  }`}
                >
                  <Stack gap={2}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" className="truncate" c={isSelected ? 'orange' : 'text-primary'}>
                        {item.narration}
                      </Text>
                      <Badge
                        size="xs"
                        variant="light"
                        color="red"
                        leftSection={<IconAlertTriangle size={10} />}
                        className="tabular-nums"
                      >
                        {item.distinct_ledgers} ledgers
                      </Badge>
                    </Group>
                    <Text size="10px" c="text-secondary" className="truncate">
                      {item.ledgers_used}
                    </Text>
                  </Stack>
                </UnstyledButton>
              );
            })}

          {/* Spelling Variants Mode */}
          {mode === 'variants' &&
            filteredVariants.map((item, idx) => {
              const isSelected = selectedVariant?.a === item.a && selectedVariant?.b === item.b;
              return (
                <UnstyledButton
                  key={idx}
                  onClick={() => onSelectVariant(item)}
                  className={`w-full px-3 py-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 ring-1 ring-inset ring-indigo-200 dark:ring-indigo-800 font-medium'
                      : 'hover:bg-backgroundSecondary-light dark:hover:bg-backgroundSecondary-dark'
                  }`}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Text size="xs" className="truncate">
                      <span className="font-semibold">{item.a}</span>
                      <span className="text-secondary mx-1">?</span>
                      <span>{item.b}</span>
                    </Text>
                    <Badge size="xs" variant="light" color="indigo">
                      {Math.round(item.similarity * 100)}%
                    </Badge>
                  </Group>
                </UnstyledButton>
              );
            })}

          {!isLoading &&
            ((mode === 'forward' && filteredTokens.length === 0) ||
              (mode === 'reverse' && filteredBuckets.length === 0) ||
              (mode === 'multi-classification' && filteredMultiItems.length === 0) ||
              (mode === 'variants' && filteredVariants.length === 0)) && (
              <Box p={12} className="text-center">
                {(() => {
                  const sourceCount =
                    mode === 'forward'
                      ? tokens.length
                      : mode === 'reverse'
                        ? buckets.length
                        : mode === 'multi-classification'
                          ? multiItems.length
                          : variants.length;
                  const hasFilter = filterText.trim().length > 0;
                  if (sourceCount === 0 && !hasFilter) {
                    return (
                      <Stack gap={4} align="center">
                        <Text size="xs" fw={600} c="text-primary">
                          Nothing extracted yet
                        </Text>
                        <Text size="xs" c="text-secondary" className="leading-relaxed">
                          Open a sheet, match your Description column above, then press the refresh
                          button. If this persists, the sheet may be empty.
                        </Text>
                      </Stack>
                    );
                  }
                  return (
                    <Stack gap={4} align="center">
                      <Text size="xs" fw={600} c="text-primary">
                        {hasFilter ? `No match for "${filterText.trim()}"` : 'Nothing to show'}
                      </Text>
                      <Text size="xs" c="text-secondary" className="leading-relaxed">
                        {hasFilter
                          ? 'Try fewer letters, or clear the filter to see everything.'
                          : 'Try another mode or sheet.'}
                      </Text>
                      {hasFilter && (
                        <Button
                          size="xs"
                          variant="subtle"
                          onClick={() => setFilterText('')}
                        >
                          Clear filter
                        </Button>
                      )}
                    </Stack>
                  );
                })()}
              </Box>
            )}
        </Stack>
      </ScrollArea>
    </Box>
  );
};
