const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const osUtils = require('node-os-utils');
const si = require('systeminformation');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Statische Dateien
app.use(express.static('public'));

// API Endpunkte
app.get('/api/system', async (req, res) => {
  try {
    const cpu = await osUtils.cpu.usage();
    const mem = await osUtils.mem.used();
    const drive = await si.fsSize();
    const network = await si.networkStats();
    
    res.json({
      cpu: { usage: cpu },
      memory: {
        used: Math.round(mem.used / 1024 / 1024),
        total: Math.round(mem.total / 1024 / 1024),
        percentage: Math.round((mem.used / mem.total) * 100)
      },
      disk: drive.map(d => ({
        fs: d.fs,
        size: Math.round(d.size / 1024 / 1024 / 1024),
        used: Math.round(d.used / 1024 / 1024 / 1024),
        available: Math.round(d.available / 1024 / 1024 / 1024),
        use: d.use
      })),
      network: network.map(n => ({
        iface: n.iface,
        rx_bytes: n.rx_bytes,
        tx_bytes: n.tx_bytes,
        rx_sec: n.rx_sec,
        tx_sec: n.tx_sec
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/processes', async (req, res) => {
  try {
    const { stdout } = await execPromise("ps aux --sort=-%cpu | head -20 | awk '{print $1, $2, $3, $4, $11}'");
    const lines = stdout.trim().split('\n').slice(1);
    const processes = lines.map(line => {
      const parts = line.split(' ').filter(p => p);
      return {
        user: parts[0],
        pid: parts[1],
        cpu: parts[2],
        mem: parts[3],
        command: parts.slice(4).join(' ')
      };
    });
    res.json({ processes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker', async (req, res) => {
  try {
    const { stdout } = await execPromise('docker ps -a --format "{{.Names}}|{{.Status}}|{{.Image}}" 2>/dev/null || echo "Docker not available"');
    if (stdout.includes('Docker not available')) {
      return res.json({ containers: [], error: 'Docker not available' });
    }
    const lines = stdout.trim().split('\n').filter(l => l);
    const containers = lines.map(line => {
      const [name, status, image] = line.split('|');
      return { name, status, image };
    });
    res.json({ containers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/network', async (req, res) => {
  try {
    const { stdout: connections } = await execPromise("ss -tuln | tail -n +2 | head -30");
    const { stdout: interfaces } = await execPromise("ip addr show | grep -E '^[0-9]|inet ' | head -20");
    
    res.json({
      connections: connections.split('\n').filter(l => l.trim()),
      interfaces: interfaces.split('\n').filter(l => l.trim())
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const { stdout } = await execPromise("journalctl -n 50 --no-pager 2>/dev/null || tail -n 50 /var/log/syslog 2>/dev/null || echo 'Logs not available'");
    res.json({ logs: stdout.split('\n').filter(l => l) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket für Echtzeit-Updates
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  const interval = setInterval(async () => {
    try {
      const cpu = await osUtils.cpu.usage();
      const mem = await osUtils.mem.used();
      const network = await si.networkStats();
      
      ws.send(JSON.stringify({
        type: 'system',
        data: {
          cpu: cpu,
          memory: {
            percentage: Math.round((mem.used / mem.total) * 100),
            used: Math.round(mem.used / 1024 / 1024),
            total: Math.round(mem.total / 1024 / 1024)
          },
          network: network.map(n => ({
            rx_sec: n.rx_sec,
            tx_sec: n.tx_sec
          }))
        }
      }));
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  }, 2000);
  
  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Enterprise Dashboard running on port ${PORT}`);
});
