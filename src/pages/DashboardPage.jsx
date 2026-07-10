// src/pages/DashboardPage.jsx
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { GAMES, SLOTS } from '../utils/constants';
import {
  buildEmployeeLeaderboard,
  filterBookingsToWeek,
  formatDate,
  getDayName,
  getWeekRange,
} from '../utils/helpers';

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
  } = useApp();

  const selectedGameRecord = games.find((game) => String(game.id) === String(selectedGame) || String(game.name).toLowerCase() === String(selectedGame).toLowerCase())
    || GAMES.find((game) => String(game.id) === String(selectedGame))
    || GAMES[0];

  const weekBookings = useMemo(() => filterBookingsToWeek(bookings, currentDate), [bookings, currentDate]);

  // Filter matchResults to only the selected game so leaderboard & top players are game-scoped
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

  const activeBanCount = bans.filter(
    (ban) =>
      ban.active !== false &&
      new Date(ban.until_date) > new Date() &&
      (String(ban.game) === String(selectedGameRecord.id) || ban.game === selectedGameRecord.name || String(ban.game).toLowerCase() === String(selectedGameRecord.name || '').toLowerCase() || ban.game === 'All Games')
  ).length;

  const topPlayers = leaderboard.slice(0, 4);
  const leader = leaderboard[0];
  const totalEmployees = leaderboard.length;

  return (
    <div style={{ display: 'grid', gap: '18px' }}>
      <section
        className="clay-card"
        style={{
          padding: '24px',
          borderRadius: '32px',
          background: 'linear-gradient(135deg, rgba(26,60,110,0.98), rgba(17,55,104,0.92))',
          color: 'white',
          boxShadow: '0 20px 48px rgba(26,60,110,0.22)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', opacity: 0.78, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Planning Dashboard
            </div>
            <h1 style={{ margin: '8px 0 6px', fontSize: '2rem', lineHeight: 1.05 }}>
              Employee activity at a glance
            </h1>
            <div style={{ fontSize: '0.86rem', opacity: 0.88 }}>
              Week view: {weekLabel} | Today: {formatDate(currentDate)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {GAMES.map((game) => {
              const active = String(selectedGame) === String(game.id) || String(selectedGame).toLowerCase() === String(game.name).toLowerCase();
              return (
                <button
                  key={game.id}
                  type="button"
                  onClick={() => setSelectedGame(String(game.id))}
                  style={{
                    border: '1px solid rgba(255,255,255,0.22)',
                    background: active ? 'white' : 'rgba(255,255,255,0.08)',
                    color: active ? '#1a3c6e' : 'white',
                    padding: '10px 16px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  {game.name}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        <MetricCard label="Today's slots" value={selectedGameBookings.length} caption={`${selectedGameRecord.name} bookings on ${currentDayName}`} accent="#1a3c6e" />
        <MetricCard label="Leaderboard leader" value={leader ? leader.points : 0} caption={leader ? `${leader.name} is ranked #${leader.rank}` : 'No match results yet'} accent="#1b5e20" />
        <MetricCard label="Active bans" value={activeBanCount} caption={`${selectedGameRecord.name} scope`} accent="#c62828" />
        <MetricCard label="Employees" value={totalEmployees} caption="Loaded from employee master" accent="#f9a825" />
      </section>

      <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top 4 Board</div>
            <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', color: '#1e1e2f' }}>Highest scoring players — {selectedGameRecord.name}</h2>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666' }}>
            Sorted by points, then wins
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {topPlayers.length > 0 ? topPlayers.map((player) => (
            <div
              key={`${player.employee_id || player.name}-${player.rank}`}
              className="clay-soft"
              style={{
                padding: '16px',
                borderRadius: '22px',
                borderTop: `4px solid ${player.rank === 1 ? '#1b5e20' : player.rank === 2 ? '#1a3c6e' : player.rank === 3 ? '#f9a825' : '#8e44ad'}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,255,0.94))',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Rank #{player.rank}
              </div>
              <div style={{ marginTop: '6px', fontSize: '1rem', fontWeight: 800, color: '#1e1e2f' }}>
                {player.name}
              </div>
              <div style={{ marginTop: '4px', fontSize: '0.7rem', color: '#667' }}>
                {player.employee_id || 'N/A'} | {player.department || 'General'}
              </div>
              <div style={{ marginTop: '12px', fontSize: '1.6rem', fontWeight: 800, color: '#1a3c6e' }}>
                {player.points}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#777' }}>points</div>
            </div>
          )) : (
            <div style={{ padding: '18px', color: '#8888aa', fontSize: '0.8rem' }}>
              No leaderboard data for {selectedGameRecord.name} yet.
            </div>
          )}
        </div>
      </section>

      <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
        <div style={{ fontSize: '0.72rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Today&apos;s bookings
        </div>
        <h2 style={{ margin: '6px 0 14px', fontSize: '1.05rem', color: '#1e1e2f' }}>
          {selectedGameRecord.name} on {currentDayName}
        </h2>

        {(() => {
          const bookedSlots = SLOTS.map((slot) => ({
            slot,
            players: (dayBookings[slot.id] || []).filter(
              (booking) => String(booking.game) === String(selectedGameRecord.id) || booking.game === selectedGameRecord.name
            ),
          })).filter(({ players }) => players.length > 0);

          return bookedSlots.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {bookedSlots.map(({ slot, players }) => (
                <div key={slot.id} style={{ padding: '10px 12px', borderRadius: '16px', background: 'rgba(26,60,110,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e1e2f' }}>{slot.label}</div>
                      <div style={{ fontSize: '0.64rem', color: '#8888aa' }}>{slot.time}</div>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1a3c6e' }}>
                      {players.length}
                    </div>
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {players.map((player) => (
                      <span key={`${slot.id}-${player.booking_id || player.user_id}-${player.name}`} className="clay-badge clay-badge-navy">
                        {player.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '18px', color: '#8888aa', fontSize: '0.8rem' }}>
              No bookings for {selectedGameRecord.name} today.
            </div>
          );
        })()}
      </section>

      <section className="clay-card" style={{ padding: '20px', borderRadius: '28px', background: 'rgba(255,255,255,0.96)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#01010f', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Leaderboard
            </div>
            <h2 style={{ margin: '6px 0 0', fontSize: '1.05rem', color: '#1e1e2f' }}>
               Points and Ranking
            </h2>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#666' }}>
            Points: win = 4, draw = 2, loss = 1
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: 'rgba(12, 83, 189, 0.05)' }}>
                <th style={thStyle}>Rank</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Employee ID</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Played</th>
                <th style={thStyle}>Wins</th>
                <th style={thStyle}>Losses</th>
                <th style={thStyle}>Draws</th>
                <th style={thStyle}>Points</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row) => (
                <tr key={`${row.employee_id || row.name}-${row.rank}`} style={{ borderBottom: '1px solid rgba(200,210,230,0.2)' }}>
                  <td style={tdStyle}>
                    <span className="clay-badge clay-badge-navy">#{row.rank}</span>
                  </td>
                  <td style={tdStyle}>{row.name}</td>
                  <td style={tdStyle}>{row.employee_id || 'N/A'}</td>
                  <td style={tdStyle}>{row.department || 'General'}</td>
                  <td style={tdStyle}>{row.gamesPlayed}</td>
                  <td style={tdStyle}>{row.wins}</td>
                  <td style={tdStyle}>{row.losses}</td>
                  <td style={tdStyle}>{row.draws}</td>
                  <td style={tdStyle}>
                    <strong style={{ color: '#1a3c6e' }}>{row.points}</strong>
                  </td>
                </tr>
              ))}
              {leaderboard.length === 0 && (
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
    </div>
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
        padding: '18px',
        borderRadius: '24px',
        background: 'rgba(255,255,255,0.96)',
        borderTop: `4px solid ${accent}`,
        borderRight: `2px solid ${hovered ? accent : 'transparent'}`,
        borderBottom: `2px solid ${hovered ? accent : 'transparent'}`,
        borderLeft: `2px solid ${hovered ? accent : 'transparent'}`,
        transform: hovered ? 'translateY(-5px) scale(1.03)' : 'translateY(0) scale(1)',
        boxShadow: hovered ? `0 8px 20px ${accent}33` : 'none',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: '0.68rem', color: '#8888aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div style={{ marginTop: '8px', fontSize: '1.9rem', fontWeight: 800, color: accent, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ marginTop: '8px', fontSize: '0.72rem', color: '#667' }}>
        {caption}
      </div>
    </div>
  );
};

const thStyle = {
  padding: '8px 10px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#444466',
};

const tdStyle = {
  padding: '8px 10px',
};

export default DashboardPage;