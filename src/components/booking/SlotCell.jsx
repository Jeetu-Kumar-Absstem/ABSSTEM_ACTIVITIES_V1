// src/components/booking/SlotCell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isBanned } from '../../utils/helpers';

const SlotCell = ({ day, slotId, players, maxPlayers, onBook, onRemove }) => {
  const { currentUser, selectedGame, bans, isAdmin, addBan, loadBans, bookings, games } = useApp();
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerActions, setShowPlayerActions] = useState(false);
  const [actionPlayer, setActionPlayer] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);
  
  const selectedGameRecord = games.find(game => String(game.id) === String(selectedGame));

  // Filter players for the selected game only
  const gamePlayers = players.filter(p => String(p.game) === String(selectedGame) || p.game === selectedGameRecord?.name);
  const isFull = gamePlayers.length >= maxPlayers;
  const isGameActive = selectedGameRecord ? selectedGameRecord.active !== false : true;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPlayerActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user already has a booking for this day in this game
  const hasUserBookingToday = (userId) => {
    const dayBookings = bookings[day] || {};
    const allDayBookings = Object.values(dayBookings).flat();
    return allDayBookings.some(b => b.user_id === userId && (String(b.game) === String(selectedGame) || b.game === selectedGameRecord?.name));
  };

  const handleRemove = (player, userId) => {
    const currentUserId = currentUser?.id;
    if (currentUserId === userId) {
      onRemove(day, slotId, player, userId);
      setShowPlayerActions(false);
    } else {
      alert('❌ You can only remove your own bookings!');
    }
  };

  // Only admin can ban
  const handleBanPlayer = (player) => {
    if (!isAdmin()) {
      alert('❌ Only admins can ban players!');
      return;
    }
    if (isBanned(player, selectedGameRecord?.name || selectedGame, bans)) {
      alert(`🚫 ${player.name} is already banned from ${selectedGame}!`);
      return;
    }
    setSelectedPlayer(player);
    setShowBanModal(true);
    setShowPlayerActions(false);
  };

  const handleConfirmBan = async (banData) => {
    if (isBanned({ name: banData.employee, employee_id: banData.employee_id }, selectedGameRecord?.name || selectedGame, bans)) {
      alert(`🚫 ${banData.employee} is already banned from ${selectedGame}!`);
      setShowBanModal(false);
      setSelectedPlayer(null);
      return;
    }

    const result = await addBan({
      employee: banData.employee,
      employee_id: banData.employee_id || 'N/A',
      game: selectedGame,
      from_date: banData.from_date || new Date().toISOString().split('T')[0],
      until_date: banData.until_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reason: banData.reason || `Banned from ${selectedGame} by admin`
    });

    if (result.success) {
      await loadBans();
      alert(`✅ ${banData.employee} has been banned from ${selectedGame}!`);
      setShowBanModal(false);
      setSelectedPlayer(null);
    } else {
      alert('❌ Error banning player: ' + result.error);
    }
  };

  // Show player action menu
  const showPlayerMenu = (player, event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setMenuPosition({
      x: rect.left,
      y: rect.bottom + 5
    });
    setActionPlayer(player);
    setShowPlayerActions(true);
  };

  // Handle player action
  const handlePlayerAction = (action, player) => {
    const isOwner = currentUser?.id === player.user_id;
    const isAdminUser = isAdmin();
    const banned = isBanned(player, selectedGame, bans);

    if (banned) {
      alert(`🚫 ${player.name} is already banned!`);
      setShowPlayerActions(false);
      return;
    }

    if (action === 'remove') {
      if (isOwner) {
        handleRemove(player.name, player.user_id);
        setShowPlayerActions(false);
      } else {
        alert('❌ You can only remove your own bookings!');
        setShowPlayerActions(false);
      }
    } else if (action === 'ban') {
      if (isAdminUser) {
        handleBanPlayer(player);
        setShowPlayerActions(false);
      } else {
        alert('❌ Only admins can ban players!');
        setShowPlayerActions(false);
      }
    }
  };

  // Get player action options based on user role
  const getPlayerActions = (player) => {
    const isOwner = currentUser?.id === player.user_id;
    const isAdminUser = isAdmin();
    const banned = isBanned(player, selectedGame, bans);
    const actions = [];

    if (banned) {
      actions.push({ label: '🚫 Banned', action: null, disabled: true });
    } else {
      if (isOwner) {
        actions.push({ label: '✖️ Remove My Booking', action: 'remove' });
      }
      // Only show ban option for admin on other players
      if (isAdminUser && !isOwner) {
        actions.push({ label: '🚫 Ban Player', action: 'ban' });
      }
      // For non-owner, non-admin users, show who booked it
      if (!isOwner && !isAdminUser) {
        actions.push({ label: `👤 Booked by ${player.name}`, action: null, disabled: true });
      }
    }

    return actions;
  };

  // Handle booking with validation
  const handleBookSlot = () => {
    if (!isGameActive) {
      alert('Currently this is Unavailable');
      return;
    }

    // Check if user is banned
    const userEmpId = currentUser?.user_metadata?.emp_id || '';
    const userBanned = isBanned({ name: currentUser?.user_metadata?.name || '', employee_id: userEmpId }, selectedGameRecord?.name || selectedGame, bans);

    if (userBanned) {
      alert('🚫 You are banned from this game!');
      return;
    }

    if (hasUserBookingToday(currentUser?.id)) {
      alert('⚠️ You already have a booking for this game today!');
      return;
    }

    onBook(day, slotId);
  };

  return (
    <>
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
          transition: 'all 0.15s ease',
          position: 'relative',
        }}
        onClick={() => !isFull && handleBookSlot()}
      >
        {gamePlayers.map(player => {
          const banned = isBanned(player, selectedGameRecord?.name || selectedGame, bans);
          const isOwner = currentUser?.id === player.user_id;
          const isAdminUser = isAdmin();
          
          // Colors: Dark Green for own entry, Dark Black for others
          let bgColor = 'rgba(26,60,110,0.08)';
          let textColor = '#1a1a1a'; // Dark black for others
          
          if (banned) {
            bgColor = 'rgba(229,57,53,0.15)';
            textColor = '#c62828';
          } else if (isOwner) {
            bgColor = 'rgba(27,94,32,0.15)'; // Dark green background
            textColor = '#1b5e20'; // Dark green text
          } else {
            bgColor = 'rgba(26,26,26,0.08)'; // Dark black background
            textColor = '#1a1a1a'; // Dark black text
          }
          
          return (
            <span
              key={`${player.name}-${player.user_id}`}
              style={{
                background: bgColor,
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '0.6rem',
                fontWeight: 500,
                color: textColor,
                textDecoration: banned ? 'line-through' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                border: isOwner && !banned ? '1px solid rgba(27,94,32,0.3)' : 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (banned) {
                  alert(`🚫 ${player.name} is banned from ${selectedGame}!`);
                  return;
                }
                showPlayerMenu(player, e);
              }}
              onMouseEnter={(e) => {
                if (!banned) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              title={banned ? '🚫 Banned player' : 'Click for options'}
            >
              {player.name}
              {isOwner && !banned && <span style={{ opacity: 0.5, fontSize: '0.5rem' }}>×</span>}
              {banned && ' 🚫'}
              {isOwner && !banned && <span style={{ fontSize: '0.4rem', opacity: 0.6 }}>👤</span>}
              {isAdminUser && !banned && !isOwner && (
                <span style={{ fontSize: '0.4rem', opacity: 0.4 }}>🔑</span>
              )}
            </span>
          );
        })}
        {!isFull && gamePlayers.length < maxPlayers && (
          <span style={{ fontSize: '0.6rem', color: '#00897b', opacity: 0.5 }}>+</span>
        )}
        {isFull && <span style={{ fontSize: '0.5rem', color: '#f9a825' }}>FULL ({gamePlayers.length}/{maxPlayers})</span>}
        {!isFull && gamePlayers.length > 0 && (
          <span style={{ fontSize: '0.4rem', color: '#8888aa', opacity: 0.5 }}>
            ({gamePlayers.length}/{maxPlayers})
          </span>
        )}
      </div>

      {/* Player Actions Popup Menu */}
      {showPlayerActions && actionPlayer && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: Math.min(menuPosition.x, window.innerWidth - 220),
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            padding: '8px 0',
            minWidth: '200px',
            maxWidth: '250px',
            zIndex: 9999,
            border: '1px solid rgba(200,210,230,0.3)',
          }}
          onMouseLeave={() => setShowPlayerActions(false)}
        >
          <div style={{ 
            padding: '6px 14px', 
            borderBottom: '1px solid rgba(200,210,230,0.2)', 
            fontSize: '0.7rem', 
            fontWeight: 600, 
            color: '#444466' 
          }}>
            {actionPlayer.name}
          </div>
          {getPlayerActions(actionPlayer).map((action, index) => (
            <div
              key={index}
              onClick={() => {
                if (action.action) {
                  handlePlayerAction(action.action, actionPlayer);
                }
              }}
              style={{
                padding: '8px 14px',
                fontSize: '0.75rem',
                color: action.disabled ? '#8888aa' : '#1e1e2f',
                cursor: action.disabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
                background: action.action === 'remove' ? 'rgba(27,94,32,0.05)' : 
                          action.action === 'ban' ? 'rgba(229,57,53,0.05)' : 'transparent',
                borderRadius: '4px',
                margin: '0 4px',
              }}
              onMouseEnter={(e) => {
                if (!action.disabled) {
                  e.currentTarget.style.background = action.action === 'remove' ? 'rgba(27,94,32,0.15)' : 
                                              action.action === 'ban' ? 'rgba(229,57,53,0.15)' : 'rgba(0,0,0,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = action.action === 'remove' ? 'rgba(27,94,32,0.05)' : 
                                            action.action === 'ban' ? 'rgba(229,57,53,0.05)' : 'transparent';
              }}
            >
              {action.label}
            </div>
          ))}
        </div>
      )}

      {/* Ban Modal - Only shown to admin */}
      {showBanModal && selectedPlayer && isAdmin() && (
        <BanPlayerModal
          player={selectedPlayer}
          game={selectedGame}
          onClose={() => {
            setShowBanModal(false);
            setSelectedPlayer(null);
          }}
          onConfirm={handleConfirmBan}
        />
      )}
    </>
  );
};

