/**
 * Auditor User Guide & Documentation Modal for LedgerDuck
 * Licensed under AGPL-3.0
 */

import { showSuccess } from '@components/app-notifications';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Collapse,
  Divider,
  Group,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import {
  IconBook,
  IconCheck,
  IconChecklist,
  IconCopy,
  IconFileSpreadsheet,
  IconHistory,
  IconLockCheck,
  IconSparkles,
} from '@tabler/icons-react';
import React from 'react';

interface AuditorGuideModalProps {
  opened: boolean;
  onClose: () => void;
}

export const AUDITOR_GUIDE_MARKDOWN = `# LedgerDuck - 5-Minute Guide for Accountants (No SQL Needed)

## The read-only promise
LedgerDuck only READS your Excel file. It never edits it, never saves into it, and never uploads it anywhere. Everything runs inside your own browser. If anything goes wrong, your original file is untouched.

## Your 4 steps
1. Open your Excel sheet (drop the file on the start page, or press Open File).
2. Match your columns: tell LedgerDuck which columns hold the Date, Description, Ledger Head, and Amount. You can re-pick anytime.
3. Run a ready-made check: Exact Duplicates, Split Transactions, Round-Sum Audit, Materiality Top 10, or Weekend Bookings. Press "Open this check", then press Run.
4. Read the rows that need review. Save them as a CSV record for your files if needed.

## The three rooms - and why
LedgerDuck has three rooms because an audit has three different jobs. Switch at the top of the screen (Alt+1, Alt+2, Alt+3).
1. Query room - your desk. Sheets live here and checks open here. You never have to type here, but every check lands here as readable SQL so anyone can verify what was tested.
2. Forensic room - the checklist. One-click checks with a Run button each. Start here when you want answers.
3. Vocabulary room - the magnifying glass. For questions no fixed check can answer: where was "taxi" posted? What hides inside Miscellaneous? Pick a word, see where it was posted, read the vouchers.

## Ready-made checks
- Exact Duplicates: same date, description, and amount appearing more than once (double payments).
- Split Transactions: same-day identical amounts that may have been split to bypass approval limits.
- Round-Sum Audit: round amounts of 1,000 or more (often estimates or manual overrides).
- Materiality Top 10: the largest transactions by value, for sampling.
- Weekend Bookings: entries posted on Saturday or Sunday.

## Asking ChatGPT safely
Use "Ask ChatGPT safely" in the app. It copies ONLY your sheet and column names - never amounts, names, or row data. Paste that safe summary into ChatGPT yourself (sending your data there directly would break the privacy promise above).

## Words you will see
- Sheet: your Excel sheet, as the app sees it.
- Description: the transaction text column (also called Narration or Particulars).
- Ledger Head: where each row was posted (also called Account Head or Category).
- Check: a ready-made test you can run.
- Rows that need review: the results worth looking at.
- Record (CSV): a saved copy of those rows for your files.
- Mapping: telling the app which column is which (step 2 above).

## How it works (optional reading)
Files are checked on import: joined (merged) cells are rejected, every row must have the same number of filled columns, and headings are tidied. DuckDB SQL runs locally in your browser; every run is logged so the work stands up.
`;

