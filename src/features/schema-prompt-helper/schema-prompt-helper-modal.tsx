/**
 * Zero-Knowledge Schema-to-Prompt Helper Modal for LedgerDuck
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
  Collapse,
  Divider,
  Group,
  Modal,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { PERSISTENT_DB_NAME } from '@models/db-persistence';
import { useAppStore } from '@store/app-store';
import {
  IconCheck,
  IconCopy,
  IconDatabase,
  IconLockCheck,
  IconPlus,
  IconSparkles,
  IconTable,
} from '@tabler/icons-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  formatSchemaPrompt,
  normalizeDataType,
  SchemaTableInfo,
} from './utils/prompt-formatter';

interface SchemaPromptHelperModalProps {
  opened: boolean;
  onClose: () => void;
}

const AUDIT_PROMPT_PRESETS = [
  'Find exact duplicate records matching on date, description, and amount.',
  'Detect potential split transactions (same date and amount, different descriptions).',
  'Flag round-sum disbursements or entries of $1,000 or greater (risk of estimation).',
  'Identify transactions posted on weekends or non-business days.',
  'Show top 25 materiality outliers sorted by absolute amount.',
  'Check for unusual transaction velocity or multiple payments to the same vendor in a short window.',
];

export const SchemaPromptHelperModal: React.FC<SchemaPromptHelperModalProps> = ({
  opened,
  onClose,
}) => {
  const databaseMetadata = useAppStore((state) => state.databaseMetadata);
  const clipboard = useClipboard({ timeout: 2500 });
  const intentInputRef = useRef<HTMLTextAreaElement>(null);

  // Extract all available tables and their columns from metadata
  const tables = useMemo<SchemaTableInfo[]>(() => {
    const list: SchemaTableInfo[] = [];
    for (const [dbName, dbModel] of databaseMetadata.entries()) {
      const dbNameStr = String(dbName);
      if (!dbModel?.schemas || !Array.isArray(dbModel.schemas)) continue;

      for (const schema of dbModel.schemas) {
        const schemaNameStr = String(schema.name);
        if (!schema?.objects || !Array.isArray(schema.objects)) continue;

        for (const obj of schema.objects) {
          const objNameStr = String(obj.name);
          const isDefault = dbNameStr === PERSISTENT_DB_NAME && schemaNameStr === 'main';
          const tableName = isDefault ? objNameStr : `${dbNameStr}.${schemaNameStr}.${objNameStr}`;
          const columns = (obj.columns || []).map((c: any) => ({
            name: String(c.name),
            type: c.databaseType || c.sqlType || c.type || 'TEXT',
          }));

          list.push({ tableName, columns });
        }
      }
    }
    return list;
  }, [databaseMetadata]);

  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [userIntent, setUserIntent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Auto-select first table if none selected
  useEffect(() => {
    if (!selectedTableName && tables.length > 0) {
      setSelectedTableName(tables[0].tableName);
    }
  }, [tables, selectedTableName]);

  const selectedTable = useMemo(() => {
    return tables.find((t) => t.tableName === selectedTableName) || tables[0] || null;
  }, [tables, selectedTableName]);

  // Insert column badge into intent input at cursor position
  const handleInsertColumn = (columnName: string) => {
    const textarea = intentInputRef.current;
    if (!textarea) {
      setUserIntent((prev) => (prev ? `${prev} [${columnName}]` : `[${columnName}]`));
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const current = userIntent;
    const inserted = `[${columnName}]`;
    const nextVal = current.substring(0, start) + inserted + current.substring(end);
    setUserIntent(nextVal);

    // Restore focus and cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 50);
  };

  const formattedPrompt = useMemo(() => {
    if (!selectedTable) return '';
    return formatSchemaPrompt(selectedTable, userIntent, tables);
  }, [selectedTable, userIntent, tables]);

  const handleCopyPrompt = () => {
    if (!formattedPrompt) return;
    clipboard.copy(formattedPrompt);
    showSuccess({
      title: 'Prompt Copied!',
      message: 'Zero-knowledge schema prompt copied. Paste it into ChatGPT, Claude, or Gemini.',
      autoClose: 3000,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <ThemeIcon size="md" radius="sm" color="blue" variant="light">
            <IconSparkles size={18} />
          </ThemeIcon>
          <div>
            <Text fw={600} size="sm" c="text-primary">
              Zero-Knowledge Schema-to-Prompt Helper
            </Text>
            <Text size="xs" c="text-secondary">
              Generate structured LLM prompts for ChatGPT, Claude, or Gemini without sharing data
            </Text>
          </div>
        </Group>
      }
      size="lg"
      radius="md"
      centered
    >
      <Stack gap={14}>
        {/* Zero-Knowledge Privacy Guarantee Banner */}
        <Alert
          icon={<IconLockCheck size={18} />}
          title="100% Zero-Knowledge Privacy Guarantee"
          color="teal"
          variant="light"
          radius="sm"
          className="text-xs"
        >
          <Text size="xs" c="teal.9">
            <strong>Zero financial row data is sent or read.</strong> Only structural metadata (table & column names) is extracted into a text template for you to copy.
          </Text>
        </Alert>

        {/* Table Selector */}
        <Group align="flex-end" justify="space-between">
          <Select
            label="Target Dataset Table / View"
            placeholder="Select table"
            data={tables.map((t) => ({ value: t.tableName, label: t.tableName }))}
            value={selectedTableName || null}
            onChange={(val) => val && setSelectedTableName(val)}
            searchable
            className="flex-1"
            size="xs"
            disabled={tables.length === 0}
            nothingFoundMessage="No tables imported yet"
          />
        </Group>

        {/* Clickable Column Badges */}
        {selectedTable && (
          <Box>
            <Text size="xs" fw={600} mb={6} c="text-secondary">
              Click column pills to insert into your intent:
            </Text>
            <ScrollArea.Autosize mah={90}>
              <Group gap={6} wrap="wrap">
                {selectedTable.columns.map((col) => {
                  const normalizedType = normalizeDataType(col.type);
                  return (
                    <Badge
                      key={col.name}
                      size="sm"
                      variant="outline"
                      color="blue"
                      className="cursor-pointer hover:bg-blue-500/10 transition-colors select-none"
                      onClick={() => handleInsertColumn(col.name)}
                      leftSection={<IconPlus size={10} />}
                    >
                      {col.name} <span className="opacity-70 font-mono text-[10px]">({normalizedType})</span>
                    </Badge>
                  );
                })}
              </Group>
            </ScrollArea.Autosize>
          </Box>
        )}

        {/* Audit Objective Presets */}
        <Box>
          <Text size="xs" fw={600} mb={4} c="text-secondary">
            Quick Audit Presets:
          </Text>
          <Group gap={4} wrap="wrap">
            {AUDIT_PROMPT_PRESETS.map((preset, idx) => (
              <Badge
                key={idx}
                size="xs"
                variant="light"
                color="gray"
                className="cursor-pointer hover:bg-gray-500/20 transition-colors select-none"
                onClick={() => setUserIntent(preset)}
              >
                {preset.slice(0, 42)}...
              </Badge>
            ))}
          </Group>
        </Box>

        {/* Intent Textarea */}
        <Textarea
          ref={intentInputRef}
          label="Your Audit Objective / Question"
          placeholder="e.g. Find all transactions where amount is greater than $50,000 on weekends, grouped by vendor..."
          minRows={3}
          maxRows={6}
          autosize
          size="xs"
          value={userIntent}
          onChange={(e) => setUserIntent(e.currentTarget.value)}
        />

        {/* Preview Prompt Toggle & Box */}
        <div>
          <Group justify="space-between" mb={4}>
            <Button
              variant="subtle"
              size="xs"
              color="gray"
              onClick={() => setShowPreview((prev) => !prev)}
            >
              {showPreview ? 'Hide Full Formatted Prompt' : 'Preview Full Formatted Prompt'}
            </Button>
          </Group>

          <Collapse in={showPreview}>
            <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <ScrollArea.Autosize mah={180}>
                <Code block className="text-[11px] font-mono whitespace-pre-wrap">
                  {formattedPrompt || '-- Select table to generate prompt --'}
                </Code>
              </ScrollArea.Autosize>
            </Card>
          </Collapse>
        </div>

        <Divider />

        {/* Actions */}
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={onClose}>
            Close
          </Button>
          <Button
            size="xs"
            color="blue"
            leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            disabled={!selectedTable}
            onClick={handleCopyPrompt}
          >
            {clipboard.copied ? 'Copied to Clipboard!' : 'Copy Formatted Prompt'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
