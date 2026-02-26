# 🛡️ Security Mesh — AI-Powered Threat Intelligence Network

> **Educational Mockup** — A fully functional demonstration of a mesh-based, AI-driven security incident management platform, built for students learning about distributed systems, real-time web applications, and AI-augmented workflows.

---

## 📋 Overview

Security Mesh simulates a next-generation security operations center (SOC) where:

- **Mesh nodes** form a resilient peer-to-peer network to relay incident data even when central infrastructure fails
- **Incidents** submitted by users or sensors are automatically **analyzed by an AI cataloging engine** that classifies type, assigns severity, generates a human-readable summary, and calculates a risk score
- **First-responder alerts** are auto-generated for HIGH and CRITICAL incidents and broadcast in real time
- A **React dashboard** gives operators live visibility across all incidents, alerts, and network nodes

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  Dashboard | Incidents | Alerts | Network | Report Form      │
│                   WebSocket Client                           │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTP REST + WebSocket (ws://)
┌──────────────────────▼──────────────────────────────────────┐
│                    Backend (Node.js/Express)                  │
│                                                              │
│  POST /api/incidents ──► AI Cataloging Service               │
│  GET  /api/incidents       ├─ Classify type (keyword match)  │
│  GET  /api/alerts          ├─ Assign severity                │
│  GET  /api/nodes           ├─ Calculate risk score (0-100)   │
│  GET  /api/dashboard/stats └─ Generate AI summary            │
│                                                              │
│  HIGH/CRITICAL ──► Auto-create Alert ──► WebSocket Broadcast │
│                                                              │
│  In-memory Store: Incidents, Alerts, MeshNodes               │
└─────────────────────────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
      Node-Alpha   Node-Beta   Node-Gamma ...  (simulated mesh)
```

### Key Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend API | Node.js + Express + TypeScript | REST endpoints, business logic |
| WebSocket | `ws` package | Real-time event broadcasting |
| AI Service | Deterministic keyword logic | No paid API — pure simulation |
| Frontend | React 18 + TypeScript + Vite | Single-page dashboard |
| Styling | Plain CSS, dark tactical theme | No external UI framework |

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone and start everything with one command
git clone <repo-url>
cd Security-Mesh
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/health

### Option 2: Manual (Development)

**Backend:**
```bash
cd backend
npm install
npm run dev        # ts-node dev server on :3001
# or
npm run build && npm start   # compiled JS
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev        # Vite dev server on :3000 with API proxy
```

---

## ✨ Key Features

### 🤖 AI Incident Cataloging
When an incident is submitted, the AI service:
1. **Classifies** the incident type (fire, intrusion, medical, hazmat, traffic, cyber, natural_disaster)
2. **Assigns** a severity level (LOW / MEDIUM / HIGH / CRITICAL)
3. **Calculates** a risk score from 0–100
4. **Generates** a human-readable analysis summary

All logic is **purely deterministic** — no paid AI API is used. It uses keyword matching on the incident title and description, making it easy for students to understand and modify.

### 📡 Real-Time WebSocket Updates
The backend broadcasts events to all connected frontend clients:
- `new_incident` — when an incident is ingested
- `new_alert` — when a HIGH/CRITICAL incident triggers an alert
- `alert_acknowledged` — when a responder acknowledges an alert
- `incident_updated` — when an incident status changes

### 🔔 Automatic Alert Relay
Any incident classified as HIGH or CRITICAL automatically generates a first-responder alert with:
- Urgency message
- Assigned responder unit
- Location and severity

### 📊 Dashboard
Live overview showing:
- Total incidents and severity breakdown
- Active alert count
- Mesh node availability (X/5 online)
- Average risk score across all incidents
- Recent activity feed

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js 20 |
| Backend framework | Express 4 |
| Backend language | TypeScript 5 (strict) |
| WebSocket | `ws` 8 |
| Frontend framework | React 18 |
| Frontend build tool | Vite 5 |
| Frontend language | TypeScript 5 |
| Containerization | Docker + Docker Compose |
| Reverse proxy (prod) | nginx |

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/incidents` | Submit new incident (triggers AI analysis) |
| `GET`  | `/api/incidents` | List all incidents |
| `GET`  | `/api/incidents/:id` | Get single incident |
| `PUT`  | `/api/incidents/:id/status` | Update incident status |
| `GET`  | `/api/alerts` | List all alerts |
| `POST` | `/api/alerts/:id/acknowledge` | Acknowledge an alert |
| `GET`  | `/api/nodes` | List mesh network nodes |
| `GET`  | `/api/dashboard/stats` | Summary statistics |
| `GET`  | `/health` | Health check |

### POST /api/incidents Payload
```json
{
  "title": "Smoke detected in Building A",
  "description": "Smoke rising from server room on floor 3, possible electrical fire",
  "location": "Building A, Floor 3",
  "reporterName": "Officer Chen",
  "type": "unknown"
}
```

---

## 🎓 Educational Notes

### How the "AI" Works
The AI cataloging service (`backend/src/aiService.ts`) is intentionally simple:

1. **Type classification**: scans the combined title+description text for keywords associated with each incident type (e.g., "fire", "blaze", "smoke" → `fire` type)
2. **Severity**: checks for amplifier words ("critical", "severe", "multiple", "armed") and uses the incident type as a base
3. **Risk score**: combines a severity base value + type modifier + small deterministic variance
4. **Summary**: uses string templates to generate a natural-sounding analysis

In a production system, you would replace this with a call to an LLM (GPT-4, Claude, Gemini) or a purpose-trained classifier. The interface (`catalogIncident()`) would stay the same — only the implementation changes.

### Mesh Network Concept
The mesh nodes (Node-Alpha through Node-Epsilon) in this mockup are static data. In a real deployment:
- Each node would run a peer-to-peer protocol (e.g., libp2p, WebRTC mesh)
- Nodes would gossip incident data to peers when the central server is unreachable
- The DEGRADED status would reflect actual connectivity metrics

### WebSocket Architecture
The backend uses a single `WebSocketServer` attached to the same HTTP server. This is a simple fan-out broadcast — every connected client receives every event. Production systems typically use rooms/channels (Socket.IO) or message queues (Redis Pub/Sub, Kafka) for selective delivery.

---

## 📁 Project Structure

```
Security-Mesh/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts          # Entry point
│       ├── models.ts         # TypeScript interfaces
│       ├── store.ts          # In-memory data + seed data
│       ├── aiService.ts      # Simulated AI cataloging
│       ├── websocket.ts      # WebSocket server
│       └── routes/
│           ├── incidents.ts
│           ├── alerts.ts
│           ├── nodes.ts
│           └── dashboard.ts
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx          # React entry point
        ├── App.tsx           # Root component + tab navigation
        ├── App.css           # Dark tactical theme
        ├── types.ts          # Shared TypeScript types
        ├── api.ts            # API helper functions
        ├── utils.ts          # Shared utilities
        ├── hooks/
        │   └── useWebSocket.ts
        └── components/
            ├── Dashboard.tsx
            ├── Incidents.tsx
            ├── Alerts.tsx
            ├── Network.tsx
            └── Report.tsx
```
