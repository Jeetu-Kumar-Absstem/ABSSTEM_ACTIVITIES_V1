// src/components/booking/SlotCell.jsx
import { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { SLOTS } from '../../utils/constants';
import { filterBookingsToWeek, isBanned, isSlotFinished } from '../../utils/helpers';
import RemoveBookingConfirm from '../../ui/RemoveBookingConfirm';
import BanPlayerConfirm from '../../ui/BanPlayerConfirm';
import MatchResultConfirm from '../../ui/MatchResultConfirm';

// ─── Grid colour tokens (used here & exported for the parent grid) ───────────
export const GRID_STYLES = {
  // Day/Time label column
  dayCell: {
    background: 'linear-gradient(135deg, var(--accent) 0%, #3158b8 100%)',
    color: 'var(--text-strong)',
    fontWeight: 700,
    fontSize: '0.72rem',
    padding: '10px 14px',
    borderRight: '2px solid rgba(26,60,110,0.25)',
    borderBottom: '1px solid rgba(26,60,110,0.2)',
    letterSpacing: '0.02em',
    userSelect: 'none',
    minWidth: 90,
    position: 'sticky',
    left: 0,
    zIndex: 2,
  },
  // Corner cell (top-left "Day / Time")
  cornerCell: {
    background: 'linear-gradient(135deg, #06101f 0%, var(--accent) 100%)',
    color: 'var(--text-strong)',
    fontWeight: 700,
    fontSize: '0.7rem',
    padding: '10px 14px',
    borderRight: '2px solid rgba(26,60,110,0.3)',
    borderBottom: '2px solid rgba(26,60,110,0.3)',
    position: 'sticky',
    left: 0,
    top: 0,
    zIndex: 3,
    letterSpacing: '0.03em',
  },
  // Slot header row cells
  slotHeader: {
    background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-surface-strong) 100%)',
    color: 'var(--text)',
    fontWeight: 700,
    fontSize: '0.65rem',
    padding: '8px 10px',
    textAlign: 'center',
    borderBottom: '2px solid var(--border)',
    borderRight: '1px solid var(--border)',
    letterSpacing: '0.01em',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    minWidth: 120,
  },
  // Every data cell border
  cellBorder: '1px solid rgba(173,207,255,0.45)',
  // Wrapper for the full table
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '16px',
    border: '1.5px solid var(--border)',
    boxShadow: '0 2px 16px rgba(26,60,110,0.07)',
  },
};

