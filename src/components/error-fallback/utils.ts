import { APP_DB_NAME } from '@models/persisted-store';

/* eslint-disable no-alert */
export const deleteApplicationData = async () => {
  const confirmDelete = window.confirm(
    'Clear LedgerDuck\u2019s saved workspace? Your original files on your computer are NOT affected — only this website\u2019s saved checks and settings are removed. This cannot be undone.',
  );

  if (!confirmDelete) {
    return;
  }

  try {
    // TODO: Maybe we should't delete the entire database?
    indexedDB.deleteDatabase(APP_DB_NAME);

    window.location.reload();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to delete application data: ', error);
  }
};
