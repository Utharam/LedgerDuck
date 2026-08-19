import duckLogoDark from '@assets/duck-dark.svg';
import duckLogo from '@assets/duck.svg';
import { HotkeyPill } from '@components/hotkey-pill';
import { SpotlightMenu } from '@components/spotlight';
import { getOrCreateAuditLogTab } from '@controllers/tab/audit-log-tab-controller';
import { AuditorGuideModal } from '@features/auditor-guide';
import { SchemaPromptHelperModal } from '@features/schema-prompt-helper';
import { useOsModifierIcon } from '@hooks/use-os-modifier-icon';
import { Badge, Button, Group, Text, TextInput, Tooltip } from '@mantine/core';
import { spotlight } from '@mantine/spotlight';
import { useAuditPanelStore } from '@store/audit-panel-store';
import {
  IconBook,
  IconChecklist,
  IconHistory,
  IconSearch,
  IconSparkles,
} from '@tabler/icons-react';
import { setDataTestId } from '@utils/test-id';
import { cn } from '@utils/ui/styles';
import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

export const Header = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const mod = useOsModifierIcon();
  const isSettingsPage = location.pathname.includes('settings');

  const { isOpen: auditPanelOpen, togglePanel: toggleAuditPanel } = useAuditPanelStore();
  const [promptHelperOpened, setPromptHelperOpened] = useState(false);
  const [auditorGuideOpened, setAuditorGuideOpened] = useState(false);

  const logoSection = isSettingsPage ? (
    <Group className="gap-2">
      <Text component="button" onClick={() => navigate('/')} size="xs" c="text-secondary">
        HOME
      </Text>
      <Text size="xs">/</Text>
      <Text size="xs">SETTINGS</Text>
    </Group>
  ) : (
    <Group className="gap-3 cursor-default">
      <Tooltip label="LedgerDuck (Forked from PondPilot under AGPL-3.0 by T1A)" position="bottom" openDelay={400}>
        <div>
          <img src={duckLogo} alt="LedgerDuck" className="w-8 h-8 dark:hidden" />
          <img src={duckLogoDark} alt="LedgerDuck" className="w-8 h-8 hidden dark:block" />
        </div>
      </Tooltip>
      <Group gap={6} align="center">
        <Text size="lg" fw={700} className="text-textPrimary-light dark:text-textPrimary-dark">
          LedgerDuck
        </Text>
        <Badge size="xs" variant="light" color="blue" radius="sm">
          Audit Edition
        </Badge>
        <Text size="xs" c="text-secondary" className="font-mono ml-1 select-none">
          {__VERSION__}
        </Text>
      </Group>
    </Group>
  );

  return (
    <>
      <SpotlightMenu />
      <SchemaPromptHelperModal
        opened={promptHelperOpened}
        onClose={() => setPromptHelperOpened(false)}
      />
      <AuditorGuideModal
        opened={auditorGuideOpened}
        onClose={() => setAuditorGuideOpened(false)}
      />

      <Group justify="space-between" className="h-full">
        <Group gap={30} flex={1}>
          {logoSection}
        </Group>

        <TextInput
          flex={1}
          data-testid={setDataTestId('spotlight-trigger-input')}
          className="cursor-pointer max-w-[360px] min-w-[240px]"
          classNames={{
            input: cn(
              'bg-backgroundSecondary-light border-0 placeholder-textSecondary-light h-[36px] rounded-full',
              'dark:bg-backgroundSecondary-dark dark:placeholder-textSecondary-dark',
            ),
          }}
          readOnly
          leftSection={
            <Group gap={4} onClick={spotlight.open}>
              <IconSearch size={18} className="dark:text-iconDefault-dark text-iconDefault-light" />{' '}
              <Text c="text-secondary" className="text-sm">
                Search
              </Text>
            </Group>
          }
          leftSectionProps={{ onClick: spotlight.open }}
          rightSectionProps={{
            onClick: spotlight.open,
            className: 'w-auto pr-1',
          }}
          rightSectionWidth={74}
          leftSectionWidth={100}
          rightSection={<HotkeyPill value={[mod.command, 'K']} />}
          pointer
          onClick={(e) => {
            e.stopPropagation();
            spotlight.open();
          }}
        />

        <Group flex={1} justify="end" gap={8}>
          <Tooltip label={auditPanelOpen ? "Hide Right Audit Panel" : "Show Right Audit Panel (Templates & Query Manager)"}>
            <Button
              size="xs"
              variant={auditPanelOpen ? 'filled' : 'light'}
              color="blue"
              leftSection={<IconChecklist size={14} />}
              onClick={toggleAuditPanel}
            >
              Audit Panel
            </Button>
          </Tooltip>

          <Tooltip label="Open Zero-Knowledge AI Prompt Helper (No data leaves your device)">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconSparkles size={14} />}
              onClick={() => setPromptHelperOpened(true)}
            >
              AI Helper
            </Button>
          </Tooltip>

          <Tooltip label="View Audit Trail & SQL Execution Log">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconHistory size={15} />}
              onClick={() => getOrCreateAuditLogTab({ setActive: true })}
            >
              Audit Trail
            </Button>
          </Tooltip>

          <Tooltip label="Auditor User Guide & Readme">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              leftSection={<IconBook size={15} />}
              onClick={() => setAuditorGuideOpened(true)}
            >
              Guide
            </Button>
          </Tooltip>
        </Group>
      </Group>
    </>
  );
});
