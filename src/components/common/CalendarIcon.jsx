import React from 'react';

const CalendarIcon = ({ size = '24px', date = new Date() }) => {
  const d = new Date(date);
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = d.getDate();

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '25%',
      background: '#fff',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      boxShadow: 'var(--surface-shadow-soft)',
      flexShrink: 0,
    }}>
      <div style={{
        background: '#ef4444',
        color: '#fff',
        fontSize: `calc(${size} * 0.25)`,
        fontWeight: 800,
        textAlign: 'center',
        padding: '1px 0',
        lineHeight: 1,
        fontFamily: "'Lufga', sans-serif",
      }}>
        {month}
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `calc(${size} * 0.5)`,
        fontWeight: 800,
        color: '#1f2937',
        lineHeight: 1,
        fontFamily: "'Lufga', sans-serif",
      }}>
        {day}
      </div>
    </div>
  );
};

export default CalendarIcon;
