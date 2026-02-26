import { useEffect, useCallback, useRef } from 'react';
import { useStore, suppressSync } from '../store/store';
import { saveState, loadState, exportToFile, importFromFile } from '../persistence/storage';

export function usePersistence() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const saved = loadState();
    if (saved) {
      suppressSync(() => {
        useStore.setState({
          players: saved.players,
          nextPlayerId: saved.nextPlayerId,
          groups: saved.groups,
          nextGroupId: saved.nextGroupId,
        });
      });
    }
  }, []);

  useEffect(() => {
    return useStore.subscribe(
      (state) => {
        saveState(state.players, state.nextPlayerId, state.groups, state.nextGroupId);
      },
    );
  }, []);

  const handleExport = useCallback(() => {
    const { players, nextPlayerId, groups, nextGroupId } = useStore.getState();
    exportToFile(players, nextPlayerId, groups, nextGroupId);
  }, []);

  const handleImport = useCallback(async (file: File) => {
    const data = await importFromFile(file);
    useStore.setState({
      players: data.players,
      nextPlayerId: data.nextPlayerId,
      groups: data.groups,
      nextGroupId: data.nextGroupId,
    });
  }, []);

  return { handleExport, handleImport };
}
