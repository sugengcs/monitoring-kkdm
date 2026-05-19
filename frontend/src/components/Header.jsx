import { Bell, User, ChevronDown, Menu } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import ReportDetailModal from './ReportDetailModal';
import { useState, useEffect } from 'react';

const Header = ({ onMenuClick }) => {
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
      <header className="bg-[#0F172A]/80 backdrop-blur-xl border-b border-white/6 px-4 sm:px-6 py-2 sm:py-3 relative z-50">
        <div className="flex items-center justify-between">
          {/* Mobile Menu Button - Only show on small screens */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1"></div>

          <div className="flex items-center gap-2 sm:gap-4">
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
