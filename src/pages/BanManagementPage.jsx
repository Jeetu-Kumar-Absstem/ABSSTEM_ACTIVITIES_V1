// src/pages/BanManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabase';
import { GAMES } from '../utils/constants';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import BottomSheet from '../components/common/BottomSheet';

const normalizeGameValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const resolveGameRecord = (value, games = GAMES) => {
  const normalized = normalizeGameValue(value);
  if (!normalized || normalized === 'all' || normalized === 'all games') return null;

  const exact = games.find((game) => {
    const gameId = normalizeGameValue(game.id);
    const gameName = normalizeGameValue(game.name);
    return gameId === normalized || gameName === normalized;
  });
  if (exact) return exact;

  if (/^\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    const byId = games.find((game) => Number(game.id) === numeric);
    if (byId) return byId;
  }

  return null;
};

const resolveGameLabel = (value, games = GAMES) => {
  if (!value || normalizeGameValue(value) === 'all' || normalizeGameValue(value) === 'all games') {
    return 'All Games';
  }
  return resolveGameRecord(value, games)?.name || String(value);
};

const isSameGame = (left, right, games = GAMES) => {
  const leftResolved = resolveGameRecord(left, games);
  const rightResolved = resolveGameRecord(right, games);
  if (leftResolved && rightResolved) {
    return normalizeGameValue(leftResolved.id) === normalizeGameValue(rightResolved.id)
      || normalizeGameValue(leftResolved.name) === normalizeGameValue(rightResolved.name);
  }

  const normalizedLeft = normalizeGameValue(left);
  const normalizedRight = normalizeGameValue(right);
  return normalizedLeft === normalizedRight;
};

