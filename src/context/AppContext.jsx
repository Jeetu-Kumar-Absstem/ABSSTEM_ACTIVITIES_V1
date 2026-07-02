// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { GAMES, SLOTS, DAYS } from '../utils/constants';
import { isAdminId } from '../utils/admin';
import { getPlayerStatsFromResults } from '../utils/helpers';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [games, setGames] = useState(GAMES);
  const [slots, setSlots] = useState(SLOTS);
  const [bookings, setBookings] = useState({});
  const [matchResults, setMatchResults] = useState({ carrom: [], chess: [] });
  const [bans, setBans] = useState([]);
  const [rules, setRules] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
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

      const nextActiveGame = mappedGames.find(g => String(g.id) === String(selectedGame) && g.active);
      if (!nextActiveGame) {
        const firstActiveGame = mappedGames.find(g => g.active !== false);
        if (firstActiveGame) {
          setSelectedGame(firstActiveGame.id);
        }
      }
    } catch (err) {
      console.error('Error loading games:', err);
      const fallbackGames = GAMES.map(g => ({ ...g, maxPlayers: g.maxPlayers, active: true }));
      setGames(fallbackGames);
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

  useEffect(() => {
    loadGames();
    loadBookings();
    loadMatchResults();
    loadBans();
    loadRules();
    loadViolations();
    
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
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      const empId = user.data.user?.user_metadata?.emp_id || user.data.user?.user_metadata?.employee_code || currentUser?.user_metadata?.emp_id || '';

      const gameRecord = games.find(g => String(g.id) === String(selectedGame) || g.name === selectedGame);
      if (gameRecord && gameRecord.active === false) {
        return { success: false, error: 'Currently this is Unavailable' };
      }
      
      const dayBookings = bookings[day] || {};
      const allDayBookings = Object.values(dayBookings).flat();
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

      const { error } = await supabase
        .from('bookings')
        .delete()
        .match({ day, slot_id: slotId, player_name: playerName, user_id: userId });
      
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

  // Check if player is banned
  const isPlayerBanned = (playerName, game) => {
    return getPlayerBans(playerName, game).length > 0;
  };

  // Get game stats
  const getGameStats = (gameId) => {
    const today = new Date();
    const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let todayBookings = 0;
    let availableSlots = 0;
    let fullSlots = 0;
    const normalizedGameId = String(gameId);
    const resolvedGame = games.find(g => String(g.id) === normalizedGameId || g.name === normalizedGameId);
    const maxPerSlot = resolvedGame?.maxPlayers || 4;

    if (bookings[todayName]) {
      SLOTS.forEach(slot => {
        const players = bookings[todayName]?.[slot.id] || [];
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
    isAdmin,
    addBooking,
    removeBooking,
    loadBookings,
    loadMatchResults,
    loadBans,
    loadRules,
    loadViolations,
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppContext;
