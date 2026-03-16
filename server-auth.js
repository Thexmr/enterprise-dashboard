/**
 * Enterprise Dashboard v2.1 - Server with Authentication
 * Real-time system monitoring with WebSocket and JWT auth
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

// Initialize Auth
const auth = new AuthManager();

// Logger Setup
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
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());
app.use(express.json());

// Rate limiting
app.use('/api/', apiLimiter);
app.use('/api/auth/login', loginLimiter);

// State
const clients = new Map(); // Map WebSocket to user info
const metrics = {
  history: [],
  alerts: [],
  maxHistory: 100
};

// Alert Thresholds
const THRESHOLDS = {
  cpu: parseInt(process.env.CPU_THRESHOLD) || 80,
  memory: parseInt(process.env.MEMORY_THRESHOLD) || 85,
  disk: parseInt(process.env.DISK_THRESHOLD) || 90,
  temperature: 75
};

/**
 * Collect System Metrics
 */
async function collectMetrics() {
  try {
    const [
      cpu,
      mem,
      disk,
      network,
      processes,
      docker,
      system,
      temperature
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.dockerContainers().catch(() => []),
      si.system(),
      si.cpuTemperature().catch(() => ({ main: 0 }))
    ]);

    const timestamp = Date.now();
    
    const data = {
      timestamp,
      system: {
        cpu: {
          usage: Math.round(cpu.currentLoad),
          cores: cpu.cpus.map(c => Math.round(c.load)),
          temperature: temperature.main || 0
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

    checkAlerts(data);

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

function checkAlerts(data) {
  const newAlerts = [];

  if (data.system.cpu.usage > THRESHOLDS.cpu) {
    newAlerts.push({
      type: 'warning',
      message: `CPU usage high: ${data.system.cpu.usage}%`,
      timestamp: Date.now()
    });
  }

  if (data.system.memory.percentage > THRESHOLDS.memory) {
    newAlerts.push({
      type: 'warning',
      message: `Memory usage high: ${data.system.memory.percentage}%`,
      timestamp: Date.now()
    });
  }

  data.system.disk.forEach(d => {
    if (d.percentage > THRESHOLDS.disk) {
      newAlerts.push({
        type: 'critical',
        message: `Disk space low on ${d.fs}: ${d.percentage}%`,
        timestamp: Date.now()
      });
    }
  });

  if (newAlerts.length > 0) {
    metrics.alerts.push(...newAlerts);
    logger.warn('Alerts triggered:', newAlerts);
  }
}

function broadcast(data, userFilter = null) {
  const message = JSON.stringify(data);
  clients.forEach((userInfo, client) => {
    if (client.readyState === WebSocket.OPEN) {
      if (!userFilter || userInfo.role === userFilter) {
        client.send(message);
      }
    }
  });
}

// WebSocket Connection Handling with Auth
wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  // Verify token
  const user = auth.verifyToken(token);
  if (!user) {
    ws.close(1008, 'Invalid token');
    return;
  }

  const ip = req.socket.remoteAddress;
  logger.info(`Client connected: ${user.username} from ${ip}`);
  
  clients.set(ws, user);

  // Send initial data
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
    
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken || !auth.refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const user = auth.getUserById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const newToken = auth.generateToken(user);
    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

app.post('/api/auth/logout', auth.middleware(), (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    auth.logout(refreshToken);
  }
  logger.info(`User logged out: ${req.user.username}`);
  res.json({ message: 'Logged out successfully' });
});

// Protected API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/metrics', auth.middleware(), async (req, res) => {
  const data = await collectMetrics();
  res.json(data);
});

app.get('/api/history', auth.middleware(), (req, res) => {
  res.json(metrics.history);
});

app.get('/api/alerts', auth.middleware(), (req, res) => {
  res.json(metrics.alerts);
});

// Admin only routes
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

// Static files with auth check
app.use('/login.html', express.static('public/login.html'));

app.use((req, res, next) => {
  // Check if user is authenticated for dashboard
  if (req.path === '/' || req.path === '/index.html') {
    const token = req.headers.authorization?.substring(7) || 
                  req.query.token;
    
    if (!token || !auth.verifyToken(token)) {
      return res.redirect('/login.html');
    }
  }
  next();
});

app.use(express.static('public'));

// Start Metrics Collection
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL) || 2000;

setInterval(async () => {
  const data = await collectMetrics();
  if (data) {
    broadcast({
      type: 'update',
      data
    });
  }
}, UPDATE_INTERVAL);

// Daily Cleanup
cron.schedule('0 0 * * *', () => {
  logger.info('Running daily cleanup');
  metrics.alerts = metrics.alerts.filter(a => 
    Date.now() - a.timestamp < 24 * 60 * 60 * 1000
  );
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`🚀 Enterprise Dashboard v2.1 running on port ${PORT}`);
  logger.info(`🔐 Authentication enabled`);
  logger.info(`📊 WebSocket endpoint: ws://localhost:${PORT}?token=YOUR_TOKEN`);
  logger.info(`🔍 API endpoint: http://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
