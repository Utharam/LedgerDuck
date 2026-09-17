import { showAlert, showError, showWarning } from '@components/app-notifications';
import {
  addLocalFileOrFoldersCompat,
  pickDataSourceFilesCompat,
  pickFolderCompat,
} from '@controllers/file-system/cross-browser-file-system-controller';
import { useDuckDBConnectionPool } from '@features/duckdb-context/duckdb-context';
import { Button, Group, Stack, Switch, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { LocalEntry, WebkitFile } from '@models/file-system';
import { fileSystemService } from '@utils/file-system-adapter';
import { createFileHandleWrapper } from '@utils/file-system-adapter/handle-converter';
import { useCallback, useState } from 'react';

const isSpreadsheetName = (name: string): boolean =>
  name.toLowerCase().endsWith('.xlsx') || name.toLowerCase().endsWith('.xls');

const XlsxHeaderChoice = ({
  fileNames,
  onConfirm,
  onCancel,
}: {
  fileNames: string[];
  onConfirm: (hasHeader: boolean) => void;
  onCancel: () => void;
}) => {
  const [hasHeader, setHasHeader] = useState(true);
  return (
    <Stack gap={12}>
      <Text size="sm" c="text-secondary">
        {fileNames.length === 1
          ? `Importing ${fileNames[0]}. Is Row 1 your headings (like Date / Description / Amount)?`
          : `Importing ${fileNames.length} spreadsheets (${fileNames.slice(0, 3).join(', ')}${
              fileNames.length > 3 ? ', …' : ''
            }). Is Row 1 headings (like Date / Description / Amount) in all of them?`}
      </Text>
      <Text size="xs" c="text-secondary">
        Nothing is deleted either way — Row 1 is always kept. Answering wrong only affects the
        column names, which you can fix by removing and re-adding the file.
      </Text>
      <Switch
        label="Yes, Row 1 holds the headings"
        description={
          hasHeader
            ? 'Row 1 becomes the column names.'
            : 'Row 1 is kept as data; columns get automatic names.'
        }
        checked={hasHeader}
        onChange={(e) => setHasHeader(e.currentTarget.checked)}
      />
      <Group justify="flex-end" gap={8}>
        <Button variant="subtle" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onConfirm(hasHeader)}>Import</Button>
      </Group>
    </Stack>
  );
};

/**
 * Asks whether spreadsheet first rows are headers. Resolves null on cancel/close.
 */
export const askXlsxHeaderOption = (fileNames: string[]): Promise<boolean | null> =>
  new Promise((resolve) => {
    let settled = false;
    const settle = (value: boolean | null) => {
      if (settled) return;
      settled = true;
      modals.close(modalId);
      resolve(value);
    };
    const modalId = modals.open({
      title: 'Does Row 1 hold your headings?',
      centered: true,
      closeOnClickOutside: false,
      onClose: () => settle(null),
      children: (
        <XlsxHeaderChoice
          fileNames={fileNames}
          onConfirm={(v) => settle(v)}
          onCancel={() => settle(null)}
        />
      ),
    });
  });

