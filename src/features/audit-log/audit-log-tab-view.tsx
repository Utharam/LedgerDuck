/**
 * Audit Log Tab View for LedgerDuck
 * Dedicated tab for viewing, filtering, re-running, and exporting the audit execution log.
 * Licensed under AGPL-3.0
 */

import { Box, Group, Stack, Text, ThemeIcon } from '@mantine/core';
import { useAuditLogStore } from '@store/audit-log-store';
import { IconHistory } from '@tabler/icons-react';
import React from 'react';

import { AuditLogMetrics } from './components/audit-log-metrics';
import { AuditLogTable } from './components/audit-log-table';

interface AuditLogTabViewProps {
  active: boolean;
}

export const AuditLogTabView: React.FC<AuditLogTabViewProps> = ({ active }) => {
  const entries = useAuditLogStore((state) => state.entries);

  if (!active) {
    return null;
  }

  return (
    <Box className="h-full flex flex-col p-4 bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark overflow-hidden">
      <Stack gap={14} className="h-full flex-1 overflow-hidden">
        {/* Header Title */}
        <Group justify="space-between" align="center">
          <Group gap={8}>
            <ThemeIcon size="lg" radius="sm" color="blue" variant="light">
              <IconHistory size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="md" c="text-primary">
                Audit Trail & SQL Execution Log
              </Text>
              <Text size="xs" c="text-secondary">
                Immutable, zero-knowledge session query history for workpaper documentation and audit evidence
              </Text>
            </div>
          </Group>
        </Group>

        {/* Metrics Summary */}
        <AuditLogMetrics entries={entries} />

        {/* Table & Filtering */}
        <AuditLogTable />
      </Stack>
    </Box>
  );
};
