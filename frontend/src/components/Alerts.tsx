import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Alert } from '../types';
import { formatRelativeTime, getSeverityClass, getTypeEmoji } from '../utils';

interface Props {
  refreshTrigger: number;
}

export const Alerts: React.FC<Props> = ({ refreshTrigger }) => {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [acking, setAcking]   = useState<string | null>(null);

  const loadAlerts = () => {
    setLoading(true);
    api.getAlerts()
      .then(setAlerts)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAlerts(); }, [refreshTrigger]);

  const handleAcknowledge = async (id: string) => {
    setAcking(id);
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? updated : a));
    } catch (e) {
      setError(String(e));
    } finally {
      setAcking(null);
    }
  };

  if (loading) return <div className="loading">Loading alerts...</div>;
  if (error)   return <div className="error">{error}</div>;

  const active       = alerts.filter(a => a.status === 'active');
  const acknowledged = alerts.filter(a => a.status !== 'active');

  return (
    <div className="alerts-page">
      <h2 className="section-title">🚨 First Responder Alerts</h2>

      {active.length > 0 && (
        <div className="alert-badge-bar">
          <span className="pulse-dot" />
          {active.length} active alert{active.length !== 1 ? 's' : ''} require attention
        </div>
      )}

      {alerts.length === 0 && (
        <div className="empty-state">✅ No active alerts at this time.</div>
      )}

      {/* Active Alerts */}
      {active.map(alert => (
        <div key={alert.id} className={`alert-card alert-card--active severity-border--${alert.severity.toLowerCase()}`}>
          <div className="alert-card-header">
            <span className="alert-type-emoji">{getTypeEmoji(alert.type)}</span>
            <div className="alert-title-block">
              <span className="alert-title">{alert.incidentTitle}</span>
              <span className="alert-location">📍 {alert.location}</span>
            </div>
            <span className={`badge badge--severity badge--${getSeverityClass(alert.severity)}`}>
              {alert.severity}
            </span>
            <span className="badge badge--status badge--active">ACTIVE</span>
            <button
              className="btn btn--acknowledge"
              onClick={() => handleAcknowledge(alert.id)}
              disabled={acking === alert.id}
            >
              {acking === alert.id ? 'Acknowledging...' : '✓ Acknowledge'}
            </button>
          </div>
          <div className="alert-message">{alert.message}</div>
          <div className="alert-meta">
            {alert.responderUnit && <span>👮 {alert.responderUnit}</span>}
            <span>🕐 {formatRelativeTime(alert.createdAt)}</span>
          </div>
        </div>
      ))}

      {/* Acknowledged Alerts */}
      {acknowledged.length > 0 && (
        <>
          <h3 className="section-subtitle">Acknowledged / Resolved</h3>
          {acknowledged.map(alert => (
            <div key={alert.id} className="alert-card alert-card--acknowledged">
              <div className="alert-card-header">
                <span className="alert-type-emoji">{getTypeEmoji(alert.type)}</span>
                <div className="alert-title-block">
                  <span className="alert-title">{alert.incidentTitle}</span>
                  <span className="alert-location">📍 {alert.location}</span>
                </div>
                <span className={`badge badge--severity badge--${getSeverityClass(alert.severity)}`}>
                  {alert.severity}
                </span>
                <span className="badge badge--status badge--acknowledged">ACKNOWLEDGED</span>
              </div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-meta">
                {alert.responderUnit && <span>👮 {alert.responderUnit}</span>}
                <span>🕐 {formatRelativeTime(alert.createdAt)}</span>
                {alert.acknowledgedAt && (
                  <span>✓ Acknowledged {formatRelativeTime(alert.acknowledgedAt)}</span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
