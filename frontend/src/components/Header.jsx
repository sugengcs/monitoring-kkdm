import { Bell, User, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ReportDetailModal from './ReportDetailModal';
import { useState, useEffect } from 'react';

const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    const handleOpenReportDetail = (event) => {
      setSelectedReport(event.detail);
    };

    window.addEventListener('openReportDetail', handleOpenReportDetail);
    return () => window.removeEventListener('openReportDetail', handleOpenReportDetail);
  }, []);

  return (
    <>
      <header className="bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/6 px-6 py-3 relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>

          <div className="flex items-center gap-4">
          </div>
        </div>
      </header>
      
      {selectedReport && (
        <ReportDetailModal 
          report={selectedReport} 
          onClose={() => setSelectedReport(null)} 
        />
      )}
    </>
  );
};

export default Header;
