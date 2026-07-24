// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { GAMES, SLOTS, DAYS } from '../utils/constants';
import { isAdminId } from '../utils/admin';
import {
  buildKnockoutFixturePlan,
  buildRoundRobinFixturePlan,
  buildRoundRobinKnockoutPlan,
  buildSwissRoundPlan,
  buildLeagueFullFixturePlan,
  computeKnockoutShellUpdates,
  compareTournamentRounds,
  computeRoundRobinStandings,
  getMatchTeams,
  getRoundLabel,
  groupMatchesByRound,
  normalizeTournamentFormat,
  isByeMatch,
  refreshKnockoutPlan,
  stampScheduledTimes,
  groupIntoTeams,
  injectTeamPlayers,
} from '../utils/tournamentFixtures';
import {
  getDayName,
  getPlayerStatsFromResults,
  getWeekRange,
  isBookingInWeek,
} from '../utils/helpers';

const AppContext = createContext();
const THEME_STORAGE_KEY = 'absstem-theme';
const THEME_MODES = {
  light: 'light',
  dark: 'dark',
};
const APPROVED_TOURNAMENT_STATUSES = new Set([
  'registered',
  'active',
  'semi_finalist',
  'finalist',
  'eliminated',
  'pending_withdrawal', // still active until admin approves the withdrawal
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState(null);
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === 'undefined') return THEME_MODES.light;
    try {
      const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === THEME_MODES.dark || stored === THEME_MODES.light) {
        return stored;
      }
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches
        ? THEME_MODES.dark
        : THEME_MODES.light;
    } catch (error) {
      return THEME_MODES.light;
    }
  });

  const themeTokens = {
    mode: themeMode,
    isDark: themeMode === THEME_MODES.dark,
    isLight: themeMode === THEME_MODES.light,
  };

  // Check if current user is admin using the utils
  const isAdmin = () => {
    const empId =
      currentUser?.user_metadata?.emp_id ||
      currentUser?.user_metadata?.employee_code ||
      currentUser?.user_metadata?.empId ||
      '';
    return isAdminId(empId);
  };

  const toggleTheme = () => {
    setThemeMode((current) => (current === THEME_MODES.dark ? THEME_MODES.light : THEME_MODES.dark));
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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const body = document.body;
    root.dataset.theme = themeMode;
    body.dataset.theme = themeMode;
    root.style.colorScheme = themeMode;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    } catch (error) {
      // Ignore storage failures, theme still applies for this session.
    }
  }, [themeMode]);

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

    // ── Always fetch FRESH data from DB, never stale React state ──────────
    // If two matches (e.g. SF1 and SF2) both feed the same Final match, the
    // second call would otherwise read the React state that was current when
    // this closure was created — before the first call's DB write was reflected
    // — and incorrectly put the same player into both player_a and player_b.
    const { data: nextMatch, error: fetchErr } = await supabase
      .from('tournament_matches')
      .select('id, player_a_employee_id, player_b_employee_id')
      .eq('id', sourceMatch.next_match_winner_id)
      .single();
    if (fetchErr || !nextMatch) return { success: true };

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

      // Derive status: if end_date has passed and the tournament isn't already
      // marked completed/cancelled, treat it as completed on the client side
      // without writing back to the DB.
      const now = new Date();
      const enriched = (data || []).map((t) => {
        const alreadyDone = ['completed', 'cancelled'].includes(
          String(t.status || '').toLowerCase()
        );
        if (!alreadyDone && t.end_date && new Date(t.end_date) < now) {
          return { ...t, status: 'completed' };
        }
        return t;
      });

      setTournaments(enriched);
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

  // In AppContext.jsx, update the loadTournamentMatches function:

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

    // CRITICAL FIX: We need to restore the _feeds_from_a and _feeds_from_b
    // metadata from the match_code relationships. This can be derived from
    // the next_match_winner_id pointer chain.
    const enriched = (data || []).map(m => {
      // Find which previous matches feed into this one
      const feedsFrom = (data || []).filter(
        prev => prev.next_match_winner_id === m.id
      );
      
      // Sort by match_number to maintain order
      feedsFrom.sort((a, b) => (a.match_number || 0) - (b.match_number || 0));
      
      const feedsFromA = feedsFrom[0]?.match_code || null;
      const feedsFromB = feedsFrom[1]?.match_code || null;
      
      return {
        ...m,
        team_a_players: playersMap[m.id]?.A || [],
        team_b_players: playersMap[m.id]?.B || [],
        // Restore the feed metadata
        _feeds_from_a: feedsFromA,
        _feeds_from_b: feedsFromB,
      };
    });
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

  // ── Shared helper: insert match payloads + junction-table team players ──
  // Accepts the flat payload array and the round plan (for team data).
  // Returns { data, error } from Supabase insert.
  const insertMatchesWithTeams = async (payloads, rounds) => {
    const { data: inserted, error: insertErr } = await supabase
      .from('tournament_matches')
      .insert(payloads)
      .select();
    if (insertErr) return { data: null, error: insertErr };

    // Build a match_code → id map from the inserted rows
    const byCode = new Map((inserted || []).map((r) => [r.match_code, r]));

    // Insert team players into junction table (only for 2v2+)
    const teamRows = [];
    for (const round of rounds) {
      for (const match of round.matches) {
        const row = byCode.get(match.match_code);
        if (!row) continue;
        const aPlayers = match.team_a_players || [];
        const bPlayers = match.team_b_players || [];
        // Only insert if there are non-captain members (ppt > 1)
        if (aPlayers.length <= 1 && bPlayers.length <= 1) continue;
        aPlayers.forEach((p, i) => {
          if (p.employee_id) teamRows.push({ match_id: row.id, employee_id: p.employee_id, team: 'A', position: i + 1 });
        });
        bPlayers.forEach((p, i) => {
          if (p.employee_id) teamRows.push({ match_id: row.id, employee_id: p.employee_id, team: 'B', position: i + 1 });
        });
      }
    }
    if (teamRows.length > 0) {
      await supabase.from('tournament_match_players').insert(teamRows);
    }

    return { data: inserted, error: null };
  };

  const generateTournamentFixtures = async (tournamentId, opts = {}) => {
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

      // ── Build opts for fixture builder ────────────────────────────────
      const fixtureOpts = {
        playersPerTeam:      opts.playersPerTeam      ?? tournament.players_per_team ?? 1,
        tournamentStartDate: opts.tournamentStartDate ?? tournament.start_date       ?? null,
        startHour:           opts.startHour           ?? 10,
        intervalMinutes:     opts.intervalMinutes     ?? 30,
        timezone:            opts.timezone            ?? 'Asia/Kolkata',
      };

      const payloads = [];
      let roundPlan = null;

      if (format === 'knockout') {
        roundPlan = buildKnockoutFixturePlan(participants, fixtureOpts);
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            // Include ALL matches — even TBD shell (upcoming) matches.
            // Only skip true phantom matches that have no pre-place hints either.
            const isPhantom = !match.player_a_employee_id && !match.player_b_employee_id &&
                              !match._preplace_a && !match._preplace_b;
            // For TBD shells (future rounds): player_a/b both null but they
            // have no _preplace either — we WANT these to show in the bracket.
            // Only skip if both _feeds_from are also null (truly unreachable).
            if (isPhantom && !match._feeds_from_a && !match._feeds_from_b) continue;

            payloads.push({
              tournament_id:         tournamentId,
              match_code:            match.match_code,
              round:                 match.round,
              match_number:          match.match_number,
              player_a_employee_id:  match._preplace_a ?? match.player_a_employee_id,
              player_b_employee_id:  match._preplace_b ?? match.player_b_employee_id,
              score_a:               match.score_a,
              score_b:               match.score_b,
              winner_employee_id:    match.winner_employee_id,
              status:                match.status,
              scheduled_at:          match.scheduled_at ?? null,
              played_at:             match.status === 'bye' ? new Date().toISOString() : null,
            });
          }
        }
      } else if (format === 'round_robin') {
        // Generate ALL RR matches + KO bracket shells (TBD placeholders) at once.
        // Shells are filled in progressively as RR results arrive via recordMatchResult.
        const leaguePlan = buildLeagueFullFixturePlan(participants, fixtureOpts);
        roundPlan = { rounds: leaguePlan.rrRounds };

        // RR match payloads
        for (const round of leaguePlan.rrRounds) {
          for (const match of round.matches) {
            payloads.push({
              tournament_id:         tournamentId,
              match_code:            match.match_code,
              round:                 match.round,
              match_number:          match.match_number,
              player_a_employee_id:  match.player_a_employee_id,
              player_b_employee_id:  match.player_b_employee_id,
              status:                match.status,
              scheduled_at:          match.scheduled_at ?? null,
            });
          }
        }

        // Insert RR matches first
        const { data: rrInserted, error: rrErr } = await supabase
          .from('tournament_matches')
          .insert(payloads)
          .select();
        if (rrErr) throw rrErr;

        // Insert KO shell matches (all TBD)
        const koPayloads = leaguePlan.koMatches.map((m) => ({
          tournament_id:         tournamentId,
          match_code:            m.match_code,
          round:                 m.round,
          match_number:          m.match_number,
          player_a_employee_id:  null,
          player_b_employee_id:  null,
          status:                'scheduled',
          winner_employee_id:    null,
          score_a:               null,
          score_b:               null,
          scheduled_at:          null,
        }));
        const { data: koInserted, error: koErr } = await supabase
          .from('tournament_matches')
          .insert(koPayloads)
          .select();
        if (koErr) throw koErr;

        // Wire KO pointer chain: QF1→SF1, SF1→F1, SF2→F1
        const byCode = new Map((koInserted || []).map((r) => [r.match_code, r]));
        const qf1  = byCode.get('KO_QF1');
        const sf1  = byCode.get('KO_SF1');
        const sf2  = byCode.get('KO_SF2');
        const fin  = byCode.get('KO_F1');
        const ptrs = [];
        if (qf1 && sf1) ptrs.push(supabase.from('tournament_matches').update({ next_match_winner_id: sf1.id }).match({ id: qf1.id }));
        if (sf1 && fin) ptrs.push(supabase.from('tournament_matches').update({ next_match_winner_id: fin.id }).match({ id: sf1.id }));
        if (sf2 && fin) ptrs.push(supabase.from('tournament_matches').update({ next_match_winner_id: fin.id }).match({ id: sf2.id }));
        await Promise.all(ptrs);

        await supabase.from('tournaments').update({ status: 'live', registration_open: false }).match({ id: tournamentId });
        await loadTournaments();
        await loadTournamentMatches();
        return { success: true, data: [...(rrInserted || []), ...(koInserted || [])] };

      } else if (format === 'swiss') {
        const nextRoundNumber = latestSwissRound ? latestSwissRound + 1 : 1;
        roundPlan = buildSwissRoundPlan(participants, existingMatches, nextRoundNumber, fixtureOpts);
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            payloads.push({
              tournament_id:         tournamentId,
              match_code:            match.match_code,
              round:                 match.round,
              match_number:          match.match_number,
              player_a_employee_id:  match.player_a_employee_id,
              player_b_employee_id:  match.player_b_employee_id,
              score_a:               match.score_a,
              score_b:               match.score_b,
              winner_employee_id:    match.winner_employee_id,
              status:                match.status,
              scheduled_at:          match.scheduled_at ?? null,
              played_at:             match.status === 'bye' ? new Date().toISOString() : null,
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
        .update({ status: 'live', registration_open: false })
        .match({ id: tournamentId });

      // Insert matches + team junction rows
      const { data: inserted, error: insertErr } = await insertMatchesWithTeams(
        payloads,
        roundPlan?.rounds || []
      );
      if (insertErr) throw insertErr;

      if (format === 'knockout' && roundPlan?.rounds?.length > 1) {
        const byCode = new Map((inserted || []).map((row) => [row.match_code, row]));

        // ── Step 1: wire next_match_winner_id pointers ─────────────────
        // Use _feeds_into from the plan — correct even when phantom/bye
        // collapsing makes rounds have fewer matches than index math expects.
        const pointerUpdates = [];
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            if (!match._feeds_into) continue;
            const currentRow = byCode.get(match.match_code);
            const nextRow    = byCode.get(match._feeds_into);
            if (!currentRow || !nextRow) continue;
            pointerUpdates.push(
              supabase
                .from('tournament_matches')
                .update({ next_match_winner_id: nextRow.id })
                .match({ id: currentRow.id })
            );
          }
        }
        await Promise.all(pointerUpdates);

        // ── Step 2: auto-advance bye winners across ALL rounds ──────────
        // Group all bye winners by their target match first, then write each
        // target in ONE update.  Without this, when two byes both feed the
        // same match (e.g. both SFs are byes → Final), the sequential reads
        // both see player_a as null and both write player_a, producing
        // "Jeetu kr vs Jeetu kr" in the Final instead of "TBD vs TBD".
        const byeAdvances = new Map(); // targetMatchCode → [winnerId, ...]
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            if (String(match.status || '').toLowerCase() !== 'bye' || !match.winner_employee_id) continue;
            if (!match._feeds_into || !byCode.has(match._feeds_into)) continue;
            if (!byeAdvances.has(match._feeds_into)) byeAdvances.set(match._feeds_into, []);
            byeAdvances.get(match._feeds_into).push(match.winner_employee_id);
          }
        }
        for (const [targetCode, winners] of byeAdvances) {
          const targetRow = byCode.get(targetCode);
          if (!targetRow) continue;
          const update = {};
          const [winnerA, winnerB] = winners;
          if (winnerA) update.player_a_employee_id = winnerA;
          if (winnerB && winnerB !== winnerA) update.player_b_employee_id = winnerB;
          if (Object.keys(update).length > 0) {
            await supabase
              .from('tournament_matches')
              .update(update)
              .match({ id: targetRow.id });
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

  // Unregister flow:
  //   • Tournament NOT yet started → withdraw immediately (existing behaviour)
  //   • Tournament already live    → set participant status to 'pending_withdrawal'
  //     so the admin sees a request card and can approve or reject it.
  //     No new table or column needed — 'pending_withdrawal' is just another
  //     status value on tournament_participants.
  const unregisterFromTournament = async (tournamentId, employeeId) => {
    try {
      const participant = tournamentParticipants.find(
        (p) =>
          p.tournament_id === tournamentId &&
          p.employee_id?.toUpperCase() === employeeId?.toUpperCase() &&
          !['withdrawn', 'pending_withdrawal'].includes(String(p.status || '').toLowerCase())
      );
      if (!participant) {
        // Already pending or withdrawn
        const alreadyPending = tournamentParticipants.find(
          (p) =>
            p.tournament_id === tournamentId &&
            p.employee_id?.toUpperCase() === employeeId?.toUpperCase() &&
            String(p.status || '').toLowerCase() === 'pending_withdrawal'
        );
        if (alreadyPending) return { success: true, pending: true };
        return { success: false, error: 'You are not registered for this tournament' };
      }

      const tournament = tournaments.find((t) => t.id === tournamentId);
      const tournamentStarted = ['live', 'in_progress'].includes(
        String(tournament?.status || '').toLowerCase()
      );

      if (tournamentStarted) {
        // Queue for admin approval — mark as pending_withdrawal
        const { error } = await supabase
          .from('tournament_participants')
          .update({ status: 'pending_withdrawal' })
          .match({ id: participant.id });
        if (error) throw error;
        await loadTournamentParticipants();
        return { success: true, pending: true };
      }

      // Tournament not started — withdraw immediately
      const result = await withdrawFromTournament(participant.id);
      if (!result.success) return result;
      await loadLeaderboard();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Admin approves a withdrawal request → finalise as withdrawn
  const approveWithdrawalRequest = async (participantId) => {
    if (!isAdmin()) return { success: false, error: 'Only admins can approve withdrawal requests' };
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .update({ status: 'withdrawn' })
        .match({ id: participantId });
      if (error) throw error;
      await loadTournamentParticipants();
      await loadLeaderboard();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Admin rejects a withdrawal request → restore previous active status
  const rejectWithdrawalRequest = async (participantId) => {
    if (!isAdmin()) return { success: false, error: 'Only admins can reject withdrawal requests' };
    try {
      const { error } = await supabase
        .from('tournament_participants')
        .update({ status: 'registered' })
        .match({ id: participantId });
      if (error) throw error;
      await loadTournamentParticipants();
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
        const fmt = normalizeTournamentFormat(tournament?.format);
        const isKoRound = String(match.match_code || '').toUpperCase().startsWith('KO_');
        if (winner && (fmt === 'knockout' || isKoRound)) {
          await advanceWinnerToNextMatch(match, winner);
        }
      }

      // ── Revert next-match advancement when a result is "un-finished" ──────
      // If the match previously had a winner who was advanced into the next
      // match, and the new result_type is non-finishing (rescheduled, cancelled,
      // disputed) or a no_show/walkover without a winner, clear that slot so the
      // bracket card reverts to TBD.
      const NON_FINISHING = new Set(['rescheduled', 'cancelled', 'disputed']);
      const wasAdvanceable = !isFirstEntry; // had a previous result
      if (wasAdvanceable && NON_FINISHING.has(status) && match.next_match_winner_id) {
        const prevWinner = match.winner_employee_id; // value before this update
        if (prevWinner) {
          // Fetch fresh from DB — same reason as advanceWinnerToNextMatch:
          // stale React state may not reflect recent writes to the next match.
          const { data: nextMatch } = await supabase
            .from('tournament_matches')
            .select('id, player_a_employee_id, player_b_employee_id')
            .eq('id', match.next_match_winner_id)
            .single();
          if (nextMatch) {
            const revertPayload = {};
            const aMatch = String(nextMatch.player_a_employee_id || '').toUpperCase() === String(prevWinner).toUpperCase();
            const bMatch = String(nextMatch.player_b_employee_id || '').toUpperCase() === String(prevWinner).toUpperCase();
            if (aMatch) revertPayload.player_a_employee_id = null;
            else if (bMatch) revertPayload.player_b_employee_id = null;
            if (Object.keys(revertPayload).length > 0) {
              await supabase
                .from('tournament_matches')
                .update(revertPayload)
                .match({ id: nextMatch.id });
            }
          }
        }
      }

      // ── Auto-fill KO bracket shells when a League (round_robin) RR match completes ──
      // After each RR result, recompute standings and push updated seeds into
      // the KO_QF1, KO_SF1, KO_SF2 shell matches (F1 is filled by advanceWinner).
      const isRrMatch = String(match.round || '').toUpperCase().startsWith('RR') &&
                        !String(match.match_code || '').toUpperCase().startsWith('KO_');
      const tournamentForRr = tournaments.find((t) => t.id === match.tournament_id);
      const fmtForRr = normalizeTournamentFormat(tournamentForRr?.format);
      if (isRrMatch && fmtForRr === 'round_robin') {
        try {
          // Fetch fresh match + participant data so standings are up to date
          const [{ data: freshMatches }, { data: freshParticipants }] = await Promise.all([
            supabase.from('tournament_matches').select('*').eq('tournament_id', match.tournament_id),
            supabase.from('tournament_participants').select('*').eq('tournament_id', match.tournament_id),
          ]);
          const rrOnlyMatches = (freshMatches || []).filter(
            (m) => String(m.round || '').toUpperCase().startsWith('RR') &&
                   !String(m.match_code || '').toUpperCase().startsWith('KO_')
          );
          const approvedParts = (freshParticipants || []).filter((p) =>
            ['registered','active','semi_finalist','finalist','eliminated','pending_withdrawal']
              .includes(String(p.status || '').toLowerCase())
          );
          const standings = computeRoundRobinStandings(rrOnlyMatches, approvedParts);
          const koShells = (freshMatches || []).filter(
            (m) => String(m.match_code || '').toUpperCase().startsWith('KO_')
          );
          if (koShells.length > 0) {
            const shellUpdates = computeKnockoutShellUpdates(standings, koShells);
            await Promise.all(
              shellUpdates.map(({ id, update }) =>
                supabase.from('tournament_matches').update(update).match({ id })
              )
            );
          }
        } catch (shellErr) {
          console.warn('KO shell update failed (non-critical):', shellErr);
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

  // ── Round-Robin → Knockout phase generation (admin) ─────────────────────
  // Called once all RR matches are completed. Verifies completion, ranks the
  // top 5 participants, then inserts KO_QF / KO_SF / KO_F matches with the
  // correct next_match_winner_id pointer chain so that recordMatchResult can
  // auto-advance winners.
  const generateRoundRobinKnockout = async (tournamentId) => {
    if (!isAdmin()) {
      return { success: false, error: 'Only admins can generate the knockout phase' };
    }
    try {
      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { success: false, error: 'Tournament not found' };

      const format = normalizeTournamentFormat(tournament.format);
      if (format !== 'round_robin') {
        return { success: false, error: 'This action is only for Round-Robin tournaments' };
      }

      const existingMatches = tournamentMatches.filter((m) => m.tournament_id === tournamentId);

      // Block if KO phase already exists
      if (existingMatches.some((m) => String(m.match_code || '').toUpperCase().startsWith('KO_'))) {
        return { success: false, error: 'Knockout phase has already been generated' };
      }

      const rrMatches = existingMatches.filter((m) => String(m.round || '').toUpperCase().startsWith('RR'));
      if (rrMatches.length === 0) {
        return { success: false, error: 'No Round-Robin matches found. Generate fixtures first.' };
      }

      const incomplete = rrMatches.filter(
        (m) => !['completed', 'walkover', 'no_show', 'draw', 'bye', 'cancelled'].includes(
          String(m.status || '').toLowerCase()
        )
      );
      if (incomplete.length > 0) {
        return {
          success: false,
          error: `${incomplete.length} Round-Robin match${incomplete.length > 1 ? 'es are' : ' is'} still pending. Complete all matches before generating the knockout phase.`,
        };
      }

      const participants = getTournamentApprovedParticipants(tournamentId);
      const standings = computeRoundRobinStandings(rrMatches, participants);
      const matchPlans = buildRoundRobinKnockoutPlan(standings);

      if (matchPlans.length === 0) {
        return { success: false, error: 'Not enough qualified participants to build a knockout bracket (need at least 2)' };
      }

      const payloads = matchPlans.map((m) => ({
        tournament_id: tournamentId,
        match_code: m.match_code,
        round: m.round,
        match_number: m.match_number,
        player_a_employee_id: m.player_a_employee_id,
        player_b_employee_id: m.player_b_employee_id,
        status: m.status,
        winner_employee_id: m.winner_employee_id,
        score_a: m.score_a,
        score_b: m.score_b,
        played_at: m.status === 'bye' ? new Date().toISOString() : null,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('tournament_matches')
        .insert(payloads)
        .select();
      if (insertErr) throw insertErr;

      // Wire next_match_winner_id pointers:
      //   KO_QF1  → KO_SF1 (player_b slot)
      //   KO_SF1  → KO_F1  (player_a slot)
      //   KO_SF2  → KO_F1  (player_b slot)
      const byCode = new Map((inserted || []).map((r) => [r.match_code, r]));
      const pointers = [];

      const qf1  = byCode.get('KO_QF1');
      const sf1  = byCode.get('KO_SF1');
      const sf2  = byCode.get('KO_SF2');
      const fin  = byCode.get('KO_F1');

      if (qf1 && sf1) {
        pointers.push(
          supabase.from('tournament_matches').update({ next_match_winner_id: sf1.id }).match({ id: qf1.id })
        );
      }
      if (sf1 && fin) {
        pointers.push(
          supabase.from('tournament_matches').update({ next_match_winner_id: fin.id }).match({ id: sf1.id })
        );
      }
      if (sf2 && fin) {
        pointers.push(
          supabase.from('tournament_matches').update({ next_match_winner_id: fin.id }).match({ id: sf2.id })
        );
      }
      await Promise.all(pointers);

      // If QF was a bye, immediately slot the winner into SF1 player_b
      if (qf1?.status === 'bye' && qf1?.winner_employee_id && sf1) {
        await supabase
          .from('tournament_matches')
          .update({ player_b_employee_id: qf1.winner_employee_id })
          .match({ id: sf1.id });
      }

      await loadTournamentMatches();
      return { success: true, standings };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Knockout Refresh (admin) ────────────────────────────────────────────
  // Deletes ALL existing matches for the tournament and regenerates the full
  // bracket from scratch using the current participant list.
  // This fixes any corrupted bracket state (e.g. duplicate players in Final)
  // without requiring manual Supabase edits.
  const refreshKnockoutFixtures = async (tournamentId) => {
    if (!isAdmin()) return { success: false, error: 'Admins only' };
    try {
      // ── Step 1: fetch fresh data directly from Supabase ─────────────────
      const [{ data: freshParticipants, error: pErr }, { data: freshMatches, error: mErr }] =
        await Promise.all([
          supabase.from('tournament_participants').select('*').eq('tournament_id', tournamentId),
          supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId),
        ]);
      if (pErr) throw pErr;
      if (mErr) throw mErr;

      const tournament = tournaments.find((t) => t.id === tournamentId);
      if (!tournament) return { success: false, error: 'Tournament not found' };

      const APPROVED = new Set([
        'registered', 'active', 'semi_finalist', 'finalist',
        'eliminated', 'pending_withdrawal',
      ]);
      const approvedParticipants = (freshParticipants || []).filter(
        (p) => APPROVED.has(String(p.status || '').toLowerCase())
      );
      if (approvedParticipants.length < 2) {
        return { success: false, error: 'At least 2 registered participants are required' };
      }

      // ── Step 2: delete ALL existing matches for this tournament ──────────
      const existingIds = (freshMatches || []).map((m) => m.id);
      if (existingIds.length > 0) {
        const { error: delErr } = await supabase
          .from('tournament_matches')
          .delete()
          .in('id', existingIds);
        if (delErr) throw delErr;
      }

      // ── Step 3: build a brand-new fixture plan ───────────────────────────
      const fixtureOpts = {
        playersPerTeam:      tournament.players_per_team ?? 1,
        tournamentStartDate: tournament.start_date       ?? null,
        startHour:           10,
        intervalMinutes:     30,
        timezone:            'Asia/Kolkata',
      };
      const roundPlan = buildKnockoutFixturePlan(approvedParticipants, fixtureOpts);

      // ── Step 4: build insert payloads ────────────────────────────────────
      const payloads = [];
      for (const round of roundPlan.rounds) {
        for (const match of round.matches) {
          // Skip truly unreachable phantom matches (no players, no feeds at all)
          const isPhantom = !match.player_a_employee_id && !match.player_b_employee_id &&
                            !match._preplace_a && !match._preplace_b;
          if (isPhantom && !match._feeds_from_a && !match._feeds_from_b) continue;

          payloads.push({
            tournament_id:         tournamentId,
            match_code:            match.match_code,
            round:                 match.round,
            match_number:          match.match_number,
            player_a_employee_id:  match._preplace_a ?? match.player_a_employee_id,
            player_b_employee_id:  match._preplace_b ?? match.player_b_employee_id,
            score_a:               match.score_a,
            score_b:               match.score_b,
            winner_employee_id:    match.winner_employee_id,
            status:                match.status,
            scheduled_at:          match.scheduled_at ?? null,
            played_at:             match.status === 'bye' ? new Date().toISOString() : null,
          });
        }
      }

      if (payloads.length === 0) {
        return { success: false, error: 'No fixtures could be generated' };
      }

      // ── Step 5: insert all matches ───────────────────────────────────────
      const { data: inserted, error: insErr } = await insertMatchesWithTeams(
        payloads,
        roundPlan.rounds
      );
      if (insErr) throw insErr;

      // ── Step 6: wire next_match_winner_id pointers ───────────────────────
      if (roundPlan.rounds.length > 1) {
        const byCode = new Map((inserted || []).map((r) => [r.match_code, r]));

        const pointerUpdates = [];
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            if (!match._feeds_into) continue;
            const curRow  = byCode.get(match.match_code);
            const nextRow = byCode.get(match._feeds_into);
            if (curRow && nextRow) {
              pointerUpdates.push(
                supabase
                  .from('tournament_matches')
                  .update({ next_match_winner_id: nextRow.id })
                  .match({ id: curRow.id })
              );
            }
          }
        }
        await Promise.all(pointerUpdates);

        // ── Step 7: advance bye winners — batched per target to avoid the
        //    race condition where two byes both feed the same next match
        //    (e.g. SF1-bye + SF2-bye → Final) and sequential reads both see
        //    player_a as null, writing the same player into both slots.
        const byeAdvances = new Map(); // targetMatchCode → [winnerId, ...]
        for (const round of roundPlan.rounds) {
          for (const match of round.matches) {
            if (String(match.status || '').toLowerCase() !== 'bye' || !match.winner_employee_id) continue;
            if (!match._feeds_into || !byCode.has(match._feeds_into)) continue;
            if (!byeAdvances.has(match._feeds_into)) byeAdvances.set(match._feeds_into, []);
            byeAdvances.get(match._feeds_into).push(match.winner_employee_id);
          }
        }
        for (const [targetCode, winners] of byeAdvances) {
          const targetRow = byCode.get(targetCode);
          if (!targetRow) continue;
          const update = {};
          const [winnerA, winnerB] = winners;
          if (winnerA) update.player_a_employee_id = winnerA;
          if (winnerB && winnerB !== winnerA) update.player_b_employee_id = winnerB;
          if (Object.keys(update).length > 0) {
            await supabase
              .from('tournament_matches')
              .update(update)
              .match({ id: targetRow.id });
          }
        }
      }

      await Promise.all([loadTournamentMatches(), loadTournamentParticipants()]);
      return {
        success: true,
        message: `Fixtures refreshed — deleted ${existingIds.length} old match${existingIds.length !== 1 ? 'es' : ''} and generated ${payloads.length} new match${payloads.length !== 1 ? 'es' : ''}.`,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // ── Certificate log ────────────────────────────────────────────────────
  /**
   * Call this immediately after a certificate PDF is successfully generated.
   * Inserts a lightweight row into certificate_log — no PDF is stored.
   */
  const logCertificateIssuance = async ({ employeeId, tournamentId, position, issuedBy }) => {
    try {
      const { error } = await supabase.from('certificate_log').insert({
        employee_id:   employeeId,
        tournament_id: tournamentId,
        position,
        issued_by:     issuedBy,
      });
      if (error) console.error('certificate_log insert error:', error);
    } catch (err) {
      console.error('logCertificateIssuance error:', err);
    }
  };

  /**
   * Returns all certificate_log rows for a given employee_id,
   * joined with tournament metadata for display.
   * Falls back gracefully if the table doesn't exist yet.
   */
  const getCertificateLog = async (employeeId) => {
    try {
      const { data, error } = await supabase
        .from('certificate_log')
        .select('id, position, issued_at, issued_by, tournament_id, certificate_type, tournaments (id, name, game, start_date, end_date, status)')
        .eq('employee_id', employeeId)
        .order('issued_at', { ascending: false });
      if (error) {
        console.warn('getCertificateLog:', error.message);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('getCertificateLog error:', err);
      return [];
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

      // ── Auto-issue certificates for every declared participant ──────────
      // Wipe previous certificate_log rows for this tournament then re-insert.
      // Top-3 get TWO rows: participation (position=NULL) + rank cert.
      // Everyone else gets ONE row: participation (position=NULL).
      await supabase.from('certificate_log').delete().eq('tournament_id', tournamentId);

      const certRows = [];
      for (const r of rows) {
        // Every participant gets a participation certificate
        certRows.push({
          employee_id:      r.employee_id,
          tournament_id:    tournamentId,
          certificate_type: 'participation',
          position:         null,
          issued_by:        submitter,
        });
        // Top-3 additionally get a rank certificate
        if ([1, 2, 3].includes(r.position)) {
          const rankType = r.position === 1 ? 'rank_1' : r.position === 2 ? 'rank_2' : 'rank_3';
          certRows.push({
            employee_id:      r.employee_id,
            tournament_id:    tournamentId,
            certificate_type: rankType,
            position:         r.position,
            issued_by:        submitter,
          });
        }
      }

      const { error: certErr } = await supabase.from('certificate_log').insert(certRows);
      if (certErr) console.error('certificate_log insert error:', certErr);

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
    themeMode,
    themeTokens,
    setThemeMode,
    toggleTheme,
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
    generateRoundRobinKnockout,
    registerForTournament,
    approveTournamentRegistration,
    withdrawFromTournament,
    unregisterFromTournament,
    approveWithdrawalRequest,
    rejectWithdrawalRequest,
    refreshTournamentData: async () => {
      await Promise.all([loadTournaments(), loadTournamentMatches(), loadTournamentParticipants()]);
    },
    refreshKnockoutFixtures,
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
    getCertificateLog,
    logCertificateIssuance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
