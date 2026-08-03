// src/pages/DashboardPage.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES, SLOTS } from '../utils/constants';
import {
  buildEmployeeLeaderboard,
  filterBookingsToWeek,
  formatDate,
  getDayName,
  getWeekRange,
} from '../utils/helpers';
import useViewport from '../hooks/useViewport';
import usePressState from '../hooks/usePressState';
import MobileTable from '../components/common/MobileTable';
import CalendarIcon from '../components/common/CalendarIcon';

const QuickActionItem = ({ icon, label, color, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '16px 8px',
      borderRadius: '20px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      boxShadow: 'var(--surface-shadow-soft)',
      flex: 1,
      minWidth: 0,
    }}
  >
    <div style={{
      width: '44px',
      height: '44px',
      borderRadius: '12px',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.6rem',
    }}>
      {icon}
    </div>
    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)', textAlign: 'center', fontFamily: "'Lufga', sans-serif" }}>
      {label}
    </span>
  </button>
);

const OverviewCard = ({ icon, label, value, caption, borderColor, iconBg }) => (
  <div style={{
    background: 'var(--bg-surface)',
    borderRadius: '24px',
    padding: '16px',
    border: '1px solid var(--border)',
    borderLeft: `5px solid ${borderColor}`,
    boxShadow: 'var(--surface-shadow-soft)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: iconBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.1rem'
      }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Lufga', sans-serif" }}>
        {label}
      </div>
    </div>
    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500 }}>
      {caption}
    </div>
  </div>
);

// Color palette for leaderboard ranks
const getRankColor = (rank) => {
  const colors = {
    1: { bg: '#FFD700', text: '#8B6914', glow: 'rgba(255,215,0,0.3)' },
    2: { bg: '#C0C0C0', text: '#6B6B6B', glow: 'rgba(192,192,192,0.3)' },
    3: { bg: '#CD7F32', text: '#6B3A2A', glow: 'rgba(205,127,50,0.3)' },
  };
  return colors[rank] || { bg: '#e8edf5', text: '#444466', glow: 'rgba(200,210,230,0.2)' };
};

const getPointsColor = (points) => {
  if (points >= 10) return '#1b5e20';
  if (points >= 5) return '#f9a825';
  return '#c62828';
};

const getMedal = (rank) => {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return medals[rank] || `#${rank}`;
};

