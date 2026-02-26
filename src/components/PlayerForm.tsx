import { useState, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { Bracket, BRACKET_LABELS } from '../engine/types';
import styles from './PlayerForm.module.css';

const ALL_BRACKETS = [Bracket.EXHIBITION, Bracket.CORE, Bracket.UPGRADED, Bracket.OPTIMIZED, Bracket.CEDH];

export function PlayerForm() {
  const addPlayer = useStore(s => s.addPlayer);
  const [name, setName] = useState('');
  const [bracket, setBracket] = useState(Bracket.CORE);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    addPlayer(trimmed, [bracket]);
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
            className={`${styles.bracketBtn} ${styles[`b${b}`]} ${bracket === b ? styles.selected : ''}`}
            onClick={() => setBracket(b)}
          >
            <span className={styles.num}>{b}</span>
            <span className={styles.label}>{BRACKET_LABELS[b]}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
