// src/hooks/useBookings.js
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { DAYS, SLOTS } from '../utils/constants';

export const useBookings = () => {
  const [bookings, setBookings] = useState({});
  const [loading, setLoading] = useState(true);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) throw error;
      const grouped = {};
      DAYS.forEach(d => { grouped[d] = {}; SLOTS.forEach(s => { grouped[d][s.id] = []; }); });
      data?.forEach(b => {
        if (grouped[b.day] && grouped[b.day][b.slot_id] !== undefined) {
          grouped[b.day][b.slot_id].push(b.player_name);
        }
      });
      setBookings(grouped);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const addBooking = async (day, slotId, playerName) => {
    try {
      const { error } = await supabase.from('bookings').insert([{ day, slot_id: slotId, player_name: playerName }]);
      if (error) throw error;
      await loadBookings();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const removeBooking = async (day, slotId, playerName) => {
    try {
      const { error } = await supabase.from('bookings').delete().match({ day, slot_id: slotId, player_name: playerName });
      if (error) throw error;
      await loadBookings();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  useEffect(() => { loadBookings(); }, []);

  return { bookings, loading, addBooking, removeBooking, loadBookings };
};