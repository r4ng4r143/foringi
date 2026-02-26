import React, { useEffect } from 'react';
import { useStore, type AppView } from './store/store';
import { getSession } from './api/client';
import { LandingPage } from './components/LandingPage';
import { HostDashboard } from './components/HostDashboard';
import { JoinPage } from './components/JoinPage';

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
        const s = useStore.getState();
        s.setSession(code, token);
        s.setSessionName(data.name);
        s.setTableCount(data.tableCount);
        s.loadPlayers(data.players, data.nextPlayerId);
        s.loadGroups(data.groups, data.nextGroupId);
        s.setView('host');
      }).catch(() => {
        history.replaceState(null, '', '/');
      });
      return;
    }

    const saved = sessionStorage.getItem('foringi_joined');
    if (saved) {
      try {
        const { code, playerIds } = JSON.parse(saved);
        getSession(code).then(data => {
          const s = useStore.getState();
          s.setSession(code, null);
          s.setSessionName(data.name);
          s.setJoinedPlayerIds(playerIds);
          s.setView('joined');
        }).catch(() => {
          sessionStorage.removeItem('foringi_joined');
        });
        return;
      } catch { sessionStorage.removeItem('foringi_joined'); }
    }

    const joinMatch = path.match(/^\/join\/([A-Z0-9]{4,8})$/i);
    if (joinMatch) {
      const code = joinMatch[1].toUpperCase();
      getSession(code).then(data => {
        const s = useStore.getState();
        s.setSession(code, null);
        s.setSessionName(data.name);
        s.setTableCount(data.tableCount);
        s.loadPlayers(data.players, data.nextPlayerId);
        s.loadGroups(data.groups, data.nextGroupId);
        s.setView('join');
      }).catch(() => {});
      history.replaceState(null, '', '/');
    }
  }, []);
}

export function App() {
  useRouteRestore();
  const view = useStore(s => s.view);
  const View = views[view];
  return <View />;
}
