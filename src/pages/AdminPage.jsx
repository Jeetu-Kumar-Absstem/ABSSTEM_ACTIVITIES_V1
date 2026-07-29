// src/pages/AdminPage.jsx
import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';

const ADMIN_TABS = [
  { id: 'registration-approval', label: 'Registration Approval' },
];

const AdminPage = () => {
  const {
    tournaments,
    tournamentRegistrationRequests,
    approveTournamentRegistration,
    getEmployeeName,
  } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();
  const [activeTab, setActiveTab] = useState('registration-approval');
  const [approvingId, setApprovingId] = useState(null);

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
      </div>
    </div>
  );
};

export default AdminPage;
