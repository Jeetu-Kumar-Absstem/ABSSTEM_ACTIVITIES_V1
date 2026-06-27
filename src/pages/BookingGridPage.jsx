// src/pages/BookingGridPage.jsx
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { SLOTS, DAYS, MAX_PER_SLOT } from '../utils/constants';
import { formatDate, isBanned } from '../utils/helpers';
import StatsRow from '../components/common/StatsRow';
import GameSelector from '../components/booking/GameSelector';
import DateNavigator from '../components/booking/DateNavigator';
import CapacitySummary from '../components/booking/CapacitySummary';
import SlotCell from '../components/booking/SlotCell';
import BookSlotModal from '../components/modals/BookSlotModal';

const BookingGridPage = () => {
  const { bookings, currentDate, selectedGame, addBooking, removeBooking, bans, currentUser, games } = useApp();
  const { showToast } = useToast();
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const handleBookSlot = (day, slotId) => {
    setSelectedDay(day);
    setSelectedSlotId(slotId);
    setShowBookModal(true);
  };

  const handleAddBooking = async (playerName) => {
    if (isBanned(playerName, selectedGame, bans)) {
      showToast(`${playerName} is banned from ${selectedGame}!`, 'error');
      return false;
    }
    
    // Check if user already has a booking for today
    const today = new Date();
    const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
    const userBookings = bookings[todayName] ? 
      Object.values(bookings[todayName]).flat().filter(b => b.user_id === currentUser?.id) : [];
    
    if (userBookings.length > 0 && selectedDay === todayName) {
      showToast('You already have a booking for today!', 'error');
      return false;
    }

    const success = await addBooking(selectedDay, selectedSlotId, playerName);
    if (success) {
      showToast(`${playerName} booked for ${selectedDay} Slot ${selectedSlotId}`);
    } else {
      showToast('Booking failed!', 'error');
    }
    return success;
  };

  const handleRemoveBooking = (day, slotId, playerName, userId) => {
    // Only allow removal if current user is the owner
    if (currentUser?.id !== userId) {
      showToast('You can only remove your own bookings!', 'error');
      return;
    }
    removeBooking(day, slotId, playerName, userId);
    showToast(`${playerName} removed from ${day} Slot ${slotId}`, 'warning');
  };

  const getSlotPlayers = (day, slotId) => {
    return bookings[day]?.[slotId] || [];
  };

  // Fixed: Use the games from useApp
  const getMaxPlayers = () => {
    const game = games.find(g => g.id === selectedGame);
    return game?.maxPlayers || MAX_PER_SLOT;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1e1e2f' }}>Activity Planner</h1>
        <div style={{ fontSize: '0.7rem', color: '#8888aa' }}>
          Home › HR › Activities
        </div>
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
              {DAYS.map(day => (
                <tr key={day} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1a3c6e', position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>{day}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CapacitySummary bookings={bookings} />

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