// src/pages/LeaderboardPage.jsx
// Activity Planner ▸ Events ▸ Leaderboard
// Full leaderboard of all players (no top-4 limit), with podium, filters and
// a search box. Built to replace the dashboard's "Top 4 Board" so users can
// see everyone's rank and the breakdown behind their points.
import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';
import useViewport from '../hooks/useViewport';
import usePressState from '../hooks/usePressState';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const RANK_STYLES = {
  1: { bg: 'linear-gradient(180deg, rgba(249,168,37,0.18), rgba(249,168,37,0.08))', border: '#f9a825', icon: '🥇', label: 'Champion' },
  2: { bg: 'linear-gradient(180deg, var(--bg-muted), var(--bg-soft))', border: '#b0bec5', icon: '🥈', label: 'Runner-Up' },
  3: { bg: 'linear-gradient(180deg, rgba(216,67,21,0.12), rgba(216,67,21,0.06))', border: '#d84315', icon: '🥉', label: '3rd Place' },
};

const LeaderboardPage = () => {
  const {
    leaderboard,
    employees,
    loadLeaderboard,
    currentUser,
  } = useApp();
  const { showToast } = useToast();
  const { isMobile } = useViewport();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank'); // rank | points | wins | participations | recent
  const [hoveredMetric, setHoveredMetric] = useState(null);

  // Initial load happens in AppProvider; this page just reads `leaderboard` from
  // context. The Refresh button below calls loadLeaderboard() to re-fetch on demand.

  // Derive department list from the actual data.
  const departments = useMemo(() => {
    const set = new Set(
      (leaderboard || [])
        .map((r) => r.department)
        .filter(Boolean)
    );
    employees.forEach((e) => e.department && set.add(e.department));
    return Array.from(set).sort();
  }, [leaderboard, employees]);

  // Filter & sort.
  // The view only returns 'all' rows (one per employee) so no game filter needed.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = (leaderboard || []).filter((r) => {
      if (deptFilter !== 'all' && r.department !== deptFilter) return false;
      if (!q) return true;
      return (
        (r.employee_name || '').toLowerCase().includes(q) ||
        (r.employee_id || '').toLowerCase().includes(q) ||
        (r.department || '').toLowerCase().includes(q)
      );
    });
    rows = rows.slice().sort((a, b) => {
      if (sortBy === 'points') {
        return (b.total_points || 0) - (a.total_points || 0);
      }
      if (sortBy === 'wins') {
        const aw = (a.tournament_wins || 0) + (a.match_wins || 0);
        const bw = (b.tournament_wins || 0) + (b.match_wins || 0);
        if (bw !== aw) return bw - aw;
        return (b.total_points || 0) - (a.total_points || 0);
      }
      if (sortBy === 'participations') {
        return (b.participations || 0) - (a.participations || 0);
      }
      if (sortBy === 'recent') {
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      }
      // rank: keep the SQL-defined order
      return (a.rank || 0) - (b.rank || 0);
    });
    return rows;
  }, [leaderboard, search, deptFilter, sortBy]);

  // Stats for the top summary row.
  const stats = useMemo(() => {
    const rows = filteredRows;
    const total = rows.length;
    const top = rows[0] || null;
    const mostWins = rows.reduce((best, r) => {
      const wins = (r.tournament_wins || 0) + (r.match_wins || 0);
      return wins > (best.wins || 0) ? { ...r, wins } : best;
    }, { wins: 0 });
    const mostActive = rows.reduce((best, r) => {
      const parts = r.participations || 0;
      return parts > (best.participations || 0) ? r : best;
    }, { participations: 0 });
    const totalPoints = rows.reduce((s, r) => s + (r.total_points || 0), 0);
    return { total, top, mostWins, mostActive, totalPoints };
  }, [filteredRows]);

  // Top 3 podium (always uses the unfiltered rank-based view for the spotlight).
  const podium = useMemo(() => {
    const top3 = (leaderboard || []).slice(0, 3);
    const byPos = { 1: null, 2: null, 3: null };
    top3.forEach((r) => { byPos[r.rank] = r; });
    return byPos;
  }, [leaderboard]);

  const currentEmpId = (
    currentUser?.user_metadata?.emp_id ||
    currentUser?.user_metadata?.employee_code ||
    ''
  ).toUpperCase();
  const myRow = useMemo(
    () => (leaderboard || []).find((r) => (r.employee_id || '').toUpperCase() === currentEmpId) || null,
    [leaderboard, currentEmpId]
  );

  const exportCsv = useCallback(() => {
    if (filteredRows.length === 0) {
      showToast('Nothing to export', 'error');
      return;
    }
    const headers = [
      'Rank', 'Employee ID', 'Name', 'Department',
      'Total Points', 'Tournament Wins', 'Tournament 2nd', 'Tournament 3rd',
      'Match Wins', 'Match Losses', 'Draws', 'Participations',
      'Rule Violations', 'No Shows', 'Last Activity',
    ];
    const lines = [headers.join(',')];
    filteredRows.forEach((r) => {
      lines.push([
        r.rank, r.employee_id, JSON.stringify(r.employee_name || ''), r.department || '',
        r.total_points, r.tournament_wins, r.tournament_seconds, r.tournament_thirds,
        r.match_wins, r.match_losses, r.draws, r.participations,
        r.rule_violations, r.no_shows, r.last_activity_at || '',
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredRows, showToast]);

  return (
    <div style={{ fontWeight: 400, fontSize: 13, color: 'var(--text)' }}>
      <EventsTopBar active="leaderboard" />

      {/* Header strip */}
      <div className="clay-card" style={{
        background: 'linear-gradient(135deg, #1a3c6e 0%, #11255a 100%)',
        color: 'white', borderRadius: 24, padding: '20px 24px',
        marginBottom: 14, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
        boxShadow: '0 10px 28px rgba(26,60,110,0.22)',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', opacity: 0.78, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 400 }}>
            Activity Leaderboard
          </div>
          <h1 style={{ margin: '6px 0 4px', fontSize: '1.6rem', lineHeight: 1.05, fontWeight: 600 }}>
            🏆 Champions of the Floor
          </h1>
          <div style={{ fontSize: '0.8rem', opacity: 0.88, fontWeight: 400 }}>
            Points: Win = 5 · Tournament Win = 20 · Runner-up = 15 · 3rd = 10  · Violation = −5 · No-show = −3
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {myRow && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem' }}>
              <div style={{ opacity: 0.7, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 400 }}>You</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>#{myRow.rank} · {myRow.total_points} pts</div>
            </div>
          )}
          <button onClick={exportCsv} style={styles.outlineBtn}>📤 Export CSV</button>
          <button onClick={() => loadLeaderboard()} style={styles.outlineBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* Podium */}
      {(podium[1] || podium[2] || podium[3]) && (
        <div className="clay-card" style={{ ...styles.card, marginBottom: 14, paddingBottom: '1.4rem', overflow: 'visible' }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>🏅 Top 3 Podium</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text)' }}>Overall, all games combined</div>
          </div>
          <div style={{ ...styles.podium }}>
            {podium[2] && <div style={{ flex: 1, marginTop: PODIUM_SIZE[2].marginTop }}><PodiumCard row={podium[2]} pos={2} /></div>}
            {podium[1] && <div style={{ flex: '1.15', marginTop: PODIUM_SIZE[1].marginTop }}><PodiumCard row={podium[1]} pos={1} /></div>}
            {podium[3] && <div style={{ flex: 1, marginTop: PODIUM_SIZE[3].marginTop }}><PodiumCard row={podium[3]} pos={3} /></div>}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Players ranked',       value: stats.total,                        accent: 'var(--accent)', sub: stats.top ? `Top: ${stats.top.employee_name || stats.top.employee_id}` : 'No data yet' },
          { label: 'Highest score',        value: stats.top ? stats.top.total_points : 0, accent: '#f9a825', sub: stats.top ? `${stats.top.employee_name || stats.top.employee_id}` : '—' },
          { label: 'Most wins',            value: stats.mostWins.wins || 0,           accent: '#1b5e20', sub: stats.mostWins.employee_name || '—' },
          { label: 'Most active',          value: stats.mostActive.participations || 0, accent: '#6a1b9a', sub: stats.mostActive.employee_name || '—' },
          { label: 'Total points awarded', value: stats.totalPoints,                  accent: '#00897b', sub: 'Filtered scope' },
        ].map((m, i) => (
          <MetricCard
            key={i}
            {...m}
            hovered={hoveredMetric === i}
            onMouseEnter={() => setHoveredMetric(i)}
            onMouseLeave={() => setHoveredMetric(null)}
          />
        ))}
      </div>

      {/* Filter bar */}
      <div className="clay-card" style={{ ...styles.card, marginBottom: 14 }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>📋 Full Leaderboard</div>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{filteredRows.length} of {(leaderboard || []).length} player(s)</span>
        </div>
        <div style={{ ...styles.filterBar, flexDirection: 'row', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍  Search by name, employee ID, or department…"
            style={{ ...styles.filterInput, flex: 2 }}
          />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={styles.filterInput}>
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.filterInput}>
            <option value="rank">Sort: Rank</option>
            <option value="points">Sort: Total Points</option>
            <option value="wins">Sort: Total Wins</option>
            <option value="participations">Sort: Participations</option>
            <option value="recent">Sort: Recent Activity</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 8, WebkitOverflowScrolling: 'touch' }}>
          {filteredRows.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)' }}>
              No players match your filters yet. As matches and tournaments wrap up, leaderboard points will appear here.
            </div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  <th style={styles.th}>Rank</th>
                  <th style={styles.th}>Player</th>
                  <th style={styles.th}>Dept</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Pts</th>
                  <th style={styles.th}>Tournament</th>
                  <th style={styles.th}>Match W/L/D</th>
                  <th style={{ ...styles.th, textAlign: 'center' }}>Part.</th>
                  <th style={styles.th}>Violations</th>
                  <th style={styles.th}>Last Active</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => {
                  const isMe = (r.employee_id || '').toUpperCase() === currentEmpId;
                  const rankBadge = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
                  return (
                    <tr
                      key={r.employee_id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: isMe ? 'rgba(var(--accent-rgb, 66,133,244), 0.06)' : 'transparent',
                      }}
                    >
                      <td style={styles.td}>
                        <span style={{ fontWeight: 600, color: r.rank <= 3 ? 'var(--accent)' : 'var(--text-soft)' }}>
                          {rankBadge}
                        </span>
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{r.employee_name || r.employee_id}</div>
                        <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 400 }}>
                          {r.employee_id}{isMe ? ' · You' : ''}
                        </div>
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap' }}>{r.department || '—'}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <strong style={{ color: 'var(--accent)' }}>{r.total_points}</strong>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 6, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          <span title="Tournament wins">🥇{r.tournament_wins || 0}</span>
                          <span title="Runner-up">🥈{r.tournament_seconds || 0}</span>
                          <span title="3rd place">🥉{r.tournament_thirds || 0}</span>
                        </div>
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: '0.7rem' }}>
                        {r.match_wins || 0} / {r.match_losses || 0} / {r.draws || 0}
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>{r.participations || 0}</td>
                      <td style={styles.td}>
                        {r.rule_violations > 0 || r.no_shows > 0 ? (
                          <span style={{ ...styles.tinyChip, background: 'rgba(229,57,53,0.10)', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                            V:{r.rule_violations || 0} · NS:{r.no_shows || 0}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--muted)' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...styles.td, whiteSpace: 'nowrap', fontSize: '0.7rem', color: 'var(--text-soft)' }}>
                        {formatDate(r.last_activity_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// marginTop on wrapper creates the staircase — 1st starts highest (least marginTop), 3rd pushed down most
const PODIUM_SIZE = {
  1: { marginTop: 0,   iconSize: '2.2rem', nameSize: '1.1rem', ptsSize: '1.7rem' },
  2: { marginTop: 40,  iconSize: '1.7rem', nameSize: '1rem',   ptsSize: '1.4rem' },
  3: { marginTop: 70,  iconSize: '1.4rem', nameSize: '0.95rem', ptsSize: '1.2rem' },
};

const PodiumCard = ({ row, pos }) => {
  const { pressed, pressProps } = usePressState();
  const hovered = pressed;
  const style = RANK_STYLES[pos] || RANK_STYLES[1];
  const size = PODIUM_SIZE[pos] || PODIUM_SIZE[3];
  return (
    <div
      {...pressProps}
      className={`leaderboard-podium-rank${pos}`}
      style={{
        background: style.bg,
        borderTop: `3px solid ${style.border}`,
        borderRight: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderBottom: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderRadius: 12,
        padding: '0.8rem 0.6rem 0.8rem',
        textAlign: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
        transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? `0 8px 20px ${style.border}55` : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        width: '100%',
      }}>
      <div style={{ fontSize: size.iconSize }}>{style.icon}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontWeight: 400 }}>
        {style.label}
      </div>
      <div style={{ fontWeight: 600, fontSize: size.nameSize, color: 'var(--text-strong)', marginBottom: 6 }}>
        {row.employee_name || row.employee_id}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'var(--text-soft)', fontWeight: 400 }}>{row.department || '—'}</div>
      <div style={{ fontWeight: 600, color: 'var(--accent)', fontSize: size.ptsSize, marginTop: 4 }}>
        {row.total_points}
      </div>
      <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400 }}>points</div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4, fontSize: '0.6rem', fontWeight: 400 }}>
        <span title="Tournament wins">🥇{row.tournament_wins || 0}</span>
        <span title="Runner-up">🥈{row.tournament_seconds || 0}</span>
        <span title="3rd place">🥉{row.tournament_thirds || 0}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: '0.6rem', fontWeight: 400, color: 'var(--muted)' }}>
        <span title="Match wins">W{row.match_wins || 0}</span>
        <span>L{row.match_losses || 0}</span>
        <span>D{row.draws || 0}</span>
        <span title="Participations">P{row.participations || 0}</span>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, sub, accent, hovered, onMouseEnter, onMouseLeave }) => (
  <div
    className="clay-card"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    style={{
      background: 'var(--bg-surface)',
      borderRadius: 14,
      padding: '12px 16px',
      borderTop: `3px solid ${accent}`,
      borderRight: `2px solid ${hovered ? accent : 'transparent'}`,
      borderBottom: `2px solid ${hovered ? accent : 'transparent'}`,
      borderLeft: `2px solid ${hovered ? accent : 'transparent'}`,
      transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
      boxShadow: hovered ? `0 8px 20px ${accent}33` : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      cursor: 'default',
    }}
  >
    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 400 }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: accent, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 4, fontWeight: 400 }}>{sub}</div>
  </div>
);

const styles = {
  card: { background: 'var(--bg-surface-strong)', borderRadius: 16, padding: '1rem', boxShadow: 'var(--surface-shadow-soft)', border: '1px solid var(--border)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' },
  cardHeaderTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-strong)' },
  outlineBtn: { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 400, cursor: 'pointer' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: 14 },
  podium: { display: 'flex', gap: '0.8rem', alignItems: 'flex-start', padding: '0.4rem 0 0.4rem' },
  filterBar: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  filterInput: { padding: '0.32rem 0.6rem', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.75rem', fontWeight: 400, color: 'var(--text)', background: 'var(--bg-surface)', minWidth: 130, flex: 1 },
  table: { width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: '0.72rem' },
  theadRow: { background: 'var(--accent-soft)' },
  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 600, color: 'var(--text-soft)', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.04em' },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'middle', fontWeight: 400 },
  tinyChip: { padding: '0.12rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 400, display: 'inline-block' },
};

export default LeaderboardPage;