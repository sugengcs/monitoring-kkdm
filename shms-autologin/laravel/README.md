# Laravel Auto Login System

Implementasi sistem auto login dengan token menggunakan Laravel Framework.

## Struktur File

```
laravel/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthTokenController.php
│   │   │   └── AutoLoginController.php
│   │   ├── Middleware/
│   │   │   ├── ValidateToken.php
│   │   │   └── TokenAuth.php
│   │   └── Requests/
│   │       └── GenerateTokenRequest.php
│   └── Models/
│       ├── User.php
│       ├── AuthToken.php
│       └── LoginLog.php
├── database/
│   ├── migrations/
│   │   ├── create_users_table.php
│   │   ├── create_auth_tokens_table.php
│   │   └── create_login_logs_table.php
│   └── seeders/
│       └── UserSeeder.php
├── routes/
│   └── api.php
└── config/
    └── autologin.php
```

## Installation

### 1. Install Dependencies

```bash
composer require illuminate/support
```

### 2. Publish Config

```bash
php artisan vendor:publish --tag=autologin-config
```

### 3. Run Migrations

```bash
php artisan migrate
```

### 4. Seed Database

```bash
php artisan db:seed --class=UserSeeder
```

## Usage

### Generate Token

```php
use App\Http\Controllers\AuthTokenController;

Route::post('/generate-token', [AuthTokenController::class, 'generate']);
```

Request:
```json
{
    "username": "admin"
}
```

Response:
```json
{
    "success": true,
    "token": "abc123...",
    "autologin_url": "https://shms.risen.id/autologin?token=abc123...",
    "expires_at": "2024-05-14 23:55:00"
}
```

### Auto Login Endpoint

```php
use App\Http\Controllers\AutoLoginController;

Route::get('/autologin', [AutoLoginController::class, 'login']);
```

URL: `https://shms.risen.id/autologin?token=YOUR_TOKEN`

### Middleware Validation

```php
use App\Http\Middleware\ValidateToken;

Route::middleware([ValidateToken::class])->group(function () {
    Route::get('/protected', function () {
        return response()->json(['message' => 'Protected route']);
    });
});
```

## Configuration

Edit `config/autologin.php`:

```php
return [
    'token_length' => 64,
    'expiry_minutes' => 5,
    'redirect_url' => env('SHMS_REDIRECT_URL', '/dashboard'),
    'autologin_url' => env('SHMS_AUTOLOGIN_URL', '/autologin'),
];
```

## Security Features

- One-time use token
- Token expiration (5 minutes)
- IP address validation
- User agent tracking
- Login activity logging
- CSRF protection
- Rate limiting
