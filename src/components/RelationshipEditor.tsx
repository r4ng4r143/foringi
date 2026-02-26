import { useStore } from '../store/store';
import styles from './RelationshipEditor.module.css';

interface Props {
  playerId: number;
  onClose: () => void;
}

export function RelationshipEditor({ playerId, onClose }: Props) {
  const players = useStore(s => s.players);
  const player = players[playerId];
  const addBlacklist = useStore(s => s.addBlacklist);
  const removeBlacklist = useStore(s => s.removeBlacklist);
  const groups = useStore(s => s.groups);

  if (!player) return null;

  const playerGroupIds = new Set(
    Object.values(groups)
      .filter(g => g.memberIds.includes(playerId))
      .flatMap(g => g.memberIds),
  );

  const others = Object.values(players)
    .filter(p => p.id !== playerId)
    .sort((a, b) => a.name.localeCompare(b.name));

  const toggle = (targetId: number) => {
    const current = players[playerId];
    if (!current || playerGroupIds.has(targetId)) return;
    current.blacklist.includes(targetId)
      ? removeBlacklist(playerId, targetId)
      : addBlacklist(playerId, targetId);
  };

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.titleBl}>Blacklist — {player.name}</span>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>
      <div className={styles.options}>
        {others.map(o => {
          const active = player.blacklist.includes(o.id);
          const inGroup = playerGroupIds.has(o.id);
          return (
            <button
              key={o.id}
              className={`${styles.option} ${active ? styles.activeBl : ''} ${inGroup ? styles.disabled : ''}`}
              onClick={() => toggle(o.id)}
              disabled={inGroup}
            >
              {o.name}{inGroup ? ' (grouped)' : ''}
            </button>
          );
        })}
        {others.length === 0 && (
          <p className={styles.noPlayers}>No other players to select.</p>
        )}
      </div>
    </div>
  );
}
