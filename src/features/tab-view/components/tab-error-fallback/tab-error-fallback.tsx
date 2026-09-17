import { ErrorStackView } from '@components/error-stack-view';
import { Button, List, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { setDataTestId } from '@utils/test-id';
import { FallbackProps } from 'react-error-boundary';

export const TabErrorFallback = (props: FallbackProps) => {
  const { error, resetErrorBoundary } = props;
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  return (
    <div role="alert" data-testid={setDataTestId('error-fallback')}>
      <Stack p="lg">
        <Text size="xl" fw={700}>
          This view hit a problem
        </Text>
        <Text c="text-secondary" size="sm">
          Your original files are safe — LedgerDuck never changes them. Only this view needs to
          recover.
        </Text>

        <ErrorStackView error={normalizedError} />

        <Text size="xl" fw={700}>
          Follow these steps to recover:
        </Text>

        <List type="ordered" spacing="lg">
          <List.Item
            icon={
              <ThemeIcon color="background-accent" size={24} radius="xl">
                <IconRefresh size={16} />
              </ThemeIcon>
            }
          >
            <Text fw={500}>1. Try reloading the page first</Text>
            <Text c="text-secondary" size="sm" mt={4}>
              This may resolve temporary issues
            </Text>
            <Button onClick={() => window.location.reload()} mt="xs" variant="secondary">
              Reload page
            </Button>
          </List.Item>

          <List.Item
            icon={
              <ThemeIcon color="background-accent" size={24} radius="xl">
                <IconX size={16} />
              </ThemeIcon>
            }
          >
            <Text fw={500}>2. If the error persists, close this view</Text>
            <Text c="text-secondary" size="sm" mt={4}>
              This closes the view. Your data and other views are unaffected.
            </Text>
            <Button onClick={resetErrorBoundary} mt="xs">
              Close this view
            </Button>
          </List.Item>
        </List>
      </Stack>
    </div>
  );
};
