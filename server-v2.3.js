/**
 * Enterprise Dashboard v2.3 - Full Stack
 * With Auth, Alerts, and TimeSeries DB (InfluxDB)
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const si = require('systeminformation');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const cron = require('node-cron');
const winston = require('winston');
const path = require('path');
require('dotenv').config();

const { AuthManager, loginLimiter, apiLimiter } = require('./auth');
const AlertManager = require('./alerts');
const TimeSeriesDB = require('./timeseries');
const alertConfig = require('./config/alerts');

// Initialize
const auth = new AuthManager();
const alertManager = new AlertManager(alertConfig);
const tsdb = new TimeSeriesDB({
  enabled: process.env.INFLUXDB_ENABLED === 'true',
  url: process.env.INFLUXDB_URL,
  token: process.env.INFLUXDB_TOKEN,
  org: process.env.INFLUXDB_ORG || 'enterprise',
  bucket: process.env.INFLUXDB_BUCKET || 'dashboard'
});

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// State
const clients = new Map();
const metrics = { history: [], alerts: [], maxHistory: 100 };

/**
 * Collect System Metrics
 */
async function collectMetrics() {
  try {
    const [cpu, mem, disk, network, processes, docker, system, temp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.dockerContainers().catch(() => []),
      si.system(),
      si.cpuTemperature().catch(() => ({ main: 0 }))
    ]);

    const data = {
      timestamp: Date.now(),
      system: {
        cpu: {
          usage: Math.round(cpu.currentLoad),
          cores: cpu.cpus.map(c => Math.round(c.load)),
          temperature: temp.main || 0
        },
        memory: {
          used: Math.round(mem.used / 1024 / 1024 / 1024 * 100) / 100,
          total: Math.round(mem.total / 1024 / 1024 / 1024 * 100) / 100,
          percentage: Math.round(mem.used / mem.total * 100)
        },
        disk: disk.map(d => ({
          fs: d.fs,
          used: Math.round(d.used / 1024 / 1024 / 1024),
          size: Math.round(d.size / 1024 / 1024 / 1024),
          percentage: Math.round(d.use)
        })),
        network: network.map(n => ({
          iface: n.iface,
          rx: Math.round(n.rx_bytes / 1024 / 1024 * 100) / 100,
          tx: Math.round(n.tx_bytes / 1024 / 1024 * 100) / 100,
          rx_sec: Math.round(n.rx_sec / 1024 * 100) / 100,
          tx_sec: Math.round(n.tx_sec / 1024 * 100) / 100
        }))
      },
      processes: processes.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 10)
        .map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: Math.round(p.cpu * 100) / 100,
          mem: Math.round(p.mem * 100) / 100,
          command: p.command
        })),
      docker: docker.map(c => ({
        id: c.id,
        name: c.name,
        image: c.image,
        status: c.state,
        uptime: c.started,
        cpu: c.cpuPercent,
        mem: c.memPercent
      })),
      info: {
        hostname: system.hostname,
        platform: system.platform,
        distro: system.distro,
        release: system.release,
        arch: system.arch,
        uptime: system.uptime
      }
    };

    // Send alerts
    await checkAndSendAlerts(data);
    
    // Store in TimeSeries DB
    await tsdb.writeMetrics(data);

    // Store in memory
    metrics.history.push(data);
    if (metrics.history.length > metrics.maxHistory) {
      metrics.history.shift();
    }

    return data;
  } catch (error) {
    logger.error('Error collecting metrics:', error);
    return null;
  }
}

