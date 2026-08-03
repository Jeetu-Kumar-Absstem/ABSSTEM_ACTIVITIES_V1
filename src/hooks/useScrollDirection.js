import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect scroll direction and inactivity.
 * Listen on document in capture phase to catch scrolls from sub-elements.
 */
const useScrollDirection = (threshold = 10, inactivityDelay = 300) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = (e) => {
      // Get scroll position from window or the target element
      const currentScrollY = e.target === document || e.target === window
        ? window.scrollY
        : e.target.scrollTop;

      // Handle undefined or null (e.g. if e.target is not a scrollable element)
      if (currentScrollY === undefined || currentScrollY === null) return;

      // Prevent hiding at the very top
      if (currentScrollY < threshold) {
        setIsVisible(true);
        lastScrollY.current = currentScrollY;
        return;
      }

      const diff = currentScrollY - lastScrollY.current;

      // Reset inactivity timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Detect direction change if we've moved past the threshold
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // Scrolling down
          setIsVisible(false);
        } else {
          // Scrolling up
          setIsVisible(true);
        }
        lastScrollY.current = currentScrollY;
      }

      // Show after inactivity
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, inactivityDelay);
    };

    // Use capture: true to intercept scroll events from any child
    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [threshold, inactivityDelay]); // Removed isVisible from deps to avoid re-binding on every toggle

  return isVisible;
};

export default useScrollDirection;
