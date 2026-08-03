// src/pages/RulesPage.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { GAMES } from '../utils/constants';
import useViewport from '../hooks/useViewport';
import BottomSheet from '../components/common/BottomSheet';


const RulesPage = () => {
  const { rules, violations, employees, isAdmin, addRule, updateRule, deleteRule, loadRules, addViolation, updateViolation, deleteViolation, loadViolations } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingViolation, setEditingViolation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    rule_description: '',
    created_at: new Date().toISOString().split('T')[0],
    created_by: 'Admin',
    game: 'General'
  });

  const [violationData, setViolationData] = useState({
    employee: '',
    employee_id: '',
    game: 'General',
    rule: '',
    reason: ''
  });

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      await Promise.all([loadRules(), loadViolations()]);
      setLoading(false);
    };
    fetchRules();
  }, []);

  const filtered = filter === 'all'
    ? rules
    : rules.filter(r => r.game === filter || r.game === 'General');

  const handleAddRule = () => {
    if (!isAdmin()) {
      showToast('Only admins can add rules!', 'error');
      return;
    }
    setEditingRule(null);
    setFormData({
      rule_description: '',
      created_at: new Date().toISOString().split('T')[0],
      created_by: 'Admin',
      game: 'General'
    });
    setShowModal(true);
  };

  const handleEditRule = (rule) => {
    if (!isAdmin()) {
      showToast('Only admins can edit rules!', 'error');
      return;
    }
    setEditingRule(rule);
    setFormData({
      rule_description: rule.rule_description,
      created_at: rule.created_at || new Date().toISOString().split('T')[0],
      created_by: rule.created_by || 'Admin',
      game: rule.game || 'General'
    });
    setShowModal(true);
  };

  const handleDeleteRule = async (ruleId) => {
    if (!isAdmin()) {
      showToast('Only admins can delete rules!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this rule permanently?')) return;

    const result = await deleteRule(ruleId);
    if (result.success) {
      showToast('Rule deleted successfully!', 'success');
      await loadRules();
    } else {
      showToast(result.error, 'error');
    }
  };

  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!isAdmin()) {
      showToast('Only admins can save rules!', 'error');
      return;
    }

    if (!formData.rule_description.trim()) {
      showToast('Please enter rule description!', 'warning');
      return;
    }

    if (!formData.created_by.trim()) {
      showToast('Please enter creator name!', 'warning');
      return;
    }

    setLoading(true);
    let result;
    if (editingRule) {
      result = await updateRule(editingRule.id, formData);
    } else {
      result = await addRule(formData);
    }

    if (result.success) {
      showToast(editingRule ? 'Rule updated successfully!' : 'Rule added successfully!', 'success');
      setShowModal(false);
      setEditingRule(null);
      await loadRules();
    } else {
      showToast(result.error, 'error');
    }
    setLoading(false);
  };

  const handleReportViolation = async (e) => {
    e.preventDefault();
    console.log('[RulesPage] handleReportViolation clicked', violationData);

    if (!isAdmin()) {
      console.warn('[RulesPage] User is not admin');
      showToast('Only admins can report violations!', 'error');
      alert('Error: Only admins can report violations!');
      return;
    }

    if (!violationData.employee_id) {
      console.warn('[RulesPage] No employee selected');
      showToast('Please select an employee!', 'warning');
      return;
    }

    setLoading(true);
    try {
      console.log('[RulesPage] Calling reporting function...');
      const result = editingViolation
        ? await updateViolation(editingViolation.id, violationData)
        : await addViolation(violationData);

      console.log('[RulesPage] result:', result);

      if (result.success) {
        showToast(editingViolation ? 'Violation updated successfully!' : 'Violation reported successfully!', 'success');
        setShowViolationModal(false);
        setEditingViolation(null);
        setViolationData({
          employee: '',
          employee_id: '',
          game: 'General',
          rule: '',
          reason: ''
        });
        console.log('[RulesPage] Refreshing violations...');
        await loadViolations();
      } else {
        console.error('[RulesPage] addViolation failed:', result.error);
        showToast(result.error, 'error');
        alert('Report Failed: ' + result.error);
      }
    } catch (err) {
      console.error('[RulesPage] Error in handleReportViolation:', err);
      showToast(`Unexpected error: ${err.message}`, 'error');
      alert('System Error: ' + err.message);
    } finally {
      setLoading(false);
      console.log('[RulesPage] handleReportViolation finished');
    }
  };

  const handleEditViolation = (violation) => {
    if (!isAdmin()) {
      showToast('Only admins can edit violations!', 'error');
      return;
    }
    setEditingViolation(violation);
    setViolationData({
      employee: violation.employee,
      employee_id: violation.employee_id,
      game: violation.game || 'General',
      rule: violation.rule || '',
      reason: violation.reason || ''
    });
    setShowViolationModal(true);
  };

  const handleDeleteViolation = async (violationId) => {
    if (!isAdmin()) {
      showToast('Only admins can delete violations!', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this violation record?')) return;

    setLoading(true);
    const result = await deleteViolation(violationId);
    if (result.success) {
      showToast('Violation deleted successfully!', 'success');
      await loadViolations();
    } else {
      showToast(result.error, 'error');
      alert('Delete Failed: ' + result.error);
    }
    setLoading(false);
  };

  if (loading && rules.length === 0) {
    return (
      <div className="clay-card" style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '1.2rem', marginBottom: '8px' }}>⏳</div>
        <div style={{ color: 'var(--muted)', fontWeight: 700 }}>Loading rules...</div>
      </div>
    );
  }

  const formBody = (
    <form onSubmit={handleSaveRule}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Rule Description <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <textarea
          className="clay-input"
          value={formData.rule_description}
          onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
          placeholder="Enter rule description..."
          rows="3"
          required
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            Created At <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="date"
            className="clay-input"
            value={formData.created_at}
            onChange={(e) => setFormData({ ...formData, created_at: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            Game
          </label>
          <select
            className="clay-select"
            value={formData.game}
            onChange={(e) => setFormData({ ...formData, game: e.target.value })}
          >
            <option value="General">General (All)</option>
            {GAMES.map(g => (
              <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Created By <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          className="clay-input"
          value={formData.created_by}
          onChange={(e) => setFormData({ ...formData, created_by: e.target.value })}
          placeholder="Admin name"
          required
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="clay-btn" onClick={() => setShowModal(false)}>
          Cancel
        </button>
        <button type="submit" className="clay-btn clay-btn-primary" disabled={loading}>
          {loading ? '⏳ Saving...' : '💾 Save Rule'}
        </button>
      </div>
    </form>
  );

  const violationFormBody = (
    <form onSubmit={handleReportViolation}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Employee <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <select
          className="clay-select"
          value={violationData.employee_id}
          onChange={(e) => {
            const emp = employees.find(emp => emp.employee_code === e.target.value);
            setViolationData({ ...violationData, employee_id: e.target.value, employee: emp?.name || '' });
          }}
          required
        >
          <option value="">-- Select Employee --</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.employee_code}>{emp.name} ({emp.employee_code})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            Game
          </label>
          <select
            className="clay-select"
            value={violationData.game}
            onChange={(e) => setViolationData({ ...violationData, game: e.target.value })}
          >
            <option value="General">General (All)</option>
            {GAMES.map(g => (
              <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
            Related Rule
          </label>
          <select
            className="clay-select"
            value={violationData.rule}
            onChange={(e) => setViolationData({ ...violationData, rule: e.target.value })}
          >
            <option value="">-- Select Rule (Optional) --</option>
            {rules.map(r => (
              <option key={r.id} value={r.rule_description.substring(0, 50) + '...'}>
                {r.rule_description.substring(0, 50)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
          Violation Reason
        </label>
        <textarea
          className="clay-input"
          value={violationData.reason}
          onChange={(e) => setViolationData({ ...violationData, reason: e.target.value })}
          placeholder="Describe the violation (optional)..."
          rows="3"
          style={{ resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="clay-btn" onClick={() => {
          setShowViolationModal(false);
          setEditingViolation(null);
        }}>
          Cancel
        </button>
        <button type="submit" className="clay-btn clay-btn-red" disabled={loading}>
          {loading ? '⏳ Processing...' : editingViolation ? '💾 Update Violation' : '🚩 Report Violation'}
        </button>
      </div>
    </form>
  );

  const ruleActionButtonStyle = {
    padding: '4px 10px',
    fontSize: '0.65rem',
    minWidth: '32px',
    minHeight: '32px',
  };

  return (
    <div className="rules-page" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: '16px', fontWeight: 400, color: 'var(--text)' }}>
      <div className="clay-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0, flex: 1, minWidth: 0 }}>
            Activity Rules ({rules.length})
          </h2>
          {isAdmin() ? (
            <button className="clay-btn clay-btn-primary" onClick={handleAddRule}>
              + Add Rule
            </button>
          ) : (
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', background: 'var(--bg-surface-strong)', padding: '4px 12px', borderRadius: '12px' }}>
              👁️ View Only
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', width: isMobile ? '100%' : 'auto' }}>
            Game:
            <select className="clay-select" style={{ padding: '6px 14px', fontSize: '0.7rem', flex: 1 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All Games</option>
              <option value="General">General (All)</option>
              {GAMES.map(g => (
                <option key={g.id} value={g.name}>{g.icon} {g.name}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="clay-btn"
              style={{ fontSize: '0.7rem' }}
              onClick={async () => {
                setLoading(true);
                await loadRules();
                setLoading(false);
                showToast('Rules refreshed!', 'success');
              }}
            >
              🔄 Refresh
            </button>
            <button
              className="clay-btn"
              style={{ fontSize: '0.7rem', opacity: 0.6 }}
              onClick={() => showToast('🔔 Notification system test successful!', 'info')}
            >
              🧪 Test Toast
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
              No rules found. {isAdmin() ? 'Tap "+ Add Rule" to create one.' : 'Contact admin to add rules.'}
            </div>
          ) : (
            filtered.map(rule => (
              <div key={rule.id} className="clay-soft" style={{
                padding: '12px 16px',
                borderRadius: '16px',
                borderLeft: `4px solid ${rule.game === 'General' ? 'var(--accent)' : 'var(--warning)'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{rule.rule_description}</div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '0.6rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <span>📅 {rule.created_at || 'N/A'}</span>
                      <span>👤 {rule.created_by || 'Admin'}</span>
                      <span className="clay-badge clay-badge-navy">{rule.game || 'General'}</span>
                    </div>
                  </div>
                  {isAdmin() && (
                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                      <button
                        className="clay-btn"
                        style={ruleActionButtonStyle}
                        onClick={() => handleEditRule(rule)}
                        title="Edit Rule"
                        aria-label="Edit rule"
                      >
                        ✏️
                      </button>
                      <button
                        className="clay-btn"
                        style={{ ...ruleActionButtonStyle, color: '#e53935' }}
                        onClick={() => handleDeleteRule(rule.id)}
                        title="Delete Rule"
                        aria-label="Delete rule"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right sidebar (collapses below rules on mobile) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="clay-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>📋 Recent Violations</h3>
            <button
              className="clay-btn"
              style={{ padding: '2px 8px', fontSize: '0.6rem' }}
              onClick={async () => {
                setLoading(true);
                await loadViolations();
                setLoading(false);
                showToast('Violations refreshed!', 'success');
              }}
            >
              🔄
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
            {violations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '10px', color: 'var(--muted)', fontSize: '0.7rem' }}>
                No violations reported yet.
              </div>
            ) : (
              violations.map((v, idx) => {
                const empViolations = violations.filter(vi => vi.employee_id === v.employee_id);
                const violationIndex = empViolations.length - empViolations.findIndex(vi => vi.id === v.id);

                return (
                  <div key={v.id || idx} className="clay-soft" style={{ padding: '10px 14px', borderRadius: '16px', borderLeft: '3px solid #e53935' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem' }}>{v.employee}</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '2px' }}>{v.reason}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className={`clay-badge ${violationIndex >= 3 ? 'clay-badge-red' : 'clay-badge-orange'}`} style={{ fontSize: '0.55rem' }}>
                          Violation #{violationIndex}
                        </span>
                        {isAdmin() && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="clay-btn"
                              style={{ ...ruleActionButtonStyle, padding: '2px 6px', minWidth: '24px', minHeight: '24px' }}
                              onClick={() => handleEditViolation(v)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="clay-btn"
                              style={{ ...ruleActionButtonStyle, padding: '2px 6px', minWidth: '24px', minHeight: '24px', color: 'var(--danger)' }}
                              onClick={() => handleDeleteViolation(v.id)}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.6rem', color: 'var(--muted)' }}>
                      <span>{v.created_at ? new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'} · {v.game}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {isAdmin() && (
            <button
              className="clay-btn clay-btn-red"
              style={{ width: '100%', justifyContent: 'center', marginTop: '12px', fontSize: '0.75rem' }}
              onClick={() => {
                setViolationData({
                  employee: '',
                  employee_id: '',
                  game: 'General',
                  rule: '',
                  reason: ''
                });
                setShowViolationModal(true);
              }}
            >
              + Report New Violation
            </button>
          )}
        </div>

        <div className="clay-card">
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>⚙️ Auto-Ban Settings</h3>
          <div style={{ fontSize: '0.7rem', color: 'var(--text)', marginBottom: '8px' }}>Automatically ban an employee when they accumulate violations:</div>
          <div className="clay-soft" style={{ padding: '8px 12px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
            <span>Ban after <strong>3 violations</strong> (same game)</span>
            <span className="clay-badge clay-badge-green">Enabled</span>
          </div>
          <div className="clay-soft" style={{ padding: '8px 12px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginTop: '6px' }}>
            <span>Ban duration: <strong>3 months</strong></span>
            {isAdmin() && <button className="clay-btn" style={{ padding: '2px 10px', fontSize: '0.6rem' }}>✏️</button>}
          </div>
        </div>
      </div>

      {showModal && isMobile && (
        <BottomSheet
          open
          onClose={() => setShowModal(false)}
          title={editingRule ? '✏️ Edit Rule' : '📝 Add New Rule'}
          icon="📜"
        >
          {formBody}
        </BottomSheet>
      )}

      {showModal && !isMobile && createPortal(
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
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                {editingRule ? '✏️ Edit Rule' : '📝 Add New Rule'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            {formBody}
          </div>
        </div>,
        document.body
      )}

      {showViolationModal && isMobile && (
        <BottomSheet
          open
          onClose={() => {
            setShowViolationModal(false);
            setEditingViolation(null);
          }}
          title={editingViolation ? '✏️ Edit Violation' : '🚩 Report Violation'}
          icon="📋"
        >
          {violationFormBody}
        </BottomSheet>
      )}

      {showViolationModal && !isMobile && createPortal(
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
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
                {editingViolation ? '✏️ Edit Violation' : '🚩 Report New Violation'}
              </h3>
              <button onClick={() => {
                setShowViolationModal(false);
                setEditingViolation(null);
              }} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}>✕</button>
            </div>
            {violationFormBody}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RulesPage;
