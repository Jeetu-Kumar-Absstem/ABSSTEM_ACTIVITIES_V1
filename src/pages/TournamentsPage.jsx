// src/pages/TournamentsPage.jsx
// Activity Planner ▸ Events ▸ Tournaments
// Sub-tabs: Active Tournaments | Bracket/Fixtures | Match Results | Stopwatch | Final Results
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';

const SUB_TABS = [
  { id: 'active',     label: 'Active Tournaments', icon: '🏆' },
  { id: 'bracket',    label: 'Bracket / Fixtures', icon: '📊' },
  { id: 'results',    label: 'Match Results',      icon: '⚽' },
  { id: 'stopwatch',  label: 'Stopwatch',          icon: '⏱' },
  { id: 'final',      label: 'Final Results',      icon: '🏅' },
];

const STATUS_BADGE = {
  draft:              { label: 'Draft',              bg: '#eceff1', color: '#455a64' },
  registration_open:  { label: 'Registration Open',  bg: '#fff3e0', color: '#e65100' },
  live:               { label: 'Live',               bg: '#e8f5e9', color: '#2e7d32' },
  completed:          { label: 'Completed',          bg: '#e3f2fd', color: '#1565c0' },
  cancelled:          { label: 'Cancelled',          bg: '#ffebee', color: '#c62828' },
};

const FORMAT_BADGE = {
  knockout:    { label: 'Knockout',    bg: '#fce4ec', color: '#880e4f' },
  round_robin: { label: 'Round Robin', bg: '#e0f7fa', color: '#006064' },
  league:      { label: 'League',      bg: '#f3e5f5', color: '#6a1b9a' },
  swiss:       { label: 'Swiss',       bg: '#fff8e1', color: '#ff6f00' },
};

const pad2 = (n) => String(n).padStart(2, '0');
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

