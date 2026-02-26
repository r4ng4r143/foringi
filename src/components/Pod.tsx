import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useStore } from '../store/store';
import { BracketRange } from './PowerBadge';
import styles from './Pod.module.css';

interface PodProps {
  podIndex: number;
  playerIds: number[];
}

export function Pod({ podIndex, playerIds }: PodProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `pod-${podIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.pod} ${isOver ? styles.over : ''}`}
    >
      <div className={styles.header}>
        <span className={styles.num}>Table {podIndex + 1}</span>
        <span className={styles.count}>{playerIds.length}/4</span>
      </div>
      <div className={styles.seats}>
        {playerIds.map(pid => (
          <Seat key={pid} playerId={pid} podIndex={podIndex} />
        ))}
        {Array.from({ length: Math.max(0, 4 - playerIds.length) }, (_, i) => (
          <div key={`empty-${i}`} className={styles.emptySeat} />
        ))}
      </div>
    </div>
  );
}

function Seat({ playerId, podIndex }: { playerId: number; podIndex: number }) {
  const player = useStore(s => s.players[playerId]);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${playerId}`,
    data: { playerId, fromPod: podIndex },
  });

  if (!player) return null;

  return (
    <div
      ref={setNodeRef}
      className={`${styles.seat} ${isDragging ? styles.dragging : ''}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.seatName}>{player.name}</span>
      <BracketRange powers={player.powers} />
    </div>
  );
}
