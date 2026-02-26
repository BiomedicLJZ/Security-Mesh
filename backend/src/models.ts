// Data models for the Security Mesh platform

export type IncidentType = 'fire' | 'intrusion' | 'medical' | 'hazmat' | 'traffic' | 'cyber' | 'natural_disaster' | 'unknown';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type NodeStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  description: string;
  location: string;
  reporterName: string;
  type: IncidentType;
  severity: Severity;
  status: IncidentStatus;
  aiSummary: string;
  riskScore: number;         // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  incidentId: string;
  incidentTitle: string;
  type: IncidentType;
  severity: Severity;
  message: string;
  location: string;
  status: AlertStatus;
  responderUnit?: string;
  createdAt: string;
  acknowledgedAt?: string;
}

export interface MeshNode {
  id: string;
  name: string;
  location: string;
  status: NodeStatus;
  ipAddress: string;
  lastSeen: string;
  connectedPeers: number;
  incidentsRelayed: number;
}

// Payload accepted by POST /api/incidents
export interface CreateIncidentPayload {
  title: string;
  description: string;
  location: string;
  reporterName: string;
  type?: IncidentType;
}

// WebSocket message envelope
export interface WsMessage {
  event: 'new_incident' | 'incident_updated' | 'new_alert' | 'alert_acknowledged' | 'node_update';
  data: Incident | Alert | MeshNode;
}
