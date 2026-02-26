import { useState } from 'react';
import { useStore } from '../store/store';
import { createSession, getSession } from '../api/client';
import styles from './LandingPage.module.css';

export function LandingPage() {
  const setView = useStore(s => s.setView);
  const setSession = useStore(s => s.setSession);
  const setSessionName = useStore(s => s.setSessionName);
  const setTableCount = useStore(s => s.setTableCount);
  const loadPlayers = useStore(s => s.loadPlayers);
  const loadGroups = useStore(s => s.loadGroups);

  const [name, setName] = useState('Commander Night');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await createSession({ name: name.trim() || undefined });
      setSession(res.code, res.hostToken);
      setSessionName(name.trim() || 'Commander Night');
      setView('host');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    setError('');
    try {
      const data = await getSession(code);
      setSession(code, null);
      setSessionName(data.name);
      setTableCount(data.tableCount);
      loadPlayers(data.players, data.nextPlayerId);
      loadGroups(data.groups, data.nextGroupId);
      setView('join');
    } catch {
      setError('Session not found. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.logo}>Foringi</h1>
        <p className={styles.tagline}>Commander pod matchmaking</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Host a session</h2>
          <input
            type="text"
            placeholder="Session name"
            value={name}
            onChange={e => setName(e.target.value)}
            className={styles.input}
          />
          <button
            className={styles.createBtn}
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </div>

        <div className={styles.divider}>
          <span>or</span>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Join a session</h2>
          <input
            type="text"
            placeholder="Enter code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className={`${styles.input} ${styles.codeInput}`}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
          />
          <button
            className={styles.joinBtn}
            onClick={handleJoin}
            disabled={loading || !joinCode.trim()}
          >
            Join
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
