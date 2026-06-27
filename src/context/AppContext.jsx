// src/context/AppContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { GAMES, SLOTS, DAYS } from '../utils/constants';

const AppContext = createContext();

export const useApp = () => useContext(AppContext);

export const AppProvider = ({ children }) => {
  const [games, setGames] = useState(GAMES);
  const [slots, setSlots] = useState(SLOTS);
  const [bookings, setBookings] = useState({});
  const [bans, setBans] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 28));
  const [selectedGame, setSelectedGame] = useState('carrom');
  const [activeTab, setActiveTab] = useState('booking');
  const [currentUser, setCurrentUser] = useState(null);

  // Load bookings from Supabase
  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*');
      if (error) throw error;
      
      // Transform into { Day: { slotId: [names] } }
      const grouped = {};
      DAYS.forEach(d => { grouped[d] = {}; SLOTS.forEach(s => { grouped[d][s.id] = []; }); });
      data?.forEach(b => {
        const day = b.day;
        if (grouped[day] && grouped[day][b.slot_id] !== undefined) {
          grouped[day][b.slot_id].push({
            name: b.player_name,
            user_id: b.user_id,
            booking_id: b.id
          });
        }
      });
      setBookings(grouped);
    } catch (err) {
      console.error('Error loading bookings:', err);
      // Fallback to mock data
      setBookings({
        Monday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] },
        Tuesday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] },
        Wednesday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] },
        Thursday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] },
        Friday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [], 11: [], 12: [] },
      });
    }
    setLoading(false);
  };

  const loadBans = async () => {
    try {
      const { data, error } = await supabase.from('bans').select('*');
      if (error) throw error;
      setBans(data || []);
    } catch (err) {
      setBans([]);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase.from('rules').select('*');
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      import('../utils/constants').then(({ RULES_DATA }) => setRules(RULES_DATA));
    }
  };

  useEffect(() => {
    loadBookings();
    loadBans();
    loadRules();
    
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user);
    });
  }, []);

  const addBooking = async (day, slotId, playerName) => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ 
          day, 
          slot_id: slotId, 
          player_name: playerName,
          user_id: userId,
          game: selectedGame,
          booked_at: new Date().toISOString()
        }])
        .select();

      if (error) throw error;
      
      // Optimistic update
      const newBookings = { ...bookings };
      if (!newBookings[day]) newBookings[day] = {};
      if (!newBookings[day][slotId]) newBookings[day][slotId] = [];
      newBookings[day][slotId].push({
        name: playerName,
        user_id: userId,
        booking_id: data[0]?.id
      });
      setBookings(newBookings);
      return true;
    } catch (err) {
      console.error('Error booking slot:', err);
      return false;
    }
  };

  const removeBooking = async (day, slotId, playerName, userId) => {
    try {
      // Check if current user is the one who made the booking
      const user = await supabase.auth.getUser();
      const currentUserId = user.data.user?.id;
      
      // Only allow removal if user is the owner or admin
      if (currentUserId !== userId) {
        console.error('You can only remove your own bookings');
        return false;
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
      return true;
    } catch (err) {
      console.error('Error removing booking:', err);
      return false;
    }
  };

  // Get stats for selected game
  const getGameStats = (gameId) => {
    const today = new Date();
    const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
    let todayBookings = 0;
    let availableSlots = 0;
    let fullSlots = 0;
    const maxPerSlot = games.find(g => g.id === gameId)?.maxPlayers || 4;

    if (bookings[todayName]) {
      SLOTS.forEach(slot => {
        const players = bookings[todayName]?.[slot.id] || [];
        const count = players.length;
        todayBookings += count;
        if (count >= maxPerSlot) fullSlots++;
        else availableSlots++;
      });
    }

    const activeBans = bans.filter(b => 
      b.active !== false && 
      new Date(b.until) > new Date() &&
      (b.game === gameId || b.game === 'All Games')
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
    bans,
    setBans,
    rules,
    setRules,
    loading,
    currentDate,
    setCurrentDate,
    selectedGame,
    setSelectedGame,
    activeTab,
    setActiveTab,
    currentUser,
    addBooking,
    removeBooking,
    loadBookings,
    loadBans,
    loadRules,
    getGameStats,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};