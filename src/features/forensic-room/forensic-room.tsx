/**
 * Forensic Room for LedgerDuck 2.0
 * Comprehensive full-screen substantive audit testing & anomaly investigation laboratory.
 * Licensed under AGPL-3.0
 */

import { useDuckDBConnectionPool } from '@features/duckdb-context/duckdb-context';
import { useAuditTables } from '@hooks/use-audit-tables';
import {
  Alert,
  Box,
  Group,
  ScrollArea,
  SegmentedControl,
  Stack,
  Tabs,
  TextInput,
} from '@mantine/core';
import { AuditTemplate } from '@models/audit-template';
import { LOCAL_STORAGE_KEYS } from '@models/local-storage';
import { useRoomStore } from '@store/room-store';
import {
  IconAlertCircle,
  IconChecklist,
  IconSparkles,
} from '@tabler/icons-react';
import { AUDIT_TEMPLATES } from '@utils/audit-templates';
import { insertOrOpenQuery } from '@utils/editor-insert';
import { downloadCsvFile, generateWorkpaperCsv } from '@utils/workpaper-export';
import { useCallback, useMemo, useState } from 'react';

import { ForensicHeader } from './components/forensic-header';
import { PROFILE_PACKS, ProfilePacks } from './components/profile-packs';
import { SubstantiveCard } from './components/substantive-card';
import { SubstantiveTestResult } from './types';

