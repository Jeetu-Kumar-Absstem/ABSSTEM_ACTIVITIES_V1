// src/context/ToastContext.jsx
import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false });
  let timeoutId = null;

  const showToast = (message, type = 'success') => {
    if (timeoutId) clearTimeout(timeoutId);
    setToast({ message, type, visible: true });
    timeoutId = setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
};