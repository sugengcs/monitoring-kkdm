const db = require('../config/database');

// Admin only - full access
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
  }
};

// Teknisi role - limited access
const teknisiOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teknisi')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Teknisi role required.' });
  }
};

// Karyawan role - reporter access
const karyawanOnly = (req, res, next) => {
  if (req.user) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Login required.' });
  }
};

// Admin or Teknisi only (for asset management)
const assetManagement = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teknisi')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Asset management requires Admin or Teknisi role.' });
  }
};

// Admin only (for user management)
const userManagement = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. User management requires Admin role.' });
  }
};

// Check if user can view their own reports (for karyawan)
const ownReportsOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next(); // Admin can view all
  } else if (req.user && req.user.role === 'teknisi') {
    next(); // Teknisi can view all
  } else if (req.user && req.user.role === 'karyawan') {
    // Karyawan can only view their own reports
    req.query.reporter_id = req.user.id;
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied.' });
  }
};

module.exports = {
  adminOnly,
  teknisiOnly,
  karyawanOnly,
  assetManagement,
  userManagement,
  ownReportsOnly
};