async function checkAndSendAlerts(data) {
  const server = data.info.hostname;

  if (data.system.cpu.usage > alertConfig.thresholds.cpu) {
    const alert = alertManager.createAlert('threshold', 'cpu', data.system.cpu.usage, alertConfig.thresholds.cpu, server);
    await alertManager.sendAlert(alert);
    metrics.alerts.push({ ...alert, acknowledged: false });
  }

  if (data.system.memory.percentage > alertConfig.thresholds.memory) {
    const alert = alertManager.createAlert('threshold', 'memory', data.system.memory.percentage, alertConfig.thresholds.memory, server);
    await alertManager.sendAlert(alert);
    metrics.alerts.push({ ...alert, acknowledged: false });
  }

  for (const d of data.system.disk) {
    if (d.percentage > alertConfig.thresholds.disk) {
      const alert = alertManager.createAlert('threshold', 'disk', d.percentage, alertConfig.thresholds.disk, `${server} (${d.fs})`);
      await alertManager.sendAlert(alert);
      metrics.alerts.push({ ...alert, acknowledged: false });
    }
  }
}

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach((userInfo, client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// WebSocket with Auth
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  const user = auth.verifyToken(token);
  if (!user) {
    ws.close(1008, 'Invalid token');
    return;
  }

  const ip = req.socket.remoteAddress;
  logger.info(`Client connected: ${user.username} from ${ip}`);
  clients.set(ws, user);

  if (metrics.history.length > 0) {
    ws.send(JSON.stringify({
      type: 'init',
      data: metrics.history[metrics.history.length - 1],
      history: metrics.history,
      user: { username: user.username, role: user.role }
    }));
  }

  ws.on('close', () => {
    logger.info(`Client disconnected: ${user.username}`);
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await auth.authenticate(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = auth.generateToken(user);
    const refreshToken = auth.generateRefreshToken(user);

    logger.info(`User logged in: ${user.username}`);
    res.json({ token, refreshToken, user });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    uptime: process.uptime(), 
    timestamp: Date.now(),
    influxdb: tsdb.config.enabled 
  });
});

app.get('/api/metrics', auth.middleware(), async (req, res) => {
  const data = await collectMetrics();
  res.json(data);
});

app.get('/api/history', auth.middleware(), (req, res) => {
  res.json(metrics.history);
});

// Query historical data from InfluxDB
app.get('/api/history/:metric', auth.middleware(), async (req, res) => {
  if (!tsdb.config.enabled) {
    return res.status(503).json({ error: 'TimeSeries DB not enabled' });
  }
  
  const { metric } = req.params;
  const { range = '1h', host } = req.query;
  
  const data = await tsdb.queryHistory(metric, host || req.user.hostname, range);
  res.json(data);
});

// Get statistics
app.get('/api/stats/:metric', auth.middleware(), async (req, res) => {
  if (!tsdb.config.enabled) {
    return res.status(503).json({ error: 'TimeSeries DB not enabled' });
  }
  
  const { metric } = req.params;
  const { range = '24h', host } = req.query;
  
  const stats = await tsdb.getStats(metric, host || req.user.hostname, range);
  res.json(stats);
});

app.get('/api/alerts', auth.middleware(), (req, res) => {
  res.json(metrics.alerts);
});

app.post('/api/alerts/:id/acknowledge', auth.middleware(), (req, res) => {
  const alert = metrics.alerts.find(a => a.id === req.params.id);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedBy = req.user.username;
    alert.acknowledgedAt = Date.now();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// Admin routes
app.get('/api/users', auth.middleware(), auth.requireRole('admin'), (req, res) => {
  res.json(auth.listUsers());
});

app.post('/api/users', auth.middleware(), auth.requireRole('admin'), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = await auth.createUser(username, password, role);
    logger.info(`User created: ${username} by ${req.user.username}`);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Static files
app.use('/login.html', express.static('public/login.html'));
app.use((req, res, next) => {
  if (req.path === '/' || req.path === '/index.html') {
    const token = req.headers.authorization?.substring(7) || req.query.token;
    if (!token || !auth.verifyToken(token)) {
      return res.redirect('/login.html');
    }
  }
  next();
});
app.use(express.static('public'));

// Start metrics collection
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 2000;
setInterval(async () => {
  const data = await collectMetrics();
  if (data) {
    broadcast({ type: 'update', data });
  }
}, UPDATE_INTERVAL);

// Daily cleanup
cron.schedule('0 0 * * *', () => {
  logger.info('Running daily cleanup');
  metrics.alerts = metrics.alerts.filter(a => 
    Date.now() - a.timestamp < 24 * 60 * 60 * 1000
  );
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Enterprise Dashboard v2.3 running on port ${PORT}`);
  logger.info(`🔐 Authentication: enabled`);
  logger.info(`🔔 Alerts: Email=${alertConfig.email.enabled}, Slack=${alertConfig.slack.enabled}, Discord=${alertConfig.discord.enabled}`);
  logger.info(`💾 TimeSeries DB: ${tsdb.config.enabled ? 'connected' : 'disabled'}`);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await tsdb.close();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
