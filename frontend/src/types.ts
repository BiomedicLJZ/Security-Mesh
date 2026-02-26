// Shared TypeScript types mirroring the backend models

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
  riskScore: number;
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

export interface DashboardStats {
  totalIncidents: number;
  activeAlerts: number;
  nodesOnline: number;
  totalNodes: number;
  avgRiskScore: number;
  criticalCount: number;
  highCount: number;
  openCount: number;
  recentIncidents: Incident[];
}

export interface WsMessage {
  event: string;
  data: Incident | Alert | MeshNode | { message: string };
}
