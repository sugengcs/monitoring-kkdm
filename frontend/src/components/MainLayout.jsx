import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <style>
        {`
          body.fullscreen-mode > div > div:first-child {
            display: none !important;
          }
          body.fullscreen-mode > div > div:last-child {
            margin-left: 0 !important;
          }
          body.fullscreen-mode .fixed.inset-0.bg-black\\/50 {
            display: none !important;
          }
        `}
      </style>
      <div className="min-h-screen bg-[#0F172A] flex">
        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        
        <Sidebar 
          isOpen={sidebarOpen} 
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />
        <div className="flex-1 flex flex-col transition-all duration-300">
          <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 overflow-auto p-2 sm:p-4 lg:p-6 pt-16 lg:pt-6">
            {children}
          </main>
        </div>
      </div>
    </>
  );
};

export default MainLayout;
