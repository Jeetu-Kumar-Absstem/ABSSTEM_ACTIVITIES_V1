// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { GAMES, SLOTS, DAYS } from '../utils/constants';
import { isAdminId } from '../utils/admin';
import {
  buildKnockoutFixturePlan,
  buildRoundRobinFixturePlan,
  buildSwissRoundPlan,
  compareTournamentRounds,
  getMatchTeams,
  getRoundLabel,
  groupMatchesByRound,
  normalizeTournamentFormat,
} from '../utils/tournamentFixtures';
import {
  getDayName,
  getPlayerStatsFromResults,
  getWeekRange,
  isBookingInWeek,
} from '../utils/helpers';

const AppContext = createContext();
const APPROVED_TOURNAMENT_STATUSES = new Set([
  'registered',
  'active',
  'semi_finalist',
  'finalist',
  'eliminated',
]);
const FINISHING_MATCH_STATUSES = new Set(['completed', 'walkover', 'no_show', 'bye']);

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [games, setGames] = useState(GAMES);
  const [slots, setSlots] = useState(SLOTS);
  const [bookings, setBookings] = useState({});
  const [matchResults, setMatchResults] = useState({ carrom: [], chess: [] });
  const [employees, setEmployees] = useState([]);
  const [bans, setBans] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  // ── Events / Tournaments / Leaderboard state ────────────────────────────
  const [events, setEvents] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [tournamentParticipants, setTournamentParticipants] = useState([]);
  const [tournamentRegistrationRequests, setTournamentRegistrationRequests] = useState([]);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [finalResults, setFinalResults] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [gamesLoaded, setGamesLoaded] = useState(false); // track if Supabase games have loaded
  const [selectedGame, setSelectedGame] = useState('carrom');
  const [activeTab, setActiveTab] = useState('booking');
  const [currentUser, setCurrentUser] = useState(null);

  // Check if current user is admin using the utils
  const isAdmin = () => {
    const empId =
      currentUser?.user_metadata?.emp_id ||
      currentUser?.user_metadata?.employee_code ||
      currentUser?.user_metadata?.empId ||
      '';
    return isAdminId(empId);
  };

  const getCurrentEmpId = () =>
    String(
      currentUser?.user_metadata?.emp_id ||
      currentUser?.user_metadata?.employee_code ||
      currentUser?.user_metadata?.empId ||
    ''
    ).trim().toUpperCase();

  const getMatchPlayerIds = (match) => {
    const teamA = [
      match?.player_a_employee_id,
      ...(match?.team_a_players || []).map((p) => p.employee_id),
    ].filter(Boolean);
    const teamB = [
      match?.player_b_employee_id,
      ...(match?.team_b_players || []).map((p) => p.employee_id),
    ].filter(Boolean);
    return {
      teamA: [...new Set(teamA)],
      teamB: [...new Set(teamB)],
    };
  };

  const getMatchResultLabel = (status) => {
    const value = String(status || '').toLowerCase();
    if (value === 'completed') return 'Completed';
    if (value === 'draw') return 'Draw';
    if (value === 'walkover') return 'Walkover';
    if (value === 'rescheduled') return 'Rescheduled';
    if (value === 'cancelled') return 'Cancelled';
    if (value === 'disputed') return 'Disputed';
    if (value === 'no_show') return 'No Show';
    if (value === 'bye') return 'Bye';
    if (value === 'in_progress') return 'In Progress';
    if (value === 'scheduled') return 'Scheduled';
    return value || 'Scheduled';
  };

  const getMatchStatus = (match) => String(match?.status || 'scheduled').toLowerCase();

  const advanceWinnerToNextMatch = async (sourceMatch, winnerEmployeeId) => {
    if (!sourceMatch?.next_match_winner_id || !winnerEmployeeId) return { success: true };
    const nextMatch = tournamentMatches.find((m) => m.id === sourceMatch.next_match_winner_id);
    if (!nextMatch) return { success: true };

    if (String(nextMatch.player_a_employee_id || '').toUpperCase() === String(winnerEmployeeId).toUpperCase()) {
      return { success: true };
    }
    if (String(nextMatch.player_b_employee_id || '').toUpperCase() === String(winnerEmployeeId).toUpperCase()) {
      return { success: true };
    }

    const payload = {};
    if (!nextMatch.player_a_employee_id) {
      payload.player_a_employee_id = winnerEmployeeId;
    } else if (!nextMatch.player_b_employee_id) {
      payload.player_b_employee_id = winnerEmployeeId;
    } else {
      return { success: false, error: 'Next match already has two players' };
    }

    const { error } = await supabase
      .from('tournament_matches')
      .update(payload)
      .match({ id: nextMatch.id });
    if (error) throw error;

    return { success: true };
  };

  const getSwissNextRoundNumber = (matches = []) => {
    let maxRound = 0;
    for (const match of matches) {
      const round = String(match.round || '').toUpperCase();
      const swissMatch = round.match(/^SW(\d+)$/);
      if (swissMatch) {
        maxRound = Math.max(maxRound, Number(swissMatch[1]));
      }
    }
    return maxRound + 1;
  };

  const mapGameRow = (game) => ({
    id: String(game.id),
    name: game.name,
    icon: game.icon,
    location: game.location,
    maxPlayers: game.max_players ?? game.maxPlayers ?? 4,
    active: game.active !== false,
    sort_order: game.sort_order ?? 0,
  });

  const normalizeGameKey = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const resolveGameKey = (value) => {
    const normalized = normalizeGameKey(value);
    const matchedGame = games.find((game) => {
      const gameId = normalizeGameKey(game.id);
      const gameName = normalizeGameKey(game.name);
      return gameId === normalized || gameName === normalized;
    });
    if (matchedGame) {
      return normalizeGameKey(matchedGame.name);
    }
    return normalized;
  };

  const isVisibleGame = (game) => {
    const gameId = String(game?.id ?? '').toLowerCase();
    const gameName = String(game?.name ?? '').toLowerCase();
    return !['table-tennis', 'tennis'].includes(gameId) && !['table tennis', 'tennis'].includes(gameName);
  };

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;

      const mappedGames = data && data.length > 0 ? data.filter(isVisibleGame).map(mapGameRow) : GAMES.map(g => ({
        ...g,
        maxPlayers: g.maxPlayers,
        active: true,
      }));

      setGames(mappedGames);
      setGamesLoaded(true);

      // Always set selectedGame from real Supabase data.
      // We cannot trust the stale GAMES constant IDs that useState initialised with,
      // so we always pick the correct ID here on first load.
      if (mappedGames.length > 0) {
        const carromGame = mappedGames.find(g => g.name?.toLowerCase() === 'carrom');
        const firstActiveGame = mappedGames.find(g => g.active !== false);
        const defaultGame = carromGame || firstActiveGame || mappedGames[0];
        setSelectedGame(String(defaultGame.id));
      }
    } catch (err) {
      console.error('Error loading games:', err);
      const fallbackGames = GAMES.map(g => ({ ...g, maxPlayers: g.maxPlayers, active: true }));
      setGames(fallbackGames);
      setGamesLoaded(true);
      const carromFallback = fallbackGames.find(g => g.name?.toLowerCase() === 'carrom');
      const firstActiveFallback = fallbackGames.find(g => g.active !== false);
      const defaultFallback = carromFallback || firstActiveFallback || fallbackGames[0];
      setSelectedGame(String(defaultFallback.id));
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      const fallbackEmployees = [];
      if (currentUser?.user_metadata?.name || currentUser?.user_metadata?.emp_id) {
        fallbackEmployees.push({
          id: currentUser.id,
          name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
          employee_code: currentUser.user_metadata?.emp_id || currentUser.user_metadata?.employee_code || '',
          department: currentUser.user_metadata?.department || 'General',
        });
      }
      setEmployees(fallbackEmployees);
    }
  };

  // Load bookings from Supabase
  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*');
      if (error) throw error;
      
      const grouped = {};
      DAYS.forEach(d => { grouped[d] = {}; SLOTS.forEach(s => { grouped[d][s.id] = []; }); });
      data?.forEach(b => {
        const day = b.day;
        if (grouped[day] && grouped[day][b.slot_id] !== undefined) {
          grouped[day][b.slot_id].push({
            name: b.player_name,
            user_id: b.user_id,
            employee_id: b.employee_id,
            booking_id: b.id,
            game: String(b.game ?? ''),
            booked_at: b.booked_at,
          });
        }
      });
      setBookings(grouped);
    } catch (err) {
      console.error('Error loading bookings:', err);
      const mockBookings = {};
      DAYS.forEach(d => { 
        mockBookings[d] = {}; 
        SLOTS.forEach(s => { mockBookings[d][s.id] = []; }); 
      });
      setBookings(mockBookings);
    }
    setLoading(false);
  };

  const cleanupOldBookings = async () => {
    try {
      const { start } = getWeekRange(currentDate);
      const { error } = await supabase
        .from('bookings')
        .delete()
        .lt('booked_at', start.toISOString());
      if (error) throw error;
    } catch (err) {
      console.error('Error cleaning up old bookings:', err);
    }
  };

  const loadMatchResults = async () => {
    try {
      const loadTable = async (tableName) => {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      };

      const [carromResults, chessResults] = await Promise.all([
        loadTable('carrom_match_results').catch((err) => {
          console.error('Error loading carrom match results:', err);
          return [];
        }),
        loadTable('chess_match_results').catch((err) => {
          console.error('Error loading chess match results:', err);
          return [];
        }),
      ]);

      setMatchResults({
        carrom: carromResults,
        chess: chessResults,
      });
    } catch (err) {
      console.error('Error loading match results:', err);
      setMatchResults({ carrom: [], chess: [] });
    }
  };

  const loadBans = async () => {
    try {
      const { data, error } = await supabase
        .from('bans')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBans(data || []);
    } catch (err) {
      console.error('Error loading bans:', err);
      setBans([]);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase
        .from('rules')
        .select('*')
        .order('id', { ascending: true });
      if (error) throw error;
      
      if (data && data.length > 0) {
        setRules(data);
      } else {
        // Default rules if none exist
        const defaultRules = [
          { rule_description: 'Bookings are permitted for a maximum of one game per day.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
          { rule_description: 'If a member fails to utilize their reserved time slot, the booking will be considered forfeited.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
          { rule_description: 'Only one active booking per player per game per day. If a player fails to show up within 10 minutes, the slot may be given to someone else.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
        ];
        setRules(defaultRules);
      }
    } catch (err) {
      console.error('Error loading rules:', err);
      setRules([
        { id: 1, rule_description: 'Bookings are permitted for a maximum of one game per day.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
        { id: 2, rule_description: 'If a member fails to utilize their reserved time slot, the booking will be considered forfeited.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
        { id: 3, rule_description: 'Only one active booking per player per game per day. If a player fails to show up within 10 minutes, the slot may be given to someone else.', created_at: new Date().toISOString().split('T')[0], created_by: 'Admin', game: 'General' },
      ]);
    }
  };

  const loadViolations = async () => {
    try {
      const { data, error } = await supabase
        .from('violations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setViolations(data || []);
    } catch (err) {
      console.error('Error loading violations:', err);
      setViolations([]);
    }
  };

  // ── Events / Tournaments / Leaderboard loaders ──────────────────────────
  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      if (error) throw error;
      setEvents(data || []);
    } catch (err) {
      console.error('Error loading events:', err);
      setEvents([]);
    }
  };

  const loadTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      console.error('Error loading tournaments:', err);
      setTournaments([]);
    }
  };

  const loadTournamentParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_participants')
        .select('*')
        .order('registered_at', { ascending: true });
      if (error) throw error;
      setTournamentParticipants(data || []);
    } catch (err) {
      console.error('Error loading tournament participants:', err);
      setTournamentParticipants([]);
    }
  };

  const loadTournamentRegistrationRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_registration_requests')
        .select('*')
        .order('requested_at', { ascending: true });
      if (error) throw error;
      setTournamentRegistrationRequests(data || []);
    } catch (err) {
      console.error('Error loading tournament registration requests:', err);
      setTournamentRegistrationRequests([]);
    }
  };

  const loadTournamentMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .order('tournament_id', { ascending: true })
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });
      if (error) throw error;

      // Fetch team players from junction table and attach to each match.
      let playersMap = {};
      try {
        const { data: players } = await supabase
          .from('tournament_match_players')
          .select('match_id, employee_id, team, position')
          .order('position', { ascending: true });
        if (players) {
          players.forEach(p => {
            if (!playersMap[p.match_id]) playersMap[p.match_id] = { A: [], B: [] };
            playersMap[p.match_id][p.team].push({ employee_id: p.employee_id, position: p.position });
          });
        }
      } catch (_) { /* table may not exist yet — degrade gracefully */ }

      const enriched = (data || []).map(m => ({
        ...m,
        team_a_players: playersMap[m.id]?.A || [],
        team_b_players: playersMap[m.id]?.B || [],
      }));
      setTournamentMatches(enriched);
    } catch (err) {
      console.error('Error loading tournament matches:', err);
      setTournamentMatches([]);
    }
  };

  const loadFinalResults = async () => {
    try {
      const { data, error } = await supabase
        .from('final_results')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      setFinalResults(data || []);
    } catch (err) {
      console.error('Error loading final results:', err);
      setFinalResults([]);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('leaderboard_with_rank')
        .select('*')
        .order('rank', { ascending: true });
      if (error) {
        // Fallback to the raw table if the view is not yet created.
        const fallback = await supabase
          .from('leaderboard')
          .select('*')
          .order('total_points', { ascending: false });
        if (fallback.error) throw fallback.error;
        setLeaderboard(fallback.data || []);
        return;
      }
      setLeaderboard(data || []);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    }
  };

  useEffect(() => {
    loadGames();
    loadEmployees();
    cleanupOldBookings();
    loadBookings();
    loadMatchResults();
    loadBans();
    loadRules();
    loadViolations();
    loadEvents();
    loadTournaments();
    loadTournamentParticipants();
    loadTournamentRegistrationRequests();
    loadTournamentMatches();
    loadFinalResults();
    loadLeaderboard();
    
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Add booking function
  const addBooking = async (day, slotId) => {
    try {
      await cleanupOldBookings();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      const empId = user.data.user?.user_metadata?.emp_id || user.data.user?.user_metadata?.employee_code || currentUser?.user_metadata?.emp_id || '';
      const normalizedEmpId = String(empId || '').trim().toUpperCase();

      const gameRecord = games.find(g => String(g.id) === String(selectedGame) || g.name === selectedGame);
      if (gameRecord && gameRecord.active === false) {
        return { success: false, error: 'Currently this is Unavailable' };
      }
      
      const dayBookings = bookings[day] || {};
      const allDayBookings = Object.values(dayBookings)
        .flat()
        .filter((booking) => isBookingInWeek(booking, currentDate));
      const userHasBooking = allDayBookings.some(b => b.user_id === userId && (String(b.game) === String(selectedGame) || b.game === gameRecord?.name));
      
      if (userHasBooking) {
        return { success: false, error: 'You already have a booking for this game on this day!' };
      }

      const bannedForGame = bans.some(b => 
        (String(b.employee_id || '').toUpperCase() === normalizedEmpId || b.employee === normalizedEmpId) &&
        b.active !== false &&
        new Date(b.until_date) > new Date() &&
        (String(b.game) === String(selectedGame) || b.game === gameRecord?.name || b.game === 'All Games')
      );

      if (bannedForGame) {
        return { success: false, error: 'Try after ban is removed!!!' };
      }

      const { data, error } = await supabase
        .from('bookings')
        .insert([{ 
          day, 
          slot_id: slotId, 
          player_name: normalizedEmpId,
          user_id: userId,
          employee_id: normalizedEmpId,
          game: String(selectedGame),
          booked_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      
      const newBookings = { ...bookings };
      if (!newBookings[day]) newBookings[day] = {};
      if (!newBookings[day][slotId]) newBookings[day][slotId] = [];
      newBookings[day][slotId].push({
        name: normalizedEmpId,
        user_id: userId,
        employee_id: normalizedEmpId,
        booking_id: data[0]?.id,
        game: String(data[0]?.game ?? selectedGame),
        booked_at: data[0]?.booked_at,
      });
      setBookings(newBookings);
      return { success: true };
    } catch (err) {
      console.error('Error booking slot:', err);
      return { success: false, error: err.message };
    }
  };

  // Remove booking function
  const removeBooking = async (day, slotId, playerName, userId) => {
    try {
      const user = await supabase.auth.getUser();
      const currentUserId = user.data.user?.id;
      
      if (currentUserId !== userId) {
        return { success: false, error: 'You can only remove your own bookings' };
      }

      const { start, end } = getWeekRange(currentDate);
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('day', day)
        .eq('slot_id', slotId)
        .eq('player_name', playerName)
        .eq('user_id', userId)
        .gte('booked_at', start.toISOString())
        .lte('booked_at', end.toISOString());
      
      if (error) throw error;
      
      const newBookings = { ...bookings };
      if (newBookings[day] && newBookings[day][slotId]) {
        newBookings[day][slotId] = newBookings[day][slotId].filter(
          b => !(b.name === playerName && b.user_id === userId)
        );
      }
      setBookings(newBookings);
      return { success: true };
    } catch (err) {
      console.error('Error removing booking:', err);
      return { success: false, error: err.message };
    }
  };

  // Add ban function (admin only)
  const addBan = async (banData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can issue bans!' };
    }

    try {
      const { data, error } = await supabase
        .from('bans')
        .insert([{
          employee: banData.employee,
          employee_id: banData.employee_id,
          game: banData.game,
          from_date: banData.from_date,
          until_date: banData.until_date,
          reason: banData.reason,
          created_by: currentUser?.user_metadata?.name || 'Admin',
          active: true
        }])
        .select();

      if (error) throw error;
      await loadBans();
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Lift ban function (admin only)
  const liftBan = async (banId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can lift bans!' };
    }

    try {
      const { error } = await supabase
        .from('bans')
        .update({ active: false, updated_at: new Date().toISOString() })
        .match({ id: banId });

      if (error) throw error;
      await loadBans();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete ban function (admin only)
  const deleteBan = async (banId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can delete bans!' };
    }

    try {
      const { error } = await supabase
        .from('bans')
        .delete()
        .match({ id: banId });

      if (error) throw error;
      await loadBans();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Add rule function (admin only)
  const addRule = async (ruleData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can add rules!' };
    }

    try {
      const { data, error } = await supabase
        .from('rules')
        .insert([{
          rule_description: ruleData.rule_description,
          created_at: ruleData.created_at || new Date().toISOString().split('T')[0],
          created_by: currentUser?.user_metadata?.name || 'Admin',
          game: ruleData.game || 'General',
          active: true
        }])
        .select();

      if (error) throw error;
      await loadRules();
      return { success: true, data: data[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update rule function (admin only)
  const updateRule = async (ruleId, ruleData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can update rules!' };
    }

    try {
      const { error } = await supabase
        .from('rules')
        .update({
          rule_description: ruleData.rule_description,
          created_at: ruleData.created_at,
          game: ruleData.game,
        })
        .match({ id: ruleId });

      if (error) throw error;
      await loadRules();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete rule function (admin only)
  const deleteRule = async (ruleId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can delete rules!' };
    }

    try {
      const { error } = await supabase
        .from('rules')
        .delete()
        .match({ id: ruleId });

      if (error) throw error;
      await loadRules();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Events CRUD (admin) ─────────────────────────────────────────────────
  const addEvent = async (eventData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can create events!' };
    }
    try {
      const submitter =
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split('@')[0] ||
        'Admin';
      const code =
        eventData.code ||
        `EVT-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;

      const { data, error } = await supabase
        .from('events')
        .insert([{
          code,
          title: eventData.title,
          description: eventData.description || null,
          event_type: eventData.event_type || 'company',
          start_date: eventData.start_date,
          end_date: eventData.end_date || null,
          start_time: eventData.start_time || null,
          end_time: eventData.end_time || null,
          venue: eventData.venue || null,
          location: eventData.location || null,
          organizer: eventData.organizer || submitter,
          max_participants: eventData.max_participants || null,
          banner_color: eventData.banner_color || null,
          icon: eventData.icon || null,
          created_by: submitter,
          is_published: eventData.is_published !== false,
          event_status: eventData.event_status || 'scheduled',
        }])
        .select();
      if (error) throw error;
      await loadEvents();
      return { success: true, data: data?.[0] || null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateEvent = async (eventId, eventData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can edit events!' };
    }
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: eventData.title,
          description: eventData.description,
          event_type: eventData.event_type,
          start_date: eventData.start_date,
          end_date: eventData.end_date,
          start_time: eventData.start_time,
          end_time: eventData.end_time,
          venue: eventData.venue,
          location: eventData.location,
          organizer: eventData.organizer,
          max_participants: eventData.max_participants,
          banner_color: eventData.banner_color,
          icon: eventData.icon,
          is_published: eventData.is_published,
          event_status: eventData.event_status,
        })
        .match({ id: eventId });
      if (error) throw error;
      await loadEvents();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteEvent = async (eventId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can delete events!' };
    }
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .match({ id: eventId });
      if (error) throw error;
      await loadEvents();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Tournament CRUD (admin) ─────────────────────────────────────────────
  const addTournament = async (tournamentData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can create tournaments!' };
    }
    try {
      const submitter =
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split('@')[0] ||
        'Admin';
      const code =
        tournamentData.code ||
        `TRN-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
      const { data, error } = await supabase
        .from('tournaments')
        .insert([{
          code,
          name: tournamentData.name,
          description: tournamentData.description || null,
          game: tournamentData.game,
          event_id: tournamentData.event_id || null,
          format: tournamentData.format || 'knockout',
          start_date: tournamentData.start_date,
          end_date: tournamentData.end_date || null,
          registration_open: tournamentData.registration_open !== false,
          max_participants: tournamentData.max_participants || 8,
          players_per_team: tournamentData.players_per_team || 1,
          status: tournamentData.status || 'registration_open',
          prize_pool: tournamentData.prize_pool || null,
          rules: tournamentData.rules || null,
          created_by: submitter,
        }])
        .select();
      if (error) throw error;
      await loadTournaments();
      return { success: true, data: data?.[0] || null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateTournament = async (tournamentId, tournamentData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can edit tournaments!' };
    }
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: tournamentData.name,
          description: tournamentData.description,
          game: tournamentData.game,
          event_id: tournamentData.event_id,
          format: tournamentData.format,
          start_date: tournamentData.start_date,
          end_date: tournamentData.end_date,
          registration_open: tournamentData.registration_open,
          max_participants: tournamentData.max_participants,
          status: tournamentData.status,
          prize_pool: tournamentData.prize_pool,
          rules: tournamentData.rules,
          champion_employee_id: tournamentData.champion_employee_id,
          runner_up_employee_id: tournamentData.runner_up_employee_id,
          third_place_employee_id: tournamentData.third_place_employee_id,
        })
        .match({ id: tournamentId });
      if (error) throw error;
      await loadTournaments();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteTournament = async (tournamentId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can delete tournaments!' };
    }
    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .match({ id: tournamentId });
      if (error) throw error;
      await loadTournaments();
      await loadTournamentParticipants();
      await loadTournamentMatches();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const generateTournamentFixtures = async (tournamentId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can generate fixtures' };
    }
    try {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      const format = normalizeTournamentFormat(tournament.format);
      const participants = getTournamentApprovedParticipants(tournamentId);
      if (participants.length < 2) {
        return { success: false, error: 'At least 2 registered participants are required' };
      }

      const startDatePassed = tournament.start_date && new Date(tournament.start_date) <= new Date();
      if (!startDatePassed) {
        return { success: false, error: 'Fixtures can only be generated once the start date has arrived' };
      }
      if (tournament.registration_open !== false) {
        return { success: false, error: 'Close registration before generating fixtures' };
      }

      const existingMatches = tournamentMatches.filter((m) => m.tournament_id === tournamentId);
      const existingSwissRounds = existingMatches.filter((m) => String(m.round || '').toUpperCase().startsWith('SW'));
      const latestSwissRound = existingSwissRounds.reduce((max, match) => {
        const roundNumber = Number(String(match.round || '').replace(/^SW/i, '')) || 0;
        return Math.max(max, roundNumber);
      }, 0);
      const latestSwissRoundMatches = latestSwissRound
        ? existingSwissRounds.filter((match) => Number(String(match.round || '').replace(/^SW/i, '')) === latestSwissRound)
        : [];
      const latestSwissRoundPending = latestSwissRoundMatches.some((match) =>
        !FINISHING_MATCH_STATUSES.has(String(match.status || '').toLowerCase())
      );

      if (format !== 'swiss' && existingMatches.length > 0) {
        return { success: false, error: 'Fixtures have already been generated for this tournament' };
      }
      if (format === 'swiss' && latestSwissRoundPending) {
        return { success: false, error: 'Finish the current Swiss round before generating the next one' };
      }

      const payloads = [];
      let roundPlan = null;
      if (format === 'knockout') {
        roundPlan = buildKnockoutFixturePlan(participants);
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            payloads.push({
              tournament_id: tournamentId,
              match_code: match.match_code,
              round: match.round,
              match_number: match.match_number,
              player_a_employee_id: match.player_a_employee_id,
              player_b_employee_id: match.player_b_employee_id,
              score_a: match.score_a,
              score_b: match.score_b,
              winner_employee_id: match.winner_employee_id,
              status: match.status,
              played_at: match.status === 'bye' ? new Date().toISOString() : null,
            });
          }
        }
      } else if (format === 'round_robin') {
        roundPlan = buildRoundRobinFixturePlan(participants);
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            payloads.push({
              tournament_id: tournamentId,
              match_code: match.match_code,
              round: match.round,
              match_number: match.match_number,
              player_a_employee_id: match.player_a_employee_id,
              player_b_employee_id: match.player_b_employee_id,
              status: match.status,
            });
          }
        }
      } else if (format === 'swiss') {
        const nextRoundNumber = latestSwissRound ? latestSwissRound + 1 : 1;
        roundPlan = buildSwissRoundPlan(participants, existingMatches, nextRoundNumber);
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            payloads.push({
              tournament_id: tournamentId,
              match_code: match.match_code,
              round: match.round,
              match_number: match.match_number,
              player_a_employee_id: match.player_a_employee_id,
              player_b_employee_id: match.player_b_employee_id,
              score_a: match.score_a,
              score_b: match.score_b,
              winner_employee_id: match.winner_employee_id,
              status: match.status,
              played_at: match.status === 'bye' ? new Date().toISOString() : null,
            });
          }
        }
      } else {
        return { success: false, error: `Unsupported tournament format: ${format}` };
      }

      if (payloads.length === 0) {
        return { success: false, error: 'No fixtures were generated' };
      }

      await supabase
        .from('tournaments')
        .update({
          status: 'live',
          registration_open: false,
        })
        .match({ id: tournamentId });

      const { data: inserted, error: insertErr } = await supabase
        .from('tournament_matches')
        .insert(payloads)
        .select();
      if (insertErr) throw insertErr;

      if (format === 'knockout' && roundPlan?.rounds?.length > 1) {
        const byCode = new Map((inserted || []).map((row) => [row.match_code, row]));
        const pointerUpdates = [];
        for (let roundIndex = 0; roundIndex < roundPlan.rounds.length - 1; roundIndex += 1) {
          const currentRound = roundPlan.rounds[roundIndex];
          const nextRound = roundPlan.rounds[roundIndex + 1];
          currentRound.matches.forEach((match, matchIndex) => {
            const currentRow = byCode.get(match.match_code);
            const nextRow = byCode.get(nextRound.matches[Math.floor(matchIndex / 2)]?.match_code);
            if (!currentRow || !nextRow) return;
            pointerUpdates.push(
              supabase
                .from('tournament_matches')
                .update({ next_match_winner_id: nextRow.id })
                .match({ id: currentRow.id })
            );
          });
        }
        await Promise.all(pointerUpdates);

        const firstRound = roundPlan.rounds[0];
        const secondRound = roundPlan.rounds[1];
        if (firstRound && secondRound) {
          for (let i = 0; i < firstRound.matches.length; i += 1) {
            const match = firstRound.matches[i];
            if (String(match.status || '').toLowerCase() !== 'bye' || !match.winner_employee_id) continue;
            const sourceRow = byCode.get(match.match_code);
            const targetRow = byCode.get(secondRound.matches[Math.floor(i / 2)]?.match_code);
            if (!sourceRow || !targetRow) continue;
            const update = {};
            if (!targetRow.player_a_employee_id) update.player_a_employee_id = match.winner_employee_id;
            else if (!targetRow.player_b_employee_id) update.player_b_employee_id = match.winner_employee_id;
            if (Object.keys(update).length > 0) {
              await supabase
                .from('tournament_matches')
                .update(update)
                .match({ id: targetRow.id });
            }
          }
        }
      }

      await loadTournaments();
      await loadTournamentMatches();
      return { success: true, data: inserted || [] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const getTournamentApprovedParticipants = (tournamentId) =>
    tournamentParticipants.filter(
      (p) =>
        p.tournament_id === tournamentId &&
        APPROVED_TOURNAMENT_STATUSES.has(String(p.status || '').toLowerCase())
    );

  // ── Tournament participation (admin approves non-admin requests) ─────────
  const registerForTournament = async (tournamentId, employeeId) => {
    try {
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }
      if (!tournament.registration_open) {
        return { success: false, error: 'Registration is closed for this tournament' };
      }
      // Block registration once the tournament start date has passed.
      if (tournament.start_date && new Date(tournament.start_date) <= new Date()) {
        return { success: false, error: 'Registration is closed — tournament has already started' };
      }
      const normalizedEmpId = String(employeeId || getCurrentEmpId()).trim().toUpperCase();
      if (!normalizedEmpId) {
        return { success: false, error: 'Your profile is missing an employee ID' };
      }
      const userIsAdmin = isAdmin();
      const approvedParticipants = getTournamentApprovedParticipants(tournamentId);
      const registeredParticipant = tournamentParticipants.find(
        p =>
          p.tournament_id === tournamentId &&
          p.employee_id?.toUpperCase() === normalizedEmpId &&
          APPROVED_TOURNAMENT_STATUSES.has(String(p.status || '').toLowerCase())
      );
      const withdrawnParticipant = tournamentParticipants.find(
        p =>
          p.tournament_id === tournamentId &&
          p.employee_id?.toUpperCase() === normalizedEmpId &&
          String(p.status || '').toLowerCase() === 'withdrawn'
      );
      const existingRequest = tournamentRegistrationRequests.find(
        (request) =>
          request.tournament_id === tournamentId &&
          request.employee_id?.toUpperCase() === normalizedEmpId &&
          String(request.status || '').toLowerCase() === 'pending'
      );

      if (userIsAdmin) {
        if (approvedParticipants.length >= (tournament.max_participants || 8)) {
          return { success: false, error: 'Tournament is full' };
        }
        const nextSeed = approvedParticipants.length + 1;
        const existingApproved = registeredParticipant;
        let data;

        if (existingApproved) {
          return { success: false, error: 'You are already registered for this tournament' };
        }

        if (withdrawnParticipant) {
          const { data: updated, error: updateErr } = await supabase
            .from('tournament_participants')
            .update({ status: 'registered', seed: nextSeed })
            .match({ id: withdrawnParticipant.id })
            .select();
          if (updateErr) throw updateErr;
          data = updated;
        } else {
          const { data: inserted, error: insertErr } = await supabase
            .from('tournament_participants')
            .insert([{
              tournament_id: tournamentId,
              employee_id: normalizedEmpId,
              seed: nextSeed,
              status: 'registered',
            }])
            .select();
          if (insertErr) throw insertErr;
          data = inserted;
        }

        if (existingRequest) {
          await supabase
            .from('tournament_registration_requests')
            .delete()
            .match({ id: existingRequest.id });
        }

        await loadTournamentParticipants();
        await loadTournamentRegistrationRequests();
        await loadLeaderboard();
        return { success: true, data: data?.[0] || null };
      }

      if (registeredParticipant) {
        return { success: false, error: 'You are already registered for this tournament' };
      }

      if (existingRequest) {
        return { success: true, pending: true, data: existingRequest };
      }

      const { data, error } = await supabase
        .from('tournament_registration_requests')
        .insert([{
          tournament_id: tournamentId,
          employee_id: normalizedEmpId,
          status: 'pending',
        }])
        .select();
      if (error) throw error;

      await loadTournamentRegistrationRequests();
      return { success: true, pending: true, data: data?.[0] || null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const approveTournamentRegistration = async (requestId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can approve tournament registrations' };
    }

    try {
      const request = tournamentRegistrationRequests.find((row) => row.id === requestId);
      if (!request) {
        return { success: false, error: 'Registration request not found' };
      }

      const tournament = tournaments.find((t) => t.id === request.tournament_id);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }

      const approvedParticipants = getTournamentApprovedParticipants(request.tournament_id);
      if (approvedParticipants.length >= (tournament.max_participants || 8)) {
        return { success: false, error: 'Tournament is full' };
      }

      const nextSeed = approvedParticipants.length + 1;

      const existingApproved = tournamentParticipants.find(
        (p) =>
          p.tournament_id === request.tournament_id &&
          p.employee_id?.toUpperCase() === request.employee_id?.toUpperCase() &&
          APPROVED_TOURNAMENT_STATUSES.has(String(p.status || '').toLowerCase())
      );
      if (existingApproved) {
        await supabase
          .from('tournament_registration_requests')
          .delete()
          .match({ id: requestId });
        await loadTournamentRegistrationRequests();
        return { success: true, data: existingApproved, alreadyRegistered: true };
      }

      const withdrawnParticipant = tournamentParticipants.find(
        (p) =>
          p.tournament_id === request.tournament_id &&
          p.employee_id?.toUpperCase() === request.employee_id?.toUpperCase() &&
          String(p.status || '').toLowerCase() === 'withdrawn'
      );

      let data;
      if (withdrawnParticipant) {
        const { data: updated, error: updateErr } = await supabase
          .from('tournament_participants')
          .update({ status: 'registered', seed: nextSeed })
          .match({ id: withdrawnParticipant.id })
          .select();
        if (updateErr) throw updateErr;
        data = updated;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('tournament_participants')
          .insert([{
            tournament_id: request.tournament_id,
            employee_id: request.employee_id,
            seed: nextSeed,
            status: 'registered',
          }])
          .select();
        if (insertErr) throw insertErr;
        data = inserted;
      }

      const { error: deleteErr } = await supabase
        .from('tournament_registration_requests')
        .delete()
        .match({ id: requestId });
      if (deleteErr) throw deleteErr;

      await loadTournamentParticipants();
      await loadTournamentRegistrationRequests();
      await loadLeaderboard();
      return { success: true, data: data?.[0] || null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const withdrawFromTournament = async (participantId) => {
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .update({ status: 'withdrawn' })
        .match({ id: participantId });
      if (error) throw error;
      await loadTournamentParticipants();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Convenience wrapper: finds the active participant row by tournamentId +
  // employeeId, then delegates to withdrawFromTournament.
  // Also deducts the 2 participation points that were awarded on registration
  // via the DB trigger trg_leaderboard_participant.
  const unregisterFromTournament = async (tournamentId, employeeId) => {
    try {
      const participant = tournamentParticipants.find(
        p =>
          p.tournament_id === tournamentId &&
          p.employee_id?.toUpperCase() === employeeId?.toUpperCase() &&
          p.status !== 'withdrawn'
      );
      if (!participant) {
        return { success: false, error: 'You are not registered for this tournament' };
      }

      const result = await withdrawFromTournament(participant.id);
      if (!result.success) return result;

      // Participation no longer affects points, so just reload the leaderboard
      // to keep the UI consistent after status changes.
      await loadLeaderboard();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Tournament matches (admin for create, participants for results) ─────
  const addTournamentMatch = async (matchData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can create matches' };
    }
    try {
      // player_a_employee_id / player_b_employee_id = captain only (FK-safe).
      const { data, error } = await supabase
        .from('tournament_matches')
        .insert([{
          tournament_id: matchData.tournament_id,
          match_code: matchData.match_code,
          round: matchData.round || 'QF',
          match_number: matchData.match_number || 1,
          player_a_employee_id: matchData.player_a_employee_id || null,
          player_b_employee_id: matchData.player_b_employee_id || null,
          scheduled_at: matchData.scheduled_at || null,
          next_match_winner_id: matchData.next_match_winner_id || null,
          next_match_loser_id: matchData.next_match_loser_id || null,
          notes: matchData.notes || null,
        }])
        .select();
      if (error) throw error;

      // Insert all team members into the junction table.
      // team_a_players / team_b_players are arrays of employee_ids ordered by position.
      const matchId = data?.[0]?.id;
      if (matchId) {
        const playerRows = [];
        (matchData.team_a_players || []).forEach((empId, idx) => {
          if (empId) playerRows.push({ match_id: matchId, employee_id: empId, team: 'A', position: idx + 1 });
        });
        (matchData.team_b_players || []).forEach((empId, idx) => {
          if (empId) playerRows.push({ match_id: matchId, employee_id: empId, team: 'B', position: idx + 1 });
        });
        if (playerRows.length > 0) {
          try {
            await supabase.from('tournament_match_players').insert(playerRows);
          } catch (_) { /* degrade gracefully if table not yet created */ }
        }
      }

      await loadTournamentMatches();
      return { success: true, data: data?.[0] || null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Update match players / schedule (admin only).
  // Replaces the junction-table rows for both teams atomically:
  // delete all existing rows for this match then re-insert.
  const updateTournamentMatch = async (matchId, matchData) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can edit matches' };
    }
    try {
      const captainA = (matchData.team_a_players || [])[0] || null;
      const captainB = (matchData.team_b_players || [])[0] || null;

      const { error: updateErr } = await supabase
        .from('tournament_matches')
        .update({
          match_code: matchData.match_code,
          round: matchData.round,
          match_number: matchData.match_number,
          player_a_employee_id: captainA,
          player_b_employee_id: captainB,
          scheduled_at: matchData.scheduled_at || null,
        })
        .match({ id: matchId });
      if (updateErr) throw updateErr;

      // Replace junction-table rows for this match.
      try {
        await supabase.from('tournament_match_players').delete().eq('match_id', matchId);
        const playerRows = [];
        (matchData.team_a_players || []).forEach((empId, idx) => {
          if (empId) playerRows.push({ match_id: matchId, employee_id: empId, team: 'A', position: idx + 1 });
        });
        (matchData.team_b_players || []).forEach((empId, idx) => {
          if (empId) playerRows.push({ match_id: matchId, employee_id: empId, team: 'B', position: idx + 1 });
        });
        if (playerRows.length > 0) {
          await supabase.from('tournament_match_players').insert(playerRows);
        }
      } catch (_) { /* degrade gracefully if junction table not yet created */ }

      await loadTournamentMatches();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete a match and its junction-table rows (admin only).
  const deleteTournamentMatch = async (matchId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can delete matches' };
    }
    try {
      // Remove junction rows first (FK constraint), then the match row.
      try {
        await supabase.from('tournament_match_players').delete().eq('match_id', matchId);
      } catch (_) { /* degrade gracefully */ }

      const { error } = await supabase
        .from('tournament_matches')
        .delete()
        .match({ id: matchId });
      if (error) throw error;

      await loadTournamentMatches();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const recordMatchResult = async (matchId, resultData) => {
    try {
      const match = tournamentMatches.find(m => m.id === matchId);
      if (!match) return { success: false, error: 'Match not found' };

      // Permission check (mirrors the UI gate in TournamentsPage.canEditMatch):
      // admin can always edit; non-admin must be one of the two players, and
      // both player slots must be filled in (no TBD results).
      const recordedBy = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || null;
      if (!isAdmin()) {
        if (!recordedBy) {
          return { success: false, error: 'Your profile is missing an employee ID' };
        }
        const me = String(recordedBy).toUpperCase();
        const a = String(match.player_a_employee_id || '').toUpperCase();
        const b = String(match.player_b_employee_id || '').toUpperCase();
        if (!a || !b) {
          return { success: false, error: 'Only an admin can record a result before both players are set' };
        }
        if (me !== a && me !== b) {
          return { success: false, error: 'Only the two players in this match can record its result' };
        }
      }

      const resultType = String(
        resultData.result_type ||
        resultData.status ||
        'completed'
      ).trim().toLowerCase();
      const normalizedType = resultType === 'in progress' ? 'in_progress' : resultType;
      const isFirstEntry = !new Set(['completed', 'draw', 'walkover', 'no_show', 'rescheduled', 'cancelled', 'disputed', 'bye']).has(getMatchStatus(match));
      const { teamA, teamB } = getMatchPlayerIds(match);
      const winner = (
        normalizedType === 'draw' ||
        normalizedType === 'rescheduled' ||
        normalizedType === 'cancelled' ||
        normalizedType === 'disputed'
      ) ? null : (
        normalizedType === 'no_show' && resultData.absent_participant_employee_id
          ? String(resultData.absent_participant_employee_id).toUpperCase() === String(match.player_a_employee_id || '').toUpperCase()
            ? match.player_b_employee_id
            : match.player_a_employee_id
          : (resultData.winner_employee_id || null)
      );

      const status = (
        normalizedType === 'no_show' ? 'no_show' :
        normalizedType === 'walkover' ? 'walkover' :
        normalizedType === 'draw' ? 'draw' :
        normalizedType === 'rescheduled' ? 'rescheduled' :
        normalizedType === 'cancelled' ? 'cancelled' :
        normalizedType === 'disputed' ? 'disputed' :
        normalizedType === 'bye' ? 'bye' :
        'completed'
      );

      const payload = {
        score_a: resultData.score_a ?? null,
        score_b: resultData.score_b ?? null,
        winner_employee_id: winner,
        status,
        played_at: status === 'completed' || status === 'walkover' || status === 'no_show' || status === 'bye'
          ? new Date().toISOString()
          : null,
        duration_seconds: resultData.duration_seconds || null,
        scheduled_at: status === 'rescheduled' && resultData.scheduled_at
          ? resultData.scheduled_at
          : match.scheduled_at || null,
        notes: resultData.notes || resultData.reason || null,
        recorded_by_employee_id: recordedBy,
      };

      const { error } = await supabase
        .from('tournament_matches')
        .update(payload)
        .match({ id: matchId });
      if (error) throw error;

      if (status === 'draw') {
        const participantIds = [...new Set([...teamA, ...teamB])];
        for (const empId of participantIds) {
          const row = tournamentParticipants.find(
            (p) => p.tournament_id === match.tournament_id && p.employee_id?.toUpperCase() === String(empId).toUpperCase()
          );
          if (!row) continue;
          await supabase
            .from('tournament_participants')
            .update({
              matches_played: (row.matches_played || 0) + 1,
            })
            .match({ id: row.id });
          await supabase.rpc('leaderboard_apply', {
            p_employee_id: empId,
            p_game: 'all',
            p_delta: { draws: 1 },
          });
        }
      } else if (winner && FINISHING_MATCH_STATUSES.has(status)) {
        const loser = String(match.player_a_employee_id || '').toUpperCase() === String(winner).toUpperCase()
          ? match.player_b_employee_id
          : match.player_a_employee_id;

        try {
          await supabase.rpc('participant_record_match', {
            p_tournament_id: match.tournament_id,
            p_winner_id: winner || '',
            p_loser_id: loser || '',
            p_increment_played: isFirstEntry,
          });
        } catch (statsErr) {
          console.warn('participant_record_match failed:', statsErr);
        }

        if (isFirstEntry) {
          const teamAWon = String(winner || '').toUpperCase() === String(match.player_a_employee_id || '').toUpperCase();
          for (const empId of teamA) {
            await supabase.rpc('leaderboard_apply', {
              p_employee_id: empId,
              p_game: 'all',
              p_delta: teamAWon ? { match_wins: 1 } : { match_losses: 1 },
            });
          }
          for (const empId of teamB) {
            await supabase.rpc('leaderboard_apply', {
              p_employee_id: empId,
              p_game: 'all',
              p_delta: teamAWon ? { match_losses: 1 } : { match_wins: 1 },
            });
          }
        }

        const tournament = tournaments.find((t) => t.id === match.tournament_id);
        if (winner && normalizeTournamentFormat(tournament?.format) === 'knockout') {
          await advanceWinnerToNextMatch(match, winner);
        }
      }

      await loadTournamentMatches();
      await loadTournamentParticipants();
      await loadLeaderboard();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Final results (admin) ───────────────────────────────────────────────
  const declareFinalResults = async (tournamentId, results) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can declare final results' };
    }
    try {
      const submitter = currentUser?.user_metadata?.name || 'Admin';
      // Wipe previous declarations for this tournament then re-insert (idempotent).
      await supabase.from('final_results').delete().eq('tournament_id', tournamentId);

      const rows = results
        .filter(r => r.employee_id)
        .map(r => ({
          tournament_id: tournamentId,
          employee_id: r.employee_id,
          department: r.department || null,
          position: r.position,
          matches_played: r.matches_played || 0,
          wins: r.wins || 0,
          losses: r.losses || 0,
          points: r.points || 0,
          prize_amount: r.prize_amount || null,
          prize_description: r.prize_description || null,
          certificate_issued: !!r.certificate_issued,
          declared_by: submitter,
        }));
      if (rows.length === 0) {
        return { success: false, error: 'No results to declare' };
      }
      const { error } = await supabase.from('final_results').insert(rows);
      if (error) throw error;

      // Update champion / runner-up / 3rd on the tournament itself.
      const champion    = rows.find(r => r.position === 1);
      const runnerUp    = rows.find(r => r.position === 2);
      const thirdPlace  = rows.find(r => r.position === 3);
      await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          champion_employee_id: champion?.employee_id || null,
          runner_up_employee_id: runnerUp?.employee_id || null,
          third_place_employee_id: thirdPlace?.employee_id || null,
        })
        .match({ id: tournamentId });

      // Award tournament podium points via the leaderboard helper.
      for (const row of rows) {
        const delta = {};
        if (row.position === 1) delta.tournament_wins = 1;
        else if (row.position === 2) delta.tournament_seconds = 1;
        else if (row.position === 3) delta.tournament_thirds = 1;
        if (Object.keys(delta).length) {
          await supabase.rpc('leaderboard_apply', {
            p_employee_id: row.employee_id,
            p_game: 'all',
            p_delta: delta,
          });
        }
      }

      await loadFinalResults();
      await loadTournaments();
      await loadLeaderboard();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Get player bans
  const getPlayerBans = (playerName, game) => {
    const normalizedGame = String(game || '');
    return bans.filter(b => 
      (b.employee === playerName || b.employee_id === playerName) &&
      b.active !== false &&
      new Date(b.until_date) > new Date() &&
      (String(b.game) === normalizedGame || b.game === 'All Games')
    );
  };

  const getResultTableName = (gameId) => {
    const normalizedGame = resolveGameKey(gameId);
    if (normalizedGame === 'carrom') return 'carrom_match_results';
    if (normalizedGame === 'chess') return 'chess_match_results';
    return null;
  };

  const getSlotMatchResult = (gameId, day, slotId) => {
    const normalizedGame = resolveGameKey(gameId);
    return (matchResults[normalizedGame] || []).find((row) => row.day === day && String(row.slot_id) === String(slotId)) || null;
  };

  const submitMatchResult = async (gameId, resultData) => {
    try {
      const tableName = getResultTableName(gameId);
      if (!tableName) {
        return { success: false, error: 'Results are only enabled for Carrom and Chess.' };
      }

      const user = await supabase.auth.getUser();
      const authUser = user.data.user;
      const userId = authUser?.id;
      const empId =
        authUser?.user_metadata?.emp_id ||
        authUser?.user_metadata?.employee_code ||
        authUser?.user_metadata?.empId ||
        currentUser?.user_metadata?.emp_id ||
        '';
      const submitterName =
        authUser?.user_metadata?.name ||
        currentUser?.user_metadata?.name ||
        currentUser?.email?.split('@')[0] ||
        'Player';

      if (!userId || !empId) {
        return { success: false, error: 'Your profile is missing employee details.' };
      }

      const payload = {
        day: resultData.day,
        slot_id: resultData.slotId,
        submitted_by_user_id: userId,
        submitted_by_employee_id: empId,
        submitted_by_name: submitterName,
        team_a_players: resultData.teamAPlayers,
        team_b_players: resultData.teamBPlayers,
        result: resultData.result,
      };

      const { data, error } = await supabase
        .from(tableName)
        .upsert([payload], { onConflict: 'day,slot_id' })
        .select();

      if (error) throw error;

      await loadMatchResults();
      return { success: true, data: data?.[0] || null };
    } catch (err) {
      console.error('Error saving match result:', err);
      return { success: false, error: err.message };
    }
  };

  const getPlayerGameStats = (gameId, employeeId) => {
    const normalizedGame = resolveGameKey(gameId);
    const gameResults = matchResults[normalizedGame] || [];
    const employeeName =
      currentUser?.user_metadata?.name ||
      currentUser?.email?.split('@')[0] ||
      '';
    return getPlayerStatsFromResults(gameResults, employeeId, employeeName);
  };

  // ── Derived helpers for Events / Tournaments / Leaderboard ──────────────
  const getUpcomingEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => {
        if (!e.is_published) return false;
        if (e.event_status === 'cancelled' || e.event_status === 'completed') return false;
        const start = e.start_date ? new Date(e.start_date) : null;
        if (!start) return false;
        const end = e.end_date ? new Date(e.end_date) : null;
        if (end && end < today) return false;
        return start >= today || (end && end >= today);
      })
      .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));
  };

  const getPastEvents = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return events
      .filter(e => {
        if (e.event_status === 'completed') return true;
        const end = e.end_date ? new Date(e.end_date) : null;
        if (end && end < today) return true;
        const start = e.start_date ? new Date(e.start_date) : null;
        return start && start < today;
      })
      .sort((a, b) => String(b.start_date).localeCompare(String(a.start_date)));
  };

  const getTournamentById = (tournamentId) =>
    tournaments.find(t => t.id === tournamentId) || null;

  const getMatchesByTournament = (tournamentId) =>
    tournamentMatches
      .filter(m => m.tournament_id === tournamentId)
      .sort((a, b) => {
        const ra = compareTournamentRounds(a.round, b.round);
        if (ra !== 0) return ra;
        return (a.match_number || 0) - (b.match_number || 0);
      });

  const getParticipantsByTournament = (tournamentId) =>
    tournamentParticipants
      .filter((p) => p.tournament_id === tournamentId && APPROVED_TOURNAMENT_STATUSES.has(String(p.status || '').toLowerCase()))
      .sort((a, b) => (a.seed || 0) - (b.seed || 0));

  const getResultsByTournament = (tournamentId) =>
    finalResults
      .filter(r => r.tournament_id === tournamentId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

  const getPlayerLeaderboardEntry = (employeeId, game = null) => {
    if (!employeeId) return null;
    if (game) {
      return leaderboard.find(
        l => l.employee_id?.toUpperCase() === employeeId.toUpperCase() && l.game === game
      ) || null;
    }
    // Sum across all games
    const rows = leaderboard.filter(
      l => l.employee_id?.toUpperCase() === employeeId.toUpperCase()
    );
    if (rows.length === 0) return null;
    return rows.reduce((acc, row) => ({
      ...acc,
      total_points: acc.total_points + (row.total_points || 0),
      tournament_wins: acc.tournament_wins + (row.tournament_wins || 0),
      tournament_seconds: acc.tournament_seconds + (row.tournament_seconds || 0),
      tournament_thirds: acc.tournament_thirds + (row.tournament_thirds || 0),
      match_wins: acc.match_wins + (row.match_wins || 0),
      match_losses: acc.match_losses + (row.match_losses || 0),
      draws: acc.draws + (row.draws || 0),
      participations: acc.participations + (row.participations || 0),
      rule_violations: acc.rule_violations + (row.rule_violations || 0),
      no_shows: acc.no_shows + (row.no_shows || 0),
    }), {
      employee_id: employeeId,
      game: 'all',
      total_points: 0,
      tournament_wins: 0, tournament_seconds: 0, tournament_thirds: 0,
      match_wins: 0, match_losses: 0, draws: 0,
      participations: 0, rule_violations: 0, no_shows: 0,
    });
  };

  const getEmployeeName = (employeeId) => {
    if (!employeeId) return 'TBD';
    const match = employees.find(
      e => e.employee_code?.toUpperCase() === String(employeeId).toUpperCase()
    );
    if (match) return match.name;
    return String(employeeId);
  };

  // Check if player is banned
  const isPlayerBanned = (playerName, game) => {
    return getPlayerBans(playerName, game).length > 0;
  };

  // Get game stats
  const getGameStats = (gameId) => {
    const today = currentDate;
    const todayName = getDayName(today);
    let todayBookings = 0;
    let availableSlots = 0;
    let fullSlots = 0;
    const normalizedGameId = String(gameId);
    const resolvedGame = games.find(g => String(g.id) === normalizedGameId || g.name === normalizedGameId);
    const maxPerSlot = resolvedGame?.maxPlayers || 4;

    if (bookings[todayName]) {
      SLOTS.forEach(slot => {
        const players = (bookings[todayName]?.[slot.id] || []).filter((booking) => isBookingInWeek(booking, currentDate));
        const gamePlayers = players.filter(p => String(p.game) === normalizedGameId || p.game === resolvedGame?.name);
        const count = gamePlayers.length;
        todayBookings += count;
        if (count >= maxPerSlot) fullSlots++;
        else availableSlots++;
      });
    }

    const activeBans = bans.filter(b => 
      b.active !== false && 
      new Date(b.until_date) > new Date() &&
      (String(b.game) === normalizedGameId || b.game === resolvedGame?.name || b.game === 'All Games')
    ).length;

    return {
      todayBookings,
      availableSlots,
      fullSlots,
      activeBans,
      totalGames: games.length
    };
  };

  const value = {
    games,
    slots,
    bookings,
    setBookings,
    loadGames,
    bans,
    setBans,
    rules,
    setRules,
    violations,
    setViolations,
    loading,
    currentDate,
    setCurrentDate,
    selectedGame,
    setSelectedGame,
    activeTab,
    setActiveTab,
    currentUser,
    employees,
    isAdmin,
    addBooking,
    removeBooking,
    loadBookings,
    loadMatchResults,
    loadBans,
    loadRules,
    loadViolations,
    loadEmployees,
    addBan,
    liftBan,
    deleteBan,
    addRule,
    updateRule,
    deleteRule,
    getPlayerBans,
    isPlayerBanned,
    getGameStats,
    matchResults,
    submitMatchResult,
    getSlotMatchResult,
    getPlayerGameStats,
    resolveGameKey,
    // ── Events / Tournaments / Leaderboard ──────────────────────────────
    events,
    tournaments,
    tournamentParticipants,
    tournamentRegistrationRequests,
    tournamentMatches,
    finalResults,
    leaderboard,
    loadEvents,
    loadTournaments,
    loadTournamentParticipants,
    loadTournamentRegistrationRequests,
    loadTournamentMatches,
    loadFinalResults,
    loadLeaderboard,
    addEvent,
    updateEvent,
    deleteEvent,
    addTournament,
    updateTournament,
    deleteTournament,
    generateTournamentFixtures,
    registerForTournament,
    approveTournamentRegistration,
    withdrawFromTournament,
    unregisterFromTournament,
    addTournamentMatch,
    updateTournamentMatch,
    deleteTournamentMatch,
    recordMatchResult,
    declareFinalResults,
    getUpcomingEvents,
    getPastEvents,
    getTournamentById,
    getMatchesByTournament,
    getParticipantsByTournament,
    getResultsByTournament,
    getPlayerLeaderboardEntry,
    getEmployeeName,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
