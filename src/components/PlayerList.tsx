import { useStore } from '../store/store';
import { PlayerCard } from './PlayerCard';
import styles from './PlayerList.module.css';

export function PlayerList() {
  const players = useStore(s => s.players);
  const sorted = Object.values(players).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>Signup ({sorted.length})</h3>
      <div className={styles.list}>
        {sorted.length === 0 && (
          <p className={styles.empty}>No players yet. Add some above.</p>
        )}
        {sorted.map(p => <PlayerCard key={p.id} player={p} />)}
      </div>
    </div>
  );
}
