/**
 * Vocabulary Room Controls for LedgerDuck 2.0
 * Provides table selection, column configuration, and investigation mode switcher.
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { AuditColumnMapping } from '@models/audit-template';
import {
  IconAdjustments,
  IconArrowsExchange,
  IconChevronDown,
  IconLayersLinked,
  IconNetwork,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconAbc,
  IconX,
} from '@tabler/icons-react';
import {
  ensureDefaultSynonyms,
  getCustomStopwords,
  getSynonymGroups,
  getUboRules,
  setCustomStopwords,
  setSynonymGroups,
  setUboRules,
} from '@utils/vocab-settings';
import { useState } from 'react';

import { InvestigationMode } from '../types';

interface VocabularyRoomControlsProps {
  tables: string[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  columns: string[];
  mapping: AuditColumnMapping;
  onUpdateMapping: (updated: Partial<AuditColumnMapping>) => void;
  mode: InvestigationMode;
  onChangeMode: (mode: InvestigationMode) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const VocabularyRoomControls = ({
  tables,
  selectedTable,
  onSelectTable,
  columns,
  mapping,
  onUpdateMapping,
  mode,
  onChangeMode,
  onRefresh,
  isLoading,
}: VocabularyRoomControlsProps) => {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const columnOptions = columns.map((c) => ({ value: c, label: c }));
  const [stopwordsText, setStopwordsText] = useState<string | null>(null);
  const [synonymsText, setSynonymsText] = useState<string | null>(null);
  const [watchList, setWatchList] = useState<{ word: string; forbiddenLedger: string }[] | null>(null);
  const [newWatchWord, setNewWatchWord] = useState('');
  const [newWatchLedger, setNewWatchLedger] = useState('');
  const [advancedOpened, setAdvancedOpened] = useState(false);

  const openSettingsModal = () => {
    ensureDefaultSynonyms();
    setStopwordsText(getCustomStopwords().join(', '));
    setSynonymsText(getSynonymGroups().map((g) => g.join(', ')).join('\n'));
    setWatchList(getUboRules());
    setNewWatchWord('');
    setNewWatchLedger('');
    setAdvancedOpened(false);
    openModal();
  };

  const saveVocabSettings = () => {
    if (stopwordsText !== null) {
      setCustomStopwords(stopwordsText.split(/[,;\n]+/));
    }
    if (synonymsText !== null) {
      const groups = synonymsText
        .split('\n')
        .map((line) => line.split(',').map((w) => w.trim()).filter(Boolean))
        .filter((g) => g.length >= 2);
      setSynonymGroups(groups);
    }
    if (watchList !== null) {
      setUboRules(watchList);
    }
    closeModal();
  };

  return (
    <>
      {/* Column Config Modal */}
      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Group gap={8}>
            <ThemeIcon size={24} color="blue" variant="light" radius="sm">
              <IconAdjustments size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Match your columns
            </Text>
          </Group>
        }
        size="sm"
        radius="lg"
      >
        <Stack gap={12}>
          <Text size="xs" c="text-secondary">
            Tell us which columns hold your transaction text and ledger heads. You can re-pick anytime — nothing is changed in your file.
          </Text>

          <Select
            label="Description column"
            description="The text column with transaction details or names (often called Narration or Particulars)"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.particularsColumn}
            onChange={(val) => onUpdateMapping({ particularsColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Ledger Head column"
            description="The column that says where each row was posted (often called Account Head or Category)"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.categoryColumn}
            onChange={(val) => onUpdateMapping({ categoryColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Amount column (optional)"
            description="Used to show values next to each row"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.amountColumn}
            onChange={(val) => onUpdateMapping({ amountColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Select
            label="Date column (optional)"
            description="Used to show dates next to each row"
            placeholder="Select column"
            data={columnOptions}
            value={mapping.dateColumn}
            onChange={(val) => onUpdateMapping({ dateColumn: val || '' })}
            searchable
            clearable
            size="xs"
          />

          <Stack gap={6}>
            <Text size="xs" fw={600} c="text-primary">
              People to watch (optional)
            </Text>
            <Text size="xs" c="text-secondary" className="leading-tight">
              Get flagged when a name appears under the wrong ledger head — e.g. John should never sit in Staff
              Expense.
            </Text>
            {(watchList ?? []).map((rule, idx) => (
              <Group key={`${rule.word}-${rule.forbiddenLedger}-${idx}`} gap={6} wrap="nowrap">
                <Badge size="sm" variant="light" color="red" className="truncate" style={{ flex: 1 }}>
                  {rule.word} → never in {rule.forbiddenLedger}
                </Badge>
                <ActionIcon
                  size="sm"
                  variant="subtle"
                  color="gray"
                  aria-label={`Remove watch for ${rule.word}`}
                  onClick={() => setWatchList((prev) => (prev ?? []).filter((_, i) => i !== idx))}
                >
                  <IconX size={13} />
                </ActionIcon>
              </Group>
            ))}
            <Group gap={6} wrap="nowrap" align="flex-end">
              <TextInput
                size="xs"
                placeholder="Name, e.g. John"
                aria-label="Name to watch"
                value={newWatchWord}
                onChange={(e) => setNewWatchWord(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <TextInput
                size="xs"
                placeholder="Never in, e.g. Staff Expense"
                aria-label="Ledger head it should never sit in"
                value={newWatchLedger}
                onChange={(e) => setNewWatchLedger(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={12} />}
                disabled={newWatchWord.trim().length < 2 || newWatchLedger.trim().length === 0}
                onClick={() => {
                  setWatchList((prev) => [
                    ...(prev ?? []),
                    { word: newWatchWord.trim(), forbiddenLedger: newWatchLedger.trim() },
                  ]);
                  setNewWatchWord('');
                  setNewWatchLedger('');
                }}
              >
                Add
              </Button>
            </Group>
          </Stack>

          <Button
            size="xs"
            variant="subtle"
            color="gray"
            fullWidth
            rightSection={
              <IconChevronDown size={13} style={{ transform: advancedOpened ? 'rotate(180deg)' : undefined }} />
            }
            onClick={() => setAdvancedOpened((v) => !v)}
          >
            Advanced word settings
          </Button>
          <Collapse in={advancedOpened}>
            <Stack gap={12}>
              <Textarea
                label="Small words to skip"
                description="Extra words to leave out of the word list, e.g. when, if, etc. Common ones are already skipped."
                placeholder="when, if, etc"
                value={stopwordsText ?? ''}
                onChange={(e) => setStopwordsText(e.currentTarget.value)}
                size="xs"
                rows={2}
              />

              <Textarea
                label="Words that mean the same"
                description="One group per line — searching any of them finds all, e.g. taxi, cab, uber"
                placeholder={'taxi, cab, uber, conveyance\nexpense, expenses'}
                value={synonymsText ?? ''}
                onChange={(e) => setSynonymsText(e.currentTarget.value)}
                size="xs"
                rows={3}
              />
            </Stack>
          </Collapse>

          <Button size="xs" onClick={saveVocabSettings} fullWidth mt={8}>
            Save & Close
          </Button>
        </Stack>
      </Modal>

      {/* Main Bar */}
      <Box className="border-b px-5 py-3 bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border-borderPrimary-light dark:border-borderPrimary-dark shrink-0">
        <Group justify="space-between" align="center" wrap="wrap" gap={12}>
          {/* Left: Table & Mapping */}
          <Group gap={12} align="center" wrap="nowrap">
            <Group gap={8} align="center">
              <ThemeIcon size={30} radius="md" color="blue" variant="light">
                <IconNetwork size={17} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text size="xs" fw={700} c="text-primary">
                  Vocabulary Map
                </Text>
                <Text size="10px" c="text-secondary">
                  Narration & Ledger Scrutiny
                </Text>
              </Stack>
            </Group>

            <Select
              size="xs"
              placeholder="Select table"
              data={tables.map((t) => ({ value: t, label: t }))}
              value={selectedTable}
              onChange={(val) => onSelectTable(val || '')}
              searchable
              clearable={false}
              className="min-w-[180px]"
            />

            <Group gap={6} align="center" wrap="nowrap">
              <Tooltip label="Description column (Narration / Particulars)">
                <Badge
                  size="sm"
                  variant="light"
                  color={mapping.particularsColumn ? 'blue' : 'gray'}
                  radius="md"
                >
                  Description: {mapping.particularsColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Ledger Head column (Account Head / Category)">
                <Badge
                  size="sm"
                  variant="light"
                  color={mapping.categoryColumn ? 'teal' : 'gray'}
                  radius="md"
                >
                  Ledger Head: {mapping.categoryColumn || 'not set'}
                </Badge>
              </Tooltip>

              <Tooltip label="Configure columns">
                <ActionIcon
                  size="xs"
                  variant="subtle"
                  color="gray"
                  onClick={openSettingsModal}
                  aria-label="Edit Columns"
                >
                  <IconAdjustments size={13} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>

          {/* Center: Investigation Mode Switcher */}
          <SegmentedControl
            size="xs"
            value={mode}
            onChange={(val) => onChangeMode(val as InvestigationMode)}
            data={[
              {
                value: 'forward',
                label: (
                  <Tooltip label="Pick a word (e.g. taxi) and see which ledger heads it was posted to." position="bottom">
                    <Group gap={5} wrap="nowrap">
                      <IconSearch size={13} />
                      <Text size="xs">Where is a word posted?</Text>
                    </Group>
                  </Tooltip>
                ),
              },
              {
                value: 'reverse',
                label: (
                  <Tooltip label="Pick a ledger head (e.g. Miscellaneous) and see which words sit inside it." position="bottom">
                    <Group gap={5} wrap="nowrap">
                      <IconArrowsExchange size={13} />
                      <Text size="xs">What is inside a ledger?</Text>
                    </Group>
                  </Tooltip>
                ),
              },
              {
                value: 'multi-classification',
                label: (
                  <Tooltip label="Find the same party or narration posted to two or more different ledger heads." position="bottom">
                    <Group gap={5} wrap="nowrap">
                      <IconLayersLinked size={13} />
                      <Text size="xs">Same party, two heads?</Text>
                    </Group>
                  </Tooltip>
                ),
              },
              {
                value: 'variants',
                label: (
                  <Tooltip label="Find near-identical narrations that differ by a letter or two (expense vs expenses)." position="bottom">
                    <Group gap={5} wrap="nowrap">
                      <IconAbc size={13} />
                      <Text size="xs">Spelling mistakes?</Text>
                    </Group>
                  </Tooltip>
                ),
              },
            ]}
            radius="sm"
          />

          {/* Right: Refresh button */}
          <Group gap={6}>
            <Tooltip label="Reload the word list from your sheet">
              <ActionIcon
                size="sm"
                variant="light"
                color="blue"
                onClick={onRefresh}
                loading={isLoading}
                disabled={!selectedTable}
                aria-label="Refresh"
              >
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </Box>
    </>
  );
};
