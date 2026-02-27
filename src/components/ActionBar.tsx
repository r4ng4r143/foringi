import { useStore } from '../store/store';
import { useSearch } from '../hooks/useSearch';
import { usePersistence } from '../hooks/usePersistence';
import { sendWsMessage } from '../hooks/useWebSocket';
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
  const [notifyError, setNotifyError] = useState('');

  const handleStart = () => {
    if (!hasSolution) {
      startSearch('astar');
    }
  };

  const handleNotify = () => {
    if (!solution) return;
    setNotifying(true);
    setNotifyError('');
    try {
      sendWsMessage({ type: 'solution', seatings: solution.seatings, score: solution.score ?? 0 });
    } catch {
      setNotifyError('Failed to notify — check your connection');
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

      {notifyError && <p className={styles.error}>{notifyError}</p>}

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
