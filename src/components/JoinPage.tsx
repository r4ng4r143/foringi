import { useState, type FormEvent } from 'react';
import { useStore } from '../store/store';
import { joinSession, getSession } from '../api/client';
import { Bracket, BRACKET_LABELS, ALL_BRACKETS, tapBracket } from '../engine/types';
import type { ClientPlayerData } from '../api/types';
import type { SolutionData } from '../engine/types';
import { useWebSocket } from '../hooks/useWebSocket';
import { InfoPopup } from './InfoPopup';
import { GuideButton } from './GuideModal';
import howItWorks from '../content/how-it-works.md?raw';
import aboutYourPod from '../content/about-your-pod.md?raw';
import styles from './JoinPage.module.css';

function JoinedView() {
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const joinedIds = useStore(s => s.joinedPlayerIds);
  const clearSession = useStore(s => s.clearSession);
  const pendingJoinCode = useStore(s => s.pendingJoinCode);
  const setPendingJoinCode = useStore(s => s.setPendingJoinCode);

  const storePlayersRaw = useStore(s => s.players);
  const storeSolution = useStore(s => s.solution);

  const players: Record<number, ClientPlayerData> = {};
  for (const [id, p] of Object.entries(storePlayersRaw)) {
    players[Number(id)] = { id: (p as { id: number }).id, name: (p as { name: string }).name };
  }
  const solution: { seatings: number[][] } | null = storeSolution
    ? { seatings: (storeSolution as SolutionData).seatings }
    : null;

  const { leave } = useWebSocket(sessionCode ?? '', null);

  const removed = joinedIds.length > 0 && Object.keys(players).length > 0 &&
    !joinedIds.some(id => String(id) in players);
  const [copied, setCopied] = useState(false);

  if (removed) {
    localStorage.removeItem('foringi_joined');
  }

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

  if (removed) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.sessionInfo}>{sessionName}</p>
          <h2 className={styles.title}>You've been removed</h2>
          <p className={styles.subtitle}>The host removed you from this session.</p>
          <button className={styles.backBtn} onClick={clearSession}>Back to home</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.sessionInfo}>
          {sessionName}
          {sessionCode && <span className={styles.sessionCode}>{sessionCode}</span>}
          {sessionCode && (
            <button
              className={styles.shareBtn}
              onClick={() => {
                const url = `${window.location.origin}/join/${sessionCode}`;
                navigator.clipboard.writeText(url).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }).catch(() => {});
              }}
            >{copied ? 'Copied!' : 'Share'}</button>
          )}
        </p>
        {pendingJoinCode && (
          <div className={styles.switchBanner}>
            <p>You scanned a code for a different session (<strong>{pendingJoinCode}</strong>).</p>
            <div className={styles.switchActions}>
              <button
                className={styles.switchBtn}
                onClick={() => {
                  if (joinedIds.length) leave(joinedIds);
                  localStorage.removeItem('foringi_joined');
                  setPendingJoinCode(null);
                  const code = pendingJoinCode;
                  clearSession();
                  getSession(code).then(data => {
                    const s = useStore.getState();
                    s.setSession(code, null);
                    s.setSessionName(data.name);
                    s.setView('join');
                  }).catch(() => {});
                }}
              >Switch session</button>
              <button className={styles.dismissBtn} onClick={() => setPendingJoinCode(null)}>Stay here</button>
            </div>
          </div>
        )}
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
        <div className={styles.bottomRow}>
          <button className={styles.backBtn} onClick={() => {
            if (joinedIds.length) leave(joinedIds);
            localStorage.removeItem('foringi_joined');
            clearSession();
          }}>Leave</button>
          <GuideButton />
        </div>
      </div>
    </div>
  );
}

let nextEntryId = 0;

interface PlayerEntry {
  id: number;
  name: string;
  range: [number, number];
}

export function JoinPage() {
  const view = useStore(s => s.view);
  const sessionCode = useStore(s => s.sessionCode);
  const sessionName = useStore(s => s.sessionName);
  const clearSession = useStore(s => s.clearSession);

  const [entries, setEntries] = useState<PlayerEntry[]>([{ id: nextEntryId++, name: '', range: [Bracket.CORE, Bracket.CORE] }]);
  const [strictGroup, setStrictGroup] = useState(false);
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
    setEntries(prev => [...prev, { id: nextEntryId++, name: '', range: [Bracket.CORE, Bracket.CORE] }]);
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
        strictGroup: valid.length >= 2 ? strictGroup : undefined,
      });
      useStore.getState().setJoinedPlayerIds(res.playerIds);
      localStorage.setItem('foringi_joined', JSON.stringify({ code: sessionCode, playerIds: res.playerIds }));
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
            <div key={entry.id} className={styles.entry}>
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

          {entries.length >= 2 && (
            <label className={styles.groupToggle}>
              <span className={styles.toggleTrack} data-on={strictGroup} onClick={() => setStrictGroup(!strictGroup)}>
                <span className={styles.toggleThumb} />
              </span>
              <span className={styles.toggleLabel}>
                {strictGroup ? 'STRICT: Must sit together' : 'FLEXIBLE: Prefer together, okay apart'}
              </span>
            </label>
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
        <div className={styles.bottomRow}>
          <button className={styles.backBtn} onClick={clearSession}>Back</button>
          <GuideButton />
        </div>
      </div>
    </div>
  );
}
