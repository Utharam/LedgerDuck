/**
 * Query Editor Modal for adding/editing saved queries
 * Licensed under AGPL-3.0
 */

import {
  Button,
  Group,
  Modal,
  Stack,
  TagsInput,
  TextInput,
  Textarea,
  Text,
} from '@mantine/core';
import { SavedQuery } from '@models/query-manager';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useEffect, useState } from 'react';

interface QueryEditorModalProps {
  opened: boolean;
  onClose: () => void;
  profileName: string;
  initialQuery?: SavedQuery | null;
  onSave: (queryData: { title: string; description: string; sql: string; tags: string[] }) => void;
}

export const QueryEditorModal = ({
  opened,
  onClose,
  profileName,
  initialQuery,
  onSave,
}: QueryEditorModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sql, setSql] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialQuery) {
      setTitle(initialQuery.title || '');
      setDescription(initialQuery.description || '');
      setSql(initialQuery.sql || '');
      setTags(initialQuery.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setSql('SELECT * FROM table_name WHERE ...;');
      setTags([]);
    }
    setError('');
  }, [initialQuery, opened]);

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Please provide a query title.');
      return;
    }
    if (!sql.trim()) {
      setError('Please provide a SQL query.');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      sql: sql.trim(),
      tags,
    });
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={600} size="sm">
          {initialQuery ? 'Edit Saved Query' : `Add Query to "${profileName}"`}
        </Text>
      }
      size="lg"
      centered
    >
      <Stack gap={12}>
        <TextInput
          label="Query Title"
          placeholder="e.g. Foreign Currency Markup or Large Debits"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          error={error && !title ? error : undefined}
          required
          size="sm"
        />

        <TextInput
          label="Description / Purpose"
          placeholder="Brief explanation of what this audit query tests"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          size="sm"
        />

        <TagsInput
          label="Audit Tags"
          placeholder="Press enter to add tags (e.g. Materiality, Fraud, Bank)"
          value={tags}
          onChange={setTags}
          size="xs"
        />

        <Textarea
          label="SQL Query (DuckDB dialect)"
          placeholder="SELECT ... FROM table_name ..."
          value={sql}
          onChange={(e) => setSql(e.currentTarget.value)}
          minRows={6}
          maxRows={12}
          autosize
          styles={{
            input: {
              fontFamily: 'monospace',
              fontSize: '12px',
            },
          }}
          required
        />

        {error && (
          <Text size="xs" c="red">
            {error}
          </Text>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" size="xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="xs"
            color="blue"
            leftSection={<IconDeviceFloppy size={14} />}
            onClick={handleSubmit}
          >
            Save Query
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
