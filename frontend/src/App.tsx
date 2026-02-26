import React, { useState, useCallback } from 'react';
import './App.css';
import { Dashboard }  from './components/Dashboard';
import { Incidents }  from './components/Incidents';
import { Alerts }     from './components/Alerts';
import { Network }    from './components/Network';
import { Report }     from './components/Report';
import { useWebSocket } from './hooks/useWebSocket';
import { WsMessage }  from './types';

type Tab = 'dashboard' | 'incidents' | 'alerts' | 'network' | 'report';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'incidents', label: '🚨 Incidents' },
  { id: 'alerts',    label: '🔔 Alerts' },
  { id: 'network',   label: '📡 Network' },
  { id: 'report',    label: '📝 Report' },
];

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  // Increment to trigger data refresh in child components when WS events arrive
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [wsConnected, setWsConnected]       = useState(false);

  const handleWsMessage = useCallback((msg: WsMessage) => {
    if (msg.event === 'connected') {
      setWsConnected(true);
      return;
    }
    // Any real event triggers a data refresh across all views
    setRefreshTrigger(t => t + 1);
  }, []);

  useWebSocket(handleWsMessage);

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          🛡️ SECURITY<span>MESH</span>
        </div>
        <div className="ws-indicator">
          <span className={`ws-dot ${wsConnected ? 'ws-dot--connected' : ''}`} />
          {wsConnected ? 'MESH CONNECTED' : 'CONNECTING...'}
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="tab-nav" role="navigation">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'tab-btn--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard refreshTrigger={refreshTrigger} />}
        {activeTab === 'incidents' && <Incidents refreshTrigger={refreshTrigger} />}
        {activeTab === 'alerts'    && <Alerts    refreshTrigger={refreshTrigger} />}
        {activeTab === 'network'   && <Network   refreshTrigger={refreshTrigger} />}
        {activeTab === 'report'    && <Report />}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        SECURITY MESH v1.0 · AI-POWERED THREAT INTELLIGENCE · EDUCATIONAL MOCKUP
      </footer>
    </div>
  );
}

export default App;