const SlotCell = ({ day, slotId, players, maxPlayers, onBook, onRemove }) => {
  const { currentUser, selectedGame, bans, isAdmin, addBan, loadBans, bookings, games, currentDate, getSlotMatchResult, submitMatchResult } = useApp();
  const { showToast } = useToast();
  const [showPlayerActions, setShowPlayerActions] = useState(false);
  const [actionPlayer, setActionPlayer] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef(null);

  const getDefaultBanUntilDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [banConfirm, setBanConfirm] = useState(null);
  const [resultConfirm, setResultConfirm] = useState(false);

  const selectedGameRecord = games.find(game => String(game.id) === String(selectedGame) || String(game.name).toLowerCase() === String(selectedGame).toLowerCase());
  const gamePlayers = players.filter(p => String(p.game) === String(selectedGame) || p.game === selectedGameRecord?.name || String(p.game).toLowerCase() === String(selectedGameRecord?.name || '').toLowerCase());
  const isFull = gamePlayers.length >= maxPlayers;
  const isGameActive = selectedGameRecord ? selectedGameRecord.active !== false : true;
  const slotRecord = SLOTS.find((slot) => String(slot.id) === String(slotId));
  const slotFinished = isSlotFinished(day, slotRecord, currentDate, new Date());
  const slotResult = getSlotMatchResult(selectedGameRecord?.id || selectedGame, day, slotId);
  const isSlotParticipant = gamePlayers.some((player) => player.user_id === currentUser?.id);
  const canSubmitResult = slotFinished && isFull && isSlotParticipant;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPlayerActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasUserBookingToday = (userId) => {
    const weekBookings = filterBookingsToWeek(bookings, currentDate);
    const dayBookings = weekBookings[day] || {};
    const allDayBookings = Object.values(dayBookings).flat();
    return allDayBookings.some(b => b.user_id === userId && (String(b.game) === String(selectedGame) || b.game === selectedGameRecord?.name));
  };

  const handleRemove = (player, userId) => {
    if (currentUser?.id === userId) {
      onRemove(day, slotId, player, userId);
      setShowPlayerActions(false);
    } else {
      showToast('You can only remove your own bookings!', 'error');
    }
  };

  const handleBanPlayer = (player) => {
    if (!isAdmin()) { showToast('Only admins can ban players!', 'error'); return; }
    if (isBanned(player, selectedGameRecord?.name || selectedGame, bans)) {
      showToast(`${player.name} is already banned from ${selectedGame}!`, 'error');
      return;
    }
    setBanConfirm(player);
    setShowPlayerActions(false);
  };

  const handleConfirmBan = async (banData) => {
    const bannedScope = banData.banned_from || selectedGameRecord?.name || selectedGame;
    if (isBanned({ name: banData.employee, employee_id: banData.employee_id }, bannedScope, bans)) {
      showToast(`${banData.employee} is already banned from ${bannedScope}!`, 'error');
      setBanConfirm(null);
      return;
    }
    const result = await addBan({
      employee: banData.employee,
      employee_id: banData.employee_id || 'N/A',
      game: bannedScope,
      from_date: banData.from_date || new Date().toISOString().split('T')[0],
      until_date: banData.until_date || getDefaultBanUntilDate(),
      reason: banData.reason || `Banned from ${selectedGame} by admin`
    });
    if (result.success) {
      await loadBans();
      showToast(`${banData.employee} has been banned from ${bannedScope}!`);
      setBanConfirm(null);
    } else {
      showToast('Error banning player: ' + result.error, 'error');
    }
  };

  const handlePlayerAction = (action, player) => {
    const isOwner = currentUser?.id === player.user_id;
    const isAdminUser = isAdmin();
    const banned = isBanned(player, selectedGame, bans);
    if (banned) { showToast(`${player.name} is already banned!`, 'error'); setShowPlayerActions(false); return; }
    if (action === 'remove') {
      if (isOwner) { setRemoveConfirm({ name: player.name, userId: player.user_id }); setShowPlayerActions(false); }
      else { showToast('You can only remove your own bookings!', 'error'); setShowPlayerActions(false); }
    } else if (action === 'ban') {
      if (isAdminUser) { handleBanPlayer(player); setShowPlayerActions(false); }
      else { showToast('Only admins can ban players!', 'error'); setShowPlayerActions(false); }
    }
  };

  const getPlayerActions = (player) => {
    const isOwner = currentUser?.id === player.user_id;
    const isAdminUser = isAdmin();
    const banned = isBanned(player, selectedGame, bans);
    const actions = [];
    if (banned) { actions.push({ label: '🚫 Banned', action: null, disabled: true }); }
    else {
      if (isOwner) actions.push({ label: '✖️ Remove My Booking', action: 'remove' });
      if (isAdminUser && !isOwner) actions.push({ label: '🚫 Ban Player', action: 'ban' });
      if (!isOwner && !isAdminUser) actions.push({ label: `👤 Booked by ${player.name}`, action: null, disabled: true });
    }
    return actions;
  };

  const handleBookSlot = () => {
    if (!isGameActive) { showToast('Currently this is Unavailable', 'error'); return; }
    const userEmpId = currentUser?.user_metadata?.emp_id || '';
    const userBanned = isBanned({ name: currentUser?.user_metadata?.name || '', employee_id: userEmpId }, selectedGameRecord?.name || selectedGame, bans);
    if (userBanned) { showToast('You are banned from this game!', 'error'); return; }
    if (hasUserBookingToday(currentUser?.id)) { showToast('You already have a booking for this game today!', 'error'); return; }
    onBook(day, slotId);
  };

  const handleSubmitResult = async (resultData) => {
    const gameKey = selectedGameRecord?.id || selectedGame;
    const result = await submitMatchResult(gameKey, resultData);
    if (result.success) {
      showToast(`${selectedGameRecord?.name || selectedGame} result saved for ${day} ${slotRecord?.label || slotId}.`);
      setResultConfirm(false);
      return;
    }
    showToast(result.error || 'Unable to save result.', 'error');
  };

  // ── cell background based on state ───────────────────────────────
  let cellBg;
  if (isFull)                  cellBg = 'rgba(249,168,37,0.12)';
  else if (slotFinished)       cellBg = 'rgba(var(--accent-rgb),0.08)';
  else if (gamePlayers.length) cellBg = 'rgba(34,197,94,0.08)';
  else                         cellBg = 'var(--bg-surface)';

  return (
    <>
      <div
        style={{
          background: cellBg,
          // light blue border so every cell is clearly distinguished
          border: GRID_STYLES.cellBorder,
          borderRadius: '10px',
          padding: '5px 6px',
          minHeight: '36px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '3px',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: isFull ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s ease, box-shadow 0.15s ease',
          position: 'relative',
          margin: '2px',
        }}
        onMouseEnter={e => {
          if (!isFull) e.currentTarget.style.boxShadow = '0 0 0 2px rgba(var(--accent-rgb),0.18)';
        }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
        onClick={() => !isFull && handleBookSlot()}
      >
        {gamePlayers.map(player => {
          const banned  = isBanned(player, selectedGameRecord?.name || selectedGame, bans);
          const isOwner = currentUser?.id === player.user_id;
          const isAdminUser = isAdmin();

          let bgColor, textColor;
          if (banned)        { bgColor = 'rgba(229,57,53,0.18)';  textColor = 'var(--danger)'; }
          else if (isOwner)  { bgColor = 'rgba(34,197,94,0.16)';   textColor = 'var(--success)'; }
          else               { bgColor = 'rgba(var(--accent-rgb),0.12)';   textColor = 'var(--text)'; }

          return (
            <span
              key={`${player.name}-${player.user_id}`}
              style={{
                background: bgColor,
                padding: '2px 10px',
                borderRadius: '20px',
                fontSize: '0.6rem',
                fontWeight: 700,
                color: textColor,
                textDecoration: banned ? 'line-through' : 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                border: isOwner && !banned ? '1px solid rgba(34,197,94,0.32)' : 'none',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (banned) { showToast(`${player.name} is banned from ${selectedGame}!`, 'error'); return; }
                const isOwner     = currentUser?.id === player.user_id;
                const isAdminUser = isAdmin();
                if (isOwner)      { setRemoveConfirm({ name: player.name, userId: player.user_id }); return; }
                if (isAdminUser)  { setBanConfirm(player); return; }
                showToast(`Booked by ${player.name}`, 'info');
              }}
              onMouseEnter={e => { if (!banned) { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.22)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
              title={banned ? '🚫 Banned player' : 'Click for options'}
            >
              {player.name}
              {isOwner && !banned && <span style={{ opacity: 0.5, fontSize: '0.5rem' }}>×</span>}
              {banned && ' 🚫'}
              {isOwner && !banned && <span style={{ fontSize: '0.4rem', opacity: 0.6 }}>👤</span>}
              {isAdminUser && !banned && !isOwner && <span style={{ fontSize: '0.4rem', opacity: 0.4 }}>🔑</span>}
            </span>
          );
        })}

        {!isFull && gamePlayers.length < maxPlayers && (
          <span style={{ fontSize: '0.6rem', color: 'var(--success)', opacity: 0.75 }}>+</span>
        )}
        {isFull && (
          <span style={{ fontSize: '0.5rem', color: 'var(--warning)', fontWeight: 700 }}>
            FULL ({gamePlayers.length}/{maxPlayers})
          </span>
        )}
        {!isFull && gamePlayers.length > 0 && (
          <span style={{ fontSize: '0.4rem', color: 'var(--muted)', opacity: 0.72 }}>
            ({gamePlayers.length}/{maxPlayers})
          </span>
        )}
        {slotResult && (
          <span style={{
            fontSize: '0.48rem',
            color: slotResult.result === 'draw' ? 'var(--warning)' : 'var(--text)',
            background: slotResult.result === 'draw' ? 'rgba(249,168,37,0.16)' : 'rgba(var(--accent-rgb),0.12)',
            borderRadius: '999px',
            padding: '2px 6px',
          }}>
            Result: {slotResult.result === 'draw' ? 'Draw' : slotResult.result === 'team_a' ? 'Team A Won' : 'Team B Won'}
          </span>
        )}
        {canSubmitResult && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setResultConfirm(true); }}
            style={{
              border: 'none',
              background: 'rgba(var(--accent-rgb),0.16)',
              color: 'var(--text)',
              borderRadius: '999px',
              padding: '3px 8px',
              fontSize: '0.48rem',
              cursor: 'pointer',
            }}
          >
            {slotResult ? 'Edit Result' : 'Add Result'}
          </button>
        )}
      </div>

      {/* Player Actions Popup */}
      {showPlayerActions && actionPlayer && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: Math.min(menuPosition.x, window.innerWidth - 220),
            background: 'var(--bg-surface-strong)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
            padding: '8px 0',
            minWidth: '200px',
            maxWidth: '250px',
            zIndex: 9999,
            border: '1px solid var(--border)',
          }}
          onMouseLeave={() => setShowPlayerActions(false)}
        >
          <div style={{ padding: '6px 14px', borderBottom: '1px solid var(--border)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text)' }}>
            {actionPlayer.name}
          </div>
          {getPlayerActions(actionPlayer).map((action, index) => (
            <div
              key={index}
              onClick={() => { if (action.action) handlePlayerAction(action.action, actionPlayer); }}
              style={{
                padding: '8px 14px', fontSize: '0.75rem',
                color: action.disabled ? 'var(--muted)' : 'var(--text)',
                cursor: action.disabled ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s ease',
                background: action.action === 'remove' ? 'rgba(34,197,94,0.08)' : action.action === 'ban' ? 'rgba(229,57,53,0.08)' : 'transparent',
                borderRadius: '4px', margin: '0 4px',
              }}
              onMouseEnter={e => { if (!action.disabled) e.currentTarget.style.background = action.action === 'remove' ? 'rgba(34,197,94,0.14)' : action.action === 'ban' ? 'rgba(229,57,53,0.14)' : 'rgba(var(--accent-rgb),0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = action.action === 'remove' ? 'rgba(34,197,94,0.08)' : action.action === 'ban' ? 'rgba(229,57,53,0.08)' : 'transparent'; }}
            >
              {action.label}
            </div>
          ))}
        </div>
      )}

      <RemoveBookingConfirm
        open={!!removeConfirm}
        playerName={removeConfirm?.name}
        day={day}
        slotLabel={`Slot ${slotId}`}
        onCancel={() => setRemoveConfirm(null)}
        onConfirm={() => { handleRemove(removeConfirm.name, removeConfirm.userId); setRemoveConfirm(null); }}
      />
      <BanPlayerConfirm
        open={!!banConfirm}
        player={banConfirm}
        game={selectedGameRecord?.name || selectedGame}
        gameOptions={[{ value: 'All Games', label: 'All Games' }, ...games.map(game => ({ value: game.id, label: game.name }))]}
        onCancel={() => setBanConfirm(null)}
        onConfirm={handleConfirmBan}
      />
      <MatchResultConfirm
        open={resultConfirm}
        game={selectedGameRecord?.name || selectedGame}
        day={day}
        slotId={slotId}
        slotLabel={slotRecord?.label || `Slot ${slotId}`}
        players={gamePlayers}
        existingResult={slotResult}
        onCancel={() => setResultConfirm(false)}
        onConfirm={handleSubmitResult}
      />
    </>
  );
};

export default SlotCell;
