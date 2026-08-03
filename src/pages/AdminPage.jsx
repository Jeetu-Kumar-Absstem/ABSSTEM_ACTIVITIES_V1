// src/pages/AdminPage.jsx
import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import { Trash2, MessageSquare, ArrowLeft, CheckSquare, Square, X, Bell } from 'lucide-react';
import { format } from 'date-fns';

const ADMIN_TABS = [
  { id: 'registration-approval', label: 'Registration Approval' },
  { id: 'push-notifications', label: 'Push Notifications' },
  { id: 'previous-notifications', label: 'Previous Notifications' },
];

const AdminPage = () => {
  const {
    tournaments,
    tournamentRegistrationRequests,
    approveTournamentRegistration,
    getEmployeeName,
    setActiveTab: setGlobalActiveTab,
    allNotifications,
    loadAllNotifications,
    deleteNotification,
    deleteMultipleNotifications,
  } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState('registration-approval');
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (activeTab === 'previous-notifications') {
      loadAllNotifications();
    } else {
      exitSelectionMode();
      setSelectedNotif(null);
    }
  }, [activeTab]);

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Delete this notification history? It will remove it for all employees.')) return;
    setDeletingId(id);
    try {
      const res = await deleteNotification(id);
      if (res.success) {
        showToast('Notification deleted', 'success');
        if (selectedNotif?.id === id) setSelectedNotif(null);
      } else {
        showToast(res.error, 'error');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected history records? This cannot be undone.`)) return;
    try {
      const res = await deleteMultipleNotifications(selectedIds);
      if (res.success) {
        showToast(`${selectedIds.length} records deleted`, 'success');
        exitSelectionMode();
      } else {
        showToast(res.error, 'error');
      }
    } catch (err) {
      showToast('Failed to delete records', 'error');
    }
  };

  // Selection Logic
  const toggleSelection = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleLongPress = (notif) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds([notif.id]);
    }
  };

  const handleSelectNotif = (notif) => {
    if (selectionMode) {
      toggleSelection(notif.id);
      return;
    }
    setSelectedNotif(notif);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === allNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allNotifications.map(n => n.id));
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };

  // Long press timer logic
  const [timer, setTimer] = useState(null);
  const startTimer = (notif) => {
    const t = setTimeout(() => handleLongPress(notif), 600);
    setTimer(t);
  };
  const stopTimer = () => {
    if (timer) clearTimeout(timer);
  };

  const pendingRequests = useMemo(() => {
    return tournamentRegistrationRequests
      .filter((row) => String(row.status || '').toLowerCase() === 'pending')
      .map((row) => {
        const tournament = tournaments.find((t) => t.id === row.tournament_id);
        return { ...row, tournament };
      })
      .sort((a, b) => String(a.registered_at || '').localeCompare(String(b.registered_at || '')));
  }, [tournamentRegistrationRequests, tournaments]);

  const handleApprove = async (row) => {
    setApprovingId(row.id);
    try {
      const result = await approveTournamentRegistration(row.id);
      if (result.success) {
        showToast(
          result.alreadyRegistered
            ? `${row.employee_id} was already registered for ${row.tournament?.name || 'tournament'}`
            : `Approved ${row.employee_id} for ${row.tournament?.name || 'tournament'}`,
          'success'
        );
      } else {
        showToast(result.error || 'Failed to approve request', 'error');
      }
    } finally {
      setApprovingId(null);
    }
  };

  // Table columns
  const columns = [
    {
      key: 'employee_id',
      label: 'Employee',
      render: (row) => (
        <>
          <strong style={{ fontWeight: 600 }}>{row.employee_id}</strong>
          <div style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: '2px', fontWeight: 400 }}>
            {getEmployeeName(row.employee_id)}
          </div>
        </>
      ),
    },
    { key: 'code', label: 'Tournament Code', render: (row) => row.tournament?.code || '—' },
    { key: 'name', label: 'Tournament', render: (row) => row.tournament?.name || '—' },
    { key: 'game', label: 'Game', render: (row) => row.tournament?.game || '—' },
    { key: 'format', label: 'Format', render: (row) => row.tournament?.format || '—' },
    {
      key: 'status',
      label: 'Status',
      render: () => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 10px',
            borderRadius: '999px',
            background: 'rgba(249,168,37,0.12)',
            color: 'var(--warning)',
            fontWeight: 600,
            fontSize: '0.68rem',
          }}
        >
          Pending
        </span>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      render: (row) => (
        <button
          onClick={() => handleApprove(row)}
          disabled={approvingId === row.id}
          style={{
            border: 'none',
            borderRadius: '999px',
            padding: '8px 14px',
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: approvingId === row.id ? 'wait' : 'pointer',
            color: '#fff',
            background: approvingId === row.id ? 'var(--muted)' : 'var(--accent)',
          }}
        >
          {approvingId === row.id ? 'Approving...' : 'Approve'}
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'grid', gap: '18px', fontWeight: 400 }}>
      <div
        className="clay-card"
        style={{
          padding: '24px',
          borderRadius: '32px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
          color: 'var(--accent-contrast)',
        }}
      >
        <div style={{ fontSize: '0.78rem', opacity: 0.8, fontWeight: 400 }}>Admin</div>
      </div>

      <div className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'var(--bg-surface-strong)' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {ADMIN_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  border: 'none',
                  borderRadius: '999px',
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  fontSize: isMobile ? '0.72rem' : '0.8rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  color: active ? 'var(--accent-contrast)' : 'var(--accent)',
                  background: active ? 'var(--accent)' : 'var(--accent-soft)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'registration-approval' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-soft)', fontWeight: 400 }}>
              Pending requests: <strong style={{ fontWeight: 600 }}>{pendingRequests.length}</strong>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <MobileTable
                columns={columns}
                rows={pendingRequests}
                rowKey={(row) => row.id}
                emptyMessage="No registration requests are waiting for approval."
              />
            </div>
          </div>
        )}

        {activeTab === 'push-notifications' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ marginBottom: '8px', color: 'var(--text-strong)' }}>Push Notifications</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto 24px' }}>
              Send important updates, tournament alerts, and general announcements directly to employees' devices.
            </p>
            <button
              onClick={() => setGlobalActiveTab('create-notification')}
              className="clay-button"
              style={{
                padding: '12px 24px',
                borderRadius: '16px',
                background: 'var(--accent)',
                color: 'white',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Create New Notification
            </button>
          </div>
        )}

        {activeTab === 'previous-notifications' && (
          <div style={{ display: 'grid', gap: '12px' }}>
            {/* Tab Header when in history */}
            {selectionMode ? (
              <div className="clay-card" style={{ padding: '16px 20px', borderRadius: '20px', background: 'var(--bg-surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={exitSelectionMode} style={{ background: 'transparent', border: 'none', color: 'var(--text-soft)', cursor: 'pointer' }}><X size={20} /></button>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{selectedIds.length} Selected</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={handleSelectAll} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}><CheckSquare size={20} /></button>
                  <button onClick={handleDeleteSelected} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}><Trash2 size={20} /></button>
                </div>
              </div>
            ) : selectedNotif ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <button
                  onClick={() => setSelectedNotif(null)}
                  style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-surface)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <ArrowLeft size={18} />
                </button>
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>History Detail</span>
              </div>
            ) : null}

            {selectedNotif ? (
              /* Detail View for History */
              <div className="clay" style={{ padding: '24px', borderRadius: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-strong)' }}>{selectedNotif.title}</h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '4px' }}>
                      Sent on: {format(new Date(selectedNotif.created_at), 'PPPP, h:mm a')}
                    </div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}>
                    <MessageSquare size={20} />
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  borderRadius: '16px',
                  background: 'var(--bg-surface-strong)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  marginBottom: '20px'
                }}>
                  {selectedNotif.body}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.65rem', background: 'var(--accent-soft)', color: 'var(--accent-strong)', padding: '4px 10px', borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase' }}>
                    Type: {selectedNotif.target_type}
                  </span>
                  {selectedNotif.data?.selected_employee_ids?.length > 0 && (
                    <span style={{ fontSize: '0.65rem', background: 'var(--bg-surface-strong)', color: 'var(--text-soft)', padding: '4px 10px', borderRadius: '999px', fontWeight: 700 }}>
                      {selectedNotif.data.selected_employee_ids.length} Recipients
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    onClick={() => handleDeleteNotification(selectedNotif.id)}
                    style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}
                  >
                    <Trash2 size={16} /> Permanently Delete History
                  </button>
                </div>
              </div>
            ) : (
              /* List View for History */
              <div style={{ display: 'grid', gap: '10px' }}>
                {allNotifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No notification history found.
                  </div>
                ) : (
                  allNotifications.map((notif) => {
                    const isSelected = selectedIds.includes(notif.id);
                    return (
                      <div
                        key={notif.id}
                        className="clay"
                        onMouseDown={() => startTimer(notif)}
                        onMouseUp={stopTimer}
                        onMouseLeave={stopTimer}
                        onTouchStart={() => startTimer(notif)}
                        onTouchEnd={stopTimer}
                        onClick={() => handleSelectNotif(notif)}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '20px',
                          background: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface)',
                          border: '1px solid',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                      >
                        {selectionMode ? (
                          <div style={{ color: isSelected ? 'var(--accent)' : 'var(--muted)', flexShrink: 0 }}>
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                          </div>
                        ) : (
                          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--bg-surface-strong)', color: 'var(--text-soft)', flexShrink: 0 }}>
                            <MessageSquare size={18} />
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{
                              margin: 0,
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: isSelected ? 'var(--accent-strong)' : 'var(--text-strong)',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {notif.title}
                            </h4>
                            <span style={{ fontSize: '0.6rem', color: 'var(--muted)', flexShrink: 0 }}>
                              {format(new Date(notif.created_at), 'MMM d')}
                            </span>
                          </div>
                          <p style={{
                            margin: '2px 0 0',
                            fontSize: '0.75rem',
                            color: 'var(--text-soft)',
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}>
                            {notif.body}
                          </p>
                        </div>

                        {!selectionMode && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif.id); }}
                            style={{ background: 'transparent', border: 'none', color: 'var(--danger)', opacity: 0.4, padding: '4px', cursor: 'pointer' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
