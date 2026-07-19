// src/pages/TournamentsPage.jsx
// Activity Planner ▸ Events ▸ Tournaments
// Sub-tabs: Active Tournaments | Bracket/Fixtures | Match Results | Stopwatch | Final Results
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import EventsTopBar from '../components/events/EventsTopBar';
import { useCertificate } from '../hooks/useCertificate';
import {
  computeRoundRobinStandings,
  groupMatchesByRound,
  normalizeTournamentFormat,
} from '../utils/tournamentFixtures';

// Confirm-delete modal (admin action on a tournament).
const ConfirmDeleteModal = ({ tournament, onCancel, onConfirm }) => (
  <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={styles.modalBackdrop}>
    <div style={{ ...styles.modalCard, maxWidth: 420 }}>
      <div style={{ ...styles.modalHeader, background: '#c62828' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Delete Tournament</h3>
        <button onClick={onCancel} style={styles.modalClose}>✕</button>
      </div>
      <div style={{ padding: '1rem', fontSize: '0.78rem', color: '#333' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          Are you sure you want to delete <strong>{tournament?.name}</strong> ({tournament?.code})?
        </p>
        <p style={{ margin: 0, color: '#c62828', fontSize: '0.72rem' }}>
          This will also remove all participants, matches and final results linked to it. This cannot be undone.
        </p>
      </div>
      <div style={styles.modalFooter}>
        <button onClick={onCancel} style={styles.outlineBtn}>Cancel</button>
        <button onClick={onConfirm} style={styles.dangerBtn}>🗑 Delete</button>
      </div>
    </div>
  </div>
);

// Batch-register modal: pick one or more active tournaments in a single click.
const BatchRegisterModal = ({ tournaments, currentEmpId, partsByTournament, pendingByTournament, isAdminUser, onCancel, onSubmit }) => {
  // Open, accepting-registration, not-full, not-already-registered.
  const eligible = tournaments.filter(t => {
    if (t.status === 'completed' || t.status === 'cancelled') return false;
    if (t.registration_open === false) return false;
    // Lock registration once the start date has passed.
    if (t.start_date && new Date(t.start_date) <= new Date()) return false;
    const parts = partsByTournament[t.id] || [];
    if (parts.some(p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase())) return false;
    const pending = pendingByTournament[t.id] || [];
    if (pending.some(p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase())) return false;
    const cap = t.max_participants || 8;
    if (isAdminUser && parts.length >= cap) return false;
    return true;
  });
  const [selected, setSelected] = useState(() => new Set(eligible.map(t => t.id)));

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={styles.modalBackdrop}>
      <div style={{ ...styles.modalCard, maxWidth: 560 }}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>🏆 Register for Tournaments</h3>
          <button onClick={onCancel} style={styles.modalClose}>✕</button>
        </div>
        <div style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', color: '#666', marginBottom: '0.6rem' }}>
            One registration per person per tournament. Tick all tournaments you'd like to join — you can pick one or many.
          </div>
          {eligible.length === 0 ? (
            <div style={{ padding: '1.2rem', textAlign: 'center', color: '#888', fontSize: '0.78rem' }}>
              No open tournaments available — either you're already registered or they're all full.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {eligible.map(t => {
                const parts = partsByTournament[t.id] || [];
                const isSel = selected.has(t.id);
                return (
                  <label
                    key={t.id}
                    style={{
                      display: 'flex', gap: '0.6rem', alignItems: 'center',
                      padding: '0.55rem 0.7rem', borderRadius: 6,
                      border: `1px solid ${isSel ? '#1a3c6e' : '#d0d0d0'}`,
                      background: isSel ? '#e8eef7' : '#fafafa',
                      cursor: 'pointer', fontSize: '0.75rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(t.id)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#1e1e2f' }}>{t.name}</div>
                      <div style={{ fontSize: '0.66rem', color: '#666' }}>
                        {t.code} · {t.game} · {t.format.replace('_', ' ')} · {formatDate(t.start_date)}
                      </div>
                    </div>
                    <div style={{ fontSize: '0.66rem', color: '#444', whiteSpace: 'nowrap' }}>
                      {parts.length} / {t.max_participants}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div style={styles.modalFooter}>
          <span style={{ flex: 1, fontSize: '0.7rem', color: '#666' }}>
            {selected.size} selected
          </span>
            <button onClick={onCancel} style={styles.outlineBtn}>Cancel</button>
          <button
            onClick={() => onSubmit([...selected])}
            disabled={selected.size === 0 || !currentEmpId}
            style={{
              ...styles.navyBtn,
              opacity: selected.size === 0 || !currentEmpId ? 0.5 : 1,
              cursor: selected.size === 0 || !currentEmpId ? 'not-allowed' : 'pointer',
            }}
          >{isAdminUser ? 'Register' : 'Request'}</button>
        </div>
      </div>
    </div>
  );
};

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
    tournamentRegistrationRequests,
    tournamentMatches,
    finalResults,
    employees,
    currentUser,
    isAdmin,
    addTournament,
    deleteTournament,
    generateTournamentFixtures,
    registerForTournament,
    addTournamentMatch,
    recordMatchResult,
    declareFinalResults,
    unregisterFromTournament,
    approveWithdrawalRequest,
    rejectWithdrawalRequest,
    updateTournamentMatch,
    deleteTournamentMatch,
    getMatchesByTournament,
    getParticipantsByTournament,
    getResultsByTournament,
    getEmployeeName,
    updateTournament,
    generateRoundRobinKnockout,
    approveTournamentRegistration,
    refreshTournamentData,
    refreshKnockoutFixtures,
  } = useApp();
  const { showToast } = useToast();
  const { generateCertificate } = useCertificate();
  const [certPrinting, setCertPrinting] = useState(null); // tracks which row is printing

  const [sub, setSub] = useState('active');
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [tForm, setTForm] = useState({
    name: '', game: 'Carrom', format: 'knockout',
    players_per_team: 1,
    start_date: '', end_date: '', max_participants: 8,
    prize_pool: '', description: '',
  });
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [mForm, setMForm] = useState({
    match_code: '', round: 'QF', match_number: 1,
    scheduled_at: '',
    // Dynamic: team_a[0..N-1] and team_b[0..N-1] based on players_per_team
    team_a: ['', '', ''],
    team_b: ['', '', ''],
  });
  const [resultMatchId, setResultMatchId] = useState(null);
  const [rForm, setRForm] = useState({
    result_type: 'completed',
    score_a: '',
    score_b: '',
    winner: '',
    duration: '',
    absent_participant_employee_id: '',
    reason: '',
    notes: '',
    scheduled_at: '',
  });
  const [finalForm, setFinalForm] = useState([]);
  const [tournamentToDelete, setTournamentToDelete] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  // editMatchId: ID of the match being edited by admin in the bracket/fixtures
  const [editMatchId, setEditMatchId] = useState(null);
  const [eForm, setEForm] = useState({ match_code: '', round: 'QF', match_number: 1, scheduled_at: '', team_a: [''], team_b: [''] });
  // matchToDelete: match pending admin delete confirmation
  const [matchToDelete, setMatchToDelete] = useState(null);
  // editTournamentId: tournament being edited by admin (status / registration / date)
  const [editTournamentId, setEditTournamentId] = useState(null);
  const [tEditForm, setTEditForm] = useState({ status: 'registration_open', registration_open: true, start_date: '' });

  // Auto-pick the first tournament if the user hasn't picked one yet, or
  // if the previously selected one no longer exists (e.g. it was deleted,
  // or the Supabase reload came back with a different ID type).
  const [activeTournamentOverride, setActiveTournament] = useState(null);
  const activeTournament = useMemo(() => {
    if (activeTournamentOverride != null) {
      // Compare as strings so a string override (from <select> onChange) still
      // matches an integer/numeric ID coming back from Supabase.
      const overrideStr = String(activeTournamentOverride);
      const found = tournaments.find(t => String(t.id) === overrideStr);
      if (found) return found.id;
    }
    return tournaments.length > 0 ? tournaments[0].id : null;
  }, [tournaments, activeTournamentOverride]);

  const activeTournamentRecord = useMemo(
    () => tournaments.find(t => t.id === activeTournament) || null,
    [tournaments, activeTournament]
  );
  const partsList = useMemo(
    () => activeTournament ? getParticipantsByTournament(activeTournament) : [],
    [activeTournament, tournamentParticipants, getParticipantsByTournament]
  );
  // Map of tournament_id -> active (non-withdrawn) participants.
  // Used by the active-tournaments table and the batch-register modal.
  const partsByTournament = useMemo(() => {
    const map = {};
    for (const p of tournamentParticipants) {
      if (p.status !== 'registered' && p.status !== 'active' && p.status !== 'semi_finalist' && p.status !== 'finalist' && p.status !== 'eliminated') continue;
      if (!map[p.tournament_id]) map[p.tournament_id] = [];
      map[p.tournament_id].push(p);
    }
    return map;
  }, [tournamentParticipants]);
  const pendingByTournament = useMemo(() => {
    const map = {};
    for (const request of tournamentRegistrationRequests) {
      if (String(request.status || '').toLowerCase() !== 'pending') continue;
      if (!map[request.tournament_id]) map[request.tournament_id] = [];
      map[request.tournament_id].push(request);
    }
    return map;
  }, [tournamentRegistrationRequests]);

  // Participants who have requested withdrawal while tournament is live
  // keyed by tournament_id — used to show admin the approval panel
  const withdrawalPendingByTournament = useMemo(() => {
    const map = {};
    for (const p of tournamentParticipants) {
      if (String(p.status || '').toLowerCase() !== 'pending_withdrawal') continue;
      if (!map[p.tournament_id]) map[p.tournament_id] = [];
      map[p.tournament_id].push(p);
    }
    return map;
  }, [tournamentParticipants]);

  const matchesForActive = useMemo(
    () => activeTournament ? getMatchesByTournament(activeTournament) : [],
    [activeTournament, tournamentMatches, getMatchesByTournament]
  );
  const roundGroups = useMemo(
    () => groupMatchesByRound(matchesForActive),
    [matchesForActive]
  );
  const activeTournamentFormat = normalizeTournamentFormat(activeTournamentRecord?.format);
  const resultsForActive = useMemo(
    () => activeTournament ? getResultsByTournament(activeTournament) : [],
    [activeTournament, finalResults, getResultsByTournament]
  );

  const currentEmpId = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || '';
  const isRegisteredForActive = partsList.some(p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase());

  // Permission helper for editing a match result.
  // Admin can always edit. Non-admin can edit only if they actually played
  // the match (player_a or player_b) AND both slots are filled (not TBD).
  const canEditMatch = (m) => {
    if (!m) return false;
    if (isAdmin()) return true;
    if (!currentEmpId) return false;
    const me = currentEmpId.toUpperCase();
    const a = (m.player_a_employee_id || '').toUpperCase();
    const b = (m.player_b_employee_id || '').toUpperCase();
    if (!a || !b) return false; // TBD slots — only admin can fill them in
    // Check captain columns first
    if (me === a || me === b) return true;
    // Then check all team members from junction table
    const allPlayers = [
      ...(m.team_a_players || []),
      ...(m.team_b_players || []),
    ].map(p => (p.employee_id || '').toUpperCase());
    return allPlayers.includes(me);
  };

  // ── Sub-tab renderers ─────────────────────────────────────────────────
  const renderActiveTournaments = () => {
    return (
      <div className="clay-card" style={{background:'#f4bf70'}}>
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
                {['Code','Tournament','Game','Format','Start','End','Participants','Status','Register','Unregister','Action'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tournaments.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1.4rem' }}>
                    No tournaments yet. {isAdmin() && 'Click "New Tournament" to create one.'}
                  </td>
                </tr>
              ) : tournaments.map((t) => {
                const status = STATUS_BADGE[t.status] || STATUS_BADGE.draft;
                const format = FORMAT_BADGE[t.format] || FORMAT_BADGE.knockout;
                const partCount = (partsByTournament[t.id] || []).length;
                const cap = t.max_participants || 8;
                const isFull = partCount >= cap;
                const isCompleted = t.status === 'completed' || t.status === 'cancelled';
                const regOpen = t.registration_open !== false;
                // Lock registration once the start date has passed.
                const startDatePassed = t.start_date && new Date(t.start_date) <= new Date();
                const myParticipantRow = (partsByTournament[t.id] || []).find(
                  p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase()
                );
                const alreadyRegistered = !!myParticipantRow;
                const hasPendingWithdrawal = myParticipantRow &&
                  String(myParticipantRow.status || '').toLowerCase() === 'pending_withdrawal';
                const hasPendingRequest = (pendingByTournament[t.id] || []).some(
                  p => p.employee_id?.toUpperCase() === currentEmpId.toUpperCase()
                );
                const canRequest = !isCompleted && regOpen && !startDatePassed && !alreadyRegistered && !hasPendingRequest && !!currentEmpId;
                const canRegister = isAdmin() ? canRequest && !isFull : canRequest;
                const regLabel = alreadyRegistered
                  ? '✓ Registered'
                  : hasPendingRequest
                    ? '⏳ Waiting'
                    : isCompleted
                      ? '—'
                      : startDatePassed
                        ? 'Started'
                        : isAdmin()
                          ? (isFull ? '🔒 Full' : '🏆 Register')
                          : '📝 Request';
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={styles.td}><strong>{t.code}</strong></td>
                    <td style={styles.td}><strong>{t.name}</strong></td>
                    <td style={styles.td}>{t.game}</td>
                    <td style={styles.td}><span style={{ ...format, ...styles.tinyChip }}>{format.label}</span></td>
                    <td style={styles.td}>{formatDate(t.start_date)}</td>
                    <td style={styles.td}>{formatDate(t.end_date)}</td>
                    <td style={styles.td}>{partCount} / {cap}</td>
                    <td style={styles.td}><span style={{ ...status, ...styles.tinyChip }}>{status.label}</span></td>
                    <td style={styles.td}>
                      <button
                        onClick={() => handleRegisterForOne(t.id)}
                        disabled={!canRegister}
                        style={{
                          ...styles.tinyEnterBtn,
                          background: alreadyRegistered ? '#388e3c' : hasPendingRequest ? '#f9a825' : isCompleted || startDatePassed || (isAdmin() && isFull) ? '#9e9e9e' : '#1a3c6e',
                          opacity: canRegister || alreadyRegistered || hasPendingRequest ? 1 : 0.6,
                          cursor: canRegister || alreadyRegistered || hasPendingRequest ? 'pointer' : 'not-allowed',
                        }}
                        title={
                          alreadyRegistered ? 'You are already registered'
                          : hasPendingRequest ? 'Your request is waiting for admin approval'
                          : isAdmin() && isFull ? 'Tournament is full'
                          : isCompleted ? 'Tournament is closed'
                          : startDatePassed ? 'Registration closed — tournament has started'
                          : regOpen ? (isAdmin() ? 'Click to register' : 'Click to request approval')
                          : 'Registration closed'
                        }
                      >{regLabel}</button>
                    </td>
                    <td style={styles.td}>
                      {alreadyRegistered && !isCompleted && !isAdmin() ? (
                        hasPendingWithdrawal ? (
                          <span style={{ ...styles.tinyChip, background: '#fff3e0', color: '#e65100', fontSize: '0.68rem' }}>
                            ⏳ Withdrawal pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnregisterForOne(t.id)}
                            style={{ ...styles.tinyEnterBtn, background: '#c62828' }}
                            title="Request to withdraw from this tournament"
                          >✕ Unregister</button>
                        )
                      ) : alreadyRegistered && !isCompleted && isAdmin() ? (
                        <button
                          onClick={() => handleUnregisterForOne(t.id)}
                          style={{ ...styles.tinyEnterBtn, background: '#c62828' }}
                          title="Remove participant immediately (admin)"
                        >✕ Remove</button>
                      ) : (
                        <span style={{ fontSize: '0.66rem', color: '#bbb' }}>—</span>
                      )}
                    </td>
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
                      {isAdmin() && (
                        <button
                          onClick={() => {
                            setTEditForm({
                              status: t.status || 'registration_open',
                              registration_open: t.registration_open !== false,
                              start_date: t.start_date || '',
                            });
                            setEditTournamentId(t.id);
                          }}
                          style={{ ...styles.tinyIconBtn, color: '#5c6bc0', borderColor: '#c5cae9' }}
                          title="Edit status / registration / date"
                        >⚙️</button>
                      )}
                      {isAdmin() && (
                        <button
                          onClick={() => setTournamentToDelete(t)}
                          style={{ ...styles.tinyIconBtn, color: '#000000', borderColor: '#ffcdd2' }}
                          title="Delete tournament"
                        >🗑</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: '0.7rem', textAlign: 'right' }}>
            <button onClick={() => setShowRegisterModal(true)} style={styles.navyBtn}>
              {isAdmin() ? '🏆 Register for Multiple Tournaments' : '📝 Request Multiple Tournaments'}
            </button>
          </div>

        {/* ── Admin: Pending Registration Requests ─────────────────────── */}
        {isAdmin() && tournamentRegistrationRequests.filter(r => String(r.status||'').toLowerCase() === 'pending').length > 0 && (
          <div style={{ ...styles.card, background: '#fff8e1', marginTop: '1rem', borderRadius: 8, padding: '0.8rem 1rem' }}>
            <div style={{ ...styles.cardHeaderTitle, marginBottom: '0.6rem' }}>📋 Pending Registration Requests</div>
            {tournamentRegistrationRequests
              .filter(r => String(r.status || '').toLowerCase() === 'pending')
              .map(r => {
                const t = tournaments.find(x => x.id === r.tournament_id);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid #ffe082', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, minWidth: 120 }}>{getEmployeeName(r.employee_id)}</span>
                    <span style={{ color: '#888', fontSize: '0.78rem' }}>→ {t?.name || `Tournament #${r.tournament_id}`}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={async () => {
                          const res = await approveTournamentRegistration(r.id);
                          res.success ? showToast(`Approved ${getEmployeeName(r.employee_id)}`) : showToast(res.error || 'Failed', 'error');
                        }}
                        style={{ ...styles.tinyEnterBtn, background: '#2e7d32' }}
                      >✓ Approve</button>
                      <button
                        onClick={async () => {
                          const { error } = await import('../utils/supabase').then(m => m.supabase.from('tournament_registration_requests').delete().match({ id: r.id }));
                          if (!error) { showToast('Request rejected'); }
                        }}
                        style={{ ...styles.tinyEnterBtn, background: '#c62828' }}
                      >✕ Reject</button>
                    </div>
                  </div>
                );
              })
            }
          </div>
        )}

        {/* ── Admin: Pending Withdrawal Requests ───────────────────────── */}
        {isAdmin() && Object.values(withdrawalPendingByTournament).flat().length > 0 && (
          <div style={{ ...styles.card, background: '#fce4ec', marginTop: '0.6rem', borderRadius: 8, padding: '0.8rem 1rem' }}>
            <div style={{ ...styles.cardHeaderTitle, marginBottom: '0.6rem' }}>🚪 Pending Withdrawal Requests</div>
            {Object.values(withdrawalPendingByTournament).flat().map(p => {
              const t = tournaments.find(x => x.id === p.tournament_id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid #f48fb1', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, minWidth: 120 }}>{getEmployeeName(p.employee_id)}</span>
                  <span style={{ color: '#888', fontSize: '0.78rem' }}>wants to leave <strong>{t?.name || `Tournament #${p.tournament_id}`}</strong></span>
                  <span style={{ ...styles.tinyChip, background: '#fff3e0', color: '#e65100', fontSize: '0.68rem' }}>⚠ Tournament is live</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={async () => {
                        const res = await approveWithdrawalRequest(p.id);
                        res.success ? showToast(`${getEmployeeName(p.employee_id)} withdrawn from ${t?.name || 'tournament'}`, 'warning') : showToast(res.error || 'Failed', 'error');
                      }}
                      style={{ ...styles.tinyEnterBtn, background: '#c62828' }}
                    >✓ Approve Withdrawal</button>
                    <button
                      onClick={async () => {
                        const res = await rejectWithdrawalRequest(p.id);
                        res.success ? showToast(`Withdrawal rejected — ${getEmployeeName(p.employee_id)} stays enrolled`) : showToast(res.error || 'Failed', 'error');
                      }}
                      style={{ ...styles.tinyEnterBtn, background: '#5c6bc0' }}
                    >✕ Keep in Tournament</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderBracket = () => {
    if (tournaments.length === 0) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>No tournaments exist yet.</div>
        </div>
      );
    }
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#888' }}>Loading tournament data…</div>
        </div>
      );
    }
    // Derive match stats from completed matches including all team members.
    const participantStats = {};
    for (const m of matchesForActive) {
      if (m.status !== 'completed') continue;
      // Build full team rosters: captain + junction table players
      const teamAIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)]
        .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      const teamBIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)]
        .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
      const teamAWon = m.winner_employee_id === m.player_a_employee_id;
      [...teamAIds, ...teamBIds].forEach(pid => {
        if (!participantStats[pid]) participantStats[pid] = { played: 0, won: 0, lost: 0 };
        participantStats[pid].played += 1;
        const onTeamA = teamAIds.includes(pid);
        if ((onTeamA && teamAWon) || (!onTeamA && !teamAWon)) participantStats[pid].won += 1;
        else participantStats[pid].lost += 1;
      });
    }

    // Build a display label for a team: "Captain" for 1v1, "P1 & P2 & P3" for multi
    const teamLabel = (captainId, teamPlayers) => {
      if (!captainId) return 'TBD';
      if (!teamPlayers || teamPlayers.length === 0) return getEmployeeName(captainId);
      // teamPlayers from junction table includes captain too; deduplicate by position order
      const ids = teamPlayers.map(p => p.employee_id);
      // Ensure captain is first
      const ordered = [captainId, ...ids.filter(id => id !== captainId)];
      return ordered.map(id => getEmployeeName(id)).join(' & ');
    };

    const latestRound = roundGroups[roundGroups.length - 1];
    const latestRoundOpen = latestRound
      ? latestRound.matches.some((match) => !['completed', 'walkover', 'no_show', 'bye', 'draw', 'cancelled', 'rescheduled', 'disputed'].includes(String(match.status || '').toLowerCase()))
      : false;
    const canGenerateFixtures = isAdmin()
      && activeTournamentRecord?.status !== 'completed'
      && activeTournamentRecord?.registration_open === false
      && (
        activeTournamentFormat !== 'swiss'
          ? matchesForActive.length === 0
          : !latestRoundOpen
      );
    const generateLabel = activeTournamentFormat === 'swiss' && matchesForActive.length > 0
      ? 'Generate Next Swiss Round'
      : 'Generate Fixtures';

    const renderMatch = (m) => {
      // Phantom guard: TBD vs TBD should never appear in the DB with the new
      // engine, but skip rendering just in case.
      if (!m.player_a_employee_id && !m.player_b_employee_id) return null;

      const a = teamLabel(m.player_a_employee_id, m.team_a_players);
      const b = teamLabel(m.player_b_employee_id, m.team_b_players);
      const hasScore = m.score_a !== null && m.score_b !== null;
      const isFinal  = String(m.round || '').toUpperCase() === 'F';

      // A bye match has only one real player, or status is explicitly 'bye'.
      const isBye =
        String(m.status || '').toLowerCase() === 'bye' ||
        (!m.player_a_employee_id && !!m.player_b_employee_id) ||
        (!!m.player_a_employee_id && !m.player_b_employee_id);

      return (
        <div key={m.id} style={{
          ...styles.matchCard,
          border: isFinal ? '2px solid #f9a825' : isBye ? '1px dashed #b0bec5' : '1px solid #d0d0d0',
          opacity: isBye ? 0.82 : 1,
        }}>
          <div style={styles.matchLabel}>Match {m.match_code || m.match_number}</div>

          {/* Player A */}
          <div style={{
            ...styles.matchPlayer,
            background: hasScore && m.score_a > m.score_b ? '#e8f5e9' : 'transparent',
            color:      hasScore && m.score_a > m.score_b ? '#1b5e20' : '#212121',
            fontWeight: hasScore && m.score_a > m.score_b ? 700 : 500,
          }}>
            <span style={{ fontSize: '0.7rem' }}>{a}</span>
            <span>{m.score_a ?? '—'}</span>
          </div>

          {/* Player B — show "Bye" when slot is empty */}
          <div style={{
            ...styles.matchPlayer,
            background: hasScore && m.score_b > m.score_a ? '#e8f5e9' : 'transparent',
            color:      hasScore && m.score_b > m.score_a ? '#1b5e20'
                          : (isBye && !m.player_b_employee_id) ? '#9e9e9e' : '#212121',
            fontWeight: hasScore && m.score_b > m.score_a ? 700 : 500,
            fontStyle:  (isBye && !m.player_b_employee_id) ? 'italic' : 'normal',
          }}>
            <span style={{ fontSize: '0.7rem' }}>{b}</span>
            <span>{m.score_b ?? '—'}</span>
          </div>

          {/* Status line */}
          <div style={styles.matchMeta}>
            {m.status === 'completed'
              ? '✓ Final'
              : isBye
                ? '✓ Advanced by Bye'
                : m.status === 'walkover'
                  ? '↷ Walkover'
                  : m.status === 'live'
                    ? '● Live'
                    : '⏳ Pending'}
          </div>

          {/* Enter/Edit result — hidden for bye matches */}
          {!isBye && canEditMatch(m) && (
            <button
              onClick={() => openResultModal(m)}
              style={{ ...styles.tinyEnterBtn, marginTop: '0.4rem', width: '100%' }}
            >
              {m.status === 'completed' ? '✎ Edit Result' : '⏎ Enter Result'}
            </button>
          )}

          {/* Admin edit/delete — also hidden for bye matches */}
          {!isBye && isAdmin() && (
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
              <button
                onClick={() => openEditMatchModal(m)}
                style={{ ...styles.tinyEnterBtn, background: '#5c6bc0', flex: 1 }}
                title="Edit match players / schedule"
              >✎ Edit</button>
              <button
                onClick={() => setMatchToDelete(m)}
                style={{ ...styles.tinyEnterBtn, background: '#c62828', flex: 1 }}
                title="Delete this match"
              >🗑 Delete</button>
            </div>
          )}
        </div>
      );
    };

    // ── Round-Robin derived data ──────────────────────────────────────────
    // KO phase matches are identified by match_code prefix ("KO_"), NOT by
    // round value — because the DB constraint requires round ∈ {QF,SF,F,...}.
    const isRoundRobin = activeTournamentFormat === 'round_robin';

    const isKoMatch  = (m) => String(m.match_code || '').toUpperCase().startsWith('KO_');
    const isRrMatch  = (m) => String(m.round      || '').toUpperCase().startsWith('RR');

    const rrMatches = isRoundRobin ? matchesForActive.filter(isRrMatch)  : [];
    const koMatches = isRoundRobin ? matchesForActive.filter(isKoMatch)  : [];

    // For the RR fixture grid, exclude any KO phase matches (they share QF/SF/F round codes)
    const rrMatchGroups = isRoundRobin
      ? roundGroups.filter((g) => String(g.round).startsWith('RR'))
      : roundGroups;

    // Build KO bracket columns grouped by match_code prefix (KO_QF / KO_SF / KO_F)
    const koColKeys   = ['KO_QF', 'KO_SF', 'KO_F'];
    const koColLabels = { KO_QF: 'Quarter Final', KO_SF: 'Semi Finals', KO_F: 'Final' };
    const koColColors = { KO_QF: '#8e24aa',        KO_SF: '#618ff4',     KO_F: '#c81c1c' };

    const koMatchGroups = koColKeys.map((colKey) => ({
      key: colKey,
      label: koColLabels[colKey],
      matches: koMatches
        .filter((m) => String(m.match_code || '').toUpperCase().startsWith(colKey))
        .sort((a, b) => (a.match_number || 0) - (b.match_number || 0)),
    }));

    const rrStandings = isRoundRobin
      ? computeRoundRobinStandings(rrMatches, partsList)
      : [];

    const rrAllDone = rrMatches.length > 0 && rrMatches.every((m) =>
      ['completed', 'walkover', 'no_show', 'draw', 'bye', 'cancelled'].includes(
        String(m.status || '').toLowerCase()
      )
    );
    const hasKoPhase    = koMatches.length > 0;
    const canGenerateKo = isAdmin() && isRoundRobin && rrAllDone && !hasKoPhase;

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>

        {/* ── Round-Robin Standings Table ─────────────────────────────── */}
        {isRoundRobin && rrMatches.length > 0 && (
          <div className="clay-card" style={{ ...styles.card, background: '#e8f4fd' }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>📋 Round-Robin Standings</div>
              {canGenerateKo && (
                <button
                  onClick={async () => {
                    const result = await generateRoundRobinKnockout(activeTournamentRecord.id);
                    if (result.success) {
                      showToast('Knockout phase generated — Top 5 advance!');
                    } else {
                      showToast(result.error || 'Failed to generate knockout phase', 'error');
                    }
                  }}
                  style={{ ...styles.navyBtn, background: '#1b5e20' }}
                >
                  🏆 Generate Knockout Phase
                </button>
              )}
              {hasKoPhase && (
                <span style={{ ...styles.tinyChip, background: '#e8f5e9', color: '#2e7d32', fontSize: '0.72rem' }}>
                  ✓ Knockout phase active
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    {['Rank', 'Player', 'P', 'W', 'D', 'L', 'Pts', 'Qualify'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rrStandings.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1rem' }}>
                        No results yet.
                      </td>
                    </tr>
                  ) : rrStandings.map((row, i) => {
                    const qualifies = i < 5;
                    const isTop3    = i < 3;
                    return (
                      <tr
                        key={row.employee_id}
                        style={{
                          borderBottom: '1px solid #d0d0d0',
                          background: isTop3 ? '#f0fff4' : qualifies ? '#f5f5f5' : 'transparent',
                          opacity: qualifies ? 1 : 0.55,
                        }}
                      >
                        <td style={{ ...styles.td, fontWeight: 700, color: i === 0 ? '#f9a825' : i === 1 ? '#9e9e9e' : i === 2 ? '#d84315' : '#444' }}>
                          {i + 1}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600 }}>{getEmployeeName(row.employee_id)}</td>
                        <td style={styles.td}>{row.played}</td>
                        <td style={{ ...styles.td, color: '#2e7d32', fontWeight: 600 }}>{row.won}</td>
                        <td style={styles.td}>{row.drawn}</td>
                        <td style={{ ...styles.td, color: '#c62828' }}>{row.lost}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{row.points}</td>
                        <td style={styles.td}>
                          {qualifies ? (
                            <span style={{
                              ...styles.tinyChip,
                              background: isTop3 ? '#e8f5e9' : '#fff3e0',
                              color: isTop3 ? '#1b5e20' : '#e65100',
                            }}>
                              {isTop3 ? `Seed ${i + 1} — BYE` : `Seed ${i + 1}`}
                            </span>
                          ) : (
                            <span style={{ ...styles.tinyChip, background: '#ffebee', color: '#c62828' }}>Eliminated</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Knockout Bracket (round-robin → KO phase) ───────────────── */}
        {isRoundRobin && hasKoPhase && (
          <div className="clay-card" style={{ ...styles.card }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>🏆 Knockout Phase</div>
              <span style={{ fontSize: '0.7rem', color: '#888' }}>Top 5 · QF → SF → Final</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ ...styles.bracketGrid, gridTemplateColumns: 'repeat(3, 1fr)', minWidth: 720 }}>
                {koMatchGroups.map(({ key, label, matches: colMatches }) => (
                  <div key={key} style={styles.bracketCol}>
                    <div style={{
                      ...styles.bracketColHeader,
                      background: koColColors[key] || '#1a3c6e',
                      color: 'white',
                    }}>{label}</div>
                    <div style={{ ...styles.bracketColBody, justifyContent: 'center' }}>
                      {colMatches.length === 0 ? (
                        <div style={styles.emptyCol}>Awaiting results</div>
                      ) : (
                        colMatches.map(renderMatch)
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={styles.cardHeaderTitle}>📊 {isRoundRobin ? 'Round-Robin Fixtures' : 'Bracket / Fixtures'}</div>
              <select
                value={activeTournament || ''}
                onChange={(e) => setActiveTournament(e.target.value)}
                style={{ ...styles.formInput, width: 'auto', minWidth: 200, fontWeight: 600, color: '#1a3c6e', borderColor: '#1a3c6e' }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.game} · {STATUS_BADGE[t.status]?.label || t.status}
                  </option>
              ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              {activeTournamentRecord && (
                <span style={{ fontSize: '0.7rem', color: '#888' }}>
                  {activeTournamentRecord.format.replace('_', ' ').toUpperCase()}
                </span>
              )}
              {isAdmin() && activeTournamentRecord && (
                <button
                  onClick={async () => {
                    const result = await generateTournamentFixtures(activeTournamentRecord.id);
                    if (result.success) {
                      showToast(activeTournamentFormat === 'swiss' && matchesForActive.length > 0 ? 'Swiss round generated' : 'Fixtures generated');
                    } else {
                      showToast(result.error || 'Failed to generate fixtures', 'error');
                    }
                  }}
                  disabled={!canGenerateFixtures}
                  style={{
                    ...styles.navyBtn,
                    background: canGenerateFixtures ? '#1a3c6e' : '#9e9e9e',
                    opacity: canGenerateFixtures ? 1 : 0.55,
                    cursor: canGenerateFixtures ? 'pointer' : 'not-allowed',
                  }}
                >
                  {generateLabel}
                </button>
              )}
              {isAdmin() && (
                <button onClick={() => openNewMatchModal('QF')} style={styles.navyBtn}>+ Add Match</button>
              )}
              {isAdmin() && matchesForActive.length > 0 && (
                <button
                  onClick={async () => {
                    if (activeTournamentFormat === 'knockout') {
                      // Smart refresh: keeps completed matches, rebuilds only pending rounds.
                      const result = await refreshKnockoutFixtures(activeTournamentRecord.id);
                      if (result.success) {
                        showToast(result.message || 'Fixtures refreshed');
                      } else {
                        showToast(result.error || 'Refresh failed', 'error');
                      }
                    } else {
                      // Round-robin / Swiss: simple data reload is sufficient.
                      await refreshTournamentData();
                      showToast('Fixtures refreshed');
                    }
                  }}
                  style={{ ...styles.navyBtn, background: '#37474f' }}
                  title="Reload fixtures and participants from the database"
                >🔄 Refresh</button>
              )}
              {!isAdmin() && activeTournamentRecord?.status === 'registration_open' && (
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

          <div style={{ overflowX: 'auto' }}>
            {/* For RR tournaments, only show the RR fixture grid (KO shown above) */}
            <div style={{ ...styles.bracketGrid, minWidth: Math.max(4, (isRoundRobin ? rrMatchGroups : roundGroups).length) * 240 }}>
              {(isRoundRobin ? rrMatchGroups : roundGroups).length === 0 ? (
                <div style={{ ...styles.bracketColBody, gridColumn: '1 / -1' }}>
                  <div style={styles.emptyCol}>
                    No fixtures yet. {isAdmin() ? 'Use Generate Fixtures to create the bracket.' : 'Waiting for admin to generate fixtures.'}
                  </div>
                </div>
              ) : (
                (isRoundRobin ? rrMatchGroups : roundGroups).map((group, index) => (
                  <div key={group.round} style={styles.bracketCol}>
                    <div style={{
                      ...styles.bracketColHeader,
                      background: ['#c81c1c', '#618ff4', '#fbdd65', '#59f0a5', '#8e24aa', '#26a69a'][index % 6],
                    }}>{group.label}</div>
                    <div style={styles.bracketColBody}>
                      {group.matches.length === 0
                        ? <div style={styles.emptyCol}>No matches yet</div>
                        : group.matches.map(renderMatch)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="clay-card" style={{background:'#f3dcd6'}}>
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
                  {['#','Employee','Department','Registered Tournaments','Matches Played','Won','Lost','Status'].map(h => (
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
                    <td style={styles.td}>
                      {(() => {
                        const count = Object.values(partsByTournament).filter(list =>
                          list.some(x => x.employee_id?.toUpperCase() === p.employee_id?.toUpperCase())
                        ).length;
                        return (
                          <span
                            title={`Registered in ${count} active tournament(s)`}
                            style={{
                              ...styles.tinyChip,
                              background: count > 1 ? '#e3f2fd' : '#f5f5f5',
                              color: count > 1 ? '#1565c0' : '#666',
                              fontWeight: count > 1 ? 700 : 400,
                            }}
                          >
                            {count}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={styles.td}>{participantStats[p.employee_id]?.played ?? p.matches_played ?? 0}</td>
                    <td style={styles.td}>{participantStats[p.employee_id]?.won   ?? p.wins          ?? 0}</td>
                    <td style={styles.td}>{participantStats[p.employee_id]?.lost  ?? p.losses        ?? 0}</td>
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
      <div className="clay-card" style={{background:'#e6dd68'}}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Match Records — {activeTournamentRecord.name}</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                {['Round','Match','Player A','Score A','Score B','Player B','Played','Status','Result','Admin'].map((h, i) => (
                  <th key={i} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchesForActive.length === 0 ? (
                <tr><td colSpan="10" style={{ ...styles.td, textAlign: 'center', color: '#888', padding: '1rem' }}>No matches scheduled.</td></tr>
              ) : matchesForActive.map((m) => {
                const allowed = canEditMatch(m);
                return (
                <tr key={m.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={styles.td}>{m.round} · M{m.match_number}</td>
                  <td style={styles.td}><strong>{m.match_code || `M${m.match_number}`}</strong></td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_a_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_a_employee_id ? 700 : 500 }}>
                    {m.player_a_employee_id ? [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id).filter(id => id !== m.player_a_employee_id)].map(id => getEmployeeName(id)).join(' & ') : 'TBD'}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{m.score_a ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: '#1a3c6e' }}>{m.score_b ?? '—'}</td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_b_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_b_employee_id ? 700 : 500 }}>
                    {m.player_b_employee_id ? [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id).filter(id => id !== m.player_b_employee_id)].map(id => getEmployeeName(id)).join(' & ') : 'TBD'}
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
                  {/* Result entry — players or admin */}
                  <td style={styles.td}>
                    {allowed ? (
                      <button onClick={() => openResultModal(m)} style={styles.tinyEnterBtn}>
                        {m.status === 'completed' ? '✎ Result' : '⏎ Enter'}
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: '#bbb' }} title="Only the two players in this match (or an admin) can enter results">🔒</span>
                    )}
                  </td>
                  {/* Admin-only: edit match players/schedule + delete */}
                  <td style={styles.td}>
                    {isAdmin() ? (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => openEditMatchModal(m)}
                          style={{ ...styles.tinyIconBtn, color: '#5c6bc0', borderColor: '#c5cae9' }}
                          title="Edit match players / schedule"
                        >✎</button>
                        <button
                          onClick={() => setMatchToDelete(m)}
                          style={{ ...styles.tinyIconBtn, color: '#c62828', borderColor: '#ffcdd2' }}
                          title="Delete this match"
                        >🗑</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: '#bbb' }}>—</span>
                    )}
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

  const renderStopwatch = () => {
    return <StopwatchPanel matches={matchesForActive} tournament={activeTournamentRecord} getEmployeeName={getEmployeeName} />;
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
                  // ── Validate that a completed Final exists ──────────────
                  // Auto-population needs the Final (round F) with a result.
                  // If the Final hasn't been played yet, warn the admin and
                  // still open the modal so they can add 3rd place manually
                  // or pick winners by hand.
                  const finalMatch = matchesForActive.find(m => m.round === 'F' && m.status === 'completed');
                  const finalUnplayed = matchesForActive.find(m => m.round === 'F' && m.status !== 'completed');
                  if (!finalMatch && finalUnplayed) {
                    showToast('Final match hasn\'t been played yet. Record the Final result first, or add 3rd place manually below.', 'warning');
                  } else if (!finalMatch && !finalUnplayed) {
                    showToast('No Final match scheduled. You can still add 3rd place manually below.', 'warning');
                  }

                  // ── Compute per-player stats from completed matches ──────────
                  const statsMap = {};
                  for (const m of matchesForActive) {
                    if (m.status !== 'completed') continue;
                    const teamAIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)]
                      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
                    const teamBIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)]
                      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
                    const teamAWon = m.winner_employee_id === m.player_a_employee_id;
                    [...teamAIds, ...teamBIds].forEach(pid => {
                      if (!statsMap[pid]) statsMap[pid] = { played: 0, won: 0, lost: 0, points: 0 };
                      statsMap[pid].played += 1;
                      const onA = teamAIds.includes(pid);
                      if ((onA && teamAWon) || (!onA && !teamAWon)) {
                        statsMap[pid].won += 1;
                        statsMap[pid].points += 3;
                      } else {
                        statsMap[pid].lost += 1;
                      }
                    });
                  }

                  // ── Determine positions from bracket ────────────────────────
                  // 1st = winner of Final (round F)
                  // 2nd = loser of Final
                  // 3rd = winner of 3rd-place match (round 3RD) — optional
                  const thirdMatch = matchesForActive.find(m => m.round === '3RD' && m.status === 'completed');

                  const makeEntry = (empId, position) => {
                    const dept = employees.find(e => e.employee_code === empId)?.department || '—';
                    const s = statsMap[empId] || { played: 0, won: 0, lost: 0, points: 0 };
                    return {
                      employee_id: empId,
                      department: dept,
                      position,
                      matches_played: s.played,
                      wins: s.won,
                      losses: s.lost,
                      points: s.points,
                      prize_amount: '',          // admin fills this in
                      prize_description: '',     // derived on save
                    };
                  };

                  // Helper: get all player IDs for a side of a match (captain + team members)
                  const getTeamIds = (match, side) => {
                    if (side === 'A') {
                      return [match.player_a_employee_id, ...(match.team_a_players || []).map(p => p.employee_id)]
                        .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
                    } else {
                      return [match.player_b_employee_id, ...(match.team_b_players || []).map(p => p.employee_id)]
                        .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
                    }
                  };

                  const rows = [];

                  if (finalMatch) {
                    const winnerCaptainId = finalMatch.winner_employee_id;
                    const winnerSide = finalMatch.player_a_employee_id === winnerCaptainId ? 'A' : 'B';
                    const loserSide  = winnerSide === 'A' ? 'B' : 'A';

                    // All members of winning team → 1st place
                    getTeamIds(finalMatch, winnerSide).forEach(id => rows.push(makeEntry(id, 1)));
                    // All members of losing team → 2nd place
                    getTeamIds(finalMatch, loserSide).forEach(id => rows.push(makeEntry(id, 2)));
                  }

                  if (thirdMatch) {
                    const winnerCaptainId = thirdMatch.winner_employee_id;
                    const winnerSide = thirdMatch.player_a_employee_id === winnerCaptainId ? 'A' : 'B';
                    getTeamIds(thirdMatch, winnerSide).forEach(id => rows.push(makeEntry(id, 3)));
                  }

                  // Remove duplicates (safety) then sort by position
                  const seen = new Set();
                  const deduped = rows.filter(r => { if (seen.has(r.employee_id)) return false; seen.add(r.employee_id); return true; });
                  deduped.sort((a, b) => a.position - b.position);

                  // If 1st/2nd couldn't be auto-derived (no completed Final),
                  // but a 3RD match was completed, the winner of that 3RD match
                  // is a real 3rd place — keep it. Admin can still add 1st/2nd
                  // manually by editing the rows, or the bracket needs the Final
                  // result recorded.
                  setFinalForm(deduped);
                }}
                style={styles.navyBtn}
              >📣 Declare Results</button>
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
                      {/* Admin: can download certificate for ANY participant.
                          Non-admin: can only download their OWN certificate. */}
                      {(isAdmin() || r.employee_id?.toUpperCase() === currentEmpId.toUpperCase()) ? (
                        <button
                          disabled={certPrinting === r.id}
                          onClick={async () => {
                            setCertPrinting(r.id);
                            const result = await generateCertificate({
                              employeeName:   getEmployeeName(r.employee_id),
                              employeeId:     r.employee_id,
                              tournamentId:   activeTournament,
                              tournamentName: activeTournamentRecord?.name || '',
                              position:       r.position,
                              issuedBy:       currentEmpId,
                            });
                            setCertPrinting(null);
                            if (result.success) {
                              showToast(
                                isAdmin() && r.employee_id?.toUpperCase() !== currentEmpId.toUpperCase()
                                  ? `Certificate downloaded for ${getEmployeeName(r.employee_id)}!`
                                  : 'Your certificate has been downloaded!'
                              );
                            } else {
                              showToast(result.error || 'Failed to generate certificate', 'error');
                            }
                          }}
                          style={{
                            ...styles.tinyEnterBtn,
                            background: certPrinting === r.id ? '#888' : '#1a3c6e',
                            opacity: certPrinting === r.id ? 0.7 : 1,
                            cursor: certPrinting === r.id ? 'wait' : 'pointer',
                            minWidth: 90,
                          }}
                        >
                          {certPrinting === r.id ? '⏳ Generating…' : '🏅 Download'}
                        </button>
                      ) : (
                        <span
                          style={{ fontSize: '0.66rem', color: '#bbb' }}
                          title="Certificate available only for your own results"
                        >—</span>
                      )}
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
  // Register for a single tournament from the active-tournaments table.
  const handleRegisterForOne = async (tournamentId) => {
    if (!currentEmpId) {
      showToast('Your profile is missing an employee ID', 'error');
      return;
    }
    const result = await registerForTournament(tournamentId, currentEmpId);
    if (result.success) {
      const t = tournaments.find(x => x.id === tournamentId);
      showToast(
        result.pending
          ? `Request sent for "${t?.name || 'tournament'}". Waiting for approval.`
          : `Registered for "${t?.name || 'tournament'}"!`
      );
    } else {
      showToast(result.error || 'Failed to register', 'error');
    }
  };

  // Unregister from a single tournament from the active-tournaments table.
  const handleUnregisterForOne = async (tournamentId) => {
    if (!currentEmpId) {
      showToast('Your profile is missing an employee ID', 'error');
      return;
    }
    const result = await unregisterFromTournament(tournamentId, currentEmpId);
    if (result.success) {
      const t = tournaments.find(x => x.id === tournamentId);
      showToast(`Unregistered from "${t?.name || 'tournament'}"`, 'warning');
    } else {
      showToast(result.error || 'Failed to unregister', 'error');
    }
  };

  // Register for many tournaments in one click from the batch modal.
  const handleBatchRegister = async (tournamentIds) => {
    if (!currentEmpId) {
      showToast('Your profile is missing an employee ID', 'error');
      return;
    }
    if (!tournamentIds || tournamentIds.length === 0) return;

    let successCount = 0;
    const failures = [];
    for (const tid of tournamentIds) {
      const r = await registerForTournament(tid, currentEmpId);
      if (r.success) successCount += 1;
      else failures.push({ id: tid, error: r.error });
    }

    if (successCount > 0 && failures.length === 0) {
      showToast(
        isAdmin()
          ? `Registered for ${successCount} tournament${successCount > 1 ? 's' : ''}!`
          : `Request sent for ${successCount} tournament${successCount > 1 ? 's' : ''}!`
      );
      setShowRegisterModal(false);
    } else if (successCount > 0 && failures.length > 0) {
      const t = tournaments.find(x => x.id === failures[0].id);
      showToast(
        `${isAdmin() ? 'Registered' : 'Requested'} for ${successCount}. "${t?.name}" failed: ${failures[0].error}`,
        'warning'
      );
      setShowRegisterModal(false);
    } else {
      const t = tournaments.find(x => x.id === failures[0].id);
      showToast(`Failed to register: ${failures[0]?.error || 'unknown error'}`.replace(`"${t?.name}"`, `"${t?.name}"`));
    }
  };

  const handleConfirmDelete = async () => {
    if (!tournamentToDelete) return;
    const t = tournamentToDelete;
    const result = await deleteTournament(t.id);
    if (result.success) {
      showToast(`"${t.name}" deleted`);
      setTournamentToDelete(null);
      // If we just deleted the active tournament, fall back to the first one remaining.
      if (activeTournament === t.id) {
        const remaining = tournaments.filter(x => x.id !== t.id);
        setActiveTournament(remaining.length > 0 ? remaining[0].id : null);
      }
    } else {
      showToast(result.error || 'Failed to delete tournament', 'error');
    }
  };

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
      players_per_team: parseInt(tForm.players_per_team, 10) || 1,
    });
    if (result.success) {
      showToast(`Tournament "${tForm.name}" created!`);
      setShowNewTournamentModal(false);
      setTForm({ name: '', game: 'Carrom', format: 'knockout', players_per_team: 1, start_date: '', end_date: '', max_participants: 8, prize_pool: '', description: '' });
      if (result.data?.id) setActiveTournament(result.data.id);
    } else {
      showToast(result.error || 'Failed to create tournament', 'error');
    }
  };

  // ── Edit match (admin) — pre-fills eForm from the existing match ─────────
  const openEditMatchModal = (match) => {
    const ppt = activeTournamentRecord?.players_per_team || 1;
    const teamA = [
      match.player_a_employee_id,
      ...(match.team_a_players || []).map(p => p.employee_id).filter(id => id !== match.player_a_employee_id),
    ].filter(Boolean);
    const teamB = [
      match.player_b_employee_id,
      ...(match.team_b_players || []).map(p => p.employee_id).filter(id => id !== match.player_b_employee_id),
    ].filter(Boolean);

    // Pad arrays to players_per_team length so all slots are rendered
    const pad = (arr, len) => [...arr, ...Array(Math.max(0, len - arr.length)).fill('')];

    setEForm({
      match_code: match.match_code || '',
      round: match.round || 'QF',
      match_number: match.match_number || 1,
      scheduled_at: match.scheduled_at
        ? (() => {
            // datetime-local input expects "YYYY-MM-DDTHH:mm" in local time.
            // Format the stored UTC value in IST (Asia/Kolkata) for the input.
            const d = new Date(match.scheduled_at);
            const parts = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Kolkata',
              year: 'numeric', month: '2-digit', day: '2-digit',
              hour: '2-digit', minute: '2-digit', hour12: false,
            }).formatToParts(d);
            const get = (type) => parts.find(p => p.type === type)?.value ?? '00';
            return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
          })()
        : '',
      team_a: pad(teamA, ppt),
      team_b: pad(teamB, ppt),
    });
    setEditMatchId(match.id);
  };

  const handleUpdateMatch = async () => {
    if (!editMatchId) return;
    const ppt = activeTournamentRecord?.players_per_team || 1;
    const teamA = (eForm.team_a || []).filter(Boolean);
    const teamB = (eForm.team_b || []).filter(Boolean);

    if (teamA.length === 0 || teamB.length === 0) {
      showToast('At least one player per team is required', 'error');
      return;
    }

    const result = await updateTournamentMatch(editMatchId, {
      match_code: eForm.match_code,
      round: eForm.round,
      match_number: parseInt(eForm.match_number, 10) || 1,
      scheduled_at: eForm.scheduled_at
        ? new Date(eForm.scheduled_at + ':00+05:30').toISOString()
        : null,
      team_a_players: teamA,
      team_b_players: teamB,
    });

    if (result.success) {
      showToast('Match updated');
      setEditMatchId(null);
    } else {
      showToast(result.error || 'Failed to update match', 'error');
    }
  };

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return;
    const result = await deleteTournamentMatch(matchToDelete.id);
    if (result.success) {
      showToast(`Match "${matchToDelete.match_code || `M${matchToDelete.match_number}`}" deleted`, 'warning');
      setMatchToDelete(null);
    } else {
      showToast(result.error || 'Failed to delete match', 'error');
    }
  };

  const openNewMatchModal = (round) => {
    const ppt = activeTournamentRecord?.players_per_team || 1;
    setMForm({
      match_code: `${round}${matchesForActive.filter(m => m.round === round).length + 1}`,
      round, match_number: matchesForActive.filter(m => m.round === round).length + 1,
      scheduled_at: '',
      team_a: Array(ppt).fill(''),
      team_b: Array(ppt).fill(''),
    });
    setShowNewMatchModal(true);
  };

  const handleCreateMatch = async () => {
    if (!activeTournament) return;
    const ppt = activeTournamentRecord?.players_per_team || 1;
    const teamA = (mForm.team_a || []).filter(Boolean);
    const teamB = (mForm.team_b || []).filter(Boolean);

    if (teamA.length === 0 || teamB.length === 0) {
      showToast('At least one player per team is required', 'error');
      return;
    }
    if (ppt > 1 && (teamA.length < 1 || teamB.length < 1)) {
      showToast('Captain (Player 1) is required for each team', 'error');
      return;
    }

    // Captain goes into the FK column; all players go into junction table.
    const captainA = teamA[0];
    const captainB = teamB[0];

    const result = await addTournamentMatch({
      tournament_id: activeTournament,
      match_code: mForm.match_code,
      round: mForm.round,
      match_number: parseInt(mForm.match_number, 10) || 1,
      player_a_employee_id: captainA,
      player_b_employee_id: captainB,
      scheduled_at: mForm.scheduled_at
        ? new Date(mForm.scheduled_at + ':00+05:30').toISOString()
        : null,
      // Full rosters for junction table
      team_a_players: teamA,
      team_b_players: teamB,
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
      result_type: String(match.status || '').toLowerCase() === 'draw'
        ? 'draw'
        : String(match.status || '').toLowerCase() === 'walkover'
          ? 'walkover'
          : String(match.status || '').toLowerCase() === 'rescheduled'
            ? 'rescheduled'
            : String(match.status || '').toLowerCase() === 'cancelled'
              ? 'cancelled'
              : String(match.status || '').toLowerCase() === 'disputed'
                ? 'disputed'
                : String(match.status || '').toLowerCase() === 'no_show'
                  ? 'no_show'
                  : 'completed',
      score_a: match.score_a ?? '',
      score_b: match.score_b ?? '',
      winner: match.winner_employee_id || '',
      duration: match.duration_seconds || '',
      absent_participant_employee_id: '',
      reason: '',
      notes: '',
      scheduled_at: match.scheduled_at ? match.scheduled_at.slice(0, 16) : '',
    });
  };

  const handleSaveResult = async () => {
    if (rForm.result_type === 'completed' && !rForm.winner) {
      showToast('Pick a winner', 'error');
      return;
    }
    const result = await recordMatchResult(resultMatchId, {
      result_type: rForm.result_type,
      score_a: parseInt(rForm.score_a, 10) || 0,
      score_b: parseInt(rForm.score_b, 10) || 0,
      winner_employee_id: rForm.winner,
      duration_seconds: parseInt(rForm.duration, 10) || null,
      absent_participant_employee_id: rForm.absent_participant_employee_id,
      reason: rForm.reason,
      notes: rForm.notes,
      scheduled_at: rForm.scheduled_at ? new Date(rForm.scheduled_at + ':00+05:30').toISOString() : null,
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
    // Validate: any manual position (1st / 2nd / 3rd) must have a player selected.
    const incompleteManual = finalForm.find(r => r._manual && !r.employee_id);
    if (incompleteManual) {
      const pos = incompleteManual.position;
      const label = pos === 1 ? '1st' : pos === 2 ? '2nd' : `${pos}th`;
      showToast(`Please select a player for ${label} place or remove the entry`, 'error');
      return;
    }
    // Strip internal _manual flag before persisting
    const payload = finalForm.map(({ _manual, ...rest }) => ({
      ...rest,
      prize_amount: parseInt(rest.prize_amount, 10) || 0,
      prize_description: rest.prize_amount ? `₹${rest.prize_amount}` : rest.prize_description || '',
    }));
    const result = await declareFinalResults(activeTournament, payload);
    if (result.success) {
      showToast('Final results declared!');
      setFinalForm([]);
    } else {
      showToast(result.error || 'Failed to declare final results', 'error');
    }
  };

  // ── Edit tournament meta (admin) ─────────────────────────────────────────
  const handleUpdateTournamentMeta = async () => {
    const base = tournaments.find(t => t.id === editTournamentId);
    if (!base) return;
    const result = await updateTournament(editTournamentId, {
      ...base,
      status: tEditForm.status,
      registration_open: tEditForm.registration_open,
      start_date: tEditForm.start_date,
    });
    if (result.success) {
      showToast('Tournament updated');
      setEditTournamentId(null);
    } else {
      showToast(result.error || 'Failed to update tournament', 'error');
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

      {/* Admin: Edit Tournament Status / Registration Modal */}
      {editTournamentId && isAdmin() && (() => {
        const t = tournaments.find(x => x.id === editTournamentId);
        return (
          <div
            onClick={(e) => { if (e.target === e.currentTarget) setEditTournamentId(null); }}
            style={styles.modalBackdrop}
          >
            <div style={{ ...styles.modalCard, maxWidth: 420 }}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                  ⚙️ Edit Tournament — {t?.name}
                </h3>
                <button onClick={() => setEditTournamentId(null)} style={styles.modalClose}>✕</button>
              </div>
              <div style={{ padding: '1rem', display: 'grid', gap: '0.85rem' }}>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Status</label>
                  <select
                    style={styles.formInput}
                    value={tEditForm.status}
                    onChange={(e) => setTEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="draft">Draft</option>
                    <option value="registration_open">Registration Open</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Registration Open</label>
                  <select
                    style={styles.formInput}
                    value={tEditForm.registration_open ? 'true' : 'false'}
                    onChange={(e) => setTEditForm(f => ({ ...f, registration_open: e.target.value === 'true' }))}
                  >
                    <option value="true">Yes — open for registration</option>
                    <option value="false">No — registration closed</option>
                  </select>
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Start Date</label>
                  <input
                    type="date"
                    style={styles.formInput}
                    value={tEditForm.start_date}
                    onChange={(e) => setTEditForm(f => ({ ...f, start_date: e.target.value }))}
                  />
                </div>
                <div style={{
                  fontSize: '0.68rem', color: '#7b5800',
                  background: '#fff8e1', borderRadius: 4,
                  padding: '0.55rem 0.7rem', border: '1px solid #ffe082',
                  lineHeight: 1.5,
                }}>
                  💡 <strong>To unlock Generate Fixtures:</strong> set Status → <em>Registration Open</em>, Registration → <em>Closed</em>, Start Date → <em>today or earlier</em>.
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setEditTournamentId(null)} style={styles.outlineBtn}>Cancel</button>
                <button onClick={handleUpdateTournamentMeta} style={styles.navyBtn}>Save Changes</button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <label style={styles.formLabel}>Players Per Team</label>
                  <select style={styles.formInput} value={tForm.players_per_team}
                          onChange={(e) => setTForm(f => ({ ...f, players_per_team: parseInt(e.target.value, 10) }))}>
                    <option value={1}>1 — Singles (1v1)</option>
                    <option value={2}>2 — Doubles (2v2)</option>
                    <option value={3}>3 — Triples (3v3)</option>
                  </select>
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
              {(() => {
                const ppt = activeTournamentRecord?.players_per_team || 1;
                // Collect all currently selected IDs to prevent duplicates across teams
                const allSelected = [
                  ...(mForm.team_a || []),
                  ...(mForm.team_b || []),
                ].filter(Boolean);

                const availableFor = (team, slotIdx) =>
                  partsList.filter(p => {
                    const id = p.employee_id;
                    // Allow the currently selected value in this slot
                    const currentVal = team === 'A' ? mForm.team_a[slotIdx] : mForm.team_b[slotIdx];
                    if (id === currentVal) return true;
                    return !allSelected.includes(id);
                  });

                const setSlot = (team, idx, val) => {
                  setMForm(f => {
                    const arr = team === 'A' ? [...(f.team_a || [])] : [...(f.team_b || [])];
                    arr[idx] = val;
                    return team === 'A' ? { ...f, team_a: arr } : { ...f, team_b: arr };
                  });
                };

                return (
                  <div style={styles.formGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Round</label>
                      <input
                        style={styles.formInput}
                        value={mForm.round}
                        onChange={(e) => setMForm(f => ({ ...f, round: e.target.value.toUpperCase() }))}
                        placeholder="QF, SF, F, R16, SW1"
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Match Code</label>
                      <input style={styles.formInput} value={mForm.match_code}
                             onChange={(e) => setMForm(f => ({ ...f, match_code: e.target.value }))} />
                    </div>

                    {/* Team A */}
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <div style={{ background: '#e8eef7', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #c5d4ec' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a3c6e', marginBottom: '0.45rem' }}>
                          🔵 Team A
                          <span style={{ fontWeight: 400, color: '#666' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {ppt === 1 ? 'Player A *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1}${idx === 0 ? ' *' : ' (optional)'}`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(mForm.team_a || [])[idx] || ''}
                                onChange={(e) => setSlot('A', idx, e.target.value)}
                              >
                                <option value="">{idx === 0 ? '— select —' : '— none —'}</option>
                                {availableFor('A', idx).map(p => (
                                  <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Team B */}
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <div style={{ background: '#fef3e2', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #f0d49a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c47f00', marginBottom: '0.45rem' }}>
                          🟠 Team B
                          <span style={{ fontWeight: 400, color: '#666' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {ppt === 1 ? 'Player B *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1}${idx === 0 ? ' *' : ' (optional)'}`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(mForm.team_b || [])[idx] || ''}
                                onChange={(e) => setSlot('B', idx, e.target.value)}
                              >
                                <option value="">{idx === 0 ? '— select —' : '— none —'}</option>
                                {availableFor('B', idx).map(p => (
                                  <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Scheduled Time</label>
                      <input style={styles.formInput} type="datetime-local" value={mForm.scheduled_at}
                             onChange={(e) => setMForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowNewMatchModal(false)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleCreateMatch} style={styles.navyBtn}>Add Match</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal (admin only) */}
      {editMatchId && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setEditMatchId(null); }} style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>✎ Edit Match</h3>
              <button onClick={() => setEditMatchId(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const ppt = activeTournamentRecord?.players_per_team || 1;
                const allSelected = [
                  ...(eForm.team_a || []),
                  ...(eForm.team_b || []),
                ].filter(Boolean);

                const availableFor = (team, slotIdx) =>
                  partsList.filter(p => {
                    const id = p.employee_id;
                    const currentVal = team === 'A' ? eForm.team_a[slotIdx] : eForm.team_b[slotIdx];
                    if (id === currentVal) return true;
                    return !allSelected.includes(id);
                  });

                const setSlot = (team, idx, val) => {
                  setEForm(f => {
                    const arr = team === 'A' ? [...(f.team_a || [])] : [...(f.team_b || [])];
                    arr[idx] = val;
                    return team === 'A' ? { ...f, team_a: arr } : { ...f, team_b: arr };
                  });
                };

                return (
                  <div style={styles.formGrid}>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Round</label>
                      <input
                        style={styles.formInput}
                        value={eForm.round}
                        onChange={(e) => setEForm(f => ({ ...f, round: e.target.value.toUpperCase() }))}
                        placeholder="QF, SF, F, R16, SW1"
                      />
                    </div>
                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Match Code</label>
                      <input style={styles.formInput} value={eForm.match_code}
                             onChange={(e) => setEForm(f => ({ ...f, match_code: e.target.value }))} />
                    </div>

                    {/* Team A */}
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <div style={{ background: '#e8eef7', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #c5d4ec' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#1a3c6e', marginBottom: '0.45rem' }}>
                          🔵 Team A
                          <span style={{ fontWeight: 400, color: '#666' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {ppt === 1 ? 'Player A *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1} (optional)`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(eForm.team_a || [])[idx] || ''}
                                onChange={(e) => setSlot('A', idx, e.target.value)}
                              >
                                <option value="">{idx === 0 ? '— select —' : '— none —'}</option>
                                {availableFor('A', idx).map(p => (
                                  <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Team B */}
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <div style={{ background: '#fef3e2', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #f0d49a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#c47f00', marginBottom: '0.45rem' }}>
                          🟠 Team B
                          <span style={{ fontWeight: 400, color: '#666' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {ppt === 1 ? 'Player B *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1} (optional)`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(eForm.team_b || [])[idx] || ''}
                                onChange={(e) => setSlot('B', idx, e.target.value)}
                              >
                                <option value="">{idx === 0 ? '— select —' : '— none —'}</option>
                                {availableFor('B', idx).map(p => (
                                  <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Scheduled Time</label>
                      <input style={styles.formInput} type="datetime-local" value={eForm.scheduled_at}
                             onChange={(e) => setEForm(f => ({ ...f, scheduled_at: e.target.value }))} />
                    </div>
                  </div>
                );
              })()}
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setEditMatchId(null)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleUpdateMatch} style={styles.navyBtn}>Save Changes</button>
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
                const teamAIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)].filter(Boolean);
                const teamBIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)].filter(Boolean);
                const teamAOption = teamAIds.length > 0 ? teamAIds[0] : '';
                const teamBOption = teamBIds.length > 0 ? teamBIds[0] : '';
                const showScoreFields = ['completed', 'draw', 'walkover', 'no_show'].includes(rForm.result_type);
                const showWinnerField = ['completed', 'walkover', 'no_show'].includes(rForm.result_type);
                const showReasonField = ['walkover', 'rescheduled', 'cancelled', 'disputed', 'no_show'].includes(rForm.result_type);
                const showScheduleField = rForm.result_type === 'rescheduled';
                return (
                  <div style={styles.formGrid}>
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Result Type</label>
                      <select
                        style={styles.formInput}
                        value={rForm.result_type}
                        onChange={(e) => setRForm(f => ({
                          ...f,
                          result_type: e.target.value,
                          winner: e.target.value === 'draw' ? '' : f.winner,
                        }))}
                      >
                        <option value="completed">Completed</option>
                        <option value="draw">Draw</option>
                        <option value="walkover">Walkover</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="disputed">Disputed</option>
                      </select>
                    </div>

                    {showScoreFields && (
                      <>
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
                      </>
                    )}

                    {showWinnerField && (
                      <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>Winner</label>
                        <select style={styles.formInput} value={rForm.winner}
                                onChange={(e) => setRForm(f => ({ ...f, winner: e.target.value }))}>
                          <option value="">— select —</option>
                          <option value={teamAOption}>
                            {(() => {
                              const ids = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id).filter(id => id !== m.player_a_employee_id)];
                              return ids.map(id => getEmployeeName(id)).join(' & ') || 'Team A';
                            })()}
                          </option>
                          <option value={teamBOption}>
                            {(() => {
                              const ids = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id).filter(id => id !== m.player_b_employee_id)];
                              return ids.map(id => getEmployeeName(id)).join(' & ') || 'Team B';
                            })()}
                          </option>
                        </select>
                      </div>
                    )}

                    {rForm.result_type === 'no_show' && (
                      <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>Absent Participant</label>
                        <select
                          style={styles.formInput}
                          value={rForm.absent_participant_employee_id}
                          onChange={(e) => {
                            const absent = e.target.value;
                            setRForm(f => ({
                              ...f,
                              absent_participant_employee_id: absent,
                              winner: absent && absent === m.player_a_employee_id ? teamBOption : absent && absent === m.player_b_employee_id ? teamAOption : f.winner,
                            }));
                          }}
                        >
                          <option value="">— select —</option>
                          <option value={m.player_a_employee_id}>{getEmployeeName(m.player_a_employee_id)}</option>
                          <option value={m.player_b_employee_id}>{getEmployeeName(m.player_b_employee_id)}</option>
                        </select>
                      </div>
                    )}

                    {showReasonField && (
                      <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>
                          {rForm.result_type === 'rescheduled' ? 'Reason' : rForm.result_type === 'no_show' ? 'Remarks' : 'Reason'}
                        </label>
                        <input
                          style={styles.formInput}
                          value={rForm.reason}
                          onChange={(e) => setRForm(f => ({ ...f, reason: e.target.value }))}
                        />
                      </div>
                    )}

                    {showScheduleField && (
                      <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>New Date & Time</label>
                        <input
                          style={styles.formInput}
                          type="datetime-local"
                          value={rForm.scheduled_at}
                          onChange={(e) => setRForm(f => ({ ...f, scheduled_at: e.target.value }))}
                        />
                      </div>
                    )}

                    <div style={styles.formRow}>
                      <label style={styles.formLabel}>Duration (seconds)</label>
                      <input style={styles.formInput} type="number" min="0" value={rForm.duration}
                             onChange={(e) => setRForm(f => ({ ...f, duration: e.target.value }))} />
                    </div>
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Notes</label>
                      <textarea
                        style={{ ...styles.formInput, minHeight: 64, resize: 'vertical' }}
                        value={rForm.notes}
                        onChange={(e) => setRForm(f => ({ ...f, notes: e.target.value }))}
                      />
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

      {/* Final results modal — admin only */}
      {finalForm.length > 0 && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setFinalForm([]); }} style={styles.modalBackdrop}>
          <div style={{ ...styles.modalCard, maxWidth: 700 }}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>📣 Declare Final Results</h3>
              <button onClick={() => setFinalForm([])} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', maxHeight: '62vh', overflowY: 'auto' }}>

              {/* Info banner */}
              <div style={{ background: '#e8eef7', borderRadius: 6, padding: '0.55rem 0.75rem', fontSize: '0.72rem', color: '#1a3c6e', marginBottom: '0.9rem', lineHeight: 1.5 }}>
                <strong>Auto-populated from bracket:</strong> Positions and match stats are taken from completed fixtures.
                Only enter the <strong>prize money (₹)</strong> for each winner. Add 3rd place manually if needed.
              </div>

              {/* Position cards — grouped by position so team members share one card */}
              {(() => {
                // Group rows by position
                const positions = [...new Set(finalForm.map(r => r.position))].sort((a, b) => a - b);
                return (
                  <div style={{ display: 'grid', gap: '0.6rem' }}>
                    {positions.map(pos => {
                      const members = finalForm.filter(r => r.position === pos);
                      const firstMember = members[0];
                      const isManual = firstMember?._manual;
                      const medal = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `#${pos}`;
                      const cardBg = pos === 1 ? '#fff8e1' : pos === 2 ? '#f5f5f5' : pos === 3 ? '#fff3e0' : '#fafafa';
                      const borderColor = pos === 1 ? '#f9a825' : pos === 2 ? '#b0bec5' : pos === 3 ? '#d84315' : '#d0d0d0';
                      // Shared prize amount — use first member's value
                      const sharedPrize = firstMember?.prize_amount ?? '';

                      return (
                        <div key={pos} style={{ background: cardBg, border: `1.5px solid ${borderColor}`, borderRadius: 8, padding: '0.75rem 1rem' }}>

                          {/* Header row: medal + position label + remove btn */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{medal}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e1e2f' }}>
                              {pos === 1 ? '1st Place' : pos === 2 ? '2nd Place' : pos === 3 ? '3rd Place' : `${pos}th Place`}
                            </span>
                            {isManual && (
                              <button
                                onClick={() => setFinalForm(f => f.filter(r => r.position !== pos))}
                                style={{ ...styles.tinyIconBtn, color: '#c62828', borderColor: '#ffcdd2', fontSize: '0.7rem', marginLeft: 'auto' }}
                                title="Remove this position"
                              >✕ Remove</button>
                            )}
                          </div>

                          {/* Player rows */}
                          <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '0.6rem' }}>
                            {isManual ? (
                              /* Manual 3rd: dropdown to pick player */
                              <select
                                style={{ ...styles.formInput, fontWeight: 600 }}
                                value={firstMember?.employee_id || ''}
                                onChange={(e) => {
                                  const empId = e.target.value;
                                  if (!empId) return;
                                  const statsMap = {};
                                  for (const m of matchesForActive) {
                                    if (m.status !== 'completed') continue;
                                    const aIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)]
                                      .filter(Boolean).filter((v, idx, a) => a.indexOf(v) === idx);
                                    const bIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)]
                                      .filter(Boolean).filter((v, idx, a) => a.indexOf(v) === idx);
                                    const aWon = m.winner_employee_id === m.player_a_employee_id;
                                    [...aIds, ...bIds].forEach(pid => {
                                      if (!statsMap[pid]) statsMap[pid] = { played: 0, won: 0, lost: 0, points: 0 };
                                      statsMap[pid].played += 1;
                                      const onA = aIds.includes(pid);
                                      if ((onA && aWon) || (!onA && !aWon)) { statsMap[pid].won += 1; statsMap[pid].points += 3; }
                                      else statsMap[pid].lost += 1;
                                    });
                                  }
                                  const s = statsMap[empId] || { played: 0, won: 0, lost: 0, points: 0 };
                                  const dept = employees.find(e => e.employee_code === empId)?.department || '—';
                                  setFinalForm(f => f.map(r => r.position === pos && r._manual
                                    ? { ...r, employee_id: empId, department: dept, matches_played: s.played, wins: s.won, losses: s.lost, points: s.points }
                                    : r));
                                }}
                              >
                                <option value="">{`— select ${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : 'rd'} place player —`}</option>
                                {partsList
                                  .filter(p => !finalForm.some(r => r.position !== pos && r.employee_id === p.employee_id))
                                  .map(p => (
                                    <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                  ))}
                              </select>
                            ) : (
                              /* Auto-populated: show each team member with their stats */
                              members.map(member => (
                                <div key={member.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.3rem 0' }}>
                                  {/* Name + dept */}
                                  <div style={{ minWidth: 130, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#1e1e2f' }}>{getEmployeeName(member.employee_id)}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#777' }}>{member.department}</div>
                                  </div>
                                  {/* Per-player stats */}
                                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                    {[
                                      { label: 'Played', val: member.matches_played },
                                      { label: 'Won',    val: member.wins },
                                      { label: 'Lost',   val: member.losses },
                                      { label: 'Pts',    val: member.points },
                                    ].map(({ label, val }) => (
                                      <div key={label} style={{ textAlign: 'center', minWidth: 36 }}>
                                        <div style={{ fontSize: '0.58rem', color: '#999', textTransform: 'uppercase' }}>{label}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1a3c6e' }}>{val ?? 0}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Shared prize money input for this position */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: `1px dashed ${borderColor}`, paddingTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.68rem', color: '#555', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              Prize Money (₹) {members.length > 1 ? '— per player' : ''}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d0d0d0', borderRadius: 4, overflow: 'hidden', background: 'white' }}>
                              <span style={{ padding: '0 0.35rem', color: '#888', fontSize: '0.75rem', background: '#f5f5f5', borderRight: '1px solid #d0d0d0', userSelect: 'none' }}>₹</span>
                              <input
                                style={{ ...styles.formInput, border: 'none', width: 90, padding: '0.28rem 0.4rem' }}
                                type="number" min="0" placeholder="0"
                                value={sharedPrize}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  // Apply same prize to all members of this position
                                  setFinalForm(f => f.map(r => r.position === pos
                                    ? { ...r, prize_amount: val, prize_description: val ? `₹${val}` : '' }
                                    : r));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Add manual position buttons — only for positions not already present.
                  Lets admin fill in podium slots when the bracket didn't have a Final
                  or 3rd-place match (e.g. round-robin, or only 4 players). */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {[1, 2, 3].filter(pos => !finalForm.some(r => r.position === pos)).map(pos => {
                  const labels = { 1: '🥇 1st Place', 2: '🥈 2nd Place', 3: '🥉 3rd Place' };
                  return (
                    <button
                      key={pos}
                      onClick={() => setFinalForm(f => [...f, {
                        employee_id: '', department: '—', position: pos,
                        matches_played: 0, wins: 0, losses: 0, points: 0,
                        prize_amount: '', prize_description: '', _manual: true,
                      }])}
                      style={{ ...styles.outlineBtn, flex: 1, fontSize: '0.72rem' }}
                    >
                      + Add {labels[pos]} (Manual)
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setFinalForm([])} style={styles.outlineBtn}>Cancel</button>
              <button
                onClick={handleDeclareFinal}
                disabled={finalForm.some(r => r.position === 3 && r._manual && !r.employee_id)}
                style={{
                  ...styles.navyBtn,
                  opacity: finalForm.some(r => r.position === 3 && r._manual && !r.employee_id) ? 0.5 : 1,
                  cursor: finalForm.some(r => r.position === 3 && r._manual && !r.employee_id) ? 'not-allowed' : 'pointer',
                }}
              >📣 Declare</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Match confirm modal (admin only) */}
      {matchToDelete && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setMatchToDelete(null); }}
          style={styles.modalBackdrop}
        >
          <div style={{ ...styles.modalCard, maxWidth: 420 }}>
            <div style={{ ...styles.modalHeader, background: '#c62828' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Delete Match</h3>
              <button onClick={() => setMatchToDelete(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', fontSize: '0.78rem', color: '#333' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to delete match{' '}
                <strong>{matchToDelete.match_code || `M${matchToDelete.match_number}`}</strong>
                {' '}({matchToDelete.round})?
              </p>
              <p style={{ margin: 0, color: '#c62828', fontSize: '0.72rem' }}>
                This will also remove all player assignments for this match. This cannot be undone.
              </p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setMatchToDelete(null)} style={styles.outlineBtn}>Cancel</button>
              <button onClick={handleDeleteMatch} style={styles.dangerBtn}>🗑 Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete tournament confirm modal (admin) */}
      {tournamentToDelete && (
        <ConfirmDeleteModal
          tournament={tournamentToDelete}
          onCancel={() => setTournamentToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Batch register modal — pick one or more active tournaments */}
      {showRegisterModal && (
      <BatchRegisterModal
          tournaments={tournaments}
          currentEmpId={currentEmpId}
          partsByTournament={partsByTournament}
          pendingByTournament={pendingByTournament}
          isAdminUser={isAdmin()}
          onCancel={() => setShowRegisterModal(false)}
          onSubmit={handleBatchRegister}
        />
      )}
    </div>
  );
};

// ── Stopwatch sub-component (with countdown) ────────────────────────
// eslint-disable-next-line no-unused-vars
const StopwatchPanel = ({ matches, tournament: _tournament, getEmployeeName }) => {
  const { showToast } = useToast();
  const [swMs, setSwMs] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const [swLaps, setSwLaps] = useState([]);
  const swRef = useRef(null);
  const [cdMs, setCdMs] = useState(600000);
  const [cdRunning, setCdRunning] = useState(false);
  const cdRef = useRef(null);
  const [linkedMatchId, setLinkedMatchId] = useState('');

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
  const scheduledMatches = matches.filter(m => m.status !== 'completed');
  const linkedMatch = linkedMatchId ? matches.find(m => String(m.id) === String(linkedMatchId)) : null;

  const getMatchLabel = (m) => {
    const code = m.match_code || `M${m.match_number}`;
    const a = m.player_a_employee_id
      ? m.player_a_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
      : 'TBD';
    const b = m.player_b_employee_id
      ? m.player_b_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
      : 'TBD';
    return `${code} — ${a} vs ${b}`;
  };

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
          {/* Linked match display */}
          {linkedMatch && (
            <div style={{ marginTop: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: '0.55rem 0.7rem', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '0.62rem', opacity: 0.6, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Match</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{linkedMatch.match_code || `M${linkedMatch.match_number}`} · {linkedMatch.round}</div>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, marginTop: '0.15rem' }}>
                {linkedMatch.player_a_employee_id
                  ? linkedMatch.player_a_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
                {' '}<span style={{ opacity: 0.5 }}>vs</span>{' '}
                {linkedMatch.player_b_employee_id
                  ? linkedMatch.player_b_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
              </div>
              {linkedMatch.scheduled_at && (
                <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.2rem' }}>
                  🕐 {new Date(linkedMatch.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Link to Match */}
        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>🔗 Link Stopwatch to Match</div>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666', marginBottom: '0.55rem' }}>
            Select a scheduled match to link this stopwatch session. The timer will be associated with the chosen match.
          </div>
          <select
            value={linkedMatchId}
            onChange={(e) => {
              setLinkedMatchId(e.target.value);
              if (e.target.value) showToast('Stopwatch linked to match');
            }}
            style={{ ...styles.formInput, marginBottom: '0.5rem' }}
          >
            <option value="">— No match linked —</option>
            {scheduledMatches.map(m => (
              <option key={m.id} value={m.id}>{getMatchLabel(m)}</option>
            ))}
          </select>
          {linkedMatch ? (
            <div style={{ background: '#e8f5e9', borderRadius: 6, padding: '0.6rem 0.75rem', border: '1px solid #a5d6a7' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2e7d32', marginBottom: '0.25rem' }}>
                ✓ Linked — {linkedMatch.round} · {linkedMatch.match_code || `M${linkedMatch.match_number}`}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#388e3c' }}>
                {linkedMatch.player_a_employee_id
                  ? linkedMatch.player_a_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
                {' vs '}
                {linkedMatch.player_b_employee_id
                  ? linkedMatch.player_b_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
              </div>
              {linkedMatch.scheduled_at && (
                <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>
                  Scheduled: {new Date(linkedMatch.scheduled_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                </div>
              )}
              <button
                onClick={() => { setLinkedMatchId(''); showToast('Match unlinked', 'warning'); }}
                style={{ ...styles.outlineBtn, marginTop: '0.5rem', fontSize: '0.65rem', color: '#c62828', borderColor: '#ffcdd2' }}
              >✕ Unlink</button>
            </div>
          ) : (
            <div style={{ padding: '0.6rem', textAlign: 'center', color: '#aaa', fontSize: '0.7rem', background: '#fafafa', borderRadius: 6, border: '1px dashed #ddd' }}>
              No match linked — stopwatch runs independently
            </div>
          )}
        </div>
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
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'TBD'} — {m.match_code || `Match ${m.match_number}`}
                </div>
                <div style={{ color: '#666' }}>
                  {m.player_a_employee_id
                    ? m.player_a_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                    : 'TBD'}
                  {' vs '}
                  {m.player_b_employee_id
                    ? m.player_b_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                    : 'TBD'}
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
  bracketColHeader: { textAlign: 'center', padding: '0.4rem 0', fontSize: '0.72rem', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em', background: '#f5f5f5', borderRadius: '4px 4px 0 0', border: '1px solid #d0d0d0', borderBottom: 'none' },
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

  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 },
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