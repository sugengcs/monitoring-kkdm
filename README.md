# WebGIS Monitoring Aset Jalan Tol Becakayu

Sistem monitoring berbasis WebGIS untuk pemantauan aset jalan tol Becakayu (Bekasi – Cawang – Kampung Melayu).

## Fitur Utama

- **Dashboard Monitoring**: Statistik real-time kondisi aset, laporan kerusakan, dan progres perbaikan
- **Peta Interaktif**: Google Maps dengan marker aset berwarna berdasarkan kondisi
- **Manajemen Aset**: CRUD data aset dengan kategori (Perkerasan, PJU, Panel, KWH Meter, Rambu, CCTV)
- **Pelaporan Kerusakan**: Form laporan dengan upload foto dan lokasi GPS
- **Tracking Perbaikan**: Monitoring progres pekerjaan tim perbaikan
- **CCTV Monitoring**: Monitoring status kamera pengawas
- **Analytics Dashboard**: Grafik analisis data aset dan laporan
- **Multi-Role Authentication**: Admin, Pelapor, dan Tim Perbaikan
- **Dark Mode**: Tampilan modern dengan tema gelap/terang
- **Responsive Design**: Mendukung desktop dan mobile

## Teknologi

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router
- Recharts (Grafik)
- Google Maps JavaScript API
- Axios
- Lucide Icons

### Backend
- Node.js
- Express.js
- SQLite (better-sqlite3)
- JWT Authentication
- Multer (File Upload)
- Bcrypt (Password Hashing)

## Struktur Project

```
becakayu-webgis/
├── frontend/                 # React Frontend
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React contexts (Auth, Theme)
│   │   ├── pages/           # Page components
│   │   ├── utils/           # Utility functions
│   │   ├── App.jsx          # Main app component
│   │   └── main.jsx         # Entry point
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/                  # Node.js Backend
│   ├── config/              # Database config
│   ├── database/            # SQLite database file
│   ├── middleware/          # Auth, upload middleware
│   ├── routes/              # API routes
│   ├── uploads/             # Uploaded files
│   ├── server.js            # Entry point
│   └── package.json
├── package.json             # Root package.json
└── README.md
```

## Instalasi

### Prasyarat

- Node.js (v18 atau lebih tinggi)
- MySQL (v8 atau lebih tinggi)
- MySQL (v8 atau lebih tinggi)
- MySQL (v8 atau lebih tinggi)
- Google Maps API Key

### Langkah Instalasi

1. **Clone repository**
```bash
cd personal-website
```

2. **Install dependencies**

Install root dependencies:
```bash
npm install
```

Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

3. **Setup Database**

Initialize database SQLite:
```bash
cd backend
npm run init-db
cd ..
```

4. **Konfigurasi Environment**

Backend (`.env`):
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_payr_api_key
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
CORS_ORIGIN=http://localhost:5173
```

Frontend (`.env`):
```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key
```

5. **Jalankan Aplikasi**

Mode development (jalankan frontend dan backend bersamaan):
```bash
npm run dev
```

Atau jalankan terpisah:

Backend:
```bash
cd backend
npm run dev
```

Frontend (terminal baru):
```bash
cd frontend
npm run dev
```

6. **Akses Aplikasi**

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Akun Default

Setelah instalasi, gunakan akun default untuk login:

- **Username**: admin
- **Password**: admin123
- **Role**: Admin

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register user baru
- `GET /api/auth/me` - Get current user

### Assets
- `GET /api/assets` - Get all assets
- `GET /api/assets/:id` - Get asset by ID
- `POST /api/assets` - Create new asset (Admin only)
- `PUT /api/assets/:id` - Update asset (Admin only)
- `DELETE /api/assets/:id` - Delete asset (Admin only)
- `GET /api/assets/categories/list` - Get asset categories

### Reports
- `GET /api/reports` - Get all damage reports
- `POST /api/reports` - Create damage report
- `GET /api/reports/:id` - Get report by ID

### Maintenance
- `GET /api/maintenance` - Get maintenance progress
- `PUT /api/maintenance/:id` - Update maintenance progress
- `POST /api/maintenance/history` - Create maintenance history

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/analytics` - Get analytics data

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Database Schema

### Tabel Utama

- **users**: Data pengguna sistem
- **asset_categories**: Kategori aset
- **assets**: Data aset utama
- **perkerasan**: Detail aset perkerasan
- **pju**: Detail aset PJU
- **panel_utama**: Detail panel utama
- **kwh_meter**: Detail KWH meter
- **rambu**: Detail rambu lalu lintas
- **cctv**: Detail CCTV
- **damage_reports**: Laporan kerusakan
- **maintenance_progress**: Progres perbaikan
- **maintenance_history**: Riwayat maintenance
- **activity_logs**: Log aktivitas user
- **notifications**: Notifikasi sistem

## Fitur per Role

### Admin
- Akses penuh ke semua fitur
- Manajemen user
- CRUD aset
- View semua laporan dan progres

### Pelapor Kerusakan
- Buat laporan kerusakan
- Upload foto kerusakan
- View laporan sendiri
- Gunakan lokasi GPS otomatis

### Tim Perbaikan
- View laporan yang ditugaskan
- Update progres perbaikan
- Upload foto after repair
- Update status pekerjaan

## Deployment

### Frontend (Vercel/Netlify)

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Deploy folder `dist` ke Vercel/Netlify

3. Update environment variables di platform hosting

### Backend (Heroku/Railway/VPS)

1. Set environment variables di platform hosting

2. Deploy backend code

3. Setup database production

4. Update CORS_ORIGIN dengan domain production

## Google Maps API

Untuk menggunakan Google Maps:

1. Buat project di [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Buat API Key
4. Tambahkan API key ke file `.env`

## Troubleshooting

### Database Connection Error
- Jalankan `cd backend && npm run init-db` untuk inisialisasi database
- Pastikan folder `backend/database/` memiliki permission write

### Google Maps Not Loading
- Pastikan API key valid
- Cek billing di Google Cloud Console
- Verifikasi Maps JavaScript API di-enabled

### File Upload Error
- Pastikan folder `uploads` ada dan writable
- Cek MAX_FILE_SIZE di `.env`
- Pastikan file type sesuai (JPEG, PNG, PDF, KML, KMZ)

## Kontribusi

Project ini dikembangkan untuk monitoring aset jalan tol Becakayu.

## License

MIT

## Kontak

Untuk informasi lebih lanjut, hubungi tim IT Becakayu.
