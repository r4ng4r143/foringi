import { useStore } from '../store/store';
import { useSearch } from '../hooks/useSearch';
import { usePersistence } from '../hooks/usePersistence';
import { postSolution } from '../api/client';
import styles from './ActionBar.module.css';
import { useRef, useState } from 'react';

export function ActionBar() {
  const isSearching = useStore(s => s.isSearching);
  const progress = useStore(s => s.searchProgress);
  const playerCount = useStore(s => Object.keys(s.players).length);
  const hasSolution = useStore(s => s.solution !== null);
  const { startSearch, cancelSearch } = useSearch();
  const solution = useStore(s => s.solution);
  const sessionCode = useStore(s => s.sessionCode);
  const hostToken = useStore(s => s.hostToken);
  const { handleExport, handleImport } = usePersistence();
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifying, setNotifying] = useState(false);

  const handleStart = () => {
    if (!hasSolution) {
      startSearch('astar');
    }
  };

  const handleNotify = async () => {
    if (!solution || !sessionCode || hostToken == null) return;
    setNotifying(true);
    try {
      await postSolution(sessionCode, hostToken, solution);
    } catch (err) {
      console.error('Failed to notify players:', err);
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        <button
          className={styles.start}
          disabled={isSearching || playerCount === 0 || hasSolution}
          onClick={handleStart}
        >
          {isSearching ? 'Starting...' : hasSolution ? 'Started' : 'Start'}
        </button>
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
        {hasSolution && (
          <button
            className={styles.notify}
            disabled={notifying}
            onClick={handleNotify}
          >
            {notifying ? 'Sending...' : 'Notify Players'}
          </button>
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
