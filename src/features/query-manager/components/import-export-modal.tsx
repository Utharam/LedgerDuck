/**
 * Import/Export Modal for Query Manager profiles
 * Licensed under AGPL-3.0
 */

import { showSuccess, showError } from '@components/app-notifications';
import {
  Button,
  Divider,
  FileInput,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { useQueryManagerStore } from '@store/query-manager-store';
import { IconDownload, IconUpload } from '@tabler/icons-react';
import { useState } from 'react';

interface ImportExportModalProps {
  opened: boolean;
  onClose: () => void;
}

export const ImportExportModal = ({ opened, onClose }: ImportExportModalProps) => {
  const exportProfilesJson = useQueryManagerStore((state) => state.exportProfilesJson);
  const importProfilesJson = useQueryManagerStore((state) => state.importProfilesJson);
  const [jsonText, setJsonText] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const handleExportDownload = () => {
    const json = exportProfilesJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledgerduck_query_profiles_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showSuccess({
      title: 'Profiles Exported',
      message: 'Downloaded query profiles JSON file.',
      autoClose: 2000,
    });
  };

  const handleImportFile = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setJsonText(content);
    };
    reader.readAsText(selectedFile);
  };

  const handleImportSubmit = () => {
    if (!jsonText.trim()) {
      showError({
        title: 'Import Failed',
        message: 'Please select a JSON file or paste JSON content.',
      });
      return;
    }

    const result = importProfilesJson(jsonText);
    if (result.success) {
      showSuccess({
        title: 'Profiles Imported',
        message: `Successfully imported ${result.importedCount} query profile(s).`,
        autoClose: 2500,
      });
      onClose();
    } else {
      showError({
        title: 'Import Failed',
        message: result.error || 'Failed to parse query profiles JSON.',
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={<Text fw={600} size="sm">Backup & Share Query Profiles</Text>}
      size="md"
      centered
    >
      <Stack gap={14}>
        <Stack gap={4}>
          <Text size="xs" fw={600} c="text-primary">
            Export Profiles
          </Text>
          <Text size="xs" c="text-secondary">
            Download your saved query profiles and audit routines as a portable JSON file to share with team members or use across devices.
          </Text>
          <Button
            size="xs"
            variant="light"
            color="blue"
            leftSection={<IconDownload size={14} />}
            onClick={handleExportDownload}
            className="mt-1"
          >
            Export & Download JSON
          </Button>
        </Stack>

        <Divider my={4} />

        <Stack gap={6}>
          <Text size="xs" fw={600} c="text-primary">
            Import Query Pack
          </Text>
          <FileInput
            size="xs"
            placeholder="Select .json profile pack"
            value={file}
            onChange={handleImportFile}
            accept="application/json"
          />

          <Textarea
            label="Or Paste JSON Directly"
            placeholder="{ 'version': '1.0', 'profiles': [...] }"
            value={jsonText}
            onChange={(e) => setJsonText(e.currentTarget.value)}
            minRows={3}
            maxRows={6}
            size="xs"
            autosize
          />

          <Group justify="flex-end" mt={6}>
            <Button variant="default" size="xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="xs"
              color="blue"
              leftSection={<IconUpload size={14} />}
              onClick={handleImportSubmit}
            >
              Import Profiles
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
};
