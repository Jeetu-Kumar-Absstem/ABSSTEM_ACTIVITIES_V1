// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useRef } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  const timeoutRef = useRef(null);

  const showToast = (message, type = 'success') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type, visible: true });
    timeoutRef.current = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
};