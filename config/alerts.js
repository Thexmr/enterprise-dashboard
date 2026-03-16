/**
 * Alert Configuration
 * Configure notification channels
 */

module.exports = {
  // Alert thresholds
  thresholds: {
    cpu: parseInt(process.env.ALERT_CPU_THRESHOLD) || 80,
    memory: parseInt(process.env.ALERT_MEMORY_THRESHOLD) || 85,
    disk: parseInt(process.env.ALERT_DISK_THRESHOLD) || 90,
    temperature: parseInt(process.env.ALERT_TEMP_THRESHOLD) || 75
  },

  // Cooldown between same alerts (milliseconds)
  cooldown: parseInt(process.env.ALERT_COOLDOWN) || 300000, // 5 minutes

  // Email configuration
  email: {
    enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.ALERT_FROM_EMAIL || 'dashboard@enterprise.local',
    to: (process.env.ALERT_EMAIL_TO || '').split(',').filter(Boolean)
  },

  // Slack configuration
  slack: {
    enabled: process.env.ALERT_SLACK_ENABLED === 'true',
    webhookUrl: process.env.SLACK_WEBHOOK_URL
  },

  // Discord configuration
  discord: {
    enabled: process.env.ALERT_DISCORD_ENABLED === 'true',
    webhookUrl: process.env.DISCORD_WEBHOOK_URL
  },

  // Generic webhook
  webhook: {
    enabled: process.env.ALERT_WEBHOOK_ENABLED === 'true',
    url: process.env.WEBHOOK_URL
  }
};
