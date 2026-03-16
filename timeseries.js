/**
 * Enterprise Dashboard - TimeSeries Database Integration
 * Supports InfluxDB for long-term metrics storage
 */

const { InfluxDB, Point } = require('@influxdata/influxdb-client');
const winston = require('winston');

class TimeSeriesDB {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled || false,
      url: config.url || 'http://localhost:8086',
      token: config.token,
      org: config.org || 'enterprise',
      bucket: config.bucket || 'dashboard',
      ...config
    };

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'logs/influxdb.log' })
      ]
    });

    if (this.config.enabled) {
      this.init();
    }
  }

  init() {
    try {
      this.client = new InfluxDB({
        url: this.config.url,
        token: this.config.token
      });

      this.writeApi = this.client.getWriteApi(
        this.config.org,
        this.config.bucket,
        'ns'
      );

      this.queryApi = this.client.getQueryApi(this.config.org);
      
      this.logger.info('InfluxDB connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to InfluxDB:', error);
      this.config.enabled = false;
    }
  }

  /**
   * Write metrics to InfluxDB
   */
  async writeMetrics(data) {
    if (!this.config.enabled || !this.writeApi) return;

    try {
      const timestamp = new Date(data.timestamp);
      const hostname = data.info.hostname;

      // CPU metrics
      const cpuPoint = new Point('cpu')
        .tag('host', hostname)
        .floatField('usage', data.system.cpu.usage)
        .floatField('temperature', data.system.cpu.temperature)
        .timestamp(timestamp);
      
      for (let i = 0; i < data.system.cpu.cores.length; i++) {
        cpuPoint.floatField(`core_${i}`, data.system.cpu.cores[i]);
      }
      
      this.writeApi.writePoint(cpuPoint);

      // Memory metrics
      const memPoint = new Point('memory')
        .tag('host', hostname)
        .floatField('used_gb', data.system.memory.used)
        .floatField('total_gb', data.system.memory.total)
        .floatField('percentage', data.system.memory.percentage)
        .timestamp(timestamp);
      
      this.writeApi.writePoint(memPoint);

      // Disk metrics
      for (const disk of data.system.disk) {
        const diskPoint = new Point('disk')
          .tag('host', hostname)
          .tag('filesystem', disk.fs)
          .floatField('used_gb', disk.used)
          .floatField('total_gb', disk.size)
          .floatField('percentage', disk.percentage)
          .timestamp(timestamp);
        
        this.writeApi.writePoint(diskPoint);
      }

      // Network metrics
      for (const net of data.system.network) {
        const netPoint = new Point('network')
          .tag('host', hostname)
          .tag('interface', net.iface)
          .floatField('rx_mb', net.rx)
          .floatField('tx_mb', net.tx)
          .floatField('rx_sec_kb', net.rx_sec)
          .floatField('tx_sec_kb', net.tx_sec)
          .timestamp(timestamp);
        
        this.writeApi.writePoint(netPoint);
      }

      // Docker metrics
      for (const container of data.docker) {
        const dockerPoint = new Point('docker')
          .tag('host', hostname)
          .tag('container', container.name)
          .tag('image', container.image)
          .tag('status', container.status)
          .floatField('cpu_percent', container.cpu || 0)
          .floatField('mem_percent', container.mem || 0)
          .timestamp(timestamp);
        
        this.writeApi.writePoint(dockerPoint);
      }

      // Flush writes
      await this.writeApi.flush();
      
    } catch (error) {
      this.logger.error('Failed to write metrics:', error);
    }
  }

  /**
   * Query historical data
   */
  async queryHistory(metric, host, range = '1h') {
    if (!this.config.enabled || !this.queryApi) return [];

    const fluxQuery = `
      from(bucket: "${this.config.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "${metric}")
        |> filter(fn: (r) => r.host == "${host}")
        |> aggregateWindow(every: 1m, fn: mean)
        |> yield(name: "mean")
    `;

    try {
      const results = [];
      
      await this.queryApi.queryRows(fluxQuery, {
        next: (row, tableMeta) => {
          const data = tableMeta.toObject(row);
          results.push({
            time: data._time,
            value: data._value,
            field: data._field
          });
        },
        error: (error) => {
          this.logger.error('Query error:', error);
        },
        complete: () => {
          this.logger.info(`Query completed, ${results.length} results`);
        }
      });

      return results;
    } catch (error) {
      this.logger.error('Failed to query:', error);
      return [];
    }
  }

  /**
   * Get aggregated statistics
   */
  async getStats(metric, host, range = '24h') {
    if (!this.config.enabled || !this.queryApi) return null;

    const fluxQuery = `
      from(bucket: "${this.config.bucket}")
        |> range(start: -${range})
        |> filter(fn: (r) => r._measurement == "${metric}")
        |> filter(fn: (r) => r.host == "${host}")
        |> filter(fn: (r) => r._field == "usage" or r._field == "percentage")
        |> aggregateWindow(every: 1h, fn: mean)
        |> yield(name: "mean")
    `;

    try {
      const results = [];
      
      await this.queryApi.queryRows(fluxQuery, {
        next: (row, tableMeta) => {
          const data = tableMeta.toObject(row);
          results.push({
            time: data._time,
            value: data._value
          });
        },
        error: (error) => {
          this.logger.error('Stats query error:', error);
        },
        complete: () => {}
      });

      if (results.length === 0) return null;

      const values = results.map(r => r.value);
      return {
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
        data: results
      };
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Close connection
   */
  async close() {
    if (this.writeApi) {
      await this.writeApi.close();
      this.logger.info('InfluxDB connection closed');
    }
  }
}

module.exports = TimeSeriesDB;
