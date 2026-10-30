import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Pause, Play, RotateCcw, Trophy, Users, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import { SharedStopwatchPanel, TournamentFlowModal } from './TournamentsPage';
import { groupMatchesByRound } from '../utils/tournamentFixtures';

const LIVE_STATUSES = new Set(['live', 'in_progress', 'scheduled']);
const DONE_STATUSES = new Set(['completed', 'walkover', 'no_show', 'bye']);
const palette = ['#5b5ce2', '#e76f51', '#14b8a6', '#f59e0b', '#ec4899', '#38bdf8'];
const initials = (value) => String(value || '?').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const formatTimer = (seconds) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
const displaySide = (match, side, getEmployeeName) => {
  const captain = match?.[`player_${side}_employee_id`];
  const members = (match?.[`team_${side}_players`] || []).map((player) => player.employee_id).filter(Boolean);
  const ids = [...new Set([captain, ...members].filter(Boolean))];
  return ids.length ? ids.map((id) => getEmployeeName(id) || id).join(' & ') : 'TBD';
};

const flowMatchState = (match) => {
  const status = String(match?.status || '').toLowerCase();
  if (DONE_STATUSES.has(status)) return 'completed';
  if (status === 'live' || status === 'in_progress') return 'live';
  return 'upcoming';
};

const flowSideState = (match, side) => {
  if (flowMatchState(match) !== 'completed') return '';
  if (String(match.status).toLowerCase() === 'bye') return side === 'a' ? 'winner' : 'empty';
  const own = Number(match[`score_${side}`]);
  const other = Number(match[`score_${side === 'a' ? 'b' : 'a'}`]);
  if (own === other && !match.winner_employee_id) return '';
  if (match.winner_employee_id) return String(match.winner_employee_id).toUpperCase() === String(match[`player_${side}_employee_id`] || '').toUpperCase() ? 'winner' : 'loser';
  return own > other ? 'winner' : 'loser';
};

const DashboardFlowPage = ({ tournaments, tournamentMatches, getEmployeeName, onBack, liveCount }) => {
  const renderBracketMatch = (match) => {
    const state = flowMatchState(match);
    return <article className={`dashboard-bracket-match is-${state}`} key={match.id || match.match_code}>
      <div className="dashboard-bracket-match-meta"><span>{match.match_code || `Match ${match.match_number || ''}`}</span><b>{state === 'live' ? 'LIVE' : state === 'completed' ? 'DONE' : 'UP NEXT'}</b></div>
      <div className={`flow-player-row is-${flowSideState(match, 'a')}`}><span>{displaySide(match, 'a', getEmployeeName)}</span><b>{match.score_a ?? '—'}</b></div>
      <span className="flow-vs">VS</span>
      <div className={`flow-player-row is-${flowSideState(match, 'b')}`}><span>{displaySide(match, 'b', getEmployeeName)}</span><b>{match.score_b ?? '—'}</b></div>
    </article>;
  };
  const renderBracketRound = (stage, side, index) => <section className={`dashboard-bracket-round ${side}-round round-${index + 1}`} key={`${side}-${stage.round}`} style={{ '--match-count': stage.matches.length }}>
    <div className="dashboard-bracket-round-title"><strong>{stage.label}</strong><small>{stage.matches.length} {stage.matches.length === 1 ? 'MATCH' : 'MATCHES'}</small></div>
    <div className="dashboard-bracket-match-list">{stage.matches.map(renderBracketMatch)}</div>
  </section>;
  return <main className="projector-dashboard projector-flow-page">
    <section className="projector-hero"><div><div className="projector-kicker"><Zap size={15} fill="currentColor" /> LIVE ARENA CONTROL</div><h1>Competition Dashboard</h1><p>One projected view for every tournament currently on court.</p></div><div className="projector-hero-meta"><button className="hero-page-arrow" aria-label="Previous dashboard page" onClick={onBack}><ChevronLeft size={17} /></button><span className="live-dot" /> {liveCount} live tournament{liveCount === 1 ? '' : 's'}<button className="hero-page-arrow" aria-label="Next dashboard page" disabled><ChevronRight size={17} /></button></div></section>
    <section className="dashboard-flow-shell"><div className="dashboard-flow-body">{tournaments.length === 0 ? <div className="flow-empty">No tournaments available.</div> : tournaments.map((tournament) => { const matches = tournamentMatches.filter((match) => String(match.tournament_id) === String(tournament.id)); const stages = groupMatchesByRound(matches); const finalStage = stages[stages.length - 1]; const feederStages = stages.slice(0, -1); const leftStages = feederStages.map((stage) => ({ ...stage, matches: stage.matches.slice(0, Math.ceil(stage.matches.length / 2)) })); const rightStages = feederStages.map((stage) => ({ ...stage, matches: stage.matches.slice(Math.ceil(stage.matches.length / 2)) })).reverse(); return <section className="dashboard-flow-tournament" key={tournament.id}><div className="dashboard-flow-tournament-title"><span className="live-dot" />{tournament.name}<small>Knockout bracket</small></div>{stages.length === 0 ? <div className="flow-empty">No fixtures available.</div> : <div className="dashboard-knockout-bracket"><div className="dashboard-bracket-side dashboard-bracket-left">{leftStages.map((stage, index) => renderBracketRound(stage, 'left', index))}</div><section className="dashboard-bracket-centre"><div className="dashboard-bracket-final-label"><span>CHAMPIONSHIP</span><strong>{finalStage?.label || 'Final'}</strong></div>{finalStage && <div className="dashboard-bracket-final-match">{finalStage.matches.map(renderBracketMatch)}</div>}</section><div className="dashboard-bracket-side dashboard-bracket-right">{rightStages.map((stage, index) => renderBracketRound(stage, 'right', index))}</div></div>}</section>; })}</div></section>
  </main>;
};

