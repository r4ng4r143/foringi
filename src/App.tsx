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

function useJoinRoute() {
  useEffect(() => {
    const match = window.location.pathname.match(/^\/join\/([A-Z0-9]{4,8})$/i);
    if (!match) return;
    const code = match[1].toUpperCase();
    const { view, setSession, setSessionName, setTableCount, loadPlayers, loadGroups, setView } = useStore.getState();
    if (view !== 'landing') return;

    getSession(code).then(data => {
      setSession(code, null);
      setSessionName(data.name);
      setTableCount(data.tableCount);
      loadPlayers(data.players, data.nextPlayerId);
      loadGroups(data.groups, data.nextGroupId);
      setView('join');
    }).catch(() => {
      // invalid/expired session -- stay on landing
    });

    history.replaceState(null, '', '/');
  }, []);
}

export function App() {
  useJoinRoute();
  const view = useStore(s => s.view);
  const View = views[view];
  return <View />;
}
