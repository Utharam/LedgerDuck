/**
 * Template Card Component for Accounting Drawer
 * Licensed under AGPL-3.0
 */

import { showSuccess } from '@components/app-notifications';
import { createSQLScript } from '@controllers/sql-script';
import { getOrCreateTabFromScript } from '@controllers/tab';
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Code,
  Group,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { AuditColumnMapping, AuditTemplate } from '@models/audit-template';
import { useAppStore } from '@store/app-store';
import { IconCode, IconCopy, IconFilePlus, IconPlayerPlay, IconPlus } from '@tabler/icons-react';
import { getActiveScriptTab, insertOrOpenQuery } from '@utils/editor-insert';
import { useState } from 'react';

interface TemplateCardProps {
  template: AuditTemplate;
  tableName: string;
  mapping: AuditColumnMapping;
  disabled?: boolean;
}

export const TemplateCard = ({
  template,
  tableName,
  mapping,
  disabled = false,
}: TemplateCardProps) => {
  const [showSql, setShowSql] = useState(false);
  const clipboard = useClipboard({ timeout: 2000 });
  const activeTabId = useAppStore((state) => state.activeTabId);
  const activeScript = getActiveScriptTab();

  const generatedSql = tableName ? template.generateSql(tableName, mapping) : '';

  const handleOpenNewTab = () => {
    if (!generatedSql) return;
    insertOrOpenQuery({
      sql: generatedSql,
      queryTitle: template.title,
      targetMode: 'new-tab',
      scriptName: `audit_${template.id}`,
    });
  };

  const handleInsertActive = () => {
    if (!generatedSql) return;
    insertOrOpenQuery({
      sql: generatedSql,
      queryTitle: template.title,
      targetMode: 'active',
    });
  };

  const handleCopy = () => {
    if (!generatedSql) return;
    clipboard.copy(generatedSql);
  };

  return (
    <Card
      withBorder
      padding="xs"
      radius="sm"
      className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark transition-all"
    >
      <Stack gap={6}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={6} wrap="nowrap">
            <Badge size="xs" color={template.badgeColor} variant="light">
              {template.category}
            </Badge>
            <Text size="xs" fw={600} className="line-clamp-1" c="text-primary">
              {template.title}
            </Text>
          </Group>

          <Group gap={4}>
            <Tooltip label={showSql ? 'Hide SQL' : 'View SQL'}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setShowSql((prev) => !prev)}
              >
                <IconCode size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={clipboard.copied ? 'Copied!' : 'Copy SQL'}>
              <ActionIcon
                size="xs"
                variant="subtle"
                color={clipboard.copied ? 'teal' : 'gray'}
                disabled={disabled || !tableName}
                onClick={handleCopy}
              >
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Text size="xs" c="text-secondary" className="leading-tight">
          {template.description}
        </Text>

        <Collapse in={showSql}>
          <Code
            block
            className="text-[11px] p-2 max-h-36 overflow-auto font-mono bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark rounded border border-borderPrimary-light dark:border-borderPrimary-dark"
          >
            {generatedSql || '-- Select a table above to preview SQL --'}
          </Code>
        </Collapse>

        <Group gap={6} className="mt-1" grow>
          {activeScript ? (
            <>
              <Tooltip label={`Append query to "${activeScript.scriptName}"`}>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconPlus size={12} />}
                  disabled={disabled || !tableName}
                  onClick={handleInsertActive}
                >
                  Insert in Active
                </Button>
              </Tooltip>
              <Tooltip label="Open query in a new script tab">
                <Button
                  size="xs"
                  variant="filled"
                  color="blue"
                  leftSection={<IconFilePlus size={12} />}
                  disabled={disabled || !tableName}
                  onClick={handleOpenNewTab}
                >
                  New Tab
                </Button>
              </Tooltip>
            </>
          ) : (
            <Button
              size="xs"
              variant="filled"
              color="blue"
              leftSection={<IconPlayerPlay size={12} />}
              disabled={disabled || !tableName}
              onClick={handleOpenNewTab}
              fullWidth
            >
              Run in New Tab
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
};
