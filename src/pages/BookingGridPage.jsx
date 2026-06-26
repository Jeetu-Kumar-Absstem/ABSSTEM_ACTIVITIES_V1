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
import BookSlotModal from '../components/modals/BookSlotModal';

const BookingGridPage = () => {
  const { bookings, currentDate, selectedGame, addBooking, removeBooking, bans } = useApp();
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
    const success = await addBooking(selectedDay, selectedSlotId, playerName);
    if (success) {
      showToast(`${playerName} booked for ${selectedDay} Slot ${selectedSlotId}`);
    } else {
      showToast('Booking failed!', 'error');
    }
    return success;
  };

  const handleRemoveBooking = (day, slotId, playerName) => {
    removeBooking(day, slotId, playerName);
    showToast(`${playerName} removed from ${day} Slot ${slotId}`, 'warning');
  };

  const getGameName = () => {
    const game = games.find(g => g.id === selectedGame);
    return game ? game.name : 'Carrom';
  };

  // Calculate stats
  const today = new Date();
  const todayName = DAYS[today.getDay() === 0 ? 6 : today.getDay() - 1];
  let todayBookings = 0;
  let availableSlots = 0;
  let fullSlots = 0;

  if (bookings[todayName]) {
    SLOTS.forEach(slot => {
      const count = bookings[todayName]?.[slot.id]?.length || 0;
      todayBookings += count;
      if (count >= MAX_PER_SLOT) fullSlots++;
      else availableSlots++;
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#1e1e2f' }}>Activity Planner</h1>
        <div style={{ fontSize: '0.7rem', color: '#8888aa' }}>
          Home › HR › Activities
        </div>
      </div>

      <StatsRow todayBookings={todayBookings} availableSlots={availableSlots} fullSlots={fullSlots} bans={bans} />

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
                    const players = bookings[day]?.[slot.id] || [];
                    const isFull = players.length >= MAX_PER_SLOT;
                    return (
                      <td key={slot.id} style={{ padding: '4px 4px', verticalAlign: 'middle', textAlign: 'center', minWidth: '100px' }}>
                        <div
                          style={{
                            background: isFull ? 'rgba(249,168,37,0.1)' : 'rgba(255,255,255,0.3)',
                            borderRadius: '16px',
                            padding: '4px 6px',
                            minHeight: '32px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '2px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            cursor: isFull ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => !isFull && handleBookSlot(day, slot.id)}
                        >
                          {players.map(p => {
                            const banned = isBanned(p, selectedGame, bans);
                            return (
                              <span
                                key={p}
                                style={{
                                  background: banned ? 'rgba(229,57,53,0.15)' : 'rgba(26,60,110,0.08)',
                                  padding: '2px 10px',
                                  borderRadius: '20px',
                                  fontSize: '0.6rem',
                                  fontWeight: 500,
                                  color: banned ? '#c62828' : '#1a3c6e',
                                  textDecoration: banned ? 'line-through' : 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!banned) handleRemoveBooking(day, slot.id, p);
                                }}
                              >
                                {p} {banned ? '🚫' : <span style={{ opacity: 0.5, fontSize: '0.5rem' }}>×</span>}
                              </span>
                            );
                          })}
                          {!isFull && players.length < MAX_PER_SLOT && (
                            <span style={{ fontSize: '0.6rem', color: '#00897b', opacity: 0.5 }}>+</span>
                          )}
                          {isFull && <span style={{ fontSize: '0.5rem', color: '#f9a825' }}>FULL</span>}
                        </div>
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
        maxPlayers={MAX_PER_SLOT}
        game={selectedGame}
      />
    </div>
  );
};

export default BookingGridPage;