# Project Blueprint - WebKKDM3

## 1. Project Overview

**Nama Project:** WebKKDM3 - Sistem Monitoring Aset dan Progress Pengadaan Tanah  
**Deskripsi:** Sistem web-based untuk monitoring aset jalan tol dan tracking progress pengadaan tanah dengan dashboard monitoring premium  
**Versi:** 3.0  
**Status:** Active Development  

---

## 2. Tech Stack

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **UI Library:** TailwindCSS
- **Component Library:** Lucide React (Icons)
- **Map Library:** Leaflet
- **Animation:** Framer Motion
- **State Management:** React Hooks (useState, useEffect, useMemo, useCallback)
- **HTTP Client:** Axios
- **Routing:** React Router DOM

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Sequelize / Prisma
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer

### Infrastructure
- **Server:** Node.js (Port 5000)
- **Dev Server:** Vite (Port 5173)
- **Proxy:** Vite Proxy (/api -> http://localhost:5000)

---

## 3. Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── progress/
│   │   │   ├── BecakayuMap.jsx          # Map component with Leaflet
│   │   │   ├── KpiCardsHorizontal.jsx    # Summary KPI cards
│   │   │   ├── ProgressDataTable.jsx     # Data table with CRUD
│   │   │   ├── ProgressLahanHeader.jsx   # Dashboard header
│   │   │   ├── ProgressSeksiCards.jsx    # Section progress cards
│   │   │   └── ProgressLahan.jsx         # Main page component
│   │   ├── common/
│   │   │   ├── Layout.jsx                # Main layout
│   │   │   ├── Sidebar.jsx               # Sidebar navigation
│   │   │   └── Header.jsx                # App header
│   │   └── auth/
│   │       ├── LoginForm.jsx             # Login form
│   │       └── ProtectedRoute.jsx        # Route protection
│   ├── pages/
│   │   ├── Dashboard.jsx                 # Main dashboard
│   │   ├── ProgressLahan.jsx             # Progress pengadaan tanah
│   │   ├── Aset.jsx                     # Aset management
│   │   └── Login.jsx                     # Login page
│   ├── lib/
│   │   └── api.js                       # Axios configuration
│   ├── context/
│   │   └── AuthContext.jsx              # Authentication context
│   ├── App.jsx                          # Root component
│   └── main.jsx                         # Entry point
├── public/                              # Static assets
├── index.html                           # HTML template
├── vite.config.js                       # Vite configuration
├── tailwind.config.js                   # TailwindCSS configuration
└── package.json                         # Dependencies

backend/
├── config/
│   ├── database.js                      # Database configuration
│   └── config.js                        # App configuration
├── controllers/
│   ├── authController.js                # Authentication logic
│   ├── progressLahanController.js       # Progress lahan CRUD
│   ├── asetController.js                # Aset management
│   └── userController.js                # User management
├── models/
│   ├── User.js                          # User model
│   ├── ProgressLahan.js                 # Progress lahan model
│   ├── Asset.js                         # Asset model
│   └── Seksi.js                         # Seksi model
├── routes/
│   ├── authRoutes.js                    # Authentication routes
│   ├── progressLahanRoutes.js           # Progress routes
│   ├── asetRoutes.js                    # Asset routes
│   └── userRoutes.js                    # User routes
├── middleware/
│   ├── authMiddleware.js                # JWT verification
│   ├── uploadMiddleware.js              # File upload handling
│   └── errorMiddleware.js               # Error handling
├── utils/
│   ├── csvParser.js                     # CSV parsing utility
│   └── validators.js                    # Input validation
├── server.js                            # Server entry point
└── package.json                         # Dependencies
```

---

## 4. Features

### 4.1 Authentication
- User login with email/password
- JWT-based authentication
- Protected routes
- Role-based access control (Admin, User, Viewer)
- Session management

### 4.2 Dashboard Monitoring Premium (Progress Pengadaan Tanah)
- **4 Summary Cards:**
  - Total Kebutuhan (dalam m²)
  - Total Realisasi (dalam m²)
  - Progress (persentase)
  - Sisa Belum Bebas (persentase)

- **Progress per Seksi Cards:**
  - Seksi 1A, 1B, 1C, 2A, 2B
  - Neon glow effects
  - Gradient borders
  - Hover animations
  - Progress percentage display

- **Interactive Map:**
  - Leaflet-based map
  - Dark mode futuristic GIS styling
  - Floating neon card markers
  - Section-based color coding
  - Disabled zoom (static view)
  - Route lines display

- **Data Table:**
  - CRUD operations (Create, Read, Update, Delete)
  - Search functionality
  - Sort functionality
  - Pagination
  - Sum row at bottom
  - Inline editing
  - Export to CSV

- **CSV Upload:**
  - Upload CSV file to update data
  - Automatic parsing
  - Data validation

### 4.3 Aset Management
- Asset categories management
- CRUD operations for assets
- Asset details tracking
- Perkerasan, PJU, Panel Utama, KWH Meter, Rambu

---

## 5. Database Schema

### 5.1 Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nama_lengkap VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user', -- admin, user, viewer
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.2 Progress Lahan Table
```sql
CREATE TABLE progress_lahan (
  id SERIAL PRIMARY KEY,
  no INTEGER,
  lokasi VARCHAR(255),
  seksi VARCHAR(10), -- 1A, 1B, 1C, 2A, 2B
  kebutuhan NUMERIC,
  realisasi NUMERIC,
  sisa NUMERIC,
  progress NUMERIC,
  keterangan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.3 Assets Table
```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  kode_aset VARCHAR(50) UNIQUE NOT NULL,
  nama_aset VARCHAR(255) NOT NULL,
  kategori_id INTEGER REFERENCES asset_categories(id),
  lokasi VARCHAR(255),
  kondisi VARCHAR(50), -- baik, rusak_ringan, rusak_berat
  status VARCHAR(50), -- aktif, non_aktif, maintenance
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.4 Asset Categories Table
```sql
CREATE TABLE asset_categories (
  id SERIAL PRIMARY KEY,
  nama_kategori VARCHAR(100) UNIQUE NOT NULL,
  deskripsi TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 5.5 Detail Tables
```sql
-- Perkerasan
CREATE TABLE perkerasan (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  panjang NUMERIC,
  lebar NUMERIC,
  jenis_perkerasan VARCHAR(50),
  kondisi VARCHAR(50)
);

-- PJU
CREATE TABLE pju (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  jumlah_tiang INTEGER,
  daya_watt NUMERIC,
  kondisi VARCHAR(50)
);

-- Panel Utama
CREATE TABLE panel_utama (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  kapasitas_amps NUMERIC,
  merk VARCHAR(100),
  kondisi VARCHAR(50)
);

-- KWH Meter
CREATE TABLE kwh_meter (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  no_meter VARCHAR(50),
  kapasitas_kva NUMERIC,
  kondisi VARCHAR(50)
);

-- Rambu
CREATE TABLE rambu (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(id),
  jenis_rambu VARCHAR(50),
  jumlah INTEGER,
  kondisi VARCHAR(50)
);
```

---

## 6. API Endpoints

### 6.1 Authentication
```
POST /api/auth/login          - User login
POST /api/auth/logout         - User logout
GET  /api/auth/me             - Get current user
POST /api/auth/refresh        - Refresh JWT token
```

### 6.2 Progress Lahan
```
GET    /api/progress-lahan           - Get all progress data
GET    /api/progress-lahan/:id       - Get single progress data
POST   /api/progress-lahan           - Create new progress data
PUT    /api/progress-lahan/:id       - Update progress data
DELETE /api/progress-lahan/:id       - Delete progress data
POST   /api/progress-lahan/upload    - Upload CSV file
GET    /api/progress-lahan/export    - Export to CSV
```

### 6.3 Assets
```
GET    /api/assets              - Get all assets
GET    /api/assets/:id          - Get single asset
POST   /api/assets              - Create new asset
PUT    /api/assets/:id          - Update asset
DELETE /api/assets/:id          - Delete asset
GET    /api/assets/categories    - Get asset categories
```

### 6.4 Users
```
GET    /api/users               - Get all users (admin only)
GET    /api/users/:id           - Get single user
POST   /api/users               - Create new user (admin only)
PUT    /api/users/:id           - Update user (admin only)
DELETE /api/users/:id           - Delete user (admin only)
```

---

## 7. Component Architecture

### 7.1 ProgressLahan Page
```
ProgressLahan.jsx
├── ProgressLahanHeader.jsx
│   ├── Date Range Picker
│   ├── Upload CSV Button
│   ├── Refresh Button
│   ├── Export Button
│   └── Fullscreen Button
├── KpiCardsHorizontal.jsx
│   ├── Total Kebutuhan Card
│   ├── Total Realisasi Card
│   ├── Progress Card
│   └── Sisa Belum Bebas Card
├── Layout: 2-Column Grid
│   ├── Left Column:
│   │   ├── ProgressSeksiCards.jsx
│   │   │   ├── Seksi 1A Card
│   │   │   ├── Seksi 1B Card
│   │   │   ├── Seksi 1C Card
│   │   │   ├── Seksi 2A Card
│   │   │   └── Seksi 2B Card
│   │   └── ProgressDataTable.jsx
│   │       ├── Table Header
│   │       ├── Table Body
│   │       ├── Table Footer (Sum Row)
│   │       └── Pagination
│   └── Right Column:
│       └── BecakayuMap.jsx
│           ├── Map Container
│           ├── Tile Layers
│           ├── Route Lines
│           ├── Markers
│           └── Map Controls
```

### 7.2 Data Flow
```
API Response → lahanData State
                    ↓
            filteredData (Search/Filter)
                    ↓
            sortedData (Sort)
                    ↓
    ┌───────────┴───────────┐
    ↓                       ↓
Stats Calculation      Table Display
    ↓                       ↓
KPI Cards            ProgressDataTable
ProgressSeksiCards    Sum Row
```

---

## 8. Key Implementations

### 8.1 Number Parsing (cleanNumber)
```javascript
const cleanNumber = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(val.toString().replace(/,/g, '')) || 0;
};
```

### 8.2 Stats Calculation
```javascript
const totalKebutuhan = useMemo(() => {
  return filteredData.reduce((sum, item) => {
    return sum + cleanNumber(item.kebutuhan);
  }, 0);
}, [filteredData]);
```

### 8.3 CSV Upload Handler
```javascript
const handleCSVUpload = (file) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    const newData = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim());
      const item = {};
      headers.forEach((header, index) => {
        item[header] = values[index];
      });
      newData.push(item);
    }
    setLahanData(newData);
  };
  reader.readAsText(file);
};
```

### 8.4 Map Configuration
```javascript
const map = L.map(mapContainerRef.current, {
  center: [-6.2347, 106.9322],
  zoom: 13,
  zoomControl: false,
  scrollWheelZoom: false,
  doubleClickZoom: false,
  touchZoom: false,
  boxZoom: false,
  keyboard: false,
  dragging: false,
});
```

---

## 9. Styling Guide

### 9.1 Color Palette
- **Primary Blue:** #3B82F6
- **Cyan:** #06B6D4
- **Purple:** #8B5CF6
- **Green:** #22C55E
- **Red:** #EF4444
- **Yellow:** #F59E0B
- **Background:** #0B1120 to #111827 (gradient)
- **Glass Background:** rgba(17,24,39,0.8)

### 9.2 Section Colors
- **Seksi 1A:** Cyan (#06B6D4)
- **Seksi 1B:** Purple (#8B5CF6)
- **Seksi 1C:** Pink (#EC4899)
- **Seksi 2A:** Orange (#F97316)
- **Seksi 2B:** Green (#22C55E)

### 9.3 Glassmorphism
```css
background: rgba(17,24,39,0.8);
backdrop-filter: blur(20px);
border: 2px solid rgba(59,130,246,0.3);
box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 40px rgba(59,130,246,0.15);
```

### 9.4 Neon Glow
```css
box-shadow: 0 0 20px #3B82F650, 0 8px 32px rgba(0,0,0,0.4);
text-shadow: 0 0 30px rgba(59,130,246,0.5);
```

---

## 10. Known Issues & Fixes

### 10.1 Card Total Showing "1 m²"
**Problem:** Parsing angka terlalu agresif dengan replace(/\./g, '') dan replace(/,/g, '')  
**Fix:** Gunakan parser sederhana yang hanya menghapus koma:  
```javascript
const cleanNumber = (val) => {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return Number(val.toString().replace(/,/g, '')) || 0;
};
```

### 10.2 Stats Not Matching Table
**Problem:** Stats menggunakan lahanData (semua data) sedangkan tabel menggunakan filteredData (data difilter)  
**Fix:** Gunakan filteredData untuk perhitungan stats agar match dengan tabel

### 10.3 Map Loading Error
**Problem:** toggleFullscreen is not defined  
**Fix:** Implement fungsi toggleFullscreen dengan Fullscreen API

---

## 11. Future Enhancements

1. **Real-time Updates:** WebSocket untuk real-time data sync
2. **Advanced Filtering:** Multi-column filters
3. **Data Visualization:** Charts dan graphs
4. **Export Formats:** PDF, Excel
5. **Audit Trail:** Log semua perubahan data
6. **Notifications:** Email/SMS alerts untuk milestones
7. **Mobile App:** React Native version
8. **Analytics Dashboard:** Advanced analytics dan reporting
9. **Map Features:** Custom layers, heatmaps
10. **Integration:** ERP integration

---

## 12. Deployment

### 12.1 Development
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend
cd backend
npm install
npm run dev
```

### 12.2 Production
```bash
# Frontend Build
cd frontend
npm run build

# Backend Production
cd backend
npm start
```

### 12.3 Environment Variables
```env
# Backend (.env)
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key

# Frontend (.env)
VITE_API_URL=http://localhost:5000
```

---

## 13. Security Considerations

1. **Authentication:** JWT tokens with expiration
2. **Password Hashing:** bcrypt
3. **SQL Injection:** Parameterized queries via ORM
4. **XSS Prevention:** Input validation and sanitization
5. **CORS:** Configured for specific domains
6. **Rate Limiting:** API rate limiting
7. **File Upload:** File type validation and size limits
8. **HTTPS:** SSL/TLS in production

---

## 14. Performance Optimizations

1. **React.memo:** Prevent unnecessary re-renders
2. **useMemo:** Cache expensive calculations
3. **useCallback:** Stable function references
4. **Code Splitting:** Lazy loading components
5. **Image Optimization:** Compressed images
6. **Pagination:** Limit data per page
7. **Database Indexing:** Proper indexes on queries
8. **Caching:** Redis for frequently accessed data

---

## 15. Maintenance

### 15.1 Regular Tasks
- Database backups
- Security updates
- Dependency updates
- Log monitoring
- Performance monitoring

### 15.2 Documentation
- API documentation (Swagger/OpenAPI)
- Component documentation
- Database schema documentation
- Deployment guide

---

## 16. Contact & Support

- **Project Lead:** [Name]
- **Email:** [Email]
- **Repository:** [Git URL]
- **Documentation:** [Wiki URL]

---

**Last Updated:** May 17, 2026  
**Version:** 1.0
