// src/pages/GameMasterPage.jsx
import React from 'react';
import { useApp } from '../context/AppContext';

const GameMasterPage = () => {
  const { games } = useApp();

  return (
    <div className="clay-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>Game Master — All Activities</h2>
        <button className="clay-btn clay-btn-primary">+ Add Game</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Status:
          <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}>
            <option>All</option><option>Active</option><option>Inactive</option>
          </select>
        </label>
        <button className="clay-btn clay-btn-teal" style={{ fontSize: '0.7rem' }}>🔍 Search</button>
        <button className="clay-btn" style={{ fontSize: '0.7rem' }}>↺ Reset</button>
      </div>

      <div className="clay-soft" style={{ padding: '6px 14px', borderRadius: '20px', display: 'inline-block', fontSize: '0.7rem', marginBottom: '12px' }}>
        Total Record(s) Found: {games.length}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Edit</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Game Code</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Game Name</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Icon</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Location</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 500, color: '#444466' }}>Max/Slot</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Active</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, i) => (
              <tr key={game.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                <td style={{ padding: '8px 10px' }}><input type="checkbox" /></td>
                <td style={{ padding: '8px 10px', color: '#1a3c6e', fontWeight: 500 }}>ACT-00{i+1}</td>
                <td style={{ padding: '8px 10px', fontWeight: 500 }}>{game.name}</td>
                <td style={{ padding: '8px 10px', fontSize: '1.1rem' }}>{game.icon}</td>
                <td style={{ padding: '8px 10px', color: '#444466' }}>{game.location}</td>
                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600 }}>{game.maxPlayers}</td>
                <td style={{ padding: '8px 10px' }}><span className="clay-badge clay-badge-green">✓ Active</span></td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="clay-btn" style={{ padding: '4px 10px', fontSize: '0.6rem' }}>👁</button>
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

export default GameMasterPage;