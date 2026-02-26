import React, { useState } from 'react';
import { api } from '../api';
import { IncidentType, Incident } from '../types';
import { getTypeEmoji, getSeverityClass } from '../utils';

export const Report: React.FC = () => {
  const [form, setForm] = useState({
    title:        '',
    description:  '',
    location:     '',
    reporterName: '',
    type:         'unknown' as IncidentType,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<Incident | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const incidentTypes: IncidentType[] = [
    'unknown', 'fire', 'intrusion', 'medical', 'hazmat', 'traffic', 'cyber', 'natural_disaster',
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const incident = await api.createIncident(form);
      setResult(incident);
      // Reset form
      setForm({ title: '', description: '', location: '', reporterName: '', type: 'unknown' });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="report-page">
      <h2 className="section-title">📝 Submit Incident Report</h2>
      <p className="report-subtitle">
        Reports are automatically cataloged by the AI engine and relayed through the mesh network.
        HIGH and CRITICAL incidents trigger immediate first-responder alerts.
      </p>

      <form className="report-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Incident Title *</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="e.g. Smoke detected in Server Room B"
            value={form.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder="Describe what you observed. Include relevant details such as extent, casualties, or equipment involved."
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="location">Location *</label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="e.g. Building A, Floor 3"
              value={form.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reporterName">Your Name / Unit *</label>
            <input
              id="reporterName"
              name="reporterName"
              type="text"
              placeholder="e.g. Officer Smith / Unit-7"
              value={form.reporterName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="type">Incident Type (optional – AI will auto-classify)</label>
          <select id="type" name="type" value={form.type} onChange={handleChange}>
            {incidentTypes.map(t => (
              <option key={t} value={t}>
                {getTypeEmoji(t)} {t === 'unknown' ? 'Let AI determine' : t.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn btn--submit" disabled={submitting}>
          {submitting ? '🔄 Submitting & Analyzing...' : '🚀 Submit & Analyze with AI'}
        </button>
      </form>

      {/* Error state */}
      {error && <div className="form-error">❌ {error}</div>}

      {/* Success: show AI analysis result */}
      {result && (
        <div className="report-result">
          <h3>✅ Incident Submitted – AI Analysis Complete</h3>
          <div className={`result-card severity-border--${result.severity.toLowerCase()}`}>
            <div className="result-header">
              <span>{getTypeEmoji(result.type)}</span>
              <strong>{result.title}</strong>
              <span className={`badge badge--severity badge--${getSeverityClass(result.severity)}`}>
                {result.severity}
              </span>
            </div>
            <div className="result-details">
              <div><strong>Type:</strong> {result.type.replace('_', ' ')}</div>
              <div><strong>Risk Score:</strong> {result.riskScore}/100</div>
              <div><strong>Status:</strong> {result.status}</div>
              <div><strong>ID:</strong> <code>{result.id}</code></div>
            </div>
            <div className="result-ai-summary">{result.aiSummary}</div>
            {(result.severity === 'HIGH' || result.severity === 'CRITICAL') && (
              <div className="result-alert-notice">
                🚨 First-responder alert automatically generated and relayed through the mesh network.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
