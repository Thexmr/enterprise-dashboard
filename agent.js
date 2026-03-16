/**
 * Multi-Server Dashboard Agent
 * Verbindet mehrere Server mit dem zentralen Dashboard
 */

const WebSocket = require('ws');
const si = require('systeminformation');

class DashboardAgent {
  constructor(config) {
    this.config = {
      serverUrl: config.serverUrl || 'ws://localhost:3000',
      apiKey: config.apiKey,
      serverId: config.serverId || require('os').hostname(),
      updateInterval: config.updateInterval || 5000,
      ...config
    };
    
    this.ws = null;
    this.reconnectInterval = 5000;
    this.isConnected = false;
  }

  async start() {
    console.log(`🚀 Starting Dashboard Agent for ${this.config.serverId}`);
    await this.connect();
    this.startReporting();
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.serverUrl, {
          headers: {
            'X-API-Key': this.config.apiKey,
            'X-Server-ID': this.config.serverId
          }
        });

        this.ws.on('open', () => {
          console.log('✅ Connected to Dashboard Server');
          this.isConnected = true;
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleCommand(JSON.parse(data));
        });

        this.ws.on('close', () => {
          console.log('❌ Disconnected from Dashboard Server');
          this.isConnected = false;
          setTimeout(() => this.connect(), this.reconnectInterval);
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async collectMetrics() {
    const [
      cpu,
      mem,
      disk,
      network,
      processes,
      docker,
      system
    ] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.processes(),
      si.dockerContainers().catch(() => []),
      si.system()
    ]);

    return {
      serverId: this.config.serverId,
      timestamp: Date.now(),
      system: {
        cpu: {
          usage: Math.round(cpu.currentLoad),
          cores: cpu.cpus.length
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
          rx_sec: Math.round(n.rx_sec / 1024 * 100) / 100,
          tx_sec: Math.round(n.tx_sec / 1024 * 100) / 100
        }))
      },
      processes: processes.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 5)
        .map(p => ({
          pid: p.pid,
          name: p.name,
          cpu: Math.round(p.cpu * 100) / 100,
          mem: Math.round(p.mem * 100) / 100
        })),
      docker: docker.map(c => ({
        id: c.id,
        name: c.name,
        status: c.state,
        cpu: c.cpuPercent,
        mem: c.memPercent
      })),
      info: {
        hostname: system.hostname,
        platform: system.platform,
        distro: system.distro,
        uptime: system.uptime
      }
    };
  }

  startReporting() {
    setInterval(async () => {
      if (!this.isConnected) return;
      
      try {
        const metrics = await this.collectMetrics();
        this.ws.send(JSON.stringify({
          type: 'metrics',
          data: metrics
        }));
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, this.config.updateInterval);
  }

  handleCommand(command) {
    switch (command.type) {
      case 'restart':
        console.log('Received restart command');
        // Implement restart logic
        break;
      case 'update':
        console.log('Received update command');
        // Implement update logic
        break;
      default:
        console.log('Unknown command:', command);
    }
  }
}

// Start if run directly
if (require.main === module) {
  const agent = new DashboardAgent({
    serverUrl: process.env.DASHBOARD_SERVER || 'ws://localhost:3000',
    apiKey: process.env.API_KEY,
    serverId: process.env.SERVER_ID || require('os').hostname(),
    updateInterval: parseInt(process.env.UPDATE_INTERVAL) || 5000
  });

  agent.start().catch(console.error);
}

module.exports = DashboardAgent;
