// src/pages/BanManagementPage.jsx
import React from 'react';
import { useApp } from '../context/AppContext';

const BanManagementPage = () => {
  const { bans } = useApp();

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="clay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f' }}>Active Bans</h3>
            <button className="clay-btn clay-btn-red">🚫 Issue Ban</button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Game:
              <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}>
                <option>All Games</option>
              </select>
            </label>
          </div>

          {bans.filter(b => b.active !== false).map(ban => (
            <div key={ban.id} className="clay-soft" style={{ padding: '12px 14px', borderRadius: '16px', marginBottom: '10px', borderLeft: '4px solid #e53935' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{ban.employee}</div>
                  <div style={{ fontSize: '0.6rem', color: '#8888aa' }}>Banned: {ban.from} · Until: {ban.until}</div>
                </div>
                <span className="clay-badge clay-badge-red">Active</span>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#444466', marginTop: '4px' }}>Reason: {ban.reason}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button className="clay-btn" style={{ fontSize: '0.6rem', padding: '4px 12px' }}>📋 View History</button>
                <button className="clay-btn clay-btn-green" style={{ fontSize: '0.6rem', padding: '4px 12px' }}>✓ Lift Ban</button>
                <button className="clay-btn" style={{ fontSize: '0.6rem', padding: '4px 12px' }}>📅 Extend</button>
              </div>
            </div>
          ))}
        </div>

        <div className="clay-card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>Ban History — All Time</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
              <thead>
                <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Game</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>From</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Until</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={{ padding: '6px 8px' }}>Anil Rawat</td>
                  <td style={{ padding: '6px 8px' }}>🎯 Carrom</td>
                  <td style={{ padding: '6px 8px' }}>25-Apr-26</td>
                  <td style={{ padding: '6px 8px' }}>25-Jul-26</td>
                  <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-red">Active</span></td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={{ padding: '6px 8px' }}>Priya Mehta</td>
                  <td style={{ padding: '6px 8px' }}>🎯 Carrom</td>
                  <td style={{ padding: '6px 8px' }}>01-Jan-26</td>
                  <td style={{ padding: '6px 8px' }}>01-Apr-26</td>
                  <td style={{ padding: '6px 8px' }}><span className="clay-badge clay-badge-green">Expired</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>🔍 Quick Ban Check — Is this employee allowed to play?</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'block', marginBottom: '4px' }}>Employee</label>
            <select className="clay-select" style={{ padding: '8px 14px' }}>
              <option>-- Select Employee --</option>
              <option>Anil Rawat</option>
              <option>Rohan Sharma</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'block', marginBottom: '4px' }}>Game</label>
            <select className="clay-select" style={{ padding: '8px 14px' }}>
              <option>-- Select Game --</option>
              <option>Carrom</option>
              <option>Table Tennis</option>
            </select>
          </div>
          <button className="clay-btn clay-btn-primary">🔍 Check Status</button>
        </div>
        <div className="clay-soft" style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '16px', borderLeft: '4px solid #2e7d32', background: 'rgba(56,142,60,0.03)' }}>
          <div style={{ fontWeight: 600, color: '#2e7d32' }}>✅ ALLOWED — Can Book</div>
          <div style={{ fontSize: '0.7rem', color: '#444466' }}>Employee has no active ban for this game. They can book available slots.</div>
        </div>
      </div>
    </div>
  );
};

export default BanManagementPage;