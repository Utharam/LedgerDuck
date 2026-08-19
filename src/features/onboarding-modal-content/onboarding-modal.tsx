/**
 * LedgerDuck Welcome & Onboarding Modal
 * Licensed under AGPL-3.0
 */

import duckDark from '@assets/duck-dark.svg';
import duck from '@assets/duck.svg';
import { useAppTheme } from '@hooks/use-app-theme';
import { Badge, Box, Button, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { ModalSettings } from '@mantine/modals/lib/context';
import {
  IconBolt,
  IconChecklist,
  IconFileSpreadsheet,
  IconFolderOpen,
  IconHistory,
  IconLock,
} from '@tabler/icons-react';
import { setDataTestId } from '@utils/test-id';

const auditFeatures = [
  {
    icon: IconLock,
    title: '100% In-Browser Privacy',
    description: 'Zero remote servers. Your confidential client financial records and spreadsheets never leave your device.',
  },
  {
    icon: IconBolt,
    title: 'Powered by DuckDB-Wasm',
    description: 'Analyze millions of ledger transactions, journal entries, and bank feeds in milliseconds.',
  },
  {
    icon: IconFileSpreadsheet,
    title: 'Audit Ingestion Guardrails',
    description: 'Automatic merged cell detection & rejection, rectangular uniformity validation, and header cleaning.',
  },
  {
    icon: IconChecklist,
    title: '1-Click Audit Templates',
    description: 'Pre-loaded substantive tests: Duplicates, Split Transactions, Round-Sums, Outliers, and Weekend Bookings.',
  },
  {
    icon: IconFolderOpen,
    title: 'Profile Query Manager',
    description: 'Organize routines by statement type (Amex, Bank Feeds, Petty Cash) with JSON audit pack export/import.',
  },
  {
    icon: IconHistory,
    title: 'Audit Trail & Workpapers',
    description: 'Full SQL query execution logging with 1-click export to CSV / JSON for compliance documentation.',
  },
];

export const ONBOARDING_MODAL_OPTIONS: ModalSettings = {
  size: 720,
  withCloseButton: true,
};

export const OnboardingModalContent = ({ onClose }: { onClose: () => void }) => {
  const colorScheme = useAppTheme();

  return (
    <Stack gap={20} data-testid={setDataTestId('onboarding-modal')} className="py-1">
      <Stack justify="center" align="center" gap={6} className="text-center">
        <img
          src={colorScheme === 'dark' ? duckDark : duck}
          alt="LedgerDuck"
          width={56}
          height={46}
          style={{ display: 'block' }}
        />
        <Group gap={8} justify="center" align="center">
          <Title order={2} className="text-xl font-bold">
            Welcome to LedgerDuck
          </Title>
          <Badge size="xs" variant="light" color="blue">
            Audit Edition
          </Badge>
        </Group>
        <Text c="text-secondary" size="sm" maw={480}>
          Zero-knowledge, privacy-first SQL investigation workspace for financial auditors and accountants.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={12}>
        {auditFeatures.map((feature) => (
          <Group
            key={feature.title}
            align="flex-start"
            gap={12}
            wrap="nowrap"
            className="rounded-xl bg-transparent004-light p-3 dark:bg-transparent004-dark border border-borderPrimary-light/40 dark:border-borderPrimary-dark/40"
          >
            <Box
              className="flex shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"
              w={36}
              h={36}
            >
              <feature.icon size={20} stroke={1.6} />
            </Box>
            <Stack gap={2}>
              <Text fw={600} size="xs" c="text-primary">
                {feature.title}
              </Text>
              <Text c="text-secondary" size="xs" lh={1.4}>
                {feature.description}
              </Text>
            </Stack>
          </Group>
        ))}
      </SimpleGrid>

      <Group justify="space-between" align="center" className="pt-2 border-t border-borderPrimary-light dark:border-borderPrimary-dark">
        <Text size="xs" c="text-secondary">
          Created with ❤️ by{' '}
          <a
            href="https://utharam.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-medium"
          >
            Utharam ↗
          </a>
        </Text>

        <Button
          color="blue"
          onClick={onClose}
          data-testid={setDataTestId('onboarding-modal-submit-button')}
        >
          Start Audit Investigation
        </Button>
      </Group>
    </Stack>
  );
};
