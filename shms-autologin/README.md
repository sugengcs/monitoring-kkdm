# Sistem Auto Login dengan Token untuk PHP

Sistem auto login yang aman menggunakan token-based authentication untuk mengizinkan user login otomatis dari website utama ke SHMS tanpa perlu input username/password.

## Fitur

- ✅ Token-based authentication yang aman
- ✅ Token one-time use (hanya bisa dipakai sekali)
- ✅ Token expired dalam 5 menit
- ✅ Penyimpanan IP address dan user agent
- ✅ Log aktivitas login
- ✅ Validasi token yang ketat
- ✅ Error handling yang baik
- ✅ Dapat diintegrasikan dengan berbagai framework (PHP native, React, Vue, dll)

## Struktur File

```
shms-autologin/
├── database.sql           # Struktur database MySQL
├── config.php             # Konfigurasi database dan helper functions
├── generate_token.php     # Script untuk generate token
├── autologin.php          # Endpoint untuk auto login
├── validate_token.php     # Middleware validasi token
├── error.php              # Halaman error
├── example_button.html    # Contoh implementasi di website utama
└── README.md              # Dokumentasi ini
```

## Instalasi

### 1. Setup Database

Import file `database.sql` ke database MySQL Anda:

```bash
mysql -u root -p < database.sql
```

Atau gunakan phpMyAdmin untuk import file SQL tersebut.

### 2. Konfigurasi Database

Edit file `config.php` dan sesuaikan kredensial database:

```php
private $host = 'localhost';
private $db_name = 'shms_autologin';
private $username = 'root';
private $password = '';
```

### 3. Konfigurasi URL

Edit file `config.php` untuk menyesuaikan URL:

```php
define('SHMS_REDIRECT_URL', 'https://shms.risen.id/dashboard');
define('SHMS_AUTOLOGIN_URL', 'https://shms.risen.id/autologin.php');
```

### 4. Upload File

Upload semua file ke server website utama Anda di folder yang sesuai.

## Cara Penggunaan

### Di Website Utama

#### Method 1: PHP Native

```php
<?php
require_once 'path/to/generate_token.php';

// Generate token untuk user tertentu
$username = 'admin';
$result = generateTokenByUsername($username);

if ($result['success']) {
    // Redirect ke SHMS dengan token
    header('Location: ' . $result['autologin_url']);
    exit;
} else {
    echo "Error: " . $result['message'];
}
?>
```

#### Method 2: JavaScript/AJAX

```javascript
function generateAndRedirect(username) {
    fetch('https://website-utama.com/generate_token.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.autologin_url;
        } else {
            alert('Error: ' + data.message);
        }
    })
    .catch(error => {
        alert('Error: ' + error.message);
    });
}

// Panggil fungsi ini ketika user klik tombol
generateAndRedirect('admin');
```

#### Method 3: React

```jsx
import { useState } from 'react';

function AutoLoginButton({ username }) {
    const [loading, setLoading] = useState(false);
    
    const handleAutoLogin = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://website-utama.com/generate_token.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const data = await response.json();
            
            if (data.success) {
                window.location.href = data.autologin_url;
            } else {
                alert('Error: ' + data.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <button onClick={handleAutoLogin} disabled={loading}>
            {loading ? 'Loading...' : 'Login ke SHMS'}
        </button>
    );
}
```

### Di Website SHMS (Target)

#### 1. Upload File ke SHMS

Upload file-file berikut ke server SHMS:
- `config.php`
- `autologin.php`
- `error.php`
- `validate_token.php` (opsional, jika perlu middleware)

#### 2. Sesuaikan Konfigurasi

Edit `config.php` di SHMS dengan kredensial database yang sama.

#### 3. Setup Session

Pastikan session sudah di-setup di SHMS. File `autologin.php` sudah menggunakan `session_start()`.

## API Reference

### generate_token.php

Generate token auto-login untuk user tertentu.

**Endpoint:** `POST /generate_token.php`

