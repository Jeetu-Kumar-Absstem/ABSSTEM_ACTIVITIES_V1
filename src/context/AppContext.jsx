// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { GAMES, SLOTS, DAYS } from '../utils/constants';
import { isAdminId } from '../utils/admin';
import {
  getDayName,
  getPlayerStatsFromResults,
  getWeekRange,
  isBookingInWeek,
} from '../utils/helpers';

const AppContext = createContext();

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

  const loadTournamentMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('*')
        .order('tournament_id', { ascending: true })
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });
      if (error) throw error;
      setTournamentMatches(data || []);
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
  const addBooking = async (day, slotId, playerName) => {
    try {
      await cleanupOldBookings();
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      const empId = user.data.user?.user_metadata?.emp_id || user.data.user?.user_metadata?.employee_code || currentUser?.user_metadata?.emp_id || '';

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
        (b.employee_id === empId || b.employee === playerName) &&
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
          player_name: playerName,
          user_id: userId,
          employee_id: empId,
          game: String(selectedGame),
          booked_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      
      const newBookings = { ...bookings };
      if (!newBookings[day]) newBookings[day] = {};
      if (!newBookings[day][slotId]) newBookings[day][slotId] = [];
      newBookings[day][slotId].push({
        name: playerName,
        user_id: userId,
        employee_id: empId,
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

  // ── Tournament participation (any auth user can self-register) ──────────
  const registerForTournament = async (tournamentId, employeeId) => {
    try {
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (!tournament) {
        return { success: false, error: 'Tournament not found' };
      }
      if (!tournament.registration_open) {
        return { success: false, error: 'Registration is closed for this tournament' };
      }
      const registeredCount = tournamentParticipants.filter(
        p => p.tournament_id === tournamentId && p.status !== 'withdrawn'
      ).length;
      if (registeredCount >= (tournament.max_participants || 8)) {
        return { success: false, error: 'Tournament is full' };
      }

      const nextSeed = (tournamentParticipants.filter(p => p.tournament_id === tournamentId).length || 0) + 1;

      // If the player previously unregistered, a withdrawn row still exists.
      // UPDATE it back to 'registered' to avoid the unique(tournament_id, employee_id) conflict.
      const existingWithdrawn = tournamentParticipants.find(
        p =>
          p.tournament_id === tournamentId &&
          p.employee_id?.toUpperCase() === employeeId?.toUpperCase() &&
          p.status === 'withdrawn'
      );

      let data;
      if (existingWithdrawn) {
        const { data: updated, error: updateErr } = await supabase
          .from('tournament_participants')
          .update({ status: 'registered', seed: nextSeed })
          .match({ id: existingWithdrawn.id })
          .select();
        if (updateErr) throw updateErr;
        data = updated;
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('tournament_participants')
          .insert([{
            tournament_id: tournamentId,
            employee_id: employeeId,
            seed: nextSeed,
            status: 'registered',
          }])
          .select();
        if (insertErr) throw insertErr;
        data = inserted;
      }

      await loadTournamentParticipants();

      // Award +2 participation points via the leaderboard helper.
      try {
        await supabase.rpc('leaderboard_apply', {
          p_employee_id: employeeId,
          p_game: tournament.game || 'all',
          p_delta: { participations: 1 },
        });
        await loadLeaderboard();
      } catch (lbErr) {
        // Non-fatal: leaderboard helper is best-effort.
        console.warn('leaderboard_apply failed:', lbErr);
      }

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
      return await withdrawFromTournament(participant.id);
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
      await loadTournamentMatches();
      return { success: true, data: data?.[0] || null };
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

      const { error } = await supabase
        .from('tournament_matches')
        .update({
          score_a: resultData.score_a,
          score_b: resultData.score_b,
          winner_employee_id: resultData.winner_employee_id,
          status: 'completed',
          played_at: new Date().toISOString(),
          duration_seconds: resultData.duration_seconds || null,
          recorded_by_employee_id: recordedBy,
        })
        .match({ id: matchId });
      if (error) throw error;
      await loadTournamentMatches();

      // Update participant win/loss counters.
      if (match.player_a_employee_id) {
        await supabase.rpc('leaderboard_apply', {
          p_employee_id: match.player_a_employee_id,
          p_game: 'all',
          p_delta: resultData.winner_employee_id === match.player_a_employee_id
            ? { match_wins: 1 }
            : { match_losses: 1 },
        });
      }
      if (match.player_b_employee_id) {
        await supabase.rpc('leaderboard_apply', {
          p_employee_id: match.player_b_employee_id,
          p_game: 'all',
          p_delta: resultData.winner_employee_id === match.player_b_employee_id
            ? { match_wins: 1 }
            : { match_losses: 1 },
        });
      }
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
        const roundOrder = { QF: 1, SF: 2, F: 3, '3RD': 4, RR: 5, GROUP: 6, QUAL: 7 };
        const ra = roundOrder[a.round] || 99;
        const rb = roundOrder[b.round] || 99;
        if (ra !== rb) return ra - rb;
        return (a.match_number || 0) - (b.match_number || 0);
      });

  const getParticipantsByTournament = (tournamentId) =>
    tournamentParticipants
      .filter(p => p.tournament_id === tournamentId && p.status !== 'withdrawn')
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
    tournamentMatches,
    finalResults,
    leaderboard,
    loadEvents,
    loadTournaments,
    loadTournamentParticipants,
    loadTournamentMatches,
    loadFinalResults,
    loadLeaderboard,
    addEvent,
    updateEvent,
    deleteEvent,
    addTournament,
    updateTournament,
    deleteTournament,
    registerForTournament,
    withdrawFromTournament,
    unregisterFromTournament,
    addTournamentMatch,
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