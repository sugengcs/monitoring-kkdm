const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const { userManagement } = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
    }
  }
});

// Upload profile photo
router.post('/upload-photo', auth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const photoUrl = `/uploads/profiles/${req.file.filename}`;
    
    // Update user profile photo in database
    const result = db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?')
      .run(photoUrl, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ 
      success: true, 
      message: 'Profile photo uploaded successfully',
      data: { photoUrl }
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/', auth, userManagement, async (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all teknisi (accessible by admin and teknisi for assign dropdown)
router.get('/list/teknisi', auth, async (req, res) => {
  try {
    const teknisi = db.prepare(
      "SELECT id, full_name, username, phone FROM users WHERE role = 'teknisi' AND is_active = 1 ORDER BY full_name"
    ).all();
    res.json({ success: true, data: teknisi });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = db.prepare('SELECT id, username, email, full_name, role, phone, is_active, created_at FROM users WHERE id = ?').get(id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create user (admin only)
router.post('/', auth, userManagement, async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'karyawan', phone } = req.body;

    // Validate role
    const validRoles = ['admin', 'teknisi', 'karyawan', 'manager'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, teknisi, karyawan, or manager' });
    }

    // Check if username exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    // Check if email exists (only if email is provided)
    if (email) {
      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existingEmail) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
    }

    const bcrypt = require('bcryptjs');
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);

    const result = db.prepare(
      'INSERT INTO users (username, email, password, password_plain, full_name, role, phone) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(username, email || null, hashedPassword, password, full_name, role, phone);

    res.json({ success: true, message: 'User created successfully', data: { id: result.lastInsertRowid } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/:id', auth, userManagement, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, role, phone, is_active, password } = req.body;

    // Validate role
    if (role) {
      const validRoles = ['admin', 'teknisi', 'karyawan', 'manager'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, teknisi, karyawan, or manager' });
      }
    }

    // Build update query dynamically
    let updates = [];
    let params = [];

    if (full_name !== undefined && full_name !== null && full_name !== '') {
      updates.push('full_name = ?');
      params.push(full_name);
    }
    if (role !== undefined && role !== null && role !== '') {
      updates.push('role = ?');
      params.push(role);
    }
    if (phone !== undefined && phone !== null && phone !== '') {
      updates.push('phone = ?');
      params.push(phone);
    }
    // Only update is_active if explicitly provided and not null
    if (is_active !== undefined && is_active !== null) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    // Update password if provided
    if (password && password.trim()) {
      const bcrypt = require('bcryptjs');
      const salt = bcrypt.genSaltSync(10);
      const hashedPassword = bcrypt.hashSync(password, salt);
      updates.push('password = ?');
      params.push(hashedPassword);
      updates.push('password_plain = ?');
      params.push(password);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete user (admin only)
router.delete('/:id', auth, userManagement, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    // Check if user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete related records first (to avoid foreign key constraint errors)
    // Delete notifications
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
    
    // Delete activity logs
    db.prepare('DELETE FROM activity_logs WHERE user_id = ?').run(id);
    
    // Delete maintenance history
    db.prepare('DELETE FROM maintenance_history WHERE performed_by = ?').run(id);
    
    // Delete maintenance progress where user is repair team
    db.prepare('DELETE FROM maintenance_progress WHERE repair_team_id = ?').run(id);
    
    // Delete damage reports where user is reporter
    db.prepare('DELETE FROM damage_reports WHERE reporter_id = ?').run(id);
    
    // Update assets to remove created_by reference
    db.prepare('UPDATE assets SET created_by = NULL WHERE created_by = ?').run(id);

    // Finally delete the user
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get user password (admin only) - Security warning: stores plain text password
router.get('/:id/password', auth, userManagement, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare('SELECT id, username, password_plain FROM users WHERE id = ?').get(id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      data: { 
        id: user.id,
        username: user.username,
        password: user.password_plain || 'Tidak tersedia'
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
