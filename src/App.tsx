import React from 'react';
import { useStore, type AppView } from './store/store';
import { LandingPage } from './components/LandingPage';
import { HostDashboard } from './components/HostDashboard';
import { JoinPage } from './components/JoinPage';

const views: Record<AppView, React.FC> = {
  landing: LandingPage,
  host: HostDashboard,
  join: JoinPage,
  joined: JoinPage,
};

export function App() {
  const view = useStore(s => s.view);
  const View = views[view];
  return <View />;
}
