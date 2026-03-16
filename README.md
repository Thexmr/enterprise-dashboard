# 🏢 Enterprise Dashboard v2.2

Ein professionelles, Echtzeit-System-Monitoring Dashboard für Server und Docker-Umgebungen mit JWT-Authentifizierung und Multi-Channel Alerting.

![Version](https://img.shields.io/badge/version-2.2.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

## 🚀 Features

### 🔔 Multi-Channel Alerting
- **E-Mail**: SMTP mit HTML Templates
- **Slack**: Webhook Integration mit Rich Embeds
- **Discord**: Webhook Integration mit Embeds
- **Generic Webhook**: Für benutzerdefinierte Integrationen
- **Alert Cooldown**: Keine Spam-Benachrichtigungen
- **Acknowledgement**: Alerts als bearbeitet markieren

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

# Server starten (mit Alerts)
npm run start:alerts

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
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_DISK_THRESHOLD=90
ALERT_TEMP_THRESHOLD=75
ALERT_COOLDOWN=300000

# Email Configuration
ALERT_EMAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_FROM_EMAIL=dashboard@yourdomain.com
ALERT_EMAIL_TO=admin@yourdomain.com,ops@yourdomain.com

# Slack Configuration
ALERT_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord Configuration
ALERT_DISCORD_ENABLED=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK

# Generic Webhook
ALERT_WEBHOOK_ENABLED=true
WEBHOOK_URL=https://your-custom-webhook.com/alerts

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
| POST | `/api/alerts/:id/acknowledge` | Alert bestätigen | operator+ |
| GET | `/api/users` | Benutzerliste | admin |
| POST | `/api/users` | Benutzer erstellen | admin |
| POST | `/api/auth/logout` | Abmelden | alle |

### WebSocket
```
ws://localhost:3000?token=YOUR_JWT_TOKEN
```

## 🔔 Alert Konfiguration

### Alert Thresholds
- **CPU**: Standard 80% (kritisch bei 90%)
- **Memory**: Standard 85% (kritisch bei 90%)
- **Disk**: Standard 90% (kritisch bei 95%)
- **Temperature**: Standard 75°C

### Alert Cooldown
- Standard: 5 Minuten zwischen gleichen Alerts
- Verhindert Spam-Benachrichtigungen
- Konfigurierbar via `ALERT_COOLDOWN`

### Alert Severity
- **Critical**: Sofortige Benachrichtigung (rot)
- **Warning**: Wichtige Hinweise (gelb)
- **Info**: Informationen (blau)

## 👥 Rollen & Berechtigungen

| Rolle | Berechtigungen |
|-------|---------------|
| **admin** | Vollzugriff: Lesen, Schreiben, Benutzerverwaltung, Alerts bestätigen |
| **operator** | Lesen, Schreiben, Services neustarten, Alerts bestätigen |
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
      - ALERT_EMAIL_ENABLED=true
      - SMTP_HOST=smtp.gmail.com
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

### v2.2.0 (2024-03-16)
- ✨ Multi-Channel Alerting (Email, Slack, Discord, Webhook)
- ✨ Alert Cooldown System
- ✨ Alert Acknowledgement
- ✨ HTML Email Templates
- ✨ Rich Embeds für Slack/Discord

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
