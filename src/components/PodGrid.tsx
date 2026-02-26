import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { useState } from 'react';
import { useStore } from '../store/store';
import { Pod } from './Pod';
import { BracketRange } from './PowerBadge';
import styles from './PodGrid.module.css';

export function PodGrid() {
  const solution = useStore(s => s.solution);
  const players = useStore(s => s.players);
  const movePlayer = useStore(s => s.movePlayer);
  const tableCount = useStore(s => s.tableCount);
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: { active: { data: { current?: { playerId?: number } } } }) => {
    setActiveId(event.active.data.current?.playerId ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const playerId = active.data.current?.playerId as number | undefined;
    const fromPod = active.data.current?.fromPod as number | undefined;
    if (playerId === undefined || fromPod === undefined) return;
    const overIdStr = String(over.id);
    if (!overIdStr.startsWith('pod-')) return;
    const toPod = parseInt(overIdStr.replace('pod-', ''), 10);
    if (fromPod !== toPod && solution && toPod < solution.seatings.length) movePlayer(playerId, fromPod, toPod);
  };

  const activePlayer = activeId != null ? players[activeId] : null;

  if (!solution) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: Math.min(tableCount, 15) }, (_, i) => (
          <div key={i} className={styles.emptyPod}>
            <span className={styles.podNum}>{i + 1}</span>
            <div className={styles.emptySeats}>
              {[0, 1, 2, 3].map(s => (
                <div key={s} className={styles.emptySeat} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.scoreBar}>
        Score: {solution.score.toFixed(1)} &middot; {solution.seatings.length} pod{solution.seatings.length !== 1 ? 's' : ''}
      </div>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className={styles.grid}>
          {solution.seatings.map((playerIds, i) => (
            <Pod key={i} podIndex={i} playerIds={playerIds} podScore={solution.podScores?.[i]} />
          ))}
        </div>
        <DragOverlay>
          {activePlayer && (
            <div className={styles.overlay}>
              <span>{activePlayer.name}</span>
              <BracketRange powers={activePlayer.powers} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
