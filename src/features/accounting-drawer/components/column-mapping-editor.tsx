/**
 * Column Mapping Editor for Accounting Drawer
 * Licensed under AGPL-3.0
 */

import { ActionIcon, Box, Collapse, Group, Select, Stack, Text, Tooltip } from '@mantine/core';
import { AuditColumnMapping } from '@models/audit-template';
import { IconAdjustments, IconDatabase } from '@tabler/icons-react';
import { useState } from 'react';

interface ColumnMappingEditorProps {
  tables: string[];
  selectedTable: string;
  onSelectTable: (table: string) => void;
  columns: string[];
  mapping: AuditColumnMapping;
  onUpdateMapping: (updated: Partial<AuditColumnMapping>) => void;
}

export const ColumnMappingEditor = ({
  tables,
  selectedTable,
  onSelectTable,
  columns,
  mapping,
  onUpdateMapping,
}: ColumnMappingEditorProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const columnOptions = columns.map((col) => ({ value: col, label: col }));
  const tableOptions = tables.map((t) => ({ value: t, label: t }));

  return (
    <Stack gap={8}>
      <Group justify="space-between" align="center">
        <Text size="xs" fw={600} c="text-secondary" className="uppercase tracking-wider">
          Target Dataset
        </Text>
        <Tooltip label={showDetails ? 'Hide Column Mapping' : 'Customize Column Mapping'}>
          <ActionIcon
            size="xs"
            variant={showDetails ? 'filled' : 'subtle'}
            color="blue"
            onClick={() => setShowDetails((prev) => !prev)}
          >
            <IconAdjustments size={14} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Select
        size="xs"
        placeholder="Select a table or view"
        data={tableOptions}
        value={selectedTable || null}
        onChange={(val) => val && onSelectTable(val)}
        searchable
        nothingFoundMessage="No tables loaded"
        className="w-full"
      />

      <Collapse in={showDetails && Boolean(selectedTable)}>
        <Box className="p-2 rounded bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border border-borderPrimary-light dark:border-borderPrimary-dark mt-1">
          <Text size="xs" fw={600} mb={6} c="text-primary">
            Mapped Audit Columns
          </Text>
          <Stack gap={6}>
            <Select
              size="xs"
              label="Date Column"
              placeholder="Select date column"
              data={columnOptions}
              value={mapping.dateColumn || null}
              onChange={(val) => onUpdateMapping({ dateColumn: val || '' })}
              searchable
              clearable
            />
            <Select
              size="xs"
              label="Amount Column"
              placeholder="Select amount column"
              data={columnOptions}
              value={mapping.amountColumn || null}
              onChange={(val) => onUpdateMapping({ amountColumn: val || '' })}
              searchable
              clearable
            />
            <Select
              size="xs"
              label="Particulars / Narration"
              placeholder="Select description column"
              data={columnOptions}
              value={mapping.particularsColumn || null}
              onChange={(val) => onUpdateMapping({ particularsColumn: val || '' })}
              searchable
              clearable
            />
            <Select
              size="xs"
              label="Category / Ledger"
              placeholder="Select category column"
              data={columnOptions}
              value={mapping.categoryColumn || null}
              onChange={(val) => onUpdateMapping({ categoryColumn: val || '' })}
              searchable
              clearable
            />
          </Stack>
        </Box>
      </Collapse>
    </Stack>
  );
};
