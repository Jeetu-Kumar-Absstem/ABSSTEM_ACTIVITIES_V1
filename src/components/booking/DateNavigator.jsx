// src/components/booking/DateNavigator.jsx
import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../utils/helpers';

const DateNavigator = () => {
  const { currentDate, setCurrentDate } = useApp();

  const changeDate = (dir) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + dir);
    setCurrentDate(newDate);
  };

  const goToday = () => {
    setCurrentDate(new Date(2026, 3, 28));
  };

  return (
    <div className="clay-card" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px', padding: '10px 16px' }}>
      <button className="clay-btn" onClick={() => changeDate(-1)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>◀</button>
      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a3c6e' }}>{formatDate(currentDate)}</div>
      <button className="clay-btn" onClick={() => changeDate(1)} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>▶</button>
      <button className="clay-btn" onClick={goToday} style={{ padding: '4px 14px', fontSize: '0.7rem' }}>Today</button>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '0.65rem', color: '#8888aa', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(26,60,110,0.1)' }}></span> Booked
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(249,168,37,0.2)' }}></span> Full
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'white', border: '1px solid #d0d4e0' }}></span> Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(229,57,53,0.2)' }}></span> Banned
        </span>
      </div>
    </div>
  );
};

export default DateNavigator;