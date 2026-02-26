import { SessionHeader } from './SessionHeader';
import { PlayerForm } from './PlayerForm';
import { PlayerList } from './PlayerList';
import { GroupPanel } from './GroupPanel';
import { ActionBar } from './ActionBar';
import { PodGrid } from './PodGrid';
import { useSessionPolling } from '../hooks/useSession';
import styles from './HostDashboard.module.css';

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
        <ActionBar />
        <PodGrid />
      </main>
    </div>
  );
}
