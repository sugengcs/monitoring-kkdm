<?php
/**
 * Generate Token Script
 * 
 * Penjelasan:
 * Script ini digunakan untuk generate token auto-login untuk user tertentu.
 * Token akan disimpan di database dengan expired time 5 menit.
 * Script ini dipanggil dari website utama ketika user ingin login ke SHMS.
 * 
 * Cara penggunaan:
 * - Panggil script ini dengan parameter user_id atau username
 * - Script akan mengembalikan token yang valid
 * - Token digunakan untuk membuat link autologin
 */

require_once 'config.php';

// Set headers untuk JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Enable error reporting untuk development
error_reporting(E_ALL);
ini_set('display_errors', 1);

/**
 * Generate dan simpan token ke database
 * 
 * @param int $user_id ID user yang akan login
 * @return array Response dengan token dan autologin URL
 */
function generateToken($user_id) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Generate token acak yang aman
        $token = generateSecureToken();
        
        // Set expired time (5 menit dari sekarang)
        $expires_at = date('Y-m-d H:i:s', strtotime('+' . TOKEN_EXPIRY_MINUTES . ' minutes'));
        
        // Get IP dan user agent
        $ip_address = getClientIP();
        $user_agent = getUserAgent();
        
        // Simpan token ke database
        $query = "INSERT INTO auth_tokens (user_id, token, expires_at, ip_address, user_agent) 
                  VALUES (:user_id, :token, :expires_at, :ip_address, :user_agent)";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':user_id', $user_id);
        $stmt->bindParam(':token', $token);
        $stmt->bindParam(':expires_at', $expires_at);
        $stmt->bindParam(':ip_address', $ip_address);
        $stmt->bindParam(':user_agent', $user_agent);
        
        if ($stmt->execute()) {
            // Buat autologin URL
            $autologin_url = SHMS_AUTOLOGIN_URL . '?token=' . urlencode($token);
            
            return [
                'success' => true,
                'token' => $token,
                'autologin_url' => $autologin_url,
                'expires_at' => $expires_at,
                'expires_in_minutes' => TOKEN_EXPIRY_MINUTES
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Gagal menyimpan token ke database'
            ];
        }
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ];
    }
}

/**
 * Generate token berdasarkan username
 * 
 * @param string $username Username user
 * @return array Response dengan token dan autologin URL
 */
function generateTokenByUsername($username) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Cari user_id berdasarkan username
        $query = "SELECT id FROM users WHERE username = :username AND is_active = 1 LIMIT 1";
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':username', $username);
        $stmt->execute();
        
        $user = $stmt->fetch();
        
        if ($user) {
            return generateToken($user['id']);
        } else {
            return [
                'success' => false,
                'message' => 'User tidak ditemukan atau tidak aktif'
            ];
        }
        
    } catch (PDOException $e) {
        return [
            'success' => false,
            'message' => 'Database error: ' . $e->getMessage()
        ];
    }
}

// Main execution
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Ambil input JSON atau form data
    $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;
    
    $user_id = $input['user_id'] ?? null;
    $username = $input['username'] ?? null;
    
    if ($user_id) {
        // Generate token berdasarkan user_id
        $response = generateToken($user_id);
    } elseif ($username) {
        // Generate token berdasarkan username
        $response = generateTokenByUsername($username);
    } else {
        $response = [
            'success' => false,
            'message' => 'Parameter user_id atau username diperlukan'
        ];
    }
    
    echo json_encode($response);
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Untuk testing via browser
    $user_id = $_GET['user_id'] ?? null;
    $username = $_GET['username'] ?? null;
    
    if ($user_id) {
        $response = generateToken($user_id);
    } elseif ($username) {
        $response = generateTokenByUsername($username);
    } else {
        $response = [
            'success' => false,
            'message' => 'Parameter user_id atau username diperlukan'
        ];
    }
    
    echo json_encode($response);
    
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Method tidak diizinkan. Gunakan GET atau POST.'
    ]);
}
?>
