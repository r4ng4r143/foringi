import { useState } from 'react';
import { useStore } from '../store/store';
import { BracketRange } from './PowerBadge';
import { RelationshipEditor } from './RelationshipEditor';
import type { PlayerData } from '../engine/types';
import styles from './PlayerCard.module.css';

export function PlayerCard({ player }: { player: PlayerData }) {
  const removePlayer = useStore(s => s.removePlayer);
  const groups = useStore(s => s.groups);
  const solution = useStore(s => s.solution);
  const setFocusPod = useStore(s => s.setFocusPod);
  const [showBl, setShowBl] = useState(false);

  const group = Object.values(groups).find(g => g.memberIds.includes(player.id));
  const podIndex = solution?.seatings.findIndex(pod => pod.includes(player.id)) ?? -1;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.name}>{player.name}</span>
        {group && <span className={styles.groupBadge}>{group.name}</span>}
        {podIndex >= 0 && (
          <button
            className={styles.tableBadge}
            onClick={() => setFocusPod(podIndex)}
          >Table {podIndex + 1}</button>
        )}
        <div className={styles.badges}>
          <BracketRange powers={player.powers} />
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.blBtn}
          onClick={() => setShowBl(!showBl)}
        >BL</button>
        <button className={styles.rmBtn} onClick={() => removePlayer(player.id)}>Remove</button>
      </div>

      {player.blacklist.length > 0 && (
        <BlacklistSummary playerId={player.id} ids={player.blacklist} />
      )}

      {showBl && (
        <RelationshipEditor
          playerId={player.id}
          onClose={() => setShowBl(false)}
        />
      )}
    </div>
  );
}

function BlacklistSummary({ playerId, ids }: { playerId: number; ids: number[] }) {
  const players = useStore(s => s.players);
  const removeBlacklist = useStore(s => s.removeBlacklist);
  return (
    <div className={styles.blSummary}>
      {ids.map(id => (
        <span key={id} className={styles.tag}>
          {players[id]?.name ?? `#${id}`}
          <button
            className={styles.tagRemove}
            onClick={() => removeBlacklist(playerId, id)}
          >×</button>
        </span>
      ))}
    </div>
  );
}
