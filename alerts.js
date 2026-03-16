/**
 * Enterprise Dashboard - Alert Manager
 * Handles notifications via Email, Slack, Discord, Webhooks
 */

const nodemailer = require('nodemailer');
const winston = require('winston');

class AlertManager {
  constructor(config = {}) {
    this.config = {
      email: {
        enabled: config.email?.enabled || false,
        smtp: config.email?.smtp || {},
        from: config.email?.from || 'dashboard@enterprise.local',
        to: config.email?.to || []
      },
      slack: {
        enabled: config.slack?.enabled || false,
        webhookUrl: config.slack?.webhookUrl || ''
      },
      discord: {
        enabled: config.discord?.enabled || false,
        webhookUrl: config.discord?.webhookUrl || ''
      },
      webhook: {
        enabled: config.webhook?.enabled || false,
        url: config.webhook?.url || ''
      },
      cooldown: config.cooldown || 300000, // 5 minutes between same alerts
      ...config
    };

    this.recentAlerts = new Map();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'logs/alerts.log' })
      ]
    });

    this.initEmail();
  }

  /**
   * Initialize email transport
   */
  initEmail() {
    if (this.config.email.enabled) {
      this.emailTransporter = nodemailer.createTransporter({
        host: this.config.email.smtp.host,
        port: this.config.email.smtp.port || 587,
        secure: this.config.email.smtp.secure || false,
        auth: {
          user: this.config.email.smtp.user,
          pass: this.config.email.smtp.pass
        }
      });
    }
  }

  /**
   * Check if alert should be sent (cooldown)
   */
  shouldSendAlert(alertKey) {
    const lastSent = this.recentAlerts.get(alertKey);
    if (!lastSent) return true;
    
    return Date.now() - lastSent > this.config.cooldown;
  }

  /**
   * Mark alert as sent
   */
  markAlertSent(alertKey) {
    this.recentAlerts.set(alertKey, Date.now());
    
    // Cleanup old entries
    const cutoff = Date.now() - (this.config.cooldown * 2);
    for (const [key, time] of this.recentAlerts) {
      if (time < cutoff) {
        this.recentAlerts.delete(key);
      }
    }
  }

  /**
   * Send alert to all configured channels
   */
  async sendAlert(alert) {
    const alertKey = `${alert.type}-${alert.metric}`;
    
    if (!this.shouldSendAlert(alertKey)) {
      this.logger.info(`Alert suppressed (cooldown): ${alertKey}`);
      return;
    }

    const promises = [];

    if (this.config.email.enabled) {
      promises.push(this.sendEmail(alert));
    }

    if (this.config.slack.enabled) {
      promises.push(this.sendSlack(alert));
    }

    if (this.config.discord.enabled) {
      promises.push(this.sendDiscord(alert));
    }

    if (this.config.webhook.enabled) {
      promises.push(this.sendWebhook(alert));
    }

    try {
      await Promise.all(promises);
      this.markAlertSent(alertKey);
      this.logger.info(`Alert sent: ${alertKey}`, alert);
    } catch (error) {
      this.logger.error('Failed to send alert:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(alert) {
    if (!this.emailTransporter) return;

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const html = this.generateEmailTemplate(alert);

    await this.emailTransporter.sendMail({
      from: this.config.email.from,
      to: this.config.email.to.join(', '),
      subject,
      html
    });
  }

  /**
   * Send Slack notification
   */
  async sendSlack(alert) {
    const payload = {
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: alert.title,
        text: alert.message,
        fields: [
          {
            title: 'Server',
            value: alert.server || 'Unknown',
            short: true
          },
          {
            title: 'Metric',
            value: alert.metric,
            short: true
          },
          {
            title: 'Current Value',
            value: alert.value,
            short: true
          },
          {
            title: 'Threshold',
            value: alert.threshold,
            short: true
          }
        ],
        footer: 'Enterprise Dashboard',
        ts: Math.floor(Date.now() / 1000)
      }]
    };

    await fetch(this.config.slack.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send Discord notification
   */
  async sendDiscord(alert) {
    const payload = {
      embeds: [{
        title: alert.title,
        description: alert.message,
        color: this.getDiscordColor(alert.severity),
        fields: [
          {
            name: 'Server',
            value: alert.server || 'Unknown',
            inline: true
          },
          {
            name: 'Metric',
            value: alert.metric,
            inline: true
          },
          {
            name: 'Value',
            value: String(alert.value),
            inline: true
          },
          {
            name: 'Threshold',
            value: String(alert.threshold),
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'Enterprise Dashboard'
        }
      }]
    };

    await fetch(this.config.discord.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  /**
   * Send generic webhook
   */
  async sendWebhook(alert) {
    await fetch(this.config.webhook.url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Alert-Source': 'enterprise-dashboard'
      },
      body: JSON.stringify({
        ...alert,
        timestamp: Date.now(),
        source: 'enterprise-dashboard'
      })
    });
  }

  /**
   * Generate email HTML template
   */
  generateEmailTemplate(alert) {
    const severityColors = {
      critical: '#ef4444',
      warning: '#f59e0b',
      info: '#3b82f6'
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f3f4f6; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; }
          .header { background: ${severityColors[alert.severity]}; color: white; padding: 20px; }
          .content { padding: 20px; }
          .metric { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${alert.title}</h1>
            <p>${alert.message}</p>
          </div>
          <div class="content">
            <div class="metric">
              <span>Server:</span>
              <strong>${alert.server || 'Unknown'}</strong>
            </div>
            <div class="metric">
              <span>Metric:</span>
              <strong>${alert.metric}</strong>
            </div>
            <div class="metric">
              <span>Current Value:</span>
              <strong>${alert.value}</strong>
            </div>
            <div class="metric">
              <span>Threshold:</span>
              <strong>${alert.threshold}</strong>
            </div>
          </div>
          <div class="footer">
            <p>Enterprise Dashboard Alert</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get color for severity
   */
  getSeverityColor(severity) {
    const colors = {
      critical: 'danger',
      warning: 'warning',
      info: 'good'
    };
    return colors[severity] || 'good';
  }

  /**
   * Get Discord color code
   */
  getDiscordColor(severity) {
    const colors = {
      critical: 0xef4444,
      warning: 0xf59e0b,
      info: 0x3b82f6
    };
    return colors[severity] || 0x3b82f6;
  }

  /**
   * Create alert from metric data
   */
  createAlert(type, metric, value, threshold, server = null) {
    const severities = {
      cpu: value > 90 ? 'critical' : 'warning',
      memory: value > 90 ? 'critical' : 'warning',
      disk: value > 95 ? 'critical' : 'warning'
    };

    const titles = {
      cpu: 'High CPU Usage',
      memory: 'High Memory Usage',
      disk: 'Low Disk Space'
    };

    const messages = {
      cpu: `CPU usage is at ${value}%, exceeding threshold of ${threshold}%`,
      memory: `Memory usage is at ${value}%, exceeding threshold of ${threshold}%`,
      disk: `Disk usage is at ${value}%, exceeding threshold of ${threshold}%`
    };

    return {
      type,
      severity: severities[metric] || 'warning',
      title: titles[metric] || 'System Alert',
      message: messages[metric] || `${metric} is at ${value}%`,
      metric,
      value,
      threshold,
      server,
      timestamp: Date.now()
    };
  }
}

module.exports = AlertManager;
