// src/pages/SlotMasterPage.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SLOTS, GAMES } from '../utils/constants';
import { useToast } from '../context/ToastContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../utils/supabase';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import BottomSheet from '../components/common/BottomSheet';

const isVisibleGame = (game) => {
  const gameId = String(game?.id ?? '').toLowerCase();
  const gameName = String(game?.name || '').toLowerCase();
  return !['table-tennis', 'tennis'].includes(gameId) && !['table tennis', 'tennis'].includes(gameName);
};

const normalizeGameRow = (game) => ({
  ...game,
  id: String(game.id),
  maxPlayers: game.max_players ?? game.maxPlayers ?? (String(game.name || '').toLowerCase() === 'chess' ? 2 : 4),
  active: game.active !== false,
});

const getDefaultMaxPlayers = (gameId, games) => {
  const game = games.find((item) => String(item.id) === String(gameId));
  if (String(game?.name || '').toLowerCase() === 'chess') return 2;
  return game?.maxPlayers || 4;
};

const LUFGA_REGULAR = "'Lufga', sans-serif";
const LUFGA_BOLD    = "'Lufga', sans-serif";

const SlotMasterPage = () => {
  const [slots, setSlots] = useState(SLOTS);
  const [games, setGames] = useState(GAMES);
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const { showToast } = useToast();
  const { isAdmin } = useApp();
  const { isMobile } = useViewport();
  const canManageSlots = isAdmin();

  const loadSlots = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('*')
        .order('id');

      if (error) throw error;

      if (data && data.length > 0) {
        setSlots(data);
      } else {
        setSlots(SLOTS);
      }
    } catch (err) {
      console.error('Error loading slots:', err);
      setSlots(SLOTS);
    }
    setLoading(false);
  };

  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setGames(data.filter(isVisibleGame).map(normalizeGameRow));
      }
    } catch (err) {
      console.error('Error loading games:', err);
      setGames(GAMES.map(normalizeGameRow).filter(isVisibleGame));
    }
  };

  useEffect(() => {
    loadSlots();
    loadGames();
  }, []);

  const getFilteredSlots = () => {
    let filtered = slots;

    filtered = filtered.filter((slot) => {
      const start = String(slot.start_time || slot.startTime || '');
      const end = String(slot.end_time || slot.endTime || '');
      return !(start === '13:00' && end === '13:30');
    });

    if (selectedGame !== 'all') {
      filtered = filtered.filter(slot =>
        String(slot.game) === String(selectedGame) || slot.game === 'all' || !slot.game
      );
    }

    if (selectedDay !== 'all') {
      filtered = filtered.filter(slot =>
        slot.day === selectedDay || slot.day === 'all' || !slot.day
      );
    }

    return filtered;
  };

  const filteredSlots = getFilteredSlots();
  const selectedGameMaxPlayers = selectedGame !== 'all' ? getDefaultMaxPlayers(selectedGame, games) : null;

  const handleDeleteSlot = async (slotId) => {
    if (!canManageSlots) {
      showToast('Only admins can edit slots.', 'error');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this slot?')) return;

    try {
      const { error } = await supabase
        .from('slots')
        .delete()
        .match({ id: slotId });

      if (error) throw error;

      setSlots(slots.filter(s => s.id !== slotId));
      showToast('Slot deleted successfully!', 'success');
    } catch (err) {
      showToast('Error deleting slot: ' + err.message, 'error');
    }
  };

  const handleSaveSlot = async (slotData) => {
    if (!canManageSlots) {
      showToast('Only admins can edit slots.', 'error');
      return;
    }
    try {
      if (editingSlot) {
        const { error } = await supabase
          .from('slots')
          .update(slotData)
          .match({ id: editingSlot.id });

        if (error) throw error;

        setSlots(slots.map(s => s.id === editingSlot.id ? { ...s, ...slotData } : s));
        showToast('Slot updated successfully!', 'success');
      } else {
        const { data, error } = await supabase
          .from('slots')
          .insert([slotData])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setSlots([...slots, data[0]]);
        }
        showToast('Slot added successfully!', 'success');
      }

      setShowAddModal(false);
      setEditingSlot(null);
    } catch (err) {
      showToast('Error saving slot: ' + err.message, 'error');
    }
  };

  const getGameName = (gameId) => {
    if (!gameId || gameId === 'all') return 'All Games';
    const game = games.find(g => String(g.id) === String(gameId));
    return game ? game.name : gameId;
  };

  // Build rows + columns for the MobileTable
  const rows = filteredSlots.map((slot, i) => ({
    ...slot,
    _index: i,
    _code: `SLT-${String(slot.id || i + 1).padStart(2, '0')}`,
    _time: slot.time || `${slot.start_time || '11:00'}–${slot.end_time || '11:30'}`,
    _max: selectedGameMaxPlayers || slot.max_players || 4,
  }));

  const columns = [
    { key: '_index', label: '#', render: (row) => row._index + 1 },
    {
      key: '_code',
      label: 'Code',
      render: (row) => <strong>{row._code}</strong>,
    },
    {
      key: 'label',
      label: 'Slot',
      render: (row) => <strong>{row.label || `Slot ${row._index + 1}`}</strong>,
    },
    {
      key: '_time',
      label: 'Time',
      render: (row) => row._time,
    },
    { key: 'duration', label: 'Duration', render: (row) => row.duration || '30 min' },
    {
      key: 'applies',
      label: 'Applies To',
      render: (row) => (
        <span className="clay-badge clay-badge-navy">
          {row.game ? getGameName(row.game) : 'All Games'} · {row.day ? row.day : 'Mon–Fri'}
        </span>
      ),
    },
    { key: '_max', label: 'Max', align: 'center', render: (row) => <strong>{row._max}</strong> },
    {
      key: 'active',
      label: 'Active',
      render: (row) =>
        row.active === false ? (
          <span className="clay-badge clay-badge-red">✕ Inactive</span>
        ) : (
          <span className="clay-badge clay-badge-green">✓ Active</span>
        ),
    },
    {
      key: 'actions',
      label: 'Action',
      render: (row) =>
        canManageSlots ? (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="clay-btn"
              style={{ padding: '4px 10px', fontSize: '0.6rem' }}
              onClick={() => {
                setEditingSlot(row);
                setShowAddModal(true);
              }}
            >
              ✏️
            </button>
            <button
              className="clay-btn"
              style={{ padding: '4px 10px', fontSize: '0.6rem', color: '#e53935' }}
              onClick={() => handleDeleteSlot(row.id)}
            >
              🗑️
            </button>
          </div>
        ) : (
          <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>Read only</span>
        ),
    },
  ];

  const filterRowStyle = isMobile
    ? { display: 'flex', flexDirection: 'column', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }
    : { display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' };

  return (
    <div className="clay-card slot-master-page" style={{ fontFamily: LUFGA_REGULAR, fontWeight: 400, color: 'var(--text)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', fontFamily: LUFGA_BOLD, margin: 0, flex: 1, minWidth: 0 }}>
          Slot Master — Time Slot Configuration
        </h2>
        {canManageSlots ? (
          <button
            className="clay-btn clay-btn-primary"
            onClick={() => {
              setEditingSlot(null);
              setShowAddModal(true);
            }}
          >
            + Add Slot
          </button>
        ) : (
          <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', fontFamily: LUFGA_REGULAR }}>
            View only
          </span>
        )}
      </div>

      <div style={filterRowStyle}>
        <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: LUFGA_REGULAR, width: isMobile ? '100%' : 'auto' }}>
          Game:
          <select
            className="clay-select"
            style={{ padding: '6px 14px', fontSize: '0.7rem', flex: 1, minWidth: 0 }}
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            <option value="all">All Games</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: LUFGA_REGULAR, width: isMobile ? '100%' : 'auto' }}>
          Day:
          <select
            className="clay-select"
            style={{ padding: '6px 14px', fontSize: '0.7rem', flex: 1, minWidth: 0 }}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            <option value="all">All Days</option>
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
          </select>
        </label>

        <div style={{ display: 'flex', gap: '8px', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
          <button
            className="clay-btn clay-btn-teal"
            style={{ fontSize: '0.7rem' }}
            onClick={loadSlots}
          >
            🔍 Refresh
          </button>
          <button
            className="clay-btn"
            style={{ fontSize: '0.7rem' }}
            onClick={() => {
              setSelectedGame('all');
              setSelectedDay('all');
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div
        className="clay-soft"
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          display: 'inline-block',
          fontSize: '0.7rem',
          marginBottom: '12px',
          color: 'var(--text)',
          fontFamily: LUFGA_REGULAR,
        }}
      >
        Total Record(s) Found: {filteredSlots.length} slots
        {selectedGame !== 'all' && ` · Game: ${getGameName(selectedGame)}`}
        {selectedDay !== 'all' && ` · Day: ${selectedDay}`}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <MobileTable
          columns={columns}
          rows={loading ? [] : rows}
          rowKey={(row) => row.id || row._code}
          emptyMessage={loading ? '⏳ Loading slots…' : 'No slots found. Click "Add Slot" to create one.'}
        />
      </div>

      {showAddModal && canManageSlots && (
        <AddEditSlotModal
          slot={editingSlot}
          games={games}
          onSave={handleSaveSlot}
          onClose={() => {
            setShowAddModal(false);
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
};

// Add/Edit Slot Modal Component — BottomSheet on mobile, centered on desktop
const AddEditSlotModal = ({ slot, games, onSave, onClose }) => {
  const { isMobile } = useViewport();
  const [formData, setFormData] = useState({
    label: slot?.label || '',
    start_time: slot?.start_time || '11:00',
    end_time: slot?.end_time || '11:30',
    duration: slot?.duration || '30 min',
    game: slot?.game || 'all',
    day: slot?.day || 'all',
    max_players: slot?.max_players || getDefaultMaxPlayers(slot?.game || 'all', games),
    active: slot?.active !== false,
  });

  useEffect(() => {
    const defaultMaxPlayers = getDefaultMaxPlayers(formData.game, games);
    setFormData((current) => ({
      ...current,
      max_players: current.game === 'all' ? current.max_players : defaultMaxPlayers,
    }));
  }, [formData.game, games]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const formBody = (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
          Slot Name <span style={{ color: 'var(--danger)' }}>*</span>
        </label>
        <input
          className="clay-input"
          value={formData.label}
          onChange={(e) => setFormData({ ...formData, label: e.target.value })}
          placeholder="e.g., Slot 13"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
            Start Time <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="time"
            className="clay-input"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
            End Time <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="time"
            className="clay-input"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
          Applies To Game
        </label>
        <select
          className="clay-select"
          value={formData.game}
          onChange={(e) => {
            const nextGame = e.target.value;
            setFormData((current) => ({
              ...current,
              game: nextGame,
              max_players: nextGame === 'all' ? current.max_players : getDefaultMaxPlayers(nextGame, games),
            }));
          }}
        >
          <option value="all">All Games</option>
          {games.map(game => (
            <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
          Applies To Day
        </label>
        <select
          className="clay-select"
          value={formData.day}
          onChange={(e) => setFormData({ ...formData, day: e.target.value })}
        >
          <option value="all">All Days</option>
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
            Max Players
          </label>
          <input
            type="number"
            className="clay-input"
            value={formData.max_players}
            onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value, 10) || getDefaultMaxPlayers(formData.game, games) })}
            min="1"
            max="10"
            disabled={String(formData.game).toLowerCase() === 'chess'}
          />
          {String(formData.game).toLowerCase() === 'chess' && (
            <div style={{ marginTop: '4px', fontSize: '0.65rem', color: 'var(--muted)', fontFamily: "'Lufga', sans-serif" }}>
              Chess is fixed to 2 players.
            </div>
          )}
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
            Duration
          </label>
          <select
            className="clay-select"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          >
            <option value="30 min">30 min</option>
            <option value="45 min">45 min</option>
            <option value="60 min">60 min</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '4px', fontFamily: "'Lufga', sans-serif" }}>
          Active
        </label>
        <select
          className="clay-select"
          value={formData.active ? 'true' : 'false'}
          onChange={(e) => setFormData({ ...formData, active: e.target.value === 'true' })}
        >
          <option value="true">✅ Active</option>
          <option value="false">❌ Inactive</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <button type="button" className="clay-btn" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="clay-btn clay-btn-primary">
          💾 Save Slot
        </button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open
        onClose={onClose}
        title={slot ? '✏️ Edit Slot' : '➕ Add New Slot'}
        icon="⏰"
      >
        {formBody}
      </BottomSheet>
    );
  }

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div className="clay" style={{
        width: '100%',
        maxWidth: 500,
        padding: '24px',
        borderRadius: '32px',
        maxHeight: '90vh',
        overflowY: 'auto',
        background: 'var(--bg-surface-strong)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', fontFamily: LUFGA_BOLD }}>
            {slot ? '✏️ Edit Slot' : '➕ Add New Slot'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--muted)' }}
          >
            ✕
          </button>
        </div>
        {formBody}
      </div>
    </div>,
    document.body
  );
};

export default SlotMasterPage;
