<?php
/**
 * Database Configuration
 * 
 * Penjelasan:
 * File ini berisi konfigurasi koneksi database untuk sistem auto-login.
 * Sesuaikan dengan kredensial database Anda.
 */

class Database {
    private $host = 'localhost';
    private $db_name = 'shms_autologin';
    private $username = 'root';
    private $password = '';
    private $conn;

    /**
     * Membuat koneksi ke database
     * 
     * @return PDO PDO connection object
     */
    public function getConnection() {
        $this->conn = null;
        
        try {
            $dsn = "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            
            $this->conn = new PDO($dsn, $this->username, $this->password, $options);
        } catch(PDOException $e) {
            echo "Connection error: " . $e->getMessage();
        }
        
        return $this->conn;
    }
}

/**
 * Konfigurasi Token
 */
define('TOKEN_LENGTH', 64);           // Panjang token
define('TOKEN_EXPIRY_MINUTES', 5);    // Token expired dalam 5 menit
define('SHMS_REDIRECT_URL', 'https://shms.risen.id/dashboard'); // URL redirect setelah login sukses
define('SHMS_AUTOLOGIN_URL', 'https://shms.risen.id/autologin.php'); // URL endpoint autologin

/**
 * Fungsi helper untuk generate token acak
 * 
 * @return string Token acak yang aman
 */
function generateSecureToken() {
    return bin2hex(random_bytes(TOKEN_LENGTH / 2));
}

/**
 * Fungsi helper untuk mendapatkan IP address client
 * 
 * @return string IP address
 */
function getClientIP() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        return $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        return $_SERVER['HTTP_X_FORWARDED_FOR'];
    } else {
        return $_SERVER['REMOTE_ADDR'];
    }
}

/**
 * Fungsi helper untuk mendapatkan user agent
 * 
 * @return string User agent
 */
function getUserAgent() {
    return $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
}