export const useAddLocalFilesOrFolders = () => {
  const pool = useDuckDBConnectionPool();

  const handleAddFile = useCallback(async () => {    // TODO: we should see if we ca avoid calling this hook in uninitialized
    // state, and instead of this check, use `useInitializedDuckDBConnection`
    // to get the non-null connection
    if (!pool) {
      showError({
        title: 'App is not ready',
        message: 'Please wait for app to load before adding files',
      });
      return;
    }

    // Use cross-browser compatible file picker
    const { handles, fallbackFiles, error } = await pickDataSourceFilesCompat();

    if (error) {
      showError({ title: 'Failed to add files', message: error });
      return;
    }

    if (!handles.length && !fallbackFiles?.length) {
      return;
    }

    // Spreadsheet header toggle: ask once per import when any .xlsx/.xls is picked.
    const spreadsheetNames = [
      ...handles.filter((h) => isSpreadsheetName(h.name)).map((h) => h.name),
      ...(fallbackFiles ?? []).filter((f) => isSpreadsheetName(f.name)).map((f) => f.name),
    ];
    let xlsxHasHeader = true;
    if (spreadsheetNames.length > 0) {
      const choice = await askXlsxHeaderOption(spreadsheetNames);
      if (choice === null) {
        return;
      }
      xlsxHasHeader = choice;
    }

    const {
      skippedExistingEntries,
      skippedUnsupportedFiles,
      skippedEmptySheets,
      skippedEmptyDatabases,
      errors,
    } = await addLocalFileOrFoldersCompat(pool, handles, fallbackFiles, { xlsxHasHeader });

    if (skippedExistingEntries.length) {
      showWarning({
        title: 'Files already exist',
        message: `${skippedExistingEntries.length} files were not added because they already exist.`,
      });
    }

    if (skippedUnsupportedFiles.length) {
      showWarning({
        title: 'Unsupported files',
        message: `${skippedUnsupportedFiles.length} files were not added because they are not supported.`,
      });
    }

    if (skippedEmptySheets.length) {
      skippedEmptySheets.forEach(({ fileName, sheets }) => {
        showWarning({
          title: 'Empty sheets skipped',
          message: `Skipped empty sheets in ${fileName}: ${sheets.join(', ')}`,
        });
      });
    }
    if (skippedEmptyDatabases.length) {
      skippedEmptyDatabases.forEach((fileName: string) => {
        showAlert({
          title: 'Info',
          message: `Database ${fileName} was not added because it is empty`,
        });
      });
    }
    errors.forEach((errorMessage) => {
      showError({
        title: 'Cannot add files',
        message: errorMessage,
      });
    });
  }, [pool]);

  const handleAddFolder = useCallback(async () => {
    // TODO: we should see if we ca avoid calling this hook in uninitialized
    // state, and instead of this check, use `useInitializedDuckDBConnection`
    // to get the non-null connection
    if (!pool) {
      showError({
        title: 'App is not ready',
        message: 'Please wait for app to load before adding files',
      });
      return;
    }

    // Check if browser supports proper folder handling
    const browserInfo = fileSystemService.getBrowserInfo();
    if (browserInfo.level !== 'full') {
      showWarning({
        title: 'Folder selection not supported',
        message: `${browserInfo.name} doesn't support folder selection. Please use Chrome or Edge for this feature, or add individual files instead.`,
      });
      return;
    }

    // Use cross-browser compatible folder picker
    const { handle, fallbackFiles, error } = await pickFolderCompat();

    if (error) {
      showError({ title: 'Failed to add folder', message: error });
      return;
    }

    if (!handle && !fallbackFiles?.length) {
      return;
    }

    const notificationId = showAlert({
      title: 'Adding folder',
      loading: true,
      message: '',
      autoClose: false,
      color: 'text-accent',
    });

    const {
      skippedExistingEntries,
      skippedUnsupportedFiles,
      skippedEmptyFolders,
      skippedEmptySheets,
      skippedEmptyDatabases,
      errors,
    } = handle
      ? await addLocalFileOrFoldersCompat(pool, [handle], fallbackFiles)
      : await addLocalFileOrFoldersCompat(pool, [], fallbackFiles);
    notifications.hide(notificationId);

    const skippedExistingFolders: LocalEntry[] = [];
    const skippedExistingFiles: LocalEntry[] = [];
    for (const entry of skippedExistingEntries) {
      if (entry.kind === 'directory') {
        skippedExistingFolders.push(entry);
      } else {
        skippedExistingFiles.push(entry);
      }
    }

    if (skippedExistingFolders.length) {
      showWarning({
        title: 'Folders already exist',
        message: `${skippedExistingFolders.length} folders were not added because they already exist.`,
      });
    }

    if (skippedExistingFiles.length) {
      showWarning({
        title: 'Files already exist',
        message: `${skippedExistingFiles.length} files were not added because they already exist.`,
      });
    }

    if (skippedUnsupportedFiles.length) {
      showWarning({
        title: 'Unsupported files',
        message: `${skippedUnsupportedFiles.length} files were not added because they are not supported.`,
      });
    }

    if (skippedEmptyFolders.length) {
      showWarning({
        title: 'Empty folders skipped',
        message: `${skippedEmptyFolders.length} folders were not added because no supported files were found.`,
      });
    }
    if (skippedEmptySheets.length) {
      skippedEmptySheets.forEach(({ fileName, sheets }) => {
        showWarning({
          title: 'Empty sheets skipped',
          message: `Skipped empty sheets in ${fileName}: ${sheets.join(', ')}`,
        });
      });
    }
    if (skippedEmptyDatabases.length) {
      skippedEmptyDatabases.forEach((fileName: string) => {
        showAlert({
          title: 'Info',
          message: `Database ${fileName} was not added because it is empty`,
        });
      });
    }

    errors.forEach((errorMessage) => {
      showError({
        title: 'Cannot add folder',
        message: errorMessage,
      });
    });
  }, [pool]);

  const handleFileDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!pool) {
        showError({
          title: 'App is not ready',
          message: 'Please wait for app to load before adding files',
        });
        return;
      }

      const handles: (FileSystemFileHandle | FileSystemDirectoryHandle)[] = [];
      const fallbackFiles: File[] = [];

      // Check if we have native File System Access API support
      const hasNativeSupport = 'getAsFileSystemHandle' in DataTransferItem.prototype;

      if (hasNativeSupport) {
        // Chrome/Edge: Use native handles
        const fileHandlesPromises = [...e.dataTransfer.items].map((item) =>
          item.getAsFileSystemHandle(),
        );

        for await (const handle of fileHandlesPromises) {
          if (!handle) {
            continue;
          }
          handles.push(handle as FileSystemFileHandle | FileSystemDirectoryHandle);
        }
      } else {
        // Firefox/Safari: Use File objects and create wrapped handles
        const items = [...e.dataTransfer.items];

        for (const item of items) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) {
              fallbackFiles.push(file);

              // Create wrapped handle from File object (same approach as pickFilesForPondPilot)
              const handle = {
                kind: 'file' as const,
                name: file.name,
                getFile: async () => file,
              };
              const wrappedHandle = createFileHandleWrapper(handle);
              handles.push(wrappedHandle);
            }
          }
        }

        // Try to detect if files are from a folder based on their paths
        // Note: In fallback mode, we can't distinguish between files and folders being dropped
        // We'll treat all drops as file drops and let the user know about limitations
        if (fallbackFiles.length > 0) {
          const capabilities = fileSystemService.getBrowserCapabilities();

          if (!capabilities.hasDragAndDropDirectory) {
            // Check if it looks like folder content (multiple files with path separators)
            const hasPathInfo = fallbackFiles.some(
              (file) => (file as WebkitFile).webkitRelativePath || file.name.includes('/'),
            );

            if (hasPathInfo || fallbackFiles.length > 5) {
              showWarning({
                title: 'Folder drag & drop limitation',
                message: `${fileSystemService.getBrowserInfo().name} doesn't fully support dragging folders. Individual files have been added instead.`,
              });
            }
          }
        }
      }

      const notificationId = showAlert({
        title: 'Processing dropped items',
        loading: true,
        message: 'Please wait while we process the dropped files/folders...',
        autoClose: false,
        color: 'text-accent',
      });

      try {
        if (handles.length === 0 && fallbackFiles.length === 0) {
          notifications.hide(notificationId);
          showAlert({
            title: 'No valid items',
            message: 'No supported files or folders were found in the dropped items.',
          });
          return;
        }

        const { skippedExistingEntries, skippedUnsupportedFiles, skippedEmptyDatabases, errors } =
          await addLocalFileOrFoldersCompat(pool, handles, fallbackFiles);

        notifications.hide(notificationId);
        if (skippedExistingEntries.length) {
          showWarning({
            title: 'Files already exist',
            message: `${skippedExistingEntries.length} files were not added because they already exist.`,
          });
        }
        if (skippedUnsupportedFiles.length) {
          showWarning({
            title: 'Unsupported files',
            message: `${skippedUnsupportedFiles.length} files were not added because they are not supported.`,
          });
        }
        if (skippedEmptyDatabases.length) {
          skippedEmptyDatabases.forEach((fileName: string) => {
            showAlert({
              title: 'Info',
              message: `Database ${fileName} was not added because it is empty`,
            });
          });
        }
        if (errors.length) {
          errors.forEach((errorMessage) => {
            showError({
              title: 'Cannot process items',
              message: errorMessage,
            });
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        notifications.hide(notificationId);
        showError({
          title: 'Cannot process dropped items',
          message: errorMessage,
        });
      }
    },
    [pool],
  );

  return {
    handleAddFile,
    handleAddFolder,
    handleFileDrop,
  };
};
