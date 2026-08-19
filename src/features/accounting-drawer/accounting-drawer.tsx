/**
 * Accounting Command Drawer for LedgerDuck
 * Pre-loaded with 1-click DuckDB audit queries for accountants and auditors.
 * Licensed under AGPL-3.0
 */

import { Alert, Box, Group, ScrollArea, Stack, Text, ThemeIcon } from '@mantine/core';
import { AuditColumnMapping } from '@models/audit-template';
import { PERSISTENT_DB_NAME } from '@models/db-persistence';
import { useAppStore } from '@store/app-store';
import { AUDIT_TEMPLATES, autoDetectAuditColumns } from '@utils/audit-templates';
import { IconAlertCircle, IconChecklist } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import { ColumnMappingEditor } from './components/column-mapping-editor';
import { TemplateCard } from './components/template-card';

interface TableMeta {
  fullName: string;
  shortName: string;
  columns: { name: string; type?: string }[];
}

export const AccountingDrawer = () => {
  const databaseMetadata = useAppStore((state) => state.databaseMetadata);
  const dataSources = useAppStore((state) => state.dataSources);

  // Extract all available tables and views from DuckDB metadata
  const availableTables = useMemo<TableMeta[]>(() => {
    const list: TableMeta[] = [];

    // 1. Tables and views from databaseMetadata
    for (const [dbName, dbModel] of databaseMetadata.entries()) {
      const dbNameStr = String(dbName);
      if (!dbModel?.schemas || !Array.isArray(dbModel.schemas)) continue;

      for (const schema of dbModel.schemas) {
        const schemaNameStr = String(schema.name);
        if (!schema?.objects || !Array.isArray(schema.objects)) continue;

        for (const obj of schema.objects) {
          const objNameStr = String(obj.name);
          const isDefault = dbNameStr === PERSISTENT_DB_NAME && schemaNameStr === 'main';
          const fullName = isDefault ? objNameStr : `${dbNameStr}.${schemaNameStr}.${objNameStr}`;
          const columns = (obj.columns || []).map((c: any) => ({
            name: String(c.name),
            type: c.databaseType || c.sqlType || c.type || 'TEXT',
          }));

          list.push({
            fullName,
            shortName: objNameStr,
            columns,
          });
        }
      }
    }

    // 2. Also ensure flat file data sources with viewName are included
    for (const [, ds] of dataSources.entries()) {
      if (ds && 'viewName' in ds && ds.viewName) {
        const viewName = String(ds.viewName);
        const alreadyExists = list.some(
          (t) => t.fullName === viewName || t.shortName === viewName,
        );
        if (!alreadyExists) {
          list.push({
            fullName: viewName,
            shortName: viewName,
            columns: [],
          });
        }
      }
    }

    return list;
  }, [databaseMetadata, dataSources]);

  // Selected table
  const [selectedTable, setSelectedTable] = useState<string>('');

  // Auto-select first table if none selected
  useEffect(() => {
    if (!selectedTable && availableTables.length > 0) {
      setSelectedTable(availableTables[0].fullName);
    }
  }, [availableTables, selectedTable]);

  // Find columns for the currently selected table
  const selectedTableMeta = useMemo(() => {
    return availableTables.find((t) => t.fullName === selectedTable);
  }, [availableTables, selectedTable]);

  const columnNames = useMemo(() => {
    return selectedTableMeta?.columns.map((c) => c.name) || [];
  }, [selectedTableMeta]);

  // Column mapping
  const [mapping, setMapping] = useState<AuditColumnMapping>({
    dateColumn: '',
    particularsColumn: '',
    categoryColumn: '',
    amountColumn: '',
  });

  // When selected table changes, auto-detect mapping
  useEffect(() => {
    if (selectedTableMeta && selectedTableMeta.columns.length > 0) {
      const detected = autoDetectAuditColumns(selectedTableMeta.columns);
      setMapping(detected);
    }
  }, [selectedTableMeta]);

  const handleUpdateMapping = (updated: Partial<AuditColumnMapping>) => {
    setMapping((prev) => ({ ...prev, ...updated }));
  };

  const tableNames = useMemo(() => availableTables.map((t) => t.fullName), [availableTables]);

  return (
    <Box className="h-full flex flex-col p-2 bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark">
      <Stack gap={10} className="flex-1 overflow-hidden">
        {/* Table & Column Mapping Config */}
        <ColumnMappingEditor
          tables={tableNames}
          selectedTable={selectedTable}
          onSelectTable={setSelectedTable}
          columns={columnNames}
          mapping={mapping}
          onUpdateMapping={handleUpdateMapping}
        />

        {availableTables.length === 0 && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="No Data Sources"
            color="blue"
            variant="light"
            radius="sm"
            className="text-xs"
          >
            Import a spreadsheet (.xlsx, .xls, .csv) or DuckDB database to unlock 1-click audit queries.
          </Alert>
        )}

        {/* Audit Templates List */}
        {availableTables.length > 0 && (
          <ScrollArea className="flex-1" offsetScrollbars>
            <Stack gap={8} className="pr-1 pb-4">
              <Group gap={4} align="center">
                <ThemeIcon size="xs" variant="light" color="blue">
                  <IconChecklist size={12} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-secondary" className="uppercase tracking-wider">
                  Audit Commands
                </Text>
              </Group>

              {AUDIT_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  tableName={selectedTable}
                  mapping={mapping}
                  disabled={!selectedTable}
                />
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Stack>
    </Box>
  );
};