**Parameters:**
- `user_id` (optional): ID user
- `username` (optional): Username user

**Response (Success):**
```json
{
    "success": true,
    "token": "abc123...",
    "autologin_url": "https://shms.risen.id/autologin.php?token=abc123...",
    "expires_at": "2024-05-14 23:55:00",
    "expires_in_minutes": 5
}
```

**Response (Error):**
```json
{
    "success": false,
    "message": "User tidak ditemukan atau tidak aktif"
}
```

### autologin.php

Endpoint untuk auto login menggunakan token.

**Endpoint:** `GET /autologin.php?token=YOUR_TOKEN`

**Parameters:**
- `token` (required): Token auto-login

**Behavior:**
- Validasi token
- Jika valid: login user dan redirect ke dashboard
- Jika invalid: redirect ke error page

### validate_token.php

Middleware untuk validasi token.

**Fungsi:**
- `validateToken($token)`: Validasi token tanpa login
- `validateAndConsumeToken($token)`: Validasi dan consume token (one-time use)
- `requireTokenAuth($token, $consume)`: Middleware untuk proteksi halaman
- `apiTokenAuth()`: Middleware untuk API endpoint

## Penjelasan Setiap Bagian Kode

### database.sql

File ini berisi struktur database untuk sistem auto-login:

1. **users table**: Menyimpan data user
   - `id`: Primary key
   - `username`: Username unik
   - `email`: Email unik
   - `password_hash`: Password yang di-hash dengan BCRYPT
   - `role`: Role user (admin, user, manager)
   - `is_active`: Status aktif user

2. **auth_tokens table**: Menyimpan token auto-login
   - `id`: Primary key
   - `user_id`: Foreign key ke users
   - `token`: Token string (unik)
   - `is_used`: Flag jika token sudah dipakai
   - `expires_at`: Waktu expired token
   - `ip_address`: IP address yang generate token
   - `user_agent`: User agent browser
   - `created_at`: Waktu token dibuat
   - `used_at`: Waktu token dipakai

3. **login_logs table**: Log aktivitas login
   - `id`: Primary key
   - `user_id`: Foreign key ke users
   - `token_id`: Foreign key ke auth_tokens
   - `login_type`: Jenis login (manual/auto)
   - `ip_address`: IP address login
   - `user_agent`: User agent browser
   - `status`: Status login (success/failed/expired/invalid)
   - `error_message`: Pesan error jika gagal
   - `created_at`: Waktu log dibuat

### config.php

File ini berisi:
- Konfigurasi koneksi database
- Helper functions untuk generate token
- Helper functions untuk mendapatkan IP dan user agent
- Konstanta untuk konfigurasi token

**Fungsi-fungsi:**
- `generateSecureToken()`: Generate token acak yang aman menggunakan `random_bytes()`
- `getClientIP()`: Mendapatkan IP address client dengan support proxy
- `getUserAgent()`: Mendapatkan user agent browser

### generate_token.php

Script ini berfungsi untuk:
1. Menerima request dengan parameter `user_id` atau `username`
2. Generate token acak yang aman
3. Simpan token ke database dengan expired time 5 menit
4. Simpan IP address dan user agent
5. Return token dan autologin URL

**Keamanan:**
- Token di-generate menggunakan `random_bytes()` yang cryptographically secure
- Token memiliki expired time (5 menit)
- IP address dan user agent disimpan untuk audit
- Menggunakan prepared statement untuk mencegah SQL injection

### autologin.php

Endpoint ini berfungsi untuk:
1. Menerima token dari URL parameter
2. Validasi token di database
3. Cek apakah token sudah dipakai (one-time use)
4. Cek apakah token masih valid (tidak expired)
5. Cek apakah user aktif
6. Set session user jika valid
7. Log aktivitas login
8. Redirect ke dashboard jika sukses
9. Redirect ke error page jika gagal

**Keamanan:**
- Token hanya bisa dipakai sekali (one-time use)
- Token expired dalam 5 menit
- IP address validation (opsional, bisa di-enable)
- Log semua aktivitas login
- Menggunakan prepared statement

