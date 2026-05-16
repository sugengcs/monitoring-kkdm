-- ============================================
-- Database Structure for Auto Login System
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS shms_autologin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE shms_autologin;

-- Table: users (User data for SHMS)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role ENUM('admin', 'user', 'manager') DEFAULT 'user',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: auth_tokens (Token storage for auto-login)
CREATE TABLE IF NOT EXISTS auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    is_used TINYINT(1) DEFAULT 0,
    expires_at DATETIME NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_used (is_used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: login_logs (Login activity logging)
CREATE TABLE IF NOT EXISTS login_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_id INT,
    login_type ENUM('manual', 'auto') DEFAULT 'manual',
    ip_address VARCHAR(45),
    user_agent TEXT,
    status ENUM('success', 'failed', 'expired', 'invalid') DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (token_id) REFERENCES auth_tokens(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample user (password: admin123)
-- Hash generated with password_hash('admin123', PASSWORD_BCRYPT)
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin', 'admin@shms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin'),
('user1', 'user1@shms.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'User Demo', 'user');

-- ============================================
-- Explanation:
-- ============================================
-- 
-- 1. users table: Stores user information
--    - id: Primary key
--    - username: Unique username
--    - email: Unique email
--    - password_hash: BCRYPT hashed password
--    - full_name: User's full name
--    - role: User role (admin, user, manager)
--    - is_active: Active/inactive status
--    - created_at, updated_at: Timestamps
--
-- 2. auth_tokens table: Stores auto-login tokens
--    - id: Primary key
--    - user_id: Foreign key to users table
--    - token: Unique token string
--    - is_used: Flag if token has been used (one-time use)
--    - expires_at: Token expiration datetime
--    - ip_address: IP address that generated the token
--    - user_agent: Browser user agent
--    - created_at: Token creation time
--    - used_at: Time when token was used
--
-- 3. login_logs table: Logs all login attempts
--    - id: Primary key
--    - user_id: Foreign key to users table
--    - token_id: Foreign key to auth_tokens (optional)
--    - login_type: Type of login (manual/auto)
--    - ip_address: IP address of login attempt
--    - user_agent: Browser user agent
--    - status: Login status (success/failed/expired/invalid)
--    - error_message: Error message if login failed
--    - created_at: Log creation time
--
-- Security Features:
-- - Foreign keys with CASCADE for data integrity
-- - Indexes for fast queries
-- - One-time use token (is_used flag)
-- - Token expiration (expires_at)
-- - IP and user agent tracking
-- - Login activity logging
-- - BCRYPT password hashing