const DashboardPage = () => {
  const {
    selectedGame,
    setSelectedGame,
    currentDate,
    bookings,
    employees,
    matchResults,
    bans,
    games,
    events,
    getUpcomingEvents,
    isAdmin,
    tournamentMatches,
    tournaments,
    currentUser,
    setActiveTab,
  } = useApp();

  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('next');
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);
  const dropdownRef = useRef(null);
  const { isMobile } = useViewport();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowGameDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedGameRecord = games.find((game) => String(game.id) === String(selectedGame) || String(game.name).toLowerCase() === String(selectedGame).toLowerCase())
    || GAMES.find((game) => String(game.id) === String(selectedGame))
    || GAMES[0];

  const weekBookings = useMemo(() => filterBookingsToWeek(bookings, currentDate), [bookings, currentDate]);

  const gameFilteredMatchResults = useMemo(() => {
    const gameName = selectedGameRecord?.name?.toLowerCase();
    const gameId = String(selectedGameRecord?.id || '');
    const filtered = {};
    Object.entries(matchResults || {}).forEach(([key, rows]) => {
      if (key.toLowerCase() === gameName || key === gameId) {
        filtered[key] = rows;
      }
    });
    return filtered;
  }, [matchResults, selectedGameRecord]);

  const leaderboard = useMemo(
    () => buildEmployeeLeaderboard(employees, gameFilteredMatchResults),
    [employees, gameFilteredMatchResults]
  );

  const currentDayName = getDayName(currentDate);
  const { start, end } = getWeekRange(currentDate);
  const weekLabel = `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  const dayBookings = weekBookings[currentDayName] || {};
  
  const selectedGameBookings = SLOTS.flatMap((slot) =>
    (dayBookings[slot.id] || []).filter((booking) =>
      String(booking.game) === String(selectedGameRecord.id) ||
      booking.game === selectedGameRecord.name ||
      String(booking.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase()
    )
  );

  const maxPerSlot = selectedGameRecord?.maxPlayers || 4;
  let availableSlotsCount = 0;
  let totalSlots = SLOTS.length;
  
  SLOTS.forEach((slot) => {
    const players = (dayBookings[slot.id] || []).filter((booking) =>
      String(booking.game) === String(selectedGameRecord.id) ||
      booking.game === selectedGameRecord.name ||
      String(booking.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase()
    );
    if (players.length < maxPerSlot) {
      availableSlotsCount++;
    }
  });

  const activeBanCount = bans.filter(
    (ban) =>
      ban.active !== false &&
      new Date(ban.until_date) > new Date() &&
      (String(ban.game) === String(selectedGameRecord.id) || ban.game === selectedGameRecord.name || String(ban.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase() || ban.game === 'All Games')
  ).length;

  const upcomingEvents = useMemo(() => getUpcomingEvents(), [getUpcomingEvents, events]);

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const topLeaderboard = leaderboard.slice(0, 5);

  const getCurrentEmpId = () => {
    return String(
      currentUser?.user_metadata?.emp_id ||
      currentUser?.user_metadata?.employee_code ||
      currentUser?.user_metadata?.empId ||
      ''
    ).trim().toUpperCase();
  };

  const currentEmpId = getCurrentEmpId();

  // Helper function to get user display name
  const getUserDisplayName = () => {
    // Try to get from user metadata first
    if (currentUser?.user_metadata?.name) {
      return currentUser.user_metadata.name;
    }
    
    // Try to find in employees list by email or employee code
    const userEmail = currentUser?.email;
    if (userEmail) {
      const emp = employees.find(e => 
        e.email?.toLowerCase() === userEmail.toLowerCase() ||
        e.employee_code?.toLowerCase() === userEmail.split('@')[0].toLowerCase()
      );
      if (emp?.name) return emp.name;
    }
    
    // Fallback to email username
    return currentUser?.email?.split('@')[0] || 'User';
  };

  // --- UPCOMING MATCHES - DEFINED HERE ---
  const upcomingMatches = useMemo(() => {
    const now = new Date();
    const allMatches = [];
    const userEmpId = currentEmpId;
    
    // 1. Get tournament matches
    tournamentMatches.forEach(match => {
      const status = String(match.status || '').toLowerCase();
      if (['scheduled', 'in_progress'].includes(status) && match.scheduled_at) {
        const matchDate = new Date(match.scheduled_at);
        if (matchDate >= now) {
          const tournament = tournaments.find(t => t.id === match.tournament_id);
          const getEmployeeName = (empId) => {
            if (!empId) return 'TBD';
            const emp = employees.find(e => e.employee_code?.toUpperCase() === String(empId).toUpperCase());
            return emp?.name || empId;
          };
          
          const isUserInMatch = 
            String(match.player_a_employee_id || '').toUpperCase() === userEmpId ||
            String(match.player_b_employee_id || '').toUpperCase() === userEmpId;
          
          allMatches.push({
            id: match.id,
            type: 'tournament',
            title: `${getEmployeeName(match.player_a_employee_id)} vs ${getEmployeeName(match.player_b_employee_id)}`,
            tournamentName: tournament?.name || 'Unknown Tournament',
            game: tournament?.game || 'Unknown Game',
            scheduled_at: match.scheduled_at,
            playerAName: getEmployeeName(match.player_a_employee_id),
            playerBName: getEmployeeName(match.player_b_employee_id),
            status: status,
            isUserInMatch: isUserInMatch,
          });
        }
      }
    });

    // 2. Get slot bookings for today
    const weekBookingsData = filterBookingsToWeek(bookings, currentDate);
    const todayDayName = getDayName(currentDate);
    const todayBookingsData = weekBookingsData[todayDayName] || {};
    
    Object.keys(todayBookingsData).forEach(slotId => {
      const players = todayBookingsData[slotId] || [];
      if (!players || players.length === 0) return;
      
      let slot = SLOTS.find(s => String(s.id) === String(slotId));
      if (!slot) {
        const slotNumber = parseInt(slotId);
        if (!isNaN(slotNumber)) {
          slot = SLOTS.find(s => s.id === slotNumber || String(s.id) === String(slotNumber));
        }
      }
      
      if (slot) {
        players.forEach(booking => {
          const isUserBooking = String(booking.employee_id || '').toUpperCase() === userEmpId;
          
          const [startTime, endTime] = slot.time.split(' - ');
          const [startHour, startMin] = startTime.split(':');
          
          const matchDate = new Date(currentDate);
          matchDate.setHours(parseInt(startHour), parseInt(startMin), 0);
          
          const gameName = String(booking.game || '');
          const gameRecord = games.find(g => String(g.id) === gameName || g.name === gameName);
          
          let playerName = booking.name;
          if (booking.employee_id) {
            const emp = employees.find(e => e.employee_code?.toUpperCase() === String(booking.employee_id).toUpperCase());
            if (emp) {
              playerName = emp.name;
            }
          }
          
          allMatches.push({
            id: `${slotId}-${booking.user_id || booking.booking_id || Date.now()}`,
            type: 'slot',
            title: `${playerName} - ${slot.label}`,
            tournamentName: 'Slot Booking',
            game: gameRecord?.name || gameName || 'Unknown Game',
            scheduled_at: matchDate.toISOString(),
            playerAName: playerName,
            playerBName: 'Available',
            status: 'scheduled',
            slotLabel: slot.label,
            slotTime: slot.time,
            isUserBooking: isUserBooking,
            gameIcon: gameRecord?.icon || '🎯',
            bookingId: booking.booking_id,
            employeeId: booking.employee_id,
          });
        });
      }
    });
    
    allMatches.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    
    const userMatches = allMatches.filter(m => m.isUserInMatch || m.isUserBooking);
    const otherMatches = allMatches.filter(m => !m.isUserInMatch && !m.isUserBooking);
    
    return [...userMatches, ...otherMatches].slice(0, 10);
  }, [tournamentMatches, tournaments, employees, bookings, currentDate, games, currentEmpId]);

  // --- NAVIGATE MATCH - DEFINED HERE ---
  const navigateMatch = (direction) => {
    if (isFlipping || upcomingMatches.length === 0) return;
    
    setFlipDirection(direction);
    setIsFlipping(true);
    
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentMatchIndex((prev) => (prev + 1) % upcomingMatches.length);
      } else {
        setCurrentMatchIndex((prev) => (prev - 1 + upcomingMatches.length) % upcomingMatches.length);
      }
      setIsFlipping(false);
    }, 300);
  };

  // --- AUTO-FLIP useEffect - MUST BE AFTER upcomingMatches AND navigateMatch ---
  useEffect(() => {
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }

    if (upcomingMatches.length > 1 && isAutoPlaying && !isFlipping) {
      autoPlayRef.current = setInterval(() => {
        navigateMatch('next');
      }, 3000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [upcomingMatches.length, isAutoPlaying, isFlipping, navigateMatch]);

  // Pause auto-play when user hovers over the carousel
  const handleMouseEnter = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearInterval(autoPlayRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsAutoPlaying(true);
  };

  // Format time
  const formatMatchTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMatchDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if a match is today
  const isToday = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Get current match
  const currentMatch = upcomingMatches.length > 0 ? upcomingMatches[currentMatchIndex] : null;

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '16px 8px', background: 'var(--bg)', minHeight: '100%' }}>
        {/* Top Header - Greeting & Game Selector */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>
                Welcome back, <span style={{ color: 'var(--accent)' }}>{getUserDisplayName()}</span>
                <span style={{ fontSize: '1.4rem' }}>👋</span>
              </div>
              
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--muted)', fontSize: '0.85rem', marginTop: '4px' }}>
              {/* <CalendarIcon size="16px" date={currentDate} /> */}
              <span>{formatDate(currentDate)}</span>
            </div>
          </div>

          {/* Game Selector Pill */}
          <div style={{ position: 'relative', flexShrink: 0 }} ref={dropdownRef}>
            <button
              onClick={() => setShowGameDropdown(!showGameDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text)',
                boxShadow: 'var(--surface-shadow-soft)',
                fontFamily: "'Lufga', sans-serif",
              }}
            >
              <span>{selectedGameRecord?.icon || '🎯'}</span>
              <span>{selectedGameRecord?.name}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>▼</span>
            </button>
            {showGameDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: 'var(--bg-surface-strong)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                boxShadow: 'var(--surface-shadow)',
                zIndex: 2000,
                minWidth: '140px',
                overflow: 'hidden'
              }}>
                {games.map(game => (
                  <div
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(String(game.id));
                      setShowGameDropdown(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border)',
                      background: String(selectedGame) === String(game.id) ? 'var(--accent-soft)' : 'transparent',
                      color: 'var(--text)',
                    }}
                  >
                    {game.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* Upcoming Match Card */}
        <section
          style={{
            padding: '20px',
            borderRadius: '24px',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--surface-shadow-soft)',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('booking')}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--accent-soft)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            color: 'var(--accent)'
          }}>
            <CalendarIcon size="32px" date={currentDate} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
              Upcoming Match
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '2px', fontFamily: "'Lufga', sans-serif" }}>
              {upcomingMatches.length > 0 ? currentMatch.title : 'No matches today'}
            </div>
          </div>
          <div style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>›</div>
        </section>

        {/* Quick Actions Grid */}
        <section>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>
            Quick Actions
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <QuickActionItem icon={<CalendarIcon size="28px" date={currentDate} />} label="Book Court" color="rgba(59, 130, 246, 0.1)" onClick={() => setActiveTab('booking')} />
            <QuickActionItem icon="📋" label="My Bookings" color="rgba(16, 185, 129, 0.1)" onClick={() => setActiveTab('booking')} />
            <QuickActionItem icon="🏆" label="Tournaments" color="rgba(245, 158, 11, 0.1)" onClick={() => setActiveTab('tournaments')} />
            <QuickActionItem icon="🎉" label="Events" color="rgba(236, 72, 153, 0.1)" onClick={() => setActiveTab('eventsCalendar')} />
          </div>
        </section>

        {/* Overview Section - 2x2 Grid */}
        <section>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>
            Overview
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <OverviewCard
              icon={<CalendarIcon size="24px" date={currentDate} />}
              label="TODAY'S BOOKINGS"
              value={selectedGameBookings.length}
              caption={`${selectedGameRecord.name} bookings`}
              borderColor="#3b82f6"
              iconBg="rgba(59, 130, 246, 0.1)"
            />
            <OverviewCard
              icon="👥"
              label="AVAILABLE SLOTS"
              value={availableSlotsCount}
              caption={`${availableSlotsCount} slots available`}
              borderColor="#10b981"
              iconBg="rgba(16, 185, 129, 0.1)"
            />
            <OverviewCard
              icon="🛡️"
              label="ACTIVE BANS"
              value={activeBanCount}
              caption="No active bans"
              borderColor="#ef4444"
              iconBg="rgba(239, 68, 68, 0.1)"
            />
            <OverviewCard
              icon="🤴"
              label="GAME MASTERS"
              value="2"
              caption="Active masters"
              borderColor="#8b5cf6"
              iconBg="rgba(139, 92, 246, 0.1)"
            />
          </div>
        </section>

        {/* Today's Bookings Section */}
        <section style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--surface-shadow-soft)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>
            Today's bookings
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {SLOTS.map((slot) => {
              const players = (dayBookings[slot.id] || []).filter((booking) =>
                String(booking.game) === String(selectedGameRecord.id) ||
                booking.game === selectedGameRecord.name ||
                String(booking.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase()
              );
              const isFull = players.length >= maxPerSlot;
              const hasBooking = players.length > 0;

              return (
                <div
                  key={slot.id}
                  style={{
                    padding: '12px',
                    borderRadius: '16px',
                    background: isFull ? 'var(--danger-soft)' : hasBooking ? 'var(--accent-soft)' : 'var(--bg-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-strong)' }}>{slot.label}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>{slot.time}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, marginTop: '4px', color: isFull ? 'var(--danger)' : 'var(--accent)' }}>
                    {players.length}/{maxPerSlot}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Leaderboard Section */}
        <section style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: '24px', border: '1px solid var(--border)', boxShadow: 'var(--surface-shadow-soft)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>
            Leaderboard
          </h3>
          <MobileTable
            rows={topLeaderboard}
            rowKey={(row) => `${row.employee_id || row.name}-${row.rank}`}
            columns={[
              { key: 'rank', label: 'Rank', render: (row) => getMedal(row.rank) },
              { key: 'name', label: 'Employee' },
              { key: 'points', label: 'Points', align: 'center' }
            ]}
          />
        </section>

        <div style={{ height: '20px' }} />
      </div>
    );
  } else {
    // Desktop View
    return (
    <div style={{ display: 'grid', gap: '18px' }}>
      {/* Header Section - Clean with only background color */}
      <div
        style={{
          padding: '24px 32px',
          borderRadius: '24px',
          background: 'var(--bg-surface-strong)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--surface-shadow-soft)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
      {/* Welcome message */}
<div
  style={{
    fontSize: '2rem',
    color: 'var(--text-strong)',

    fontWeight: 400,
    marginBottom: '2px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: '1.2',
  }}
>
  <span>Welcome back,</span>

  <span
    style={{
      color: 'var(--accent)',

      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}
  >
    {getUserDisplayName()}
    <span style={{ fontSize: '1.75rem' }}>👋</span>
  </span>
</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>
              {formatDate(currentDate)} • Week: {weekLabel}
            </div>
          </div>

          {/* Up Next For You - Matches Carousel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--bg-surface)',
              borderRadius: '16px',
              padding: '12px 16px',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border)',
              minWidth: isMobile ? 0 : '260px',
              maxWidth: isMobile ? '100%' : '360px',
              position: 'relative',
              width: isMobile ? '100%' : 'auto',
              flex: isMobile ? '1 0 100%' : '0 0 auto',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={dropdownRef}
          >
            {/* Previous Button */}
            <button
              onClick={() => navigateMatch('prev')}
              disabled={upcomingMatches.length === 0 || isFlipping}
              style={{
                background: 'var(--accent-soft)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: upcomingMatches.length > 0 && !isFlipping ? 'pointer' : 'default',
                color: 'var(--accent)',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                opacity: upcomingMatches.length === 0 ? 0.3 : 1,
              }}
              onMouseEnter={(e) => {
                if (upcomingMatches.length > 0 && !isFlipping) {
                  e.currentTarget.style.background = 'var(--accent-soft-2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-soft)';
              }}
            >
              ◀
            </button>

            {/* Match Card with Flip Animation */}
            <div style={{
              flex: 1,
              position: 'relative',
              minHeight: '60px',
              perspective: '800px',
            }}>
              {upcomingMatches.length > 0 && currentMatch ? (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  transition: 'transform 0.35s ease-in-out',
                  transformStyle: 'preserve-3d',
                  transform: isFlipping 
                    ? flipDirection === 'next' 
                      ? 'rotateY(-90deg)' 
                      : 'rotateY(90deg)'
                    : 'rotateY(0deg)',
                }}>
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    backfaceVisibility: 'hidden',
                  }}>
                    {/* "Up next for you" label */}
                    {currentMatch.isUserInMatch || currentMatch.isUserBooking ? (
                      <div style={{
                        fontSize: '0.5rem',
                        color: 'var(--accent)',

                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}>
                        <span>⭐</span> Up next for you
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.5rem',
                        color: 'var(--muted)',

                        fontWeight: 400,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        marginBottom: '2px',
                      }}>
                        Upcoming Match
                      </div>
                    )}

                    {/* Match Title */}
                    <div style={{
                      fontSize: '0.8rem',

                      fontWeight: 700,
                      color: currentMatch.isUserInMatch || currentMatch.isUserBooking ? 'var(--accent)' : 'var(--text-strong)',
                      marginBottom: '1px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {currentMatch.type === 'slot' 
                        ? `${currentMatch.game} • ${currentMatch.slotLabel}`
                        : `${currentMatch.playerAName} vs ${currentMatch.playerBName}`
                      }
                    </div>

                    {/* Match Time */}
                    <div style={{
                      fontSize: '0.6rem',
                      color: 'var(--muted)',

                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span>
                        {isToday(currentMatch.scheduled_at) ? 'Today' : formatMatchDate(currentMatch.scheduled_at)}
                      </span>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)' }} />
                      <span>{formatMatchTime(currentMatch.scheduled_at)}</span>
                      {currentMatch.type === 'slot' && (
                        <>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)' }} />
                          <span style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            {currentMatch.playerAName}
                          </span>
                        </>
                      )}
                      {currentMatch.isUserInMatch && (
                        <>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--muted)' }} />
                          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.55rem' }}>Your Match</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  fontSize: '0.7rem',
                  color: 'var(--muted)',
                  fontWeight:700
                }}>
                  No upcoming matches
                </div>
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => navigateMatch('next')}
              disabled={upcomingMatches.length === 0 || isFlipping}
              style={{
                background: 'var(--accent-soft)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: upcomingMatches.length > 0 && !isFlipping ? 'pointer' : 'default',
                color: 'var(--accent)',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                opacity: upcomingMatches.length === 0 ? 0.3 : 1,
              }}
              onMouseEnter={(e) => {
                if (upcomingMatches.length > 0 && !isFlipping) {
                  e.currentTarget.style.background = 'var(--accent-soft-2)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-soft)';
              }}
            >
              ▶
            </button>

            {/* Match counter */}
            {upcomingMatches.length > 0 && (
              <div style={{
                fontSize: '0.45rem',
                color: 'var(--muted)',
                whiteSpace: 'nowrap',
                position: 'absolute',
                bottom: '4px',
                right: '14px',
              }}>
                {currentMatchIndex + 1} / {upcomingMatches.length}
              </div>
            )}

            {/* Auto-play indicator dots */}
            {upcomingMatches.length > 1 && (
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}>
                {upcomingMatches.map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: index === currentMatchIndex ? '12px' : '6px',
                      height: '3px',
                      borderRadius: '2px',
                      background: index === currentMatchIndex ? 'var(--accent)' : 'var(--border)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Game Selection Dropdown */}
          <div style={{ position: 'relative', zIndex: 100 }} ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowGameDropdown(!showGameDropdown)}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '8px 18px',
                borderRadius: '999px',

                fontWeight: 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '14px',
                transition: 'all 0.2s ease',
                minWidth: '120px',
                justifyContent: 'space-between',
                backdropFilter: 'blur(4px)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-surface-strong)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-surface)'}
            >
              <span>{selectedGameRecord?.name || 'Select Game'}</span>
              <span style={{
                transition: 'transform 0.2s ease',
                transform: showGameDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: '10px',
                color: 'var(--muted)',
              }}>▼</span>
            </button>

            {showGameDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: 'var(--bg-surface-strong)',
                  borderRadius: '12px',
                  boxShadow: 'var(--surface-shadow)',
                  minWidth: '160px',
                  padding: '6px 0',
                  border: '1px solid var(--border)',
                  zIndex: 9999,
                  overflow: 'hidden',
                }}
              >
                {games.map((game) => {
                  const isActive = String(selectedGame) === String(game.id) || 
                                   String(selectedGame).toLowerCase() === String(game.name).toLowerCase();
                  return (
                    <div
                      key={game.id}
                      onClick={() => {
                        setSelectedGame(String(game.id));
                        setShowGameDropdown(false);
                      }}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: isActive ? 'var(--accent-contrast)' : 'var(--text)',
                        backgroundColor: isActive ? 'var(--accent)' : 'transparent',

                        fontWeight: isActive ? 700 : 400,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'var(--accent-soft)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span>{game.name}</span>
                      {isActive && (
                        <span style={{ color: 'var(--accent-contrast)', fontSize: '12px' }}>✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <MetricCard 
          label="Today's bookings" 
          value={selectedGameBookings.length} 
          caption={`${selectedGameRecord.name} bookings on ${currentDayName}`} 
          accent="#1a3c6e" 
        />
        <MetricCard 
          label="Available slots" 
          value={availableSlotsCount} 
          caption={`${availableSlotsCount} of ${totalSlots} slots available`} 
          accent="#1b5e20" 
        />
        <MetricCard 
          label="Active bans" 
          value={activeBanCount} 
          caption={`${selectedGameRecord.name} scope`} 
          accent="#c62828" 
        />
        <MetricCard 
          label="Game Masters" 
          value="2" 
          caption="Active" 
          accent="#f9a825" 
        />
      </section>

      {/* Today's Bookings + Upcoming Events — stacks on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80% 20%', gap: '14px' }}>
        {/* Today's Bookings - 80% with 5 slots per row */}
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'var(--bg-surface-strong)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>
            Today&apos;s bookings
          </div>
          <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: 'var(--text-strong)', fontWeight: 700 }}>
            {selectedGameRecord.name} on {currentDayName}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px' }}>
            {SLOTS.map((slot) => {
              const players = (dayBookings[slot.id] || []).filter((booking) =>
                String(booking.game) === String(selectedGameRecord.id) ||
                booking.game === selectedGameRecord.name ||
                String(booking.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase()
              );
              const isFull = players.length >= maxPerSlot;
              const hasBooking = players.length > 0;
              
              return (
                <div 
                  key={slot.id} 
                  style={{ 
                    padding: '10px 12px', 
                    borderRadius: '16px', 
                    background: isFull 
                      ? 'rgba(198,40,40,0.12)' 
                      : hasBooking 
                        ? 'rgba(111,156,255,0.08)' 
                        : 'var(--bg-muted)',
                    border: isFull 
                      ? '1px solid rgba(198,40,40,0.35)' 
                      : hasBooking 
                        ? '1px solid var(--border)' 
                        : '1px solid var(--border)',
                    minHeight: '80px',
                    opacity: isFull ? 0.85 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ 
                        fontSize: '0.7rem',

                        fontWeight: 700, 
                        color: isFull ? 'var(--danger)' : 'var(--text-strong)',
                      }}>
                        {slot.label}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--muted)', fontWeight: 400 }}>{slot.time}</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem',

                      fontWeight: 700, 
                      color: isFull ? 'var(--danger)' : hasBooking ? 'var(--accent)' : 'var(--muted)',
                      background: isFull ? 'rgba(198,40,40,0.16)' : hasBooking ? 'var(--accent-soft)' : 'transparent',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}>
                      {players.length}/{maxPerSlot}
                    </div>
                  </div>
                  {hasBooking && (
                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {players.map((player) => (
                        <span 
                          key={`${slot.id}-${player.booking_id || player.user_id}-${player.name}`} 
                            style={{
                              fontSize: '0.55rem',
                              background: isFull ? 'var(--danger)' : 'var(--accent)',
                              color: 'white',
                              padding: '2px 6px',
                            borderRadius: '4px',

                            fontWeight: 400,
                          }}
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {!hasBooking && (
                    <div style={{ 
                      fontSize: '0.55rem', 
                      color: 'var(--muted)', 
                      marginTop: '6px',
                      fontStyle: 'italic',

                      fontWeight: 400,
                    }}>
                      Empty
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming Events - 20% */}
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'var(--bg-surface-strong)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>
            Upcoming Events
          </div>
          <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: 'var(--text-strong)', fontWeight: 700 }}>
            What's next
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingEvents.slice(0, 3).map((event, index) => {
              const eventDate = formatEventDate(event.start_date);
              return (
                <div 
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: index % 2 === 0 ? 'var(--accent-soft)' : 'transparent',
                    borderLeft: `3px solid var(--accent)`,
                  }}
                >
                  <div style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>
                    {eventDate}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontWeight: 400, marginTop: '2px' }}>
                    {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1) || 'Event'}
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div style={{ padding: '18px', color: 'var(--muted)', fontSize: '0.75rem', textAlign: 'center' }}>
                No upcoming events
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Leaderboard + Quick Actions — stacks on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80% 20%', gap: '14px' }}>
        {/* Leaderboard - 80% with colors */}
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'var(--bg-surface-strong)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>
                Leaderboard
              </div>
              <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', color: 'var(--text-strong)', fontWeight: 700 }}>
                Points and Ranking
              </h2>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-soft)', fontWeight: 400 }}>
              Points: win = 4, draw = 2, loss = 1
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <MobileTable
              columns={[
                {
                  key: 'rank',
                  label: 'Rank',
                  hideOnCard: true,
                  render: (row) => {
                    const rankColor = getRankColor(row.rank);
                    return (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: rankColor.bg,
                        color: rankColor.text,
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        minWidth: '40px',
                        boxShadow: `0 2px 8px ${rankColor.glow}`,
                      }}>
                        {getMedal(row.rank)}
                      </span>
                    );
                  },
                },
                {
                  key: 'name',
                  label: 'Employee',
                  hideOnCard: true,
                  render: (row) => {
                    const rankColor = getRankColor(row.rank);
                    const isTop3 = row.rank <= 3;
                    return (
                      <span style={{ fontWeight: isTop3 ? 600 : 400, color: isTop3 ? rankColor.text : 'var(--text-strong)' }}>
                        {row.name}
                      </span>
                    );
                  },
                },
                { key: 'employee_id', label: 'Emp ID', render: (row) => row.employee_id || 'N/A' },
                { key: 'department', label: 'Dept', render: (row) => row.department || 'General' },
                { key: 'gamesPlayed', label: 'Played', align: 'center' },
                { key: 'wins', label: 'W', align: 'center', render: (row) => <strong style={{ color: 'var(--success)' }}>{row.wins}</strong> },
                { key: 'losses', label: 'L', align: 'center', render: (row) => <strong style={{ color: 'var(--danger)' }}>{row.losses}</strong> },
                { key: 'draws', label: 'D', align: 'center', render: (row) => <strong style={{ color: 'var(--warning)' }}>{row.draws}</strong> },
                {
                  key: 'points',
                  label: 'Points',
                  align: 'center',
                  render: (row) => {
                    const pointsColor = getPointsColor(row.points);
                    return (
                      <span style={{
                        background: `linear-gradient(135deg, ${pointsColor}, ${pointsColor}dd)`,
                        color: 'var(--accent-contrast)',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'inline-block',
                        boxShadow: `0 2px 8px ${pointsColor}44`,
                      }}>
                        {row.points}
                      </span>
                    );
                  },
                },
              ]}
              rows={topLeaderboard}
              rowKey={(row) => `${row.employee_id || row.name}-${row.rank}`}
              emptyMessage="No employees found."
              cardTitle={(row) => {
                const rankColor = getRankColor(row.rank);
                const isTop3 = row.rank <= 3;
                return (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: rankColor.bg,
                      color: rankColor.text,
                      padding: '3px 8px',
                      borderRadius: '14px',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                      minWidth: '36px',
                    }}>{getMedal(row.rank)}</span>
                    <span style={{ color: isTop3 ? rankColor.text : 'inherit' }}>{row.name}</span>
                  </span>
                );
              }}
              cardSubtitle={(row) => (
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  {row.employee_id || 'N/A'} · {row.department || 'General'}
                </div>
              )}
            />
          </div>
        </section>

        {/* Quick Actions - 20% (Admin Only) */}
        {isAdmin && isAdmin() ? (
          <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'var(--bg-surface-strong)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 400 }}>
              Quick Actions
            </div>
            <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: 'var(--text-strong)', fontWeight: 700 }}>
              Quick Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <QuickActionButton 
                icon={<CalendarIcon size="20px" date={currentDate} />}
                label="Create Slot Booking" 
                onClick={() => setActiveTab('booking')}
              />
              <QuickActionButton 
                icon="📋" 
                label="Create Event" 
                onClick={() => setActiveTab('eventsCalendar')}
              />
              <QuickActionButton 
                icon="🏆" 
                label="Create Tournament" 
                onClick={() => setActiveTab('tournaments')}
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
    );
  }
};

const QuickActionButton = ({ icon, label, onClick }) => {
  const { pressed, pressProps } = usePressState();
  return (
    <button
      onClick={onClick}
      {...pressProps}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid var(--border)',
        background: pressed ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        fontSize: '0.7rem',
        color: 'var(--text-strong)',

        fontWeight: 400,
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const MetricCard = ({ label, value, caption, accent }) => {
  const { pressed, pressProps } = usePressState();
  const hovered = pressed;
  return (
    <div
      {...pressProps}
      style={{
        padding: '18px 20px',
        borderRadius: '24px',
        background: hovered ? accent : 'var(--bg-surface-strong)',
        borderTop: `3px solid ${accent}`,
        borderRight: `2px solid ${hovered ? accent : 'rgba(200,210,230,0.3)'}`,
        borderBottom: `2px solid ${hovered ? accent : 'rgba(200,210,230,0.3)'}`,
        borderLeft: `2px solid ${hovered ? accent : 'rgba(200,210,230,0.3)'}`,
        boxShadow: hovered
          ? `0 8px 30px ${accent}66`
          : '6px 6px 14px rgba(0,0,0,0.06), -6px -6px 14px rgba(255,255,255,0.5)',
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: '4px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ 
          fontSize: '0.65rem', 
          color: hovered ? 'var(--text)' : 'var(--muted)',
          textTransform: 'uppercase', 
          letterSpacing: '0.08em',
          fontWeight: 700,
          fontFamily: "'Lufga', sans-serif",
        }}>
          {label}
        </div>
      </div>

      <div style={{ 
        fontSize: '2.2rem',
        fontWeight: 700,
        color: hovered ? 'var(--text-strong)' : accent,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: '2px',
        position: 'relative',
        zIndex: 1,
        fontFamily: "'Lufga', sans-serif",
      }}>
        {value}
      </div>

      <div style={{ 
        fontSize: '0.68rem',

        fontWeight: 700,
        color: hovered ? 'var(--text-soft)' : 'var(--text-soft)',
        position: 'relative',
        zIndex: 1,
        fontFamily: "'Lufga', sans-serif",
      }}>
        {caption}
      </div>
    </div>
  );
};

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',

  fontWeight: 700,
};

const tdStyle = {
  padding: '8px 10px',

  fontWeight: 400,
};

export default DashboardPage;
