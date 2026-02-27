import { useState, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { Bracket, BRACKET_LABELS, ALL_BRACKETS, tapBracket } from '../engine/types';
import styles from './PlayerForm.module.css';

export function PlayerForm() {
  const addPlayer = useStore(s => s.addPlayer);
  const [name, setName] = useState('');
  const [range, setRange] = useState<[number, number]>([Bracket.CORE, Bracket.CORE]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const brackets = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
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
            className={`${styles.bracketBtn} ${styles[`b${b}`]} ${b >= range[0] && b <= range[1] ? styles.selected : ''}`}
            onClick={() => setRange(tapBracket(range[0], range[1], b))}
          >
            <span className={styles.num}>{b}</span>
            <span className={styles.label}>{BRACKET_LABELS[b]}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
