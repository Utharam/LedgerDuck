/**
 * Auditor Welcome & Quick-Start Page for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showError } from '@components/app-notifications';
import { AuditorGuideModal } from '@features/auditor-guide';
import { useDuckDBConnectionPool } from '@features/duckdb-context/duckdb-context';
import { SchemaPromptHelperModal } from '@features/schema-prompt-helper';
import { useAddLocalFilesOrFolders } from '@hooks/use-add-local-files-folders';
import { useAppTheme } from '@hooks/use-app-theme';
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import {
  IconBolt,
  IconChecklist,
  IconCode,
  IconExternalLink,
  IconFileSpreadsheet,
  IconFolderPlus,
  IconHelp,
  IconLock,
  IconSearch,
  IconSparkles,
  IconUpload,
} from '@tabler/icons-react';
import { createSQLScript } from '@controllers/sql-script';
import { getOrCreateTabFromScript } from '@controllers/tab';
import { loadSampleLedger } from '@utils/sample-ledger';
import { useState, useCallback } from 'react';

export const StartGuide = () => {
  const pool = useDuckDBConnectionPool();
  const colorScheme = useAppTheme();
  const { handleAddFile, handleAddFolder, handleFileDrop } = useAddLocalFilesOrFolders();

  const [guideOpened, setGuideOpened] = useState(false);
  const [promptHelperOpened, setPromptHelperOpened] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleLoadSample = async () => {
    if (loadingSample) return;
    if (!pool) {
      showError({
        title: 'Engine Initializing',
        message: 'Please wait a moment for the database engine to finish starting.',
      });
      return;
    }
    setLoadingSample(true);
    try {
      await loadSampleLedger(pool);
    } finally {
      setLoadingSample(false);
    }
  };

  const handleCreateBlankQuery = () => {
    const script = createSQLScript('blank_query', '-- Write your DuckDB SQL audit query here\nSELECT 1;\n');
    getOrCreateTabFromScript(script, true);
  };

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileDrop(e);
    },
    [handleFileDrop],
  );

  return (
    <Box className="h-full overflow-y-auto bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark px-6 py-8 flex flex-col justify-between">
      <Stack gap={24} maw={860} mx="auto" w="100%">
        {/* Header Branding */}
        <Stack gap={6} align="center" ta="center">
          <Group gap={8} justify="center">
            <ThemeIcon size={36} radius="md" color="blue" variant="light">
              <IconChecklist size={22} />
            </ThemeIcon>
            <Title order={2} fw={700} c="text-primary">
              LedgerDuck
            </Title>
            <Badge size="sm" color="blue" variant="filled">
              Audit Edition
            </Badge>
          </Group>

          <Text size="sm" c="text-secondary" maw={580}>
            Zero-Knowledge, privacy-first SQL investigation workspace for financial auditors and accountants. Runs 100% in your browser.
          </Text>

          <Group gap={6} justify="center" mt={2}>
            <Badge size="xs" color="teal" variant="light" leftSection={<IconLock size={10} />}>
              100% Local Execution
            </Badge>
            <Badge size="xs" color="gray" variant="outline">
              DuckDB-Wasm Engine
            </Badge>
          </Group>
        </Stack>

        {/* Drag & Drop Hero Zone */}
        <Card
          withBorder
          padding="lg"
          radius="md"
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`border-2 border-dashed transition-all cursor-pointer text-center ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 scale-[1.01]'
              : 'border-borderPrimary-light dark:border-borderPrimary-dark bg-backgroundSecondary-light/50 dark:bg-backgroundSecondary-dark/40 hover:border-blue-400'
          }`}
          onClick={handleAddFile}
        >
          <Stack gap={10} align="center" py={12}>
            <ThemeIcon size={48} radius="xl" color="blue" variant={isDragOver ? 'filled' : 'light'}>
              <IconUpload size={24} />
            </ThemeIcon>

            <Stack gap={2}>
              <Text fw={600} size="md" c="text-primary">
                Drop your General Ledger or Bank Statement here
              </Text>
              <Text size="xs" c="text-secondary">
                Supports spreadsheet & data files (<code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>, <code>.parquet</code>)
              </Text>
            </Stack>

            <Group gap={8} mt={6} onClick={(e) => e.stopPropagation()}>
              <Button
                size="xs"
                variant="filled"
                color="blue"
                leftSection={<IconFileSpreadsheet size={14} />}
                onClick={handleAddFile}
              >
                Open File
              </Button>
              <Button
                size="xs"
                variant="default"
                leftSection={<IconFolderPlus size={14} />}
                onClick={handleAddFolder}
              >
                Open Folder
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Demo / Sample Ledger Quick-Start */}
        <Card
          withBorder
          padding="sm"
          radius="md"
          className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark"
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap={10} wrap="nowrap">
              <ThemeIcon size={32} radius="md" color="orange" variant="light">
                <IconBolt size={18} />
              </ThemeIcon>
              <Stack gap={1}>
                <Text size="xs" fw={600} c="text-primary">
                  New to SQL? Test drive with mock accounting records
                </Text>
                <Text size="xs" c="text-secondary" className="leading-tight">
                  Loads a <code>sample_ledger</code> with duplicate invoices, split payments, and weekend bookings.
                </Text>
              </Stack>
            </Group>

            <Button
              size="xs"
              color="orange"
              variant="light"
              loading={loadingSample}
              onClick={handleLoadSample}
            >
              Load Sample Ledger
            </Button>
          </Group>
        </Card>

        {/* Quick Action Navigation Grid */}
        <Stack gap={8}>
          <Text size="xs" fw={600} c="text-secondary" className="uppercase tracking-wider">
            Quick Actions & Tools
          </Text>

          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {/* Card 1: AI Prompt Helper */}
            <Card
              withBorder
              padding="sm"
              radius="sm"
              className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark hover:border-blue-400 cursor-pointer transition-all"
              onClick={() => setPromptHelperOpened(true)}
            >
              <Group gap={10} align="flex-start" wrap="nowrap">
                <ThemeIcon size={30} radius="sm" color="violet" variant="light">
                  <IconSparkles size={16} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="text-primary">
                    AI Prompt Helper (Zero-Knowledge)
                  </Text>
                  <Text size="xs" c="text-secondary" className="leading-tight">
                    Generate structured prompts for ChatGPT/Claude using your schema without exposing financial rows.
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* Card 2: Blank SQL Query */}
            <Card
              withBorder
              padding="sm"
              radius="sm"
              className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark hover:border-blue-400 cursor-pointer transition-all"
              onClick={handleCreateBlankQuery}
            >
              <Group gap={10} align="flex-start" wrap="nowrap">
                <ThemeIcon size={30} radius="sm" color="blue" variant="light">
                  <IconCode size={16} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="text-primary">
                    New Blank SQL Query
                  </Text>
                  <Text size="xs" c="text-secondary" className="leading-tight">
                    Open a full DuckDB SQL query script with syntax highlighting and auto-complete.
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* Card 3: Auditor User Guide */}
            <Card
              withBorder
              padding="sm"
              radius="sm"
              className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark hover:border-blue-400 cursor-pointer transition-all"
              onClick={() => setGuideOpened(true)}
            >
              <Group gap={10} align="flex-start" wrap="nowrap">
                <ThemeIcon size={30} radius="sm" color="teal" variant="light">
                  <IconHelp size={16} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Text size="xs" fw={600} c="text-primary">
                    Auditor User Guide & Docs
                  </Text>
                  <Text size="xs" c="text-secondary" className="leading-tight">
                    Plain-English manual for non-SQL auditors with 1-click LLM documentation export.
                  </Text>
                </Stack>
              </Group>
            </Card>

            {/* Card 4: Spotlight Search */}
            <Card
              withBorder
              padding="sm"
              radius="sm"
              className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark hover:border-blue-400 cursor-pointer transition-all"
              onClick={spotlight.open}
            >
              <Group gap={10} align="flex-start" wrap="nowrap">
                <ThemeIcon size={30} radius="sm" color="gray" variant="light">
                  <IconSearch size={16} />
                </ThemeIcon>
                <Stack gap={2}>
                  <Group gap={6}>
                    <Text size="xs" fw={600} c="text-primary">
                      Go-To-Anything Menu
                    </Text>
                    <Badge size="xs" variant="outline" color="gray">
                      Ctrl + K
                    </Badge>
                  </Group>
                  <Text size="xs" c="text-secondary" className="leading-tight">
                    Search queries, settings, tables, and commands across the application.
                  </Text>
                </Stack>
              </Group>
            </Card>
          </SimpleGrid>
        </Stack>
      </Stack>

      {/* Footer Attribution & Credits */}
      <Box className="pt-6 border-t border-borderPrimary-light dark:border-borderPrimary-dark mt-6">
        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            Built on top of{' '}
            <Anchor
              href="https://github.com/pondpilot/pondpilot"
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              c="blue"
            >
              PondPilot (AGPL-3.0)
            </Anchor>
            . Customized for accountants & auditors.
          </Text>

          <Group gap={10} align="center">
            <Text size="xs" c="dimmed">
              LedgerDuck v0.10.0 · 100% In-Browser Privacy
            </Text>
            <Anchor
              href="https://utharam.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Badge
                size="sm"
                variant="light"
                color="indigo"
                className="cursor-pointer hover:opacity-80 transition-opacity"
              >
                Created by Utharam ↗
              </Badge>
            </Anchor>
          </Group>
        </Group>
      </Box>

      {/* Modals */}
      <AuditorGuideModal opened={guideOpened} onClose={() => setGuideOpened(false)} />
      <SchemaPromptHelperModal opened={promptHelperOpened} onClose={() => setPromptHelperOpened(false)} />
    </Box>
  );
};
