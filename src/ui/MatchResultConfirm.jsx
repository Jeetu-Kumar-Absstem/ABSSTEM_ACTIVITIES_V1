// src/ui/MatchResultConfirm.jsx
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const TEAM_SIZES = {
  carrom: 2,
  chess: 1,
};

const getPlayerKey = (player) => String(player?.user_id || player?.employee_id || player?.name || '');

const getDefaultTeams = (players, teamSize) => {
  const teamA = players.slice(0, teamSize).map(getPlayerKey);
  const teamB = players.slice(teamSize, teamSize * 2).map(getPlayerKey);
  return { teamA, teamB };
};

const MatchResultConfirm = ({ open, game, day, slotId, slotLabel, players = [], existingResult, onCancel, onConfirm }) => {
  const teamSize = TEAM_SIZES[String(game || '').toLowerCase()] || 1;
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [result, setResult] = useState('draw');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const existingTeamA = Array.isArray(existingResult?.team_a_players)
      ? existingResult.team_a_players.map(getPlayerKey)
      : [];
    const existingTeamB = Array.isArray(existingResult?.team_b_players)
      ? existingResult.team_b_players.map(getPlayerKey)
      : [];

    if (existingTeamA.length === teamSize && existingTeamB.length === teamSize) {
      setTeamA(existingTeamA);
      setTeamB(existingTeamB);
    } else {
      const defaults = getDefaultTeams(players, teamSize);
      setTeamA(defaults.teamA);
      setTeamB(defaults.teamB);
    }

    setResult(existingResult?.result || 'draw');
    setError('');
  }, [existingResult, open, players, teamSize]);

  const playerLookup = useMemo(() => {
    const map = new Map();
    players.forEach((player) => {
      map.set(getPlayerKey(player), player);
    });
    return map;
  }, [players]);

  if (!open) return null;

  const updateTeam = (setter, index, value) => {
    setter((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const renderTeamSelect = (teamName, values, setter) => (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a3c6e' }}>{teamName}</div>
      {Array.from({ length: teamSize }).map((_, index) => {
        const currentValue = values[index] || '';
        const usedByOtherTeam = values === teamA ? teamB : teamA;
        const options = players.filter((player) => {
          const playerKey = getPlayerKey(player);
          return playerKey === currentValue || !usedByOtherTeam.includes(playerKey);
        });

        return (
          <select
            key={`${teamName}-${index}`}
            className="clay-select"
            value={currentValue}
            onChange={(e) => updateTeam(setter, index, e.target.value)}
          >
            <option value="">Select player</option>
            {options.map((player) => {
              const playerKey = getPlayerKey(player);
              return (
                <option key={playerKey} value={playerKey}>
                  {player.name}
                </option>
              );
            })}
          </select>
        );
      })}
    </div>
  );

  const handleConfirm = () => {
    const teamAComplete = teamA.every(Boolean) && new Set(teamA).size === teamA.length;
    const teamBComplete = teamB.every(Boolean) && new Set(teamB).size === teamB.length;
    const distinctTeams = teamA.every((player) => !teamB.includes(player));

    if (!teamAComplete || !teamBComplete) {
      setError(`Please choose ${teamSize} player(s) for each team.`);
      return;
    }

    if (!distinctTeams) {
      setError('Each player can only appear on one team.');
      return;
    }

    const teamAPlayers = teamA.map((key) => playerLookup.get(key)).filter(Boolean);
    const teamBPlayers = teamB.map((key) => playerLookup.get(key)).filter(Boolean);

    if (teamAPlayers.length !== teamSize || teamBPlayers.length !== teamSize) {
      setError('One or more selected players are missing from this slot.');
      return;
    }

    if (result !== 'draw' && !['team_a', 'team_b'].includes(result)) {
      setError('Please choose a valid result.');
      return;
    }

    setError('');
    onConfirm({
      day,
      slotId,
      slotLabel,
      teamAPlayers,
      teamBPlayers,
      result,
    });
  };

  const dialog = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '760px',
          maxWidth: '100%',
          background: 'white',
          borderRadius: '28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 12px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#8888aa' }}>Submit match result</div>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.1rem', color: '#1e1e2f' }}>{game.toUpperCase()} - {day} / {slotLabel}</h3>
          </div>
          <button className="clay-btn" onClick={onCancel}>x</button>
        </div>

        <div style={{ padding: '0 24px 20px', display: 'grid', gap: '16px' }}>
          <div className="clay-soft" style={{ padding: '12px 14px', borderRadius: '18px', background: 'rgba(26,60,110,0.04)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3c6e' }}>Who can submit</div>
            <div style={{ fontSize: '0.72rem', color: '#556' }}>
              Only players from this slot should submit or edit the result. Points are awarded automatically:
              4 for the winning team, 1 for the losing team, and 2 each for a draw.
            </div>
          </div>

          {players.length < teamSize * 2 && (
            <div style={{ padding: '12px 14px', borderRadius: '16px', background: '#fff3cd', color: '#7a5a00', fontSize: '0.72rem' }}>
              This slot currently needs {teamSize * 2} players before a result can be saved.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {renderTeamSelect('Team A', teamA, setTeamA)}
            {renderTeamSelect('Team B', teamB, setTeamB)}
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a3c6e' }}>Result</div>
            <select className="clay-select" value={result} onChange={(e) => setResult(e.target.value)}>
              <option value="team_a">Team A won</option>
              <option value="team_b">Team B won</option>
              <option value="draw">Draw</option>
            </select>
          </div>

          {error && (
            <div style={{ color: '#c62828', fontSize: '0.76rem', background: '#ffebee', padding: '10px 12px', borderRadius: '14px' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '16px 24px 22px',
          borderTop: '1px solid rgba(200,210,230,0.4)',
          background: 'rgba(255,255,255,0.98)',
        }}>
          <button className="clay-btn" onClick={onCancel}>Cancel</button>
          <button className="clay-btn clay-btn-primary" onClick={handleConfirm} disabled={players.length < teamSize * 2}>
            Save Result
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default MatchResultConfirm;
