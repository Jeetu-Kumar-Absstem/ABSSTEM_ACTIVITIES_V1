// src/pages/ReportsPage.jsx
import React from 'react';

const ReportsPage = () => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>Booking Report</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.65rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '4px' }}>From: <input className="clay-input" type="date" value="2026-04-01" style={{ padding: '4px 10px', fontSize: '0.65rem', width: 'auto' }} /></label>
          <label style={{ fontSize: '0.65rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '4px' }}>To: <input className="clay-input" type="date" value="2026-04-30" style={{ padding: '4px 10px', fontSize: '0.65rem', width: 'auto' }} /></label>
          <button className="clay-btn clay-btn-teal" style={{ fontSize: '0.65rem' }}>🔍 Search</button>
          <button className="clay-btn" style={{ fontSize: '0.65rem' }}>⬇ Export</button>
        </div>

        <div className="clay-soft" style={{ padding: '4px 12px', borderRadius: '20px', display: 'inline-block', fontSize: '0.65rem', marginBottom: '10px' }}>Total Record(s) Found: 86</div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
            <thead>
              <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Game</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Slot</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '6px 8px' }}>28-Apr-26</td>
                <td style={{ padding: '6px 8px' }}>Pradeep Sati</td>
                <td style={{ padding: '6px 8px' }}>🎯 Carrom</td>
                <td style={{ padding: '6px 8px' }}>Slot 8</td>
                <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-green">Played</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '6px 8px' }}>28-Apr-26</td>
                <td style={{ padding: '6px 8px' }}>Priya Mehta</td>
                <td style={{ padding: '6px 8px' }}>🏓 Table Tennis</td>
                <td style={{ padding: '6px 8px' }}>Slot 9</td>
                <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-green">Played</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>Participation Summary — April 2026</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
            <thead>
              <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Employee</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Bookings</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Played</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>No-Show</th>
                <th style={{ padding: '6px 8px', textAlign: 'center' }}>Violations</th>
                <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '6px 8px' }}>Pradeep Sati</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>12</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>12</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>0</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>0</td>
                <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-green">Good</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '6px 8px' }}>Anil Rawat</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>7</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>5</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>2</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>2</td>
                <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-amber">Warning</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '6px 8px' }}>Rohan Sharma</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>0</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>0</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>0</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>3</td>
                <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-red">Banned</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;