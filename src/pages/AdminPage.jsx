import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';

const lufgaFontStyle = `
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-SemiBold.otf') format('opentype');
    font-weight: 600;
    font-style: normal;
    font-display: swap;
  }
`;

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
  const [activeTab, setActiveTab] = useState('registration-approval');
  const [approvingId, setApprovingId] = useState(null);

  const pendingRequests = useMemo(() => {
    return tournamentRegistrationRequests
      .filter((row) => String(row.status || '').toLowerCase() === 'pending')
      .map((row) => {
        const tournament = tournaments.find((t) => t.id === row.tournament_id);
        return {
          ...row,
          tournament,
        };
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

  useEffect(() => {
    const styleId = 'lufga-font-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = lufgaFontStyle;
      document.head.appendChild(styleEl);
    }
  }, []);

  return (
    <div style={{ display: 'grid', gap: '18px', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
      <div
        className="clay-card"
        style={{
          padding: '24px',
          borderRadius: '32px',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
          color: 'var(--accent-contrast)',
        }}
      >
        <div style={{ fontSize: '0.78rem', opacity: 0.8, fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>Admin</div>
        {/* <h1 style={{ margin: '6px 0 0 0', fontSize: '1.8rem', fontWeight: 800 }}>Registration Approval</h1>
        <div style={{ marginTop: '8px', fontSize: '0.85rem', opacity: 0.9 }}>
          Review pending tournament requests and approve them when space is available.
        </div> */}
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
                  padding: '10px 16px',
                  fontSize: '0.8rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                  color: active ? 'var(--accent-contrast)' : 'var(--accent)',
                  background: active ? 'var(--accent)' : 'var(--accent-soft)',
                  fontFamily: "'Lufga', sans-serif",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'registration-approval' && (
          <div>
            <div style={{ marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-soft)', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Pending requests: <strong style={{ fontWeight: 600 }}>{pendingRequests.length}</strong>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: "'Lufga', sans-serif" }}>
                <thead>
                <tr style={{ background: 'var(--accent-soft)' }}>
                    {['Emp ID', 'Tournament Code', 'Tournament Name', 'Game', 'Format', 'Status', 'Action'].map((head) => (
                      <th
                        key={head}
                        style={{
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontWeight: 600,
                          color: 'var(--text-soft)',
                          borderBottom: '1px solid rgba(200,210,230,0.3)',
                          fontFamily: "'Lufga', sans-serif",
                        }}
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '18px 12px', textAlign: 'center', color: 'var(--muted)' }}>
                        No registration requests are waiting for approval.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.22)' }}>
                        <td style={{ padding: '12px', fontFamily: "'Lufga', sans-serif" }}>
                          <strong style={{ fontWeight: 600 }}>{row.employee_id}</strong>
                          <div style={{ fontSize: '0.66rem', color: 'var(--muted)', marginTop: '2px', fontWeight: 400 }}>
                            {getEmployeeName(row.employee_id)}
                          </div>
                        </td>
                        <td style={{ padding: '12px' }}>{row.tournament?.code || '—'}</td>
                        <td style={{ padding: '12px' }}>{row.tournament?.name || '—'}</td>
                        <td style={{ padding: '12px' }}>{row.tournament?.game || '—'}</td>
                        <td style={{ padding: '12px' }}>{row.tournament?.format || '—'}</td>
                        <td style={{ padding: '12px' }}>
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
                              fontFamily: "'Lufga', sans-serif",
                            }}
                          >
                            Pending
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
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
                              fontFamily: "'Lufga', sans-serif",
                            }}
                          >
                            {approvingId === row.id ? 'Approving...' : 'Approve'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;