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

const lufgaFontStyle = `
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Regular.otf') format('opentype');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Lufga';
    src: url('/fonts/Lufga-Bold.otf') format('opentype');
    font-weight: 700;
    font-style: normal;
    font-display: swap;
  }
`;

if (typeof document !== 'undefined') {
  const styleId = 'lufga-font-styles';
  if (!document.getElementById(styleId)) {
    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.innerHTML = lufgaFontStyle;
    document.head.appendChild(styleTag);
  }
}

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

  // Resume auto-play when user clicks away
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsAutoPlaying(true);
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

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      {/* Header Section - Clean with only background color */}
      <div
        style={{
          padding: '24px 32px',
          borderRadius: '24px',
          background: '#f0f4ff',
          color: '#1a1a2e',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            {/* Welcome message */}
            <div style={{ 
              fontSize: '2rem', 
              color: '#000000', 
              fontFamily: "'Lufga', sans-serif",
              fontWeight: 400,
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
   
              Welcome back, <span style={{ color: '#080b5c', fontFamily: "'Lufga', sans-serif", fontWeight: 700 }}>
                {getUserDisplayName()}

                <span style={{ fontSize: '1.75rem' }}> 👋</span>
              </span>
            </div>
            
            {/* <div style={{ fontSize: '0.75rem', color: '#6a6a8a', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>
              PLANNING DASHBOARD
            </div> */}
            {/* <h1 style={{ margin: '2px 0 4px', fontSize: '1.6rem', lineHeight: 1.1, fontWeight: 700, color: '#1a1a2e' }}>
              Employee activity at a glance
            </h1> */}
            <div style={{ fontSize: '0.8rem', color: '#8888aa', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              {formatDate(currentDate)} • Week: {weekLabel}
            </div>
          </div>

          {/* Up Next For You - Matches Carousel */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              gap: '12px',
              background: 'rgba(255,255,255,0.7)',
              borderRadius: '16px',
              padding: '12px 16px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.5)',
              minWidth: '260px',
              maxWidth: '360px',
              position: 'relative',
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
                background: 'rgba(26,60,110,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: upcomingMatches.length > 0 && !isFlipping ? 'pointer' : 'default',
                color: '#1a3c6e',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                opacity: upcomingMatches.length === 0 ? 0.3 : 1,
              }}
              onMouseEnter={(e) => {
                if (upcomingMatches.length > 0 && !isFlipping) {
                  e.currentTarget.style.background = 'rgba(26,60,110,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(26,60,110,0.08)';
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
                        color: '#1a3c6e',
                        fontFamily: "'Lufga', sans-serif",
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
                        color: '#8888aa',
                        fontFamily: "'Lufga', sans-serif",
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
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 700,
                      color: currentMatch.isUserInMatch || currentMatch.isUserBooking ? '#1a3c6e' : '#1a1a2e',
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
                      color: '#8888aa',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <span>
                        {isToday(currentMatch.scheduled_at) ? 'Today' : formatMatchDate(currentMatch.scheduled_at)}
                      </span>
                      <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#8888aa' }} />
                      <span>{formatMatchTime(currentMatch.scheduled_at)}</span>
                      {currentMatch.type === 'slot' && (
                        <>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#8888aa' }} />
                          <span style={{ color: '#1a3c6e', fontWeight: 500 }}>
                            {currentMatch.playerAName}
                          </span>
                        </>
                      )}
                      {currentMatch.isUserInMatch && (
                        <>
                          <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#8888aa' }} />
                          <span style={{ color: '#1b5e20', fontWeight: 600, fontSize: '0.55rem' }}>Your Match</span>
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
                  color: '#8888aa',
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
                background: 'rgba(26,60,110,0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: upcomingMatches.length > 0 && !isFlipping ? 'pointer' : 'default',
                color: '#1a3c6e',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0,
                opacity: upcomingMatches.length === 0 ? 0.3 : 1,
              }}
              onMouseEnter={(e) => {
                if (upcomingMatches.length > 0 && !isFlipping) {
                  e.currentTarget.style.background = 'rgba(26,60,110,0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(26,60,110,0.08)';
              }}
            >
              ▶
            </button>

            {/* Match counter */}
            {upcomingMatches.length > 0 && (
              <div style={{
                fontSize: '0.45rem',
                color: '#8888aa',
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
                      background: index === currentMatchIndex ? '#1a3c6e' : '#d0d5e0',
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
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(0,0,0,0.06)',
                color: '#1a1a2e',
                padding: '8px 18px',
                borderRadius: '999px',
                fontFamily: "'Lufga', sans-serif",
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
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.95)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
            >
              <span>{selectedGameRecord?.name || 'Select Game'}</span>
              <span style={{
                transition: 'transform 0.2s ease',
                transform: showGameDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                fontSize: '10px',
                color: '#8888aa',
              }}>▼</span>
            </button>

            {showGameDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
                  minWidth: '160px',
                  padding: '6px 0',
                  border: '1px solid #e8edf5',
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
                        color: isActive ? '#080b5c' : '#1a1a2e',
                        backgroundColor: isActive ? '#e8edf5' : 'transparent',
                        fontFamily: "'Lufga', sans-serif",
                        fontWeight: isActive ? 700 : 400,
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = '#f8f9fc';
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
                        <span style={{ color: '#080b5c', fontSize: '12px' }}>✓</span>
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

      {/* 80/20 Layout: Today's Bookings + Upcoming Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '80% 20%', gap: '14px' }}>
        {/* Today's Bookings - 80% with 5 slots per row */}
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
          <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Today&apos;s bookings
          </div>
          <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: '#1e1e2f', fontFamily: "'Lufga', sans-serif", fontWeight: 700 }}>
            {selectedGameRecord.name} on {currentDayName}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
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
                      ? 'rgba(198,40,40,0.06)' 
                      : hasBooking 
                        ? 'rgba(26,60,110,0.04)' 
                        : '#f8f9fc',
                    border: isFull 
                      ? '1px solid rgba(198,40,40,0.3)' 
                      : hasBooking 
                        ? '1px solid rgba(26,60,110,0.1)' 
                        : '1px solid #e8edf5',
                    minHeight: '80px',
                    opacity: isFull ? 0.85 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ 
                        fontSize: '0.7rem',
                        fontFamily: "'Lufga', sans-serif",
                        fontWeight: 700, 
                        color: isFull ? '#c62828' : '#1e1e2f',
                      }}>
                        {slot.label}
                      </div>
                      <div style={{ fontSize: '0.55rem', color: '#8888aa', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>{slot.time}</div>
                    </div>
                    <div style={{ 
                      fontSize: '0.7rem',
                      fontFamily: "'Lufga', sans-serif",
                      fontWeight: 700, 
                      color: isFull ? '#c62828' : hasBooking ? '#1a3c6e' : '#8888aa',
                      background: isFull ? 'rgba(198,40,40,0.1)' : hasBooking ? 'rgba(26,60,110,0.08)' : 'transparent',
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
                            background: isFull ? '#c62828' : '#1a3c6e',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontFamily: "'Lufga', sans-serif",
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
                      color: '#b0b0b0', 
                      marginTop: '6px',
                      fontStyle: 'italic',
                      fontFamily: "'Lufga', sans-serif",
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
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
          <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
            Upcoming Events
          </div>
          <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: '#1e1e2f', fontFamily: "'Lufga', sans-serif", fontWeight: 700 }}>
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
                    background: index % 2 === 0 ? 'rgba(26,60,110,0.04)' : 'transparent',
                    borderLeft: `3px solid #1a3c6e`,
                  }}
                >
                  <div style={{ fontSize: '0.55rem', fontFamily: "'Lufga', sans-serif", fontWeight: 700, color: '#1a3c6e', marginBottom: '2px' }}>
                    {eventDate}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontFamily: "'Lufga', sans-serif", fontWeight: 700, color: '#1e1e2f' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#8888aa', fontFamily: "'Lufga', sans-serif", fontWeight: 400, marginTop: '2px' }}>
                    {event.event_type?.charAt(0).toUpperCase() + event.event_type?.slice(1) || 'Event'}
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div style={{ padding: '18px', color: '#8888aa', fontSize: '0.75rem', textAlign: 'center' }}>
                No upcoming events
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 80/20 Layout: Leaderboard + Quick Actions (Admin Only) */}
      <div style={{ display: 'grid', gridTemplateColumns: '80% 20%', gap: '14px' }}>
        {/* Leaderboard - 80% with colors */}
        <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#01010f', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
                Leaderboard
              </div>
              <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', color: '#1e1e2f', fontFamily: "'Lufga', sans-serif", fontWeight: 700 }}>
                Points and Ranking
              </h2>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#666', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Points: win = 4, draw = 2, loss = 1
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #1a3c6e, #2a5c8e)', color: 'white' }}>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Rank</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Employee</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Employee ID</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Department</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Played</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Wins</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Losses</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Draws</th>
                  <th style={{ ...thStyle, color: 'white', padding: '10px 12px' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {topLeaderboard.map((row, index) => {
                  const rankColor = getRankColor(row.rank);
                  const pointsColor = getPointsColor(row.points);
                  const isTop3 = row.rank <= 3;
                  return (
                    <tr 
                      key={`${row.employee_id || row.name}-${row.rank}`} 
                      style={{ 
                        borderBottom: '1px solid rgba(200,210,230,0.2)',
                        background: isTop3 ? `linear-gradient(90deg, ${rankColor.glow}, transparent)` : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isTop3 ? `linear-gradient(90deg, ${rankColor.glow}, rgba(200,210,230,0.1))` : '#f8f9fc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isTop3 ? `linear-gradient(90deg, ${rankColor.glow}, transparent)` : 'transparent';
                      }}
                    >
                      <td style={{ ...tdStyle, padding: '8px 12px' }}>
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
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', fontWeight: isTop3 ? 600 : 400 }}>
                        <span style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          color: isTop3 ? rankColor.text : '#1a1a2e',
                        }}>
                          {row.name}
                          {isTop3 && (
                            <span style={{ 
                              fontSize: '0.55rem', 
                              background: rankColor.bg,
                              color: rankColor.text,
                              padding: '1px 6px',
                              borderRadius: '10px',
                              fontWeight: 600,
                            }}>
                              {row.rank === 1 ? '🏆' : row.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', color: '#666' }}>{row.employee_id || 'N/A'}</td>
                      <td style={{ ...tdStyle, padding: '8px 12px' }}>
                        <span style={{
                          background: '#e8edf5',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.65rem',
                          color: '#444466',
                        }}>
                          {row.department || 'General'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: '#e3f2fd',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          color: '#1565c0',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}>
                          {row.gamesPlayed}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: '#e8f5e9',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          color: '#2e7d32',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}>
                          {row.wins}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: '#ffebee',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          color: '#c62828',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}>
                          {row.losses}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: '#fff3e0',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          color: '#e65100',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                        }}>
                          {row.draws}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{
                          background: `linear-gradient(135deg, ${pointsColor}, ${pointsColor}dd)`,
                          color: 'white',
                          padding: '4px 14px',
                          borderRadius: '20px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'inline-block',
                          boxShadow: `0 2px 8px ${pointsColor}44`,
                        }}>
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {topLeaderboard.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ padding: '18px', textAlign: 'center', color: '#8888aa' }}>
                      No employees found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Actions - 20% (Admin Only) */}
        {isAdmin && isAdmin() ? (
          <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
            <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Lufga', sans-serif", fontWeight: 400 }}>
              Quick Actions
            </div>
            <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: '#1e1e2f', fontFamily: "'Lufga', sans-serif", fontWeight: 700 }}>
              Quick Actions
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <QuickActionButton 
                icon="📅" 
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
};

const QuickActionButton = ({ icon, label, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '10px',
        border: '1px solid #e8edf5',
        background: hovered ? '#f0f2f7' : 'transparent',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '100%',
        fontSize: '0.7rem',
        color: '#1a1a2e',
        fontFamily: "'Lufga', sans-serif",
        fontWeight: 400,
      }}
    >
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const MetricCard = ({ label, value, caption, accent }) => {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      className="clay-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '18px 20px',
        borderRadius: '24px',
        background: hovered ? accent : 'rgba(255,255,255,0.96)',
        border: 'none',
        boxShadow: hovered 
          ? `0 8px 30px ${accent}44` 
          : '0 2px 8px rgba(0,0,0,0.04)',
        transform: hovered ? 'translateY(-4px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {!hovered && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: accent,
          borderRadius: '24px 24px 0 0',
        }} />
      )}

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
          color: hovered ? 'rgba(255,255,255,0.85)' : '#8888aa', 
          textTransform: 'uppercase', 
          letterSpacing: '0.08em',
          fontFamily: "'Lufga', sans-serif",
          fontWeight: 400,
        }}>
          {label}
        </div>
      </div>

      <div style={{ 
        fontSize: '2.2rem',
        fontFamily: "'Lufga', sans-serif",
        fontWeight: 700, 
        color: hovered ? '#ffffff' : accent, 
        lineHeight: 1,
        letterSpacing: '-0.02em',
        marginBottom: '2px',
        position: 'relative',
        zIndex: 1,
      }}>
        {value}
      </div>

      <div style={{ 
        fontSize: '0.68rem',
        fontFamily: "'Lufga', sans-serif",
        fontWeight: 400,
        color: hovered ? 'rgba(255,255,255,0.8)' : '#667',
        opacity: 0.8,
        position: 'relative',
        zIndex: 1,
      }}>
        {caption}
      </div>
    </div>
  );
};

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontFamily: "'Lufga', sans-serif",
  fontWeight: 700,
};

const tdStyle = {
  padding: '8px 10px',
  fontFamily: "'Lufga', sans-serif",
  fontWeight: 400,
};

export default DashboardPage;