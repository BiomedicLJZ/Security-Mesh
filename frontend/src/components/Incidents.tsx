import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Incident, IncidentType, Severity } from '../types';
import { formatRelativeTime, getSeverityClass, getTypeEmoji, getStatusClass } from '../utils';

interface Props {
  refreshTrigger: number;
}

export const Incidents: React.FC<Props> = ({ refreshTrigger }) => {
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSev, setFilterSev]   = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    api.getIncidents()
      .then(setIncidents)
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [refreshTrigger]);

  const filtered = incidents.filter(i => {
    const typeOk = filterType === 'all' || i.type === filterType;
    const sevOk  = filterSev  === 'all' || i.severity === filterSev;
    return typeOk && sevOk;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (loading) return <div className="loading">Loading incidents...</div>;
  if (error)   return <div className="error">{error}</div>;

  const types: IncidentType[] = ['fire', 'intrusion', 'medical', 'hazmat', 'traffic', 'cyber', 'natural_disaster', 'unknown'];
  const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="incidents">
      <h2 className="section-title">🚨 Incident Log</h2>

      {/* Filters */}
      <div className="filters">
        <label>
          Type:&nbsp;
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {types.map(t => (
              <option key={t} value={t}>{getTypeEmoji(t)} {t.replace('_', ' ')}</option>
            ))}
          </select>
        </label>
        <label>
          Severity:&nbsp;
          <select value={filterSev} onChange={e => setFilterSev(e.target.value)}>
            <option value="all">All Severities</option>
            {severities.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <span className="filter-count">{filtered.length} / {incidents.length} incidents</span>
      </div>

      {/* Incidents Table */}
      <div className="incident-list">
        {filtered.length === 0 && <div className="empty-state">No incidents match the current filters.</div>}
        {filtered.map(incident => (
          <div
            key={incident.id}
            className={`incident-row severity-border--${incident.severity.toLowerCase()}`}
            onClick={() => toggleExpand(incident.id)}
          >
            <div className="incident-row-header">
              <span className="incident-type-emoji">{getTypeEmoji(incident.type)}</span>
              <div className="incident-title-block">
                <span className="incident-title">{incident.title}</span>
                <span className="incident-location">📍 {incident.location}</span>
              </div>
              <div className="incident-badges">
                <span className={`badge badge--severity badge--${getSeverityClass(incident.severity)}`}>
                  {incident.severity}
                </span>
                <span className={`badge badge--type`}>{incident.type.replace('_', ' ')}</span>
                <span className={`badge badge--status badge--${getStatusClass(incident.status)}`}>
                  {incident.status.replace('_', ' ')}
                </span>
              </div>
              <div className="incident-risk">
                <span className="risk-label">Risk</span>
                <span className={`risk-score risk-score--${getRiskLevel(incident.riskScore)}`}>
                  {incident.riskScore}
                </span>
              </div>
              <span className="incident-time">{formatRelativeTime(incident.createdAt)}</span>
              <span className="expand-icon">{expandedId === incident.id ? '▲' : '▼'}</span>
            </div>

            {expandedId === incident.id && (
              <div className="incident-details">
                <div className="detail-section">
                  <strong>Description:</strong>
                  <p>{incident.description}</p>
                </div>
                <div className="detail-section">
                  <strong>🤖 AI Analysis:</strong>
                  <p className="ai-summary">{incident.aiSummary}</p>
                </div>
                <div className="detail-grid">
                  <div><strong>Reporter:</strong> {incident.reporterName}</div>
                  <div><strong>Created:</strong> {new Date(incident.createdAt).toLocaleString()}</div>
                  <div><strong>Updated:</strong> {new Date(incident.updatedAt).toLocaleString()}</div>
                  <div><strong>Risk Score:</strong> {incident.riskScore}/100</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

function getRiskLevel(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}
