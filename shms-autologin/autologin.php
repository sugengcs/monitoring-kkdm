<?php
/**
 * Auto Login Endpoint
 * 
 * Penjelasan:
 * Endpoint ini menerima token dari URL parameter dan melakukan validasi.
 * Jika token valid, user akan di-login otomatis dan redirect ke dashboard.
 * Jika token invalid/expired, user akan diarahkan ke halaman error.
 * 
 * Cara penggunaan:
 * - URL: https://shms.risen.id/autologin.php?token=YOUR_TOKEN
 * - Script akan validasi token dan login user otomatis
 * - Setelah login sukses, redirect ke dashboard
 */

require_once 'config.php';

session_start();

/**
 * Validasi token dan login user
 * 
 * @param string $token Token yang akan divalidasi
 * @return array Hasil validasi
 */
function validateAndLogin($token) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Cari token di database
        $query = "SELECT t.*, u.username, u.email, u.full_name, u.role 
                  FROM auth_tokens t 
                  JOIN users u ON t.user_id = u.id 
                  WHERE t.token = :token 
                  AND t.is_used = 0 
                  AND t.expires_at > NOW()
                  AND u.is_active = 1
                  LIMIT 1";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        $token_data = $stmt->fetch();
        
        if (!$token_data) {
            // Token tidak ditemukan, sudah dipakai, atau expired
            return [
                'success' => false,
                'status' => 'invalid',
                'message' => 'Token tidak valid atau sudah expired'
            ];
        }
        
        // Validasi IP address (opsional - uncomment jika ingin strict IP check)
        /*
        if ($token_data['ip_address'] !== getClientIP()) {
            return [
                'success' => false,
                'status' => 'invalid',
                'message' => 'IP address tidak sesuai'
            ];
        }
        */
        
        // Mark token sebagai used (one-time use)
        $update_query = "UPDATE auth_tokens 
                         SET is_used = 1, used_at = NOW() 
                         WHERE id = :token_id";
        
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bindParam(':token_id', $token_data['id']);
        $update_stmt->execute();
        
        // Set session user
        $_SESSION['user_id'] = $token_data['user_id'];
        $_SESSION['username'] = $token_data['username'];
        $_SESSION['email'] = $token_data['email'];
        $_SESSION['full_name'] = $token_data['full_name'];
        $_SESSION['role'] = $token_data['role'];
        $_SESSION['logged_in'] = true;
        $_SESSION['login_time'] = time();
        
        // Log login activity
        $log_query = "INSERT INTO login_logs (user_id, token_id, login_type, ip_address, user_agent, status) 
                      VALUES (:user_id, :token_id, 'auto', :ip_address, :user_agent, 'success')";
        
        $log_stmt = $conn->prepare($log_query);
        $log_stmt->bindParam(':user_id', $token_data['user_id']);
        $log_stmt->bindParam(':token_id', $token_data['id']);
        $log_stmt->bindParam(':ip_address', getClientIP());
        $log_stmt->bindParam(':user_agent', getUserAgent());
        $log_stmt->execute();
        
        return [
            'success' => true,
            'user' => [
                'id' => $token_data['user_id'],
                'username' => $token_data['username'],
                'email' => $token_data['email'],
                'full_name' => $token_data['full_name'],
                'role' => $token_data['role']
            ]
        ];
        
    } catch (PDOException $e) {
        // Log error
        error_log("Auto login error: " . $e->getMessage());
        
        return [
            'success' => false,
            'status' => 'error',
            'message' => 'Terjadi kesalahan sistem'
        ];
    }
}

/**
 * Log failed login attempt
 * 
 * @param string $token Token yang gagal
 * @param string $status Status kegagalan
 * @param string $message Pesan error
 */
function logFailedLogin($token, $status, $message) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Cari user_id dari token jika ada
        $query = "SELECT user_id FROM auth_tokens WHERE token = :token LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        $token_data = $stmt->fetch();
        
        $user_id = $token_data ? $token_data['user_id'] : 0;
        $token_id = $token_data ? $token_data['id'] : null;
        
        $log_query = "INSERT INTO login_logs (user_id, token_id, login_type, ip_address, user_agent, status, error_message) 
                      VALUES (:user_id, :token_id, 'auto', :ip_address, :user_agent, :status, :message)";
        
        $log_stmt = $conn->prepare($log_query);
        $log_stmt->bindParam(':user_id', $user_id);
        $log_stmt->bindParam(':token_id', $token_id);
        $log_stmt->bindParam(':ip_address', getClientIP());
        $log_stmt->bindParam(':user_agent', getUserAgent());
        $log_stmt->bindParam(':status', $status);
        $log_stmt->bindParam(':message', $message);
        $log_stmt->execute();
        
    } catch (PDOException $e) {
        error_log("Failed to log login attempt: " . $e->getMessage());
    }
}

// Main execution
$token = $_GET['token'] ?? '';

if (empty($token)) {
    // Tampilkan error jika tidak ada token
    logFailedLogin('', 'invalid', 'No token provided');
    header('Location: error.php?code=no_token');
    exit;
}

// Validasi dan login
$result = validateAndLogin($token);

if ($result['success']) {
    // Login sukses, redirect ke dashboard
    header('Location: ' . SHMS_REDIRECT_URL);
    exit;
} else {
    // Login gagal, log dan redirect ke error page
    logFailedLogin($token, $result['status'], $result['message']);
    header('Location: error.php?code=' . $result['status'] . '&message=' . urlencode($result['message']));
    exit;
}
?>
