import React from 'react';

// Mobile detection utility
export const isMobile = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth <= 768;
  }
  return false;
};

export const isTablet = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
  }
  return false;
};

export const isDesktop = () => {
  if (typeof window !== 'undefined') {
    return window.innerWidth > 1024;
  }
  return false;
};

// Responsive hook for React components
export const useResponsive = () => {
  const [screenSize, setScreenSize] = React.useState({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    width: 1200
  });

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setScreenSize({
        isMobile: width <= 768,
        isTablet: width > 768 && width <= 1024,
        isDesktop: width > 1024,
        width
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};
