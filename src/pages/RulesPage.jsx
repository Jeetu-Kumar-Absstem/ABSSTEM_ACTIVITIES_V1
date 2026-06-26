// src/pages/RulesPage.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RULES_DATA } from '../utils/constants';

const RulesPage = () => {
  const { rules, setRules } = useApp();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? rules : rules.filter(r => r.game === filter || r.game === 'General');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px' }}>
      <div className="clay-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>Activity Rules</h2>
          <button className="clay-btn clay-btn-primary">+ Add Rule</button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Game:
            <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Games</option>
              <option value="Carrom">Carrom</option>
              <option value="Table Tennis">Table Tennis</option>
              <option value="Chess">Chess</option>
              <option value="General">General (All)</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(rule => (
            <div key={rule.id} className="clay-soft" style={{ padding: '12px 16px', borderRadius: '16px', borderLeft: `4px solid ${rule.type === 'critical' ? '#e53935' : '#1a3c6e'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', fontWeight: 700, color: rule.type === 'critical' ? '#e53935' : '#1a3c6e' }}>#{rule.id}</span>
                  <span style={{ fontSize: '0.75rem', color: '#444466', marginLeft: '8px' }}>
                    {rule.type === 'critical' ? <strong>{rule.text}</strong> : rule.text}
                  </span>
                  {rule.game !== 'General' && <span className="clay-badge clay-badge-navy" style={{ fontSize: '0.5rem', marginLeft: '8px' }}>{rule.game} only</span>}
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button className="clay-btn" style={{ padding: '2px 8px', fontSize: '0.6rem' }}>✏</button>
                  <button className="clay-btn" style={{ padding: '2px 8px', fontSize: '0.6rem', color: '#e53935' }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="clay-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>Recent Violations Reported</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="clay-soft" style={{ padding: '10px 14px', borderRadius: '16px', borderLeft: '3px solid #e53935', background: 'rgba(229,57,53,0.03)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Anil Rawat</div>
              <div style={{ fontSize: '0.65rem', color: '#8888aa' }}>Rule 4 — Using mobile phone during game</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: '#8888aa' }}>
                <span>25 Apr 2026 · Carrom · Reported by Pradeep Sati</span>
                <span className="clay-badge clay-badge-red">Violation #2</span>
              </div>
            </div>
            <div className="clay-soft" style={{ padding: '10px 14px', borderRadius: '16px', borderLeft: '3px solid #f9a825', background: 'rgba(249,168,37,0.03)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Sunita Negi</div>
              <div style={{ fontSize: '0.65rem', color: '#8888aa' }}>Rule 2 — Did not show up within 10 min</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: '#8888aa' }}>
                <span>22 Apr 2026 · Table Tennis · Reported by Admin</span>
                <span className="clay-badge clay-badge-amber">Violation #1</span>
              </div>
            </div>
          </div>
          <button className="clay-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}>+ Report New Violation</button>
        </div>

        <div className="clay-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>Auto-Ban Settings</h3>
          <div style={{ fontSize: '0.7rem', color: '#444466', marginBottom: '8px' }}>Automatically ban an employee when they accumulate violations:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="clay-soft" style={{ padding: '8px 12px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
              <span>Ban after <strong>3 violations</strong> (same game)</span>
              <span className="clay-badge clay-badge-green">Enabled</span>
            </div>
            <div className="clay-soft" style={{ padding: '8px 12px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
              <span>Ban duration: <strong>3 months</strong></span>
              <button className="clay-btn" style={{ padding: '2px 10px', fontSize: '0.6rem' }}>✏</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RulesPage;