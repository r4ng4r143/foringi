import { useStore } from '../store/store';
import { useSearch } from '../hooks/useSearch';
import { usePersistence } from '../hooks/usePersistence';
import styles from './ActionBar.module.css';
import { useRef } from 'react';

export function ActionBar() {
  const isSearching = useStore(s => s.isSearching);
  const progress = useStore(s => s.searchProgress);
  const playerCount = useStore(s => Object.keys(s.players).length);
  const { startSearch, cancelSearch } = useSearch();
  const { handleExport, handleImport } = usePersistence();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        <button
          className={styles.cook}
          disabled={isSearching || playerCount === 0}
          onClick={() => startSearch('astar')}
        >
          {isSearching ? 'Cooking...' : 'Cook'}
        </button>
        <button
          className={styles.shuffle}
          disabled={isSearching || playerCount === 0}
          onClick={() => startSearch('random')}
        >
          Shuffle
        </button>
        {isSearching && (
          <button className={styles.cancel} onClick={cancelSearch}>Cancel</button>
        )}
        <button className={styles.secondary} onClick={handleExport}>Export</button>
        <button className={styles.secondary} onClick={() => fileRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {isSearching && (
        <div className={styles.progress}>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${progress.progressPercent}%` }}
            />
          </div>
          <span className={styles.stats}>
            {progress.nodesExpanded} nodes &middot; {progress.goalsFound} solutions
          </span>
        </div>
      )}
    </div>
  );
}
