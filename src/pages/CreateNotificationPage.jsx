import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Send, ArrowLeft, Users, Shield, Building, Trophy, Eye, UserPlus, Search, X, Check } from 'lucide-react';
import { supabase } from '../utils/supabase';

const CreateNotificationPage = () => {
  const { setActiveTab, employees } = useApp();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [showAllList, setShowAllList] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    target_type: 'all',
    target_id: ''
  });

  const TARGET_TYPES = [
    { id: 'all', label: 'All Employees', icon: <Users size={18} /> },
    { id: 'selected_employees', label: 'Select Employees', icon: <UserPlus size={18} /> },
  ];

  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(emp =>
      emp.name?.toLowerCase().includes(q) ||
      emp.employee_code?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  const toggleEmployeeSelection = (empId) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId)
        ? prev.filter(id => id !== empId)
        : [...prev, empId]
    );
  };

  const handleSend = async () => {
    if (!formData.title || !formData.body) {
      showToast('Title and Message are required', 'error');
      return;
    }

    if (formData.target_type === 'selected_employees' && selectedEmployeeIds.length === 0) {
      showToast('Please select at least one employee', 'error');
      return;
    }

    setLoading(true);
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('push-notifications', {
        body: {
          action: 'send',
          ...formData,
          selected_employee_ids: formData.target_type === 'selected_employees' ? selectedEmployeeIds : []
        }
      });

      if (error) throw error;

      showToast('Notification sent successfully!', 'success');
      setActiveTab('admin');
    } catch (err) {
      console.error('Error sending notification:', err);
      showToast(err.message || 'Failed to send notification', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => setActiveTab('admin')}
          className="clay-button"
          style={{ padding: '8px', borderRadius: '12px', background: 'var(--bg-surface)' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Compose Notification</h2>
      </div>

      <div className="clay-card" style={{ padding: '24px', borderRadius: '28px', background: 'var(--bg-surface-strong)' }}>
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Target Selection */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-soft)' }}>
              Send To
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              {TARGET_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, target_type: type.id })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: formData.target_type === type.id ? 'var(--accent)' : 'var(--border)',
                    background: formData.target_type === type.id ? 'var(--accent-soft)' : 'var(--bg-surface)',
                    color: formData.target_type === type.id ? 'var(--accent-strong)' : 'var(--text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* All Employees List Toggle */}
          {formData.target_type === 'all' && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => setShowAllList(!showAllList)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  transition: 'all 0.2s ease'
                }}
              >
                {showAllList ? <X size={14} /> : <Eye size={14} />}
                {showAllList ? 'Hide Recipient List' : `View Recipients (${employees.length})`}
              </button>
            </div>
          )}

          {/* All Employees Preview List */}
          {formData.target_type === 'all' && showAllList && (
            <div className="clay" style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-surface)' }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Filter list..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 10px 10px 36px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-strong)',
                    fontSize: '0.8rem',
                    color: 'var(--text)'
                  }}
                />
              </div>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                display: 'grid',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {filteredEmployees.map(emp => (
                  <div
                    key={emp.employee_code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '14px',
                      background: 'var(--bg-surface-strong)',
                      border: '1px solid transparent'
                    }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '10px',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}>
                      {emp.name?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-strong)' }}>
                        {emp.name}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                        {emp.employee_code} • {emp.department}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredEmployees.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '10px', fontSize: '0.75rem', color: 'var(--muted)' }}>
                    No results found
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Employee Selection List */}
          {formData.target_type === 'selected_employees' && (
            <div className="clay" style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                  Selected: <span style={{ color: 'var(--accent)' }}>{selectedEmployeeIds.length}</span>
                </div>
                {selectedEmployeeIds.length > 0 && (
                  <button
                    onClick={() => setSelectedEmployeeIds([])}
                    style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Search by name, ID or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 10px 10px 36px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface-strong)',
                    fontSize: '0.8rem',
                    color: 'var(--text)'
                  }}
                />
              </div>

              <div style={{
                maxHeight: '250px',
                overflowY: 'auto',
                display: 'grid',
                gap: '8px',
                paddingRight: '4px'
              }}>
                {filteredEmployees.map(emp => {
                  const isSelected = selectedEmployeeIds.includes(emp.employee_code);
                  return (
                    <div
                      key={emp.employee_code}
                      onClick={() => toggleEmployeeSelection(emp.employee_code)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: '14px',
                        background: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface-strong)',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        border: '2px solid',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                        background: isSelected ? 'var(--accent)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease'
                      }}>
                        {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: isSelected ? 'var(--accent-strong)' : 'var(--text-strong)' }}>
                          {emp.name}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
                          {emp.employee_code} • {emp.department}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filteredEmployees.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                    No employees found matching "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-soft)' }}>
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. Tournament Starting Soon!"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              maxLength={50}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                fontSize: '0.9rem'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px' }}>
              {formData.title.length}/50
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-soft)' }}>
              Message
            </label>
            <textarea
              placeholder="Enter the notification message here..."
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              maxLength={500}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '14px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                fontSize: '0.9rem',
                resize: 'none'
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.65rem', color: 'var(--muted)', marginTop: '4px' }}>
              {formData.body.length}/500
            </div>
          </div>

          {/* Preview */}
          <div style={{ background: 'var(--accent-soft)', padding: '16px', borderRadius: '18px', border: '1px dashed var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--accent-strong)', fontSize: '0.75rem', fontWeight: 700 }}>
              <Eye size={14} /> PREVIEW ON DEVICE
            </div>
            <div style={{ background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111', marginBottom: '2px' }}>
                {formData.title || 'Notification Title'}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#444', lineHeight: 1.4 }}>
                {formData.body || 'This is how your message will look on the user\'s screen...'}
              </div>
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: 'var(--accent)',
              color: 'white',
              fontWeight: 700,
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginTop: '10px'
            }}
          >
            {loading ? 'Sending...' : <><Send size={18} /> Send Notification</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateNotificationPage;
