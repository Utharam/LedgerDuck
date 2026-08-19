/**
 * Saved Query Card for Query Manager
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Collapse,
  Code,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { SavedQuery } from '@models/query-manager';
import { useAppStore } from '@store/app-store';
import {
  IconCode,
  IconCopy,
  IconDotsVertical,
  IconEdit,
  IconFilePlus,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { getActiveScriptTab, insertOrOpenQuery } from '@utils/editor-insert';
import { useState } from 'react';

interface SavedQueryCardProps {
  profileId: string;
  query: SavedQuery;
  onEdit: (query: SavedQuery) => void;
  onDelete: (queryId: string) => void;
}

export const SavedQueryCard = ({
  profileId,
  query,
  onEdit,
  onDelete,
}: SavedQueryCardProps) => {
  const [showSql, setShowSql] = useState(false);
  const clipboard = useClipboard({ timeout: 2000 });
  const activeScript = getActiveScriptTab();

  const handleOpenNewTab = () => {
    insertOrOpenQuery({
      sql: query.sql,
      queryTitle: query.title,
      targetMode: 'new-tab',
    });
  };

  const handleInsertActive = () => {
    insertOrOpenQuery({
      sql: query.sql,
      queryTitle: query.title,
      targetMode: 'active',
    });
  };

  const handleCopy = () => {
    clipboard.copy(query.sql);
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
          <Text size="xs" fw={600} className="line-clamp-1" c="text-primary">
            {query.title}
          </Text>

          <Group gap={4} wrap="nowrap">
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
                onClick={handleCopy}
              >
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon size="xs" variant="subtle" color="gray">
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEdit(query)}>
                  Edit Query
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => onDelete(query.id)}
                >
                  Delete Query
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>

        {query.description && (
          <Text size="xs" c="text-secondary" className="leading-tight line-clamp-2">
            {query.description}
          </Text>
        )}

        {query.tags && query.tags.length > 0 && (
          <Group gap={4}>
            {query.tags.map((tag) => (
              <Badge key={tag} size="xs" variant="outline" color="gray">
                {tag}
              </Badge>
            ))}
          </Group>
        )}

        <Collapse in={showSql}>
          <Code
            block
            className="text-[11px] p-2 max-h-36 overflow-auto font-mono bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark rounded border border-borderPrimary-light dark:border-borderPrimary-dark"
          >
            {query.sql}
          </Code>
        </Collapse>

        <Group gap={6} className="mt-1" grow>
          {activeScript ? (
            <>
              <Tooltip label={`Append to "${activeScript.scriptName}"`}>
                <Button
                  size="xs"
                  variant="light"
                  color="blue"
                  leftSection={<IconPlus size={12} />}
                  onClick={handleInsertActive}
                >
                  Insert
                </Button>
              </Tooltip>
              <Tooltip label="Open in a new query tab">
                <Button
                  size="xs"
                  variant="filled"
                  color="blue"
                  leftSection={<IconFilePlus size={12} />}
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
              onClick={handleOpenNewTab}
              fullWidth
            >
              Run Query
            </Button>
          )}
        </Group>
      </Stack>
    </Card>
  );
};
