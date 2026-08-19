/**
 * Query Manager Main Component
 * Licensed under AGPL-3.0
 */

import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  ScrollArea,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { SavedQuery } from '@models/query-manager';
import { useQueryManagerStore } from '@store/query-manager-store';
import {
  IconCreditCard,
  IconBuildingBank,
  IconCash,
  IconDotsVertical,
  IconDownload,
  IconFolderPlus,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { ImportExportModal } from './components/import-export-modal';
import { QueryEditorModal } from './components/query-editor-modal';
import { SavedQueryCard } from './components/saved-query-card';

export const QueryManager = () => {
  const {
    profiles,
    activeProfileId,
    setActiveProfileId,
    addProfile,
    deleteProfile,
    addQuery,
    updateQuery,
    deleteQuery,
    resetToDefaults,
  } = useQueryManagerStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [queryModalOpened, setQueryModalOpened] = useState(false);
  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [importExportOpened, setImportExportOpened] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [showNewProfileInput, setShowNewProfileInput] = useState(false);

  // Active Profile
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || profiles[0] || null,
    [profiles, activeProfileId],
  );

  const profileOptions = useMemo(
    () => profiles.map((p) => ({ value: p.id, label: `${p.name} (${p.queries.length})` })),
    [profiles],
  );

  // Filtered Queries
  const filteredQueries = useMemo(() => {
    if (!activeProfile) return [];
    if (!searchQuery.trim()) return activeProfile.queries;

    const needle = searchQuery.toLowerCase();
    return activeProfile.queries.filter(
      (q) =>
        q.title.toLowerCase().includes(needle) ||
        (q.description && q.description.toLowerCase().includes(needle)) ||
        (q.tags && q.tags.some((t) => t.toLowerCase().includes(needle))) ||
        q.sql.toLowerCase().includes(needle),
    );
  }, [activeProfile, searchQuery]);

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    const id = addProfile({
      name: newProfileName.trim(),
      icon: 'file-text',
      description: 'Custom accounting profile',
      queries: [],
    });
    setNewProfileName('');
    setShowNewProfileInput(false);
    setActiveProfileId(id);
  };

  const handleOpenAddQuery = () => {
    setEditingQuery(null);
    setQueryModalOpened(true);
  };

  const handleOpenEditQuery = (q: SavedQuery) => {
    setEditingQuery(q);
    setQueryModalOpened(true);
  };

  const handleSaveQuery = (data: { title: string; description: string; sql: string; tags: string[] }) => {
    if (!activeProfile) return;
    if (editingQuery) {
      updateQuery(activeProfile.id, editingQuery.id, data);
    } else {
      addQuery(activeProfile.id, data);
    }
  };

  const getProfileIcon = (iconName: string) => {
    switch (iconName) {
      case 'credit-card':
        return <IconCreditCard size={14} />;
      case 'building-bank':
        return <IconBuildingBank size={14} />;
      case 'cash':
        return <IconCash size={14} />;
      default:
        return <IconCreditCard size={14} />;
    }
  };

  // If no profiles exist
  if (profiles.length === 0) {
    return (
      <Stack gap={12} className="h-full p-4 justify-center items-center text-center">
        <Text size="sm" fw={600} c="text-primary">
          No Query Profiles
        </Text>
        <Text size="xs" c="text-secondary" maw={260}>
          You can create your own custom profile or restore the default accounting profiles.
        </Text>

        {showNewProfileInput ? (
          <Stack gap={6} w="100%" maw={260}>
            <TextInput
              size="xs"
              placeholder="Profile name"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.currentTarget.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProfile();
                if (e.key === 'Escape') setShowNewProfileInput(false);
              }}
            />
            <Group gap={6} justify="center">
              <Button size="xs" color="blue" onClick={handleCreateProfile}>
                Create
              </Button>
              <Button size="xs" variant="subtle" color="gray" onClick={() => setShowNewProfileInput(false)}>
                Cancel
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group gap={6} justify="center">
            <Button
              size="xs"
              variant="filled"
              color="blue"
              leftSection={<IconFolderPlus size={14} />}
              onClick={() => setShowNewProfileInput(true)}
            >
              New Profile
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={resetToDefaults}
            >
              Restore Defaults
            </Button>
          </Group>
        )}
      </Stack>
    );
  }

  return (
    <Stack gap={10} className="h-full p-2">
      {/* Profile Selector and Controls */}
      <Stack gap={6}>
        <Group justify="space-between" align="center">
          <Text size="xs" fw={600} c="text-secondary" className="uppercase tracking-wider">
            Account Profile
          </Text>
          <Group gap={4}>
            <Tooltip label="Backup / Share Profiles (JSON)">
              <ActionIcon
                size="xs"
                variant="subtle"
                color="gray"
                onClick={() => setImportExportOpened(true)}
              >
                <IconDownload size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="New Profile">
              <ActionIcon
                size="xs"
                variant="subtle"
                color="blue"
                onClick={() => setShowNewProfileInput((prev) => !prev)}
              >
                <IconFolderPlus size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {showNewProfileInput && (
          <Group gap={4} wrap="nowrap">
            <TextInput
              size="xs"
              placeholder="Profile name (e.g. Vendor Audit)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.currentTarget.value)}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProfile();
                if (e.key === 'Escape') setShowNewProfileInput(false);
              }}
            />
            <Button size="xs" variant="filled" color="blue" onClick={handleCreateProfile}>
              Add
            </Button>
          </Group>
        )}

        <Group gap={4} wrap="nowrap">
          <Select
            size="xs"
            placeholder="Select a profile"
            data={profileOptions}
            value={activeProfile?.id || null}
            onChange={(val) => val && setActiveProfileId(val)}
            className="flex-1"
          />

          {activeProfile && (
            <Menu shadow="md" position="bottom-end" withinPortal>
              <Menu.Target>
                <ActionIcon size="xs" variant="subtle" color="gray">
                  <IconDotsVertical size={14} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconTrash size={14} />}
                  color="red"
                  onClick={() => deleteProfile(activeProfile.id)}
                >
                  Delete &ldquo;{activeProfile.name}&rdquo;
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconRefresh size={14} />}
                  color="gray"
                  onClick={resetToDefaults}
                >
                  Restore Default Profiles
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          )}
        </Group>

        {activeProfile?.description && (
          <Text size="xs" c="text-secondary" className="leading-tight">
            {activeProfile.description}
          </Text>
        )}
      </Stack>

      {/* Query Search and Add Button */}
      <Group gap={6} wrap="nowrap">
        <TextInput
          size="xs"
          placeholder="Filter queries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          leftSection={<IconSearch size={12} />}
          className="flex-1"
        />
        <Tooltip label="Add New Query">
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconPlus size={12} />}
            onClick={handleOpenAddQuery}
          >
            New
          </Button>
        </Tooltip>
      </Group>

      {/* Queries List */}
      <ScrollArea className="flex-1" offsetScrollbars>
        <Stack gap={8}>
          {filteredQueries.length === 0 ? (
            <Box className="p-4 text-center">
              <Text size="xs" c="text-secondary">
                {searchQuery ? 'No matching queries found.' : 'No saved queries in this profile yet.'}
              </Text>
              <Button
                size="xs"
                variant="subtle"
                color="blue"
                leftSection={<IconPlus size={12} />}
                onClick={handleOpenAddQuery}
                className="mt-2"
              >
                Add Your First Query
              </Button>
            </Box>
          ) : (
            filteredQueries.map((query) => (
              <SavedQueryCard
                key={query.id}
                profileId={activeProfile.id}
                query={query}
                onEdit={handleOpenEditQuery}
                onDelete={(qId) => deleteQuery(activeProfile.id, qId)}
              />
            ))
          )}
        </Stack>
      </ScrollArea>

      {/* Modals */}
      <QueryEditorModal
        opened={queryModalOpened}
        onClose={() => setQueryModalOpened(false)}
        profileName={activeProfile?.name || 'Profile'}
        initialQuery={editingQuery}
        onSave={handleSaveQuery}
      />

      <ImportExportModal
        opened={importExportOpened}
        onClose={() => setImportExportOpened(false)}
      />
    </Stack>
  );
};
