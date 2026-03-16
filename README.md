# 🏢 Enterprise Dashboard

Ein vollständiges System-Monitoring Dashboard mit Echtzeit-Updates.

![Dashboard Preview](https://img.shields.io/badge/status-live-green)

## 🚀 Features

- **💻 System-Monitor** - CPU, RAM, Disk, Netzwerk in Echtzeit
- **⚙️ Prozess-Manager** - Top-Prozesse nach CPU/RAM
- **🐳 Docker-Übersicht** - Container-Status & Steuerung
- **🌐 Netzwerk-Dashboard** - Verbindungen & Ports
- **📜 Echtzeit-Logs** - System-Logs mit Filter

## 📸 Screenshot

![Dashboard](screenshot.png)

## 🛠️ Installation

### Voraussetzungen
- Node.js 16+
- npm oder yarn

### Schritte

```bash
# Repository klonen
git clone https://github.com/DEIN-USERNAME/enterprise-dashboard.git
cd enterprise-dashboard

# Dependencies installieren
npm install

# Server starten
npm start
```

Das Dashboard ist dann unter `http://localhost:3000` erreichbar.

## 🔧 Konfiguration

Der Server läuft standardmäßig auf Port 3000. Um einen anderen Port zu nutzen:

```bash
PORT=8080 npm start
```

## 📁 Projektstruktur

```
enterprise-dashboard/
├── server.js          # Node.js Backend
├── public/
│   └── index.html     # Frontend Dashboard
├── package.json
└── README.md
```

## 🌐 API Endpunkte

| Endpunkt | Beschreibung |
|----------|-------------|
| `GET /api/system` | CPU, RAM, Disk, Netzwerk |
| `GET /api/processes` | Top-Prozesse |
| `GET /api/docker` | Container-Status |
| `GET /api/network` | Netzwerk-Verbindungen |
| `GET /api/logs` | System-Logs |
| `WS /` | WebSocket für Echtzeit-Updates |

## 📝 Lizenz

MIT License - siehe [LICENSE](LICENSE)

## 👨‍💻 Autor

Erstellt mit ❤️ für System-Administratoren
