/**
 * Vocabulary Map (Ledger Scrutiny Room) for LedgerDuck 2.0
 * Interactive 3-pane workbench for forward & reverse ledger scrutiny,
 * multi-classification detection, and voucher evidence drill-down.
 * Licensed under AGPL-3.0
 */

import { useDuckDBConnectionPool } from '@features/duckdb-context/duckdb-context';
import { useAppTheme } from '@hooks/use-app-theme';
import { useAuditTables } from '@hooks/use-audit-tables';
import { Alert, Box } from '@mantine/core';
import { useRoomStore } from '@store/room-store';
import { IconAlertCircle } from '@tabler/icons-react';
import { insertOrOpenQuery } from '@utils/editor-insert';
import {
  ensureDefaultSynonyms,
  expandWithSynonyms,
  getCustomStopwords,
  getSynonymGroups,
  getUboRules,
} from '@utils/vocab-settings';
import {
  buildLedgerBucketsSql,
  buildMultiClassificationSql,
  buildReverseLedgerWordsSql,
  buildVocabularyFrequencySql,
  buildWordLedgerMixSql,
  buildWordRowsFilteredSql,
  findVariantCandidates,
  VariantCandidate,
} from '@utils/vocabulary';
import { downloadCsvFile, generateWorkpaperCsv } from '@utils/workpaper-export';
import { Allotment } from 'allotment';
import { useCallback, useEffect, useState } from 'react';

import { DistributionPane } from './components/distribution-pane';
import { EvidencePane } from './components/evidence-pane';
import { KeywordsPane } from './components/keywords-pane';
import { VocabularyRoomControls } from './components/vocabulary-room-controls';
import {
  InvestigationMode,
  LedgerBucket,
  LedgerDistribution,
  MultiClassificationItem,
  VocabToken,
} from './types';

