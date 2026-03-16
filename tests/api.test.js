/**
 * Enterprise Dashboard Tests
 */

const request = require('supertest');
const { app } = require('../server');

describe('Enterprise Dashboard API', () => {
  
  describe('GET /api/health', () => {
    it('sollte den Health-Status zurückgeben', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/metrics', () => {
    it('sollte System-Metriken zurückgeben', async () => {
      const res = await request(app).get('/api/metrics');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('system');
      expect(res.body).toHaveProperty('processes');
      expect(res.body).toHaveProperty('docker');
    });
  });

  describe('GET /api/history', () => {
    it('sollte Historie zurückgeben', async () => {
      const res = await request(app).get('/api/history');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/alerts', () => {
    it('sollte Alerts zurückgeben', async () => {
      const res = await request(app).get('/api/alerts');
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Static Files', () => {
    it('sollte die index.html ausliefern', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain('Enterprise Dashboard');
    });
  });
});
