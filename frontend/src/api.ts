// API helper functions for communicating with the backend

import { Incident, Alert, MeshNode, DashboardStats } from './types';

const BASE_URL = '/api';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getDashboardStats:  ()              => fetchJson<DashboardStats>('/dashboard/stats'),
  getIncidents:       ()              => fetchJson<Incident[]>('/incidents'),
  getIncident:        (id: string)    => fetchJson<Incident>(`/incidents/${id}`),
  createIncident:     (data: object)  => fetchJson<Incident>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus:       (id: string, status: string) =>
    fetchJson<Incident>(`/incidents/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  getAlerts:          ()              => fetchJson<Alert[]>('/alerts'),
  acknowledgeAlert:   (id: string)    => fetchJson<Alert>(`/alerts/${id}/acknowledge`, { method: 'POST' }),
  getNodes:           ()              => fetchJson<MeshNode[]>('/nodes'),
};