export const AuditorGuideModal: React.FC<AuditorGuideModalProps> = ({
  opened,
  onClose,
}) => {
  const clipboard = useClipboard({ timeout: 2500 });
  const [showHowItWorks, setShowHowItWorks] = React.useState(false);

  const handleCopyGuide = () => {
    clipboard.copy(AUDITOR_GUIDE_MARKDOWN);
    showSuccess({
      title: 'Safe summary copied!',
      message: 'Paste it into ChatGPT, Claude, or Gemini. It contains no amounts, names, or row data.',
      autoClose: 3500,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8} align="center">
          <ThemeIcon size="md" radius="sm" color="blue" variant="light">
            <IconBook size={18} />
          </ThemeIcon>
          <div>
            <Text fw={700} size="sm" c="text-primary">
              How to audit with LedgerDuck
            </Text>
            <Text size="xs" c="text-secondary">
              A 5-minute tour for accountants. No SQL needed.
            </Text>
          </div>
        </Group>
      }
      size="xl"
      radius="md"
      centered
    >
      <ScrollArea.Autosize mah="75vh" offsetScrollbars>
        <Stack gap={16} className="pr-2 pb-2">
          {/* Privacy Guarantee Alert */}
          <Alert
            icon={<IconLockCheck size={20} />}
            title="Read-only: your Excel file is never changed"
            color="teal"
            variant="light"
            radius="sm"
          >
            <Text size="xs" c="teal.9">
              <strong>Your financial data never leaves your computer.</strong> LedgerDuck only reads
              your file — it never edits it, saves into it, or uploads it. If anything goes wrong,
              your original file is untouched. Mapping columns wrong? Just re-pick — nothing breaks.
            </Text>
          </Alert>

          {/* Quick Overview Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="blue" variant="light">
                  <IconFileSpreadsheet size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  1. Open your Excel sheet
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Drop your file on the start page or press Open File. You will be asked whether Row 1
                holds your headings — answering wrong only affects column names, never your data.
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="orange" variant="light">
                  <IconChecklist size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  2. Match your 4 columns
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Tell the app which columns hold the Date, Description, Ledger Head, and Amount.
                Ready-made checks and word maps use this mapping — re-pick anytime.
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="grape" variant="light">
                  <IconSparkles size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  3. Run ready-made checks
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                Duplicates, split transactions, round sums, top-10 largest, weekend postings — press
                “Open this check”, then press Run. Results are rows that need review, not verdicts.
              </Text>
            </Card>

            <Card withBorder padding="sm" radius="sm" className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark">
              <Group gap={8} mb={4}>
                <ThemeIcon size="sm" color="teal" variant="light">
                  <IconHistory size={14} />
                </ThemeIcon>
                <Text size="xs" fw={600} c="text-primary">
                  4. Ask ChatGPT safely
                </Text>
              </Group>
              <Text size="xs" c="text-secondary">
                For custom questions, copy a safe summary (sheet and column names only — no amounts
                or names) and paste it into ChatGPT yourself. Sending your data there directly would
                break the privacy promise above.
              </Text>
            </Card>
          </SimpleGrid>

          <Divider label="The three rooms — and why" labelPosition="left" />
          <Text size="xs" c="text-secondary" className="leading-relaxed">
            LedgerDuck has three rooms because an audit has three different jobs. Switch between
            them at the top of the screen (or press Alt+1, Alt+2, Alt+3).
          </Text>
          <Stack gap={10}>
            <Box>
              <Text size="xs" fw={600} c="text-primary">
                1. Query room — your desk
              </Text>
              <Text size="xs" c="text-secondary" mt={2}>
                This is where your sheets live and where checks open when you press “Open this
                check”. You never have to type here — but every check lands here as readable SQL,
                so anyone can verify exactly what was tested.
              </Text>
            </Box>
            <Box>
              <Text size="xs" fw={600} c="text-primary">
                2. Forensic room — the checklist
              </Text>
              <Text size="xs" c="text-secondary" mt={2}>
                One-click checks (duplicates, split transactions, round sums, weekend postings) with
                a Run button each. Start here when you want answers: it runs the tests and shows
                only the rows that need review.
              </Text>
            </Box>
            <Box>
              <Text size="xs" fw={600} c="text-primary">
                3. Vocabulary room — the magnifying glass
              </Text>
              <Text size="xs" c="text-secondary" mt={2}>
                For questions no fixed check can answer: where was the word “taxi” posted? What is
                hiding inside Miscellaneous? Is “John” sitting in Staff Expense? Pick a word, see
                where it was posted, read the actual vouchers.
              </Text>
            </Box>
          </Stack>

          <Divider label="What each check looks for" labelPosition="left" />

          {/* Audit Templates Details */}
          <Stack gap={10}>
            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="blue">Integrity</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Exact Duplicates
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Groups by Date, Description, and Amount to find entries with count &gt; 1. Catches double payments, duplicate vendor billings, and re-entry errors.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="orange">Fraud Risk</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Potential Split Transactions
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Identifies transactions on the same date with identical amounts. Used in forensic accounting to detect structuring (splitting large invoices into sub-$5,000 chunks to avoid executive signature thresholds).
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="red">Fraud Risk</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Round-Sum Audit (&gt;= $1,000)
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Filters entries of 1,000 or more with no paise/cents. Real operating expenses usually
                have odd amounts — round sums often mean estimates or manual entries.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="violet">Materiality</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Outlier / High-Value Materiality Top 10
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Orders records by absolute magnitude for testing transactions exceeding your performance materiality threshold.
              </Text>
            </Box>

            <Box>
              <Group gap={6} align="center">
                <Badge size="xs" color="teal">Compliance</Badge>
                <Text size="xs" fw={600} c="text-primary">
                  Weekend postings
                </Text>
              </Group>
              <Text size="xs" c="text-secondary" mt={2}>
                Flags entries posted on Saturday or Sunday — unusual for most businesses, worth a look.
              </Text>
            </Box>
          </Stack>

          <Divider label="Words you will see" labelPosition="left" />
          <Stack gap={4}>
            {[
              ['Sheet', 'Your Excel sheet, as the app sees it.'],
              ['Description', 'The transaction text column (also called Narration or Particulars).'],
              ['Ledger Head', 'Where each row was posted (also called Account Head or Category).'],
              ['Check', 'A ready-made test you can run.'],
              ['Rows that need review', 'Results worth looking at — flags, not verdicts.'],
              ['Record (CSV)', 'A saved copy of those rows for your files.'],
              ['Mapping', 'Telling the app which column is which. Re-pick anytime.'],
            ].map(([term, meaning]) => (
              <Group key={term} gap={6} wrap="nowrap" align="flex-start">
                <Text size="xs" fw={600} c="text-primary" className="whitespace-nowrap">
                  {term}:
                </Text>
                <Text size="xs" c="text-secondary">
                  {meaning}
                </Text>
              </Group>
            ))}
          </Stack>

          <Button
            size="xs"
            variant="subtle"
            color="gray"
            fullWidth
            onClick={() => setShowHowItWorks((v) => !v)}
          >
            {showHowItWorks ? 'Hide how it works' : 'How it works (optional reading)'}
          </Button>
          <Collapse in={showHowItWorks}>
            <Stack gap={8}>
              <Text size="xs" c="text-secondary" className="leading-relaxed">
                On import, files are checked: joined (merged) cells are rejected, every row must have
                the same number of filled columns, and headings are tidied. Checks run as DuckDB SQL
                inside your browser and every run is logged, so the work stands up to review.
              </Text>
            </Stack>
          </Collapse>

          <Divider label="Credits & Attribution" labelPosition="left" />
          <Text size="xs" c="text-secondary">
            LedgerDuck is an open-source privacy-first fork built upon <strong>PondPilot</strong> by T1A under the AGPL-3.0 license.
          </Text>

          <Divider />

          {/* Action Buttons */}
          <Group justify="space-between" align="center">
            <Button
              size="xs"
              variant="outline"
              color="blue"
              leftSection={clipboard.copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              onClick={handleCopyGuide}
            >
              {clipboard.copied ? 'Safe summary copied!' : 'Copy safe summary for ChatGPT'}
            </Button>

            <Button size="xs" variant="default" onClick={onClose}>
              Close
            </Button>
          </Group>
        </Stack>
      </ScrollArea.Autosize>
    </Modal>
  );
};
