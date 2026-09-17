/**
 * Hook for discovering available DuckDB tables, views, and file sources
 * for LedgerDuck audit and vocabulary rooms.
 * Licensed under AGPL-3.0
 */

import { AuditColumnMapping } from '@models/audit-template';
import { PERSISTENT_DB_NAME } from '@models/db-persistence';
import { useAppStore } from '@store/app-store';
import { useRoomStore } from '@store/room-store';
import { autoDetectAuditColumns } from '@utils/audit-templates';
import { useEffect, useMemo } from 'react';

export interface TableColumnMeta {
  name: string;
  type?: string;
}

export interface TableMeta {
  fullName: string;
  shortName: string;
  columns: TableColumnMeta[];
}

export function useAuditTables() {
  const databaseMetadata = useAppStore((state) => state.databaseMetadata);
  const dataSources = useAppStore((state) => state.dataSources);
  const { selectedTable, setSelectedTable, mapping, setMapping } = useRoomStore();

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

  // Auto-select first available table if none selected or selected table no longer exists
  useEffect(() => {
    if (availableTables.length > 0) {
      const currentValid = availableTables.some((t) => t.fullName === selectedTable);
      if (!currentValid) {
        setSelectedTable(availableTables[0].fullName);
      }
    }
  }, [availableTables, selectedTable, setSelectedTable]);

  // Active table metadata
  const selectedTableMeta = useMemo(() => {
    return availableTables.find((t) => t.fullName === selectedTable);
  }, [availableTables, selectedTable]);

  const columnNames = useMemo(() => {
    return selectedTableMeta?.columns.map((c) => c.name) || [];
  }, [selectedTableMeta]);

  // When selected table changes and mapping is empty or stale, auto-detect mapping.
  // NOTE: `mapping` intentionally excluded from deps to avoid overwrite loop —
  // we only re-run when the table/columns change, never on user edits.
  useEffect(() => {
    if (selectedTableMeta && selectedTableMeta.columns.length > 0) {
      const cols = selectedTableMeta.columns;
      const detected = autoDetectAuditColumns(cols);

      // Check if current mapping columns belong to this table
      const current = useRoomStore.getState().mapping;
      const names = cols.map((c) => c.name);
      const isValidCurrent =
        current.particularsColumn &&
        names.includes(current.particularsColumn) &&
        (current.categoryColumn ? names.includes(current.categoryColumn) : true);

      if (!isValidCurrent) {
        setMapping(detected);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTableMeta, setMapping]);

  const handleUpdateMapping = (updated: Partial<AuditColumnMapping>) => {
    setMapping(updated);
  };

  const tableNames = useMemo(() => availableTables.map((t) => t.fullName), [availableTables]);

  return {
    availableTables,
    tableNames,
    selectedTable,
    setSelectedTable,
    selectedTableMeta,
    columnNames,
    mapping,
    updateMapping: handleUpdateMapping,
  };
}