export const ForensicRoom = () => {
  const pool = useDuckDBConnectionPool();
  const { setActiveRoom } = useRoomStore();

  const {
    availableTables,
    tableNames,
    selectedTable,
    setSelectedTable,
    columnNames,
    mapping,
    updateMapping,
  } = useAuditTables();

  const [resultsMap, setResultsMap] = useState<Map<string, SubstantiveTestResult>>(new Map());
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter core substantive tests (exclude vocabulary tests which belong in Vocabulary Room)
  const substantiveTemplates = useMemo(() => {
    return AUDIT_TEMPLATES.filter((t) => t.category !== 'Vocabulary');
  }, []);

  const filteredTemplates = useMemo(() => {
    return substantiveTemplates.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'all' ||
        t.category.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [substantiveTemplates, searchQuery, categoryFilter]);

  // Execute a single audit test
  const handleRunTest = useCallback(
    async (template: AuditTemplate) => {
      if (!pool || !selectedTable) return;

      const startTime = Date.now();
      setResultsMap((prev) => {
        const next = new Map(prev);
        next.set(template.id, {
          status: 'running',
          findingsCount: 0,
          columns: [],
          sampleRows: [],
        });
        return next;
      });

      try {
        const sql = template.generateSql(selectedTable, mapping);
        const result = await pool.query(sql);
        const executionTimeMs = Date.now() - startTime;

        const rawRows = result.toArray();
        const columns = result.schema.fields.map((f: any) => f.name);

        // Convert arrow proxy objects to plain JSON objects
        const cleanRows = rawRows.map((r: any) => {
          const obj: Record<string, any> = {};
          for (const col of columns) {
            const val = r[col];
            obj[col] = typeof val === 'bigint' ? Number(val) : val;
          }
          return obj;
        });

        setResultsMap((prev) => {
          const next = new Map(prev);
          next.set(template.id, {
            status: 'success',
            findingsCount: cleanRows.length,
            columns,
            sampleRows: cleanRows.slice(0, 5),
            allRows: cleanRows,
            executionTimeMs,
          });
          return next;
        });
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.FIRST_CHECK_RUN, 'true');
        } catch {
          // ignore private-mode/quota errors
        }
      } catch (err: any) {
        setResultsMap((prev) => {
          const next = new Map(prev);
          next.set(template.id, {
            status: 'error',
            findingsCount: 0,
            columns: [],
            sampleRows: [],
            errorMessage: err?.message || 'Failed to execute query in DuckDB',
          });
          return next;
        });
      }
    },
    [pool, selectedTable, mapping],
  );

  // Run all substantive tests in batch
  const handleRunAllTests = useCallback(async () => {
    if (!pool || !selectedTable || isBatchRunning) return;
    setIsBatchRunning(true);

    try {
      for (const template of substantiveTemplates) {
        await handleRunTest(template);
      }
    } finally {
      setIsBatchRunning(false);
    }
  }, [pool, selectedTable, isBatchRunning, substantiveTemplates, handleRunTest]);

  // Open in Query Room (SQL Editor)
  const handleOpenInQueryRoom = useCallback(
    (template: AuditTemplate) => {
      if (!selectedTable) return;
      const sql = template.generateSql(selectedTable, mapping);
      insertOrOpenQuery({
        sql,
        queryTitle: template.title,
        targetMode: 'new-tab',
        scriptName: `forensic_${template.id}`,
      });
      setActiveRoom('query');
    },
    [selectedTable, mapping, setActiveRoom],
  );

  // Open pack query in Query Room
  const handleOpenPackQuery = useCallback(
    (sql: string, title: string, scriptName: string) => {
      insertOrOpenQuery({
        sql,
        queryTitle: title,
        targetMode: 'new-tab',
        scriptName,
      });
      setActiveRoom('query');
    },
    [setActiveRoom],
  );

  // Export CSV workpaper for single test
  const handleExportTestCsv = useCallback(
    (template: AuditTemplate) => {
      const res = resultsMap.get(template.id);
      if (!res || !res.allRows) return;

      const csv = generateWorkpaperCsv(
        {
          title: `WP - ${template.title}`,
          tableName: selectedTable,
          testObjective: template.description,
          findingsCount: res.findingsCount,
        },
        res.columns,
        res.allRows,
      );

      downloadCsvFile(`workpaper_${template.id}_${selectedTable}`, csv);
    },
    [resultsMap, selectedTable],
  );

  // Export full package summary
  const handleExportPackage = useCallback(() => {
    const summaryRows: Record<string, any>[] = [];

    for (const template of substantiveTemplates) {
      const res = resultsMap.get(template.id);
      summaryRows.push({
        test_id: template.id,
        test_name: template.title,
        category: template.category,
        status: res?.status || 'not run',
        findings_count: res?.findingsCount ?? 0,
        execution_time_ms: res?.executionTimeMs ?? 0,
      });
    }

    const headers = [
      'test_id',
      'test_name',
      'category',
      'status',
      'findings_count',
      'execution_time_ms',
    ];
    const totalFindings = summaryRows.reduce((sum, r) => sum + r.findings_count, 0);

    const csv = generateWorkpaperCsv(
      {
        title: 'Substantive Audit Testing Package Summary',
        tableName: selectedTable,
        testObjective: 'Consolidated results of all substantive audit procedures',
        findingsCount: totalFindings,
      },
      headers,
      summaryRows,
    );

    downloadCsvFile(`audit_package_summary_${selectedTable}`, csv);
  }, [resultsMap, selectedTable, substantiveTemplates]);

  const totalAnomalies = useMemo(() => {
    let count = 0;
    for (const res of resultsMap.values()) {
      count += res.findingsCount;
    }
    return count;
  }, [resultsMap]);

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark overflow-hidden">
      {/* Top Header */}
      <ForensicHeader
        tables={tableNames}
        selectedTable={selectedTable}
        onSelectTable={setSelectedTable}
        columns={columnNames}
        mapping={mapping}
        onUpdateMapping={updateMapping}
        onRunAllTests={handleRunAllTests}
        isBatchRunning={isBatchRunning}
        totalAnomalies={totalAnomalies}
        onExportPackage={handleExportPackage}
      />

      {/* Main Workspace Content */}
      <ScrollArea className="flex-1 p-4" offsetScrollbars>
        <Stack gap={16} className="max-w-[1400px] mx-auto pb-10">
          {availableTables.length === 0 && (
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="No Data Sources Loaded"
              color="blue"
              variant="light"
              radius="md"
            >
              Please import a spreadsheet (.xlsx, .xls, .csv) or DuckDB database table in the
              Query Room first. Once loaded, you can run all automated audit checks instantly.
            </Alert>
          )}

          {availableTables.length > 0 && (
            <Tabs defaultValue="tests" radius="md">
              <Group justify="space-between" align="center" mb={14} wrap="wrap" gap={12}>
                <Tabs.List>
                  <Tabs.Tab
                    value="tests"
                    leftSection={<IconChecklist size={15} />}
                  >
                    Ready-made checks ({substantiveTemplates.length})
                  </Tabs.Tab>
                  <Tabs.Tab
                    value="packs"
                    leftSection={<IconSparkles size={15} />}
                  >
                    Check bundles ({PROFILE_PACKS.length})
                  </Tabs.Tab>
                </Tabs.List>

                {/* Search & Category Filter */}
                <Group gap={8}>
                  <TextInput
                    size="xs"
                    placeholder="Search checks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    className="w-[200px]"
                  />

                  <SegmentedControl
                    size="xs"
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    data={[
                      { value: 'all', label: 'All' },
                      { value: 'integrity', label: 'Integrity' },
                      { value: 'fraud risk', label: 'Fraud Risk' },
                      { value: 'materiality', label: 'Materiality' },
                      { value: 'compliance', label: 'Compliance' },
                    ]}
                  />
                </Group>
              </Group>

              {/* Tab 1: Substantive Test Cards */}
              <Tabs.Panel value="tests">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <SubstantiveCard
                      key={template.id}
                      template={template}
                      tableName={selectedTable}
                      mapping={mapping}
                      result={resultsMap.get(template.id)}
                      onRunTest={() => handleRunTest(template)}
                      onOpenInQueryRoom={() => handleOpenInQueryRoom(template)}
                      onExportCsv={() => handleExportTestCsv(template)}
                    />
                  ))}
                </div>
              </Tabs.Panel>

              {/* Tab 2: Profile Query Packs */}
              <Tabs.Panel value="packs">
                <ProfilePacks
                  tableName={selectedTable}
                  mapping={mapping}
                  onOpenQuery={handleOpenPackQuery}
                />
              </Tabs.Panel>
            </Tabs>
          )}
        </Stack>
      </ScrollArea>
    </Box>
  );
};
