/**
 * Enterprise Dashboard - Authentication Module
 * JWT-based authentication with role-based access control
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '24h';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

// In-memory user store (replace with database in production)
const users = new Map();
const refreshTokens = new Set();

// Default admin user (change in production!)
const DEFAULT_ADMIN = {
  id: 'admin-001',
  username: 'admin',
  password: '$2a$10$YourHashedPasswordHere', // bcrypt hash of 'admin123'
  role: 'admin',
  createdAt: Date.now()
};

// Initialize with default admin
users.set(DEFAULT_ADMIN.username, DEFAULT_ADMIN);

class AuthManager {
  constructor() {
    this.roles = {
      admin: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
      operator: ['read', 'write', 'restart_services'],
      viewer: ['read']
    };
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(user) {
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRES }
    );
    refreshTokens.add(refreshToken);
    return refreshToken;
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Authentication middleware
   */
  middleware() {
    return (req, res, next) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const token = authHeader.substring(7);
      const decoded = this.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
      }

      req.user = decoded;
      next();
    };
  }

  /**
   * Role-based authorization middleware
   */
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions.' });
      }

      next();
    };
  }

  /**
   * Check permission
   */
  hasPermission(role, permission) {
    const rolePermissions = this.roles[role] || [];
    return rolePermissions.includes(permission);
  }

  /**
   * Create new user
   */
  async createUser(username, password, role = 'viewer') {
    if (users.has(username)) {
      throw new Error('Username already exists');
    }

    if (!this.roles[role]) {
      throw new Error('Invalid role');
    }

    const user = {
      id: `user-${Date.now()}`,
      username,
      password: await this.hashPassword(password),
      role,
      createdAt: Date.now()
    };

    users.set(username, user);
    return { id: user.id, username: user.username, role: user.role };
  }

  /**
   * Authenticate user
   */
  async authenticate(username, password) {
    const user = users.get(username);
    
    if (!user) {
      return null;
    }

    const isValid = await this.verifyPassword(password, user.password);
    
    if (!isValid) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role
    };
  }

  /**
   * Logout (invalidate refresh token)
   */
  logout(refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  /**
   * Get user by ID
   */
  getUserById(userId) {
    for (const user of users.values()) {
      if (user.id === userId) {
        return { id: user.id, username: user.username, role: user.role };
      }
    }
    return null;
  }

  /**
   * List all users (admin only)
   */
  listUsers() {
    return Array.from(users.values()).map(u => ({
      id: u.id,
      username: u.username,
      role: u.role,
      createdAt: u.createdAt
    }));
  }

  /**
   * Delete user
   */
  deleteUser(username) {
    return users.delete(username);
  }
}

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts. Please try again later.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many requests. Please slow down.' }
});

module.exports = {
  AuthManager,
  loginLimiter,
  apiLimiter
};
