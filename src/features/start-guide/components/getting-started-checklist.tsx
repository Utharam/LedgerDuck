/**
 * First-run checklist for LedgerDuck start page.
 * Three steps an accountant can finish in minutes; progress is detected
 * from app state, dismissal persists in localStorage.
 * Licensed under AGPL-3.0
 */

import { ActionIcon, Button, Card, Group, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import { LOCAL_STORAGE_KEYS } from '@models/local-storage';
import { useAppStore } from '@store/app-store';
import { useRoomStore } from '@store/room-store';
import { IconCheck, IconChevronRight, IconX } from '@tabler/icons-react';
import { useState } from 'react';

interface GettingStartedChecklistProps {
  onOpenFile: () => void;
}

const isDismissed = (): boolean => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.GETTING_STARTED_DISMISSED) === 'true';
  } catch {
    return false;
  }
};

const hasRunFirstCheck = (): boolean => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.FIRST_CHECK_RUN) === 'true';
  } catch {
    return false;
  }
};

export const GettingStartedChecklist = ({ onOpenFile }: GettingStartedChecklistProps) => {
  const [dismissed, setDismissed] = useState<boolean>(isDismissed);
  const dataSources = useAppStore((state) => state.dataSources);
  const tabs = useAppStore((state) => state.tabs);
  const mapping = useRoomStore((state) => state.mapping);
  const setActiveRoom = useRoomStore((state) => state.setActiveRoom);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEYS.GETTING_STARTED_DISMISSED, 'true');
    } catch {
      // ignore private-mode/quota errors
    }
    setDismissed(true);
  };

  const step1Done = dataSources.size > 0;
  const step2Done = Boolean(mapping.particularsColumn && mapping.categoryColumn);
  const step3Done =
    hasRunFirstCheck() ||
    Array.from(tabs.values()).some((t) => t.type === 'script' && t.lastExecutedQuery);
  const allDone = step1Done && step2Done && step3Done;

  const steps = [
    {
      done: step1Done,
      title: 'Open your Excel sheet',
      hint: 'Drop a file above or press Open File. Your file is only read, never changed.',
      action: (
        <Button size="xs" variant="light" onClick={onOpenFile}>
          Open File
        </Button>
      ),
    },
    {
      done: step2Done,
      title: 'Match your 4 columns',
      hint: 'Tell the app which columns hold Date, Description, Ledger Head, and Amount.',
      action: (
        <Button size="xs" variant="light" onClick={() => setActiveRoom('vocabulary')}>
          Take me there
        </Button>
      ),
    },
    {
      done: step3Done,
      title: 'Run your first check',
      hint: 'Try Exact Duplicates in the Forensic room — one click, then read the rows.',
      action: (
        <Button size="xs" variant="light" onClick={() => setActiveRoom('forensic')}>
          Run a check
        </Button>
      ),
    },
  ];

  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      className="bg-backgroundSecondary-light dark:bg-backgroundSecondary-dark border-borderPrimary-light dark:border-borderPrimary-dark"
    >
      <Stack gap={10}>
        <Group justify="space-between" align="center" wrap="nowrap">
          <Group gap={8} wrap="nowrap">
            <Text size="xs" fw={700} c="text-primary" className="uppercase tracking-wider">
              {allDone ? 'You are set up' : 'Your first 3 steps'}
            </Text>
            {allDone && (
              <ThemeIcon size={18} color="teal" variant="light" radius="xl">
                <IconCheck size={12} />
              </ThemeIcon>
            )}
          </Group>
          <Tooltip label="Hide this guide">
            <ActionIcon size="xs" variant="subtle" color="gray" onClick={dismiss} aria-label="Hide guide">
              <IconX size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>

        {allDone ? (
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="xs" c="text-secondary">
              Sheet open, columns matched, first check run. Explore the Vocabulary and Forensic rooms
              from here.
            </Text>
            <Button size="xs" variant="subtle" color="gray" onClick={dismiss}>
              Hide
            </Button>
          </Group>
        ) : (
          <Stack gap={8}>
            {steps.map((step, idx) => (
              <Group key={step.title} justify="space-between" align="center" wrap="nowrap">
                <Group gap={8} wrap="nowrap" className="min-w-0">
                  <ThemeIcon
                    size={20}
                    radius="xl"
                    color={step.done ? 'teal' : 'gray'}
                    variant={step.done ? 'filled' : 'light'}
                  >
                    {step.done ? (
                      <IconCheck size={12} />
                    ) : (
                      <Text size="10px" fw={700}>
                        {idx + 1}
                      </Text>
                    )}
                  </ThemeIcon>
                  <Stack gap={0} className="min-w-0">
                    <Text
                      size="xs"
                      fw={600}
                      c={step.done ? 'text-secondary' : 'text-primary'}
                      className={step.done ? 'line-through' : undefined}
                    >
                      {step.title}
                    </Text>
                    {!step.done && (
                      <Text size="11px" c="text-secondary" className="leading-tight">
                        {step.hint}
                      </Text>
                    )}
                  </Stack>
                </Group>
                {!step.done && (
                  <Group gap={4} wrap="nowrap">
                    {step.action}
                    <IconChevronRight size={13} className="text-secondary shrink-0" />
                  </Group>
                )}
              </Group>
            ))}
          </Stack>
        )}
      </Stack>
    </Card>
  );
};
