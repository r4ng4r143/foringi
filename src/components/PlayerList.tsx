import { useState } from 'react';
import { useStore } from '../store/store';
import { PlayerCard } from './PlayerCard';
import styles from './PlayerList.module.css';

export function PlayerList() {
  const players = useStore(s => s.players);
  const [query, setQuery] = useState('');

  const sorted = Object.values(players).sort((a, b) => a.name.localeCompare(b.name));
  const filtered = query
    ? sorted.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : sorted;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Signup ({sorted.length})</h3>
      {sorted.length > 0 && (
        <input
          type="text"
          className={styles.search}
          placeholder="Search players..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      )}
      <div className={styles.list}>
        {sorted.length === 0 && (
          <p className={styles.empty}>No players yet. Add some above.</p>
        )}
        {sorted.length > 0 && filtered.length === 0 && (
          <p className={styles.empty}>No matches</p>
        )}
        {filtered.map(p => <PlayerCard key={p.id} player={p} />)}
      </div>
    </div>
  );
}
