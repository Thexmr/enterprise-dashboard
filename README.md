# 🏢 Enterprise Dashboard v2.3

Ein professionelles, Echtzeit-System-Monitoring Dashboard für Server und Docker-Umgebungen mit JWT-Authentifizierung, Multi-Channel Alerting und TimeSeries-Datenbank.

![Version](https://img.shields.io/badge/version-2.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

## 🚀 Features

### 💾 TimeSeries Datenbank (InfluxDB)
- **Langzeitspeicherung**: Alle Metriken werden persistent gespeichert
- **Historische Analyse**: Abfrage von Daten über beliebige Zeiträume
- **Statistiken**: Durchschnitt, Min, Max über Zeitperioden
- **Grafana Integration**: Professionelle Visualisierung
- **Automatische Aggregation**: Daten werden effizient gespeichert

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

### Option 1: Full Stack mit InfluxDB + Grafana (Empfohlen)

```bash
# Repository klonen
git clone https://github.com/Thexmr/enterprise-dashboard.git
cd enterprise-dashboard

# .env Datei erstellen
cp .env.example .env
# .env anpassen mit deinen Einstellungen

# Full Stack starten (Dashboard + InfluxDB + Grafana)
docker-compose -f docker-compose.influx.yml up -d

# Services:
# Dashboard: http://localhost:3000
# Grafana:   http://localhost:3001
# InfluxDB:  http://localhost:8086
```

### Option 2: Nur Dashboard (ohne Langzeitspeicherung)

```bash
# Dependencies installieren
npm install

# Server starten
npm start

# Dashboard: http://localhost:3000
```

### Option 3: Mit Authentifizierung und Alerts

```bash
npm install

# Mit Auth + Alerts
npm run start:full

# Dashboard: http://localhost:3000
# Login: admin / admin123
```

## 🔧 Konfiguration

Erstelle eine `.env` Datei:

```env
# Server Configuration
PORT=3000
NODE_ENV=production
UPDATE_INTERVAL=2000

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this
JWT_EXPIRES=24h
REFRESH_TOKEN_EXPIRES=7d

# InfluxDB Configuration
INFLUXDB_ENABLED=true
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=my-super-secret-token
INFLUXDB_ORG=enterprise
INFLUXDB_BUCKET=dashboard

# InfluxDB Init (für Docker)
INFLUXDB_USER=admin
INFLUXDB_PASSWORD=admin123

# Grafana Configuration
GRAFANA_USER=admin
GRAFANA_PASSWORD=admin123

# Alert Thresholds
ALERT_CPU_THRESHOLD=80
ALERT_MEMORY_THRESHOLD=85
ALERT_DISK_THRESHOLD=90
ALERT_TEMP_THRESHOLD=75
ALERT_COOLDOWN=300000

# Email Configuration
ALERT_EMAIL_ENABLED=false
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALERT_FROM_EMAIL=dashboard@yourdomain.com
ALERT_EMAIL_TO=admin@yourdomain.com

# Slack Configuration
ALERT_SLACK_ENABLED=false
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Discord Configuration
ALERT_DISCORD_ENABLED=false
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK

# Default Admin
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
| GET | `/api/history` | Historische Daten (Memory) | viewer+ |
| GET | `/api/history/:metric` | Historische Daten (InfluxDB) | viewer+ |
| GET | `/api/stats/:metric` | Statistiken (InfluxDB) | viewer+ |
| GET | `/api/alerts` | Aktive Alerts | viewer+ |
| POST | `/api/alerts/:id/acknowledge` | Alert bestätigen | operator+ |
| GET | `/api/users` | Benutzerliste | admin |
| POST | `/api/users` | Benutzer erstellen | admin |

### WebSocket
```
ws://localhost:3000?token=YOUR_JWT_TOKEN
```

## 💾 InfluxDB & Grafana

### Zeitbereiche für Historische Daten
- `1h` - Letzte Stunde
- `6h` - Letzte 6 Stunden
- `24h` - Letzte 24 Stunden
- `7d` - Letzte 7 Tage
- `30d` - Letzte 30 Tage

### Beispiel API-Abfragen
```bash
# CPU Daten der letzten 24 Stunden
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/history/cpu?range=24h&host=server1

# Memory Statistiken
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/stats/memory?range=7d&host=server1
```

### Grafana Dashboards
- Automatisch provisioniert bei Docker-Start
- URL: http://localhost:3001
- Login: admin / (GRAFANA_PASSWORD aus .env)

## 🐳 Docker Compose Stacks

### Full Stack (Empfohlen)
```yaml
# docker-compose.influx.yml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    environment:
      - INFLUXDB_ENABLED=true
      - INFLUXDB_URL=http://influxdb:8086
    depends_on:
      - influxdb

  influxdb:
    image: influxdb:2.7
    ports:
      - "8086:8086"
    volumes:
      - influxdb-data:/var/lib/influxdb2

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

Starten:
```bash
docker-compose -f docker-compose.influx.yml up -d
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

### v2.3.0 (2024-03-16)
- ✨ InfluxDB Integration für Langzeitspeicherung
- ✨ TimeSeries Datenbank Modul
- ✨ Grafana Dashboard Integration
- ✨ Historische Daten-API
- ✨ Statistik-API

### v2.2.0 (2024-03-16)
- ✨ Multi-Channel Alerting (Email, Slack, Discord, Webhook)
- ✨ Alert Cooldown System
- ✨ Alert Acknowledgement

### v2.1.0 (2024-03-16)
- ✨ JWT Authentication
- ✨ Role-Based Access Control (RBAC)
- ✨ Multi-Server Agent

### v2.0.0 (2024-03-16)
- ✨ Dark/Light Mode
- ✨ Live Charts
- ✨ Docker-Integration

### v1.0.0 (2024-03-16)
- 🎉 Initiale Version

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE)

## 👨‍💻 Autor

**Thexmr** - [GitHub](https://github.com/Thexmr)

---

⭐ Star das Repository wenn es dir gefällt!
