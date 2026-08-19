/**
 * Dedicated Collapsible Right-Hand Audit Panel for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { AccountingDrawer } from '@features/accounting-drawer';
import { QueryManager } from '@features/query-manager';
import {
  ActionIcon,
  Box,
  Group,
  SegmentedControl,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { useAuditPanelStore } from '@store/audit-panel-store';
import {
  IconBookmark,
  IconChecklist,
  IconX,
} from '@tabler/icons-react';

export const AuditPanel = () => {
  const { activeTab, setActiveTab, closePanel } = useAuditPanelStore();

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark border-l border-borderPrimary-light dark:border-borderPrimary-dark overflow-hidden">
      {/* Header */}
      <Box className="px-3 py-2.5 border-b border-borderPrimary-light dark:border-borderPrimary-dark shrink-0">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={8} align="center" wrap="nowrap">
            <ThemeIcon size={26} radius="sm" color="blue" variant="light">
              <IconChecklist size={16} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="xs" fw={700} c="text-primary" className="tracking-wide">
                Audit Workspace
              </Text>
              <Text size="10px" c="text-secondary">
                1-Click Checks & Query Manager
              </Text>
            </Stack>
          </Group>

          <Tooltip label="Hide Audit Panel" position="left">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="gray"
              onClick={closePanel}
              aria-label="Close Audit Panel"
            >
              <IconX size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {/* Tab Switcher */}
        <SegmentedControl
          size="xs"
          fullWidth
          value={activeTab}
          onChange={(val) => setActiveTab(val as 'templates' | 'queries')}
          data={[
            {
              value: 'templates',
              label: (
                <Group gap={6} justify="center" wrap="nowrap">
                  <IconChecklist size={13} />
                  <span>Templates</span>
                </Group>
              ),
            },
            {
              value: 'queries',
              label: (
                <Group gap={6} justify="center" wrap="nowrap">
                  <IconBookmark size={13} />
                  <span>Queries</span>
                </Group>
              ),
            },
          ]}
          className="mt-2.5"
        />
      </Box>

      {/* Panel Content */}
      <Box className="flex-1 overflow-hidden">
        {activeTab === 'templates' ? <AccountingDrawer /> : <QueryManager />}
      </Box>
    </Box>
  );
};
