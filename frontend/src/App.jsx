import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MonitoringMap from './pages/MonitoringMap';
import MonitoringSHMS from './pages/MonitoringSHMS';
import AssetData from './pages/AssetData';
import DamageReport from './pages/DamageReport';
import CCTVMonitoring from './pages/CCTVMonitoring';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Karyawan from './pages/Karyawan';
import RepairTracking from './pages/RepairTracking';
import ProgressLahan from './pages/ProgressLahan';
import ProgressDashboard from './pages/ProgressDashboard';
import AnggaranPemeliharaan from './pages/AnggaranPemeliharaan';
import MonitoringSPMWTR from './pages/MonitoringSPMWTR';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/*"
                      element={
                        <MainLayout>
                          <Routes>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/monitoring" element={<MonitoringMap />} />
                            <Route path="/monitoring-shms" element={<MonitoringSHMS />} />
                            <Route path="/assets" element={<AssetData />} />
                            <Route path="/reports" element={<DamageReport />} />
                            <Route path="/karyawan" element={<Karyawan />} />
                            <Route path="/repair-tracking" element={<RepairTracking />} />
                            <Route path="/anggaran-pemeliharaan" element={<AnggaranPemeliharaan />} />
                            <Route path="/monitoring-spm-wtr" element={<MonitoringSPMWTR />} />
                            <Route path="/progress-lahan" element={<ProgressLahan />} />
                            <Route path="/cctv" element={<CCTVMonitoring />} />
                            <Route path="/analytics" element={<Analytics />} />
                            <Route path="/users" element={<UserManagement />} />
                            <Route path="/settings" element={<Settings />} />
                          </Routes>
                        </MainLayout>
                      }
                    />
                    <Route path="/progress-dashboard" element={<ProgressDashboard />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
