import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay, useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import { useStore } from '../store/store';
import { Pod } from './Pod';
import { BracketRange } from './PowerBadge';
import styles from './PodGrid.module.css';

function TrashZone() {
  const { setNodeRef, isOver } = useDroppable({ id: 'trash' });
  return (
    <div ref={setNodeRef} className={`${styles.trash} ${isOver ? styles.trashOver : ''}`}>
      <span className={styles.trashIcon}>&#128465;</span>
      <span>Remove from pod</span>
    </div>
  );
}

export function PodGrid() {
  const solution = useStore(s => s.solution);
  const players = useStore(s => s.players);
  const movePlayer = useStore(s => s.movePlayer);
  const unseatPlayer = useStore(s => s.unseatPlayer);
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

    if (String(over.id) === 'trash') {
      unseatPlayer(playerId, fromPod);
      return;
    }

    const overIdStr = String(over.id);
    if (!overIdStr.startsWith('pod-')) return;
    const toPod = parseInt(overIdStr.replace('pod-', ''), 10);
    if (isNaN(toPod) || toPod < 0) return;
    if (fromPod !== toPod && solution && toPod < solution.seatings.length) movePlayer(playerId, fromPod, toPod);
  };

  const activePlayer = activeId != null ? players[activeId] : null;

  if (!solution) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: tableCount }, (_, i) => (
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
        {activeId != null && <TrashZone />}
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
