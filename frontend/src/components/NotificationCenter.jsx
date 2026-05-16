import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X, AlertTriangle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const lastReportIdRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/reports', { params: { limit: 20 } });
      const reports = response.data.data || [];
      
      // Check for new reports
      if (reports.length > 0) {
        const latestId = reports[0].id;
        if (lastReportIdRef.current && lastReportIdRef.current !== latestId) {
          // New report detected
          const newReport = reports[0];
          toast.custom((t) => (
            <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-xl flex items-start gap-3 transform transition-all duration-300 ${t.visible ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium text-sm">Laporan baru diterima</p>
                <p className="text-gray-400 text-xs mt-1">{newReport.description?.substring(0, 50)}...</p>
                <p className="text-gray-500 text-xs mt-1">{new Date(newReport.reported_at).toLocaleTimeString('id-ID')}</p>
              </div>
              <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          ), { duration: 5000, position: 'top-right' });
        }
        lastReportIdRef.current = latestId;
      }

      setNotifications(reports);
      setUnreadCount(reports.filter(r => !r.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (reportId) => {
    try {
      await api.put(`/reports/${reportId}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === reportId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/reports/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'selesai': return 'bg-green-500/20 text-green-400';
      case 'on_progress': return 'bg-blue-500/20 text-blue-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getDamageColor = (level) => {
    switch (level) {
      case 'ringan': return 'bg-yellow-500/20 text-yellow-400';
      case 'sedang': return 'bg-orange-500/20 text-orange-400';
      case 'berat': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const handleButtonClick = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 380
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={handleButtonClick}
          className="p-2 rounded-lg hover:bg-gray-700 transition-colors relative"
        >
          <Bell className={`w-5 h-5 text-gray-300 ${unreadCount > 0 ? 'animate-pulse' : ''}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-[380px] max-h-[70vh] bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-900/20 overflow-hidden transform transition-all duration-300 origin-top-right z-[9999]"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`
          }}
        >
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-white font-semibold">Notifikasi</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Tandai semua dibaca
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-400 text-sm mt-3">Memuat notifikasi...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Belum ada notifikasi</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsRead(notification.id);
                    }
                    // Trigger modal open (will be handled by parent)
                    window.dispatchEvent(new CustomEvent('openReportDetail', { detail: notification }));
                    setIsOpen(false);
                  }}
                  className={`p-4 border-b border-gray-700/50 hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    !notification.is_read ? 'bg-gray-700/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${getDamageColor(notification.damage_level)}`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-white text-sm font-medium truncate">
                          {notification.report_number}
                        </p>
                        {!notification.is_read && (
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mt-1 truncate">
                        {notification.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDamageColor(notification.damage_level)}`}>
                          {notification.damage_level}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notification.reported_at).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-gray-700">
            <button
              onClick={() => {
                setIsOpen(false);
                window.location.href = '/reports';
              }}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Lihat Semua Laporan
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default NotificationCenter;
