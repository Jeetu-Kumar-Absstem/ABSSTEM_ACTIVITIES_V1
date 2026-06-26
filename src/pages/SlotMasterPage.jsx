// src/pages/SlotMasterPage.jsx
import React from 'react';
import { SLOTS } from '../utils/constants';

const SlotMasterPage = () => {
  return (
    <div className="clay-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>Slot Master — Time Slot Configuration</h2>
        <button className="clay-btn clay-btn-primary">+ Add Slot</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Game:
          <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}>
            <option>All Games</option>
          </select>
        </label>
        <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Day:
          <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}>
            <option>All Days</option>
          </select>
        </label>
        <button className="clay-btn clay-btn-teal" style={{ fontSize: '0.7rem' }}>🔍 Search</button>
        <button className="clay-btn" style={{ fontSize: '0.7rem' }}>↺ Reset</button>
      </div>

      <div className="clay-soft" style={{ padding: '6px 14px', borderRadius: '20px', display: 'inline-block', fontSize: '0.7rem', marginBottom: '12px' }}>
        Total Record(s) Found: {SLOTS.length} slots (applies to all active days)
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Edit</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Slot Code</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Slot Name</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Time</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Duration</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Applies To</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 500, color: '#444466' }}>Max</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Active</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {SLOTS.map(slot => (
              <tr key={slot.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '8px 10px' }}><input type="checkbox" /></td>
                <td style={{ padding: '8px 10px', color: '#1a3c6e', fontWeight: 500 }}>SLT-{String(slot.id).padStart(2, '0')}</td>
                <td style={{ padding: '8px 10px' }}>{slot.label}</td>
                <td style={{ padding: '8px 10px', color: '#444466' }}>{slot.time}</td>
                <td style={{ padding: '8px 10px', color: '#444466' }}>30 min</td>
                <td style={{ padding: '8px 10px' }}><span className="clay-badge clay-badge-navy">All Games · Mon–Fri</span></td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>4</td>
                <td style={{ padding: '8px 10px' }}><span className="clay-badge clay-badge-green">✓</span></td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="clay-btn" style={{ padding: '4px 10px', fontSize: '0.6rem' }}>✏</button>
                    <button className="clay-btn" style={{ padding: '4px 10px', fontSize: '0.6rem', color: '#e53935' }}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SlotMasterPage;