const BanManagementPage = () => {
  const { bans, currentUser, isAdmin, addBan, liftBan, deleteBan, loadBans, games } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();
  const availableGames = games?.length > 0 ? games : GAMES;
  const [loading, setLoading] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [filterGame, setFilterGame] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [checkResult, setCheckResult] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedGameCheck, setSelectedGameCheck] = useState('');

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
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

  const getFilteredBans = () => {
    if (filterGame === 'all') return bans;
    return bans.filter((b) => isSameGame(b.game, filterGame, availableGames) || normalizeGameValue(b.game) === 'all games');
  };

  const filteredBans = getFilteredBans();

  const activeBans = filteredBans.filter(b =>
    b.active !== false && new Date(b.until_date) > new Date()
  );

  const expiredBans = filteredBans.filter(b =>
    b.active === false || new Date(b.until_date) <= new Date()
  );

  const handleLiftBan = async (banId) => {
    if (!isAdmin()) {
      showToast('Only admins can lift bans!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to lift this ban?')) return;

    setLoading(true);
    const result = await liftBan(banId);
    if (result.success) {
      showToast('Ban lifted successfully!', 'success');
      await loadBans();
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleDeleteBan = async (banId) => {
    if (!isAdmin()) {
      showToast('Only admins can delete bans!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to permanently delete this ban?')) return;

    setLoading(true);
    const result = await deleteBan(banId);
    if (result.success) {
      showToast('Ban deleted successfully!', 'success');
      await loadBans();
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleIssueBan = async (banData) => {
    if (!isAdmin()) {
      showToast('Only admins can issue bans!', 'error');
      return;
    }

    setLoading(true);
    const result = await addBan(banData);
    if (result.success) {
      showToast('Ban issued successfully!', 'success');
      setShowBanModal(false);
      await loadBans();
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const checkBanStatus = () => {
    if (!isAdmin()) {
      setCheckResult({
        type: 'info',
        message: 'Quick Ban Check is available to admins only.',
      });
      return;
    }

    const empId = selectedEmployee;
    const game = selectedGameCheck;

    if (!empId || !game) {
      setCheckResult({ type: 'info', message: 'Please select both employee and game.' });
      return;
    }

    const employee = employees.find(e => e.id === parseInt(empId));
    if (!employee) {
      setCheckResult({ type: 'info', message: 'Employee not found.' });
      return;
    }

    const isCheckingAllGames = normalizeGameValue(game) === 'all games';

    const findActiveBanForGame = (gameName) => bans.find(b => {
      const isActive = b.active !== false && new Date(b.until_date) > new Date();
      if (!isActive) return false;
      if (b.employee_id !== employee.employee_code) return false;
      const banIsAllGames = normalizeGameValue(b.game) === 'all games';
      return isSameGame(b.game, gameName, availableGames) || banIsAllGames;
    });

    if (isCheckingAllGames) {
      const bannedGames = [];
      const allowedGames = [];

      availableGames.forEach(g => {
        const ban = findActiveBanForGame(g.name);
        if (ban) {
          bannedGames.push({ game: g, ban });
        } else {
          allowedGames.push(g);
        }
      });

      if (bannedGames.length === 0) {
        setCheckResult({
          type: 'allowed',
          message: `${employee.name} is ALLOWED to play All Games`,
          details: 'No active bans found for this employee.',
        });
      } else {
        const bannedLines = bannedGames
          .map(({ game: g, ban }) =>
            `🚫 ${g.icon || ''} ${g.name} — Until: ${new Date(ban.until_date).toLocaleDateString()} (${ban.reason})`
          )
          .join('\n');
        const allowedLines = allowedGames.length > 0
          ? allowedGames.map(g => `✅ ${g.icon || ''} ${g.name}`).join('\n')
          : 'None';

        setCheckResult({
          type: 'banned',
          message: `${employee.name} has active bans on ${bannedGames.length} game(s)`,
          details: `Employee ID: ${employee.employee_code}\n\nBANNED GAMES:\n${bannedLines}\n\nALLOWED GAMES:\n${allowedLines}`,
        });
      }
      return;
    }

    const activeBan = findActiveBanForGame(game);

    if (activeBan) {
      const banScope = normalizeGameValue(activeBan.game) === 'all games'
        ? 'All Games'
        : resolveGameLabel(activeBan.game, availableGames);
      setCheckResult({
        type: 'banned',
        message: `${employee.name} is BANNED from ${resolveGameLabel(game, availableGames)}`,
        details: `Employee ID: ${employee.employee_code}\nBan Scope: ${banScope}\nFrom: ${new Date(activeBan.from_date).toLocaleDateString()}\nUntil: ${new Date(activeBan.until_date).toLocaleDateString()}\nReason: ${activeBan.reason}`,
      });
    } else {
      setCheckResult({
        type: 'allowed',
        message: `${employee.name} is ALLOWED to play ${resolveGameLabel(game, availableGames)}`,
        details: 'No active bans found for this employee and game.',
      });
    }
  };

  const getBanStatusBadge = (ban) => {
    const isActive = ban.active !== false && new Date(ban.until_date) > new Date();
    if (isActive) {
      return <span className="clay-badge clay-badge-red">Active</span>;
    } else {
      return <span className="clay-badge clay-badge-green">Expired</span>;
    }
  };

  // History table columns + rows
  const historyRows = expiredBans.map(ban => ({
    ...ban,
    _gameLabel: resolveGameLabel(ban.game, availableGames),
  }));
  const historyColumns = [
    { key: 'employee', label: 'Employee' },
    { key: '_gameLabel', label: 'Game' },
    { key: 'until_date', label: 'Until', render: (row) => new Date(row.until_date).toLocaleDateString() },
    { key: 'active', label: 'Status', render: (row) => getBanStatusBadge(row) },
  ];

  return (
    <div className="ban-management-page" style={{ fontWeight: 400, color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '8px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', margin: 0, flex: 1, minWidth: 0 }}>
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
        <span style={{ fontSize: '0.7rem', color: isAdmin() ? 'var(--success)' : 'var(--muted)', background: isAdmin() ? 'rgba(56,142,60,0.14)' : 'var(--bg-surface-strong)', padding: '4px 12px', borderRadius: '12px' }}>
          {isAdmin() ? '🔑 Admin Mode' : '👁️ View Only'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Active Bans */}
        <div className="clay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
              🔴 Active Bans ({activeBans.length})
            </h3>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Game:
              <select
                className="clay-select"
                style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto', flex: 1 }}
                value={filterGame}
                onChange={(e) => setFilterGame(e.target.value)}
              >
                <option value="all">All Games</option>
                <option value="All Games">🚫 All Games</option>
                {availableGames.map(game => (
                  <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
                ))}
              </select>
            </label>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>⏳ Loading bans...</div>
          ) : activeBans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
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
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                      ID: {ban.employee_id} · Game: {resolveGameLabel(ban.game, availableGames)}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                      📅 {new Date(ban.from_date).toLocaleDateString()} → {new Date(ban.until_date).toLocaleDateString()}
                    </div>
                  </div>
                  {getBanStatusBadge(ban)}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text)', marginTop: '4px' }}>
                  📝 {ban.reason}
                </div>
                {ban.created_by && (
                  <div style={{ fontSize: '0.55rem', color: 'var(--muted)', marginTop: '2px' }}>
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
                  <div style={{ fontSize: '0.55rem', color: 'var(--muted)', marginTop: '4px', fontStyle: 'italic' }}>
                    Contact admin to lift this ban
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ban History */}
        <div className="clay-card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
            📜 Ban History ({expiredBans.length})
          </h3>
          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
            <MobileTable
              columns={historyColumns}
              rows={historyRows}
              rowKey={(row) => row.id}
              emptyMessage="No ban history found."
            />
          </div>
        </div>
      </div>

      {isAdmin() ? (
        <div className="clay-card">
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
            🔍 Quick Ban Check
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                Employee
              </label>
              <select
                id="ban-check-employee"
                className="clay-select"
                style={{ padding: '8px 14px' }}
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
              >
                <option value="">-- Select Employee --</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_code})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                Game
              </label>
              <select
                id="ban-check-game"
                className="clay-select"
                style={{ padding: '8px 14px' }}
                value={selectedGameCheck}
                onChange={(e) => setSelectedGameCheck(e.target.value)}
              >
                <option value="">-- Select Game --</option>
                <option value="All Games">🚫 All Games</option>
                {availableGames.map(game => (
                  <option key={game.id} value={game.name}>{game.icon} {game.name}</option>
                ))}
              </select>
            </div>
            <button
              className="clay-btn clay-btn-primary"
              onClick={checkBanStatus}
              disabled={!selectedEmployee || !selectedGameCheck}
              style={{ width: isMobile ? '100%' : 'auto' }}
            >
              🔍 Check Status
            </button>
          </div>

          {checkResult && (
            <div style={{ marginTop: '12px' }}>
              <div className="clay-soft" style={{
                padding: '12px 16px',
                borderRadius: '16px',
                borderLeft: `4px solid ${checkResult.type === 'banned' ? 'var(--danger)' : checkResult.type === 'allowed' ? 'var(--success)' : 'var(--muted)'}`,
                background: checkResult.type === 'banned' ? 'rgba(229,57,53,0.08)' : checkResult.type === 'allowed' ? 'rgba(56,142,60,0.08)' : 'transparent'
              }}>
                <div style={{
                  fontWeight: 700,
                  color: checkResult.type === 'banned' ? 'var(--danger)' : checkResult.type === 'allowed' ? 'var(--success)' : 'var(--muted)',
                }}>
                  {checkResult.type === 'banned' ? '🚫 BANNED' : checkResult.type === 'allowed' ? '✅ ALLOWED' : 'ℹ️ INFO'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text)', marginTop: '4px' }}>
                  {checkResult.message}
                </div>
                {checkResult.details && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px', whiteSpace: 'pre-line' }}>
                    {checkResult.details}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="clay-card" style={{ padding: '18px', color: 'var(--muted)' }}>
          Quick Ban Check is available to admins only.
        </div>
      )}

      {showBanModal && (
        <IssueBanModal
          employees={employees}
          onClose={() => setShowBanModal(false)}
          onSave={handleIssueBan}
          isAdmin={isAdmin()}
          loading={loading}
          showToast={showToast}
        />
      )}
    </div>
  );
};

// Issue Ban Modal Component — BottomSheet on mobile, centered on desktop
const IssueBanModal = ({ employees, onClose, onSave, isAdmin, loading, showToast }) => {
  const { isMobile } = useViewport();
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
      showToast('Only admins can issue bans!', 'error');
      return;
    }
    if (!formData.employee || !formData.game || !formData.reason) {
      showToast('Please fill all required fields!', 'warning');
      return;
    }
    onSave(formData);
  };

  const formBody = (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: 'rgba(229,57,53,0.12)',
        padding: '10px 14px',
        borderRadius: '12px',
        fontSize: '0.7rem',
        color: 'var(--danger)',
        marginBottom: '16px',
        borderLeft: '3px solid var(--danger)'
      }}>
        ⚠️ Banned employees will be blocked from booking the selected game(s). This action is logged and the employee is notified.
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Employee <span style={{ color: 'var(--danger)' }}>*</span>
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
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Game <span style={{ color: 'var(--danger)' }}>*</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            From Date <span style={{ color: 'var(--danger)' }}>*</span>
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
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            Until Date <span style={{ color: 'var(--danger)' }}>*</span>
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
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Reason <span style={{ color: 'var(--danger)' }}>*</span>
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

      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(249,168,37,0.12)', borderRadius: '8px', fontSize: '0.65rem', color: 'var(--warning)' }}>
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
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        onClose={onClose}
        title="🚫 Issue Ban"
        icon="🚫"
      >
        {formBody}
      </BottomSheet>
    );
  }

  return createPortal(
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
        background: 'var(--bg-surface-strong)',
        fontWeight: 400,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>🚫 Issue Ban</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
        </div>
        {formBody}
      </div>
    </div>,
    document.body
  );
};

export default BanManagementPage;
