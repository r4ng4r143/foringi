import { Bracket, BRACKET_LABELS } from '../engine/types';
import styles from './PowerBadge.module.css';

const SHORT: Record<number, string> = {
  [Bracket.EXHIBITION]: '1',
  [Bracket.CORE]: '2',
  [Bracket.UPGRADED]: '3',
  [Bracket.OPTIMIZED]: '4',
  [Bracket.CEDH]: '5',
};

const CLASS_MAP: Record<number, string> = {
  [Bracket.EXHIBITION]: styles.b1,
  [Bracket.CORE]: styles.b2,
  [Bracket.UPGRADED]: styles.b3,
  [Bracket.OPTIMIZED]: styles.b4,
  [Bracket.CEDH]: styles.b5,
};

export function PowerBadge({ level }: { level: number }) {
  return (
    <span className={`${styles.pill} ${CLASS_MAP[level] ?? ''}`} title={BRACKET_LABELS[level]}>
      {SHORT[level] ?? '?'}
    </span>
  );
}

export function BracketRange({ powers }: { powers: number[] }) {
  if (powers.length === 0) return null;
  const min = Math.min(...powers);
  const max = Math.max(...powers);
  if (min === max) return <PowerBadge level={min} />;
  return (
    <span className={styles.range}>
      <PowerBadge level={min} />
      <span className={styles.dash}>–</span>
      <PowerBadge level={max} />
    </span>
  );
}
