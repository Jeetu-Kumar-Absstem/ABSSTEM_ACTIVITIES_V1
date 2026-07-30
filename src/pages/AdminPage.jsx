// src/pages/AdminPage.jsx
import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';

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
  } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState('registration-approval');
  const [approvingId, setApprovingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (activeTab === 'previous-notifications') {
      loadAllNotifications();
    }
  }, [activeTab]);

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification history? This will remove it for everyone.')) return;
    setDeletingId(id);
    try {
      const res = await deleteNotification(id);
      if (res.success) {
        showToast('Notification deleted', 'success');
      } else {
        showToast(res.error, 'error');
      }
    } finally {
      setDeletingId(null);
    }
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
            {allNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                No notification history found.
              </div>
            ) : (
              allNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className="clay"
                  style={{
                    padding: '16px',
                    borderRadius: '20px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-strong)' }}>{notif.title}</h4>
                      <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '2px' }}>
                        Sent on: {new Date(notif.created_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNotification(notif.id)}
                      disabled={deletingId === notif.id}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        color: 'var(--danger)',
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {deletingId === notif.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-soft)', lineHeight: 1.4 }}>
                    {notif.body}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '0.6rem',
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-strong)',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      Target: {notif.target_type}
                    </span>
                    {notif.data?.selected_employee_ids?.length > 0 && (
                      <span style={{
                        fontSize: '0.6rem',
                        background: 'var(--bg-surface-strong)',
                        color: 'var(--text-soft)',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontWeight: 600
                      }}>
                        {notif.data.selected_employee_ids.length} Recipients
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
