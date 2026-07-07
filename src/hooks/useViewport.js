// src/hooks/useViewport.js
import { useEffect, useState } from 'react';

function read() {
  if (typeof window === 'undefined') {
    return { width: 1280, isSmallMobile: false, isMobile: false, isTablet: false, isDesktop: true };
  }
  const w = window.innerWidth;
  return {
    width: w,
    isSmallMobile: w < 480,
    isMobile:      w < 768,
    isTablet:      w >= 768 && w < 992,
    isDesktop:     w >= 992,
  };
}

export default function useViewport() {
  const [vp, setVp] = useState(read);

  useEffect(() => {
    const onResize = () => setVp(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return vp;
}
