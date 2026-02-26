import { useState } from 'react';
import { SessionHeader } from './SessionHeader';
import { PlayerForm } from './PlayerForm';
import { PlayerList } from './PlayerList';
import { GroupPanel } from './GroupPanel';
import { ActionBar } from './ActionBar';
import { PodGrid } from './PodGrid';
import { useSessionPolling } from '../hooks/useSession';
import styles from './HostDashboard.module.css';

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
  useSessionPolling();

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <h2 className={styles.title}>Foringi</h2>
        <PlayerForm />
        <PlayerList />
        <GroupPanel />
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
