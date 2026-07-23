// src/pages/LeaderboardPage.jsx
// Activity Planner ▸ Events ▸ Leaderboard
// Full leaderboard of all players (no top-4 limit), with podium, filters and
// a search box. Built to replace the dashboard's "Top 4 Board" so users can
// see everyone's rank and the breakdown behind their points.
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const RANK_STYLES = {
  1: { bg: 'linear-gradient(180deg, #fff8e1, #ffecb3)', border: '#f9a825', icon: '🥇', label: 'Champion' },
  2: { bg: 'linear-gradient(180deg, #fafafa, #eceff1)', border: '#b0bec5', icon: '🥈', label: 'Runner-Up' },
  3: { bg: 'linear-gradient(180deg, #fff3e0, #ffe0b2)', border: '#d84315', icon: '🥉', label: '3rd Place' },
};

const LeaderboardPage = () => {
  const {
    leaderboard,
    employees,
    loadLeaderboard,
    currentUser,
  } = useApp();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rank'); // rank | points | wins | participations | recent
  const [hoveredMetric, setHoveredMetric] = useState(null);

  // Inject Lufga font into document head
  useEffect(() => {
    const styleId = 'lufga-font-style';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = lufgaFontStyle;
      document.head.appendChild(styleEl);
    }
  }, []);

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
    <div style={{ fontFamily: "'Lufga', sans-serif", fontWeight: 400, fontSize: 13, color: '#212121' }}>
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
          <div style={{ fontSize: '0.72rem', opacity: 0.78, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Activity Leaderboard
          </div>
          <h1 style={{ margin: '6px 0 4px', fontSize: '1.6rem', lineHeight: 1.05, fontFamily: "'Lufga', sans-serif", fontWeight: 600 }}>
            🏆 Champions of the Floor
          </h1>
          <div style={{ fontSize: '0.8rem', opacity: 0.88, fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Points: Win = 5 · Tournament Win = 20 · Runner-up = 15 · 3rd = 10  · Violation = −5 · No-show = −3
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {myRow && (
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 14px', fontSize: '0.78rem' }}>
              <div style={{ opacity: 0.7, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>You</div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', fontFamily: "'Lufga', sans-serif" }}>#{myRow.rank} · {myRow.total_points} pts</div>
            </div>
          )}
          <button onClick={exportCsv} style={styles.outlineBtn}>📤 Export CSV</button>
          <button onClick={() => loadLeaderboard()} style={styles.outlineBtn}>↻ Refresh</button>
        </div>
      </div>

      {/* Podium */}
      {(podium[1] || podium[2] || podium[3]) && (
        <div className="clay-card" style={{ ...styles.card, marginBottom: 14 }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>🏅 Top 3 Podium</div>
            <div style={{ fontSize: '0.7rem', color: '#080808' }}>Overall, all games combined</div>
          </div>
          <div style={styles.podium}>
            {podium[2] && (
              <PodiumCard row={podium[2]} pos={2} />
            )}
            {podium[1] && (
              <PodiumCard row={podium[1]} pos={1} tall />
            )}
            {podium[3] && (
              <PodiumCard row={podium[3]} pos={3} />
            )}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={styles.statsRow}>
        {[
          { label: 'Players ranked',       value: stats.total,                        accent: '#1a3c6e', sub: stats.top ? `Top: ${stats.top.employee_name || stats.top.employee_id}` : 'No data yet' },
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
      <div className="clay-card" style={{ ...styles.card, marginBottom: 14,background:'#f4f7bf' }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>📋 Full Leaderboard</div>
          <span style={{ fontSize: '0.7rem', color: '#888' }}>{filteredRows.length} of {(leaderboard || []).length} player(s)</span>
        </div>
        <div style={styles.filterBar}>
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

        <div style={{ overflowX: 'auto', marginTop: 8 }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Rank','Player','Department','Pts','🏆🥈🥉','Match W/L/D','Part.','Violations','Last Active'].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1.4rem' }}>
                    No players match your filters yet. As matches and tournaments wrap up, leaderboard points will appear here.
                  </td>
                </tr>
              ) : filteredRows.map((r) => {
                const isMe = (r.employee_id || '').toUpperCase() === currentEmpId;
                const rankBadge = r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`;
                return (
                  <tr
                    key={r.employee_id}
                    style={{
                      borderBottom: '1px solid #eee',
                      background: isMe ? '#fff8e1' : 'transparent',
                    }}
                  >
                    <td style={{ ...styles.td, fontWeight: 600, color: r.rank <= 3 ? '#1a3c6e' : '#444', fontFamily: "'Lufga', sans-serif" }}>
                      {rankBadge}
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontWeight: 600, fontFamily: "'Lufga', sans-serif" }}>{r.employee_name || r.employee_id}</div>
                      <div style={{ fontSize: '0.62rem', color: '#888', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{r.employee_id}{isMe ? ' · You' : ''}</div>
                    </td>
                    <td style={styles.td}>{r.department || '—'}</td>
                    <td style={{ ...styles.td, fontWeight: 600, color: '#1a3c6e', fontFamily: "'Lufga', sans-serif" }}>{r.total_points}</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: 4, fontSize: '0.7rem' }}>
                        <span title="Tournament wins">🥇 {r.tournament_wins || 0}</span>
                        <span title="Tournament runner-up">🥈 {r.tournament_seconds || 0}</span>
                        <span title="Tournament 3rd place">🥉 {r.tournament_thirds || 0}</span>
                      </div>
                    </td>
                    <td style={{ ...styles.td, fontSize: '0.7rem' }}>
                      {r.match_wins || 0} / {r.match_losses || 0} / {r.draws || 0}
                    </td>
                    <td style={styles.td}>{r.participations || 0}</td>
                    <td style={styles.td}>
                      {r.rule_violations > 0 || r.no_shows > 0 ? (
                        <span style={{ ...styles.tinyChip, background: '#ffebee', color: '#c62828' }}>
                          {`V:${r.rule_violations || 0} · NS:${r.no_shows || 0}`}
                        </span>
                      ) : (
                        <span style={{ color: '#888' }}>—</span>
                      )}
                    </td>
                    <td style={styles.td}>{formatDate(r.last_activity_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PodiumCard = ({ row, pos, tall }) => {
  const [hovered, setHovered] = useState(false);
  const style = RANK_STYLES[pos] || RANK_STYLES[1];
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: style.bg,
        borderTop: `3px solid ${style.border}`,
        borderRight: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderBottom: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? style.border : 'transparent'}`,
        borderRadius: 12,
        padding: tall ? '1.4rem 0.8rem 1rem' : '0.9rem 0.6rem 0.7rem',
        textAlign: 'center',
        minHeight: tall ? 200 : 160,
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? `0 8px 20px ${style.border}55` : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
      }}>
      <div style={{ fontSize: tall ? '2rem' : '1.4rem' }}>{style.icon}</div>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
        {style.label}
      </div>
      <div style={{ fontWeight: 600, fontSize: tall ? '1.05rem' : '0.95rem', color: '#1e1e2f', marginBottom: 6, fontFamily: "'Lufga', sans-serif" }}>
        {row.employee_name || row.employee_id}
      </div>
      <div style={{ fontSize: '0.6rem', color: '#666', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{row.department || '—'}</div>
      <div style={{ fontWeight: 600, color: '#1a3c6e', fontSize: tall ? '1.6rem' : '1.3rem', marginTop: 4, fontFamily: "'Lufga', sans-serif" }}>
        {row.total_points}
      </div>
      <div style={{ fontSize: '0.6rem', color: '#888', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>points</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 4, fontSize: '0.6rem', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
        <span>🥇{row.tournament_wins || 0}</span>
        <span>W{row.match_wins || 0}</span>
        <span>P{row.participations || 0}</span>
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
      background: 'white',
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
    <div style={{ fontSize: '0.6rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{label}</div>
    <div style={{ fontSize: '1.5rem', fontWeight: 600, color: accent, lineHeight: 1.1, marginTop: 4, fontFamily: "'Lufga', sans-serif" }}>{value}</div>
    <div style={{ fontSize: '0.6rem', color: '#888', marginTop: 4, fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{sub}</div>
  </div>
);

const styles = {
  card: { background: 'white', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(200,210,230,0.5)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' },
  cardHeaderTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#1e1e2f', fontFamily: "'Lufga', sans-serif" },
  outlineBtn: { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 400, cursor: 'pointer', fontFamily: "'Lufga', sans-serif" },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: 14 },
  podium: { display: 'grid', gridTemplateColumns: '1fr 1.15fr 1fr', gap: '0.8rem', alignItems: 'end', padding: '0.4rem 0 0' },
  filterBar: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  filterInput: { padding: '0.32rem 0.6rem', border: '1px solid #d0d0d0', borderRadius: 4, fontSize: '0.75rem', fontFamily: "'Lufga', sans-serif", fontWeight: 400, color: '#212121', background: 'white', minWidth: 130, flex: 1 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', fontFamily: "'Lufga', sans-serif" },
  theadRow: { background: 'rgba(26,60,110,0.05)' },
  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 600, color: '#444', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: '0.04em', fontFamily: "'Lufga', sans-serif" },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'middle', fontFamily: "'Lufga', sans-serif", fontWeight: 400 },
  tinyChip: { padding: '0.12rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 400, display: 'inline-block', fontFamily: "'Lufga', sans-serif" },
};

export default LeaderboardPage;