// src/pages/BookingGridPage.jsx
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { SLOTS, DAYS } from '../utils/constants';
import { isBanned } from '../utils/helpers';
import StatsRow from '../components/common/StatsRow';
import GameSelector from '../components/booking/GameSelector';
import DateNavigator from '../components/booking/DateNavigator';
import CapacitySummary from '../components/booking/CapacitySummary';
import SlotCell from '../components/booking/SlotCell';
import BookSlotModal from '../components/modals/BookSlotModal';

const BookingGridPage = () => {
  const { 
    bookings, 
    currentDate, 
    selectedGame, 
    addBooking, 
    removeBooking, 
    bans, 
    currentUser, 
    games,
    loadBookings 
  } = useApp();
  const { showToast } = useToast();
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  // Refresh bookings when component mounts
  useEffect(() => {
    loadBookings();
  }, []);

  const handleBookSlot = (day, slotId) => {
    const gameRecord = games.find(game => String(game.id) === String(selectedGame));
    if (gameRecord && gameRecord.active === false) {
      showToast('Currently this is Unavailable', 'error');
      return;
    }
    setSelectedDay(day);
    setSelectedSlotId(slotId);
    setShowBookModal(true);
  };

  const handleAddBooking = async (playerName) => {
    const currentEmpId = currentUser?.user_metadata?.emp_id || '';
    const gameRecord = games.find(game => String(game.id) === String(selectedGame));
    if (isBanned({ name: playerName, employee_id: currentEmpId }, gameRecord?.name || selectedGame, bans)) {
      showToast(`${playerName} is banned from ${selectedGame}!`, 'error');
      return false;
    }
    
    if (gameRecord && gameRecord.active === false) {
      showToast('Currently this is Unavailable', 'error');
      return false;
    }

    // Check if user already has a booking for this game on this day
    const dayBookings = bookings[selectedDay] || {};
    const allDayBookings = Object.values(dayBookings).flat();
    const userHasBooking = allDayBookings.some(b => b.user_id === currentUser?.id && (String(b.game) === String(selectedGame) || b.game === gameRecord?.name));
    
    if (userHasBooking) {
      showToast('You already have a booking for this game on this day!', 'error');
      return false;
    }

    const result = await addBooking(selectedDay, selectedSlotId, playerName);
    if (result.success) {
      // Reload bookings to refresh all components
      await loadBookings();
      showToast(`${playerName} booked for ${selectedDay} Slot ${selectedSlotId}`);
      return true;
    } else {
      showToast(result.error || 'Booking failed!', 'error');
      return false;
    }
  };

  const handleRemoveBooking = async (day, slotId, playerName, userId) => {
    // Only allow removal if current user is the owner
    if (currentUser?.id !== userId) {
      showToast('You can only remove your own bookings!', 'error');
      return;
    }
    const result = await removeBooking(day, slotId, playerName, userId);
    if (result.success) {
      // Reload bookings to refresh all components
      await loadBookings();
      showToast(`${playerName} removed from ${day} Slot ${slotId}`, 'warning');
    } else {
      showToast(result.error || 'Failed to remove booking!', 'error');
    }
  };

  const getSlotPlayers = (day, slotId) => {
    return bookings[day]?.[slotId] || [];
  };

  const getMaxPlayers = () => {
    const game = games.find(g => String(g.id) === String(selectedGame));
    return game?.maxPlayers || 4;
  };

  // Get current day name
  const getCurrentDay = () => {
    const dayIndex = currentDate.getDay();
    if (dayIndex === 0 || dayIndex === 6) return 'Monday';
    return DAYS[dayIndex - 1] || 'Monday';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1e1e2f' }}>Activity Planner</h1>
       
      </div>

      <StatsRow />

      <GameSelector />

      <DateNavigator />

      <div className="clay-card" style={{ overflow: 'hidden', padding: 0, borderRadius: '28px' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
            <thead>
              <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#1a3c6e', position: 'sticky', left: 0, background: 'white', zIndex: 2, minWidth: '90px' }}>Day / Time</th>
                {SLOTS.map(s => (
                  <th key={s.id} style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 500, fontSize: '0.6rem', color: '#444466', minWidth: '100px' }}>
                    {s.label}
                    <span style={{ display: 'block', fontSize: '0.5rem', opacity: 0.6 }}>{s.time}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map(day => {
                const isToday = day === getCurrentDay();
                return (
                  <tr key={day} style={{ 
                    borderBottom: '1px solid rgba(200,210,230,0.2)',
                    background: isToday ? 'rgba(26,60,110,0.03)' : 'transparent'
                  }}>
                    <td style={{ 
                      padding: '8px 12px', 
                      fontWeight: 600, 
                      color: isToday ? '#1a3c6e' : '#1a3c6e',
                      position: 'sticky', 
                      left: 0, 
                      background: isToday ? 'rgba(26,60,110,0.03)' : 'white',
                      zIndex: 1 
                    }}>
                      {day} {isToday && '📍'}
                    </td>
                    {SLOTS.map(slot => {
                      const players = getSlotPlayers(day, slot.id);
                      const maxPlayers = getMaxPlayers();
                      return (
                        <td key={slot.id} style={{ padding: '4px 4px', verticalAlign: 'middle', textAlign: 'center', minWidth: '100px' }}>
                          <SlotCell
                            day={day}
                            slotId={slot.id}
                            players={players}
                            maxPlayers={maxPlayers}
                            onBook={handleBookSlot}
                            onRemove={handleRemoveBooking}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CapacitySummary />

      <BookSlotModal
        isOpen={showBookModal}
        onClose={() => setShowBookModal(false)}
        onConfirm={handleAddBooking}
        day={selectedDay}
        slotId={selectedSlotId}
        currentBookings={selectedDay && selectedSlotId ? bookings[selectedDay]?.[selectedSlotId] || [] : []}
        maxPlayers={getMaxPlayers()}
        game={selectedGame}
      />
    </div>
  );
};

export default BookingGridPage;
