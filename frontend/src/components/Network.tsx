import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { MeshNode } from '../types';
import { formatRelativeTime } from '../utils';

interface Props {
  refreshTrigger: number;
}

export const Network: React.FC<Props> = ({ refreshTrigger }) => {
  const [nodes, setNodes]     = useState<MeshNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getNodes()
      .then(setNodes)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) return <div className="loading">Loading network...</div>;
  if (error)   return <div className="error">{error}</div>;

  const online   = nodes.filter(n => n.status === 'ONLINE').length;
  const degraded = nodes.filter(n => n.status === 'DEGRADED').length;
  const offline  = nodes.filter(n => n.status === 'OFFLINE').length;

  return (
    <div className="network-page">
      <h2 className="section-title">📡 Mesh Network Status</h2>

      {/* Network Summary Bar */}
      <div className="network-summary">
        <div className="network-stat">
          <span className="status-dot status-dot--online" />
          {online} Online
        </div>
        <div className="network-stat">
          <span className="status-dot status-dot--degraded" />
          {degraded} Degraded
        </div>
        <div className="network-stat">
          <span className="status-dot status-dot--offline" />
          {offline} Offline
        </div>
        <div className="network-stat">
          📡 {nodes.reduce((s, n) => s + n.connectedPeers, 0)} peer connections
        </div>
        <div className="network-stat">
          📨 {nodes.reduce((s, n) => s + n.incidentsRelayed, 0)} incidents relayed
        </div>
      </div>

      {/* Node Cards Grid */}
      <div className="node-grid">
        {nodes.map(node => (
          <div key={node.id} className={`node-card node-card--${node.status.toLowerCase()}`}>
            <div className="node-card-header">
              <span className="node-name">{node.name}</span>
              <span className={`node-status-badge node-status-badge--${node.status.toLowerCase()}`}>
                {node.status}
              </span>
            </div>

            {/* Simple ASCII mesh visualizer */}
            <div className="node-mesh-diagram">
              <div className="mesh-center">⬡</div>
              <div className="mesh-peers">
                {Array.from({ length: node.connectedPeers }, (_, i) => (
                  <span key={i} className="mesh-peer">◉</span>
                ))}
              </div>
            </div>

            <div className="node-details">
              <div className="node-detail-row">
                <span className="node-detail-label">📍 Location</span>
                <span>{node.location}</span>
              </div>
              <div className="node-detail-row">
                <span className="node-detail-label">🌐 IP Address</span>
                <span className="node-ip">{node.ipAddress}</span>
              </div>
              <div className="node-detail-row">
                <span className="node-detail-label">🔗 Peers</span>
                <span>{node.connectedPeers}</span>
              </div>
              <div className="node-detail-row">
                <span className="node-detail-label">📨 Relayed</span>
                <span>{node.incidentsRelayed}</span>
              </div>
              <div className="node-detail-row">
                <span className="node-detail-label">🕐 Last Seen</span>
                <span>{formatRelativeTime(node.lastSeen)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="network-note">
        ℹ️ Mesh nodes relay incident data peer-to-peer, ensuring resilient communication
        even when central infrastructure is compromised.
      </p>
    </div>
  );
};
