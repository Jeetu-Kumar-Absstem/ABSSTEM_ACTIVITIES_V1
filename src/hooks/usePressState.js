// src/hooks/usePressState.js
// Lightweight press feedback helper for mobile/touch UI.
// Returns a `pressed` boolean + a `pressProps` spread that maps both
// touch and mouse events to a single state. This replaces the desktop-only
// onMouseEnter/onMouseLeave pattern so cards/buttons feel alive on phones.
import { useState, useCallback } from 'react';

export default function usePressState() {
  const [pressed, setPressed] = useState(false);

  const onPressStart = useCallback(() => setPressed(true), []);
  const onPressEnd = useCallback(() => setPressed(false), []);

  const pressProps = {
    onTouchStart: onPressStart,
    onTouchEnd: onPressEnd,
    onTouchCancel: onPressEnd,
    onMouseDown: onPressStart,
    onMouseUp: onPressEnd,
    onMouseLeave: onPressEnd,
  };

  return { pressed, pressProps };
}
