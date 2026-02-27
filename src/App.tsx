import React, { useEffect } from 'react';
import { useStore, suppressSync, type AppView } from './store/store';
import { getSession } from './api/client';
import { LandingPage } from './components/LandingPage';
import { HostDashboard } from './components/HostDashboard';
import { JoinPage } from './components/JoinPage';
import { Footer } from './components/Footer';
import styles from './App.module.css';

const views: Record<AppView, React.FC> = {
  landing: LandingPage,
  host: HostDashboard,
  join: JoinPage,
  joined: JoinPage,
};

function useRouteRestore() {
  useEffect(() => {
    const { view } = useStore.getState();
    if (view !== 'landing') return;

    const path = window.location.pathname;
    const hash = window.location.hash.slice(1);

    const hostMatch = path.match(/^\/host\/([A-Z0-9]{4,8})$/i);
    if (hostMatch && hash) {
      const code = hostMatch[1].toUpperCase();
      const token = hash;
      getSession(code, token).then(data => {
        suppressSync(() => {
          const s = useStore.getState();
          s.setSession(code, token);
          s.setSessionName(data.name);
          if (data.tableCount != null) s.setTableCount(data.tableCount);
          if (data.nextPlayerId != null) s.loadPlayers(data.players, data.nextPlayerId);
          if (data.groups && data.nextGroupId != null) s.loadGroups(data.groups, data.nextGroupId);
          s.setView('host');
        });
      }).catch(() => {
        history.replaceState(null, '', '/');
      });
      return;
    }

    const saved = localStorage.getItem('foringi_joined');
    if (saved) {
      try {
        const { code, playerIds } = JSON.parse(saved);
        const joinMatch = path.match(/^\/join\/([A-Z0-9]{4,8})$/i);
        const incomingCode = joinMatch ? joinMatch[1].toUpperCase() : null;

        getSession(code).then(data => {
          suppressSync(() => {
            const s = useStore.getState();
            s.setSession(code, null);
            s.setSessionName(data.name);
            s.setJoinedPlayerIds(playerIds);
            s.setView('joined');
            if (incomingCode && incomingCode !== code) {
              s.setPendingJoinCode(incomingCode);
            }
          });
          history.replaceState(null, '', '/');
        }).catch(() => {
          localStorage.removeItem('foringi_joined');
        });
        return;
      } catch { localStorage.removeItem('foringi_joined'); }
    }

    const joinMatch = path.match(/^\/join\/([A-Z0-9]{4,8})$/i);
    if (joinMatch) {
      const code = joinMatch[1].toUpperCase();
      getSession(code).then(data => {
        suppressSync(() => {
          const s = useStore.getState();
          s.setSession(code, null);
          s.setSessionName(data.name);
          s.setView('join');
        });
      }).catch(() => {});
      history.replaceState(null, '', '/');
    }
  }, []);
}

export function App() {
  useRouteRestore();
  const view = useStore(s => s.view);
  const View = views[view];
  return (
    <div className={styles.app}>
      <div className={styles.content}>
        <View />
      </div>
      {view !== 'host' && <Footer />}
    </div>
  );
}
