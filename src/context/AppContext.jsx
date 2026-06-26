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
          grouped[day][b.slot_id].push(b.player_name);
        }
      });
      setBookings(grouped);
    } catch (err) {
      console.error('Error loading bookings:', err);
      // Fallback to mock data
      setBookings({
        Monday: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: ['Abhishek Chaubey', 'Arfa Zaidi', 'Jeetu', 'Sarwan'], 9: ['Sachin Chauhan', 'Ritika Yadav', 'Shalini', 'Mahander'], 10: ['Manoj', 'Ritu', 'NANDANI'], 11: ['Yuvraj Rana', 'Vinod Kumar', 'Sachin', 'Aman'], 12: ['Bimlesh', 'Amit Ranga'] },
        Tuesday: { 1: [], 2: [], 3: [], 4: ['Pradeep Sati'], 5: [], 6: [], 7: ['Priya Mehta', 'Deepak Yadav'], 8: [], 9: [], 10: [], 11: [], 12: [] },
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
      // Mock bans
      setBans([
        { id: 1, employee: 'Anil Rawat', game: 'Carrom', from: '2026-04-25', until: '2026-07-25', reason: '3 violations — mobile phone use during game', active: true },
        { id: 2, employee: 'Rohan Sharma', game: 'All Games', from: '2026-04-01', until: '2026-07-01', reason: 'Did not return carrom coins', active: true },
      ]);
    }
  };

  const loadRules = async () => {
    try {
      const { data, error } = await supabase.from('rules').select('*');
      if (error) throw error;
      setRules(data || []);
    } catch (err) {
      // Import from constants
      import('../utils/constants').then(({ RULES_DATA }) => setRules(RULES_DATA));
    }
  };

  useEffect(() => {
    loadBookings();
    loadBans();
    loadRules();
  }, []);

  const addBooking = async (day, slotId, playerName) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .insert([{ day, slot_id: slotId, player_name: playerName, booked_at: new Date().toISOString() }]);
      if (error) throw error;
      // Optimistic update
      const newBookings = { ...bookings };
      if (!newBookings[day]) newBookings[day] = {};
      if (!newBookings[day][slotId]) newBookings[day][slotId] = [];
      newBookings[day][slotId].push(playerName);
      setBookings(newBookings);
      return true;
    } catch (err) {
      console.error('Error booking slot:', err);
      return false;
    }
  };

  const removeBooking = async (day, slotId, playerName) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .match({ day, slot_id: slotId, player_name: playerName });
      if (error) throw error;
      const newBookings = { ...bookings };
      if (newBookings[day] && newBookings[day][slotId]) {
        newBookings[day][slotId] = newBookings[day][slotId].filter(n => n !== playerName);
      }
      setBookings(newBookings);
      return true;
    } catch (err) {
      console.error('Error removing booking:', err);
      return false;
    }
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
    addBooking,
    removeBooking,
    loadBookings,
    loadBans,
    loadRules,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};