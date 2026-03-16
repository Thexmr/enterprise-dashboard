# 🏢 Enterprise Dashboard v2.0

Ein professionelles, Echtzeit-System-Monitoring Dashboard für Server und Docker-Umgebungen.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)

## 🚀 Features

### 📊 System-Monitoring
- **CPU-Überwachung**: Echtzeit-Auslastung aller Kerne
- **RAM-Überwachung**: Verwendung in GB und Prozent
- **Festplatten**: Alle Mountpoints mit Belegung
- **Netzwerk**: Download/Upload pro Interface

### 🐳 Docker-Integration
- Container-Status (Running/Stopped)
- CPU- und Memory-Nutzung pro Container
- Schnelle Übersicht aller Services

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

# Server starten
npm start

# Dashboard öffnen: http://localhost:3000
```

### Option 2: Docker

```bash
# Mit Docker Compose
docker-compose up -d

# Dashboard: http://localhost:3000
# Optional: Grafana auf http://localhost:3001
```

### Option 3: Docker (manuell)

```bash
# Image bauen
docker build -t enterprise-dashboard .

# Container starten
docker run -d \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --name dashboard \
  enterprise-dashboard
```

## 🔧 Konfiguration

Erstelle eine `.env` Datei:

```env
PORT=3000
NODE_ENV=production
UPDATE_INTERVAL=2000

# Alert Thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
```

## 📡 API Endpunkte

| Methode | Endpunkt | Beschreibung |
|---------|----------|--------------|
| GET | `/api/health` | Server-Status |
| GET | `/api/metrics` | Aktuelle Metriken |
| GET | `/api/history` | Historische Daten |
| GET | `/api/alerts` | Aktive Alerts |
| GET | `/api/system` | Vollständige Systemdaten |
| WS | `/` | WebSocket für Echtzeit-Updates |

## 🐳 Docker Compose Stack

```yaml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  # Optional: InfluxDB für Langzeitspeicherung
  influxdb:
    image: influxdb:2.7
    volumes:
      - influxdb-data:/var/lib/influxdb2

  # Optional: Grafana für erweiterte Visualisierung
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
```

## 📱 Screenshots

*Demnächst verfügbar*

## 🛡️ Sicherheit

- **Helmet.js**: Sicherheits-Headers
- **CORS**: Konfigurierbar
- **Input Validation**: Auf allen API-Endpunkten

## 🤝 Mitwirken

1. Fork erstellen
2. Feature-Branch: `git checkout -b feature/neues-feature`
3. Commit: `git commit -m 'Feature hinzugefügt'`
4. Push: `git push origin feature/neues-feature`
5. Pull Request erstellen

## 📝 Changelog

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
