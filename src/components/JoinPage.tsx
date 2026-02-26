import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { joinSession, getSession, leaveSession } from '../api/client';
import { Bracket, BRACKET_LABELS } from '../engine/types';
import type { PlayerData, SolutionData } from '../engine/types';
import { InfoPopup } from './InfoPopup';
import howItWorks from '../content/how-it-works.md?raw';
import aboutYourPod from '../content/about-your-pod.md?raw';
import styles from './JoinPage.module.css';

const ALL_BRACKETS = [Bracket.EXHIBITION, Bracket.CORE, Bracket.UPGRADED, Bracket.OPTIMIZED, Bracket.CEDH];

function JoinedView() {
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const joinedIds = useStore(s => s.joinedPlayerIds);
  const clearSession = useStore(s => s.clearSession);

  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [players, setPlayers] = useState<Record<number, PlayerData>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionCode) return;
    const poll = async () => {
      try {
        const data = await getSession(sessionCode);
        setPlayers(data.players);
        if (data.solution) setSolution(data.solution);
      } catch { /* session may have ended */ }
    };
    poll();
    intervalRef.current = setInterval(poll, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionCode]);

  const myPods: { podIndex: number; playerId: number; mates: number[] }[] = [];
  if (solution) {
    for (const pid of joinedIds) {
      for (let i = 0; i < solution.seatings.length; i++) {
        if (solution.seatings[i].includes(pid)) {
          myPods.push({ podIndex: i, playerId: pid, mates: solution.seatings[i].filter(id => id !== pid) });
        }
      }
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.sessionInfo}>{sessionName}</p>
        {myPods.length > 0 ? (
          <>
            <h2 className={styles.title}>
              Your pod{myPods.length > 1 ? 's' : ''}{' '}
              <InfoPopup label="?" title="About your pod" markdown={aboutYourPod} />
            </h2>
            {myPods.map(pod => (
              <div key={pod.playerId} className={styles.podCard}>
                <p className={styles.podLabel}>
                  Table {pod.podIndex + 1}
                  {myPods.length > 1 && <span className={styles.podFor}> — {players[pod.playerId]?.name}</span>}
                </p>
                <ul className={styles.podMates}>
                  {pod.mates.map(id => (
                    <li key={id}>{players[id]?.name ?? `Player ${id}`}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <>
            <div className={styles.check}>&#10003;</div>
            <h2 className={styles.title}>You're in!</h2>
            <p className={styles.subtitle}>Waiting for the host to start...</p>
            <div className={styles.dots}><span /><span /><span /></div>
          </>
        )}
        <button className={styles.backBtn} onClick={() => {
          if (sessionCode && joinedIds.length) leaveSession(sessionCode, joinedIds).catch(() => {});
          sessionStorage.removeItem('foringi_joined');
          clearSession();
        }}>Leave</button>
      </div>
    </div>
  );
}

interface PlayerEntry {
  name: string;
  range: [number, number];
}

function tapBracket(min: number, max: number, b: number): [number, number] {
  if (b < min) return [b, max];
  if (b > max) return [min, b];
  return [b, b];
}

export function JoinPage() {
  const view = useStore(s => s.view);
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const clearSession = useStore(s => s.clearSession);

  const [entries, setEntries] = useState<PlayerEntry[]>([{ name: '', range: [Bracket.CORE, Bracket.CORE] }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (view === 'joined') {
    return <JoinedView />;
  }

  const updateName = (i: number, name: string) => {
    setEntries(prev => prev.map((e, j) => j === i ? { ...e, name } : e));
  };

  const handleTapBracket = (i: number, b: number) => {
    setEntries(prev => prev.map((e, j) => {
      if (j !== i) return e;
      return { ...e, range: tapBracket(e.range[0], e.range[1], b) };
    }));
  };

  const addFriend = () => {
    if (entries.length >= 4) return;
    setEntries(prev => [...prev, { name: '', range: [Bracket.CORE, Bracket.CORE] }]);
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
      const res = await joinSession(sessionCode, {
        players: valid.map(p => ({
          name: p.name.trim(),
          powers: Array.from({ length: p.range[1] - p.range[0] + 1 }, (_, i) => p.range[0] + i),
        })),
      });
      useStore.getState().setJoinedPlayerIds(res.playerIds);
      sessionStorage.setItem('foringi_joined', JSON.stringify({ code: sessionCode, playerIds: res.playerIds }));
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
        <h2 className={styles.title}>
          Join the game{' '}
          <InfoPopup label="?" title="How it works" markdown={howItWorks} />
        </h2>

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
                onChange={e => updateName(i, e.target.value)}
                className={styles.nameInput}
                autoFocus={i === 0}
              />
              <div className={styles.brackets}>
                {ALL_BRACKETS.map(b => (
                  <button
                    key={b}
                    type="button"
                    className={`${styles.bracketBtn} ${styles[`b${b}`]} ${b >= entry.range[0] && b <= entry.range[1] ? styles.selected : ''}`}
                    onClick={() => handleTapBracket(i, b)}
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
