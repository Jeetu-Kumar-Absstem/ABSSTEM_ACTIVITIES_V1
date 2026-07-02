// src/pages/ProfilePage.jsx
import { useState } from 'react';
import { useApp } from '../context/AppContext';

const StatCard = ({ title, value, caption, accent = '#1a3c6e' }) => (
  <div
    className="clay-card"
    style={{
      padding: '20px',
      borderRadius: '28px',
      borderTop: `4px solid ${accent}`,
      background: 'rgba(255,255,255,0.94)',
      boxShadow: '0 12px 35px rgba(26,60,110,0.08)',
    }}
  >
    <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {title}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, color: accent, marginTop: '6px', lineHeight: 1 }}>
      {value}
    </div>
    <div style={{ fontSize: '0.72rem', color: '#666', marginTop: '8px' }}>
      {caption}
    </div>
  </div>
);

const ProfilePage = () => {
  const { currentUser, setActiveTab, games, getPlayerGameStats } = useApp();
  const [selectedGame, setSelectedGame] = useState('carrom');

  const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User';
  const empId = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || currentUser?.user_metadata?.empId || '';
  const department = currentUser?.user_metadata?.department || 'General';
  const visibleGames = games.filter((game) => ['carrom', 'chess'].includes(String(game.id)));
  const activeGameId = visibleGames.some((game) => game.id === selectedGame) ? selectedGame : (visibleGames[0]?.id || 'carrom');

  const stats = getPlayerGameStats(activeGameId, empId);
  const totalDecisions = stats.wins + stats.losses + stats.draws;
  const winPercent = totalDecisions ? Math.round((stats.wins / totalDecisions) * 100) : 0;
  const lossPercent = totalDecisions ? Math.round((stats.losses / totalDecisions) * 100) : 0;
  const drawPercent = Math.max(0, 100 - winPercent - lossPercent);
  const selectedGameRecord = visibleGames.find((game) => game.id === activeGameId);
  const pieGradient = totalDecisions
    ? `conic-gradient(#1b5e20 0 ${winPercent}%, #c62828 ${winPercent}% ${winPercent + lossPercent}%, #f9a825 ${winPercent + lossPercent}% 100%)`
    : 'conic-gradient(#d7dce8 0 100%)';

  const perGameRows = visibleGames.map((game) => {
    const gameStats = getPlayerGameStats(game.id, empId);
    return {
      ...gameStats,
      game,
    };
  });

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <div
        className="clay-card"
        style={{
          padding: '24px',
          borderRadius: '32px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98), rgba(244,247,255,0.92))',
          boxShadow: '0 18px 50px rgba(26,60,110,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#8888aa', marginBottom: '4px' }}>My Profile</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e1e2f', margin: 0 }}>{userName}</h1>
            <div style={{ marginTop: '8px', display: 'flex', gap: '10px', flexWrap: 'wrap', color: '#667' }}>
              <span className="clay-badge clay-badge-navy">{empId || 'N/A'}</span>
              <span className="clay-badge clay-badge-green">{department}</span>
            </div>
          </div>

          <button className="clay-btn clay-btn-primary" onClick={() => setActiveTab('booking')}>
            Back to Booking
          </button>
        </div>
      </div>

      <div className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.92)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#8888aa' }}>Select Game</div>
            <div style={{ fontSize: '0.95rem', color: '#444466', marginTop: '4px' }}>
              Choose Carrom or Chess to view that game&apos;s results.
            </div>
          </div>
          <select
            className="clay-select"
            value={activeGameId}
            onChange={(e) => setSelectedGame(e.target.value)}
            style={{ minWidth: '220px' }}
          >
            {visibleGames.map((game) => (
              <option key={game.id} value={game.id}>
                {game.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          title="Games Played"
          value={stats.gamesPlayed}
          caption={`Results captured for ${selectedGameRecord?.name || 'this game'}.`}
          accent="#1a3c6e"
        />
        <StatCard
          title="Wins"
          value={stats.wins}
          caption={`${winPercent}% of completed matches.`}
          accent="#1b5e20"
        />
        <StatCard
          title="Losses"
          value={stats.losses}
          caption={`${lossPercent}% of completed matches.`}
          accent="#c62828"
        />
        <StatCard
          title="Winning Streak"
          value={stats.currentWinStreak}
          caption={`Best streak: ${stats.bestWinStreak}`}
          accent="#f9a825"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 320px) 1fr', gap: '16px', alignItems: 'stretch' }}>
        <div className="clay-card" style={{ padding: '22px', borderRadius: '28px', background: 'rgba(255,255,255,0.92)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1e2f', marginBottom: '14px' }}>
            Outcome Split
          </div>
          <div style={{ display: 'grid', placeItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '220px',
                height: '220px',
                borderRadius: '50%',
                background: pieGradient,
                position: 'relative',
                boxShadow: 'inset 0 0 0 12px rgba(255,255,255,0.9), 0 18px 40px rgba(26,60,110,0.12)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'white',
                  display: 'grid',
                  placeItems: 'center',
                  textAlign: 'center',
                  boxShadow: '0 8px 26px rgba(26,60,110,0.08)',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e1e2f', lineHeight: 1 }}>
                    {stats.points}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#777' }}>Points</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px', width: '100%' }}>
              <LegendRow label="Wins" value={`${winPercent}%`} color="#1b5e20" />
              <LegendRow label="Losses" value={`${lossPercent}%`} color="#c62828" />
              <LegendRow label="Draws" value={`${drawPercent}%`} color="#f9a825" />
            </div>
          </div>
        </div>

        <div className="clay-card" style={{ padding: '22px', borderRadius: '28px', background: 'rgba(255,255,255,0.92)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1e2f', marginBottom: '14px' }}>
            Match Summary
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <MiniStat label="Wins" value={stats.wins} color="#1b5e20" />
            <MiniStat label="Losses" value={stats.losses} color="#c62828" />
            <MiniStat label="Draws" value={stats.draws} color="#f9a825" />
            <MiniStat label="Points" value={stats.points} color="#1a3c6e" />
          </div>

          <div style={{ marginTop: '18px', padding: '14px 16px', borderRadius: '20px', background: 'rgba(26,60,110,0.04)', color: '#445' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1a3c6e', marginBottom: '6px' }}>
              Current selection
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e1e2f' }}>{selectedGameRecord?.name || 'Game'}</div>
            <div style={{ fontSize: '0.74rem', marginTop: '4px' }}>
              Points are calculated from saved match results only. Winning team members receive 4 points each, losing team members receive 1 point each, and both teams get 2 points for a draw.
            </div>
          </div>
        </div>
      </div>

      <div className="clay-card" style={{ padding: '22px', borderRadius: '28px', background: 'rgba(255,255,255,0.92)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e1e2f', marginBottom: '14px' }}>
          Game Summary
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: 'rgba(26,60,110,0.05)' }}>
                <th style={thStyle}>Game</th>
                <th style={thStyle}>Played</th>
                <th style={thStyle}>Wins</th>
                <th style={thStyle}>Losses</th>
                <th style={thStyle}>Draws</th>
                <th style={thStyle}>Winning Streak</th>
                <th style={thStyle}>Best Streak</th>
                <th style={thStyle}>Points</th>
              </tr>
            </thead>
            <tbody>
              {perGameRows.map((row) => (
                <tr key={row.game.id} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={tdStyle}>{row.game.name}</td>
                  <td style={tdStyle}>{row.gamesPlayed}</td>
                  <td style={tdStyle}>{row.wins}</td>
                  <td style={tdStyle}>{row.losses}</td>
                  <td style={tdStyle}>{row.draws}</td>
                  <td style={tdStyle}>{row.currentWinStreak}</td>
                  <td style={tdStyle}>{row.bestWinStreak}</td>
                  <td style={tdStyle}>{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const LegendRow = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
      <span style={{ fontSize: '0.75rem', color: '#445' }}>{label}</span>
    </div>
    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e1e2f' }}>{value}</span>
  </div>
);

const MiniStat = ({ label, value, color }) => (
  <div
    style={{
      padding: '14px',
      borderRadius: '18px',
      background: 'rgba(26,60,110,0.04)',
      borderTop: `3px solid ${color}`,
    }}
  >
    <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color, marginTop: '4px', lineHeight: 1 }}>{value}</div>
  </div>
);

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 600,
  color: '#444466',
};

const tdStyle = {
  padding: '8px 10px',
};

export default ProfilePage;
