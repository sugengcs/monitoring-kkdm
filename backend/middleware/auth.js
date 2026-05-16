const jwt = require('jsonwebtoken');
const db = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token, access denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'becakayu_webgis_secret_key_change_in_production_2024');
    
    const user = db.prepare('SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}, your role: ${req.user.role}`
      });
    }
    next();
  };
};

// Helper function to check if user has specific role
const hasRole = (user, role) => {
  if (!user || !user.role) return false;
  
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  // Teknisi has most permissions except user management
  if (user.role === 'teknisi' && role !== 'admin') return true;
  
  return user.role === role;
};

module.exports = { auth, authorize, hasRole };
