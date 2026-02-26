import { useState } from 'react';
import { SessionHeader } from './SessionHeader';
import { PlayerForm } from './PlayerForm';
import { PlayerList } from './PlayerList';
import { GroupPanel } from './GroupPanel';
import { ActionBar } from './ActionBar';
import { PodGrid } from './PodGrid';
import { useSessionPolling } from '../hooks/useSession';
import type { SessionEvent } from '../api/types';
import styles from './HostDashboard.module.css';

function formatEvent(e: SessionEvent): string {
  if (e.type === 'join') return `${e.names?.join(', ')} joined`;
  if (e.type === 'leave') return `${e.names?.join(', ')} left`;
  if (e.type === 'cooked') return 'Pods cooked';
  return 'Unknown event';
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ActivityLog({ events, unread, onOpen }: { events: SessionEvent[]; unread: number; onOpen: () => void }) {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen();
  };

  return (
    <div className={styles.activityWrap}>
      <button className={styles.bellBtn} onClick={toggle}>
        {unread > 0 && <span className={styles.badge}>{unread}</span>}
        <span className={styles.bellIcon}>&#128276;</span>
      </button>
      {open && (
        <div className={styles.logDropdown}>
          <h4 className={styles.logTitle}>Activity</h4>
          {events.length === 0 && <p className={styles.logEmpty}>No activity yet</p>}
          <ul className={styles.logList}>
            {[...events].reverse().map((e, i) => (
              <li key={i} className={styles.logItem}>
                <span className={styles.logTime}>{formatTime(e.ts)}</span>
                <span>{formatEvent(e)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HostHelp() {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.help}>
      <button className={styles.helpToggle} onClick={() => setOpen(v => !v)}>
        {open ? 'Hide help' : 'Show help'}
      </button>
      {open && (
        <ol className={styles.helpSteps}>
          <li>Players join by scanning the QR code or entering the session code.</li>
          <li>Press <strong>Cook</strong> to generate balanced pods.</li>
          <li>Press <strong>Shuffle</strong> to re-roll with different seating.</li>
          <li>Drag players between pods to adjust manually.</li>
        </ol>
      )}
    </div>
  );
}

export function HostDashboard() {
  const { eventLog, unreadCount, markRead } = useSessionPolling();
  const [tab, setTab] = useState<'players' | 'groups'>('players');

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.title}>FORINGI</h2>
          <ActivityLog events={eventLog} unread={unreadCount} onOpen={markRead} />
        </div>
        <PlayerForm />
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${tab === 'players' ? styles.tabActive : ''}`}
            onClick={() => setTab('players')}
          >Players</button>
          <button
            className={`${styles.tab} ${tab === 'groups' ? styles.tabActive : ''}`}
            onClick={() => setTab('groups')}
          >Groups</button>
        </div>
        <div className={styles.tabContent}>
          {tab === 'players' ? <PlayerList /> : <GroupPanel />}
        </div>
      </aside>
      <main className={styles.main}>
        <SessionHeader />
        <HostHelp />
        <ActionBar />
        <PodGrid />
      </main>
    </div>
  );
}
