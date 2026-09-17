/**
 * Vocabulary drill-down tools (accountant wording, SQL hidden).
 * Licensed under AGPL-3.0
 */

import { Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { AuditColumnMapping } from '@models/audit-template';
import { insertOrOpenQuery } from '@utils/editor-insert';
import {
  buildTopWordsInLedgerSql,
  buildWordLedgerMixSql,
  buildWordRowsSql,
} from '@utils/vocabulary';
import { useState } from 'react';

interface VocabularyToolsProps {
  tableName: string;
  mapping: AuditColumnMapping;
  disabled?: boolean;
}

export const VocabularyTools = ({ tableName, mapping, disabled = false }: VocabularyToolsProps) => {
  const [word, setWord] = useState('');
  const [ledgerValue, setLedgerValue] = useState('');

  const canUseWord = Boolean(tableName) && word.trim().length >= 2 && !disabled;
  const canUseLedger = Boolean(tableName) && ledgerValue.trim().length > 0 && !disabled;

  const openSql = (sql: string, title: string, scriptName: string) => {
    insertOrOpenQuery({ sql, queryTitle: title, targetMode: 'new-tab', scriptName });
  };

  return (
    <Stack gap={8}>
      <Text size="xs" fw={600} c="text-secondary" className="uppercase tracking-wider">
        Word Investigation
      </Text>
      <Text size="xs" c="text-secondary" className="leading-tight">
        Type a word you spotted above (for example taxi). We show the rows and which ledgers it sits in. Nothing is
        renamed or reclassified.
      </Text>

      <TextInput
        size="xs"
        placeholder="Word, e.g. taxi"
        value={word}
        onChange={(e) => setWord(e.currentTarget.value)}
        disabled={disabled || !tableName}
      />
      <Group gap={6} grow>
        <Button
          size="xs"
          variant="light"
          disabled={!canUseWord}
          onClick={() =>
            openSql(
              buildWordRowsSql(tableName, mapping.particularsColumn || 'particulars', word),
              `Rows containing "${word.trim()}"`,
              'vocab_word_rows',
            )
          }
        >
          Show rows
        </Button>
        <Button
          size="xs"
          variant="light"
          disabled={!canUseWord || !mapping.categoryColumn}
          onClick={() =>
            openSql(
              buildWordLedgerMixSql(
                tableName,
                mapping.particularsColumn || 'particulars',
                mapping.categoryColumn || 'category',
                word,
              ),
              `Ledger mix for "${word.trim()}"`,
              'vocab_word_ledger_mix',
            )
          }
        >
          Ledger mix
        </Button>
      </Group>

      <TextInput
        size="xs"
        placeholder="Ledger name, e.g. Miscellaneous Expense"
        value={ledgerValue}
        onChange={(e) => setLedgerValue(e.currentTarget.value)}
        disabled={disabled || !tableName}
      />
      <Button
        size="xs"
        variant="light"
        fullWidth
        disabled={!canUseLedger}
        onClick={() =>
          openSql(
            buildTopWordsInLedgerSql(
              tableName,
              mapping.particularsColumn || 'particulars',
              mapping.categoryColumn || 'category',
              ledgerValue.trim(),
              100,
            ),
            `Top words inside "${ledgerValue.trim()}"`,
            'vocab_ledger_words',
          )
        }
      >
        What is hiding in this ledger?
      </Button>
    </Stack>
  );
};
