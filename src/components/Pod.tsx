import { useDroppable, useDraggable } from '@dnd-kit/core';
import { useState, useEffect, useCallback, useRef } from 'react';
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

function PodModal({ podIndex, playerIds, podScore, onClose }: PodProps & { onClose: () => void }) {
  const players = useStore(s => s.players);
  const groups = useStore(s => s.groups);

  const close = useCallback(onClose, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [close]);

  return (
    <>
      <div className={styles.modalOverlay} onClick={close} />
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Table {podIndex + 1}</span>
          <span className={styles.modalMeta}>
            {podScore != null && (
              <span style={{ color: scoreColor(podScore), fontWeight: 700 }}>
                Score: {podScore.toFixed(0)}
              </span>
            )}
            <span>{playerIds.length}/4 players</span>
          </span>
          <button type="button" className={styles.modalClose} onClick={close}>&times;</button>
        </div>
        <div className={styles.modalPlayers}>
          {playerIds.map(pid => {
            const p = players[pid];
            if (!p) return null;
            const group = Object.values(groups).find(g => g.memberIds.includes(pid));
            const min = p.powers.length ? Math.min(...p.powers) : 0;
            const max = p.powers.length ? Math.max(...p.powers) : 0;
            const bracketLabel = min === max
              ? (BRACKET_LABELS[min] ?? `${min}`)
              : `${BRACKET_LABELS[min] ?? min} – ${BRACKET_LABELS[max] ?? max}`;
            return (
              <div key={pid} className={styles.modalPlayer}>
                <div className={styles.modalPlayerHeader}>
                  <span className={styles.modalPlayerName}>{p.name}</span>
                  <BracketRange powers={p.powers} />
                </div>
                <div className={styles.modalPlayerDetails}>
                  <span className={styles.detailLabel}>Power</span>
                  <span className={styles.detailValue}>{bracketLabel}</span>
                </div>
                {group && (
                  <div className={styles.modalPlayerDetails}>
                    <span className={styles.detailLabel}>Group</span>
                    <span className={styles.detailValue}>{group.name}</span>
                  </div>
                )}
                {p.blacklist.length > 0 && (
                  <div className={styles.modalPlayerDetails}>
                    <span className={styles.detailLabel}>Avoids</span>
                    <span className={styles.detailValue}>
                      {p.blacklist.map(id => players[id]?.name ?? `#${id}`).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
          {playerIds.length === 0 && (
            <p className={styles.modalEmpty}>No players seated.</p>
          )}
        </div>
      </div>
    </>
  );
}

export function Pod({ podIndex, playerIds, podScore }: PodProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `pod-${podIndex}` });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const focusPodIndex = useStore(s => s.focusPodIndex);
  const setFocusPod = useStore(s => s.setFocusPod);
  const podRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusPodIndex === podIndex) {
      podRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setShowModal(true);
      setFocusPod(null);
    }
  }, [focusPodIndex, podIndex, setFocusPod]);

  return (
    <div
      ref={(node) => { setNodeRef(node); (podRef as React.MutableRefObject<HTMLDivElement | null>).current = node; }}
      className={`${styles.pod} ${isOver ? styles.over : ''}`}
    >
      <div className={styles.header} onClick={() => setShowModal(true)} style={{ cursor: 'pointer' }}>
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
      {showModal && (
        <PodModal podIndex={podIndex} playerIds={playerIds} podScore={podScore} onClose={() => setShowModal(false)} />
      )}
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
