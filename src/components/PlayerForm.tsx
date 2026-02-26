import { useState, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { Bracket, BRACKET_LABELS } from '../engine/types';
import styles from './PlayerForm.module.css';

const ALL_BRACKETS = [Bracket.EXHIBITION, Bracket.CORE, Bracket.UPGRADED, Bracket.OPTIMIZED, Bracket.CEDH];

export function PlayerForm() {
  const addPlayer = useStore(s => s.addPlayer);
  const [name, setName] = useState('');
  const [brackets, setBrackets] = useState<number[]>([Bracket.CORE]);

  const toggleBracket = (b: number) => {
    setBrackets(prev => {
      const has = prev.includes(b);
      return has ? prev.filter(x => x !== b) : [...prev, b].sort();
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || brackets.length === 0) return;
    addPlayer(trimmed, brackets);
    setName('');
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row}>
        <input
          type="text"
          placeholder="Player name"
          value={name}
          onChange={e => setName(e.target.value)}
          className={styles.input}
        />
        <button type="submit" className={styles.addBtn}>Add</button>
      </div>
      <div className={styles.brackets}>
        {ALL_BRACKETS.map(b => (
          <button
            key={b}
            type="button"
            className={`${styles.bracketBtn} ${styles[`b${b}`]} ${brackets.includes(b) ? styles.selected : ''}`}
            onClick={() => toggleBracket(b)}
          >
            <span className={styles.num}>{b}</span>
            <span className={styles.label}>{BRACKET_LABELS[b]}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
