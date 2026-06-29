// src/pages/SlotMasterPage.jsx
import React, { useState, useEffect } from 'react';
import { SLOTS, GAMES } from '../utils/constants';
import { useToast } from '../context/ToastContext';
import { supabase } from '../utils/supabase';

const SlotMasterPage = () => {
  const [slots, setSlots] = useState(SLOTS);
  const [games, setGames] = useState(GAMES);
  const [selectedGame, setSelectedGame] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const { showToast } = useToast();

  // Load slots from database
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

  // Load games from database
  const loadGames = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setGames(data);
      }
    } catch (err) {
      console.error('Error loading games:', err);
      setGames(GAMES);
    }
  };

  useEffect(() => {
    loadSlots();
    loadGames();
  }, []);

  // Filter slots based on selected game and day
  const getFilteredSlots = () => {
    let filtered = slots;
    
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

  // Handle delete slot
  const handleDeleteSlot = async (slotId) => {
    if (!confirm('Are you sure you want to delete this slot?')) return;
    
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

  // Handle add/edit slot
  const handleSaveSlot = async (slotData) => {
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

  // Get game name by ID
  const getGameName = (gameId) => {
    if (!gameId || gameId === 'all') return 'All Games';
    const game = games.find(g => String(g.id) === String(gameId));
    return game ? game.name : gameId;
  };

  return (
    <div className="clay-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>
          Slot Master — Time Slot Configuration
        </h2>
        <button 
          className="clay-btn clay-btn-primary" 
          onClick={() => {
            setEditingSlot(null);
            setShowAddModal(true);
          }}
        >
          + Add Slot
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Game:
          <select 
            className="clay-select" 
            style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            <option value="all">All Games</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
            ))}
          </select>
        </label>
        
        <label style={{ fontSize: '0.7rem', color: '#8888aa', display: 'flex', alignItems: 'center', gap: '6px' }}>
          Day:
          <select 
            className="clay-select" 
            style={{ padding: '6px 14px', fontSize: '0.7rem', width: 'auto' }}
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

      <div className="clay-soft" style={{ 
        padding: '6px 14px', 
        borderRadius: '20px', 
        display: 'inline-block', 
        fontSize: '0.7rem', 
        marginBottom: '12px',
        color: '#444466',
      }}>
        Total Record(s) Found: {filteredSlots.length} slots
        {selectedGame !== 'all' && ` · Game: ${getGameName(selectedGame)}`}
        {selectedDay !== 'all' && ` · Day: ${selectedDay}`}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
          <thead>
            <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>S.No</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Slot Code</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Slot Name</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Time</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Duration</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Applies To</th>
              <th style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 500, color: '#444466' }}>Max</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Active</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, color: '#444466' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
                  ⏳ Loading slots...
                </td>
              </tr>
            ) : filteredSlots.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#8888aa' }}>
                  No slots found. Click "Add Slot" to create one.
                </td>
              </tr>
            ) : (
              filteredSlots.map((slot, index) => (
                <tr key={slot.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={{ padding: '8px 10px', color: '#444466' }}>{index + 1}</td>
                  <td style={{ padding: '8px 10px', color: '#1a3c6e', fontWeight: 500 }}>
                    SLT-{String(slot.id || index + 1).padStart(2, '0')}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#1e1e2f', fontWeight: 500 }}>
                    {slot.label || `Slot ${index + 1}`}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#444466' }}>
                    {slot.time || `${slot.start_time || '11:00'}–${slot.end_time || '11:30'}`}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#444466' }}>
                    {slot.duration || '30 min'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span className="clay-badge clay-badge-navy">
                      {slot.game ? getGameName(slot.game) : 'All Games'} · {slot.day ? slot.day : 'Mon–Fri'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#1e1e2f' }}>
                    {slot.max_players || 4}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span className={slot.active === false ? 'clay-badge clay-badge-red' : 'clay-badge clay-badge-green'}>
                      {slot.active === false ? '✕ Inactive' : '✓ Active'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="clay-btn" 
                        style={{ padding: '4px 10px', fontSize: '0.6rem' }}
                        onClick={() => {
                          setEditingSlot(slot);
                          setShowAddModal(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button 
                        className="clay-btn" 
                        style={{ padding: '4px 10px', fontSize: '0.6rem', color: '#e53935' }}
                        onClick={() => handleDeleteSlot(slot.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Slot Modal */}
      {showAddModal && (
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

// Add/Edit Slot Modal Component
const AddEditSlotModal = ({ slot, games, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    label: slot?.label || '',
    start_time: slot?.start_time || '11:00',
    end_time: slot?.end_time || '11:30',
    duration: slot?.duration || '30 min',
    game: slot?.game || 'all',
    day: slot?.day || 'all',
    max_players: slot?.max_players || 4,
    active: slot?.active !== false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
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
        background: 'rgba(255,255,255,0.95)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1e1e2f' }}>
            {slot ? '✏️ Edit Slot' : '➕ Add New Slot'}
          </h3>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              fontSize: '1.2rem', 
              cursor: 'pointer', 
              color: '#8888aa' 
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Slot Name <span style={{ color: '#e53935' }}>*</span>
            </label>
            <input
              className="clay-input"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Slot 13"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                Start Time <span style={{ color: '#e53935' }}>*</span>
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
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                End Time <span style={{ color: '#e53935' }}>*</span>
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
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
              Applies To Game
            </label>
            <select
              className="clay-select"
              value={formData.game}
              onChange={(e) => setFormData({ ...formData, game: e.target.value })}
            >
              <option value="all">All Games</option>
              {games.map(game => (
                <option key={game.id} value={game.id}>{game.icon} {game.name}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
                Max Players
              </label>
              <input
                type="number"
                className="clay-input"
                value={formData.max_players}
                onChange={(e) => setFormData({ ...formData, max_players: parseInt(e.target.value) || 4 })}
                min="1"
                max="10"
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
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
            <label style={{ fontSize: '0.75rem', fontWeight: 500, color: '#444466', display: 'block', marginBottom: '4px' }}>
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
      </div>
    </div>
  );
};

export default SlotMasterPage;
