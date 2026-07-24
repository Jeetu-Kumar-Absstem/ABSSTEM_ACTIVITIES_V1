// src/components/booking/DateNavigator.jsx
import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, getWeekRange } from '../../utils/helpers';

const DateNavigator = () => {
  const { currentDate, setCurrentDate } = useApp();
  const { start, end } = getWeekRange(currentDate);
  const normalizedCurrent = new Date(currentDate);
  normalizedCurrent.setHours(0, 0, 0, 0);

  const changeDate = (dir) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + dir);
    newDate.setHours(0, 0, 0, 0);
    if (newDate < start || newDate > end) {
      return;
    }
    setCurrentDate(newDate);
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const isPrevDisabled = normalizedCurrent <= start;
  const isNextDisabled = normalizedCurrent >= end;

  return (
    <div
      className="clay-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
        marginBottom: '12px',
        padding: '10px 16px',
      }}
    >
      <button className="clay-btn" onClick={() => changeDate(-1)} disabled={isPrevDisabled} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
        ◀
      </button>

      <div>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>
          {formatDate(currentDate)}
        </div>
        <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>
          Week view: {start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </div>
      </div>

      <button className="clay-btn" onClick={() => changeDate(1)} disabled={isNextDisabled} style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
        ▶
      </button>
      <button className="clay-btn" onClick={goToday} style={{ padding: '4px 14px', fontSize: '0.7rem' }}>
        Today
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', fontSize: '0.65rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(var(--accent-rgb),0.22)' }} />
          Booked
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(249,168,37,0.24)' }} />
          Full
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }} />
          Available
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '4px', background: 'rgba(229,57,53,0.24)' }} />
          Banned
        </span>
      </div>
    </div>
  );
};

export default DateNavigator;
