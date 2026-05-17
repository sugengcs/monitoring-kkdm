# Setup Guide - Becakayu WebGIS

## Prerequisites

Sebelum menjalankan proyek ini, pastikan laptop Anda sudah terinstall:

1. **Node.js** (versi 18 atau lebih baru)
   - Download: https://nodejs.org/
   - Cek instalasi: `node --version`

2. **npm** (biasanya terinstall otomatis dengan Node.js)
   - Cek instalasi: `npm --version`

3. **Git** (opsional, jika ingin clone dari repository)
   - Download: https://git-scm.com/

## Cara Menjalankan Proyek

### Opsi 1: Menggunakan Batch File (Recommended)

1. Copy seluruh folder proyek ke laptop baru
2. Buka folder proyek di File Explorer
3. Double-click file `start.bat`
4. Tunggu proses instalasi dependencies (pertama kali akan memakan waktu)
5. Server akan otomatis berjalan:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:5000

### Opsi 2: Manual via Command Prompt

1. Buka Command Prompt atau PowerShell
2. Navigate ke folder proyek:
   ```cmd
   cd "path\to\personal-website"
   ```
3. Install dependencies (root):
   ```cmd
   npm install
   ```
4. Install dependencies frontend:
   ```cmd
   cd frontend
   npm install
   cd ..
   ```
5. Install dependencies backend:
   ```cmd
   cd backend
   npm install
   cd ..
   ```
6. Jalankan development server:
   ```cmd
   npm run dev
   ```

## Struktur Proyek

```
personal-website/
├── frontend/          # React + Vite frontend
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # Express.js backend
│   ├── src/
│   └── package.json
├── start.bat         # Batch file untuk menjalankan proyek
├── package.json      # Root package.json
└── SETUP.md         # File ini
```

## Port Configuration

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

Jika port sudah terpakai, Anda bisa mengubahnya di:
- Frontend: `frontend/vite.config.js`
- Backend: `backend/src/index.js` atau `backend/.env`

## Troubleshooting

### Port sudah terpakai
Jika muncul error "Port already in use":
1. Cari proses yang menggunakan port:
   ```cmd
   netstat -ano | findstr :5173
   netstat -ano | findstr :5000
   ```
2. Kill proses tersebut atau ubah port di konfigurasi

### Error saat npm install
Jika muncul error saat install dependencies:
1. Clear npm cache:
   ```cmd
   npm cache clean --force
   ```
2. Delete folder `node_modules` dan `package-lock.json`
3. Jalankan ulang `npm install`

### Backend tidak terkoneksi
Pastikan:
1. Backend sudah berjalan di port 5000
2. Cek file `frontend/.env` untuk konfigurasi API URL
3. Pastikan tidak ada firewall yang memblokir koneksi

## Environment Variables

### Backend (.env)
Buat file `.env` di folder `backend/`:
```
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
Buat file `.env` di folder `frontend/`:
```
VITE_API_URL=http://localhost:5000
```

## Catatan Penting

- Pastikan laptop terkoneksi internet untuk pertama kali install dependencies
- File `node_modules` tidak perlu dicopy ke laptop lain (akan di-generate otomatis)
- Jika ada perubahan di `package.json`, jalankan ulang `npm install`
- Selalu gunakan `npm run dev` untuk development, bukan `npm start`
