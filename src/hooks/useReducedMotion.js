import { useEffect, useState } from 'react';

/**
 * Hook to detect if the user has enabled "Reduce Motion" in their system settings.
 * @returns {boolean} True if reduced motion is preferred.
 */
export const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial state
    setReduced(mediaQuery.matches);

    // Listen for changes in system settings
    const handler = (event) => setReduced(event.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler);
      } else {
        mediaQuery.removeListener(handler);
      }
    };
  }, []);

  return reduced;
};