const TournamentsPage = () => {
  const {
    tournaments,
    tournamentParticipants,
    tournamentMatches,
    finalResults,
    employees,
    currentUser,
    isAdmin,
    addTournament,
    registerForTournament,
    addTournamentMatch,
    recordMatchResult,
    declareFinalResults,
    getMatchesByTournament,
    getParticipantsByTournament,
    getResultsByTournament,
    getEmployeeName,
    loadTournaments,
    loadTournamentParticipants,
    loadTournamentMatches,
    loadFinalResults,
  } = useApp();
  const { showToast } = useToast();

  const [sub, setSub] = useState('active');
  const [activeTournament, setActiveTournament] = useState(null);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [tForm, setTForm] = useState({
    name: '', game: 'Carrom', format: 'knockout',
    start_date: '', end_date: '', max_participants: 8,
    prize_pool: '', description: '',
  });
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [mForm, setMForm] = useState({
    match_code: '', round: 'QF', match_number: 1,
    player_a: '', player_b: '', scheduled_at: '',
  });
  const [resultMatchId, setResultMatchId] = useState(null);
  const [rForm, setRForm] = useState({ score_a: '', score_b: '', winner: '', duration: '' });
  const [finalForm, setFinalForm] = useState([]);

  useEffect(() => {
    loadTournaments();
    loadTournamentParticipants();
    loadTournamentMatches();
    loadFinalResults();
  }, [loadTournaments, loadTournamentParticipants, loadTournamentMatches, loadFinalResults]);

  // Default the active tournament to the first one if none selected.
  useEffect(() => {
    if (!activeTournament && tournaments.length > 0) {
      setActiveTournament(tournaments[0].id);
    }
  }, [tournaments, activeTournament]);

  const activeTournamentRecord = useMemo(
    () => tournaments.find(t => t.id === activeTournament) || null,
    [tournaments, activeTournament]
  );
  const partsList = useMemo(
    () => activeTournament ? getParticipantsByTournament(activeTournament) : [],
    [activeTournament, tournamentParticipants, getParticipantsByTournament]
  );
  const matchesForActive = useMemo(
    () => activeTournament ? getMatchesByTournament(activeTournament) : [],
    [activeTournament, tournamentMatches, getMatchesByTournament]
  );
  const resultsForActive = useMemo(
    () => activeTournament ? getResultsByTournament(activeTournament) : [],
    [activeTournament, finalResults, getResultsByTournament]
  );

  const currentEmpId = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || '';
  const isRegisteredForActive = partsList.some(p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase());

  // ── Sub-tab renderers ─────────────────────────────────────────────────
  const renderActiveTournaments = () => {
    return (
      <div className="clay-card" style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Active & Upcoming Tournaments</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={styles.recordCount}>Total Record(s) Found: {tournaments.filter(t => t.status !== 'completed').length}</span>
            {isAdmin() && (
              <button onClick={() => setShowNewTournamentModal(true)} style={styles.navyBtn}>+ New Tournament</button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Code','Tournament','Game','Format','Start','End','Participants','Status','Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tournaments.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1.4rem' }}>
                    No tournaments yet. {isAdmin() && 'Click "New Tournament" to create one.'}
                  </td>
                </tr>
              ) : tournaments.map((t) => {
                const status = STATUS_BADGE[t.status] || STATUS_BADGE.draft;
                const format = FORMAT_BADGE[t.format] || FORMAT_BADGE.knockout;
                const partCount = tournamentParticipants.filter(p => p.tournament_id === t.id && p.status !== 'withdrawn').length;
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}><strong>{t.code}</strong></td>
                    <td style={styles.td}><strong>{t.name}</strong></td>
                    <td style={styles.td}>{t.game}</td>
                    <td style={styles.td}><span style={{ ...format, ...styles.tinyChip }}>{format.label}</span></td>
                    <td style={styles.td}>{formatDate(t.start_date)}</td>
                    <td style={styles.td}>{formatDate(t.end_date)}</td>
                    <td style={styles.td}>{partCount} / {t.max_participants}</td>
                    <td style={styles.td}><span style={{ ...status, ...styles.tinyChip }}>{status.label}</span></td>
                    <td style={styles.td}>
                      <button
                        onClick={() => { setActiveTournament(t.id); setSub('bracket'); }}
                        style={styles.tinyIconBtn}
                        title="Open bracket"
                      >📊</button>
                      <button
                        onClick={() => setActiveTournament(t.id)}
                        style={{ ...styles.tinyIconBtn, background: activeTournament === t.id ? '#fff3e0' : undefined }}
                        title="Select"
                      >{activeTournament === t.id ? '✓' : '→'}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderBracket = () => {
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Select a tournament from the Active tab to view its bracket.</div>
        </div>
      );
    }
    const qf = matchesForActive.filter(m => m.round === 'QF');
    const sf = matchesForActive.filter(m => m.round === 'SF');
    const f  = matchesForActive.filter(m => m.round === 'F');
    const tp = matchesForActive.filter(m => m.round === '3RD');

    const renderMatch = (m) => {
      const a = m.player_a_employee_id ? getEmployeeName(m.player_a_employee_id) : 'TBD';
      const b = m.player_b_employee_id ? getEmployeeName(m.player_b_employee_id) : 'TBD';
      const hasScore = m.score_a !== null && m.score_b !== null;
      const isFinal = m.round === 'F';
      return (
        <div key={m.id} style={{
          ...styles.matchCard,
          border: isFinal ? '2px solid #f9a825' : '1px solid #d0d0d0',
        }}>
          <div style={styles.matchLabel}>Match {m.match_code || m.match_number}</div>
          <div style={{
            ...styles.matchPlayer,
            background: hasScore && m.score_a > m.score_b ? '#e8f5e9' : 'transparent',
            color: hasScore && m.score_a > m.score_b ? '#1b5e20' : '#212121',
            fontWeight: hasScore && m.score_a > m.score_b ? 700 : 500,
          }}>
            <span>{a}</span><span>{m.score_a ?? '—'}</span>
          </div>
          <div style={{
            ...styles.matchPlayer,
            background: hasScore && m.score_b > m.score_a ? '#e8f5e9' : 'transparent',
            color: hasScore && m.score_b > m.score_a ? '#1b5e20' : '#212121',
            fontWeight: hasScore && m.score_b > m.score_a ? 700 : 500,
          }}>
            <span>{b}</span><span>{m.score_b ?? '—'}</span>
          </div>
          <div style={styles.matchMeta}>
            {m.status === 'completed' ? '✓ Final' : m.status === 'live' ? '● Live' : '⏳ Pending'}
          </div>
          {(isAdmin() || (m.status !== 'completed' && (currentEmpId.toUpperCase() === (m.player_a_employee_id || '').toUpperCase() || currentEmpId.toUpperCase() === (m.player_b_employee_id || '').toUpperCase()))) && (
            <button onClick={() => openResultModal(m)} style={styles.tinyEnterBtn}>
              {m.status === 'completed' ? '✎ Edit' : '⏎ Enter Result'}
            </button>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              🏆 {activeTournamentRecord.name} — {activeTournamentRecord.format.replace('_', ' ').toUpperCase()} Bracket
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {isAdmin() && (
                <button onClick={() => openNewMatchModal('QF')} style={styles.navyBtn}>+ Add Match</button>
              )}
              {!isAdmin() && activeTournamentRecord.status === 'registration_open' && (
                <button
                  onClick={handleRegister}
                  disabled={isRegisteredForActive || !currentEmpId}
                  style={{
                    ...styles.navyBtn,
                    opacity: isRegisteredForActive || !currentEmpId ? 0.5 : 1,
                    cursor: isRegisteredForActive || !currentEmpId ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isRegisteredForActive ? '✓ Registered' : '🏆 Register'}
                </button>
              )}
            </div>
          </div>

          <div style={styles.bracketGrid}>
            {/* Quarter finals */}
            <div style={styles.bracketCol}>
              <div style={styles.bracketColHeader}>QUARTER FINAL</div>
              <div style={styles.bracketColBody}>
                {qf.length === 0 ? <div style={styles.emptyCol}>No QF matches yet</div> : qf.map(renderMatch)}
              </div>
            </div>
            {/* Semi finals */}
            <div style={styles.bracketCol}>
              <div style={styles.bracketColHeader}>SEMI FINAL</div>
              <div style={styles.bracketColBody}>
                {sf.length === 0 ? <div style={styles.emptyCol}>No SF matches yet</div> : sf.map(renderMatch)}
              </div>
            </div>
            {/* Final */}
            <div style={styles.bracketCol}>
              <div style={styles.bracketColHeader}>🏆 FINAL</div>
              <div style={styles.bracketColBody}>
                {f.length === 0 ? <div style={styles.emptyCol}>No final yet</div> : f.map(renderMatch)}
              </div>
            </div>
            {/* 3rd place */}
            <div style={styles.bracketCol}>
              <div style={styles.bracketColHeader}>3RD PLACE</div>
              <div style={styles.bracketColBody}>
                {tp.length === 0 ? <div style={styles.emptyCol}>No 3rd-place match yet</div> : tp.map(renderMatch)}
              </div>
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              Registered Participants — {activeTournamentRecord.name}
            </div>
            {isAdmin() && (
              <span style={{ fontSize: '0.7rem', color: '#888' }}>
                {partsList.length} registered
              </span>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  {['#','Employee','Department','Seed','Matches Played','Won','Lost','Status'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partsList.length === 0 ? (
                  <tr><td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1rem' }}>No participants yet.</td></tr>
                ) : partsList.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}>{i + 1}</td>
                    <td style={styles.td}><strong>{getEmployeeName(p.employee_id)}</strong></td>
                    <td style={styles.td}>{employees.find(e => e.employee_code === p.employee_id)?.department || '—'}</td>
                    <td style={styles.td}>{p.seed ?? '—'}</td>
                    <td style={styles.td}>{p.matches_played}</td>
                    <td style={styles.td}>{p.wins}</td>
                    <td style={styles.td}>{p.losses}</td>
                    <td style={styles.td}>
                      <span style={{
                        ...(p.status === 'eliminated' ? { bg: '#ffebee', color: '#c62828' } :
                            p.status === 'semi_finalist' ? { bg: '#fff3e0', color: '#e65100' } :
                            p.status === 'finalist' ? { bg: '#e3f2fd', color: '#1565c0' } :
                            p.status === 'active' ? { bg: '#e8f5e9', color: '#2e7d32' } :
                            { bg: '#eceff1', color: '#455a64' }),
                        ...styles.tinyChip,
                      }}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Select a tournament first.</div>
        </div>
      );
    }
    return (
      <div className="clay-card" style={styles.card}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Match Records — {activeTournamentRecord.name}</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Round','Match','Player A','Score','Score','Player B','Played','Status','Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchesForActive.length === 0 ? (
                <tr><td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1rem' }}>No matches scheduled.</td></tr>
              ) : matchesForActive.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={styles.td}>{m.round} · M{m.match_number}</td>
                  <td style={styles.td}><strong>{m.match_code || `M${m.match_number}`}</strong></td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_a_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_a_employee_id ? 700 : 500 }}>
                    {m.player_a_employee_id ? getEmployeeName(m.player_a_employee_id) : 'TBD'}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{m.score_a ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{m.score_b ?? '—'}</td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_b_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_b_employee_id ? 700 : 500 }}>
                    {m.player_b_employee_id ? getEmployeeName(m.player_b_employee_id) : 'TBD'}
                  </td>
                  <td style={styles.td}>{m.played_at ? formatDate(m.played_at) : '—'}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...(m.status === 'completed' ? { bg: '#e8f5e9', color: '#2e7d32' } :
                          m.status === 'live' ? { bg: '#ffebee', color: '#c62828' } :
                          { bg: '#eceff1', color: '#455a64' }),
                      ...styles.tinyChip,
                    }}>{m.status}</span>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => openResultModal(m)} style={styles.tinyEnterBtn}>
                      {m.status === 'completed' ? '✎ Edit' : '⏎ Enter Result'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderStopwatch = () => {
    return <StopwatchPanel matches={matchesForActive} tournament={activeTournamentRecord} />;
  };

  const renderFinalResults = () => {
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Select a tournament first.</div>
        </div>
      );
    }
    const tournament = activeTournamentRecord;
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              🏅 Final Results — {tournament.name} ({STATUS_BADGE[tournament.status]?.label || tournament.status})
            </div>
            {isAdmin() && (
              <button
                onClick={() => {
                  const seed = partsList.map((p, i) => ({
                    employee_id: p.employee_id,
                    department: employees.find(e => e.employee_code === p.employee_id)?.department || '—',
                    position: i + 1,
                    matches_played: p.matches_played,
                    wins: p.wins,
                    losses: p.losses,
                    points: p.points,
                    prize_description: i === 0 ? '₹1,000 + Trophy' : i === 1 ? '₹500 + Trophy' : i === 2 ? '₹300 + Medal' : 'Participation',
                    prize_amount: i === 0 ? 1000 : i === 1 ? 500 : i === 2 ? 300 : 0,
                  }));
                  setFinalForm(seed);
                }}
                style={styles.navyBtn}
              >📣 Declare Winners</button>
            )}
          </div>

          {/* Podium */}
          {resultsForActive.length > 0 && (
            <div style={styles.podium}>
              {resultsForActive.filter(r => r.position === 2).map(r => (
                <div key={r.id} style={styles.podiumSilver}>
                  <div style={styles.podiumName}>{getEmployeeName(r.employee_id)}</div>
                  <div style={styles.podiumRank}>2nd Place</div>
                  <div style={styles.podiumPrize}>{r.prize_description || '—'}</div>
                </div>
              ))}
              {resultsForActive.filter(r => r.position === 1).map(r => (
                <div key={r.id} style={styles.podiumGold}>
                  <div style={styles.podiumName}>🏆 {getEmployeeName(r.employee_id)}</div>
                  <div style={styles.podiumRank}>Champion</div>
                  <div style={styles.podiumPrize}>{r.prize_description || '—'}</div>
                </div>
              ))}
              {resultsForActive.filter(r => r.position === 3).map(r => (
                <div key={r.id} style={styles.podiumBronze}>
                  <div style={styles.podiumName}>{getEmployeeName(r.employee_id)}</div>
                  <div style={styles.podiumRank}>3rd Place</div>
                  <div style={styles.podiumPrize}>{r.prize_description || '—'}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.theadRow}>
                  {['Position','Player','Department','Matches','Won','Lost','Points','Prize','Certificate'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsForActive.length === 0 ? (
                  <tr><td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1rem' }}>No final results declared yet.</td></tr>
                ) : resultsForActive.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}>
                      <span style={{
                        ...(r.position === 1 ? { bg: '#fff8e1', color: '#f9a825' } :
                            r.position === 2 ? { bg: '#eceff1', color: '#607d8b' } :
                            r.position === 3 ? { bg: '#fff3e0', color: '#e65100' } :
                            { bg: '#f5f5f5', color: '#666' }),
                        ...styles.tinyChip,
                      }}>
                        {r.position === 1 ? '🥇 1st' : r.position === 2 ? '🥈 2nd' : r.position === 3 ? '🥉 3rd' : `${r.position}th`}
                      </span>
                    </td>
                    <td style={styles.td}><strong>{getEmployeeName(r.employee_id)}</strong></td>
                    <td style={styles.td}>{r.department || '—'}</td>
                    <td style={styles.td}>{r.matches_played}</td>
                    <td style={styles.td}>{r.wins}</td>
                    <td style={styles.td}>{r.losses}</td>
                    <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{r.points}</td>
                    <td style={styles.td}>{r.prize_description || '—'}</td>
                    <td style={styles.td}>
                      <button style={styles.tinyEnterBtn}>🖨 Print</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!currentEmpId) {
      showToast('Your profile is missing an employee ID', 'error');
      return;
    }
    const result = await registerForTournament(activeTournament, currentEmpId);
    if (result.success) {
      showToast('Registered for the tournament!');
    } else {
      showToast(result.error || 'Failed to register', 'error');
    }
  };

  const handleCreateTournament = async () => {
    if (!tForm.name.trim() || !tForm.start_date) {
      showToast('Name and start date are required', 'error');
      return;
    }
    const result = await addTournament({
      ...tForm,
      max_participants: parseInt(tForm.max_participants, 10) || 8,
    });
    if (result.success) {
      showToast(`Tournament "${tForm.name}" created!`);
      setShowNewTournamentModal(false);
      setTForm({ name: '', game: 'Carrom', format: 'knockout', start_date: '', end_date: '', max_participants: 8, prize_pool: '', description: '' });
      if (result.data?.id) setActiveTournament(result.data.id);
    } else {
      showToast(result.error || 'Failed to create tournament', 'error');
    }
  };

  const openNewMatchModal = (round) => {
    setMForm({
      match_code: `${round}${matchesForActive.filter(m => m.round === round).length + 1}`,
      round, match_number: matchesForActive.filter(m => m.round === round).length + 1,
      player_a: '', player_b: '', scheduled_at: '',
    });
    setShowNewMatchModal(true);
  };

  const handleCreateMatch = async () => {
    if (!activeTournament) return;
    if (!mForm.player_a || !mForm.player_b) {
      showToast('Both players are required', 'error');
      return;
    }
    const result = await addTournamentMatch({
      tournament_id: activeTournament,
      match_code: mForm.match_code,
      round: mForm.round,
      match_number: parseInt(mForm.match_number, 10) || 1,
      player_a_employee_id: mForm.player_a,
      player_b_employee_id: mForm.player_b,
      scheduled_at: mForm.scheduled_at || null,
    });
    if (result.success) {
      showToast('Match added');
      setShowNewMatchModal(false);
    } else {
      showToast(result.error || 'Failed to add match', 'error');
    }
  };

  const openResultModal = (match) => {
    setResultMatchId(match.id);
    setRForm({
      score_a: match.score_a ?? '',
      score_b: match.score_b ?? '',
      winner: match.winner_employee_id || '',
      duration: match.duration_seconds || '',
    });
  };

  const handleSaveResult = async () => {
    if (!rForm.winner) {
      showToast('Pick a winner', 'error');
      return;
    }
    const result = await recordMatchResult(resultMatchId, {
      score_a: parseInt(rForm.score_a, 10) || 0,
      score_b: parseInt(rForm.score_b, 10) || 0,
      winner_employee_id: rForm.winner,
      duration_seconds: parseInt(rForm.duration, 10) || null,
    });
    if (result.success) {
      showToast('Result saved');
      setResultMatchId(null);
    } else {
      showToast(result.error || 'Failed to save result', 'error');
    }
  };

  const handleDeclareFinal = async () => {
    if (finalForm.length === 0) {
      showToast('No results to declare', 'error');
      return;
    }
    const result = await declareFinalResults(activeTournament, finalForm);
    if (result.success) {
      showToast('Final results declared!');
      setFinalForm([]);
    } else {
      showToast(result.error || 'Failed to declare final results', 'error');
    }
  };

  return (
    <div style={{ fontFamily: "'Roboto', Arial, sans-serif", fontSize: 13, color: '#212121' }}>
      <EventsTopBar active="tournaments" />

      {/* Sub-tab bar */}
      <div className="clay-card" style={styles.subTabBar}>
        {SUB_TABS.map(t => {
          const isActive = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{
                ...styles.subTabBtn,
                color: isActive ? '#1a3c6e' : '#444466',
                borderBottom: isActive ? '3px solid #1a3c6e' : '3px solid transparent',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {sub === 'active' && renderActiveTournaments()}
      {sub === 'bracket' && renderBracket()}
      {sub === 'results' && renderResults()}
      {sub === 'stopwatch' && renderStopwatch()}
      {sub === 'final' && renderFinalResults()}

      {/* New Tournament Modal */}
      {showNewTournamentModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNewTournamentModal(false); }} style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>New Tournament</h3>
              <button onClick={() => setShowNewTournamentModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={styles.formGrid}>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Tournament Name *</label>
                  <input style={styles.formInput} value={tForm.name}
                         onChange={(e) => setTForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Game</label>
                  <select style={styles.formInput} value={tForm.game}
                          onChange={(e) => setTForm(f => ({ ...f, game: e.target.value }))}>
                    <option>Carrom</option>
                    <option>Chess</option>
                    <option>Table Tennis</option>
                    <option>Other</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Format</label>
                  <select style={styles.formInput} value={tForm.format}
                          onChange={(e) => setTForm(f => ({ ...f, format: e.target.value }))}>
                    <option value="knockout">Knockout</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="league">League</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Start Date *</label>
                  <input style={styles.formInput} type="date" value={tForm.start_date}
                         onChange={(e) => setTForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>End Date</label>
                  <input style={styles.formInput} type="date" value={tForm.end_date}
                         onChange={(e) => setTForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Max Participants</label>
                  <input style={styles.formInput} type="number" min="2" value={tForm.max_participants}
                         onChange={(e) => setTForm(f => ({ ...f, max_participants: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Prize Pool</label>
                  <input style={styles.formInput} value={tForm.prize_pool}
                         onChange={(e) => setTForm(f => ({ ...f, prize_pool: e.target.value }))} />
                </div>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Description</label>
                  <textarea style={{ ...styles.formInput, minHeight: 60, resize: 'vertical' }}
                            value={tForm.description}
                            onChange={(e) => setTForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowNewTournamentModal(false)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleCreateTournament} style={styles.navyBtn}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* New Match Modal */}
      {showNewMatchModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setShowNewMatchModal(false); }} style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Add Match</h3>
              <button onClick={() => setShowNewMatchModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              <div style={styles.formGrid}>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Round</label>
                  <select style={styles.formInput} value={mForm.round}
                          onChange={(e) => setMForm(f => ({ ...f, round: e.target.value }))}>
                    <option>QF</option><option>SF</option><option>F</option><option>3RD</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Match Code</label>
                  <input style={styles.formInput} value={mForm.match_code}
                         onChange={(e) => setMForm(f => ({ ...f, match_code: e.target.value }))} />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Player A</label>
                  <select style={styles.formInput} value={mForm.player_a}
                          onChange={(e) => setMForm(f => ({ ...f, player_a: e.target.value }))}>
                    <option value="">— select —</option>
                    {partsList.map(p => (
                      <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Player B</label>
                  <select style={styles.formInput} value={mForm.player_b}
                          onChange={(e) => setMForm(f => ({ ...f, player_b: e.target.value }))}>
                    <option value="">— select —</option>
                    {partsList.map(p => (
                      <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <label style={styles.formLabel}>Scheduled Time</label>
                  <input style={styles.formInput} type="datetime-local" value={mForm.scheduled_at}
                         onChange={(e) => setMForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowNewMatchModal(false)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleCreateMatch} style={styles.navyBtn}>Add Match</button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {resultMatchId && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setResultMatchId(null); }} style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Enter Match Result</h3>
              <button onClick={() => setResultMatchId(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const m = matchesForActive.find(x => x.id === resultMatchId);
                if (!m) return null;
                return (
                  <div style={styles.formGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>{getEmployeeName(m.player_a_employee_id)}</label>
                      <input style={styles.formInput} type="number" min="0" value={rForm.score_a}
                             onChange={(e) => setRForm(f => ({ ...f, score_a: e.target.value }))} />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>{getEmployeeName(m.player_b_employee_id)}</label>
                      <input style={styles.formInput} type="number" min="0" value={rForm.score_b}
                             onChange={(e) => setRForm(f => ({ ...f, score_b: e.target.value }))} />
                    </div>
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Winner</label>
                      <select style={styles.formInput} value={rForm.winner}
                              onChange={(e) => setRForm(f => ({ ...f, winner: e.target.value }))}>
                        <option value="">— select —</option>
                        <option value={m.player_a_employee_id}>{getEmployeeName(m.player_a_employee_id)}</option>
                        <option value={m.player_b_employee_id}>{getEmployeeName(m.player_b_employee_id)}</option>
                      </select>
                    </div>
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Duration (seconds)</label>
                      <input style={styles.formInput} type="number" min="0" value={rForm.duration}
                             onChange={(e) => setRForm(f => ({ ...f, duration: e.target.value }))} />
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setResultMatchId(null)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleSaveResult} style={styles.navyBtn}>Save Result</button>
            </div>
          </div>
        </div>
      )}

      {/* Final results modal */}
      {finalForm.length > 0 && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setFinalForm([]); }} style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 720 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Declare Final Results</h3>
              <button onClick={() => setFinalForm([])} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    {['Position','Player','Department','Matches','Won','Lost','Points','Prize'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finalForm.map((row, i) => (
                    <tr key={row.employee_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={styles.td}>{row.position}</td>
                      <td style={styles.td}><strong>{getEmployeeName(row.employee_id)}</strong></td>
                      <td style={styles.td}>{row.department}</td>
                      <td style={styles.td}>
                        <input style={{ ...styles.formInput, width: 60, padding: '0.18rem 0.35rem' }}
                               type="number" min="0" value={row.matches_played}
                               onChange={(e) => setFinalForm(f => f.map((r, j) => j === i ? { ...r, matches_played: parseInt(e.target.value, 10) || 0 } : r))} />
                      </td>
                      <td style={styles.td}>
                        <input style={{ ...styles.formInput, width: 60, padding: '0.18rem 0.35rem' }}
                               type="number" min="0" value={row.wins}
                               onChange={(e) => setFinalForm(f => f.map((r, j) => j === i ? { ...r, wins: parseInt(e.target.value, 10) || 0 } : r))} />
                      </td>
                      <td style={styles.td}>
                        <input style={{ ...styles.formInput, width: 60, padding: '0.18rem 0.35rem' }}
                               type="number" min="0" value={row.losses}
                               onChange={(e) => setFinalForm(f => f.map((r, j) => j === i ? { ...r, losses: parseInt(e.target.value, 10) || 0 } : r))} />
                      </td>
                      <td style={styles.td}>
                        <input style={{ ...styles.formInput, width: 60, padding: '0.18rem 0.35rem' }}
                               type="number" min="0" value={row.points}
                               onChange={(e) => setFinalForm(f => f.map((r, j) => j === i ? { ...r, points: parseInt(e.target.value, 10) || 0 } : r))} />
                      </td>
                      <td style={styles.td}>
                        <input style={{ ...styles.formInput, padding: '0.18rem 0.35rem' }} value={row.prize_description}
                               onChange={(e) => setFinalForm(f => f.map((r, j) => j === i ? { ...r, prize_description: e.target.value } : r))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setFinalForm([])} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleDeclareFinal} style={styles.navyBtn}>📣 Declare</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Stopwatch sub-component (with countdown) ────────────────────────
const StopwatchPanel = ({ matches, tournament }) => {
  const { showToast } = useToast();
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [swLaps, setSwLaps] = useState([]);
  const swRef = useRef(null);
  const [cdMs, setCdMs] = useState(600000);
  const [cdRunning, setCdRunning] = useState(false);
  const cdRef = useRef(null);

  const swToggle = useCallback(() => {
    if (swRunning) {
      clearInterval(swRef.current);
      setSwRunning(false);
    } else {
      swRef.current = setInterval(() => setSwMs(ms => ms + 10), 10);
      setSwRunning(true);
    }
  }, [swRunning]);

  const swLap = useCallback(() => {
    if (!swRunning) return;
    const m  = Math.floor(swMs / 60000);
    const s  = Math.floor((swMs % 60000) / 1000);
    const ms = Math.floor((swMs % 1000) / 10);
    setSwLaps(l => [...l, `${pad2(m)}:${pad2(s)}.${pad2(ms)}`]);
  }, [swRunning, swMs]);

  const swReset = useCallback(() => {
    clearInterval(swRef.current);
    setSwRunning(false);
    setSwMs(0);
    setSwLaps([]);
  }, []);

  const swFmt = (ms) => {
    const m  = Math.floor(ms / 60000);
    const s  = Math.floor((ms % 60000) / 1000);
    const cs = Math.floor((ms % 1000) / 10);
    return `${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  };

  const cdStart = useCallback(() => {
    if (cdRunning) {
      clearInterval(cdRef.current);
      setCdRunning(false);
      return;
    }
    if (cdMs <= 0) return;
    setCdRunning(true);
    cdRef.current = setInterval(() => {
      setCdMs(ms => {
        if (ms <= 1000) {
          clearInterval(cdRef.current);
          setCdRunning(false);
          showToast('⏰ Time is up!');
          return 0;
        }
        return ms - 1000;
      });
    }, 1000);
  }, [cdRunning, cdMs, showToast]);

  const cdReset = useCallback(() => {
    clearInterval(cdRef.current);
    setCdRunning(false);
    setCdMs(600000);
  }, []);

  const cdFmt = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${pad2(m)}:${pad2(s)}`;
  };

  useEffect(() => () => {
    clearInterval(swRef.current);
    clearInterval(cdRef.current);
  }, []);

  const todaySchedule = matches.filter(m => m.status !== 'completed').slice(0, 6);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div className="clay-card" style={{ ...styles.card }}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>⏱ Match Stopwatch & Timer</div>
        </div>
        <div style={{ background: '#1a3c6e', borderRadius: 12, padding: '1.4rem', textAlign: 'center', color: 'white' }}>
          <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: '3rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.6rem' }}>
            {swFmt(swMs)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.6rem' }}>
            <button onClick={swToggle} style={{ ...styles.swBtn, background: swRunning ? '#f9a825' : '#388e3c' }}>{swRunning ? '⏸' : '▶'}</button>
            <button onClick={swLap} style={{ ...styles.swBtn, background: 'rgba(255,255,255,0.15)' }}>🏁</button>
            <button onClick={swReset} style={{ ...styles.swBtn, background: 'rgba(255,255,255,0.15)' }}>↺</button>
          </div>
          <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '0.5rem' }}>{swRunning ? 'Recording laps…' : 'Press ▶ to start'}</div>
          <div style={{ maxHeight: 100, overflowY: 'auto', background: 'rgba(255,255,255,0.08)', borderRadius: 4, padding: '0.4rem' }}>
            {swLaps.length === 0
              ? <div style={{ fontSize: '0.65rem', opacity: 0.5, textAlign: 'center' }}>No laps recorded</div>
              : swLaps.map((t, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', padding: '0.15rem 0.3rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ opacity: 0.7 }}>Lap {i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="clay-card" style={{ ...styles.card }}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>⏰ Countdown Timer</div>
          </div>
          <div style={{ background: '#112244', borderRadius: 12, padding: '1.4rem', textAlign: 'center', color: 'white' }}>
            <div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: '3.2rem', fontWeight: 700, color: cdMs <= 60000 ? '#e53935' : 'white', marginBottom: '0.5rem' }}>
              {cdFmt(cdMs)}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
              {[5, 10, 15, 30].map(m => (
                <button key={m} onClick={() => { clearInterval(cdRef.current); setCdRunning(false); setCdMs(m * 60000); }}
                        style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 4, color: 'white', padding: '0.22rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                  {m}m
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={cdStart} style={{ ...styles.swBtn, background: cdRunning ? '#f9a825' : '#388e3c' }}>{cdRunning ? '⏸' : '▶'}</button>
              <button onClick={cdReset} style={{ ...styles.swBtn, background: 'rgba(255,255,255,0.15)' }}>↺</button>
            </div>
          </div>
        </div>

        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>📅 Today's Match Schedule</div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {todaySchedule.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#888', fontSize: '0.78rem' }}>No upcoming matches.</div>
            ) : todaySchedule.map(m => (
              <div key={m.id} style={{ padding: '0.55rem 0.7rem', borderBottom: '1px solid #eee', fontSize: '0.74rem' }}>
                <div style={{ fontWeight: 700, color: '#1a3c6e' }}>
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD'} — {m.match_code || `Match ${m.match_number}`}
                </div>
                <div style={{ color: '#666' }}>
                  {m.player_a_employee_id ? (m.player_a_employee_id === 'TBD' ? 'TBD' : m.player_a_employee_id) : 'TBD'} vs {m.player_b_employee_id || 'TBD'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  subTabBar: {
    background: 'white', borderRadius: 32, padding: '4px 8px',
    marginBottom: '14px', display: 'flex', gap: '4px', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap',
  },
  subTabBtn: {
    background: 'transparent', border: 'none',
    padding: '10px 18px', fontSize: '0.78rem', fontFamily: 'inherit',
    cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: '-1px',
    transition: 'color 0.2s ease, border-color 0.2s ease',
  },
  card: { background: 'white', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid rgba(200,210,230,0.5)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' },
  cardHeaderTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1e1e2f' },
  recordCount: { fontSize: '0.7rem', color: '#666' },
  navyBtn: { background: '#1a3c6e', color: 'white', border: 'none', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  outlineBtn: { background: 'white', color: '#1a3c6e', border: '1px solid #d0d0d0', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  dangerBtn: { background: '#c62828', color: 'white', border: 'none', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  tinyIconBtn: { background: 'transparent', border: '1px solid #d0d0d0', borderRadius: 4, padding: '0.18rem 0.4rem', margin: '0 2px', cursor: 'pointer', fontSize: '0.7rem' },
  tinyEnterBtn: { background: '#1a3c6e', color: 'white', border: 'none', borderRadius: 4, padding: '0.2rem 0.55rem', fontSize: '0.66rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 },
  tinyChip: { padding: '0.12rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 500, display: 'inline-block' },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' },
  theadRow: { background: 'rgba(26,60,110,0.05)' },
  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700, color: '#444', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.04em' },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'middle' },

  bracketGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', alignItems: 'stretch' },
  bracketCol: { display: 'flex', flexDirection: 'column' },
  bracketColHeader: { textAlign: 'center', padding: '0.4rem 0', fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f5f5f5', borderRadius: '4px 4px 0 0', border: '1px solid #d0d0d0', borderBottom: 'none' },
  bracketColBody: { padding: '0.4rem', background: '#fafafa', borderRadius: '0 0 4px 4px', border: '1px solid #d0d0d0', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 100 },
  emptyCol: { padding: '1rem 0.5rem', textAlign: 'center', color: '#bbb', fontSize: '0.7rem', fontStyle: 'italic' },
  matchCard: { background: 'white', borderRadius: 6, padding: '0.5rem 0.6rem', fontSize: '0.74rem' },
  matchLabel: { textAlign: 'center', fontSize: '0.62rem', color: '#888', marginBottom: '0.25rem' },
  matchPlayer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.4rem', borderRadius: 3 },
  matchMeta: { textAlign: 'center', fontSize: '0.6rem', color: '#888', marginTop: '0.25rem' },

  podium: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem', alignItems: 'end', marginBottom: '1.2rem', padding: '0.6rem 0' },
  podiumGold:   { background: 'linear-gradient(180deg, #fff8e1, #ffecb3)', borderRadius: 8, padding: '1.2rem 0.5rem', textAlign: 'center', border: '2px solid #f9a825', order: 2 },
  podiumSilver: { background: 'linear-gradient(180deg, #fafafa, #eceff1)', borderRadius: 8, padding: '0.9rem 0.5rem', textAlign: 'center', border: '2px solid #b0bec5', order: 1 },
  podiumBronze: { background: 'linear-gradient(180deg, #fff3e0, #ffe0b2)', borderRadius: 8, padding: '0.7rem 0.5rem', textAlign: 'center', border: '2px solid #d84315', order: 3 },
  podiumName:   { fontSize: '0.9rem', fontWeight: 700, color: '#1e1e2f', marginBottom: '0.2rem' },
  podiumRank:   { fontSize: '0.7rem', fontWeight: 600, color: '#666', marginBottom: '0.3rem' },
  podiumPrize:  { fontSize: '0.7rem', color: '#1a3c6e', fontWeight: 600 },

  swBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },

  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 70 },
  modalCard: { background: 'white', borderRadius: 8, width: 540, maxWidth: '96vw', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.22)' },
  modalHeader: { background: '#1a3c6e', color: 'white', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px 8px 0 0' },
  modalClose: { background: 'none', border: 'none', color: 'white', fontSize: '1rem', cursor: 'pointer' },
  modalFooter: { padding: '0.7rem 1rem', borderTop: '1px solid #d0d0d0', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', background: '#fafafa', borderRadius: '0 0 8px 8px' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 0.85rem' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  formLabel: { fontSize: '0.7rem', fontWeight: 500, color: '#555' },
  formInput: { padding: '0.32rem 0.55rem', border: '1px solid #d0d0d0', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'inherit', color: '#212121', width: '100%' },
};

export default TournamentsPage;
