// src/pages/ReportsPage.jsx
import React from 'react';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';

const bookingRows = [
  { date: '28-Apr-26', employee: 'Pradeep Sati', game: '🎯 Carrom', slot: 'Slot 8', status: 'Played' },
  { date: '28-Apr-26', employee: 'Priya Mehta', game: '♟ Chess', slot: 'Slot 9', status: 'Played' },
];

const participationRows = [
  { employee: 'Pradeep Sati', bookings: 12, played: 12, noShow: 0, violations: 0, status: 'Good' },
  { employee: 'Anil Rawat', bookings: 7, played: 5, noShow: 2, violations: 2, status: 'Warning' },
  { employee: 'Rohan Sharma', bookings: 0, played: 0, noShow: 0, violations: 3, status: 'Banned' },
];

const statusBadge = (status) => {
  if (status === 'Played' || status === 'Good') return <span className="clay-badge clay-badge-green">{status}</span>;
  if (status === 'Warning') return <span className="clay-badge clay-badge-amber">{status}</span>;
  if (status === 'Banned') return <span className="clay-badge clay-badge-red">{status}</span>;
  return <span className="clay-badge clay-badge-grey">{status}</span>;
};

const ReportsPage = () => {
  const { isMobile } = useViewport();

  const bookingColumns = [
    { key: 'date', label: 'Date' },
    { key: 'employee', label: 'Employee' },
    { key: 'game', label: 'Game' },
    { key: 'slot', label: 'Slot' },
    { key: 'status', label: 'Status', render: (row) => statusBadge(row.status) },
  ];

  const participationColumns = [
    { key: 'employee', label: 'Employee' },
    { key: 'bookings', label: 'Bookings', align: 'center' },
    { key: 'played', label: 'Played', align: 'center' },
    { key: 'noShow', label: 'No-Show', align: 'center' },
    { key: 'violations', label: 'Violations', align: 'center' },
    { key: 'status', label: 'Status', render: (row) => statusBadge(row.status) },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Booking Report</h3>
        <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row', flexWrap: 'wrap', marginBottom: '12px' }}>
          <label style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', width: isMobile ? '100%' : 'auto' }}>
            From: <input className="clay-input" type="date" defaultValue="2026-04-01" style={{ padding: '4px 10px', fontSize: '0.65rem', flex: 1 }} />
          </label>
          <label style={{ fontSize: '0.65rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', width: isMobile ? '100%' : 'auto' }}>
            To: <input className="clay-input" type="date" defaultValue="2026-04-30" style={{ padding: '4px 10px', fontSize: '0.65rem', flex: 1 }} />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="clay-btn clay-btn-teal" style={{ fontSize: '0.65rem' }}>🔍 Search</button>
            <button className="clay-btn" style={{ fontSize: '0.65rem' }}>⬇ Export</button>
          </div>
        </div>

        <div className="clay-soft" style={{ padding: '4px 12px', borderRadius: '20px', display: 'inline-block', fontSize: '0.65rem', marginBottom: '10px' }}>
          Total Record(s) Found: 86
        </div>

        <div style={{ overflowX: 'auto' }}>
          <MobileTable
            columns={bookingColumns}
            rows={bookingRows}
            rowKey={(row, i) => `${row.employee}-${row.date}-${i}`}
            emptyMessage="No bookings in this range."
          />
        </div>
      </div>

      <div className="clay-card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: '12px' }}>Participation Summary — April 2026</h3>
        <div style={{ overflowX: 'auto' }}>
          <MobileTable
            columns={participationColumns}
            rows={participationRows}
            rowKey={(row) => row.employee}
            emptyMessage="No participation data yet."
          />
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
