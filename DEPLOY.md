# Monitoring Aset Jalan Tol - Deployment Guide

## Overview
This project is a web-based asset monitoring system for toll road assets. It consists of:
- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express + SQLite
- **Deployment**: Frontend on Vercel, Backend on any Node.js hosting

## Prerequisites
- Node.js 18+ installed
- Git installed
- GitHub account
- Vercel account (for frontend deployment)

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <your-repository-url>
cd personal-website
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 3. Configure Environment Variables

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

**Backend (.env):**
```env
PORT=5000
NODE_ENV=development
DATABASE_PATH=./database/becakayu.db
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:5173
```

### 4. Initialize Database
```bash
cd backend
npm run init-db
```

### 5. Run Development Server
```bash
# From root directory
npm run dev
```
This will start:
- Frontend on http://localhost:5173
- Backend on http://localhost:5000

## Production Deployment

### Frontend Deployment (Vercel)

#### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

#### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_API_URL`: Your backend API URL (e.g., `https://your-backend.herokuapp.com/api`)
6. Click "Deploy"

#### 3. Update Environment Variables in Vercel
After deployment:
1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add/update:
   - `VITE_API_URL`: Your production backend URL
4. Redeploy the project

### Backend Deployment Options

#### Option 1: Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Set environment variables
heroku config:set JWT_SECRET=your_jwt_secret
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend.vercel.app

# Deploy
git push heroku main
```

#### Option 2: Railway
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add GitHub repository
4. Configure environment variables
5. Deploy

#### Option 3: DigitalOcean / VPS
```bash
# Install Node.js on server
# Clone repository
git clone <your-repository-url>
cd personal-website/backend

# Install dependencies
npm install

# Configure environment variables
nano .env

# Start with PM2
npm install -g pm2
pm2 start server.js --name "monitoring-api"
pm2 save
pm2 startup
```

## Post-Deployment Checklist

### Frontend
- [ ] Verify frontend is accessible
- [ ] Check all pages load correctly
- [ ] Test mobile responsiveness
- [ ] Verify map displays correctly
- [ ] Test login functionality
- [ ] Check API calls work

### Backend
- [ ] Verify backend is running
- [ ] Test API endpoints
- [ ] Check database connection
- [ ] Verify CORS configuration
- [ ] Test authentication
- [ ] Check file uploads work

### Mobile Testing
- [ ] Test on Android (Chrome)
- [ ] Test on iPhone (Safari)
- [ ] Verify login works on mobile
- [ ] Check sidebar drawer works
- [ ] Verify map displays correctly
- [ ] Test all features on mobile

## Environment Variables Reference

### Frontend
- `VITE_API_URL`: Backend API URL (required)
- `VITE_NODE_ENV`: Environment (development/production)
- `VITE_GOOGLE_MAPS_API_KEY`: Google Maps API key (optional)

### Backend
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development/production)
- `DATABASE_PATH`: SQLite database file path
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `JWT_EXPIRE`: Token expiration time (default: 7d)
- `CORS_ORIGIN`: Frontend URL for CORS
- `UPLOAD_DIR`: Directory for file uploads
- `MAX_FILE_SIZE`: Maximum file size in bytes

## Troubleshooting

### Frontend Issues

**Build fails on Vercel:**
- Check if all dependencies are in package.json
- Verify Vite configuration is correct
- Check build logs for specific errors

**API calls fail in production:**
- Verify VITE_API_URL is set correctly in Vercel
- Check backend CORS configuration
- Ensure backend is running and accessible

**Map not displaying:**
- Check Leaflet CSS is imported
- Verify map container has proper dimensions
- Check browser console for errors

### Backend Issues

**Database connection fails:**
- Verify DATABASE_PATH is correct
- Check file permissions
- Ensure database file exists

**Authentication fails:**
- Verify JWT_SECRET is set
- Check token expiration time
- Verify token is being sent correctly

**CORS errors:**
- Update CORS_ORIGIN to match frontend URL
- Check if backend allows OPTIONS requests
- Verify credentials are being sent if needed

### Mobile Issues

**Login fails on mobile:**
- Check localStorage is accessible
- Verify API URL is correct
- Check for mixed content (HTTP/HTTPS) issues
- Test on different browsers

**Sidebar not working on mobile:**
- Verify CSS media queries are correct
- Check if JavaScript is enabled
- Test drawer toggle functionality

## Security Notes

1. **Change JWT_SECRET** in production
2. **Use HTTPS** for production deployments
3. **Enable rate limiting** on API endpoints
4. **Sanitize user inputs** to prevent XSS
5. **Use environment variables** for sensitive data
6. **Regular security updates** for dependencies
7. **Implement proper error handling** without exposing sensitive data

## Performance Optimization

1. **Enable gzip compression** on backend
2. **Use CDN** for static assets
3. **Implement caching** for API responses
4. **Optimize images** before upload
5. **Lazy load components** where possible
6. **Minimize bundle size** with code splitting
7. **Use service workers** for offline support

## Support

For issues or questions:
- Check GitHub Issues
- Review troubleshooting section
- Check browser console for errors
- Review backend logs

## License

MIT License - See LICENSE file for details
