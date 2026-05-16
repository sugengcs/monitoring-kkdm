<?php
/**
 * Error Page for Auto Login
 * 
 * Penjelasan:
 * Halaman ini menampilkan pesan error ketika autologin gagal.
 * Error dapat berupa: token invalid, token expired, atau error sistem.
 */

$error_code = $_GET['code'] ?? 'unknown';
$error_message = $_GET['message'] ?? 'Terjadi kesalahan yang tidak diketahui';

// Mapping error code ke pesan yang lebih friendly
$error_messages = [
    'no_token' => 'Token tidak ditemukan',
    'invalid' => 'Token tidak valid atau sudah digunakan',
    'expired' => 'Token sudah kadaluarsa',
    'inactive' => 'User tidak aktif',
    'error' => 'Terjadi kesalahan sistem',
    'unknown' => 'Terjadi kesalahan yang tidak diketahui'
];

$display_message = $error_messages[$error_code] ?? $error_message;
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login Gagal - SHMS</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .error-container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            max-width: 500px;
            width: 100%;
            text-align: center;
        }
        .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        .error-message {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .btn {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            transition: background 0.3s;
            margin: 5px;
        }
        .btn:hover {
            background: #5568d3;
        }
        .btn-secondary {
            background: #6c757d;
        }
        .btn-secondary:hover {
            background: #5a6268;
        }
        .error-details {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            text-align: left;
            font-size: 14px;
            color: #666;
        }
        .error-details code {
            background: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <h1>Login Gagal</h1>
        <p class="error-message"><?php echo htmlspecialchars($display_message); ?></p>
        
        <a href="https://shms.risen.id/login" class="btn">Login Manual</a>
        <a href="javascript:history.back()" class="btn btn-secondary">Kembali</a>
        
        <?php if ($error_code !== 'no_token'): ?>
        <div class="error-details">
            <strong>Detail Error:</strong><br>
            Code: <code><?php echo htmlspecialchars($error_code); ?></code><br>
            <?php if ($error_message !== $display_message): ?>
            Message: <code><?php echo htmlspecialchars($error_message); ?></code><br>
            <?php endif; ?>
            <br>
            <em>Silakan hubungi administrator jika masalah berlanjut.</em>
        </div>
        <?php endif; ?>
    </div>
</body>
</html>