function Stopwatch({ label, color }) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);
  return <div className="projector-timer" style={{ '--timer-color': color }}><div className="projector-timer-top"><span><Clock3 size={16} /> {label}</span><span className="timer-live">{running ? 'LIVE' : 'READY'}</span></div><div className="timer-value">{formatTimer(seconds)}</div><div className="timer-actions"><button onClick={() => setRunning((value) => !value)}>{running ? <Pause size={15} /> : <Play size={15} />} {running ? 'Pause' : 'Start'}</button><button className="timer-reset" onClick={() => { setRunning(false); setSeconds(0); }}><RotateCcw size={14} /> Reset</button></div></div>;
}

const DashboardPage = () => {
  const { tournaments = [], tournamentMatches = [], getEmployeeName, setActiveTab, currentUser } = useApp();
  const [selectedTournament, setSelectedTournament] = useState(0);
  const [flowTournamentId, setFlowTournamentId] = useState(null);
  const [showFlowPage, setShowFlowPage] = useState(false);
  const [teamDirectory, setTeamDirectory] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamScoreEntries, setTeamScoreEntries] = useState([]);
  const [expandedTeam, setExpandedTeam] = useState(null);
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('teams').select('*').eq('is_active', true).order('name'),
      supabase.from('team_members').select('*'),
      supabase.from('team_match_score_entries').select('team_id, tournament_id, employee_id, score'),
    ]).then(([teams, members, scores]) => {
      if (!active) return;
      setTeamDirectory(teams.data || []);
      setTeamMembers(members.data || []);
      setTeamScoreEntries(scores.data || []);
    });
    return () => { active = false; };
  }, []);
  const liveTournaments = useMemo(() => tournaments.filter((tournament) => String(tournament.status).toLowerCase() === 'live'), [tournaments]);
  const liveTournamentIds = useMemo(() => new Set(liveTournaments.map((tournament) => String(tournament.id))), [liveTournaments]);
  const tournamentMap = useMemo(() => new Map(tournaments.map((tournament) => [String(tournament.id), tournament])), [tournaments]);
  const liveMatches = useMemo(() => tournamentMatches.filter((match) => liveTournamentIds.has(String(match.tournament_id)) && LIVE_STATUSES.has(String(match.status || '').toLowerCase())).sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0)), [tournamentMatches, liveTournamentIds]);
  const tournamentCards = useMemo(() => liveTournaments.map((tournament) => ({ tournament, match: liveMatches.find((match) => String(match.tournament_id) === String(tournament.id)) })).filter((card) => card.match), [liveTournaments, liveMatches]);
  const currentCard = tournamentCards[selectedTournament] || tournamentCards[0];
  const currentMatch = currentCard?.match;
  const nextCard = tournamentCards.length > 1 ? tournamentCards[(selectedTournament + 1) % tournamentCards.length] : null;
  const cycleTournament = (direction) => setSelectedTournament((value) => (value + direction + tournamentCards.length) % tournamentCards.length);
  useEffect(() => {
    if (tournamentCards.length < 2) return undefined;
    const interval = window.setInterval(() => {
      setSelectedTournament((value) => (value + 1) % tournamentCards.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [tournamentCards.length]);
  useEffect(() => {
    if (selectedTournament >= tournamentCards.length && tournamentCards.length > 0) setSelectedTournament(0);
  }, [selectedTournament, tournamentCards.length]);
  const openTournamentFixtures = (tournamentId) => {
    sessionStorage.setItem('absstem-tournament-navigation', JSON.stringify({ tournamentId }));
    setActiveTab('tournaments');
  };
  const openFlow = (tournamentId) => setFlowTournamentId(tournamentId);
  const flowTournament = tournaments.find((tournament) => String(tournament.id) === String(flowTournamentId));
  const flowMatches = tournamentMatches.filter((match) => String(match.tournament_id) === String(flowTournamentId));
  const dashboardClockCards = useMemo(() => tournamentCards.slice(0, 2).map((card) => ({
    ...card,
    matches: [card.match, ...tournamentMatches.filter((match) => String(match.tournament_id) === String(card.tournament.id) && String(match.id) !== String(card.match.id) && !DONE_STATUSES.has(String(match.status || '').toLowerCase()))],
  })), [tournamentCards, tournamentMatches]);

  const scoreRows = useMemo(() => {
    if (teamDirectory.length > 0) {
      const games = (liveTournaments.length ? liveTournaments : tournaments.filter((tournament) => tournament.status !== 'cancelled')).slice(0, 6);
      return teamDirectory.slice(0, 6).map((team, index) => {
        const entries = teamScoreEntries.filter((entry) => String(entry.team_id) === String(team.id));
        const scores = new Map();
        entries.forEach((entry) => scores.set(String(entry.tournament_id), (scores.get(String(entry.tournament_id)) || 0) + (Number(entry.score) || 0)));
        const members = teamMembers.filter((member) => String(member.team_id) === String(team.id));
        return { key: team.id, id: team.id, name: team.name, rank: index + 1, scores, games, members, entries, total: entries.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0) };
      });
    }
    const sides = new Map();
    const games = (liveTournaments.length ? liveTournaments : tournaments.filter((tournament) => tournament.status !== 'cancelled')).slice(0, 6);
    const ensure = (key, name) => { if (!sides.has(key)) sides.set(key, { key, name, scores: new Map(), total: 0 }); return sides.get(key); };
    tournamentMatches.forEach((match) => {
      const tournament = tournamentMap.get(String(match.tournament_id));
      if (!tournament || !games.some((game) => String(game.id) === String(tournament.id))) return;
      const a = ensure(String(match.team_a_id || match.player_a_employee_id || `a-${match.id}`), displaySide(match, 'a', getEmployeeName));
      const b = ensure(String(match.team_b_id || match.player_b_employee_id || `b-${match.id}`), displaySide(match, 'b', getEmployeeName));
      if (DONE_STATUSES.has(String(match.status || '').toLowerCase())) { const sa = Number(match.score_a) || 0; const sb = Number(match.score_b) || 0; a.scores.set(String(tournament.id), (a.scores.get(String(tournament.id)) || 0) + sa); b.scores.set(String(tournament.id), (b.scores.get(String(tournament.id)) || 0) + sb); a.total += sa; b.total += sb; }
    });
    return [...sides.values()].slice(0, 6).map((row, index) => ({ ...row, name: row.name === 'TBD' ? `Team ${index + 1}` : row.name, games }));
  }, [tournamentMatches, tournamentMap, liveTournaments, tournaments, getEmployeeName, teamDirectory, teamMembers, teamScoreEntries]);

  const matchResult = (match, side) => {
    if (!match || !DONE_STATUSES.has(String(match.status || '').toLowerCase())) return 'pending';
    if (String(match.status).toLowerCase() === 'bye') return side === 'a' ? 'winner' : 'empty';
    const own = Number(match[`score_${side}`]); const other = Number(match[`score_${side === 'a' ? 'b' : 'a'}`]);
    if (own !== other) return own > other ? 'winner' : 'loser';
    if (match.winner_employee_id) return String(match.winner_employee_id).toUpperCase() === String(match[`player_${side}_employee_id`] || '').toUpperCase() ? 'winner' : 'loser';
    return 'loser';
  };

  if (showFlowPage) return <DashboardFlowPage tournaments={tournaments.filter((tournament) => String(tournament.status).toLowerCase() !== 'cancelled')} tournamentMatches={tournamentMatches} getEmployeeName={getEmployeeName} liveCount={liveTournaments.length} onBack={() => setShowFlowPage(false)} />;

  return <><main className="projector-dashboard">
    <section className="projector-hero"><div><div className="projector-kicker"><Zap size={15} fill="currentColor" /> LIVE ARENA CONTROL</div><h1>Competition Dashboard</h1><p>One projected view for every tournament currently on court.</p></div><div className="projector-hero-meta"><button className="hero-page-arrow" aria-label="Previous dashboard page" disabled><ChevronLeft size={17} /></button><span className="live-dot" /> {liveTournaments.length} live tournament{liveTournaments.length === 1 ? '' : 's'}<button className="hero-page-arrow" aria-label="Next dashboard page" onClick={() => setShowFlowPage(true)}><ChevronRight size={17} /></button></div></section>
    <section className="projector-section-heading"><div><span className="section-eyebrow">Standings</span><h2>Teams with score</h2></div><div className="standings-actions"><button className="dashboard-page-arrow" aria-label="Previous dashboard page" disabled><ChevronLeft size={18} /></button><button className="dashboard-page-arrow" aria-label="Next dashboard page" onClick={() => setShowFlowPage(true)}><ChevronRight size={18} /></button><span className="section-note"><Users size={15} /> {scoreRows.length} teams in play</span></div></section>
    <section className="scoreboard-shell"><div className="scoreboard-scroll"><table className="projector-scoreboard"><thead><tr><th>TEAM NAME</th>{(scoreRows[0]?.games || liveTournaments.slice(0, 6)).map((game, index) => <th key={game.id || index}>{game.name || `Game ${index + 1}`}<small>GAME {index + 1}</small></th>)}<th>TOTAL</th></tr></thead><tbody>{scoreRows.length === 0 ? <tr><td colSpan="8" className="empty-scoreboard">No teams found. Create teams and register them for a tournament.</td></tr> : scoreRows.map((row, index) => <React.Fragment key={row.key}><tr className={`scoreboard-team-row ${expandedTeam === row.key ? 'is-expanded' : ''}`} onClick={() => setExpandedTeam((current) => current === row.key ? null : row.key)}><td><span className="team-rank" style={{ background: palette[index % palette.length] }}>{index + 1}</span><strong>{row.name}</strong><span className="team-expand">{expandedTeam === row.key ? '−' : '+'}</span></td>{row.games.map((game) => <td key={game.id}>{row.scores.get(String(game.id)) ?? '—'}</td>)}<td className="total-score">{row.total}</td></tr>{expandedTeam === row.key && <tr className="team-roster-row"><td colSpan={row.games.length + 2}><div className="team-roster"><div className="roster-heading"><strong>{row.name} players</strong><span>{row.members.length} players · click team row to collapse</span></div>{row.members.length === 0 ? <div className="roster-empty">No player roster is available for this team yet.</div> : <div className="roster-grid">{row.members.map((member) => { const playerScores = row.entries.filter((entry) => String(entry.employee_id).toUpperCase() === String(member.employee_id).toUpperCase()); const playerTotal = playerScores.reduce((sum, entry) => sum + (Number(entry.score) || 0), 0); return <div className="roster-player" key={member.employee_id}><span className="player-avatar">{initials(getEmployeeName(member.employee_id) || member.employee_id)}</span><span><strong>{getEmployeeName(member.employee_id) || member.employee_id}</strong><small>{member.role || 'Player'}</small></span><b>{playerTotal} pts</b></div>; })}</div>}</div></td></tr>}</React.Fragment>)}</tbody></table></div></section>
    <div className="projector-grid"><section className="projector-panel current-games"><div className="panel-heading"><div className="panel-title-with-nav"><h2>Current games</h2>{currentMatch && <div className="match-nav"><button aria-label="Previous tournament" onClick={() => cycleTournament(-1)}><ChevronLeft size={16} /></button><span>{selectedTournament + 1} / {tournamentCards.length}</span><button aria-label="Next tournament" onClick={() => cycleTournament(1)}><ChevronRight size={16} /></button></div>}</div><span className="live-pill"><span className="live-dot" /> {tournamentCards.length} LIVE</span></div>{currentMatch ? <><div className="flip-card"><div className="featured-match flip-card-face" key={currentCard.tournament.id}><div className="match-context"><span>{currentCard.tournament.name}</span><b>{currentMatch.match_code || `Match ${currentMatch.match_number || ''}`}</b></div><div className="versus-row">{['a', 'b'].map((side, index) => <React.Fragment key={side}>{index === 1 && <div className="versus">VS</div>}<div className={`projector-team ${side === 'b' ? 'right' : ''} ${matchResult(currentMatch, side)}`}><span className="team-avatar">{initials(displaySide(currentMatch, side, getEmployeeName))}</span><strong>{displaySide(currentMatch, side, getEmployeeName)}</strong><span className="match-score">{currentMatch[`score_${side}`] ?? '—'}</span>{matchResult(currentMatch, side) === 'winner' && <em>WINNER</em>}</div></React.Fragment>)}</div></div></div></> : <div className="empty-panel">No current games from live tournaments.</div>}<div className="fixture-actions"><button className="fixtures-link" onClick={() => openTournamentFixtures(currentCard?.tournament?.id)}>View all fixtures <ChevronRight size={16} /></button><button className="fixtures-link flow-link" onClick={() => openFlow(currentCard?.tournament?.id)}>Complete Flow <ChevronRight size={16} /></button></div></section>
      <section className="projector-panel next-game"><div className="panel-heading"><div><h2>Up next</h2></div><Trophy size={20} color="#f59e0b" /></div>{nextCard ? <div className="flip-card"><div className="next-card flip-card-face" key={nextCard.tournament.id}><span className="next-index">{nextCard.tournament.name}</span><div className="next-versus-row"><div><span className="next-avatar">{initials(displaySide(nextCard.match, 'a', getEmployeeName))}</span><strong>{displaySide(nextCard.match, 'a', getEmployeeName)}</strong></div><small>VS</small><div><span className="next-avatar">{initials(displaySide(nextCard.match, 'b', getEmployeeName))}</span><strong>{displaySide(nextCard.match, 'b', getEmployeeName)}</strong></div></div><p>{nextCard.match.match_code || `Match ${nextCard.match.match_number || ''}`} · Ready on court</p><div className="next-card-actions"><button onClick={() => openTournamentFixtures(nextCard.tournament.id)}>View all fixtures</button><button onClick={() => openFlow(nextCard.tournament.id)}>Complete Flow</button></div></div></div> : <div className="empty-panel">The next live tournament game will appear here.</div>}</section></div>
    <section className="projector-panel timers-panel"><div className="panel-heading"><div><span className="section-eyebrow">Court clocks</span><h2>Stopwatches</h2></div><span className="section-note">Synced with current matches · two courts</span></div><div className="dashboard-shared-clocks">{dashboardClockCards.length ? dashboardClockCards.map((card, index) => <div className="dashboard-shared-clock" key={card.tournament.id}><div className="dashboard-clock-label"><span className="live-dot" /> Court {String(index + 1).padStart(2, '0')} · {card.tournament.name}</div><SharedStopwatchPanel matches={card.matches} tournament={card.tournament} getEmployeeName={getEmployeeName} currentUser={currentUser} /></div>) : <div className="empty-panel">No current matches available for the court clocks.</div>}</div></section>
  </main>{flowTournament && flowMatches.length > 0 && <TournamentFlowModal tournament={flowTournament} matches={flowMatches} getEmployeeName={getEmployeeName} onClose={() => setFlowTournamentId(null)} />}</>;
};

export default DashboardPage;