// Ban Player Modal Component
const BanPlayerModal = ({ player, game, onClose, onConfirm }) => {
  const [banData, setBanData] = useState({
    employee: player.name,
    employee_id: player.employee_id || 'N/A',
    from_date: new Date().toISOString().split('T')[0],
    until_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reason: `Banned from ${game} by admin`
  });

  const handleConfirm = () => {
    if (!banData.reason.trim()) {
      alert('Please enter a reason for the ban!');
      return;
    }
    if (confirm(`⚠️ Are you sure you want to ban ${banData.employee} from ${game}?\n\nFrom: ${banData.from_date}\nUntil: ${banData.until_date}\nReason: ${banData.reason}`)) {
      onConfirm(banData);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="clay" style={{
        width: '100%',
        maxWidth: 480,
        padding: '24px',
        borderRadius: '32px',
        background: 'white',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>🚫 Ban Player</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#8888aa' }}>✕</button>
        </div>

        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#ffebee', borderRadius: '12px', borderLeft: '3px solid #e53935' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>Player: {player.name}</div>
          <div style={{ fontSize: '0.7rem', color: '#c62828' }}>Game: {game}</div>
          <div style={{ fontSize: '0.65rem', color: '#c62828', marginTop: '4px' }}>
            Employee ID: {player.employee_id || 'N/A'}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
            From Date <span style={{ color: '#e53935' }}>*</span>
          </label>
          <input
            type="date"
            className="clay-input"
            value={banData.from_date}
            onChange={(e) => setBanData({ ...banData, from_date: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
            Until Date <span style={{ color: '#e53935' }}>*</span>
          </label>
          <input
            type="date"
            className="clay-input"
            value={banData.until_date}
            onChange={(e) => setBanData({ ...banData, until_date: e.target.value })}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
            Reason <span style={{ color: '#e53935' }}>*</span>
          </label>
          <textarea
            className="clay-input"
            value={banData.reason}
            onChange={(e) => setBanData({ ...banData, reason: e.target.value })}
            placeholder="Describe the reason for the ban..."
            rows="3"
            required
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#fff8e1', borderRadius: '8px', fontSize: '0.65rem', color: '#e65100' }}>
          ⚠️ This action will ban <strong>{player.name}</strong> from <strong>{game}</strong>. 
          They will not be able to book slots for this game until the ban expires.
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button className="clay-btn" onClick={onClose}>Cancel</button>
          <button className="clay-btn clay-btn-red" onClick={handleConfirm}>
            🚫 Confirm Ban
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlotCell;
