import { useState, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { joinSession } from '../api/client';
import { Bracket, BRACKET_LABELS } from '../engine/types';
import styles from './JoinPage.module.css';

const ALL_BRACKETS = [Bracket.EXHIBITION, Bracket.CORE, Bracket.UPGRADED, Bracket.OPTIMIZED, Bracket.CEDH];

interface PlayerEntry {
  name: string;
  bracket: number;
}

export function JoinPage() {
  const view = useStore(s => s.view);
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const clearSession = useStore(s => s.clearSession);

  const [entries, setEntries] = useState<PlayerEntry[]>([{ name: '', bracket: Bracket.CORE }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (view === 'joined') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.check}>&#10003;</div>
          <h2 className={styles.title}>You're in!</h2>
          <p className={styles.subtitle}>Head to the tables. The host will announce pods shortly.</p>
          <p className={styles.sessionInfo}>{sessionName}</p>
          <button className={styles.backBtn} onClick={clearSession}>Leave</button>
        </div>
      </div>
    );
  }

  const updateEntry = (i: number, field: keyof PlayerEntry, value: string | number) => {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, [field]: value } : e));
  };

  const addFriend = () => {
    if (entries.length >= 4) return;
    setEntries(prev => [...prev, { name: '', bracket: Bracket.CORE }]);
  };

  const removeFriend = (i: number) => {
    if (entries.length <= 1) return;
    setEntries(prev => prev.filter((_, j) => j !== i));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sessionCode) return;

    const valid = entries.filter(p => p.name.trim());
    if (valid.length === 0) return;

    setLoading(true);
    setError('');
    try {
      await joinSession(sessionCode, {
        players: valid.map(p => ({ name: p.name.trim(), powers: [p.bracket] })),
      });
      useStore.getState().setView('joined');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.sessionInfo}>{sessionName}</p>
        <h2 className={styles.title}>Join the game</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          {entries.map((entry, i) => (
            <div key={i} className={styles.entry}>
              {entries.length > 1 && (
                <div className={styles.entryHeader}>
                  <span className={styles.entryLabel}>Player {i + 1}</span>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeFriend(i)}
                  >&times;</button>
                </div>
              )}
              <input
                type="text"
                placeholder={i === 0 ? 'Your name' : "Friend's name"}
                value={entry.name}
                onChange={e => updateEntry(i, 'name', e.target.value)}
                className={styles.nameInput}
                autoFocus={i === 0}
              />
              <div className={styles.brackets}>
                {ALL_BRACKETS.map(b => (
                  <button
                    key={b}
                    type="button"
                    className={`${styles.bracketBtn} ${styles[`b${b}`]} ${entry.bracket === b ? styles.selected : ''}`}
                    onClick={() => updateEntry(i, 'bracket', b)}
                  >
                    <span className={styles.bracketNum}>{b}</span>
                    <span className={styles.bracketLabel}>{BRACKET_LABELS[b]}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {entries.length < 4 && (
            <button type="button" className={styles.addFriend} onClick={addFriend}>
              + Add a friend
            </button>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !entries.some(e => e.name.trim())}
          >
            {loading ? 'Joining...' : 'Sign Up'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.backBtn} onClick={clearSession}>Back</button>
      </div>
    </div>
  );
}
