// src/components/booking/MobileBookingList.jsx
import React, { useState } from 'react';
import { SLOTS, DAYS } from '../../utils/constants';
import { getDayName } from '../../utils/helpers';
import SlotCell from './SlotCell';

const MobileBookingList = ({
  weekBookings,
  selectedGame,
  getMaxPlayers,
  getCurrentDay,
  currentDate,
  handleBookSlot,
  handleRemoveBooking,
}) => {
  const currentDayName = getCurrentDay();
  const [expandedDays, setExpandedDays] = useState(() => new Set([currentDayName]));

  const toggleDay = (day) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const expandToday = () => {
    setExpandedDays(new Set([currentDayName]));
    requestAnimationFrame(() => {
      const el = document.getElementById(`mobile-day-${currentDayName}`);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const isTodayExpanded = expandedDays.has(currentDayName);
  const maxPlayers = getMaxPlayers();

  return (
    <div className="mobile-booking-list">
      {/* Jump-to-today quick action (only if today is collapsed) */}
      {!isTodayExpanded && (
        <button
          type="button"
          onClick={expandToday}
          className="clay-btn mobile-jump-today"
          aria-label="Jump to today"
        >
          📍 Jump to today ({currentDayName})
        </button>
      )}

      {DAYS.map((day) => {
        const isToday = day === currentDayName;
        const dayBookings = weekBookings[day] || {};
        const isOpen = expandedDays.has(day);
        const hasAny = SLOTS.some((slot) => (dayBookings[slot.id] || []).length > 0);
        const bookedCount = SLOTS.reduce(
          (acc, s) => acc + (dayBookings[s.id] || []).length, 0
        );

        return (
          <section
            key={day}
            id={`mobile-day-${day}`}
            className="clay-card mobile-day-card"
              style={{
                padding: isOpen ? '14px' : '12px 14px',
                borderRadius: '24px',
                background: isToday
                  ? 'linear-gradient(180deg, rgba(var(--accent-rgb),0.14), var(--bg-surface-strong))'
                  : 'var(--bg-surface-strong)',
                border: isToday ? '1.5px solid rgba(var(--accent-rgb),0.45)' : '1px solid var(--border)',
              }}
          >
            <button
              type="button"
              onClick={() => toggleDay(day)}
              aria-expanded={isOpen}
              aria-controls={`mobile-day-body-${day}`}
              className="mobile-day-header"
              style={{
                all: 'unset',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                cursor: 'pointer',
                minHeight: '44px',
                gap: '8px',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  aria-hidden
                  className="mobile-day-chevron"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px', height: '24px',
                    borderRadius: '8px',
                    background: 'rgba(var(--accent-rgb),0.12)',
                    color: 'var(--text)',
                    fontSize: '0.7rem',
                    transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >▶</span>
                <div>
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    color: 'var(--text)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    {day} {isToday && '📍'}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>
                    {hasAny ? `${bookedCount} booking${bookedCount === 1 ? '' : 's'}` : 'No bookings yet'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {isToday && (
                  <span className="clay-badge clay-badge-amber" style={{ fontSize: '0.55rem' }}>
                    Today
                  </span>
                )}
                {hasAny && !isToday && (
                  <span className="clay-badge clay-badge-navy" style={{ fontSize: '0.55rem' }}>
                    {bookedCount} booked
                  </span>
                )}
              </div>
            </button>

            {isOpen && (
              <div
                id={`mobile-day-body-${day}`}
                className="mobile-day-slots"
                style={{ marginTop: '10px' }}
              >
                {SLOTS.map((slot, idx) => {
                  const players = weekBookings[day]?.[slot.id] || [];
                  const isLast = idx === SLOTS.length - 1;
                  const status =
                    players.length >= maxPlayers ? 'full' :
                    players.length > 0 ? 'booked' : 'available';

                  return (
                    <div
                      key={`${day}-${slot.id}`}
                      className="mobile-slot-row"
                      style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'stretch',
                        padding: '8px 8px 8px 0',
                        marginBottom: isLast ? 0 : '6px',
                        position: 'relative',
                      }}
                    >
                      {/* Timeline rail */}
                      <div
                        aria-hidden
                        className="mobile-timeline-rail"
                        style={{
                          flexShrink: 0,
                          width: '64px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          position: 'relative',
                        }}
                      >
                        {/* Status dot */}
                        <span
                          style={{
                            width: '12px', height: '12px',
                            borderRadius: '50%',
                            background:
                              status === 'full' ? '#f9a825' :
                              status === 'booked' ? 'var(--text)' : 'var(--text-strong)',
                            border: '2px solid ' + (
                              status === 'full' ? '#f9a825' :
                              status === 'booked' ? 'var(--text)' : 'var(--muted)'
                            ),
                            boxShadow: '0 0 0 3px rgba(26,60,110,0.08)',
                            zIndex: 1,
                            marginTop: '12px',
                          }}
                        />
                        {/* Connector line */}
                        {!isLast && (
                          <span
                            style={{
                              flex: 1, width: '2px',
                              background: 'rgba(26,60,110,0.18)',
                              marginTop: '2px',
                              minHeight: '24px',
                            }}
                          />
                        )}
                      </div>

                      {/* Time + slot body */}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: '8px',
                        }}>
                          <div style={{
                            fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)',
                            letterSpacing: '0.02em',
                          }}>
                            {slot.label} · {slot.time}
                          </div>
                          <div style={{
                            fontSize: '0.6rem', fontWeight: 600,
                            color:
                              status === 'full' ? '#e65100' :
                              status === 'booked' ? 'var(--text)' : 'var(--success)',
                          }}>
                            {status === 'full' ? 'Full' : status === 'booked' ? `${players.length}/${maxPlayers}` : 'Available'}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '6px',
                            borderRadius: '14px',
                            background: 'rgba(26,60,110,0.03)',
                            border: '1px solid rgba(173,207,255,0.4)',
                          }}
                        >
                          <SlotCell
                            day={day}
                            slotId={slot.id}
                            players={players}
                            maxPlayers={maxPlayers}
                            onBook={handleBookSlot}
                            onRemove={handleRemoveBooking}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default MobileBookingList;
