/**
 * Metrics Overview Component for Audit Trail Log
 * Licensed under AGPL-3.0
 */

import { Card, Group, SimpleGrid, Text, ThemeIcon } from '@mantine/core';
import { AuditLogEntry } from '@models/audit-log';
import {
  IconCheck,
  IconClock,
  IconDatabase,
  IconX,
} from '@tabler/icons-react';
import React from 'react';

interface AuditLogMetricsProps {
  entries: AuditLogEntry[];
}

export const AuditLogMetrics: React.FC<AuditLogMetricsProps> = ({ entries }) => {
  const total = entries.length;
  const successCount = entries.filter((e) => e.status === 'success').length;
  const errorCount = entries.filter((e) => e.status === 'error').length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;
  const totalDurationMs = entries.reduce((acc, e) => acc + (e.executionDurationMs || 0), 0);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
      <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
        <Group justify="space-between">
          <div>
            <Text size="xs" c="text-secondary" fw={500}>
              Total Queries Run
            </Text>
            <Text size="lg" fw={700} c="text-primary">
              {total}
            </Text>
          </div>
          <ThemeIcon size="md" radius="sm" variant="light" color="blue">
            <IconDatabase size={18} />
          </ThemeIcon>
        </Group>
      </Card>

      <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
        <Group justify="space-between">
          <div>
            <Text size="xs" c="text-secondary" fw={500}>
              Success Rate
            </Text>
            <Text size="lg" fw={700} c="teal">
              {successRate}%
            </Text>
          </div>
          <ThemeIcon size="md" radius="sm" variant="light" color="teal">
            <IconCheck size={18} />
          </ThemeIcon>
        </Group>
      </Card>

      <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
        <Group justify="space-between">
          <div>
            <Text size="xs" c="text-secondary" fw={500}>
              Failed Statements
            </Text>
            <Text size="lg" fw={700} c={errorCount > 0 ? 'red' : 'text-primary'}>
              {errorCount}
            </Text>
          </div>
          <ThemeIcon size="md" radius="sm" variant="light" color={errorCount > 0 ? 'red' : 'gray'}>
            <IconX size={18} />
          </ThemeIcon>
        </Group>
      </Card>

      <Card withBorder padding="xs" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
        <Group justify="space-between">
          <div>
            <Text size="xs" c="text-secondary" fw={500}>
              Total Engine Time
            </Text>
            <Text size="lg" fw={700} c="text-primary">
              {formatDuration(totalDurationMs)}
            </Text>
          </div>
          <ThemeIcon size="md" radius="sm" variant="light" color="grape">
            <IconClock size={18} />
          </ThemeIcon>
        </Group>
      </Card>
    </SimpleGrid>
  );
};
