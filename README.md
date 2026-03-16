# 🏢 Enterprise Dashboard v2.1

Ein professionelles, Echtzeit-System-Monitoring Dashboard für Server und Docker-Umgebungen mit JWT-Authentifizierung.

![Version](https://img.shields.io/badge/version-2.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

## 🚀 Features

### 🔐 Authentifizierung & Sicherheit
- **JWT Token**: Sichere Authentifizierung
- **Rollenbasierte Zugriffskontrolle**: Admin, Operator, Viewer
- **Rate Limiting**: Schutz vor Brute-Force
- **Login-Seite**: Professionelle Authentifizierung
- **Token-Refresh**: Automatische Sitzungsverlängerung

### 📊 System-Monitoring
- **CPU-Überwachung**: Echtzeit-Auslastung aller Kerne
- **RAM-Überwachung**: Verwendung in GB und Prozent
- **Festplatten**: Alle Mountpoints mit Belegung
- **Netzwerk**: Download/Upload pro Interface

### 🐳 Docker-Integration
- Container-Status (Running/Stopped)
- CPU- und Memory-Nutzung pro Container
- Schnelle Übersicht aller Services

### 🌐 Multi-Server
- **Agent-System**: Überwache mehrere Server
- **Zentrales Dashboard**: Alle Server auf einen Blick
- **Verteilte Architektur**: Skalierbar und flexibel

### 🎨 UI/UX
- **Dark/Light Mode**: Umschaltbar mit LocalStorage
- **Live-Charts**: Verlauf der letzten 50 Messungen
- **Responsive**: Optimiert für Desktop und Mobile
- **Auto-Pause**: Pausiert bei Tab-Wechsel (Performance)

### 🔔 Alerting
- Automatische Warnungen bei:
  - CPU > 80%
  - RAM > 85%
  - Disk > 90%
- Visuelle Benachrichtigungen im Dashboard

### 🛠️ Technisch
- **WebSocket**: Echtzeit-Updates ohne Polling
- **REST API**: Zusätzliche Endpunkte für Integration
- **Docker-Ready**: Inkl. Dockerfile und docker-compose
- **Logging**: Winston Logger mit Datei-Ausgabe

## 📦 Installation

### Option 1: Direkt (Node.js)

```bash
# Repository klonen
git clone https://github.com/Thexmr/enterprise-dashboard.git
cd enterprise-dashboard

# Dependencies installieren
npm install

# Server starten (mit Auth)
npm run start:auth

# Dashboard öffnen: http://localhost:3000
# Login: admin / admin123
```

### Option 2: Docker

```bash
# Mit Docker Compose
docker-compose up -d

# Dashboard: http://localhost:3000
# Login: admin / admin123
```

### Option 3: Multi-Server Setup

```bash
# Starte Master + Agent
docker-compose -f docker-compose.multi.yml up -d
```

## 🔧 Konfiguration

Erstelle eine `.env` Datei:

```env
PORT=3000
NODE_ENV=production
UPDATE_INTERVAL=2000

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES=24h
REFRESH_TOKEN_EXPIRES=7d

# Alert Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90

# Default Admin (change in production!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

## 📡 API Endpunkte

### Öffentlich
| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| POST | `/api/auth/login` | Benutzeranmeldung |
| POST | `/api/auth/refresh` | Token erneuern |
| GET | `/api/health` | Server-Status |

### Authentifiziert (Bearer Token erforderlich)
| Methode | Endpunkt | Beschreibung | Rolle |
|---------|----------|--------------|-------|
| GET | `/api/metrics` | Aktuelle Metriken | viewer+ |
| GET | `/api/history` | Historische Daten | viewer+ |
| GET | `/api/alerts` | Aktive Alerts | viewer+ |
| GET | `/api/users` | Benutzerliste | admin |
| POST | `/api/users` | Benutzer erstellen | admin |
| POST | `/api/auth/logout` | Abmelden | alle |

### WebSocket
```
ws://localhost:3000?token=YOUR_JWT_TOKEN
```

## 👥 Rollen & Berechtigungen

| Rolle | Berechtigungen |
|-------|---------------|
| **admin** | Vollzugriff: Lesen, Schreiben, Benutzerverwaltung |
| **operator** | Lesen, Schreiben, Services neustarten |
| **viewer** | Nur Lesen |

## 🐳 Docker Compose Stack

### Standard (Single Server)
```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - JWT_SECRET=your-secret-key
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```

### Multi-Server
```yaml
version: '3.8'

services:
  dashboard-master:
    build: .
    ports:
      - "3000:3000"
    environment:
      - MODE=master
      - JWT_SECRET=your-secret-key

  agent-server-1:
    build: .
    environment:
      - DASHBOARD_SERVER=ws://dashboard-master:3000
      - SERVER_ID=server-1
```

## 🔐 Sicherheit

- **JWT Authentication**: Stateless, sicher
- **bcrypt**: Passwort-Hashing
- **Rate Limiting**: Schutz vor Angriffen
- **Helmet.js**: Sicherheits-Headers
- **CORS**: Konfigurierbar
- **Input Validation**: Auf allen Endpunkten

## 🧪 Testing

```bash
# Tests ausführen
npm test

# Mit Coverage
npm run test:coverage
```

## 🤝 Mitwirken

Siehe [CONTRIBUTING.md](CONTRIBUTING.md)

## 📝 Changelog

### v2.1.0 (2024-03-16)
- ✨ JWT Authentication
- ✨ Role-Based Access Control (RBAC)
- ✨ Login Page
- ✨ Rate Limiting
- ✨ Multi-Server Agent
- ✨ Token Refresh
- ✨ User Management API

### v2.0.0 (2024-03-16)
- ✨ Dark/Light Mode
- ✨ Live Charts für CPU & Memory
- ✨ Docker-Integration
- ✨ Alert System
- ✨ WebSocket Echtzeit-Updates
- ✨ Docker Compose Stack
- ✨ Responsive Design

### v1.0.0 (2024-03-16)
- 🎉 Initiale Version
- 📊 Basis Dashboard
- 📈 Statische Demo

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

## 👨‍💻 Autor

**Thexmr** - [GitHub](https://github.com/Thexmr)

---

⭐ Star das Repository wenn es dir gefällt!
