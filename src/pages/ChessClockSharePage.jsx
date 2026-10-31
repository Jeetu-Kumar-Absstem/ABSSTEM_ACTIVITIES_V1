import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../utils/supabase';

const formatClock = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export default function ChessClockSharePage() {
  const { token } = useParams();
  const [clock, setClock] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const completeMove = async (side) => {
    if (!clock || clock.status !== 'running' || clock.chess_active_side !== side) return;
    const { data, error: moveError } = await supabase.rpc('public_chess_clock_move', { p_share_token: token });
    if (!moveError && data) setClock(data);
  };

  useEffect(() => {
    // Browsers only allow orientation locking in some fullscreen/PWA modes;
    // when allowed, prefer landscape for the chess-clock experience.
    if (typeof window !== 'undefined' && window.screen?.orientation?.lock) {
      window.screen.orientation.lock('landscape').catch(() => {});
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from('tournament_match_clocks').select('*').eq('share_token', token).maybeSingle()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError || !data) setError('This stopwatch link is invalid or unavailable.');
        else setClock(data);
        setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const channel = supabase.channel(`public-chess-clock-${token}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_match_clocks', filter: `share_token=eq.${token}` }, (payload) => setClock(payload.new || null))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token]);

  useEffect(() => {
    if (!clock || clock.status !== 'running') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [clock]);

  const values = useMemo(() => {
    if (!clock) return { a: 0, b: 0 };
    let a = Number(clock.chess_remaining_a_seconds || 0);
    let b = Number(clock.chess_remaining_b_seconds || 0);
    if (clock.status === 'running' && clock.started_at) {
      const elapsed = Math.max(0, Math.floor((now - new Date(clock.started_at).getTime()) / 1000));
      if (clock.chess_active_side === 'A') a = Math.max(0, a - elapsed);
      if (clock.chess_active_side === 'B') b = Math.max(0, b - elapsed);
    }
    return { a, b };
  }, [clock, now]);

  if (loading) return <div style={styles.shell}><div style={styles.message}>Loading chess clock…</div></div>;
  if (error || !clock) return <div style={styles.shell}><div style={styles.message}>{error || 'Clock unavailable.'}</div></div>;

  const activeSide = clock.status === 'running' ? clock.chess_active_side : null;
  return <main className="chess-clock-share-shell" style={styles.shell}><section className="chess-clock-share-card" style={styles.card}>
    <div style={styles.header}><div style={styles.eyebrow}>♟ LIVE CHESS CLOCK</div><h1 style={styles.title}>{clock.public_match_title || 'Chess match'}</h1><div style={styles.status}>{clock.status === 'running' ? '● LIVE' : clock.status.toUpperCase()}</div></div>
    <div className="chess-clock-share-board" style={styles.board}>{['A', 'B'].map((side) => { const active = activeSide === side; return <div key={side} style={{ ...styles.player, ...(active ? styles.active : {}) }}><div style={styles.playerLabel}>{side === 'A' ? (clock.public_side_a || 'Player A') : (clock.public_side_b || 'Player B')}</div><div style={styles.time}>{formatClock(side === 'A' ? values.a : values.b)}</div><div style={styles.turn}>{active ? 'YOUR TURN' : 'WAITING'}</div></div>; })}</div>
    <div className="chess-clock-move-buttons">
      {['A', 'B'].map((side) => {
        const enabled = clock.status === 'running' && activeSide === side;
        return <button key={side} className="chess-clock-move-button" onClick={() => completeMove(side)} disabled={!enabled} style={{ ...styles.moveButton, opacity: enabled ? 1 : .45 }}>
          ✓ Move Complete
        </button>;
      })}
    </div>
  </section></main>;
}

const styles = {
  shell: { minHeight: '100vh', padding: 16, display: 'grid', placeItems: 'center', background: 'linear-gradient(145deg, #071326, #16375f)', fontFamily: 'Inter, system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 760, overflow: 'hidden', borderRadius: 24, background: '#f7f9fc', boxShadow: '0 22px 60px rgba(0,0,0,.28)' },
  header: { padding: '24px 20px 20px', color: '#fff', background: 'linear-gradient(120deg, #173d73, #245a9b)' },
  eyebrow: { fontSize: 12, fontWeight: 800, letterSpacing: '.12em', opacity: .8 },
  title: { margin: '9px 0 5px', fontSize: 'clamp(1.2rem, 5vw, 2rem)' },
  status: { fontSize: 12, fontWeight: 800, opacity: .9 },
  board: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, padding: 12 },
  player: { minWidth: 0, padding: '14px 8px', borderRadius: 18, textAlign: 'center', background: '#e8edf4', color: '#14294d' },
  active: { color: '#fff', background: 'linear-gradient(145deg, #173d73, #245a9b)', boxShadow: '0 10px 24px rgba(23,61,115,.24)' },
  playerLabel: { minHeight: 42, display: 'grid', placeItems: 'center', fontSize: 'clamp(.75rem, 3vw, 1rem)', fontWeight: 800 },
  time: { margin: '8px 0', fontFamily: 'Roboto Mono, monospace', fontSize: 'clamp(2rem, 9vw, 4rem)', lineHeight: 1, fontWeight: 800, letterSpacing: '.04em' },
  turn: { fontSize: 11, fontWeight: 800, letterSpacing: '.1em', opacity: .75 },
  moveButton: { minHeight: 64, border: 0, borderRadius: 16, color: '#fff', background: '#173d73', fontSize: 'clamp(.85rem, 3.5vw, 1.1rem)', fontWeight: 900, cursor: 'pointer', boxShadow: '0 10px 26px rgba(0,0,0,.35)' },
  message: { maxWidth: 420, padding: 24, borderRadius: 18, color: '#14294d', background: '#fff', textAlign: 'center', fontWeight: 700 },
};
