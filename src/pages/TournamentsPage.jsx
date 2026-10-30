// src/pages/TournamentsPage.jsx
// Activity Planner ▸ Events ▸ Tournaments
// Sub-tabs: Active Tournaments | Bracket/Fixtures | Match Results | Stopwatch | Final Results
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabase';
import EventsTopBar from '../components/events/EventsTopBar';
import { useCertificate } from '../hooks/useCertificate';
import {
  computeRoundRobinStandings,
  groupMatchesByRound,
  normalizeTournamentFormat,
} from '../utils/tournamentFixtures';
import {
  planTournament,
  getEffectiveMaxPlayers,
  getPlayoffShape,
} from '../utils/tournamentPlanner';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import BottomSheet from '../components/common/BottomSheet';
import CalendarIcon from '../components/common/CalendarIcon';
import { Eye, EyeOff } from 'lucide-react';

// Plan summary: what will happen for this format / player count / team size,
// plus contradictions (errors), warnings and one-click suggestions to fix them.
const PlanPanel = ({ plan, registered = null, maxPlayers = null, onApply }) => {
  if (!plan) return null;
  const hours = Math.round((plan.estimatedMinutes / 60) * 10) / 10;
  const formatName = { knockout: 'Knockout', round_robin: 'Round robin / League', swiss: 'Swiss' }[plan.format] || plan.format;
  const rows = [
    ['Tournament type', formatName],
    maxPlayers != null ? ['Max players', maxPlayers] : null,
    registered != null ? ['Registered players', registered] : null,
    ['Players per team', plan.playersPerTeam],
    ['Teams', plan.teams],
    ['Players left out', plan.leftover],
    plan.format === 'round_robin' ? ['League matches', plan.leagueMatches] : null,
    plan.format === 'round_robin'
      ? ['Playoff matches', plan.playoffMatches
          ? `${plan.playoffMatches} (${{ sf_final_bye: 'semi-final + final', sf_final: 'semi-finals + final', qf_sf_final: 'quarter-final, semi-finals + final' }[plan.playoffKind] || 'playoff'})`
          : 'none']
      : null,
    plan.format === 'knockout' ? ['Knockout matches', `${plan.knockoutMatches}${plan.byes ? ` (${plan.byes} first-round bye${plan.byes > 1 ? 's' : ''})` : ''}`] : null,
    plan.format === 'swiss' ? ['Swiss rounds (recommended)', plan.swissRounds] : null,
    ['Total matches', plan.totalMatches],
    plan.totalMatches > 0 ? ['Estimated play time', `≈ ${hours} h${plan.estimatedDays > 1 ? ` (~${plan.estimatedDays} days)` : ''}`] : null,
  ].filter(Boolean);

  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', fontSize: '0.74rem',
      background: 'var(--bg-muted)',
    }}>
      <div style={{ padding: '0.45rem 0.7rem', fontWeight: 700, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span>📋 Plan summary</span>
        <span style={{ color: plan.ok ? 'var(--success)' : 'var(--danger)' }}>{plan.ok ? '✓ Ready' : '⛔ Needs a change'}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '0.3rem 0.7rem', color: 'var(--text-soft)' }}>{label}</td>
              <td style={{
                padding: '0.3rem 0.7rem', fontWeight: 600, textAlign: 'right',
                color: label === 'Players left out' && value > 0 ? 'var(--danger)' : 'var(--text)',
              }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(plan.errors.length > 0 || plan.warnings.length > 0 || plan.suggestions.length > 0) && (
        <div style={{ padding: '0.5rem 0.7rem', display: 'grid', gap: '0.3rem' }}>
          {plan.errors.map((e) => <div key={e} style={{ color: 'var(--danger)', fontWeight: 600 }}>⛔ {e}</div>)}
          {plan.warnings.map((w) => <div key={w} style={{ color: '#e65100' }}>⚠ {w}</div>)}
          {plan.suggestions.length > 0 && (
            <div style={{ marginTop: '0.2rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>💡 How to fix this</div>
              {plan.suggestions.map((sg) => (
                <div key={sg.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                  <span style={{ flex: 1 }}>{sg.text}</span>
                  {sg.apply && onApply && (
                    <button type="button" onClick={() => onApply(sg.apply)}
                            style={{ ...styles.tinyEnterBtn, padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>
                      Apply
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Confirm-delete modal (admin action on a tournament).
const ConfirmDeleteModal = ({ tournament, onCancel, onConfirm }) => {
  const { isMobile } = useViewport();
  const body = (
    <>
      <div style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--text)' }}>
        <p style={{ margin: '0 0 0.5rem 0' }}>
          Are you sure you want to delete <strong>{tournament?.name}</strong> ({tournament?.code})?
        </p>
        <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.72rem' }}>
          This will also remove all participants, matches and final results linked to it. This cannot be undone.
        </p>
      </div>
      <div style={styles.modalFooter}>
        <button onClick={onCancel} style={styles.outlineBtn}>Cancel</button>
        <button onClick={onConfirm} style={styles.dangerBtn}>🗑 Delete</button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open onClose={onCancel} title="Delete Tournament" icon="🗑">
        {body}
      </BottomSheet>
    );
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={styles.modalBackdrop}>
      <div style={{ ...styles.modalCard, maxWidth: 420 }}>
        <div style={{ ...styles.modalHeader, background: '#c62828' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Delete Tournament</h3>
          <button onClick={onCancel} style={styles.modalClose}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );
};

// Batch-register modal: pick one or more active tournaments in a single click.
const BatchRegisterModal = ({ tournaments, currentEmpId, partsByTournament, pendingByTournament, isAdminUser, onCancel, onSubmit }) => {
  // Open, accepting-registration, not-full, not-already-registered.
  const { isMobile } = useViewport();
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

  const body = (
    <>
      <div style={{ padding: '1rem' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginBottom: '0.6rem' }}>
          One registration per person per tournament. Tick all tournaments you'd like to join — you can pick one or many.
        </div>
        {eligible.length === 0 ? (
          <div style={{ padding: '1.2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>
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
                    border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSel ? 'var(--accent-soft)' : 'var(--bg-muted)',
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
                    <div style={{ fontWeight: 700, color: 'var(--text-strong)'  }}>{t.name}</div>
                    <div style={{ fontSize: '0.66rem', color: 'var(--text-soft)' }}>
                      {t.code} · {t.game} · {t.format.replace('_', ' ')} · {formatDate(t.start_date)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--text-soft)', whiteSpace: 'nowrap' }}>
                    {parts.length} / {t.max_participants}
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
      <div style={styles.modalFooter}>
        <span style={{ flex: 1, fontSize: '0.7rem', color: 'var(--text-soft)' }}>
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
    </>
  );

  if (isMobile) {
    return (
      <BottomSheet open onClose={onCancel} title="🏆 Register for Tournaments" icon={<CalendarIcon size="24px" />}>
        {body}
      </BottomSheet>
    );
  }

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }} style={styles.modalBackdrop}>
      <div style={{ ...styles.modalCard, maxWidth: 560 }}>
        <div style={styles.modalHeader}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>🏆 Register for Tournaments</h3>
          <button onClick={onCancel} style={styles.modalClose}>✕</button>
        </div>
        {body}
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
  { id: 'teams',      label: 'Teams',             icon: '👥' },
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

// Simple progression view. Fixtures remain the source of truth; this view
// only displays the participants in each slot or TBD for an unknown slot.
export const TournamentFlowModal = ({ tournament, matches, getEmployeeName, onClose, onPrevious, onNext, flowIndex, flowCount }) => {
  const format = normalizeTournamentFormat(tournament?.format);
  const nameForSide = (match, side) => {
    const captain = match?.[`player_${side}_employee_id`];
    const players = (match?.[`team_${side}_players`] || []).map((p) => p.employee_id).filter(Boolean);
    const ids = [...new Set([captain, ...players].filter(Boolean))];
    return ids.length ? ids.map((id) => getEmployeeName(id)).join(' & ') : 'TBD';
  };

  const stageGroups = (() => {
    const isKo = (m) => String(m.match_code || '').toUpperCase().startsWith('KO_');
    const isRr = (m) => String(m.round || '').toUpperCase().startsWith('RR') && !isKo(m);
    if (format === 'round_robin' || format === 'league') {
      const rr = matches.filter(isRr);
      const ko = matches.filter(isKo);
      const groups = rr.length ? [{ key: 'RR', label: 'Round Robin', matches: rr }] : [];
      ['KO_QF', 'KO_SF', 'KO_F'].forEach((key) => {
        const rows = ko.filter((m) => String(m.match_code || '').toUpperCase().startsWith(key));
        if (rows.length) groups.push({ key, label: { KO_QF: 'Quarter Final', KO_SF: 'Semi Final', KO_F: 'Final' }[key], matches: rows });
      });
      return groups;
    }
    return groupMatchesByRound(matches).map((group) => ({ key: group.round, label: group.label, matches: group.matches }));
  })();

  const playerBox = (match, side) => {
    const name = nameForSide(match, side);
    const unknown = name === 'TBD';
    return <div style={{ padding: '0.35rem 0.45rem', borderRadius: 4, background: unknown ? 'var(--bg-muted)' : 'var(--accent-soft)', color: unknown ? 'var(--muted)' : 'var(--text)', fontStyle: unknown ? 'italic' : 'normal', wordBreak: 'break-word' }}>{name}</div>;
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={styles.modalBackdrop}>
      <div style={{ ...styles.modalCard, width: 1100, maxWidth: '96vw', maxHeight: 'calc(100vh - 40px)' }}>
        <div style={styles.modalHeader}>
          <div><h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>🔀 {tournament?.name} — Check Flow</h3><div style={{ fontSize: '0.65rem', opacity: 0.8, marginTop: 2 }}>Tournament progression</div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{onPrevious && <button onClick={onPrevious} aria-label="Previous tournament flow" style={{ ...styles.modalClose, position: 'static', fontSize: '1.15rem' }}>‹</button>}{onNext && <button onClick={onNext} aria-label="Next tournament flow" style={{ ...styles.modalClose, position: 'static', fontSize: '1.15rem' }}>›</button>}{flowCount > 1 && <span style={{ fontSize: '0.62rem', opacity: 0.8 }}>{flowIndex + 1}/{flowCount}</span>}<button onClick={onClose} style={styles.modalClose}>✕</button></div>
        </div>
        <div style={{ padding: '1rem', overflowX: 'auto' }}>
          {stageGroups.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>No fixture flow is available yet.</div> : (
            <div style={{ display: 'flex', alignItems: 'stretch', gap: '1rem', minWidth: Math.max(620, stageGroups.length * 220) }}>
              {stageGroups.map((stage, index) => (
                <div key={stage.key} style={{ flex: '1 0 190px', minWidth: 190, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <div style={{ textAlign: 'center', padding: '0.45rem', borderRadius: 6, background: 'var(--accent)', color: '#fff', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stage.label}</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-around', gap: '0.7rem', padding: '0.8rem 0.15rem', background: 'var(--bg-soft)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 6px 6px' }}>
                    {stage.matches.map((match) => <div key={match.id || match.match_code} style={{ background: 'var(--bg-surface-strong)', border: '1px solid var(--border)', borderRadius: 7, padding: '0.55rem 0.65rem', boxShadow: 'var(--surface-shadow-soft)', fontSize: '0.76rem' }}><div style={{ display: 'grid', gap: '0.35rem' }}>{playerBox(match, 'a')}<div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.62rem' }}>vs</div>{playerBox(match, 'b')}</div></div>)}
                  </div>
                  {index < stageGroups.length - 1 && <div style={{ position: 'absolute', right: '-0.8rem', top: '50%', color: 'var(--accent)', fontSize: '1.2rem', zIndex: 1 }}>→</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReusableTeamsPanel = ({ employees, tournaments, isAdminUser, getEmployeeName }) => {
  const { showToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamPoints, setTeamPoints] = useState([]);
  const [playerPoints, setPlayerPoints] = useState([]);
  const [employeeDirectory, setEmployeeDirectory] = useState(employees || []);
  const [name, setName] = useState('');
  const [parentTeamId, setParentTeamId] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [playerSearch, setPlayerSearch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [shuffledEmployeeIds, setShuffledEmployeeIds] = useState([]);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [showUserDirectory, setShowUserDirectory] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userForm, setUserForm] = useState({ employee_code: '', name: '', email: '', department: '', is_active: true });
  const [editingEmployeeCode, setEditingEmployeeCode] = useState(null);
  const [openUserMenu, setOpenUserMenu] = useState(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    const [teamResult, memberResult, pointResult, playerPointResult, employeeResult] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('team_members').select('*'),
      supabase.from('team_cumulative_points').select('*').order('total_points', { ascending: false }),
      supabase.from('team_match_score_entries').select('employee_id, score'),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
    ]);
    setLoading(false);
    if (teamResult.error || memberResult.error) {
      showToast('Team tables are unavailable. Apply 29_reusable_teams.sql first.', 'error');
      return;
    }
    setTeams((teamResult.data || []).filter((team) => team.is_active !== false));
    setTeamMembers(memberResult.data || []);
    setTeamPoints(pointResult.data || []);
    setPlayerPoints((playerPointResult.data || []).map((row) => ({ employee_id: row.employee_id, points: row.score })));
    if (!employeeResult.error) {
      const nextEmployees = employeeResult.data || [];
      setEmployeeDirectory(nextEmployees);
      setShuffledEmployeeIds((current) => {
        const availableIds = new Set(nextEmployees.map((employee) => employee.employee_code));
        const retainedIds = current.filter((id) => availableIds.has(id));
        const newIds = nextEmployees.map((employee) => employee.employee_code).filter((id) => !retainedIds.includes(id));
        return [...retainedIds, ...newIds];
      });
    }
  }, [showToast]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const assignedEmployeeIds = useMemo(() => new Set(teamMembers.map((member) => String(member.employee_id).toUpperCase())), [teamMembers]);
  const availableEmployees = employeeDirectory.filter((employee) => {
    const query = playerSearch.trim().toLowerCase();
    const belongsToEditingTeam = editingTeamId && teamMembers.some((member) => member.team_id === editingTeamId && member.employee_id === employee.employee_code);
    return (belongsToEditingTeam || !assignedEmployeeIds.has(String(employee.employee_code).toUpperCase())) &&
      (!query || `${employee.name} ${employee.employee_code}`.toLowerCase().includes(query));
  });
  const pointsForPlayer = (employeeId) => playerPoints
    .filter((row) => String(row.employee_id).toUpperCase() === String(employeeId).toUpperCase())
    .reduce((sum, row) => sum + (Number(row.points) || 0), 0);
  const toggleMember = (employeeId) => setSelectedMembers((current) => {
    const next = new Set(current);
    if (next.has(employeeId)) next.delete(employeeId); else next.add(employeeId);
    return next;
  });

  const createTeam = async () => {
    if (!isAdminUser) return showToast('Only admins can create reusable teams', 'error');
    if (!name.trim()) return showToast('Enter a team name', 'error');
    if (selectedMembers.size === 0) return showToast('Select at least one player', 'error');
    const teamQuery = editingTeamId
      ? supabase.from('teams').update({ name: name.trim(), parent_team_id: parentTeamId || null }).eq('id', editingTeamId)
      : supabase.from('teams').insert({ name: name.trim(), parent_team_id: parentTeamId || null });
    const { data: team, error: teamError } = await teamQuery.select().single();
    if (teamError) return showToast(teamError.message, 'error');

    const memberRows = [...selectedMembers].map((employeeId) => ({ team_id: team.id, employee_id: employeeId, role: 'member' }));
    if (editingTeamId) await supabase.from('team_members').delete().eq('team_id', editingTeamId);
    const { error: memberError } = await supabase.from('team_members').insert(memberRows);
    if (memberError) return showToast(memberError.message, 'error');

    if (!editingTeamId && tournamentId) {
      const { error: entryError } = await supabase.from('tournament_team_entries').insert({ tournament_id: tournamentId, team_id: team.id, status: 'registered' });
      if (entryError) return showToast(entryError.message, 'error');
    }
    const wasEditing = Boolean(editingTeamId);
    setName(''); setParentTeamId(''); setTournamentId(''); setSelectedMembers(new Set()); setEditingTeamId(null); setPlayerSearch('');
    await loadTeams();
    showToast(wasEditing ? 'Team updated' : 'Team created');
  };

  const editTeam = (team) => {
    setEditingTeamId(team.id);
    setName(team.name);
    setParentTeamId(team.parent_team_id || '');
    setSelectedMembers(new Set(membersFor(team.id).map((member) => member.employee_id)));
    setPlayerSearch('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTeam = async (team) => {
    const { count, error: countError } = await supabase
      .from('tournament_team_entries').select('id', { count: 'exact', head: true }).eq('team_id', team.id);
    if (countError) return showToast(countError.message, 'error');
    if (!window.confirm(count > 0 ? 'This team has tournament history. Archive it instead?' : `Delete ${team.name}?`)) return;
    const result = count > 0
      ? await supabase.from('teams').update({ is_active: false }).eq('id', team.id)
      : await supabase.from('teams').delete().eq('id', team.id);
    if (result.error) return showToast(result.error.message, 'error');
    await loadTeams();
    showToast(count > 0 ? 'Team archived to preserve history' : 'Team deleted');
  };

  const saveUser = async () => {
    if (!isAdminUser) return showToast('Only admins can manage users', 'error');
    const payload = {
      employee_code: userForm.employee_code.trim().toUpperCase(),
      name: userForm.name.trim(),
      email: userForm.email.trim(),
      department: userForm.department.trim(),
      is_active: userForm.is_active,
    };
    if (!payload.employee_code || !payload.name || !payload.department) {
      return showToast('Employee ID, name, and department are required', 'error');
    }
    const query = editingEmployeeCode
      ? supabase.from('employees').update(payload).eq('employee_code', editingEmployeeCode)
      : supabase.from('employees').insert(payload);
    const { error } = await query;
    if (error) return showToast(error.message, 'error');
    const wasEditing = Boolean(editingEmployeeCode);
    setUserForm({ employee_code: '', name: '', email: '', department: '', is_active: true });
    setEditingEmployeeCode(null);
    setOpenUserMenu(null);
    setShowUserForm(false);
    await loadTeams();
    showToast(wasEditing ? 'User updated' : 'User added');
  };

  const editUser = (employee) => {
    setEditingEmployeeCode(employee.employee_code);
    setUserForm({
      employee_code: employee.employee_code || '',
      name: employee.name || '',
      email: employee.email || '',
      department: employee.department || '',
      is_active: employee.is_active !== false,
    });
    setShowUserForm(true);
    setOpenUserMenu(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteUser = async (employee) => {
    if (!isAdminUser) return;
    const [{ count: participantCount }, { count: memberCount }] = await Promise.all([
      supabase.from('tournament_participants').select('id', { count: 'exact', head: true }).eq('employee_id', employee.employee_code),
      supabase.from('team_members').select('employee_id', { count: 'exact', head: true }).eq('employee_id', employee.employee_code),
    ]);
    const referenced = (participantCount || 0) > 0 || (memberCount || 0) > 0;
    if (!window.confirm(referenced ? `${employee.name} is used in records. Archive this user?` : `Delete ${employee.name}?`)) return;
    const result = referenced
      ? await supabase.from('employees').update({ is_active: false }).eq('employee_code', employee.employee_code)
      : await supabase.from('employees').delete().eq('employee_code', employee.employee_code);
    if (result.error) return showToast(result.error.message, 'error');
    await loadTeams();
    showToast(referenced ? 'User archived to preserve history' : 'User deleted');
  };

  const employeeOrder = useMemo(() => new Map(shuffledEmployeeIds.map((id, index) => [String(id), index])), [shuffledEmployeeIds]);
  const orderedEmployees = useMemo(() => {
    if (shuffledEmployeeIds.length === 0) return employeeDirectory;
    return [...employeeDirectory].sort((a, b) => (employeeOrder.get(String(a.employee_code)) ?? Number.MAX_SAFE_INTEGER) - (employeeOrder.get(String(b.employee_code)) ?? Number.MAX_SAFE_INTEGER));
  }, [employeeDirectory, employeeOrder, shuffledEmployeeIds.length]);
  const membersFor = (teamId) => teamMembers.filter((member) => member.team_id === teamId);
  const displayMembersFor = (teamId) => {
    return [...membersFor(teamId)].sort((a, b) => (employeeOrder.get(String(a.employee_id)) ?? Number.MAX_SAFE_INTEGER) - (employeeOrder.get(String(b.employee_id)) ?? Number.MAX_SAFE_INTEGER));
  };
  const shuffleEmployees = () => {
    const ids = employeeDirectory.map((employee) => employee.employee_code);
    for (let index = ids.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [ids[index], ids[randomIndex]] = [ids[randomIndex], ids[index]];
    }
    setShuffledEmployeeIds(ids);
  };
  const pointsFor = (teamId) => teamPoints.find((row) => String(row.team_id) === String(teamId));
  const visibleEmployees = orderedEmployees.filter((employee) => {
    const query = userSearch.trim().toLowerCase();
    return !query || `${employee.name} ${employee.employee_code} ${employee.department}`.toLowerCase().includes(query);
  });

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="clay-card" style={{ ...styles.card, background: 'linear-gradient(135deg, var(--bg-surface-strong), rgba(63,81,181,0.08))' }}>
        <div style={styles.cardHeader}>
          <div><div style={styles.cardHeaderTitle}>👤 Users Management</div><div style={{ color: 'var(--muted)', fontSize: '0.68rem', marginTop: 3 }}>{employeeDirectory.length} active users</div></div>
          {isAdminUser && <button onClick={() => setShowUserForm((current) => !current)} style={styles.navyBtn}>{showUserForm ? '✕ Close' : '+ Add User'}</button>}
        </div>
        <button onClick={() => { setShowUserDirectory((current) => !current); loadTeams(); }} aria-label={showUserDirectory ? 'Hide users' : 'Show users'} style={{ width: 'fit-content', display: 'inline-flex', alignItems: 'center', gap: '0.48rem', background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.55rem 0.72rem', color: 'var(--text-soft)', cursor: 'pointer', fontSize: '0.7rem', textAlign: 'left' }}>{showUserDirectory ? <EyeOff size={15} strokeWidth={2.2} aria-hidden="true" /> : <Eye size={15} strokeWidth={2.2} aria-hidden="true" />}<span style={{ fontWeight: 700, letterSpacing: '0.01em' }}>{showUserDirectory ? 'Hide Users' : 'Show Users'}</span></button>
        {showUserForm && isAdminUser && <div style={{ display: 'grid', gap: '0.7rem', padding: '0.8rem', background: 'var(--bg-muted)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>{editingEmployeeCode ? 'Edit employee details. Employee ID, name, and department are required.' : 'Employee ID, name, and department are required. Email is optional.'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.6rem' }}>
            <div style={styles.formRow}><label style={styles.formLabel}>Employee ID *</label><input value={userForm.employee_code} onChange={(e) => setUserForm((f) => ({ ...f, employee_code: e.target.value }))} placeholder="TEST_EMP_ID_25" style={styles.formInput} /></div>
            <div style={styles.formRow}><label style={styles.formLabel}>Name *</label><input value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} placeholder="Player name" style={styles.formInput} /></div>
            <div style={styles.formRow}><label style={styles.formLabel}>Email <span style={{ color: 'var(--muted)' }}>(optional)</span></label><input type="email" value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} placeholder="player@example.com" style={styles.formInput} /></div>
            <div style={styles.formRow}><label style={styles.formLabel}>Department *</label><input value={userForm.department} onChange={(e) => setUserForm((f) => ({ ...f, department: e.target.value }))} placeholder="Department" style={styles.formInput} /></div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}><input type="checkbox" checked={userForm.is_active} onChange={(e) => setUserForm((f) => ({ ...f, is_active: e.target.checked }))} /> Active user</label>
          <div style={{ display: 'flex', gap: '0.45rem' }}>{editingEmployeeCode && <button onClick={() => { setEditingEmployeeCode(null); setUserForm({ employee_code: '', name: '', email: '', department: '', is_active: true }); setShowUserForm(false); }} style={styles.outlineBtn}>Cancel</button>}<button onClick={saveUser} style={styles.navyBtn}>{editingEmployeeCode ? 'Save Changes' : 'Save User'}</button></div>
        </div>}
        {showUserDirectory && <div style={{ marginTop: '0.8rem', display: 'grid', gap: '0.6rem' }}>
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="⌕  Search users by name, ID or department…" style={{ ...styles.formInput, maxWidth: 340 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.55rem' }}>
            {visibleEmployees.map((employee, index) => { const hue = (index * 47) % 360; const menuOpen = openUserMenu === employee.employee_code; return <div key={employee.employee_code} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.65rem', borderRadius: 9, border: '1px solid var(--border)', background: `linear-gradient(135deg, hsla(${hue},70%,55%,0.16), var(--bg-surface-strong))`, minWidth: 0 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: `hsl(${hue},55%,42%)`, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '0.7rem', flexShrink: 0 }}>{String(employee.name || '?').trim().charAt(0).toUpperCase()}</div><div style={{ minWidth: 0, flex: 1 }}><div style={{ fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</div><div style={{ color: 'var(--muted)', fontSize: '0.61rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.employee_code} · {employee.department}</div></div>{isAdminUser && <div style={{ position: 'relative' }}><button onClick={() => setOpenUserMenu(menuOpen ? null : employee.employee_code)} title="User actions" aria-label={`Actions for ${employee.name}`} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}>⋮</button>{menuOpen && <div style={{ position: 'absolute', right: 0, top: '1.45rem', zIndex: 10, minWidth: 118, padding: '0.25rem', border: '1px solid var(--border)', borderRadius: 7, background: 'var(--bg-surface-strong)', boxShadow: 'var(--surface-shadow-soft)' }}><button onClick={() => editUser(employee)} style={{ display: 'block', width: '100%', padding: '0.38rem 0.5rem', border: 0, borderRadius: 5, background: 'transparent', color: 'var(--text)', textAlign: 'left', cursor: 'pointer', fontSize: '0.68rem' }}>✎ Edit</button><button onClick={() => { setOpenUserMenu(null); deleteUser(employee); }} style={{ display: 'block', width: '100%', padding: '0.38rem 0.5rem', border: 0, borderRadius: 5, background: 'transparent', color: 'var(--danger)', textAlign: 'left', cursor: 'pointer', fontSize: '0.68rem' }}>🗑 Delete</button></div>}</div>}</div>; })}
          </div>
        </div>}
      </div>
      <div className="clay-card" style={{ ...styles.card, background: 'linear-gradient(135deg, var(--bg-surface-strong), rgba(63,81,181,0.08))' }}>
        <div style={styles.cardHeader}>
          <div><div style={styles.cardHeaderTitle}>👥 Team workspace</div><div style={{ color: 'var(--text-soft)', fontSize: '0.7rem', marginTop: 3 }}>One player can belong to one reusable team. Teams can be entered into multiple tournaments.</div></div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}><button onClick={loadTeams} style={styles.outlineBtn}>↻ Refresh</button><button onClick={shuffleEmployees} title="Randomise the order of all employees in this workspace" style={styles.outlineBtn}>🔀 Shuffle employees</button></div>
        </div>
        {isAdminUser && <div style={{ background: 'rgba(255,255,255,0.38)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.8rem', display: 'grid', gap: '0.7rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-strong)' }}>{editingTeamId ? 'Edit team' : 'Create a team'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.6rem' }}>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" style={styles.formInput} />
            <select value={parentTeamId} onChange={(e) => setParentTeamId(e.target.value)} style={styles.formInput}><option value="">No parent team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
            <select value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} style={styles.formInput}><option value="">Assign later</option>{tournaments.filter((t) => t.status === 'registration_open').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          </div>
          <input value={playerSearch} onChange={(e) => setPlayerSearch(e.target.value)} placeholder="Search available players by name or ID" style={styles.formInput} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))', gap: '0.45rem', maxHeight: 220, overflowY: 'auto' }}>
            {orderedEmployees.filter((employee) => availableEmployees.includes(employee)).map((employee, index) => { const hue = (index * 47) % 360; return <label key={employee.employee_code} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', padding: '0.5rem 0.55rem', border: '1px solid var(--border)', borderRadius: 7, background: selectedMembers.has(employee.employee_code) ? 'var(--accent-soft)' : 'var(--bg-surface-strong)', cursor: 'pointer', fontSize: '0.68rem' }}><input type="checkbox" checked={selectedMembers.has(employee.employee_code)} onChange={() => toggleMember(employee.employee_code)} /><span style={{ width: 23, height: 23, borderRadius: '50%', background: `hsl(${hue},55%,42%)`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: '0.62rem', fontWeight: 700, flexShrink: 0 }}>{String(employee.name || '?').trim().charAt(0).toUpperCase()}</span><span style={{ minWidth: 0 }}><strong style={{ display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{employee.name}</strong><small style={{ color: 'var(--muted)' }}>{employee.employee_code}</small></span></label>; })}
            {availableEmployees.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.7rem', padding: '0.7rem' }}>All matching players are already assigned to a team.</div>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}><span style={{ fontSize: '0.7rem', color: 'var(--text-soft)' }}>{selectedMembers.size} player{selectedMembers.size === 1 ? '' : 's'} selected</span><div style={{ display: 'flex', gap: '0.4rem' }}>{editingTeamId && <button onClick={() => { setEditingTeamId(null); setName(''); setParentTeamId(''); setSelectedMembers(new Set()); }} style={styles.outlineBtn}>Cancel</button>}<button onClick={createTeam} style={styles.navyBtn}>{editingTeamId ? 'Save Changes' : '+ Create Team'}</button></div></div>
        </div>}
      </div>
      <div className="clay-card" style={{ ...styles.card, padding: 0, overflow: 'hidden', background: 'linear-gradient(145deg, var(--bg-surface-strong), rgba(63,81,181,0.08))' }}>
        <div style={{ padding: '1rem 1.1rem', background: 'linear-gradient(120deg, #173d73, #245a9b 58%, #3478b8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div><div style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.01em' }}>👥 Team Directory</div><div style={{ marginTop: 4, fontSize: '0.7rem', opacity: 0.82 }}>Reusable teams, player membership and tournament performance</div></div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}><span style={{ padding: '0.35rem 0.55rem', borderRadius: 999, background: 'rgba(255,255,255,0.16)', fontSize: '0.68rem', fontWeight: 700 }}>{teams.length} team{teams.length === 1 ? '' : 's'}</span><span style={{ padding: '0.35rem 0.55rem', borderRadius: 999, background: 'rgba(255,255,255,0.16)', fontSize: '0.68rem', fontWeight: 700 }}>{teamMembers.length} players</span></div>
        </div>
        <div style={{ padding: '0.9rem 1rem' }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.7rem', marginBottom: '0.75rem' }}>Click a team card to expand its roster.</div>
          {loading ? <div style={{ color: 'var(--muted)', fontSize: '0.75rem', padding: '1rem' }}>Loading teams…</div> : teams.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: '0.75rem', padding: '1.2rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 10 }}>No reusable teams created yet.</div> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.85rem' }}>{teams.map((team, index) => {
            const point = pointsFor(team.id);
            const members = membersFor(team.id);
            const expanded = expandedTeams.has(team.id);
            const accent = ['#2e7d32', '#6a1b9a', '#1565c0', '#ef6c00', '#00838f'][index % 5];
            return <div key={team.id} onClick={() => setExpandedTeams((current) => { const next = new Set(current); if (next.has(team.id)) next.delete(team.id); else next.add(team.id); return next; })} style={{ border: '1px solid var(--border)', borderTop: `4px solid ${accent}`, borderRadius: 12, background: 'var(--bg-surface-strong)', cursor: 'pointer', overflow: 'hidden', boxShadow: '0 7px 18px rgba(28,48,82,0.08)', transition: 'transform 150ms ease, box-shadow 150ms ease' }}>
              <div style={{ padding: '0.8rem 0.85rem 0.65rem', background: `linear-gradient(135deg, ${accent}12, transparent)` }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '0.6rem' }}><div style={{ minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>{team.parent_team_id && <span style={{ display: 'inline-block', marginTop: 4, color: accent, fontSize: '0.62rem', fontWeight: 700 }}>CHILD TEAM</span>}</div><div style={{ textAlign: 'right' }}><div style={{ color: accent, fontSize: '0.9rem', fontWeight: 800 }}>{point?.total_points || 0}</div><div style={{ color: 'var(--muted)', fontSize: '0.58rem', fontWeight: 700 }}>POINTS</div></div></div><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.7rem' }}><span style={{ padding: '0.28rem 0.45rem', borderRadius: 999, background: `${accent}14`, color: accent, fontSize: '0.63rem', fontWeight: 700 }}>👤 {members.length} members</span><span style={{ padding: '0.28rem 0.45rem', borderRadius: 999, background: 'var(--bg-muted)', color: 'var(--text-soft)', fontSize: '0.63rem', fontWeight: 700 }}>🏆 {point?.tournaments_played || 0} tournaments</span><span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.65rem', fontWeight: 700 }}>{expanded ? 'Hide roster ▲' : 'View roster ▼'}</span></div></div>
              {expanded && <div style={{ borderTop: '1px solid var(--border)', padding: '0.45rem 0.85rem 0.75rem', display: 'grid', gap: '0.15rem' }}>{members.length === 0 ? <div style={{ color: 'var(--muted)', fontSize: '0.68rem', padding: '0.5rem 0' }}>No players assigned.</div> : displayMembersFor(team.id).map((member, memberIndex) => { const memberName = getEmployeeName(member.employee_id); return <div key={member.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.42rem 0', borderBottom: memberIndex < members.length - 1 ? '1px solid var(--border)' : 'none' }}><span style={{ width: 25, height: 25, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `${accent}22`, color: accent, fontSize: '0.62rem', fontWeight: 800, flexShrink: 0 }}>{String(memberName || '?').trim().charAt(0).toUpperCase()}</span><span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memberName}</strong><small style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>{member.employee_id}</small></span><span style={{ color: accent, fontSize: '0.68rem', fontWeight: 800 }}>{pointsForPlayer(member.employee_id)} pts</span></div>; })}{isAdminUser && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', marginTop: '0.55rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }} onClick={(event) => event.stopPropagation()}><button onClick={() => editTeam(team)} style={{ ...styles.outlineBtn, fontSize: '0.65rem', borderColor: accent, color: accent }}>✎ Edit team</button><button onClick={() => deleteTeam(team)} style={{ ...styles.outlineBtn, fontSize: '0.65rem', color: 'var(--danger)', borderColor: 'rgba(229,57,53,0.35)' }}>🗑 Delete</button></div>}</div>}
            </div>;
          })}</div>}
        </div>
      </div>
    </div>
  );
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
    supportsPlayoffMode,
  } = useApp();
  const { showToast } = useToast();
  const { generateCertificate } = useCertificate();
  const { isMobile } = useViewport();
  const [certPrinting, setCertPrinting] = useState(null); // tracks which row is printing

  const [sub, setSub] = useState('active');
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [reusableTeams, setReusableTeams] = useState([]);
  const [teamMemberCounts, setTeamMemberCounts] = useState({});
  const [teamEntryPlayerCounts, setTeamEntryPlayerCounts] = useState({});
  const [tournamentTeamEntries, setTournamentTeamEntries] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('teams').select('id, name, description').eq('is_active', true).order('name'),
      supabase.from('team_members').select('team_id, employee_id'),
      supabase.from('tournament_team_entries').select('*').order('created_at', { ascending: true }),
      supabase.from('tournament_team_member_snapshots').select('tournament_team_entry_id, employee_id'),
    ]).then(([teamsResult, membersResult, entriesResult, snapshotsResult]) => {
      if (!active) return;
      setReusableTeams(teamsResult.data || []);
      const counts = {};
      (membersResult.data || []).forEach((member) => { counts[member.team_id] = (counts[member.team_id] || 0) + 1; });
      setTeamMemberCounts(counts);
      setTournamentTeamEntries(entriesResult.data || []);
      const snapshotCounts = {};
      (snapshotsResult.data || []).forEach((snapshot) => { snapshotCounts[snapshot.tournament_team_entry_id] = (snapshotCounts[snapshot.tournament_team_entry_id] || 0) + 1; });
      setTeamEntryPlayerCounts(snapshotCounts);
    });
    return () => { active = false; };
  }, []);
    const [tForm, setTForm] = useState({
      name: '', game: 'Carrom', customGame: '', format: 'knockout',
      participant_mode: 'individual', lineup_mode: 'variable', lineup_size: '', team_ids: [],
      players_per_team: 1,
      start_date: '', end_date: '', max_participants: 8,
      prize_pool: '', description: '', playoff_mode: 'auto',
      match_duration_minutes: 10,
    });
    // Live validation / preview for the New Tournament form.
    const createPlan = useMemo(
      () => planTournament({
        format: tForm.format,
        maxPlayers: parseInt(tForm.max_participants, 10) || 0,
        playersPerTeam: tForm.players_per_team,
        playoffMode: tForm.playoff_mode,
        intervalMinutes: Number(tForm.match_duration_minutes) || 10,
      }),
      [tForm.format, tForm.max_participants, tForm.players_per_team, tForm.playoff_mode, tForm.match_duration_minutes]
    );
    // Generate-fixtures options dialog.
    const [showGenModal, setShowGenModal] = useState(false);
    const [genOpts, setGenOpts] = useState({
      leftoverPolicy: 'block', formation: 'random', matchesPerSlot: 1, dayEndHour: '',
    });
  const [showNewMatchModal, setShowNewMatchModal] = useState(false);
  const [showFlowModal, setShowFlowModal] = useState(false);
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
  const [managePlayersTournamentId, setManagePlayersTournamentId] = useState(null);
  // editMatchId: ID of the match being edited by admin in the bracket/fixtures
  const [editMatchId, setEditMatchId] = useState(null);
  const [eForm, setEForm] = useState({ match_code: '', round: 'QF', match_number: 1, scheduled_at: '', team_a: [''], team_b: [''] });
  // matchToDelete: match pending admin delete confirmation
  const [matchToDelete, setMatchToDelete] = useState(null);
  // editTournamentId: tournament being edited by admin (status / registration / date)
  const [editTournamentId, setEditTournamentId] = useState(null);
  const [tEditForm, setTEditForm] = useState({ status: 'registration_open', registration_open: true, start_date: '', end_date: '', max_participants: 8 });

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
  useEffect(() => {
    const rawNavigation = sessionStorage.getItem('absstem-tournament-navigation');
    if (!rawNavigation) return;
    sessionStorage.removeItem('absstem-tournament-navigation');
    try {
      const navigation = JSON.parse(rawNavigation);
      const target = tournaments.find((tournament) => String(tournament.id) === String(navigation.tournamentId));
      if (!target) return;
      setActiveTournament(target.id);
      setSub('bracket');
      if (navigation.flow) setShowFlowModal(true);
    } catch (_) {
      // Ignore malformed dashboard navigation state.
    }
  }, [tournaments]);
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
 // In TournamentsPage.jsx, find the canEditMatch function and update it:

// Permission helper for editing a match result.
// Admin can always edit. Non-admin can edit only if they actually played
// the match (player_a or player_b) AND both slots are filled (not TBD).
const canEditMatch = (m) => {
  if (!m) return false;

  const teamAExists = m.player_a_employee_id || (m.team_a_players && m.team_a_players.length > 0);
  const teamBExists = m.player_b_employee_id || (m.team_b_players && m.team_b_players.length > 0);
  const hasTBD = !teamAExists || !teamBExists;

  if (hasTBD) {
    return isAdmin();
  }

  if (isAdmin()) return true;
  if (!currentEmpId) return false;

  const me = currentEmpId.toUpperCase();
  const a = (m.player_a_employee_id || '').toUpperCase();
  const b = (m.player_b_employee_id || '').toUpperCase();

  if (me === a || me === b) return true;

  const allPlayers = [
    ...(m.team_a_players || []),
    ...(m.team_b_players || []),
  ].map(p => (p.employee_id || '').toUpperCase());
  return allPlayers.includes(me);
};

  // ── Sub-tab renderers ─────────────────────────────────────────────────
  const renderActiveTournaments = () => {
    return (
      <div className="clay-card" style={{background:'var(--bg-surface-strong)'}}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Active & Upcoming Tournaments</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={styles.recordCount}>Total Record(s) Found: {tournaments.filter(t => t.status !== 'completed').length}</span>
            {isAdmin() && (
              <button onClick={() => setShowNewTournamentModal(true)} style={styles.navyBtn}>+ New Tournament</button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
          <table style={{ ...styles.table, minWidth: 1000 }}>
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
                  <td colSpan="11" style={{ ...styles.td, textAlign: 'center', color: 'var(--muted)', padding: '1.4rem' }}>
                    No tournaments yet. {isAdmin() && 'Click "New Tournament" to create one.'}
                  </td>
                </tr>
              ) : tournaments.map((t) => {
                const status = STATUS_BADGE[t.status] || STATUS_BADGE.draft;
                const format = FORMAT_BADGE[t.format] || FORMAT_BADGE.knockout;
                const isTeamTournament = t.participant_mode === 'team';
                const registeredTeamRows = tournamentTeamEntries.filter((entry) => String(entry.tournament_id) === String(t.id));
                const teamPlayerCount = registeredTeamRows.reduce((sum, entry) => sum + (teamEntryPlayerCounts[entry.id] ?? teamMemberCounts[entry.team_id] ?? 0), 0);
                const partCount = isTeamTournament ? teamPlayerCount : (partsByTournament[t.id] || []).length;
                const cap = t.max_participants || 8;
                const isFull = isTeamTournament ? registeredTeamRows.length >= cap : partCount >= cap;
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
                const canRequest = !isTeamTournament && !isCompleted && regOpen && !startDatePassed && !alreadyRegistered && !hasPendingRequest && !!currentEmpId;
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
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={styles.td}><strong>{t.code}</strong></td>
                    <td style={styles.td}><strong>{t.name}</strong></td>
                    <td style={styles.td}>{t.game}</td>
                    <td style={styles.td}>{isTeamTournament ? <span style={{ ...styles.tinyChip, background: 'rgba(106,27,154,0.12)', color: '#6a1b9a' }}>Team event</span> : <span style={{ ...format, ...styles.tinyChip }}>{format.label}</span>}</td>
                    <td style={styles.td}>{formatDate(t.start_date)}</td>
                    <td style={styles.td}>{formatDate(t.end_date)}</td>
                    <td style={styles.td}>{isTeamTournament ? <><strong>{partCount} players</strong><small style={{ display: 'block', color: 'var(--muted)', fontSize: '0.62rem' }}>{registeredTeamRows.length} teams</small></> : `${partCount} / ${cap}`}</td>
                    <td style={styles.td}><span style={{ ...status, ...styles.tinyChip }}>{status.label}</span></td>
                    <td style={styles.td}>
                      <button
                        onClick={() => isTeamTournament ? setManagePlayersTournamentId(t.id) : handleRegisterForOne(t.id)}
                        disabled={isTeamTournament ? false : !canRegister}
                        style={{
                          ...styles.tinyEnterBtn,
                        background: isTeamTournament ? 'var(--accent)' : alreadyRegistered ? 'var(--success)' : hasPendingRequest ? 'var(--warning)' : isCompleted || startDatePassed || (isAdmin() && isFull) ? 'var(--muted)' : 'var(--accent)',
                          opacity: isTeamTournament || canRegister || alreadyRegistered || hasPendingRequest ? 1 : 0.6,
                          cursor: isTeamTournament || canRegister || alreadyRegistered || hasPendingRequest ? 'pointer' : 'not-allowed',
                        }}
                        title={isTeamTournament ? 'Manage teams for this tournament' :
                          alreadyRegistered ? 'You are already registered'
                          : hasPendingRequest ? 'Your request is waiting for admin approval'
                          : isAdmin() && isFull ? 'Tournament is full'
                          : isCompleted ? 'Tournament is closed'
                          : startDatePassed ? 'Registration closed — tournament has started'
                          : regOpen ? (isAdmin() ? 'Click to register' : 'Click to request approval')
                          : 'Registration closed'}
                      >{isTeamTournament ? 'Manage Teams' : regLabel}</button>
                    </td>
                    <td style={styles.td}>
                      {alreadyRegistered && !isCompleted && !isAdmin() ? (
                        hasPendingWithdrawal ? (
                          <span style={{ ...styles.tinyChip, background: 'rgba(249,168,37,0.14)', color: 'var(--warning)', fontSize: '0.68rem' }}>
                            ⏳ Withdrawal pending
                          </span>
                        ) : (
                          <button
                            onClick={() => handleUnregisterForOne(t.id)}
                            style={{ ...styles.tinyEnterBtn, background: 'var(--danger)' }}
                            title="Request to withdraw from this tournament"
                          >✕ Unregister</button>
                        )
                      ) : alreadyRegistered && !isCompleted && isAdmin() ? (
                        <button
                          onClick={() => handleUnregisterForOne(t.id)}
                          style={{ ...styles.tinyEnterBtn, background: 'var(--danger)' }}
                          title="Remove participant immediately (admin)"
                        >✕ Remove</button>
                      ) : (
                        <span style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>—</span>
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
                        style={{ ...styles.tinyIconBtn, background: activeTournament === t.id ? 'rgba(249,168,37,0.14)' : undefined }}
                        title="Select"
                      >{activeTournament === t.id ? '✓' : '→'}</button>
                      {isAdmin() && (
                        <button
                          onClick={() => setManagePlayersTournamentId(t.id)}
                          style={{ ...styles.tinyIconBtn, color: 'var(--accent)', borderColor: 'var(--border)' }}
                          title={t.participant_mode === 'team' ? 'Manage teams for this tournament' : 'Manage players for this tournament'}
                        >👥</button>
                      )}
                      {isAdmin() && (
                        <button
                          onClick={() => {
                            setTEditForm({
                              status: t.status || 'registration_open',
                              registration_open: t.registration_open !== false,
                              start_date: t.start_date || '',
                              end_date: t.end_date || '',
                              max_participants: t.max_participants || 8,
                            });
                            setEditTournamentId(t.id);
                          }}
                          style={{ ...styles.tinyIconBtn, color: 'var(--accent)', borderColor: 'var(--border)' }}
                          title="Edit status / registration / date"
                        >⚙️</button>
                      )}
                      {isAdmin() && (
                        <button
                          onClick={() => setTournamentToDelete(t)}
                          style={{ ...styles.tinyIconBtn, color: 'var(--danger)', borderColor: 'rgba(229,57,53,0.24)' }}
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

        {isAdmin() && managePlayersTournamentId != null && (() => {
          const managedTournament = tournaments.find((tournament) => String(tournament.id) === String(managePlayersTournamentId));
          if (!managedTournament) return null;
          const managedParticipants = partsByTournament[managedTournament.id] || [];
          const registeredIds = new Set(managedParticipants.map((participant) => String(participant.employee_id).toUpperCase()));
          const isTeamTournament = managedTournament.participant_mode === 'team';
          const managedTeamEntries = tournamentTeamEntries.filter((entry) => String(entry.tournament_id) === String(managedTournament.id));
          const registeredTeamIds = new Set(managedTeamEntries.map((entry) => String(entry.team_id)));
          const canManage = managedTournament.registration_open !== false
            && managedTournament.status === 'registration_open'
            && (!managedTournament.start_date || new Date(managedTournament.start_date) > new Date());
          if (isTeamTournament) return (
            <div style={styles.modalOverlay} onClick={() => setManagePlayersTournamentId(null)}>
              <div style={{ ...styles.modal, maxWidth: 720 }} onClick={(event) => event.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>👥 Manage Teams — {managedTournament.name}</h3>
                  <button onClick={() => setManagePlayersTournamentId(null)} style={styles.modalClose}>✕</button>
                </div>
                <div style={{ padding: '0.9rem', display: 'grid', gap: '0.7rem' }}>
                  {!canManage && <div style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>Teams can be added or removed only while registration is open and before the tournament starts.</div>}
                  <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{managedTeamEntries.length} teams registered · Team rosters remain flexible and are selected per match.</div>
                  <div style={{ display: 'grid', gap: '0.4rem', maxHeight: 420, overflowY: 'auto' }}>
                    {reusableTeams.map((team) => {
                      const registered = registeredTeamIds.has(String(team.id));
                      const full = !registered && managedTournament.max_participants && managedTeamEntries.length >= managedTournament.max_participants;
                      return <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.55rem 0.65rem', border: '1px solid var(--border)', borderRadius: 8, background: registered ? 'var(--accent-soft)' : 'var(--bg-surface-strong)' }}>
                        <div style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', fontSize: '0.75rem' }}>{team.name}</strong><span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{teamMemberCounts[team.id] || 0} players · {team.description || 'Flexible roster'}</span></div>
                        {registered ? <button disabled={!canManage} onClick={async () => { const { error } = await supabase.from('tournament_team_entries').delete().match({ tournament_id: managedTournament.id, team_id: team.id }); if (error) showToast(error.message, 'error'); else { setTournamentTeamEntries((current) => current.filter((entry) => !(String(entry.tournament_id) === String(managedTournament.id) && String(entry.team_id) === String(team.id)))); showToast(`${team.name} removed from ${managedTournament.name}`); } }} style={{ ...styles.tinyEnterBtn, background: 'var(--danger)', opacity: canManage ? 1 : 0.5 }}>Remove</button> : <button disabled={!canManage || full} onClick={async () => { const { data, error } = await supabase.from('tournament_team_entries').insert({ tournament_id: managedTournament.id, team_id: team.id, status: 'registered' }).select().single(); if (error) showToast(error.message, 'error'); else { setTournamentTeamEntries((current) => [...current, data]); showToast(`${team.name} added to ${managedTournament.name}`); } }} style={{ ...styles.tinyEnterBtn, background: 'var(--accent)', opacity: canManage && !full ? 1 : 0.5 }}>{full ? 'Full' : 'Add'}</button>}
                      </div>;
                    })}
                  </div>
                </div>
                <div style={styles.modalFooter}><button onClick={() => setManagePlayersTournamentId(null)} style={styles.outlineBtn}>Close</button></div>
              </div>
            </div>
          );
          return (
            <div style={styles.modalOverlay} onClick={() => setManagePlayersTournamentId(null)}>
              <div style={{ ...styles.modal, maxWidth: 720 }} onClick={(event) => event.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>👥 Manage Players — {managedTournament.name}</h3>
                  <button onClick={() => setManagePlayersTournamentId(null)} style={styles.modalClose}>✕</button>
                </div>
                <div style={{ padding: '0.9rem', display: 'grid', gap: '0.7rem' }}>
                  {!canManage && <div style={{ color: 'var(--warning)', fontSize: '0.75rem' }}>Players can be added or removed only while registration is open and before the tournament starts.</div>}
                  <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{managedParticipants.length} / {managedTournament.max_participants || 8} registered · The same employee may be registered in other tournaments.</div>
                  <div style={{ display: 'grid', gap: '0.4rem', maxHeight: 420, overflowY: 'auto' }}>
                    {employees.filter((employee) => employee.is_active !== false).map((employee) => {
                      const employeeId = String(employee.employee_code || '').toUpperCase();
                      const registered = registeredIds.has(employeeId);
                      const full = managedParticipants.length >= (managedTournament.max_participants || 8);
                      return (
                        <div key={employee.employee_code} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem', border: '1px solid var(--border)', borderRadius: 7 }}>
                          <div style={{ minWidth: 0, flex: 1 }}><strong style={{ display: 'block', fontSize: '0.75rem' }}>{employee.name}</strong><span style={{ color: 'var(--muted)', fontSize: '0.65rem' }}>{employee.employee_code} · {employee.department || 'General'}</span></div>
                          {registered ? <button disabled={!canManage} onClick={async () => { const result = await unregisterFromTournament(managedTournament.id, employee.employee_code); if (result.success) showToast(`${employee.name} removed from ${managedTournament.name}`); else showToast(result.error || 'Failed to remove player', 'error'); }} style={{ ...styles.tinyEnterBtn, background: 'var(--danger)', opacity: canManage ? 1 : 0.5 }}>Remove</button> : <button disabled={!canManage || full} onClick={async () => { const result = await registerForTournament(managedTournament.id, employee.employee_code); if (result.success) showToast(`${employee.name} added to ${managedTournament.name}`); else showToast(result.error || 'Failed to add player', 'error'); }} style={{ ...styles.tinyEnterBtn, background: 'var(--accent)', opacity: canManage && !full ? 1 : 0.5 }}>{full ? 'Full' : 'Add'}</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={styles.modalFooter}><button onClick={() => setManagePlayersTournamentId(null)} style={styles.outlineBtn}>Close</button></div>
              </div>
            </div>
          );
        })()}

        {/* ── Admin: Pending Registration Requests ─────────────────────── */}
        {isAdmin() && tournamentRegistrationRequests.filter(r => String(r.status||'').toLowerCase() === 'pending').length > 0 && (
          <div style={{ ...styles.card, background: 'rgba(249,168,37,0.08)', marginTop: '1rem', borderRadius: 8, padding: '0.8rem 1rem' }}>
            <div style={{ ...styles.cardHeaderTitle, marginBottom: '0.6rem' }}>📋 Pending Registration Requests</div>
            {tournamentRegistrationRequests
              .filter(r => String(r.status || '').toLowerCase() === 'pending')
              .map(r => {
                const t = tournaments.find(x => x.id === r.tournament_id);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid #ffe082', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 600, minWidth: 120  }}>{getEmployeeName(r.employee_id)}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>→ {t?.name || `Tournament #${r.tournament_id}`}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                      <button
                        onClick={async () => {
                          const res = await approveTournamentRegistration(r.id);
                          res.success ? showToast(`Approved ${getEmployeeName(r.employee_id)}`) : showToast(res.error || 'Failed', 'error');
                        }}
                        style={{ ...styles.tinyEnterBtn, background: 'var(--success)' }}
                      >✓ Approve</button>
                      <button
                        onClick={async () => {
                          const { error } = await import('../utils/supabase').then(m => m.supabase.from('tournament_registration_requests').delete().match({ id: r.id }));
                          if (!error) { showToast('Request rejected'); }
                        }}
                        style={{ ...styles.tinyEnterBtn, background: 'var(--danger)' }}
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
          <div style={{ ...styles.card, background: 'rgba(233,30,99,0.08)', marginTop: '0.6rem', borderRadius: 8, padding: '0.8rem 1rem' }}>
            <div style={{ ...styles.cardHeaderTitle, marginBottom: '0.6rem' }}>🚪 Pending Withdrawal Requests</div>
            {Object.values(withdrawalPendingByTournament).flat().map(p => {
              const t = tournaments.find(x => x.id === p.tournament_id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: '1px solid #f48fb1', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, minWidth: 120  }}>{getEmployeeName(p.employee_id)}</span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>wants to leave <strong>{t?.name || `Tournament #${p.tournament_id}`}</strong></span>
                  <span style={{ ...styles.tinyChip, background: 'rgba(249,168,37,0.14)', color: 'var(--warning)', fontSize: '0.68rem' }}>⚠ Tournament is live</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
                    <button
                      onClick={async () => {
                        const res = await approveWithdrawalRequest(p.id);
                        res.success ? showToast(`${getEmployeeName(p.employee_id)} withdrawn from ${t?.name || 'tournament'}`, 'warning') : showToast(res.error || 'Failed', 'error');
                      }}
                      style={{ ...styles.tinyEnterBtn, background: 'var(--danger)' }}
                    >✓ Approve Withdrawal</button>
                    <button
                      onClick={async () => {
                        const res = await rejectWithdrawalRequest(p.id);
                        res.success ? showToast(`Withdrawal rejected — ${getEmployeeName(p.employee_id)} stays enrolled`) : showToast(res.error || 'Failed', 'error');
                      }}
                      style={{ ...styles.tinyEnterBtn, background: 'var(--accent)' }}
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
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>No tournaments exist yet.</div>
        </div>
      );
    }
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Loading tournament data…</div>
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
    const teamLabel = (captainId, teamPlayers, teamName = null) => {
      if (teamName) return teamName;
      const players = (teamPlayers || []).map(p => p.employee_id).filter(Boolean);
      const allIds = [captainId, ...players].filter(Boolean);
      if (allIds.length === 0) return 'TBD';
      const uniqueIds = [...new Set(allIds)];
      const names = uniqueIds.map(id => getEmployeeName(id));

      return names.join(' & ');
    };

    const latestRound = roundGroups[roundGroups.length - 1];
    const latestRoundOpen = latestRound
      ? latestRound.matches.some((match) => !['completed', 'walkover', 'no_show', 'bye', 'draw', 'cancelled', 'rescheduled', 'disputed'].includes(String(match.status || '').toLowerCase()))
      : false;
    // For round_robin: fixtures not yet generated if no RR matches exist
    // (KO shell matches don't count — they're created alongside, not before, RR).
    const rrMatchesExist = activeTournamentFormat === 'round_robin'
      ? matchesForActive.some((m) =>
          String(m.round || '').toUpperCase().startsWith('RR') &&
          !String(m.match_code || '').toUpperCase().startsWith('KO_')
        )
      : false;

    const canGenerateFixtures = isAdmin()
      && activeTournamentRecord?.status !== 'completed'
      && activeTournamentRecord?.registration_open === false
      && (
        activeTournamentFormat === 'swiss'
          ? !latestRoundOpen
          : activeTournamentFormat === 'round_robin'
            ? !rrMatchesExist || matchesForActive.every((match) => {
                const status = String(match.status || '').toLowerCase();
                return ['scheduled', 'pending'].includes(status)
                  && !match.winner_team_id
                  && !match.winner_employee_id
                  && match.score_a == null
                  && match.score_b == null
                  && !match.played_at
                  && match.duration_seconds == null;
              })
            : matchesForActive.length === 0 || matchesForActive.every((match) => {
              const status = String(match.status || '').toLowerCase();
              return ['scheduled', 'pending'].includes(status)
                && !match.winner_team_id
                && !match.winner_employee_id
                && match.score_a == null
                && match.score_b == null
                && !match.played_at
                && match.duration_seconds == null;
            })
      );
    const canRegenerateFixtures = activeTournamentFormat !== 'swiss' && matchesForActive.length > 0;
    const generateLabel = activeTournamentFormat === 'swiss' && matchesForActive.length > 0
      ? 'Generate Next Swiss Round'
      : canRegenerateFixtures ? 'Regenerate Fixtures' : 'Generate Fixtures';

    // In TournamentsPage.jsx, find the renderMatch function inside renderBracket
// and update the part that displays the player names:

// In TournamentsPage.jsx, update the renderMatch function:

const renderMatch = (m) => {
  const isTeamTournament = activeTournamentRecord?.participant_mode === 'team';
  const hasTeamA = Boolean(m.team_a_id);
  const hasTeamB = Boolean(m.team_b_id);
  // TBD vs TBD shell matches — show as an upcoming placeholder card
  const isPhantom = !m.player_a_employee_id && !m.player_b_employee_id && !hasTeamA && !hasTeamB;

  // Check if this match is waiting for a winner from a previous match
  const waitingForWinnerA = !isTeamTournament && m._feeds_from_a && !m.player_a_employee_id;
  const waitingForWinnerB = !isTeamTournament && m._feeds_from_b && !m.player_b_employee_id;
  
  // Check if this match has TBD on either side (waiting for previous match)
  const hasTBD = isTeamTournament
    ? !hasTeamA || !hasTeamB
    : !m.player_a_employee_id || !m.player_b_employee_id;
  const isLineupMissing = isTeamTournament && !isPhantom && (!m.team_a_players?.length || !m.team_b_players?.length);

  const a = isPhantom ? 'TBD' : teamLabel(m.player_a_employee_id, m.team_a_players, m.team_a_name);
  const b = isPhantom ? 'TBD' : teamLabel(m.player_b_employee_id, m.team_b_players, m.team_b_name);
  
  const hasScore = m.score_a !== null && m.score_b !== null;
  const isFinal  = String(m.round || '').toUpperCase() === 'F';

  const explicitStatus = String(m.status || '').toLowerCase();
  const hasRealStatus = explicitStatus !== '' && explicitStatus !== 'bye';
  const isBye =
    explicitStatus === 'bye' ||
    (
      ((!m.player_a_employee_id && !!m.player_b_employee_id) ||
       (!!m.player_a_employee_id && !m.player_b_employee_id)) &&
      !hasRealStatus
    );

  const matchTime = m.scheduled_at
    ? new Date(m.scheduled_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
        hour12: true,
      })
    : null;

  // Determine match status for display
  const isTBDMatch = hasTBD && !isBye && !isPhantom;
  
  // Determine if result can be entered
  const canEnterResult = canEditMatch(m) && !isBye && !isPhantom && !isTBDMatch && !isLineupMissing;

  return (
    <div key={m.id || m.match_code} style={{
      ...styles.matchCard,
      border: isFinal ? '2px solid #f9a825'
            : isPhantom ? '1px dashed rgba(144,202,249,0.6)'
            : isBye ? '1px dashed var(--border-strong)'
            : isTBDMatch ? '1px dashed #ff9800'
            : '1px solid var(--border)',
      opacity: isBye || isPhantom ? 0.82 : 1,
      background: isPhantom ? 'var(--bg-soft)' : isTBDMatch ? 'rgba(255,152,0,0.07)' : 'var(--bg-surface-strong)',
    }}>
      {/* Time badge */}
      {matchTime && (
        <div style={{
          fontSize: '0.62rem', fontWeight: 600,
          color: 'var(--accent)', background: 'var(--accent-soft)',
          borderRadius: 3, padding: '0.12rem 0.4rem',
          marginBottom: '0.28rem', display: 'inline-block',
           }}>
          🕐 {matchTime}
        </div>
      )}

      <div style={styles.matchLabel}>
        Match {m.match_code || m.match_number}
        {isTBDMatch && (
          <span style={{ fontSize: '0.55rem', color: '#e65100', marginLeft: '0.4rem' }}>
            ⏳ Waiting for previous match
          </span>
        )}
      </div>

      {/* Player A */}
      <div style={{
        ...styles.matchPlayer,
        background: hasScore && m.score_a > m.score_b ? 'rgba(46,125,50,0.14)' :
                    waitingForWinnerA ? 'rgba(230,81,0,0.10)' : 'transparent',
        color: isPhantom ? 'var(--muted)'
              : hasScore && m.score_a > m.score_b ? 'var(--success)'
              : waitingForWinnerA ? '#e65100'
              : 'var(--text)',
        fontWeight: hasScore && m.score_a > m.score_b ? 700 :
                    waitingForWinnerA ? 600 : 500,
        fontStyle: isPhantom || waitingForWinnerA ? 'italic' : 'normal',
      }}>
        <span style={{ fontSize: '0.7rem' }}>
          {waitingForWinnerA ? `← Winner of ${m._feeds_from_a || 'previous match'}` : a}
        </span>
        <span style={{ marginLeft: '0.4rem' }}>{isPhantom ? '' : (m.score_a ?? '—')}</span>
      </div>

      <div style={{
        textAlign: 'center',
        fontSize: '0.7rem',
        fontWeight: 700,
        color: 'var(--muted)',
        margin: '0.2rem 0',
        opacity: isPhantom ? 0 : 1
      }}>
        VS
      </div>

      {/* Player B */}
      <div style={{
        ...styles.matchPlayer,
        background: hasScore && m.score_b > m.score_a ? 'rgba(46,125,50,0.14)' :
                    waitingForWinnerB ? 'rgba(230,81,0,0.10)' : 'transparent',
        color: isPhantom ? 'var(--muted)'
              : hasScore && m.score_b > m.score_a ? 'var(--success)'
              : waitingForWinnerB ? '#e65100'
              : (isBye && !m.player_b_employee_id) ? 'var(--muted)' : 'var(--text)',
        fontWeight: hasScore && m.score_b > m.score_a ? 700 :
                    waitingForWinnerB ? 600 : 500,
        fontStyle: isPhantom || (isBye && !m.player_b_employee_id) || waitingForWinnerB ? 'italic' : 'normal',
      }}>
        <span style={{ fontSize: '0.7rem' }}>
          {waitingForWinnerB ? `← Winner of ${m._feeds_from_b || 'previous match'}` : b}
        </span>
        <span style={{ marginLeft: '0.4rem' }}>{isPhantom ? '' : (m.score_b ?? '—')}</span>
      </div>

      {/* Status line */}
      <div style={{
        ...styles.matchMeta,
        ...(m.status === 'rescheduled' ? { color: '#e65100', fontWeight: 600 } : {}),
        ...(m.status === 'cancelled'   ? { color: '#c62828', fontWeight: 600 } : {}),
        ...(m.status === 'disputed'    ? { color: '#6a1b9a', fontWeight: 600 } : {}),
        ...(m.status === 'no_show'     ? { color: '#5c6bc0', fontWeight: 600 } : {}),
      }}>
        {isLineupMissing
          ? '👥 Select the lineup for this match'
          : isPhantom
          ? '⏳ Awaiting earlier results'
          : m.status === 'completed'
            ? '✓ Final'
            : isBye
              ? '✓ Advanced by Bye'
              : isTBDMatch
                ? `⏳ Waiting for ${m._feeds_from_a || m._feeds_from_b || 'previous'} match winner`
                : m.status === 'walkover'
                  ? '↷ Walkover'
                  : m.status === 'rescheduled'
                    ? '📅 Rescheduled'
                    : m.status === 'cancelled'
                      ? '✕ Cancelled'
                      : m.status === 'disputed'
                        ? '⚠ Disputed'
                        : m.status === 'no_show'
                          ? '👻 No Show'
                          : m.status === 'live'
                            ? '● Live'
                            : '⏳ Pending'}
      </div>

      {/* Enter/Edit result — ONLY when both players are known and match is not a bye */}
      {!isBye && !isPhantom && !isTBDMatch && canEditMatch(m) && (
        <button
          onClick={() => openResultModal(m)}
          style={{ ...styles.tinyEnterBtn, marginTop: '0.4rem', width: '100%' }}
        >
          {m.status === 'completed' ? '✎ Edit Result' : '⏎ Enter Result'}
        </button>
      )}

      {/* For TBD matches, show a disabled/info button */}
      {!isBye && !isPhantom && (isTBDMatch || isLineupMissing) && (
        <div style={{ 
          marginTop: '0.4rem', 
          padding: '0.2rem 0.55rem', 
          fontSize: '0.66rem', 
          color: '#e65100', 
          background: 'rgba(255,152,0,0.10)', 
          borderRadius: 4,
          textAlign: 'center',
          border: '1px dashed #ff9800'
        }}>
          {isLineupMissing ? '👥 Choose players from both team rosters before entering the result' : '🔒 Waiting for previous match result'}
        </div>
      )}

      {/* Admin edit/delete — show for all non-phantom matches */}
      {!isPhantom && isAdmin() && (
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
          <button
            onClick={() => openEditMatchModal(m)}
            style={{ ...styles.tinyEnterBtn, background: 'var(--accent)', flex: 1 }}
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

    const allKoMatchGroups = koColKeys.map((colKey) => ({
      key: colKey,
      label: koColLabels[colKey],
      matches: koMatches
        .filter((m) => String(m.match_code || '').toUpperCase().startsWith(colKey))
        .sort((a, b) => (a.match_number || 0) - (b.match_number || 0)),
    }));
    // Hide playoff rounds that do not exist for this team count (e.g. no QF with 3–4 teams).
    const koMatchGroups = allKoMatchGroups.filter((g) => g.matches.length > 0);
    const koFlowLabel = koMatchGroups.map((g) => (g.key === 'KO_F' ? 'Final' : g.key === 'KO_SF' ? 'SF' : 'QF')).join(' → ');

    // Matches reference TEAM ids, so standings are built from the teams that
    // appear in the round-robin matches (not from participant rows).
    const rrTeams = (() => {
      if (!isRoundRobin) return [];
      const map = new Map();
      rrMatches.forEach((m) => {
        ['a', 'b'].forEach((x) => {
          const id = m[`team_${x}_id`];
          if (id == null || map.has(String(id))) return;
          const players = (m[`team_${x}_players`] || []).map((pl) => pl.employee_id).filter(Boolean);
          const captain = m[`player_${x}_employee_id`] || players[0] || null;
          map.set(String(id), { id, captain, players: players.length ? players : (captain ? [captain] : []) });
        });
      });
      return [...map.values()]
        .sort((p1, p2) => Number(p1.id) - Number(p2.id))
        .map((t, i) => ({ ...t, seed: i + 1 }));
    })();
    const rrTeamLabel = (teamId) => {
      const t = rrTeams.find((x) => String(x.id) === String(teamId));
      if (!t || t.players.length === 0) return 'TBD';
      const names = [...new Set(t.players)].map((id) => getEmployeeName(id));
      return names.length > 1 ? `Team (${names.join(', ')})` : names[0];
    };
    const rrStandings = isRoundRobin
      ? computeRoundRobinStandings(rrMatches, rrTeams)
      : [];
    const playoffShapeUi = getPlayoffShape(
      rrTeams.length,
      activeTournamentRecord?.playoff_mode || 'auto'
    );
    const playoffQualifiers = { none: 0, sf_final_bye: 3, sf_final: 4, qf_sf_final: 5 }[playoffShapeUi.kind] ?? 0;

    const rrAllDone = rrMatches.length > 0 && rrMatches.every((m) =>
      ['completed', 'walkover', 'no_show', 'draw', 'bye', 'cancelled'].includes(
        String(m.status || '').toLowerCase()
      )
    );
    const hasKoPhase = koMatches.length > 0;
    // KO is now auto-generated alongside RR fixtures — no manual "Generate KO" button needed.

    return (
      <div style={{ display: 'grid', gap: '1rem' }}>

        {/* ── Top tournament selector bar (shown for RR / league / swiss so
             users can switch without scrolling down to the buried dropdown) ── */}
        {(isRoundRobin || activeTournamentFormat === 'league' || activeTournamentFormat === 'swiss') && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            flexWrap: 'wrap',
            background: 'var(--bg-surface-strong)',
            border: '1px solid #d8e2ef',
            borderRadius: 10,
            padding: '0.6rem 1rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-soft)', whiteSpace: 'nowrap'  }}>
              📋 Tournament
            </span>
            <select
              value={activeTournament || ''}
              onChange={(e) => setActiveTournament(e.target.value)}
              style={{
                ...styles.formInput,
                flex: 1, minWidth: 220, maxWidth: 400,
                fontWeight: 600, color: 'var(--accent)',
                borderColor: 'var(--accent)', borderRadius: 6,
                 }}
            >
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.game} · {STATUS_BADGE[t.status]?.label || t.status}
                </option>
              ))}
            </select>
            {activeTournamentRecord && (
              <span style={{
                ...styles.tinyChip,
                background: FORMAT_BADGE[activeTournamentRecord.format]?.bg || 'var(--bg-muted)',
                color: FORMAT_BADGE[activeTournamentRecord.format]?.color || 'var(--text-soft)',
                fontSize: '0.68rem', whiteSpace: 'nowrap',
              }}>
                {FORMAT_BADGE[activeTournamentRecord.format]?.label || activeTournamentRecord.format}
              </span>
            )}
            {activeTournamentRecord && (
              <span style={{ fontSize: '0.68rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                {formatDate(activeTournamentRecord.start_date)}
                {activeTournamentRecord.end_date ? ` → ${formatDate(activeTournamentRecord.end_date)}` : ''}
              </span>
            )}
          </div>
        )}

        {/* ── Round-Robin Standings Table ─────────────────────────────── */}
        {isRoundRobin && rrMatches.length > 0 && (
          <div className="clay-card" style={{ ...styles.card, background: 'var(--accent-soft)' }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>📋 Round-Robin Standings</div>
              {rrAllDone && hasKoPhase && (
                <span style={{ ...styles.tinyChip, background: '#e8f5e9', color: '#2e7d32', fontSize: '0.72rem' }}>
                  ✓ All RR matches done — Knockout phase active
                </span>
              )}
              {!rrAllDone && hasKoPhase && (
                <span style={{ ...styles.tinyChip, background: '#fff3e0', color: '#e65100', fontSize: '0.72rem' }}>
                  🔄 Standings update live — KO bracket fills automatically
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
              <table style={{ ...styles.table, minWidth: 700 }}>
                <thead>
                  <tr style={styles.theadRow}>
                    {['Rank', 'Team / Player', 'P', 'W', 'D', 'L', 'Pts', 'Qualify'].map((h) => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rrStandings.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>
                        No results yet.
                      </td>
                    </tr>
                  ) : rrStandings.map((row, i) => {
                    const qualifies = i < playoffQualifiers;
                    const isTop3    = playoffShapeUi.kind === 'qf_sf_final' && i < 3;
                    return (
                      <tr
                        key={row.team_id}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          background: isTop3 ? 'rgba(46,125,50,0.10)' : qualifies ? 'var(--bg-muted)' : 'transparent',
                          opacity: qualifies ? 1 : 0.55,
                        }}
                      >
                        <td style={{ ...styles.td, fontWeight: 700, color: i === 0 ? '#f9a825' : i === 1 ? 'var(--muted-strong)' : i === 2 ? '#d84315' : 'var(--text-soft)'  }}>
                          {i + 1}
                        </td>
                        <td style={{ ...styles.td, fontWeight: 600  }}>{rrTeamLabel(row.team_id)}</td>
                        <td style={styles.td}>{row.played}</td>
                        <td style={{ ...styles.td, color: 'var(--success)', fontWeight: 600  }}>{row.won}</td>
                        <td style={styles.td}>{row.drawn}</td>
                        <td style={{ ...styles.td, color: 'var(--danger)' }}>{row.lost}</td>
                        <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent)'  }}>{row.points}</td>
                        <td style={styles.td}>
                          {qualifies ? (
                            <span style={{
                              ...styles.tinyChip,
                              background: isTop3 ? 'rgba(46,125,50,0.14)' : 'rgba(230,81,0,0.12)',
                              color: isTop3 ? 'var(--success)' : '#e65100',
                            }}>
                              {isTop3 ? `Seed ${i + 1} — BYE` : `Seed ${i + 1}`}
                            </span>
                          ) : (
                            <span style={{ ...styles.tinyChip, background: 'rgba(229,57,53,0.12)', color: 'var(--danger)' }}>Eliminated</span>
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
  <div> Final knockout fixtures depend on the results of the round-robin phase </div>
        {/* ── Knockout Bracket (round-robin → KO phase) ───────────────── */}
        {isRoundRobin && hasKoPhase && (
          <div className="clay-card" style={{ ...styles.card }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>🏆 Knockout Phase</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                {rrAllDone ? `Top ${playoffQualifiers || koMatchGroups.length} · ${koFlowLabel}` : `⏳ Teams fill in as league results arrive · ${koFlowLabel}`}
              </span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
              <div style={{ ...styles.bracketGrid, gridTemplateColumns: `repeat(${Math.max(1, koMatchGroups.length)}, 1fr)`, minWidth: Math.max(1, koMatchGroups.length) * 240 }}>
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
                style={{ ...styles.formInput, width: 'auto', minWidth: 200, fontWeight: 600, color: 'var(--accent)', borderColor: 'var(--accent)'  }}
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
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  {activeTournamentRecord.format.replace('_', ' ').toUpperCase()}
                </span>
              )}
              {isAdmin() && activeTournamentRecord && (
                <button
                  onClick={async () => {
                    // Later Swiss rounds reuse the existing teams: no dialog needed.
                    if (activeTournamentFormat === 'swiss' && matchesForActive.length > 0) {
                      const result = await generateTournamentFixtures(activeTournamentRecord.id, {
                        playersPerTeam: activeTournamentRecord.players_per_team || 1,
                        tournamentStartDate: activeTournamentRecord.start_date || null,
                      });
                      showToast(result.success ? 'Swiss round generated' : (result.error || 'Failed to generate fixtures'), result.success ? undefined : 'error');
                      return;
                    }
                    setShowGenModal(true);
                  }}
                  disabled={!canGenerateFixtures}
                  style={{
                    ...styles.navyBtn,
                    background: canGenerateFixtures ? 'var(--accent)' : 'var(--muted)',
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
                    // Reload only. (The old knockout "refresh" deleted every match and
                    // rebuilt the bracket from participants, which destroys results.)
                    await refreshTournamentData();
                    showToast('Fixtures refreshed');
                  }}
                  style={{ ...styles.navyBtn, background: 'var(--accent-strong)' }}
                  title="Reload fixtures and participants from the database"
                >🔄 Refresh</button>
              )}
              <button
                onClick={() => setShowFlowModal(true)}
                disabled={matchesForActive.length === 0}
                style={{
                  ...styles.navyBtn,
                  background: matchesForActive.length > 0 ? '#6a1b9a' : 'var(--muted)',
                  opacity: matchesForActive.length > 0 ? 1 : 0.55,
                  cursor: matchesForActive.length > 0 ? 'pointer' : 'not-allowed',
                }}
                title="Show the tournament progression"
              >🔀 Check Flow</button>
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

          <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
            {/* For RR tournaments, only show the RR fixture grid (KO shown above) */}
            <div style={{
              ...styles.bracketGrid,
              // RR fixture grid: single full-width column, but needs minWidth if using 3-col match grid.
              // KO bracket: one column per round, min 240px each.
              ...(isRoundRobin
                ? { gridTemplateColumns: '1fr', minWidth: 800 }
                : { minWidth: Math.max(3, roundGroups.length) * 260 }
              ),
            }}>
              {(isRoundRobin ? rrMatchGroups : roundGroups).length === 0 ? (
                <div style={{ ...styles.bracketColBody, gridColumn: '1 / -1' }}>
                  <div style={styles.emptyCol}>
                    No fixtures yet. {isAdmin() ? 'Use Generate Fixtures to create the bracket.' : 'Waiting for admin to generate fixtures.'}
                  </div>
                </div>
              ) : (
                (isRoundRobin ? rrMatchGroups : roundGroups).map((group, index) => {
                  // For RR rounds with many matches, display 3 cards per row.
                  // For KO rounds (QF/SF/F) keep the classic single-column bracket look.
                  const isRrRound = String(group.round || '').toUpperCase().startsWith('RR');
                  const useGrid   = isRrRound && group.matches.length > 2;
                  return (
                    <div
                      key={group.round}
                      style={{
                        ...styles.bracketCol,
                        // RR grid column spans full width; KO columns share the grid
                        ...(useGrid ? { gridColumn: '1 / -1' } : {}),
                      }}
                    >
                      <div style={{
                        ...styles.bracketColHeader,
                        background: ['#c81c1c', '#618ff4', '#fbdd65', '#59f0a5', '#8e24aa', '#26a69a'][index % 6],
                      }}>{group.label}</div>
                      <div style={styles.bracketColBody}>
                        {group.matches.length === 0
                          ? <div style={styles.emptyCol}>No matches yet</div>
                          : useGrid
                            ? (
                              <div style={styles.matchesGrid}>
                                {group.matches.map(renderMatch)}
                              </div>
                            )
                            : group.matches.map(renderMatch)
                        }
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="clay-card" style={{background:'var(--bg-surface-strong)'}}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderTitle}>
              Registered Participants — {activeTournamentRecord.name}
            </div>
            {isAdmin() && (
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                {partsList.length} registered
              </span>
            )}
          </div>
          <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
            <table style={{ ...styles.table, minWidth: 900 }}>
              <thead>
                <tr style={styles.theadRow}>
                  {['#','Employee','Department','Registered Tournaments','Matches Played','Won','Lost','Status'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {partsList.length === 0 ? (
                  <tr><td colSpan="8" style={{ ...styles.td, textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>No participants yet.</td></tr>
                ) : partsList.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
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
                              background: count > 1 ? 'var(--accent-soft)' : 'var(--bg-muted)',
                              color: count > 1 ? 'var(--accent)' : 'var(--text-soft)',
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
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select a tournament first.</div>
        </div>
      );
    }
    return (
      <div className="clay-card" style={{background:'var(--bg-surface-strong)'}}>
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderTitle}>Match Records — {activeTournamentRecord.name}</div>
        </div>
        <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
          <table style={{ ...styles.table, minWidth: 1000 }}>
            <thead>
              <tr style={styles.theadRow}>
                {['Round','Match','Team A','Score A','Score B','Team B','Played','Status','Result','Admin'].map((h, i) => (
                  <th key={i} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matchesForActive.length === 0 ? (
                <tr><td colSpan="10" style={{ ...styles.td, textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>No matches scheduled.</td></tr>
              ) : matchesForActive.map((m) => {
                const allowed = canEditMatch(m);
                return (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={styles.td}>{m.round} · M{m.match_number}</td>
                  <td style={styles.td}><strong>{m.match_code || `M${m.match_number}`}</strong></td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_a_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_a_employee_id ? 700 : 500 }}>
                    {m.player_a_employee_id || (m.team_a_players && m.team_a_players.length > 0) ? [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id).filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i).map(id => getEmployeeName(id)).join(' & ') : 'TBD'}
                  </td>
                  <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent)'  }}>{m.score_a ?? '—'}</td>
                  <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent)'  }}>{m.score_b ?? '—'}</td>
                  <td style={{ ...styles.td, color: m.winner_employee_id === m.player_b_employee_id ? '#1b5e20' : '#212121', fontWeight: m.winner_employee_id === m.player_b_employee_id ? 700 : 500 }}>
                    {m.player_b_employee_id || (m.team_b_players && m.team_b_players.length > 0) ? [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id).filter(Boolean)].filter((v, i, a) => a.indexOf(v) === i).map(id => getEmployeeName(id)).join(' & ') : 'TBD'}
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
                      <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }} title="Only the two players in this match (or an admin) can enter results">🔒</span>
                    )}
                  </td>
                  {/* Admin-only: edit match players/schedule + delete */}
                  <td style={styles.td}>
                    {isAdmin() ? (
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        <button
                          onClick={() => openEditMatchModal(m)}
                          style={{ ...styles.tinyIconBtn, color: 'var(--accent)', borderColor: 'var(--border)' }}
                          title="Edit match players / schedule"
                        >✎</button>
                        <button
                          onClick={() => setMatchToDelete(m)}
                          style={{ ...styles.tinyIconBtn, color: '#c62828', borderColor: '#ffcdd2' }}
                          title="Delete this match"
                        >🗑</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>—</span>
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
    return <SharedStopwatchPanel matches={matchesForActive} tournament={activeTournamentRecord} getEmployeeName={getEmployeeName} currentUser={currentUser} />;
  };

  const renderFinalResults = () => {
    if (!activeTournamentRecord) {
      return (
        <div className="clay-card" style={{ ...styles.card, textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Select a tournament first.</div>
        </div>
      );
    }
    const tournament = activeTournamentRecord;
    return (
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div className="clay-card" style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <div style={styles.cardHeaderTitle}>🏅 Final Results</div>
              <select
                value={activeTournament || ''}
                onChange={(e) => setActiveTournament(e.target.value)}
                style={{ ...styles.formInput, width: 'auto', minWidth: 200, fontWeight: 600, color: 'var(--accent)', borderColor: 'var(--accent)'  }}
              >
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} · {t.game} · {STATUS_BADGE[t.status]?.label || t.status}
                  </option>
                ))}
              </select>
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
            <div style={{ overflowX: 'auto', width: '100%', display: 'block', marginBottom: '1.2rem' }}>
              <div style={{ ...styles.podium, minWidth: 600, marginBottom: 0 }}>
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
            </div>
          )}

          <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
            <table style={{ ...styles.table, minWidth: 900 }}>
              <thead>
                <tr style={styles.theadRow}>
                  {['Position','Player','Department','Matches','Won','Lost','Points','Prize','Certificate'].map(h => (
                    <th key={h} style={styles.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {resultsForActive.length === 0 ? (
                  <tr><td colSpan="9" style={{ ...styles.td, textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>No final results declared yet.</td></tr>
                ) : resultsForActive.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={styles.td}>
                      <span style={{
                        ...(r.position === 1 ? { background: 'rgba(249,168,37,0.14)', color: '#f9a825' } :
                            r.position === 2 ? { background: 'var(--bg-muted)', color: 'var(--muted-strong)' } :
                            r.position === 3 ? { background: 'rgba(216,67,21,0.10)', color: '#e65100' } :
                            { background: 'var(--bg-muted)', color: 'var(--text-soft)' }),
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
                    <td style={{ ...styles.td, fontWeight: 700, color: 'var(--accent)'  }}>{r.points}</td>
                    <td style={styles.td}>{r.prize_description || '—'}</td>
                    <td style={styles.td}>
                      {/* Admin: can download certificates for ANY participant.
                          Non-admin: can only download their OWN certificates.
                          Top-3 get TWO buttons (rank cert + participation cert).
                          Others get ONE button (participation cert only). */}
                      {(isAdmin() || r.employee_id?.toUpperCase() === currentEmpId.toUpperCase()) ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>

                          {/* ── Top-3: ONE button → downloads BOTH rank + participation PDFs
                                        and writes TWO rows to certificate_log             ── */}
                          {[1, 2, 3].includes(r.position) && (() => {
                            const rankLabel = r.position === 1 ? '🥇 Rank 1' : r.position === 2 ? '🥈 Rank 2' : '🥉 Rank 3';
                            const btnKey    = `${r.id}_both`;
                            return (
                              <button
                                key="both"
                                disabled={certPrinting === btnKey}
                                onClick={async () => {
                                  setCertPrinting(btnKey);
                                  // certificateType='rank_and_participation' → hook downloads
                                  // participation PDF first, then rank PDF, logs both rows:
                                  //   (participation, position=NULL)
                                  //   (rank_1/2/3,    position=1/2/3)
                                  const result = await generateCertificate({
                                    employeeName:    getEmployeeName(r.employee_id),
                                    employeeId:      r.employee_id,
                                    tournamentId:    activeTournament,
                                    tournamentName:  activeTournamentRecord?.name || '',
                                    position:        r.position,
                                    certificateType: 'rank_and_participation',
                                    issuedBy:        currentEmpId,
                                  });
                                  setCertPrinting(null);
                                  if (result.success) {
                                    showToast(
                                      isAdmin() && r.employee_id?.toUpperCase() !== currentEmpId.toUpperCase()
                                        ? `${rankLabel} + Participation certificates downloaded for ${getEmployeeName(r.employee_id)}!`
                                        : `${rankLabel} + Participation certificates downloaded!`
                                    );
                                  } else {
                                    showToast(result.error || 'Failed to generate certificates', 'error');
                                  }
                                }}
                                style={{
                                  ...styles.tinyEnterBtn,
                                  background: certPrinting === btnKey ? 'var(--muted)' : 'var(--accent)',
                                  opacity: certPrinting === btnKey ? 0.7 : 1,
                                  cursor: certPrinting === btnKey ? 'wait' : 'pointer',
                                  minWidth: 110,
                                  fontSize: '0.63rem',
                                }}
                              >
                                {certPrinting === btnKey ? '⏳ Generating…' : `${rankLabel} + 📜`}
                              </button>
                            );
                          })()}

                          {/* ── Everyone (including top-3): participation cert alone ──
                               Top-3 already got it via the button above on first download.
                               This lets them re-download just the participation cert later. */}
                          {(() => {
                            const partKey = `${r.id}_participation`;
                            return (
                              <button
                                key="participation"
                                disabled={certPrinting === partKey}
                                onClick={async () => {
                                  setCertPrinting(partKey);
                                  const result = await generateCertificate({
                                    employeeName:    getEmployeeName(r.employee_id),
                                    employeeId:      r.employee_id,
                                    tournamentId:    activeTournament,
                                    tournamentName:  activeTournamentRecord?.name || '',
                                    position:        null,           // ← always null for participation
                                    certificateType: 'participation',
                                    issuedBy:        currentEmpId,
                                  });
                                  setCertPrinting(null);
                                  if (result.success) {
                                    showToast(
                                      isAdmin() && r.employee_id?.toUpperCase() !== currentEmpId.toUpperCase()
                                        ? `Participation certificate downloaded for ${getEmployeeName(r.employee_id)}!`
                                        : 'Participation certificate downloaded!'
                                    );
                                  } else {
                                    showToast(result.error || 'Failed to generate participation certificate', 'error');
                                  }
                                }}
                                style={{
                                  ...styles.tinyEnterBtn,
                                  background: certPrinting === partKey ? 'var(--muted)' : 'var(--accent-strong)',
                                  opacity: certPrinting === partKey ? 0.7 : 1,
                                  cursor: certPrinting === partKey ? 'wait' : 'pointer',
                                  minWidth: 110,
                                  fontSize: '0.63rem',
                                }}
                              >
                                {certPrinting === partKey ? '⏳…' : '📜 Participation'}
                              </button>
                            );
                          })()}

                        </div>
                      ) : (
                        <span
                          style={{ fontSize: '0.66rem', color: 'var(--muted)' }}
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

        {/* ── All Participants — Participation Certificates ─────────────────────
            Every registered participant (including top-3) can grab their
            participation cert here. Top-3 also have their rank cert above.   */}
        {partsList.length > 0 && (
          <div className="clay-card" style={{ ...styles.card, marginTop: '1rem' }}>
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderTitle}>📜 All Participants — Participation Certificates</div>
              <span style={styles.recordCount}>{partsList.length} participant(s)</span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-soft)', margin: '0 0 0.85rem 0', lineHeight: 1.55 }}>
              Every registered participant can download their Certificate of Participation here.
              {' '}Top‑3 finishers can additionally download their Rank certificate from the Final Results table above.
            </p>
            <div style={{ overflowX: 'auto', width: '100%', display: 'block' }}>
              <table style={{ ...styles.table, minWidth: 700 }}>
                <thead>
                  <tr style={styles.theadRow}>
                    {['Employee ID', 'Name', 'Department', 'Certificate'].map(h => (
                      <th key={h} style={styles.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {partsList.map((p) => {
                    const canSee = isAdmin() || p.employee_id?.toUpperCase() === currentEmpId.toUpperCase();
                    const btnKey = `part_${p.employee_id}_participation`;
                    return (
                      <tr key={p.id || p.employee_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ ...styles.td, color: 'var(--text-soft)' }}>{p.employee_id}</td>
                        <td style={styles.td}><strong>{getEmployeeName(p.employee_id)}</strong></td>
                        <td style={styles.td}>{p.department || '—'}</td>
                        <td style={styles.td}>
                          {canSee ? (
                            <button
                              disabled={certPrinting === btnKey}
                              onClick={async () => {
                                setCertPrinting(btnKey);
                                const result = await generateCertificate({
                                  employeeName:    getEmployeeName(p.employee_id),
                                  employeeId:      p.employee_id,
                                  tournamentId:    activeTournament,
                                  tournamentName:  activeTournamentRecord?.name || '',
                                  position:        null,
                                  certificateType: 'participation',
                                  issuedBy:        currentEmpId,
                                });
                                setCertPrinting(null);
                                if (result.success) {
                                  showToast(
                                    isAdmin() && p.employee_id?.toUpperCase() !== currentEmpId.toUpperCase()
                                      ? `Participation certificate downloaded for ${getEmployeeName(p.employee_id)}!`
                                      : 'Your participation certificate has been downloaded!'
                                  );
                                } else {
                                  showToast(result.error || 'Failed to generate certificate', 'error');
                                }
                              }}
                              style={{
                                ...styles.tinyEnterBtn,
                                background: certPrinting === btnKey ? 'var(--muted)' : 'var(--accent-strong)',
                                opacity:    certPrinting === btnKey ? 0.7 : 1,
                                cursor:     certPrinting === btnKey ? 'wait' : 'pointer',
                                minWidth: 120,
                              }}
                            >
                              {certPrinting === btnKey ? '⏳ Generating…' : '📜 Download'}
                            </button>
                          ) : (
                            <span
                              style={{ fontSize: '0.66rem', color: 'var(--muted)' }}
                              title="Certificate available only for your own record"
                            >—</span>
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
    const finalGame = tForm.game === 'Other' ? tForm.customGame : tForm.game;
    if (tForm.game === 'Other' && !finalGame?.trim()) {
      showToast('Please enter the game name', 'error');
      return;
    }
    if (tForm.participant_mode === 'team' && tForm.team_ids.length < 2) {
      showToast('Select at least two existing teams', 'error');
      return;
    }
    if (!createPlan.ok) {
      showToast(createPlan.errors[0], 'error');
      return;
    }
    const result = await addTournament({
      ...tForm,
      game: finalGame,
      max_participants: parseInt(tForm.max_participants, 10) || 8,
      players_per_team: parseInt(tForm.players_per_team, 10) || 1,
      participant_mode: tForm.participant_mode,
      lineup_mode: tForm.lineup_mode,
      lineup_size: tForm.lineup_mode === 'fixed' ? parseInt(tForm.lineup_size, 10) || null : null,
      team_ids: tForm.team_ids,
      match_duration_minutes: parseInt(tForm.match_duration_minutes, 10) || 10,
    });
    if (result.success) {
      showToast(`Tournament "${tForm.name}" created!`);
      if (result.warning) showToast(result.warning, 'error');
      setShowNewTournamentModal(false);
      setTForm({ name: '', game: 'Carrom', customGame: '', format: 'knockout', participant_mode: 'individual', lineup_mode: 'variable', lineup_size: '', team_ids: [], players_per_team: 1, start_date: '', end_date: '', max_participants: 8, prize_pool: '', description: '', playoff_mode: 'auto', match_duration_minutes: 10 });
      if (result.data?.id) setActiveTournament(result.data.id);
    } else {
      showToast(result.error || 'Failed to create tournament', 'error');
    }
  };

  // ── Edit match (admin) — pre-fills eForm from the existing match ─────────
  const openEditMatchModal = (match) => {
    const isTeamTournament = activeTournamentRecord?.participant_mode === 'team';
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
      team_a: isTeamTournament ? teamA : pad(teamA, ppt),
      team_b: isTeamTournament ? teamB : pad(teamB, ppt),
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
      winner: activeTournamentRecord?.participant_mode === 'team'
        ? (match.winner_team_id != null ? String(match.winner_team_id) : '')
        : (match.winner_employee_id || ''),
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
    // Non-finishing statuses reset scores and winner so the bracket reverts cleanly.
    const NON_FINISHING_TYPES = ['rescheduled', 'cancelled', 'disputed'];
    const isNonFinishing = NON_FINISHING_TYPES.includes(rForm.result_type);
    const result = await recordMatchResult(resultMatchId, {
      result_type: rForm.result_type,
      score_a: isNonFinishing ? null : (rForm.score_a === '' ? 0 : Number(rForm.score_a)),
      score_b: isNonFinishing ? null : (rForm.score_b === '' ? 0 : Number(rForm.score_b)),
      winner_team_id: isNonFinishing || activeTournamentRecord?.participant_mode !== 'team' ? null : rForm.winner,
      winner_employee_id: isNonFinishing || activeTournamentRecord?.participant_mode === 'team' ? null : rForm.winner,
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
      end_date: tEditForm.end_date || null,
      max_participants: parseInt(tEditForm.max_participants, 10) || 8,
    });
    if (result.success) {
      showToast('Tournament updated');
      setEditTournamentId(null);
    } else {
      showToast(result.error || 'Failed to update tournament', 'error');
    }
  };

  return (
    <div className="tournaments-page" style={{  fontWeight: 400, fontSize: 13, color: 'var(--text)' }}>
      <style>{`
        .tournaments-page .clay-card {
          min-width: 0 !important;
          overflow: hidden !important;
          max-width: 100% !important;
        }
      `}</style>
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
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                borderBottom: isActive ? '3px solid var(--accent)' : '3px solid transparent',
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
      {sub === 'teams' && <ReusableTeamsPanel employees={employees} tournaments={tournaments} isAdminUser={isAdmin()} getEmployeeName={getEmployeeName} />}

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
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
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
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>End Date</label>
                  <input
                    type="date"
                    style={styles.formInput}
                    value={tEditForm.end_date}
                    onChange={(e) => setTEditForm(f => ({ ...f, end_date: e.target.value }))}
                  />
                </div>
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>{tForm.participant_mode === 'team' ? 'Max Teams' : 'Max Participants'}</label>
                  <input
                    type="number"
                    min="2"
                    max="256"
                    style={styles.formInput}
                    value={tEditForm.max_participants}
                    onChange={(e) => setTEditForm(f => ({ ...f, max_participants: e.target.value }))}
                  />
                </div>
                <div style={{
                  fontSize: '0.68rem', color: 'var(--warning)',
                  background: 'rgba(249,168,37,0.10)', borderRadius: 4,
                  padding: '0.55rem 0.7rem', border: '1px solid rgba(249,168,37,0.32)',
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>New Tournament</h3>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <select style={styles.formInput} value={tForm.game}
                            onChange={(e) => setTForm(f => ({ ...f, game: e.target.value }))}>
                      <option>Carrom</option>
                      <option>Chess</option>
                      <option>Table Tennis</option>
                      <option value="Other">Other</option>
                    </select>
                    {tForm.game === 'Other' && (
                      <input style={styles.formInput} placeholder="Enter game name" value={tForm.customGame}
                             onChange={(e) => setTForm(f => ({ ...f, customGame: e.target.value }))} />
                    )}
                  </div>
                </div>
                {tForm.participant_mode !== 'team' && <div style={styles.formRow}>
                  <label style={styles.formLabel}>Format</label>
                  <select style={styles.formInput} value={tForm.format}
                          onChange={(e) => setTForm(f => ({ ...f, format: e.target.value }))}>
                    <option value="knockout">Knockout</option>
                    <option value="round_robin">Round Robin</option>
                    <option value="league">League</option>
                    <option value="swiss">Swiss</option>
                  </select>
                </div>}
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Participants</label>
                  <select style={styles.formInput} value={tForm.participant_mode}
                          onChange={(e) => setTForm(f => ({ ...f, participant_mode: e.target.value, max_participants: e.target.value === 'team' ? Math.max(2, f.team_ids.length || 2) : f.max_participants }))}>
                    <option value="individual">Individual players</option>
                    <option value="team">Existing teams</option>
                  </select>
                </div>
                {tForm.participant_mode === 'team' && (
                  <div style={{ ...styles.formRow, gridColumn: 'span 2', display: 'grid', gap: '0.55rem' }}>
                    <div style={{ padding: '0.55rem 0.65rem', border: '1px dashed var(--border-strong)', borderRadius: 8, color: 'var(--text-soft)', fontSize: '0.7rem' }}>Create the tournament first. You can select existing teams afterwards from <strong>Manage Teams</strong> in the tournament list.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                      <div style={styles.formRow}><label style={styles.formLabel}>Lineup rule</label><select style={styles.formInput} value={tForm.lineup_mode} onChange={(e) => setTForm(f => ({ ...f, lineup_mode: e.target.value }))}><option value="variable">Variable lineup per match</option><option value="fixed">Fixed players per side</option><option value="full_team">Full team</option></select></div>
                      {tForm.lineup_mode === 'fixed' && <div style={styles.formRow}><label style={styles.formLabel}>Players per side</label><input style={styles.formInput} type="number" min="1" value={tForm.lineup_size} onChange={(e) => setTForm(f => ({ ...f, lineup_size: e.target.value }))} /></div>}
                    </div>
                    <div style={{ color: 'var(--text-soft)', fontSize: '0.68rem' }}>Team size is not fixed. Match lineups can use any number of players from each selected team.</div>
                  </div>
                )}
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
                {tForm.participant_mode !== 'team' && <div style={styles.formRow}>
                  <label style={styles.formLabel}>Max Participants</label>
                  <input style={styles.formInput} type="number" min="2" step={tForm.players_per_team || 1} value={tForm.max_participants}
                         onChange={(e) => setTForm(f => ({ ...f, max_participants: e.target.value }))}
                         onBlur={() => {
                           const ppt = parseInt(tForm.players_per_team, 10) || 1;
                           const raw = parseInt(tForm.max_participants, 10) || 0;
                           const eff = getEffectiveMaxPlayers(raw, ppt);
                           if (eff >= ppt * 2 && eff !== raw) {
                             setTForm(f => ({ ...f, max_participants: eff }));
                             showToast(`Max players rounded to ${eff} (${eff / ppt} full teams of ${ppt})`);
                           }
                         }} />
                </div>}
                {tForm.participant_mode !== 'team' && <div style={styles.formRow}>
                  <label style={styles.formLabel}>Players Per Team</label>
                  <input style={styles.formInput} type="number" min="1" value={tForm.players_per_team}
                         onChange={(e) => setTForm(f => ({ ...f, players_per_team: parseInt(e.target.value, 10) || 1 }))} />
                </div>}
                <div style={styles.formRow}>
                  <label style={styles.formLabel}>Time per match (minutes)</label>
                  <input style={styles.formInput} type="number" min="5" max="240" step="1"
                         placeholder="e.g. 25"
                         value={tForm.match_duration_minutes}
                         onChange={(e) => setTForm(f => ({ ...f, match_duration_minutes: e.target.value }))}
                         onBlur={() => {
                           const raw = parseInt(tForm.match_duration_minutes, 10);
                           const fixed = Number.isFinite(raw) ? Math.min(240, Math.max(5, raw)) : 30;
                           if (fixed !== raw) {
                             setTForm(f => ({ ...f, match_duration_minutes: fixed }));
                             showToast('Time per match must be between 5 and 240 minutes');
                           }
                         }} />
                </div>
                {supportsPlayoffMode && ['round_robin', 'league'].includes(tForm.format) && (
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Playoff after league</label>
                    <select style={styles.formInput} value={tForm.playoff_mode}
                            onChange={(e) => setTForm(f => ({ ...f, playoff_mode: e.target.value }))}>
                      <option value="auto">Auto (semi-finals + final)</option>
                      <option value="none">None (league winner)</option>
                    </select>
                  </div>
                )}
                {tForm.participant_mode !== 'team' && <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                  <PlanPanel
                    plan={createPlan}
                    maxPlayers={parseInt(tForm.max_participants, 10) || 0}
                    onApply={(patch) => setTForm((f) => ({
                      ...f,
                      ...(patch.max_participants != null ? { max_participants: patch.max_participants } : {}),
                      ...(patch.players_per_team != null ? { players_per_team: patch.players_per_team } : {}),
                    }))}
                  />
                </div>}
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Add Match</h3>
              <button onClick={() => setShowNewMatchModal(false)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const editingMatch = matchesForActive.find((match) => match.id === editMatchId);
                const isTeamTournament = activeTournamentRecord?.participant_mode === 'team';
                const teamARoster = editingMatch?.team_a_roster || editingMatch?.team_a_players || [];
                const teamBRoster = editingMatch?.team_b_roster || editingMatch?.team_b_players || [];
                const ppt = isTeamTournament
                  ? Math.max(teamARoster.length, teamBRoster.length, 1)
                  : (activeTournamentRecord?.players_per_team || 1);
                // Collect all currently selected IDs to prevent duplicates across teams
                const allSelected = [
                  ...(mForm.team_a || []),
                  ...(mForm.team_b || []),
                ].filter(Boolean);

                const availableFor = (team, slotIdx) => (isTeamTournament ? (team === 'A' ? teamARoster : teamBRoster) : partsList).filter(p => {
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
                      <div style={{ background: 'var(--accent-soft)', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #c5d4ec' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.45rem'  }}>
                          🔵 Team A
                          <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}> ({isTeamTournament ? 'choose any lineup' : `${ppt} player${ppt > 1 ? 's' : ''}`})</span>
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
                      <div style={{ background: 'rgba(249,168,37,0.10)', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #f0d49a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.45rem'  }}>
                          🟠 Team B
                          <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>✎ Edit Match</h3>
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
                      <div style={{ background: 'var(--accent-soft)', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #c5d4ec' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.45rem'  }}>
                          🔵 Team A
                          <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}> ({ppt} player{ppt > 1 ? 's' : ''})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {isTeamTournament ? `Player ${idx + 1} (optional)` : ppt === 1 ? 'Player A *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1} (optional)`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(eForm.team_a || [])[idx] || ''}
                                onChange={(e) => setSlot('A', idx, e.target.value)}
                              >
                                <option value="">— none —</option>
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
                      <div style={{ background: 'rgba(249,168,37,0.10)', borderRadius: 6, padding: '0.65rem 0.75rem', border: '1px solid #f0d49a' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--warning)', marginBottom: '0.45rem'  }}>
                          🟠 Team B
                          <span style={{ fontWeight: 400, color: 'var(--text-soft)' }}> ({isTeamTournament ? 'choose any lineup' : `${ppt} player${ppt > 1 ? 's' : ''}`})</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: ppt === 1 ? '1fr' : '1fr 1fr', gap: '0.5rem' }}>
                          {Array.from({ length: ppt }).map((_, idx) => (
                            <div key={idx} style={styles.formRow}>
                              <label style={styles.formLabel}>
                                {isTeamTournament ? `Player ${idx + 1} (optional)` : ppt === 1 ? 'Player B *' : idx === 0 ? 'Player 1 (Captain) *' : `Player ${idx + 1} (optional)`}
                              </label>
                              <select
                                style={styles.formInput}
                                value={(eForm.team_b || [])[idx] || ''}
                                onChange={(e) => setSlot('B', idx, e.target.value)}
                              >
                                <option value="">— none —</option>
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

      {/* Generate Fixtures dialog (plan summary + leftover / formation / scheduling options) */}
      {showGenModal && activeTournamentRecord && (() => {
        const isTeamTournament = activeTournamentRecord.participant_mode === 'team';
        const registeredTeamRows = tournamentTeamEntries.filter((entry) => String(entry.tournament_id) === String(activeTournamentRecord.id));
        const registeredTeamPlayers = registeredTeamRows.reduce((sum, entry) => sum + (teamEntryPlayerCounts[entry.id] ?? teamMemberCounts[entry.team_id] ?? 0), 0);
        const gFormat = normalizeTournamentFormat(activeTournamentRecord.format);
        const gPlan = planTournament({
          format: gFormat,
          maxPlayers: activeTournamentRecord.max_participants || partsList.length,
          registeredPlayers: isTeamTournament ? registeredTeamRows.length : partsList.length,
          playersPerTeam: isTeamTournament ? 1 : (activeTournamentRecord.players_per_team || 1),
          playoffMode: activeTournamentRecord.playoff_mode || 'auto',
          leftoverPolicy: genOpts.leftoverPolicy,
          matchesPerSlot: Number(genOpts.matchesPerSlot) || 1,
          intervalMinutes: Number(activeTournamentRecord.match_duration_minutes) || 10,
        });
        const hasExistingFixtures = matchesForActive.length > 0;
        const runGenerate = async () => {
          const result = await generateTournamentFixtures(activeTournamentRecord.id, {
            playersPerTeam: activeTournamentRecord.players_per_team || 1,
            tournamentStartDate: activeTournamentRecord.start_date || null,
            leftoverPolicy: genOpts.leftoverPolicy,
            formation: 'random',
            matchesPerSlot: Number(genOpts.matchesPerSlot) || 1,
            dayEndHour: genOpts.dayEndHour === '' ? null : Number(genOpts.dayEndHour),
            regenerate: hasExistingFixtures,
          });
          if (result.success) {
            setShowGenModal(false);
            showToast('Fixtures generated');
          } else {
            showToast(result.error || 'Failed to generate fixtures', 'error');
          }
        };
        return (
          <div onClick={(e) => { if (e.target === e.currentTarget) setShowGenModal(false); }} style={styles.modalBackdrop}>
            <div style={styles.modalCard}>
              <div style={styles.modalHeader}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{hasExistingFixtures ? 'Regenerate Fixtures' : 'Generate Fixtures'}</h3>
                <button onClick={() => setShowGenModal(false)} style={styles.modalClose}>✕</button>
              </div>
              <div style={{ padding: '1rem', display: 'grid', gap: '0.75rem' }}>
                {hasExistingFixtures && <div style={{ border: '1px solid rgba(249,168,37,0.4)', borderRadius: 10, padding: '0.75rem', background: 'rgba(249,168,37,0.10)', fontSize: '0.74rem', lineHeight: 1.5 }}><strong>Existing fixtures will be replaced.</strong><span style={{ display: 'block', color: 'var(--text-soft)' }}>This is allowed because no match has a result yet. Updated registrations and the new participant limit will be used.</span></div>}
                {isTeamTournament ? <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '0.75rem', background: 'var(--accent-soft)', fontSize: '0.74rem', display: 'grid', gap: '0.35rem' }}><strong>Team fixture readiness</strong><span>{registeredTeamRows.length} teams · {registeredTeamPlayers} roster players</span><span style={{ color: 'var(--text-soft)' }}>Fixtures will be generated between registered teams. Player lineups are selected separately for each match.</span>{registeredTeamRows.length < 2 && <span style={{ color: 'var(--danger)', fontWeight: 700 }}>Add at least two teams from Manage Teams before generating fixtures.</span>}</div> : <PlanPanel
                  plan={gPlan}
                  registered={partsList.length}
                  maxPlayers={activeTournamentRecord.max_participants || null}
                  onApply={async (patch) => {
                    if (patch.leftoverPolicy) setGenOpts((o) => ({ ...o, leftoverPolicy: patch.leftoverPolicy }));
                    if (patch.players_per_team != null) {
                      const r = await updateTournament(activeTournamentRecord.id, { players_per_team: patch.players_per_team });
                      showToast(r.success ? `Players per team changed to ${patch.players_per_team}` : (r.error || 'Could not change team size'), r.success ? undefined : 'error');
                    }
                  }}
                />}
                <div style={styles.formGrid}>
                  {!isTeamTournament && (gPlan.leftover > 0 || genOpts.leftoverPolicy !== 'block') ? (
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>If players are left over</label>
                      <select style={styles.formInput} value={genOpts.leftoverPolicy}
                              onChange={(e) => setGenOpts(o => ({ ...o, leftoverPolicy: e.target.value }))}>
                        <option value="block">Block (fix the player count first)</option>
                        <option value="exclude">Leave the extra players out</option>
                        <option value="smaller_team">Put them in one smaller team</option>
                      </select>
                    </div>
                  ) : null}
                  {!isTeamTournament && ((Number(activeTournamentRecord.players_per_team) || 1) > 1 || gFormat !== 'knockout') ? (
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>How to form teams</label>
                      <div style={{ ...styles.formInput, display: 'flex', alignItems: 'center', opacity: 0.85 }}>
                        Random draw (partners / teams are picked randomly)
                      </div>
                    </div>
                  ) : null}
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Matches at the same time</label>
                    <input style={styles.formInput} type="number" min="1" value={genOpts.matchesPerSlot}
                           onChange={(e) => setGenOpts(o => ({ ...o, matchesPerSlot: e.target.value }))} />
                  </div>
                  <div style={styles.formRow}>
                    <label style={styles.formLabel}>Last match hour (optional, 24h)</label>
                    <input style={styles.formInput} type="number" min="11" max="23" placeholder="e.g. 18"
                           value={genOpts.dayEndHour}
                           onChange={(e) => setGenOpts(o => ({ ...o, dayEndHour: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button onClick={() => setShowGenModal(false)} style={styles.outlineBtn}>Cancel</button>
                <button onClick={runGenerate} disabled={!gPlan.ok}
                        style={{ ...styles.navyBtn, opacity: gPlan.ok ? 1 : 0.5, cursor: gPlan.ok ? 'pointer' : 'not-allowed' }}>
                  Generate
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Result Modal */}
      {resultMatchId && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setResultMatchId(null); }} style={styles.modalBackdrop}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Enter Match Result</h3>
              <button onClick={() => setResultMatchId(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem' }}>
              {(() => {
                const m = matchesForActive.find(x => x.id === resultMatchId);
                if (!m) return null;
                const teamAIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)].filter(Boolean);
                const teamBIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)].filter(Boolean);
                const isReusableTeamTournament = activeTournamentRecord?.participant_mode === 'team';
                const teamAOption = isReusableTeamTournament && m.team_a_id != null
                  ? String(m.team_a_id)
                  : teamAIds.length > 0 ? teamAIds[0] : '';
                const teamBOption = isReusableTeamTournament && m.team_b_id != null
                  ? String(m.team_b_id)
                  : teamBIds.length > 0 ? teamBIds[0] : '';
                const showScoreFields = ['completed', 'draw', 'walkover', 'no_show'].includes(rForm.result_type);
                const showWinnerField = ['completed', 'walkover', 'no_show'].includes(rForm.result_type);
                const showReasonField = ['walkover', 'rescheduled', 'cancelled', 'disputed', 'no_show'].includes(rForm.result_type);
                const showScheduleField = rForm.result_type === 'rescheduled';
                const isKoResult =
                  normalizeTournamentFormat(activeTournamentRecord?.format) === 'knockout' ||
                  String(m.match_code || '').toUpperCase().startsWith('KO_');
                return (
                  <div style={styles.formGrid}>
                    <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                      <label style={styles.formLabel}>Result Type</label>
                      <select
                        style={styles.formInput}
                        value={rForm.result_type}
                        onChange={(e) => {
                          const newType = e.target.value;
                          setRForm(f => ({
                            ...f,
                            result_type: newType,
                            winner: newType === 'draw' ? '' : f.winner,
                            // Auto-set draw scores to 1/1; clear scores on non-finishing types
                            score_a: newType === 'draw' ? 1 : ['rescheduled','cancelled','disputed'].includes(newType) ? '' : f.score_a,
                            score_b: newType === 'draw' ? 1 : ['rescheduled','cancelled','disputed'].includes(newType) ? '' : f.score_b,
                          }));
                        }}
                      >
                        <option value="completed">Completed</option>
                        {!isKoResult && <option value="draw">Draw</option>}
                        <option value="walkover">Walkover</option>
                        <option value="rescheduled">Rescheduled</option>
                        <option value="no_show">No Show</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="disputed">Disputed</option>
                      </select>
                    </div>

                    {showWinnerField && (
                      <div style={{ ...styles.formRow, gridColumn: 'span 2' }}>
                        <label style={styles.formLabel}>Winner</label>
                        <select
                          style={styles.formInput}
                          value={rForm.winner}
                          onChange={(e) => {
                            const picked = e.target.value;
                            const newScoreA = picked === teamAOption ? 5 : picked === teamBOption ? 0 : '';
                            const newScoreB = picked === teamBOption ? 5 : picked === teamAOption ? 0 : '';
                            setRForm(f => ({ ...f, winner: picked, score_a: newScoreA, score_b: newScoreB }));
                          }}
                        >
                          <option value="">— select —</option>
                          <option value={teamAOption}>
                            {(() => {
                              const ids = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id).filter(id => id !== m.player_a_employee_id)];
                              return isReusableTeamTournament ? (m.team_a_name || 'Team A') : ids.map(id => getEmployeeName(id)).join(' & ') || 'Player A';
                            })()}
                          </option>
                          <option value={teamBOption}>
                            {(() => {
                              const ids = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id).filter(id => id !== m.player_b_employee_id)];
                              return isReusableTeamTournament ? (m.team_b_name || 'Team B') : ids.map(id => getEmployeeName(id)).join(' & ') || 'Player B';
                            })()}
                          </option>
                        </select>
                      </div>
                    )}

                    {showScoreFields && (
                      <>
                        <div style={styles.formRow}>
                          <label style={styles.formLabel}>Team A Score</label>
                          <input
                            style={styles.formInput}
                            type="number"
                            min="0"
                            value={rForm.score_a}
                            onChange={(e) => setRForm(f => ({ ...f, score_a: e.target.value }))}
                          />
                        </div>
                        <div style={styles.formRow}>
                          <label style={styles.formLabel}>Team B Score</label>
                          <input
                            style={styles.formInput}
                            type="number"
                            min="0"
                            value={rForm.score_b}
                            onChange={(e) => setRForm(f => ({ ...f, score_b: e.target.value }))}
                          />
                        </div>
                      </>
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>📣 Declare Final Results</h3>
              <button onClick={() => setFinalForm([])} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', maxHeight: '62vh', overflowY: 'auto' }}>

              {/* Info banner */}
              <div style={{ background: 'var(--accent-soft)', borderRadius: 6, padding: '0.55rem 0.75rem', fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '0.9rem', lineHeight: 1.5 }}>
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
                      const cardBg = pos === 1 ? 'rgba(249,168,37,0.10)' : pos === 2 ? 'var(--bg-muted)' : pos === 3 ? 'rgba(216,67,21,0.08)' : 'var(--bg-soft)';
                      const borderColor = pos === 1 ? '#f9a825' : pos === 2 ? '#b0bec5' : pos === 3 ? '#d84315' : 'var(--border)';
                      // Shared prize amount — use first member's value
                      const sharedPrize = firstMember?.prize_amount ?? '';

                      return (
                        <div key={pos} style={{ background: cardBg, border: `1.5px solid ${borderColor}`, borderRadius: 8, padding: '0.75rem 1rem' }}>

                          {/* Header row: medal + position label + remove btn */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>{medal}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-strong)'  }}>
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
                              /* Manual position: in team games pick each player independently (group); stats are per player */
                              (() => {
                                const isTeamGame = (activeTournamentRecord?.players_per_team || 1) > 1;
                                const picked = members.filter(r => r.employee_id);
                                const ord = `${pos}${pos === 1 ? 'st' : pos === 2 ? 'nd' : 'rd'}`;

                                const calcStats = (id) => {
                                  const st = { played: 0, won: 0, lost: 0, points: 0 };
                                  for (const m of matchesForActive) {
                                    if (m.status !== 'completed') continue;
                                    const aIds = [m.player_a_employee_id, ...(m.team_a_players || []).map(p => p.employee_id)].filter(Boolean);
                                    const bIds = [m.player_b_employee_id, ...(m.team_b_players || []).map(p => p.employee_id)].filter(Boolean);
                                    const onA = aIds.includes(id);
                                    if (!onA && !bIds.includes(id)) continue;
                                    const aWon = m.winner_employee_id === m.player_a_employee_id;
                                    st.played += 1;
                                    if ((onA && aWon) || (!onA && !aWon)) { st.won += 1; st.points += 3; }
                                    else st.lost += 1;
                                  }
                                  return st;
                                };

                                const blankRow = () => ({
                                  employee_id: '', department: '—', position: pos,
                                  matches_played: 0, wins: 0, losses: 0, points: 0,
                                  prize_amount: firstMember?.prize_amount || '', prize_description: firstMember?.prize_description || '', _manual: true,
                                });

                                const addPlayer = (empId) => {
                                  if (!empId) return;
                                  const s = calcStats(empId);
                                  const dept = employees.find(e => e.employee_code === empId)?.department || '—';
                                  const row = {
                                    ...blankRow(), employee_id: empId, department: dept,
                                    matches_played: s.played, wins: s.won, losses: s.lost, points: s.points,
                                  };
                                  setFinalForm(f => {
                                    const others = f.filter(r => r.position !== pos);
                                    const mine = f.filter(r => r.position === pos && r.employee_id);
                                    return [...others, ...(isTeamGame ? [...mine, row] : [row])];
                                  });
                                };

                                const removePlayer = (empId) => {
                                  setFinalForm(f => {
                                    const rest = f.filter(r => !(r.position === pos && r.employee_id === empId));
                                    return rest.some(r => r.position === pos) ? rest : [...rest, blankRow()];
                                  });
                                };

                                return (
                                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                                    {isTeamGame && picked.map(member => (
                                      <div key={member.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.3rem 0' }}>
                                        <div style={{ minWidth: 130, flex: 1 }}>
                                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-strong)' }}>{getEmployeeName(member.employee_id)}</div>
                                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{member.department}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                                          {[
                                            { label: 'Played', val: member.matches_played },
                                            { label: 'Won',    val: member.wins },
                                            { label: 'Lost',   val: member.losses },
                                            { label: 'Pts',    val: member.points },
                                          ].map(({ label, val }) => (
                                            <div key={label} style={{ textAlign: 'center', minWidth: 36 }}>
                                              <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
                                              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)' }}>{val ?? 0}</div>
                                            </div>
                                          ))}
                                        </div>
                                        <button
                                          onClick={() => removePlayer(member.employee_id)}
                                          style={{ ...styles.tinyIconBtn, color: '#c62828', borderColor: '#ffcdd2', fontSize: '0.7rem' }}
                                          title="Remove this player"
                                        >✕</button>
                                      </div>
                                    ))}
                                    <select
                                      style={{ ...styles.formInput, fontWeight: 600 }}
                                      value={isTeamGame ? '' : (firstMember?.employee_id || '')}
                                      onChange={(e) => addPlayer(e.target.value)}
                                    >
                                      <option value="">
                                        {isTeamGame
                                          ? `+ add player to ${ord} place team —`
                                          : `— select ${ord} place player —`}
                                      </option>
                                      {partsList
                                        .filter(p => !finalForm.some(r => r.position !== pos && r.employee_id === p.employee_id))
                                        .filter(p => !(isTeamGame && picked.some(r => r.employee_id === p.employee_id)))
                                        .map(p => (
                                          <option key={p.employee_id} value={p.employee_id}>{getEmployeeName(p.employee_id)}</option>
                                        ))}
                                    </select>
                                  </div>
                                );
                              })()
                            ) : (
                              /* Auto-populated: show each team member with their stats */
                              members.map(member => (
                                <div key={member.employee_id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', padding: '0.3rem 0' }}>
                                  {/* Name + dept */}
                                  <div style={{ minWidth: 130, flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-strong)'  }}>{getEmployeeName(member.employee_id)}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{member.department}</div>
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
                                        <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textTransform: 'uppercase' }}>{label}</div>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent)'  }}>{val ?? 0}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Shared prize money input for this position */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderTop: `1px dashed ${borderColor}`, paddingTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.68rem', color: 'var(--text-soft)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                              Prize Money (₹) {members.length > 1 ? '— per player' : ''}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden', background: 'var(--bg-surface-strong)' }}>
                              <span style={{ padding: '0 0.35rem', color: 'var(--muted)', fontSize: '0.75rem', background: 'var(--bg-muted)', borderRight: '1px solid var(--border)', userSelect: 'none' }}>₹</span>
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
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Delete Match</h3>
              <button onClick={() => setMatchToDelete(null)} style={styles.modalClose}>✕</button>
            </div>
            <div style={{ padding: '1rem', fontSize: '0.78rem', color: 'var(--text)' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>
                Are you sure you want to delete match{' '}
                <strong>{matchToDelete.match_code || `M${matchToDelete.match_number}`}</strong>
                {' '}({matchToDelete.round})?
              </p>
              <p style={{ margin: 0, color: 'var(--danger)', fontSize: '0.72rem' }}>
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

      {showFlowModal && activeTournamentRecord && matchesForActive.length > 0 && (
        <TournamentFlowModal
          tournament={activeTournamentRecord}
          matches={matchesForActive}
          getEmployeeName={getEmployeeName}
          onClose={() => setShowFlowModal(false)}
        />
      )}
    </div>
  );
};

// ── Shared match clock ──────────────────────────────────────────────
export const SharedStopwatchPanel = ({ matches, tournament, getEmployeeName, currentUser }) => {
  const { showToast } = useToast();
  const [selectedMatchId, setSelectedMatchId] = useState(() => matches[0]?.id || '');
  const [clock, setClock] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [durationChoice, setDurationChoice] = useState('tournament');
  const [customMinutes, setCustomMinutes] = useState('');

  const selectedMatch = matches.find((m) => String(m.id) === String(selectedMatchId)) || null;
  const isChess = String(tournament?.game || '').trim().toLowerCase() === 'chess';
  const defaultMinutes = Math.max(5, Number(tournament?.match_duration_minutes) || 10);
  const defaultSeconds = defaultMinutes * 60;
  const selectedDurationSeconds = Math.max(
    300,
    (durationChoice === 'tournament'
      ? defaultMinutes
      : durationChoice === 'custom'
        ? Number(customMinutes) || defaultMinutes
        : Number(durationChoice) || defaultMinutes) * 60
  );
  const updaterEmployeeId = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || currentUser?.user_metadata?.empId || null;

  useEffect(() => {
    if (!selectedMatchId && matches[0]?.id) setSelectedMatchId(matches[0].id);
    if (selectedMatchId && !matches.some((m) => String(m.id) === String(selectedMatchId))) {
      setSelectedMatchId(matches[0]?.id || '');
    }
  }, [matches, selectedMatchId]);

  const loadClock = useCallback(async () => {
    if (!selectedMatchId || !currentUser) return;
    setClock(null);
    setLoading(true);
    const { data, error } = await supabase
      .from('tournament_match_clocks')
      .select('*')
      .eq('match_id', selectedMatchId)
      .maybeSingle();
    setLoading(false);
    if (error) {
      console.error('Error loading shared match clock:', error);
      showToast('Clock storage is unavailable. Apply the clock database migration first.', 'error');
      setClock(null);
      return;
    }
    setClock(data || null);
  }, [currentUser, selectedMatchId, showToast]);

  useEffect(() => { loadClock(); }, [loadClock]);

  useEffect(() => {
    if (!clock) {
      setDurationChoice('tournament');
      setCustomMinutes('');
      return;
    }
    const minutes = Math.round(Number(clock.duration_seconds || defaultSeconds) / 60);
    if (minutes === defaultMinutes) {
      setDurationChoice('tournament');
      setCustomMinutes('');
    } else if ([10, 15, 20, 30].includes(minutes)) {
      setDurationChoice(String(minutes));
      setCustomMinutes('');
    } else {
      setDurationChoice('custom');
      setCustomMinutes(String(minutes));
    }
  }, [clock, defaultMinutes, defaultSeconds]);

  useEffect(() => {
    if (!selectedMatchId || !currentUser) return undefined;
    const channel = supabase
      .channel(`tournament-match-clock-${selectedMatchId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'tournament_match_clocks',
        filter: `match_id=eq.${selectedMatchId}`,
      }, (payload) => setClock(payload.new || null))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser, selectedMatchId]);

  useEffect(() => {
    if (!clock || clock.status !== 'running') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [clock]);

  const liveValues = useMemo(() => {
    if (!clock) return null;
    let remaining = Number(clock.remaining_seconds ?? clock.duration_seconds ?? defaultSeconds);
    let remainingA = Number(clock.chess_remaining_a_seconds ?? defaultSeconds);
    let remainingB = Number(clock.chess_remaining_b_seconds ?? defaultSeconds);
    if (clock.status === 'running' && clock.started_at) {
      const elapsed = Math.max(0, Math.floor((now - new Date(clock.started_at).getTime()) / 1000));
      if (clock.mode === 'chess') {
        if (clock.chess_active_side === 'A') remainingA = Math.max(0, remainingA - elapsed);
        if (clock.chess_active_side === 'B') remainingB = Math.max(0, remainingB - elapsed);
      } else {
        remaining = Math.max(0, remaining - elapsed);
      }
    }
    return { remaining, remainingA, remainingB };
  }, [clock, defaultSeconds, now]);

  const sidePlayerIds = (side) => {
    const normalizedSide = String(side).toLowerCase();
    const captain = selectedMatch?.[`player_${normalizedSide}_employee_id`];
    const players = (selectedMatch?.[`team_${normalizedSide}_players`] || []).map((p) => p.employee_id).filter(Boolean);
    return [...new Set([captain, ...players].filter(Boolean))];
  };

  const sideName = (side) => {
    const ids = sidePlayerIds(side);
    return ids.length ? ids.map((id) => getEmployeeName(id)).join(' & ') : 'TBD';
  };

  const sidePlayersForDisplay = (side) => {
    const ids = sidePlayerIds(side);
    if (!ids.length) return [{ id: null, name: 'TBD' }];
    return ids.map((id) => ({ id, name: getEmployeeName(id) }));
  };

  const formatClock = (seconds) => {
    const safe = Math.max(0, Math.floor(seconds || 0));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
  };

  const ensureClock = async () => {
    if (clock) return clock;
    const payload = {
      tournament_id: tournament.id,
      match_id: selectedMatchId,
      mode: isChess ? 'chess' : 'countdown',
      duration_seconds: selectedDurationSeconds,
      remaining_seconds: selectedDurationSeconds,
      chess_remaining_a_seconds: selectedDurationSeconds,
      chess_remaining_b_seconds: selectedDurationSeconds,
      chess_active_side: 'A',
      status: 'paused',
    };
    const { data, error } = await supabase.from('tournament_match_clocks').insert(payload).select().single();
    if (error) { showToast(error.message || 'Unable to create match clock', 'error'); return null; }
    setClock(data);
    return data;
  };

  const applyDuration = async () => {
    if (clock?.status === 'running') return;
    const base = await ensureClock();
    if (!base) return;
    await saveClock({
      status: 'paused',
      started_at: null,
      stopped_at: null,
      duration_seconds: selectedDurationSeconds,
      remaining_seconds: selectedDurationSeconds,
      chess_remaining_a_seconds: selectedDurationSeconds,
      chess_remaining_b_seconds: selectedDurationSeconds,
      chess_active_side: 'A',
    });
    showToast(`Clock duration set to ${Math.round(selectedDurationSeconds / 60)} minutes`);
  };

  const saveClock = async (next) => {
    const { data, error } = await supabase
      .from('tournament_match_clocks')
      .update({ ...next, updated_by: updaterEmployeeId, updated_at: new Date().toISOString() })
      .eq('match_id', selectedMatchId)
      .select()
      .single();
    if (error) { showToast(error.message || 'Unable to update shared clock', 'error'); return null; }
    setClock(data);
    return data;
  };

  const pauseOrStart = async () => {
    const base = await ensureClock();
    if (!base) return;
    const values = liveValues || { remaining: base.remaining_seconds, remainingA: base.chess_remaining_a_seconds, remainingB: base.chess_remaining_b_seconds };
    if (base.status === 'running') {
      await saveClock({ status: 'paused', started_at: null, remaining_seconds: values.remaining, chess_remaining_a_seconds: values.remainingA, chess_remaining_b_seconds: values.remainingB });
    } else if ((isChess ? values.remainingA : values.remaining) > 0) {
      await saveClock({ status: 'running', started_at: new Date().toISOString() });
    }
  };

  const stopClock = async () => {
    const base = await ensureClock();
    if (!base) return;
    const values = liveValues || { remaining: base.remaining_seconds, remainingA: base.chess_remaining_a_seconds, remainingB: base.chess_remaining_b_seconds };
    await saveClock({ status: 'stopped', started_at: null, remaining_seconds: values.remaining, chess_remaining_a_seconds: values.remainingA, chess_remaining_b_seconds: values.remainingB, stopped_at: new Date().toISOString() });
  };

  const resetToDefault = async () => {
    const base = await ensureClock();
    if (!base) return;
    await saveClock({
      status: 'paused',
      started_at: null,
      stopped_at: null,
      duration_seconds: defaultSeconds,
      remaining_seconds: defaultSeconds,
      chess_remaining_a_seconds: defaultSeconds,
      chess_remaining_b_seconds: defaultSeconds,
      chess_active_side: 'A',
    });
    setDurationChoice('tournament');
    setCustomMinutes('');
    showToast(`Clock reset to ${defaultMinutes} minutes`);
  };

  const completeMove = async (side) => {
    if (!clock || clock.status !== 'running' || clock.mode !== 'chess' || clock.chess_active_side !== side) return;
    const values = liveValues;
    const nextSide = side === 'A' ? 'B' : 'A';
    await saveClock({ chess_remaining_a_seconds: values.remainingA, chess_remaining_b_seconds: values.remainingB, chess_active_side: nextSide, started_at: new Date().toISOString(), status: values[side === 'A' ? 'remainingA' : 'remainingB'] <= 0 ? 'stopped' : 'running' });
  };

  useEffect(() => {
    if (!clock || clock.status !== 'running' || !liveValues) return;
    const expired = clock.mode === 'chess'
      ? (clock.chess_active_side === 'A' ? liveValues.remainingA : liveValues.remainingB) <= 0
      : liveValues.remaining <= 0;
    if (!expired) return;
    saveClock({
      status: 'stopped',
      started_at: null,
      remaining_seconds: liveValues.remaining,
      chess_remaining_a_seconds: liveValues.remainingA,
      chess_remaining_b_seconds: liveValues.remainingB,
      stopped_at: new Date().toISOString(),
    });
  }, [clock, liveValues]);

  if (!currentUser) return <div className="clay-card" style={{ ...styles.card, textAlign: 'center' }}>Please log in to use the shared match clock.</div>;

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div className="clay-card" style={{ ...styles.card, padding: 0, overflow: 'hidden', background: 'linear-gradient(145deg, var(--bg-surface-strong), rgba(63,81,181,0.08))' }}>
        <div style={{ padding: '1rem 1.15rem', background: 'linear-gradient(120deg, #173d73, #245a9b 58%, #3478b8)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div><div style={{ fontSize: '1rem', fontWeight: 800 }}>⏱ Shared Match Clock</div><div style={{ fontSize: '0.7rem', opacity: 0.82, marginTop: 4 }}>{tournament?.name || 'Tournament'} · synchronized for all logged-in users</div></div>
          <span style={{ padding: '0.35rem 0.55rem', borderRadius: 999, background: 'rgba(255,255,255,0.16)', fontSize: '0.65rem', fontWeight: 800 }}>{isChess ? '♟ CHESS CLOCK' : '⏳ COUNTDOWN'}</span>
        </div>
        <div style={{ padding: '1rem 1.15rem' }}>
          <div style={{ display: 'grid', gap: '0.35rem', marginBottom: '1rem' }}><label style={styles.formLabel}>Choose match</label><select value={selectedMatchId} onChange={(e) => setSelectedMatchId(e.target.value)} style={{ ...styles.formInput, fontWeight: 700 }}>
            <option value="">— Select a match —</option>
            {matches.map((m) => <option key={m.id} value={m.id}>{m.match_code || `Match ${m.match_number}`} · {sideNameForMatch(m, 'a', getEmployeeName)} vs {sideNameForMatch(m, 'b', getEmployeeName)}</option>)}
          </select></div>
        {selectedMatch && (
          <div style={{ display: 'flex', alignItems: 'end', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '0.7rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-surface-strong)' }}>
            <div style={{ ...styles.formRow, minWidth: 190, flex: 1 }}>
              <label style={styles.formLabel}>Time for this match</label>
              <select value={durationChoice} onChange={(e) => setDurationChoice(e.target.value)} disabled={clock?.status === 'running'} style={styles.formInput}>
                <option value="tournament">Tournament default ({defaultMinutes} min)</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="20">20 minutes</option>
                <option value="30">30 minutes</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {durationChoice === 'custom' && <div style={{ ...styles.formRow, width: 120 }}><label style={styles.formLabel}>Minutes</label><input type="number" min="5" max="240" value={customMinutes} onChange={(e) => setCustomMinutes(e.target.value)} disabled={clock?.status === 'running'} style={styles.formInput} /></div>}
            <button onClick={applyDuration} disabled={clock?.status === 'running' || (durationChoice === 'custom' && Number(customMinutes) < 5)} style={{ ...styles.outlineBtn, opacity: clock?.status === 'running' || (durationChoice === 'custom' && Number(customMinutes) < 5) ? 0.5 : 1 }}>Apply Time</button>
          </div>
        )}
        {loading ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>Loading shared clock…</div> : !selectedMatch ? <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '1rem' }}>Select a match to begin.</div> : (
          <>
            {isChess ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.8rem' }}>
                {['A', 'B'].map((side) => { const active = clock?.chess_active_side === side && clock?.status === 'running'; const players = sidePlayersForDisplay(side); const unknown = players[0]?.id == null; return <div key={side} style={{ background: active ? 'linear-gradient(145deg, #173d73, #245a9b)' : 'var(--bg-muted)', color: active ? '#fff' : 'var(--text)', borderRadius: 12, padding: '0.9rem', textAlign: 'center', border: `1px solid ${active ? '#2f6db0' : 'var(--border)'}`, boxShadow: active ? '0 10px 22px rgba(23,61,115,0.2)' : 'none' }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.08em', opacity: 0.78 }}><span>PLAYER {side}</span><span>{active ? '● LIVE' : 'READY'}</span></div><div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginBottom: '0.45rem' }}>{players.map((player) => <span key={player.id || 'tbd'} title={player.name} style={{ width: 31, height: 31, borderRadius: '50%', display: 'grid', placeItems: 'center', background: unknown ? 'rgba(148,163,184,0.25)' : active ? 'rgba(255,255,255,0.2)' : 'var(--accent-soft)', color: unknown ? 'var(--muted)' : active ? '#fff' : 'var(--accent)', fontSize: '0.7rem', fontWeight: 800 }}>{unknown ? '?' : String(player.name || '?').trim().charAt(0).toUpperCase()}</span>)}</div><div style={{ minHeight: 22, fontWeight: 800, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sideName(side)}</div><div style={{ fontFamily: "'Roboto Mono', monospace", fontSize: '2.7rem', fontWeight: 700, marginTop: '0.25rem' }}>{formatClock(side === 'A' ? liveValues?.remainingA : liveValues?.remainingB)}</div><button onClick={() => completeMove(side)} disabled={!clock || clock.status !== 'running' || clock.chess_active_side !== side} style={{ ...styles.navyBtn, marginTop: '0.7rem', opacity: !clock || clock.status !== 'running' || clock.chess_active_side !== side ? 0.5 : 1 }}>{active ? '✓ Move Complete' : 'Move Complete'}</button></div>; })}
              </div>
            ) : <div style={{ display: 'grid', gap: '0.8rem' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.6rem', padding: '0.8rem', borderRadius: 12, background: 'linear-gradient(135deg, #112244, #1c4272)', color: '#fff' }}><div style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.8rem' }}>{sideName('A')}</div><div style={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.16)', fontSize: '0.65rem', fontWeight: 800 }}>VS</div><div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{sideName('B')}</div></div><div style={{ background: '#0b1930', color: '#fff', borderRadius: 12, padding: '1.25rem', textAlign: 'center', fontFamily: "'Roboto Mono', monospace", fontSize: '3.8rem', lineHeight: 1, fontWeight: 800, letterSpacing: '0.04em', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}>{formatClock(liveValues?.remaining)}</div></div>}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={pauseOrStart} style={{ ...styles.navyBtn, background: clock?.status === 'running' ? '#f9a825' : '#388e3c' }}>{clock?.status === 'running' ? '⏸ Pause' : '▶ Start'}</button>
              <button onClick={stopClock} disabled={!clock || clock.status === 'stopped'} style={{ ...styles.outlineBtn, opacity: !clock || clock.status === 'stopped' ? 0.5 : 1 }}>⏹ Stop</button>
              <button onClick={resetToDefault} disabled={!selectedMatch} style={{ ...styles.outlineBtn, opacity: !selectedMatch ? 0.5 : 1 }}>↺ Reset to Default</button>
            </div>
            <div style={{ textAlign: 'center', marginTop: '0.7rem', color: 'var(--muted)', fontSize: '0.68rem' }}>Shared for all logged-in users · refresh-safe</div>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

const sideNameForMatch = (match, side, getEmployeeName) => {
  const captain = match?.[`player_${side}_employee_id`];
  const players = (match?.[`team_${side}_players`] || []).map((p) => p.employee_id).filter(Boolean);
  const ids = [...new Set([captain, ...players].filter(Boolean))];
  return ids.length ? ids.map((id) => getEmployeeName(id)).join(' & ') : 'TBD';
};

// ── Legacy local stopwatch kept below for reference ─────────────────
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
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
              <div style={{ fontSize: '0.78rem', fontWeight: 700  }}>{linkedMatch.match_code || `M${linkedMatch.match_number}`} · {linkedMatch.round}</div>
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
          <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', marginBottom: '0.55rem' }}>
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
            <div style={{ background: 'rgba(46,125,50,0.10)', borderRadius: 6, padding: '0.6rem 0.75rem', border: '1px solid rgba(46,125,50,0.28)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--success)', marginBottom: '0.25rem'  }}>
                ✓ Linked — {linkedMatch.round} · {linkedMatch.match_code || `M${linkedMatch.match_number}`}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--success)' }}>
                {linkedMatch.player_a_employee_id
                  ? linkedMatch.player_a_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
                {' vs '}
                {linkedMatch.player_b_employee_id
                  ? linkedMatch.player_b_employee_id.split(',').map(id => getEmployeeName(id.trim())).join(' & ')
                  : 'TBD'}
              </div>
              {linkedMatch.scheduled_at && (
                <div style={{ fontSize: '0.65rem', color: 'var(--text-soft)', marginTop: '0.2rem' }}>
                  Scheduled: {new Date(linkedMatch.scheduled_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}
                </div>
              )}
              <button
                onClick={() => { setLinkedMatchId(''); showToast('Match unlinked', 'warning'); }}
                style={{ ...styles.outlineBtn, marginTop: '0.5rem', fontSize: '0.65rem', color: '#c62828', borderColor: '#ffcdd2' }}
              >✕ Unlink</button>
            </div>
          ) : (
            <div style={{ padding: '0.6rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.7rem', background: 'var(--bg-muted)', borderRadius: 6, border: '1px dashed var(--border-strong)' }}>
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
            <div style={styles.cardHeaderTitle}>
          <CalendarIcon size="18px" /> Today's Match Schedule
        </div>
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {todaySchedule.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>No upcoming matches.</div>
            ) : todaySchedule.map(m => (
              <div key={m.id} style={{ padding: '0.55rem 0.7rem', borderBottom: '1px solid var(--border)', fontSize: '0.74rem' }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)'  }}>
                  {m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : 'TBD'} — {m.match_code || `Match ${m.match_number}`}
                </div>
                <div style={{ color: 'var(--text-soft)' }}>
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
    background: 'var(--bg-surface-strong)', borderRadius: 32, padding: '4px 8px',
    marginBottom: '14px', display: 'flex', gap: '4px', alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexWrap: 'wrap',
  },
  subTabBtn: {
    background: 'transparent', border: 'none',
    padding: '10px 18px', fontSize: '0.78rem',
    fontWeight: 400,
    cursor: 'pointer', borderBottom: '3px solid transparent', marginBottom: '-1px',
    transition: 'color 0.2s ease, border-color 0.2s ease',
  },
  card: { background: 'var(--bg-surface-strong)', borderRadius: 16, padding: '1rem', boxShadow: 'var(--surface-shadow-soft)', border: '1px solid var(--border)',  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' },
  // Headings → Lufga Bold (weight 700)
  cardHeaderTitle: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)',  },
  recordCount: { fontSize: '0.7rem', color: 'var(--muted)',  fontWeight: 400 },
  navyBtn: { background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 400, cursor: 'pointer',  },
  outlineBtn: { background: 'var(--bg-surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 400, cursor: 'pointer',  },
  dangerBtn: { background: 'var(--danger)', color: '#ffffff', border: 'none', borderRadius: 4, padding: '0.32rem 0.85rem', fontSize: '0.72rem', fontWeight: 400, cursor: 'pointer',  },
  tinyIconBtn: { background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, padding: '0.18rem 0.4rem', margin: '0 2px', cursor: 'pointer', fontSize: '0.7rem',  },
  tinyEnterBtn: { background: 'var(--accent)', color: '#ffffff', border: 'none', borderRadius: 4, padding: '0.2rem 0.55rem', fontSize: '0.66rem', cursor: 'pointer',  fontWeight: 700 },
  tinyChip: { padding: '0.12rem 0.5rem', borderRadius: 4, fontSize: '0.66rem', fontWeight: 400, display: 'inline-block',  },

  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem',  },
  theadRow: { background: 'var(--accent-soft)' },
  // Table headings → Lufga Bold
  th: { padding: '0.5rem 0.6rem', textAlign: 'left', fontWeight: 700, color: 'var(--text-soft)', textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: '0.04em',  },
  td: { padding: '0.5rem 0.6rem', verticalAlign: 'middle',  fontWeight: 400, color: 'var(--text)' },

  bracketGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', alignItems: 'stretch' },
  bracketCol: { display: 'flex', flexDirection: 'column' },
  // Bracket column headers → Lufga Bold
  bracketColHeader: { textAlign: 'center', padding: '0.4rem 0', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-strong)', textTransform: 'uppercase', letterSpacing: '0.06em', background: 'var(--bg-muted)', borderRadius: '4px 4px 0 0', border: '1px solid var(--border)', borderBottom: 'none',  },
  bracketColBody: { padding: '0.4rem', background: 'var(--bg-soft)', borderRadius: '0 0 4px 4px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 100,  },
  matchesGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' },
  emptyCol: { padding: '1rem 0.5rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.7rem', fontStyle: 'italic',  },
  matchCard: { background: 'var(--bg-surface-strong)', borderRadius: 6, padding: '0.5rem 0.6rem', fontSize: '0.74rem',  border: '1px solid var(--border)' },
  matchLabel: { textAlign: 'center', fontSize: '0.62rem', color: 'var(--muted)', marginBottom: '0.25rem',  fontWeight: 400 },
  matchPlayer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.28rem 0.4rem', borderRadius: 3,  color: 'var(--text)' },
  matchMeta: { textAlign: 'center', fontSize: '0.6rem', color: 'var(--muted)', marginTop: '0.25rem',  fontWeight: 400 },

  podium: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7rem', alignItems: 'end', marginBottom: '1.2rem', padding: '0.6rem 0' },
  podiumGold:   { background: 'linear-gradient(180deg, rgba(249,168,37,0.18), rgba(249,168,37,0.08))', borderRadius: 8, padding: '1.2rem 0.5rem', textAlign: 'center', border: '2px solid #f9a825', order: 2,  },
  podiumSilver: { background: 'linear-gradient(180deg, var(--bg-muted), var(--bg-soft))', borderRadius: 8, padding: '0.9rem 0.5rem', textAlign: 'center', border: '2px solid #b0bec5', order: 1,  },
  podiumBronze: { background: 'linear-gradient(180deg, rgba(216,67,21,0.12), rgba(216,67,21,0.06))', borderRadius: 8, padding: '0.7rem 0.5rem', textAlign: 'center', border: '2px solid #d84315', order: 3,  },
  // Podium names are headings → Lufga Bold
  podiumName:   { fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-strong)', marginBottom: '0.2rem',  },
  podiumRank:   { fontSize: '0.7rem', fontWeight: 400, color: 'var(--muted)', marginBottom: '0.3rem',  },
  podiumPrize:  { fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 400,  },

  swBtn: { width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',  },

  modalBackdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 60, paddingBottom: 20, boxSizing: 'border-box', overflowY: 'auto' },
  modalCard: { background: 'var(--bg-surface-strong)', borderRadius: 8, width: 540, maxWidth: '96vw', maxHeight: 'calc(100vh - 80px)', overflowY: 'auto', flexShrink: 0, boxShadow: '0 8px 32px rgba(0,0,0,0.32)',  },
  // Modal header is a heading → Lufga Bold
  modalHeader: { background: 'var(--accent)', color: '#ffffff', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '8px 8px 0 0', position: 'sticky', top: 0, zIndex: 2,  },
  modalClose: { background: 'none', border: 'none', color: '#ffffff', fontSize: '1rem', cursor: 'pointer',  },
  modalFooter: { padding: '0.7rem 1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.4rem', background: 'var(--bg-muted)', borderRadius: '0 0 8px 8px', position: 'sticky', bottom: 0, zIndex: 2,  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem 0.85rem' },
  formRow: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  formLabel: { fontSize: '0.7rem', fontWeight: 400, color: 'var(--text-soft)',  },
  formInput: { padding: '0.32rem 0.55rem', border: '1px solid var(--border)', borderRadius: 4, fontSize: '0.75rem',  fontWeight: 400, color: 'var(--text)', background: 'var(--bg-surface)', width: '100%' },
};

export default TournamentsPage;