export const VocabularyRoom = () => {
  const pool = useDuckDBConnectionPool();
  const colorScheme = useAppTheme();
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

  // Mode
  const [mode, setMode] = useState<InvestigationMode>('forward');

  // Pane 1 Data
  const [tokens, setTokens] = useState<VocabToken[]>([]);
  const [buckets, setBuckets] = useState<LedgerBucket[]>([]);
  const [multiItems, setMultiItems] = useState<MultiClassificationItem[]>([]);
  const [variants, setVariants] = useState<VariantCandidate[]>([]);
  const [isPane1Loading, setIsPane1Loading] = useState(false);

  // Pane 1 Selections
  const [selectedWord, setSelectedWord] = useState('');
  const [selectedLedger, setSelectedLedger] = useState('');
  const [selectedMultiItem, setSelectedMultiItem] = useState<MultiClassificationItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<VariantCandidate | null>(null);

  // Pane 2 Data
  const [distributions, setDistributions] = useState<LedgerDistribution[]>([]);
  const [reverseWords, setReverseWords] = useState<{ word: string; occurrences: number }[]>([]);
  const [activeFilterLedger, setActiveFilterLedger] = useState('ALL');
  const [isPane2Loading, setIsPane2Loading] = useState(false);

  // Pane 3 Data
  const [evidenceRows, setEvidenceRows] = useState<Record<string, any>[]>([]);
  const [evidenceColumns, setEvidenceColumns] = useState<string[]>([]);
  const [isPane3Loading, setIsPane3Loading] = useState(false);

  // Helper: query DuckDB and return clean rows
  const queryRows = useCallback(
    async (sql: string): Promise<{ columns: string[]; rows: Record<string, any>[] }> => {
      if (!pool) return { columns: [], rows: [] };
      const res = await pool.query(sql);
      const rawRows = res.toArray();
      const columns = res.schema.fields.map((f: any) => f.name);
      const rows = rawRows.map((r: any) => {
        const obj: Record<string, any> = {};
        for (const c of columns) {
          const v = r[c];
          obj[c] = typeof v === 'bigint' ? Number(v) : v;
        }
        return obj;
      });
      return { columns, rows };
    },
    [pool],
  );

  // 1. Fetch Pane 1 data whenever table, column mapping, or mode changes
  const fetchPane1Data = useCallback(async () => {
    if (!pool || !selectedTable) return;
    setIsPane1Loading(true);
    ensureDefaultSynonyms();

    try {
      const extraStopwords = getCustomStopwords();
      if (mode === 'forward') {
        const sourceCol = mapping.particularsColumn || 'particulars';
        const sql = buildVocabularyFrequencySql(selectedTable, sourceCol, 150, extraStopwords);
        const { rows } = await queryRows(sql);
        const vocabTokens: VocabToken[] = rows.map((r) => ({
          word: String(r.word ?? ''),
          occurrences: Number(r.occurrences ?? 0),
          n_rows: Number(r.n_rows ?? 0),
          pct_rows: Number(r.pct_rows ?? 0),
        }));
        setTokens(vocabTokens);
        if (vocabTokens.length > 0 && !selectedWord) {
          setSelectedWord(vocabTokens[0].word);
        }
      } else if (mode === 'reverse') {
        const catCol = mapping.categoryColumn || 'category';
        const sql = buildLedgerBucketsSql(selectedTable, catCol, 100);
        const { rows } = await queryRows(sql);
        const ledgerBuckets: LedgerBucket[] = rows.map((r) => ({
          ledger: String(r.ledger ?? ''),
          n_rows: Number(r.n_rows ?? 0),
        }));
        setBuckets(ledgerBuckets);
        if (ledgerBuckets.length > 0 && !selectedLedger) {
          setSelectedLedger(ledgerBuckets[0].ledger);
        }
      } else if (mode === 'multi-classification') {
        const sourceCol = mapping.particularsColumn || 'particulars';
        const catCol = mapping.categoryColumn || 'category';
        const sql = buildMultiClassificationSql(selectedTable, sourceCol, catCol, 100);
        const { rows } = await queryRows(sql);
        const items: MultiClassificationItem[] = rows.map((r) => ({
          narration: String(r.narration ?? ''),
          distinct_ledgers: Number(r.distinct_ledgers ?? 0),
          total_rows: Number(r.total_rows ?? 0),
          ledgers_used: String(r.ledgers_used ?? ''),
        }));
        setMultiItems(items);
        if (items.length > 0 && !selectedMultiItem) {
          setSelectedMultiItem(items[0]);
        }
      } else if (mode === 'variants') {
        // Fetch top words and compute variants in JS
        const sourceCol = mapping.particularsColumn || 'particulars';
        const sql = buildVocabularyFrequencySql(selectedTable, sourceCol, 200, extraStopwords);
        const { rows } = await queryRows(sql);
        const wordList = rows.map((r) => String(r.word ?? ''));
        const cand = findVariantCandidates(wordList, 0.8, 50);
        setVariants(cand);
        if (cand.length > 0 && !selectedVariant) {
          setSelectedVariant(cand[0]);
        }
      }
    } catch (err) {
      console.warn('Failed to load Pane 1 vocabulary data:', err);
    } finally {
      setIsPane1Loading(false);
    }
  }, [
    pool,
    selectedTable,
    mapping.particularsColumn,
    mapping.categoryColumn,
    mode,
    queryRows,
    selectedWord,
    selectedLedger,
    selectedMultiItem,
    selectedVariant,
  ]);

  useEffect(() => {
    fetchPane1Data();
  }, [fetchPane1Data]);

  // 2. Fetch Pane 2 (Ledger Mix or Reverse Words) when selection changes
  const fetchPane2Data = useCallback(async () => {
    if (!pool || !selectedTable) return;
    setIsPane2Loading(true);

    try {
      const extraStopwords = getCustomStopwords();
      const synonymGroups = getSynonymGroups();
      const uboRules = getUboRules();
      const isUboViolation = (word: string, ledger: string): boolean =>
        uboRules.some(
          (r) =>
            word.toLowerCase().includes(r.word.toLowerCase()) &&
            ledger.trim().toLowerCase() === r.forbiddenLedger.trim().toLowerCase(),
        );
      if (mode === 'forward' && selectedWord) {
        const sourceCol = mapping.particularsColumn || 'particulars';
        const catCol = mapping.categoryColumn || 'category';
        const synonyms = expandWithSynonyms(selectedWord, synonymGroups).filter(
          (w) => w !== selectedWord.toLowerCase(),
        );
        const sql = buildWordLedgerMixSql(selectedTable, sourceCol, catCol, selectedWord, synonyms);
        const { rows } = await queryRows(sql);
        const dists: LedgerDistribution[] = rows.map((r) => ({
          ledger: String(r.ledger ?? ''),
          n_rows: Number(r.n_rows ?? 0),
          pct: Number(r.pct ?? 0),
          isAnomaly: isUboViolation(selectedWord, String(r.ledger ?? '')),
        }));
        setDistributions(dists);
      } else if (mode === 'reverse' && selectedLedger) {
        const sourceCol = mapping.particularsColumn || 'particulars';
        const catCol = mapping.categoryColumn || 'category';
        const sql = buildReverseLedgerWordsSql(
          selectedTable,
          sourceCol,
          catCol,
          selectedLedger,
          50,
          extraStopwords,
        );
        const { rows } = await queryRows(sql);
        setReverseWords(
          rows.map((r) => ({
            word: String(r.word ?? ''),
            occurrences: Number(r.occurrences ?? 0),
          })),
        );
      } else if (mode === 'multi-classification' && selectedMultiItem) {
        const sourceCol = mapping.particularsColumn || 'particulars';
        const catCol = mapping.categoryColumn || 'category';
        const sql = buildWordLedgerMixSql(
          selectedTable,
          sourceCol,
          catCol,
          selectedMultiItem.narration,
        );
        const { rows } = await queryRows(sql);
        const dists: LedgerDistribution[] = rows.map((r) => ({
          ledger: String(r.ledger ?? ''),
          n_rows: Number(r.n_rows ?? 0),
          pct: Number(r.pct ?? 0),
        }));
        setDistributions(dists);
      }
    } catch (err) {
      console.warn('Failed to load Pane 2 distribution data:', err);
    } finally {
      setIsPane2Loading(false);
    }
  }, [
    pool,
    selectedTable,
    mapping.particularsColumn,
    mapping.categoryColumn,
    mode,
    selectedWord,
    selectedLedger,
    selectedMultiItem,
    queryRows,
  ]);

  useEffect(() => {
    fetchPane2Data();
  }, [fetchPane2Data]);

  // 3. Fetch Pane 3 (Evidence Rows) when word, filter ledger, or selection changes
  const fetchPane3Data = useCallback(async () => {
    if (!pool || !selectedTable) return;

    let targetWord = '';
    let targetLedger = activeFilterLedger;

    if (mode === 'forward') {
      targetWord = selectedWord;
    } else if (mode === 'reverse') {
      targetWord = activeFilterLedger !== 'ALL' ? activeFilterLedger : '';
      targetLedger = selectedLedger;
    } else if (mode === 'multi-classification') {
      targetWord = selectedMultiItem?.narration || '';
    } else if (mode === 'variants') {
      targetWord = selectedVariant?.a || '';
    }

    if (!targetWord && (!targetLedger || targetLedger === 'ALL')) {
      setEvidenceRows([]);
      return;
    }

    setIsPane3Loading(true);
    try {
      const sourceCol = mapping.particularsColumn || 'particulars';
      const catCol = mapping.categoryColumn || 'category';
      const synonyms = targetWord
        ? expandWithSynonyms(targetWord, getSynonymGroups()).filter(
            (w) => w !== targetWord.toLowerCase(),
          )
        : [];
      const sql = buildWordRowsFilteredSql(
        selectedTable,
        sourceCol,
        catCol,
        targetWord,
        targetLedger,
        300,
        synonyms,
      );
      const { columns, rows } = await queryRows(sql);
      setEvidenceColumns(columns);
      setEvidenceRows(rows);
    } catch (err) {
      console.warn('Failed to load Pane 3 evidence rows:', err);
    } finally {
      setIsPane3Loading(false);
    }
  }, [
    pool,
    selectedTable,
    mapping.particularsColumn,
    mapping.categoryColumn,
    mode,
    selectedWord,
    selectedLedger,
    selectedMultiItem,
    selectedVariant,
    activeFilterLedger,
    queryRows,
  ]);

  useEffect(() => {
    fetchPane3Data();
  }, [fetchPane3Data]);

  // Open evidence in Query Room
  const handleOpenInQueryRoom = useCallback(() => {
    if (!selectedTable) return;
    const sourceCol = mapping.particularsColumn || 'particulars';
    const catCol = mapping.categoryColumn || 'category';
    const word =
      mode === 'forward'
        ? selectedWord
        : mode === 'multi-classification'
        ? selectedMultiItem?.narration || ''
        : mode === 'variants'
        ? selectedVariant?.a || ''
        : activeFilterLedger !== 'ALL'
        ? activeFilterLedger
        : '';

    const sql = buildWordRowsFilteredSql(
      selectedTable,
      sourceCol,
      catCol,
      word,
      mode === 'reverse' ? selectedLedger : activeFilterLedger,
      500,
    );

    insertOrOpenQuery({
      sql,
      queryTitle: `Evidence: "${word}"`,
      targetMode: 'new-tab',
      scriptName: `vocab_evidence_${word.slice(0, 10)}`,
    });
    setActiveRoom('query');
  }, [
    selectedTable,
    mapping,
    mode,
    selectedWord,
    selectedLedger,
    selectedMultiItem,
    selectedVariant,
    activeFilterLedger,
    setActiveRoom,
  ]);

  // Export evidence CSV workpaper
  const handleExportWorkpaper = useCallback(() => {
    if (evidenceRows.length === 0) return;
    const word =
      mode === 'forward'
        ? selectedWord
        : mode === 'multi-classification'
        ? selectedMultiItem?.narration || ''
        : mode === 'reverse'
        ? selectedLedger
        : selectedVariant?.a || 'variants';

    const csv = generateWorkpaperCsv(
      {
        title: `WP - Narration Scrutiny: "${word}"`,
        tableName: selectedTable,
        testObjective: `Voucher evidence supporting ledger classification analysis for keyword "${word}"`,
        findingsCount: evidenceRows.length,
      },
      evidenceColumns,
      evidenceRows,
    );

    downloadCsvFile(`workpaper_vocab_${word.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedTable}`, csv);
  }, [evidenceRows, evidenceColumns, mode, selectedWord, selectedLedger, selectedMultiItem, selectedVariant, selectedTable]);

  return (
    <Box className="h-full flex flex-col bg-backgroundPrimary-light dark:bg-backgroundPrimary-dark overflow-hidden">
      {/* Top Toolbar */}
      <VocabularyRoomControls
        tables={tableNames}
        selectedTable={selectedTable}
        onSelectTable={(t) => {
          setSelectedTable(t);
          setSelectedWord('');
          setSelectedLedger('');
          setActiveFilterLedger('ALL');
        }}
        columns={columnNames}
        mapping={mapping}
        onUpdateMapping={updateMapping}
        mode={mode}
        onChangeMode={(m) => {
          setMode(m);
          setActiveFilterLedger('ALL');
        }}
        onRefresh={() => {
          fetchPane1Data();
          fetchPane2Data();
          fetchPane3Data();
        }}
        isLoading={isPane1Loading || isPane2Loading || isPane3Loading}
      />

      {/* Main 3-Pane Workbench */}
      <Box className="flex-1 overflow-hidden">
        {availableTables.length === 0 && (
          <Box p={20}>
            <Alert
              icon={<IconAlertCircle size={18} />}
              title="No Data Sources Loaded"
              color="blue"
              variant="light"
              radius="md"
            >
              Please import a spreadsheet or table in the Query Room to begin interactive
              narration & ledger scrutiny.
            </Alert>
          </Box>
        )}

        {availableTables.length > 0 && (
          <Allotment
            className={colorScheme === 'dark' ? 'custom-allotment-dark' : 'custom-allotment'}
          >
            {/* Pane 1: Keywords / Buckets */}
            <Allotment.Pane preferredSize={280} minSize={200} maxSize={420}>
              <KeywordsPane
                mode={mode}
                tokens={tokens}
                buckets={buckets}
                multiItems={multiItems}
                variants={variants}
                selectedWord={selectedWord}
                onSelectWord={(w) => {
                  setSelectedWord(w);
                  setActiveFilterLedger('ALL');
                }}
                selectedLedger={selectedLedger}
                onSelectLedger={(l) => {
                  setSelectedLedger(l);
                  setActiveFilterLedger('ALL');
                }}
                selectedMultiItem={selectedMultiItem}
                onSelectMultiItem={(item) => {
                  setSelectedMultiItem(item);
                  setActiveFilterLedger('ALL');
                }}
                selectedVariant={selectedVariant}
                onSelectVariant={(v) => {
                  setSelectedVariant(v);
                  setActiveFilterLedger('ALL');
                }}
                isLoading={isPane1Loading}
              />
            </Allotment.Pane>

            {/* Pane 2: Cross-Column Distribution */}
            <Allotment.Pane preferredSize={340} minSize={240} maxSize={500}>
              <DistributionPane
                mode={mode}
                selectedWord={selectedWord}
                selectedLedger={selectedLedger}
                selectedMultiItem={selectedMultiItem}
                selectedVariant={selectedVariant}
                distributions={distributions}
                reverseWords={reverseWords}
                activeFilterLedger={activeFilterLedger}
                onSelectFilterLedger={setActiveFilterLedger}
                isLoading={isPane2Loading}
              />
            </Allotment.Pane>

            {/* Pane 3: Transaction Rows Evidence */}
            <Allotment.Pane preferredSize={600} minSize={320}>
              <EvidencePane
                tableName={selectedTable}
                word={
                  mode === 'forward'
                    ? selectedWord
                    : mode === 'multi-classification'
                    ? selectedMultiItem?.narration || ''
                    : mode === 'variants'
                    ? selectedVariant?.a || ''
                    : activeFilterLedger !== 'ALL'
                    ? activeFilterLedger
                    : ''
                }
                ledgerFilter={mode === 'reverse' ? selectedLedger : activeFilterLedger}
                columns={evidenceColumns}
                rows={evidenceRows}
                dateCol={mapping.dateColumn}
                particularsCol={mapping.particularsColumn}
                categoryCol={mapping.categoryColumn}
                amountCol={mapping.amountColumn}
                onOpenInQueryRoom={handleOpenInQueryRoom}
                onExportWorkpaper={handleExportWorkpaper}
                isLoading={isPane3Loading}
              />
            </Allotment.Pane>
          </Allotment>
        )}
      </Box>
    </Box>
  );
};
