import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { DashboardStats, Incident } from '../types';
import { formatRelativeTime, getSeverityClass, getTypeEmoji, getStatusClass } from '../utils';

interface Props {
  refreshTrigger: number;
}

export const Dashboard: React.FC<Props> = ({ refreshTrigger }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.getDashboardStats()
      .then(setStats)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error)   return <div className="error">{error}</div>;
  if (!stats)  return null;

  return (
    <div className="dashboard">
      <h2 className="section-title">🛡️ Operations Dashboard</h2>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card stat-card--blue">
          <div className="stat-value">{stats.totalIncidents}</div>
          <div className="stat-label">Total Incidents</div>
        </div>
        <div className="stat-card stat-card--red">
          <div className="stat-value">{stats.activeAlerts}</div>
          <div className="stat-label">Active Alerts</div>
        </div>
        <div className="stat-card stat-card--green">
          <div className="stat-value">{stats.nodesOnline}/{stats.totalNodes}</div>
          <div className="stat-label">Nodes Online</div>
        </div>
        <div className="stat-card stat-card--yellow">
          <div className="stat-value">{stats.avgRiskScore}</div>
          <div className="stat-label">Avg Risk Score</div>
        </div>
        <div className="stat-card stat-card--red">
          <div className="stat-value">{stats.criticalCount}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-card stat-card--orange">
          <div className="stat-value">{stats.highCount}</div>
          <div className="stat-label">High Priority</div>
        </div>
        <div className="stat-card stat-card--blue">
          <div className="stat-value">{stats.openCount}</div>
          <div className="stat-label">Open Incidents</div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <h3 className="section-subtitle">📋 Recent Activity</h3>
      <div className="activity-feed">
        {stats.recentIncidents.map((incident: Incident) => (
          <div key={incident.id} className={`activity-item severity-border--${incident.severity.toLowerCase()}`}>
            <div className="activity-header">
              <span className="activity-emoji">{getTypeEmoji(incident.type)}</span>
              <span className="activity-title">{incident.title}</span>
              <span className={`badge badge--severity badge--${getSeverityClass(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className={`badge badge--status badge--${getStatusClass(incident.status)}`}>
                {incident.status.replace('_', ' ')}
              </span>
            </div>
            <div className="activity-meta">
              📍 {incident.location} &nbsp;|&nbsp; 🕐 {formatRelativeTime(incident.createdAt)}
              &nbsp;|&nbsp; 🎯 Risk: <strong>{incident.riskScore}</strong>
            </div>
            <div className="activity-ai-summary">{incident.aiSummary}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
