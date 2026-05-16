<?php
/**
 * Token Validation Middleware
 * 
 * Penjelasan:
 * Middleware ini digunakan untuk validasi token sebelum mengizinkan akses
 * ke halaman tertentu. Middleware ini dapat digunakan untuk proteksi
 * halaman yang memerlukan autentikasi via token.
 * 
 * Cara penggunaan:
 * - Include file ini di awal halaman yang ingin diproteksi
 * - Panggil validateToken() dengan token yang diterima
 * - Jika valid, lanjutkan. Jika tidak, redirect ke error page
 */

require_once 'config.php';

/**
 * Validasi token tanpa login user (untuk API atau akses terbatas)
 * 
 * @param string $token Token yang akan divalidasi
 * @return array Hasil validasi dengan user data jika valid
 */
function validateToken($token) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Cari token di database
        $query = "SELECT t.*, u.username, u.email, u.full_name, u.role, u.is_active 
                  FROM auth_tokens t 
                  JOIN users u ON t.user_id = u.id 
                  WHERE t.token = :token 
                  AND t.is_used = 0 
                  AND t.expires_at > NOW()
                  LIMIT 1";
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        $token_data = $stmt->fetch();
        
        if (!$token_data) {
            return [
                'valid' => false,
                'status' => 'invalid',
                'message' => 'Token tidak valid atau sudah expired'
            ];
        }
        
        if (!$token_data['is_active']) {
            return [
                'valid' => false,
                'status' => 'inactive',
                'message' => 'User tidak aktif'
            ];
        }
        
        return [
            'valid' => true,
            'user' => [
                'id' => $token_data['user_id'],
                'username' => $token_data['username'],
                'email' => $token_data['email'],
                'full_name' => $token_data['full_name'],
                'role' => $token_data['role']
            ],
            'token' => [
                'id' => $token_data['id'],
                'expires_at' => $token_data['expires_at'],
                'ip_address' => $token_data['ip_address']
            ]
        ];
        
    } catch (PDOException $e) {
        error_log("Token validation error: " . $e->getMessage());
        
        return [
            'valid' => false,
            'status' => 'error',
            'message' => 'Terjadi kesalahan sistem'
        ];
    }
}

/**
 * Validasi dan consume token (untuk one-time use)
 * 
 * @param string $token Token yang akan divalidasi dan dikonsumsi
 * @return array Hasil validasi
 */
function validateAndConsumeToken($token) {
    $database = new Database();
    $conn = $database->getConnection();
    
    try {
        // Cari token di database
        $query = "SELECT t.*, u.username, u.email, u.full_name, u.role, u.is_active 
                  FROM auth_tokens t 
                  JOIN users u ON t.user_id = u.id 
                  WHERE t.token = :token 
                  AND t.is_used = 0 
                  AND t.expires_at > NOW()
                  AND u.is_active = 1
                  FOR UPDATE"; // Lock row untuk prevent race condition
        
        $stmt = $conn->prepare($query);
        $stmt->bindParam(':token', $token);
        $stmt->execute();
        
        $token_data = $stmt->fetch();
        
        if (!$token_data) {
            return [
                'valid' => false,
                'status' => 'invalid',
                'message' => 'Token tidak valid atau sudah expired'
            ];
        }
        
        // Mark token sebagai used
        $update_query = "UPDATE auth_tokens 
                         SET is_used = 1, used_at = NOW() 
                         WHERE id = :token_id";
        
        $update_stmt = $conn->prepare($update_query);
        $update_stmt->bindParam(':token_id', $token_data['id']);
        $update_stmt->execute();
        
        return [
            'valid' => true,
            'user' => [
                'id' => $token_data['user_id'],
                'username' => $token_data['username'],
                'email' => $token_data['email'],
                'full_name' => $token_data['full_name'],
                'role' => $token_data['role']
            ]
        ];
        
    } catch (PDOException $e) {
        error_log("Token validation and consume error: " . $e->getMessage());
        
        return [
            'valid' => false,
            'status' => 'error',
            'message' => 'Terjadi kesalahan sistem'
        ];
    }
}

/**
 * Middleware untuk proteksi halaman dengan token
 * 
 * @param string $token Token dari URL parameter atau header
 * @param bool $consume Apakah token akan dikonsumsi (one-time use)
 * @return array|exit Mengembalikan user data jika valid, exit jika tidak
 */
function requireTokenAuth($token = null, $consume = false) {
    // Ambil token dari parameter, header, atau session
    if (!$token) {
        $token = $_GET['token'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? $_SESSION['auth_token'] ?? null;
    }
    
    if (!$token) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Token diperlukan'
        ]);
        exit;
    }
    
    // Validasi token
    if ($consume) {
        $result = validateAndConsumeToken($token);
    } else {
        $result = validateToken($token);
    }
    
    if (!$result['valid']) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => $result['message'],
            'status' => $result['status']
        ]);
        exit;
    }
    
    return $result['user'];
}

/**
 * Middleware untuk API endpoint
 * 
 * @return array User data jika valid
 */
function apiTokenAuth() {
    $token = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_AUTH_TOKEN'] ?? null;
    
    if (!$token) {
        // Coba dari Bearer header
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
            $token = $matches[1];
        }
    }
    
    return requireTokenAuth($token, false);
}

// Contoh penggunaan sebagai middleware halaman
/*
// Di awal halaman yang ingin diproteksi:
require_once 'validate_token.php';

$user = requireTokenAuth();
echo "Selamat datang, " . $user['full_name'];
*/

// Contoh penggunaan untuk API
/*
// Di awal API endpoint:
require_once 'validate_token.php';

header('Content-Type: application/json');
$user = apiTokenAuth();
echo json_encode(['user' => $user]);
*/
?>
