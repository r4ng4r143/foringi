import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { useStore } from '../store/store';
import { BracketRange } from './PowerBadge';
import { BRACKET_LABELS } from '../engine/types';
import styles from './Pod.module.css';

interface PodProps {
  podIndex: number;
  playerIds: number[];
  podScore?: number;
}

function scoreColor(score: number): string {
  if (score <= 20) return 'var(--whitelist)';
  if (score <= 80) return 'var(--accent-light)';
  return 'var(--blacklist)';
}

export function Pod({ podIndex, playerIds, podScore }: PodProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `pod-${podIndex}` });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pod} ${isOver ? styles.over : ''}`}
    >
      <div className={styles.header}>
        <span className={styles.num}>Table {podIndex + 1}</span>
        <span className={styles.headerRight}>
          {podScore != null && (
            <span className={styles.podScore} style={{ color: scoreColor(podScore) }}>
              {podScore.toFixed(0)}
            </span>
          )}
          <span className={styles.count}>{playerIds.length}/4</span>
        </span>
      </div>
      <div className={styles.seats}>
        {playerIds.map(pid => (
          <Seat
            key={pid}
            playerId={pid}
            podIndex={podIndex}
            expanded={expandedId === pid}
            onToggle={() => setExpandedId(expandedId === pid ? null : pid)}
          />
        ))}
        {Array.from({ length: Math.max(0, 4 - playerIds.length) }, (_, i) => (
          <div key={`empty-${i}`} className={styles.emptySeat} />
        ))}
      </div>
    </div>
  );
}

function Seat({ playerId, podIndex, expanded, onToggle }: {
  playerId: number;
  podIndex: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const player = useStore(s => s.players[playerId]);
  const groups = useStore(s => s.groups);
  const allPlayers = useStore(s => s.players);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${playerId}`,
    data: { playerId, fromPod: podIndex },
  });

  if (!player) return null;

  const group = Object.values(groups).find(g => g.memberIds.includes(playerId));

  const bracketLabel = (() => {
    if (player.powers.length === 0) return 'None';
    const min = Math.min(...player.powers);
    const max = Math.max(...player.powers);
    if (min === max) return BRACKET_LABELS[min] ?? `${min}`;
    return `${BRACKET_LABELS[min] ?? min} – ${BRACKET_LABELS[max] ?? max}`;
  })();

  return (
    <div className={styles.seatWrapper}>
      <div
        ref={setNodeRef}
        className={`${styles.seat} ${isDragging ? styles.dragging : ''} ${expanded ? styles.expanded : ''}`}
        onClick={onToggle}
        {...attributes}
        {...listeners}
      >
        <span className={styles.seatName}>{player.name}</span>
        <BracketRange powers={player.powers} />
      </div>
      {expanded && (
        <div className={styles.detail}>
          <div className={styles.detailName}>{player.name}</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Power</span>
            <span className={styles.detailValue}>{bracketLabel}</span>
          </div>
          {group && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Group</span>
              <span className={styles.detailValue}>{group.name}</span>
            </div>
          )}
          {player.blacklist.length > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Avoids</span>
              <span className={styles.detailValue}>
                {player.blacklist.map(id => allPlayers[id]?.name ?? `#${id}`).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
