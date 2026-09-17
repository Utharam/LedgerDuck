/**
 * Pane 2: Ledger Distribution Pane for LedgerDuck 2.0 Vocabulary Map
 * Displays cross-column classification breakdown with percentage bars and anomaly flags.
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Progress,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';
import { VariantCandidate } from '@utils/vocabulary';

import {
  InvestigationMode,
  LedgerDistribution,
  MultiClassificationItem,
} from '../types';

interface DistributionPaneProps {
  mode: InvestigationMode;
  selectedWord: string;
  selectedLedger: string;
  selectedMultiItem: MultiClassificationItem | null;
  selectedVariant: VariantCandidate | null;
  distributions: LedgerDistribution[];
  reverseWords: { word: string; occurrences: number }[];
  activeFilterLedger: string;
  onSelectFilterLedger: (ledger: string) => void;
  isLoading: boolean;
}

export const DistributionPane = ({
  mode,
  selectedWord,
  selectedLedger,
  selectedMultiItem,
  selectedVariant,
  distributions,
  reverseWords,
  activeFilterLedger,
  onSelectFilterLedger,
  isLoading,
}: DistributionPaneProps) => {
  const totalMixRows = distributions.reduce((sum, d) => sum + d.n_rows, 0);

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border-r border-borderPrimary-light dark:border-borderPrimary-dark overflow-hidden">
      {/* Pane Title Bar */}
      <Box className="p-3 border-b bg-backgroundSecondary-light/60 dark:bg-backgroundSecondary-dark/60 border-borderPrimary-light dark:border-borderPrimary-dark shrink-0">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Text size="xs" fw={700} c="text-primary" className="uppercase tracking-wider">
              {mode === 'forward' && '2. Where it was posted'}
              {mode === 'reverse' && '2. Words inside this head'}
              {mode === 'multi-classification' && '2. The different heads used'}
              {mode === 'variants' && '2. How close are they?'}
            </Text>
            <Text size="11px" c="text-secondary" className="truncate max-w-[260px]">
              {mode === 'forward' && (selectedWord ? `Word: "${selectedWord}"` : 'Pick a word on the left')}
              {mode === 'reverse' && (selectedLedger ? `Ledger head: "${selectedLedger}"` : 'Pick a ledger head on the left')}
              {mode === 'multi-classification' && (selectedMultiItem ? `"${selectedMultiItem.narration}"` : 'Pick an item on the left')}
              {mode === 'variants' && (selectedVariant ? `"${selectedVariant.a}" vs "${selectedVariant.b}"` : 'Pick a pair on the left')}
            </Text>
          </Stack>

          {isLoading && <Loader size={12} />}
          <Tooltip
            label="Tap a ledger head to filter the rows on the right. Tap again to clear the filter."
            position="bottom"
            multiline
            w={220}
          >
            <ActionIcon size="xs" variant="transparent" color="gray" aria-label="What to do here">
              <IconInfoCircle size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Filter Reset if specific ledger is selected */}
        {mode === 'forward' && activeFilterLedger && activeFilterLedger !== 'ALL' && (
          <Group justify="space-between" mt={6} className="px-2.5 py-1.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900">
            <Text size="10px" c="blue" fw={600} className="truncate">
              Filtered to: {activeFilterLedger}
            </Text>
            <Button
              size="compact-xs"
              variant="subtle"
              color="blue"
              onClick={() => onSelectFilterLedger('ALL')}
            >
              Show All
            </Button>
          </Group>
        )}
      </Box>

      {/* Pane Content */}
      <ScrollArea className="flex-1" offsetScrollbars>
        <Stack gap={8} p={10}>
          {/* Mode: Forward -> Show Ledger Distributions with Progress Bars */}
          {(mode === 'forward' || mode === 'multi-classification') && (
            <>
              {distributions.length === 0 && !isLoading && (
                <Box p={16} className="text-center text-secondary">
                  <Text size="xs">
                    {selectedWord || selectedMultiItem
                      ? 'No rows contain this word in your sheet — check the spelling or try another sheet.'
                      : 'Pick a word on the left to see where it was posted'}
                  </Text>
                </Box>
              )}

              {distributions.length > 0 && (
                <Stack gap={8}>
                  {/* Total summary */}
                  <Group justify="space-between">
                      <Text size="11px" fw={600} c="text-secondary">
                        {distributions.length} Ledger head{distributions.length > 1 ? 's' : ''} ({totalMixRows} rows)
                      </Text>
                    {distributions.length > 1 && (
                      <Badge
                        size="xs"
                        variant="light"
                        color="orange"
                        leftSection={<IconAlertTriangle size={10} />}
                      >
                        Posted to 2+ heads
                      </Badge>
                    )}
                  </Group>

                  {/* Distribution Cards / Rows */}
                  {distributions.map((item) => {
                    const isSelected = activeFilterLedger === item.ledger;
                    const isMinorAnomaly = distributions.length > 1 && item.pct < 20;
                    const isUboHit = Boolean(item.isAnomaly);
                    const flagColor = isUboHit ? 'red' : 'orange';

                    return (
                      <UnstyledButton
                        key={item.ledger}
                        onClick={() =>
                          onSelectFilterLedger(
                            activeFilterLedger === item.ledger ? 'ALL' : item.ledger,
                          )
                        }
                        className={`p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-blue-400 dark:border-blue-700 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
                            : 'border-borderPrimary-light dark:border-borderPrimary-dark hover:border-blue-200 dark:hover:border-blue-900 hover:shadow-xs'
                        }`}
                      >
                        <Stack gap={4}>
                          <Group justify="space-between" wrap="nowrap">
                            <Group gap={6} wrap="nowrap" className="overflow-hidden">
                              {(isMinorAnomaly || isUboHit) && (
                                <Tooltip
                                  label={
                                    isUboHit
                                      ? 'Someone on your watch list was posted to a forbidden head — please review.'
                                      : 'Only a small share was posted here — please review.'
                                  }
                                >
                                  <ThemeIcon size={16} color={flagColor} variant="light" radius="xl">
                                    <IconAlertTriangle size={10} />
                                  </ThemeIcon>
                                </Tooltip>
                              )}
                              <Text size="xs" fw={600} className="truncate" c={isSelected ? 'blue' : 'text-primary'}>
                                {item.ledger || '<Unclassified / Null>'}
                              </Text>
                            </Group>

                            <Group gap={6} wrap="nowrap">
                              <Badge size="xs" variant="light" color={isSelected ? 'blue' : 'gray'}>
                                {item.n_rows} rows
                              </Badge>
                              <Text size="xs" fw={700} c="text-primary" className="font-mono min-w-[36px] text-right">
                                {item.pct}%
                              </Text>
                            </Group>
                          </Group>

                          {/* Progress bar */}
                          <Progress
                            value={item.pct}
                            size="xs"
                            radius="xl"
                            color={isMinorAnomaly ? 'orange' : 'blue'}
                          />
                        </Stack>
                      </UnstyledButton>
                    );
                  })}
                </Stack>
              )}
            </>
          )}

          {/* Mode: Reverse -> Show Top Words inside Selected Bucket */}
          {mode === 'reverse' && (
            <>
              {reverseWords.length === 0 && !isLoading && (
                <Box p={16} className="text-center text-secondary">
                  <Text size="xs">
                    {selectedLedger
                      ? 'This head has no readable words — its rows may be blank or numeric.'
                      : 'Pick a ledger head on the left to see the words inside it'}
                  </Text>
                </Box>
              )}

              {reverseWords.length > 0 && (
                <Stack gap={6}>
                    <Text size="11px" fw={600} c="text-secondary">
                      {`Most used words in "${selectedLedger}"`}
                    </Text>

                  {reverseWords.map((item) => (
                    <UnstyledButton
                      key={item.word}
                      onClick={() => onSelectFilterLedger(item.word)}
                      className="p-2.5 rounded-xl border border-borderPrimary-light dark:border-borderPrimary-dark hover:bg-backgroundSecondary-light dark:hover:bg-backgroundSecondary-dark transition-colors"
                    >
                      <Group justify="space-between">
                        <Text size="xs" fw={500} c="text-primary">
                          {item.word}
                        </Text>
                        <Badge size="xs" variant="light" color="teal">
                          {item.occurrences} hits
                        </Badge>
                      </Group>
                    </UnstyledButton>
                  ))}
                </Stack>
              )}
            </>
          )}

          {/* Mode: Variants */}
          {mode === 'variants' && selectedVariant && (
            <Stack gap={10}>
              <Box className="p-3 rounded-xl border border-borderPrimary-light dark:border-borderPrimary-dark bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
                <Text size="xs" fw={600} c="text-secondary" mb={4}>
                  SIDE-BY-SIDE
                </Text>
                <Group justify="space-between">
                  <Text size="sm" fw={700} c="blue">
                    {`"${selectedVariant.a}"`}
                  </Text>
                  <Text size="xs" c="text-secondary">
                    vs
                  </Text>
                  <Text size="sm" fw={700} c="indigo">
                    {`"${selectedVariant.b}"`}
                  </Text>
                </Group>
                <Group gap={8} mt={8}>
                  <Badge size="xs" color="indigo">
                    Alike: {Math.round(selectedVariant.similarity * 100)}%
                  </Badge>
                  <Badge size="xs" variant="outline" color="gray">
                    Differs by {selectedVariant.distance} {selectedVariant.distance === 1 ? 'letter' : 'letters'}
                  </Badge>
                </Group>
              </Box>

              <Text size="xs" c="text-secondary" className="leading-relaxed">
                Click &quot;Show Evidence&quot; below to inspect transaction rows containing either variation.
              </Text>
            </Stack>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
};
