import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Settings, Key, LogOut, ChevronDown } from 'lucide-react';

const ProfileDropdown = ({ onProfileClick, onSettingsClick, onPasswordClick, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleButtonClick = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        left: rect.right + window.scrollX - 256,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  const menuItems = [
    { icon: User, label: 'Informasi Profil', onClick: onProfileClick },
    { icon: Settings, label: 'Pengaturan Akun', onClick: onSettingsClick },
    { icon: Key, label: 'Ubah Password', onClick: onPasswordClick },
    { icon: LogOut, label: 'Logout', onClick: onLogout },
  ];

  return (
    <>
      <div className="relative" ref={buttonRef}>
        <button
          onClick={handleButtonClick}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 group"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl shadow-blue-900/20 overflow-hidden transform transition-all duration-300 origin-top-right z-[9999]"
          style={{
            top: `${buttonPosition.top}px`,
            left: `${buttonPosition.left}px`
          }}
        >
          <div className="p-2 space-y-1">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-blue-600/20 rounded-xl transition-all duration-300 group"
              >
                <item.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default ProfileDropdown;
