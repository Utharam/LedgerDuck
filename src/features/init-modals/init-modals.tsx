import { useFeatureContext } from '@features/feature-context';
import {
  ONBOARDING_MODAL_OPTIONS,
  OnboardingModalContent,
} from '@features/onboarding-modal-content';
import { useDidUpdate, useLocalStorage } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { LOCAL_STORAGE_KEYS } from '@models/local-storage';
import { useAppStore } from '@store/app-store';

export const InitModals = () => {
  const { isFileAccessApiSupported, isMobileDevice } = useFeatureContext();
  const appLoadState = useAppStore.use.appLoadState();

  const [isOnboardingShown, setIsOnboardingShown] = useLocalStorage({
    key: LOCAL_STORAGE_KEYS.ONBOARDING_SHOWN,
    defaultValue: false,
  });

  const [whatsNewVersionShown, setWhatsNewVersionShown] = useLocalStorage({
    key: LOCAL_STORAGE_KEYS.WHATS_NEW_VERSION_SHOWN,
  });

  const setCurrentVersion = () => {
    setWhatsNewVersionShown(__VERSION__);
  };

  useDidUpdate(() => {
    if (!isFileAccessApiSupported || isMobileDevice) {
      return;
    }
    if (appLoadState === 'ready') {
      // If a user is using the app for the first time, show the Onboarding modal
      if (!isOnboardingShown) {
        setCurrentVersion();

        const modalId = modals.open({
          ...ONBOARDING_MODAL_OPTIONS,
          onClose: () => setIsOnboardingShown(true),
          children: <OnboardingModalContent onClose={() => modals.close(modalId)} />,
        });
      }

      // Set the current version by default
      setCurrentVersion();
    }
  }, [appLoadState]);

  return null;
};