### validate_token.php

Middleware untuk validasi token yang berfungsi untuk:
1. Validasi token tanpa login user (untuk API)
2. Validasi dan consume token (one-time use)
3. Middleware untuk proteksi halaman
4. Middleware untuk API endpoint

**Fungsi-fungsi:**
- `validateToken($token)`: Validasi token, return user data jika valid
- `validateAndConsumeToken($token)`: Validasi dan consume token (one-time use)
- `requireTokenAuth($token, $consume)`: Middleware untuk proteksi halaman, exit jika invalid
- `apiTokenAuth()`: Middleware untuk API endpoint dengan Bearer token support

### error.php

Halaman error yang menampilkan:
- Pesan error yang friendly
- Tombol untuk kembali atau login manual
- Detail error untuk debugging
- Desain modern dan responsif

## Keamanan

### Fitur Keamanan yang Diterapkan:

1. **Token Cryptographically Secure**: Menggunakan `random_bytes()` untuk generate token
2. **One-time Use**: Token hanya bisa dipakai sekali, setelah itu otomatis invalid
3. **Expired Time**: Token expired dalam 5 menit untuk mencegah penggunaan jangka panjang
4. **IP Address Tracking**: IP address disimpan untuk audit dan validation
5. **User Agent Tracking**: User agent disimpan untuk audit
6. **SQL Injection Prevention**: Menggunakan prepared statement
7. **Session Management**: Session PHP yang aman
8. **Login Logging**: Semua aktivitas login di-log untuk audit
9. **BCRYPT Password Hash**: Password di-hash dengan BCRYPT
10. **Foreign Key Constraints**: Data integrity dengan CASCADE delete

### Best Practices:

1. Gunakan HTTPS untuk semua komunikasi
2. Sesuaikan `TOKEN_EXPIRY_MINUTES` sesuai kebutuhan
3. Enable IP address validation untuk security yang lebih ketat
4. Review dan hapus token yang sudah expired secara berkala
5. Monitor login_logs untuk aktivitas yang mencurigakan
6. Gunakan rate limiting untuk mencegah brute force
7. Validasi user session di setiap halaman yang diproteksi

## Troubleshooting

### Token tidak valid

**Masalah:** Token ditolak meskipun baru dibuat

**Solusi:**
- Cek apakah token sudah expired (5 menit)
- Cek apakah token sudah dipakai sebelumnya
- Cek apakah user masih aktif (`is_active = 1`)
- Cek koneksi database

### Redirect tidak bekerja

**Masalah:** User tidak di-redirect ke dashboard

**Solusi:**
- Cek konfigurasi `SHMS_REDIRECT_URL` di config.php
- Pastikan session sudah di-setup dengan benar
- Cek apakah user sudah login di SHMS
- Cek error_log PHP untuk error yang terjadi

### Database connection error

**Masalah:** Tidak bisa connect ke database

**Solusi:**
- Cek kredensial database di config.php
- Pastikan MySQL server berjalan
- Cek firewall dan permission database
- Pastikan database sudah dibuat

## Maintenance

### Cleanup Token Expired

Jalankan query ini secara berkala untuk cleanup token yang sudah expired:

```sql
DELETE FROM auth_tokens WHERE expires_at < NOW();
```

### Cleanup Token Used

Jalankan query ini untuk cleanup token yang sudah dipakai:

```sql
DELETE FROM auth_tokens WHERE is_used = 1;
```

### Backup Database

Backup database secara berkala:

```bash
mysqldump -u root -p shms_autologin > backup_shms_autologin.sql
```

## Support

Jika mengalami masalah atau memiliki pertanyaan:
1. Cek dokumentasi ini
2. Cek error_log PHP
3. Review login_logs untuk melihat aktivitas
4. Hubungi administrator sistem

## License

Sistem ini dibuat untuk keperluan internal. Silakan modifikasi sesuai kebutuhan.
