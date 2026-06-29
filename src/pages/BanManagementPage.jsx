// src/pages/BanManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabase';
import { GAMES } from '../utils/constants';

const BanManagementPage = () => {
  const { bans, currentUser, isAdmin, addBan, liftBan, deleteBan, loadBans } = useApp();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [filterGame, setFilterGame] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [checkResult, setCheckResult] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedGameCheck, setSelectedGameCheck] = useState('');

  // Load employees for dropdown
  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      // Mock data if table doesn't exist
      setEmployees([
        { id: 1, name: 'John Doe', employee_code: 'ABCD1234' },
        { id: 2, name: 'Jane Smith', employee_code: 'XYZW5678' },
        { id: 3, name: 'Bob Johnson', employee_code: 'PQRS9012' },
        { id: 4, name: 'Anil Rawat', employee_code: 'EFGH5678' },
        { id: 5, name: 'Rohan Sharma', employee_code: 'IJKL9012' },
      ]);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadBans();
  }, []);

  // Filter bans by game
  const getFilteredBans = () => {
    if (filterGame === 'all') return bans;
    return bans.filter(b => b.game === filterGame || b.game === 'All Games');
  };

  const filteredBans = getFilteredBans();

  // Active bans (not expired)
  const activeBans = filteredBans.filter(b => 
    b.active !== false && new Date(b.until_date) > new Date()
  );

  // Expired bans
  const expiredBans = filteredBans.filter(b => 
    b.active === false || new Date(b.until_date) <= new Date()
  );

  // Handle lift ban
  const handleLiftBan = async (banId) => {
    if (!isAdmin()) {
      showToast('❌ Only admins can lift bans!', 'error');
      return;
    }
    
    if (!confirm('Are you sure you want to lift this ban?')) return;
    
    setLoading(true);
    const result = await liftBan(banId);
    if (result.success) {
      showToast('✅ Ban lifted successfully!', 'success');
      await loadBans();
    } else {
      showToast('❌ ' + result.error, 'error');
    }
    setLoading(false);
  };

  // Handle delete ban
  const handleDeleteBan = async (banId) => {
    if (!isAdmin()) {
      showToast('❌ Only admins can delete bans!', 'error');
      return;
    }
    
    if (!confirm('⚠️ Are you sure you want to permanently delete this ban?')) return;
    
    setLoading(true);
    const result = await deleteBan(banId);
    if (result.success) {
      showToast('✅ Ban deleted successfully!', 'success');
      await loadBans();
    } else {
      showToast('❌ ' + result.error, 'error');
    }
    setLoading(false);
  };

  // Handle issue ban
  const handleIssueBan = async (banData) => {
    if (!isAdmin()) {
      showToast('❌ Only admins can issue bans!', 'error');
      return;
    }

    setLoading(true);
    const result = await addBan(banData);
    if (result.success) {
      showToast('✅ Ban issued successfully!', 'success');
      setShowBanModal(false);
      await loadBans();
    } else {
      showToast('❌ ' + result.error, 'error');
    }
    setLoading(false);
  };

  // Check employee ban status
  const checkBanStatus = () => {
    const empSelect = document.getElementById('ban-check-employee');
    const gameSelect = document.getElementById('ban-check-game');
    
    const empId = empSelect.value;
    const game = gameSelect.value;
    
    if (!empId || !game) {
      setCheckResult({ type: 'info', message: 'Please select both employee and game.' });
      return;
    }
    
    const employee = employees.find(e => e.id === parseInt(empId));
    if (!employee) {
      setCheckResult({ type: 'info', message: 'Employee not found.' });
      return;
    }
    
    // Check ban by employee_code
    const activeBan = bans.find(b => 
      b.employee_id === employee.employee_code &&
      (b.game === game || b.game === 'All Games') &&
      b.active !== false &&
      new Date(b.until_date) > new Date()
    );
    
    if (activeBan) {
      setCheckResult({
        type: 'banned',
        message: `🚫 ${employee.name} is BANNED from ${game}`,
        details: `Employee ID: ${employee.employee_code}\nFrom: ${new Date(activeBan.from_date).toLocaleDateString()}\nUntil: ${new Date(activeBan.until_date).toLocaleDateString()}\nReason: ${activeBan.reason}`
      });
    } else {
      setCheckResult({
        type: 'allowed',
        message: `✅ ${employee.name} is ALLOWED to play ${game}`,
        details: 'No active bans found for this employee and game.'
      });
    }
  };

  // Check if employee is banned by employee_id
  const isEmployeeBanned = (empId, game) => {
    return bans.some(b => 
      b.employee_id === empId &&
      b.active !== false &&
      new Date(b.until_date) > new Date() &&
      (b.game === game || b.game === 'All Games')
    );
  };

  // Get ban status badge
  const getBanStatusBadge = (ban) => {
    const isActive = ban.active !== false && new Date(ban.until_date) > new Date();
    if (isActive) {
      return <span className="clay-badge clay-badge-red">Active</span>;
    } else {
      return <span className="clay-badge clay-badge-green">Expired</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1e1e2f' }}>
          🚫 Ban Management ({bans.length} total)
        </h2>
        {isAdmin() && (
          <button 
            className="clay-btn clay-btn-red" 
            onClick={() => setShowBanModal(true)}
            disabled={loading}
          >
            🚫 Issue Ban
          </button>
        )}
        <span style={{ fontSize: '0.7rem', color: isAdmin() ? '#2e7d32' : '#8888aa', background: isAdmin() ? 'rgba(56,142,60,0.1)' : 'rgba(136,136,170,0.1)', padding: '4px 12px', borderRadius: '12px' }}>
          {isAdmin() ? '🔑 Admin Mode' : '👁️ View Only'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Active Bans */}
        <div className="clay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f' }}>
              🔴 Active Bans ({activeBans.length})
            </h3>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Game:
              <select 
                className="clay-select" 
                style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
              >
                <option value="all">All Games</option>
                <option value="All Games">🚫 All Games</option>
                {GAMES.map(game => (
                  <option key={game.id} value={game.name}>{game.icon} {game.name}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>⏳ Loading bans...</div>
          ) : activeBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
              ✅ No active bans found.
            </div>
          ) : (
            activeBans.map(ban => (
              <div key={ban.id} className="clay-soft" style={{ 
                padding: '12px 14px', 
                borderRadius: '16px', 
                marginBottom: '10px', 
                borderLeft: '4px solid #e53935',
                background: 'rgba(229,57,53,0.03)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{ban.employee}</div>
                    <div style={{ fontSize: '0.6rem', color: '#8888aa' }}>
                      ID: {ban.employee_id} · Game: {ban.game}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: '#8888aa' }}>
                      📅 {new Date(ban.from_date).toLocaleDateString()} → {new Date(ban.until_date).toLocaleDateString()}
                    </div>
                  </div>
                  {getBanStatusBadge(ban)}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#444466', marginTop: '4px' }}>
                  📝 {ban.reason}
                </div>
                {ban.created_by && (
                  <div style={{ fontSize: '0.55rem', color: '#8888aa', marginTop: '2px' }}>
                    👤 By: {ban.created_by}
                  </div>
                )}
                {isAdmin() && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button 
                      className="clay-btn clay-btn-green" 
                      style={{ fontSize: '0.6rem', padding: '4px 12px' }}
                      onClick={() => handleLiftBan(ban.id)}
                      disabled={loading}
                    >
                      ✓ Lift Ban
                    </button>
                    <button 
                      className="clay-btn" 
                      style={{ fontSize: '0.6rem', padding: '4px 12px', color: '#e53935' }}
                      onClick={() => handleDeleteBan(ban.id)}
                      disabled={loading}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                )}
                {!isAdmin() && (
                  <div style={{ fontSize: '0.55rem', color: '#8888aa', marginTop: '4px', fontStyle: 'italic' }}>
                    Contact admin to lift this ban
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ban History */}
        <div className="clay-card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>
            📜 Ban History ({expiredBans.length})
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 2 }}>
                <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Employee</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Game</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Until</th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiredBans.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
                      No ban history found.
                    </td>
                  </tr>
                ) : (
                  expiredBans.map(ban => (
                    <tr key={ban.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                      <td style={{ padding: '6px 8px' }}>{ban.employee}</td>
                      <td style={{ padding: '6px 8px' }}>{ban.game}</td>
                      <td style={{ padding: '6px 8px' }}>{new Date(ban.until_date).toLocaleDateString()}</td>
                      <td style={{ padding: '6px 8px' }}>
                        {getBanStatusBadge(ban)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ban Check Tool */}
      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e1e2f', marginBottom: '12px' }}>
          🔍 Quick Ban Check
        </h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'block', marginBottom: '4px' }}>
              Employee
            </label>
            <select 
              id="ban-check-employee"
              className="clay-select" 
              style={{ padding: '8px 14px' }}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'block', marginBottom: '4px' }}>
              Game
            </label>
            <select 
              id="ban-check-game"
              className="clay-select" 
              style={{ padding: '8px 14px' }}
              onChange={(e) => setSelectedGameCheck(e.target.value)}
            >
              <option value="">-- Select Game --</option>
              <option value="All Games">🚫 All Games</option>
              {GAMES.map(game => (
                <option key={game.id} value={game.name}>{game.icon} {game.name}</option>
              ))}
            </select>
          </div>
          <button 
            className="clay-btn clay-btn-primary" 
            onClick={checkBanStatus}
            disabled={!selectedEmployee || !selectedGameCheck}
          >
            🔍 Check Status
          </button>
        </div>
        
        {checkResult && (
          <div style={{ marginTop: '12px' }}>
            <div className="clay-soft" style={{ 
              padding: '12px 16px', 
              borderRadius: '16px', 
              borderLeft: `4px solid ${checkResult.type === 'banned' ? '#e53935' : checkResult.type === 'allowed' ? '#2e7d32' : '#8888aa'}`,
              background: checkResult.type === 'banned' ? 'rgba(229,57,53,0.03)' : checkResult.type === 'allowed' ? 'rgba(56,142,60,0.03)' : 'transparent'
            }}>
              <div style={{ 
                fontWeight: 600, 
                color: checkResult.type === 'banned' ? '#c62828' : checkResult.type === 'allowed' ? '#2e7d32' : '#8888aa' 
              }}>
                {checkResult.type === 'banned' ? '🚫 BANNED' : checkResult.type === 'allowed' ? '✅ ALLOWED' : 'ℹ️ INFO'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#444466', marginTop: '4px' }}>
                {checkResult.message}
              </div>
              {checkResult.details && (
                <div style={{ fontSize: '0.65rem', color: '#8888aa', marginTop: '4px', whiteSpace: 'pre-line' }}>
                  {checkResult.details}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Issue Ban Modal */}
      {showBanModal && (
        <IssueBanModal
          employees={employees}
          onClose={() => setShowBanModal(false)}
          onSave={handleIssueBan}
          isAdmin={isAdmin()}
          loading={loading}
        />
      )}
    </div>
  );
};

// Issue Ban Modal Component
const IssueBanModal = ({ employees, onClose, onSave, isAdmin, loading }) => {
  const [formData, setFormData] = useState({
    employee: '',
    employee_id: '',
    game: '',
    from_date: new Date().toISOString().split('T')[0],
    until_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: '',
  });

  const handleEmployeeChange = (empId) => {
    const emp = employees.find(e => e.id === parseInt(empId));
    if (emp) {
      setFormData({
        ...formData,
        employee: emp.name,
        employee_id: emp.employee_code,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('❌ Only admins can issue bans!');
      return;
    }
    if (!formData.employee || !formData.game || !formData.reason) {
      alert('⚠️ Please fill all required fields!');
      return;
    }
    
    // Confirm before saving
    if (confirm(`⚠️ Are you sure you want to ban ${formData.employee} from ${formData.game}?\n\nFrom: ${formData.from_date}\nUntil: ${formData.until_date}\nReason: ${formData.reason}`)) {
      onSave(formData);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="clay" style={{
        width: '100%',
        maxWidth: 520,
        padding: '24px',
        borderRadius: '32px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.95)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>🚫 Issue Ban</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}>✕</button>
        </div>

        <div style={{ 
          background: '#ffebee', 
          padding: '10px 14px', 
          borderRadius: '12px', 
          fontSize: '0.7rem', 
          color: '#c62828',
          marginBottom: '16px',
          borderLeft: '3px solid #e53935'
        }}>
          ⚠️ Banned employees will be blocked from booking the selected game(s). This action is logged and the employee is notified.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Employee <span style={{ color: '#e53935' }}>*</span>
            </label>
            <select
              className="clay-select"
              value={formData.employee_id}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              required
              style={{ padding: '10px 14px' }}
            >
              <option value="">-- Select Employee --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Game <span style={{ color: '#e53935' }}>*</span>
            </label>
            <select
              className="clay-select"
              value={formData.game}
              onChange={(e) => setFormData({ ...formData, game: e.target.value })}
              required
              style={{ padding: '10px 14px' }}
            >
              <option value="">-- Select Game --</option>
              <option value="All Games">🚫 All Games</option>
              {GAMES.map(game => (
                <option key={game.id} value={game.name}>{game.icon} {game.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                From Date <span style={{ color: '#e53935' }}>*</span>
              </label>
              <input
                type="date"
                className="clay-input"
                value={formData.from_date}
                onChange={(e) => setFormData({ ...formData, from_date: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                Until Date <span style={{ color: '#e53935' }}>*</span>
              </label>
              <input
                type="date"
                className="clay-input"
                value={formData.until_date}
                onChange={(e) => setFormData({ ...formData, until_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Reason <span style={{ color: '#e53935' }}>*</span>
            </label>
            <textarea
              className="clay-input"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Describe the reason for the ban..."
              rows="3"
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff8e1', borderRadius: '8px', fontSize: '0.65rem', color: '#e65100' }}>
            ⚠️ This action will ban <strong>{formData.employee || '[Employee]'}</strong> from <strong>{formData.game || '[Game]'}</strong>. 
            They will not be able to book slots until the ban expires.
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button type="button" className="clay-btn" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="clay-btn clay-btn-red"
              disabled={!isAdmin || loading}
              style={{ opacity: isAdmin ? 1 : 0.5 }}
            >
              {loading ? '⏳ Processing...' : '🚫 Confirm Ban'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BanManagementPage;