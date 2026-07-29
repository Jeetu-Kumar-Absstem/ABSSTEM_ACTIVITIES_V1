// src/pages/ProfilePage.jsx
import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useCertificate } from '../hooks/useCertificate';
import { useProfilePdf } from '../hooks/useProfilePdf';
import { useToast } from '../context/ToastContext';
import { GAMES } from '../utils/constants';
import useViewport from '../hooks/useViewport';
import MobileTable from '../components/common/MobileTable';
import {
  User,
  Download,
  ArrowLeft,
  Trophy,
  Star,
  Gamepad2,
  TrendingUp,
  Medal,
  AlertCircle,
  FileText,
  Calendar,
  ChevronDown,
  ChevronRight,
  Target
} from 'lucide-react';

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

const StatMiniCard = ({ label, value, icon: Icon, color, caption }) => (
  <div className="clay-card" style={{ padding: '16px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
    <div style={{ color: color, background: `${color}15`, padding: '8px', borderRadius: '12px', marginBottom: '4px' }}>
      {Icon && <Icon size={20} />}
    </div>
    <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1 }}>{value}</div>
    {caption && <div style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: '2px' }}>{caption}</div>}
  </div>
);

const ProfilePage = () => {
  const { currentUser, setActiveTab, getPlayerGameStats, getCertificateLog, getEmployeeName } = useApp();
  const { generateCertificate } = useCertificate();
  const { generateProfileSummary } = useProfilePdf();
  const { isMobile } = useViewport();
  const { showToast } = useToast();
  const [selectedGame, setSelectedGame] = useState('carrom');
  const [certLog, setCertLog] = useState([]);
  const [certLoading, setCertLoading] = useState(true);
  const [certPrinting, setCertPrinting] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const userName = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'User';
  const empId = currentUser?.user_metadata?.emp_id || currentUser?.user_metadata?.employee_code || currentUser?.user_metadata?.empId || '';
  const department = currentUser?.user_metadata?.department || 'General';
  const initial = userName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!empId) { setCertLoading(false); return; }
    setCertLoading(true);
    getCertificateLog(empId).then(rows => {
      setCertLog(rows);
      setCertLoading(false);
    });
  }, [empId]);

  const visibleGames = GAMES.filter((game) => ['carrom', 'chess'].includes(String(game.id)));
  const activeGameId = visibleGames.some((game) => game.id === selectedGame) ? selectedGame : (visibleGames[0]?.id || 'carrom');

  const stats = getPlayerGameStats(activeGameId, empId);
  const totalDecisions = stats.wins + stats.losses + stats.draws;
  const winPercent = totalDecisions ? Math.round((stats.wins / totalDecisions) * 100) : 0;
  const lossPercent = totalDecisions ? Math.round((stats.losses / totalDecisions) * 100) : 0;
  const drawPercent = totalDecisions ? Math.max(0, 100 - winPercent - lossPercent) : 0;
  const selectedGameRecord = visibleGames.find((game) => game.id === activeGameId);

  const perGameRows = visibleGames.map((game) => {
    const gameStats = getPlayerGameStats(game.id, empId);
    return { ...gameStats, game };
  });

  const handleDownloadProfile = async () => {
    setProfileLoading(true);
    const result = await generateProfileSummary({
      user: currentUser,
      stats: perGameRows,
    });
    setProfileLoading(false);
    if (result.success) {
      showToast('Profile summary downloaded!');
    } else {
      showToast(result.error || 'Failed to download profile', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gap: '24px', paddingBottom: '60px', maxWidth: '1000px', margin: '0 auto' }}>

      {/* ─── Profile Header ─── */}
      <div className="clay-card" style={{ padding: '32px 24px', borderRadius: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '28px', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: '110px', height: '110px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a3c6e, #2d5da1)',
            display: 'grid', placeItems: 'center', fontSize: '2.8rem', fontWeight: 800, color: 'white',
            boxShadow: '0 12px 24px rgba(26,60,110,0.3)',
            border: '4px solid rgba(255,255,255,0.2)'
          }}>
            {initial}
          </div>

          <div style={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-strong)', margin: 0, fontFamily: "'Lufga', sans-serif" }}>{userName}</h1>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
              <span className="clay-badge clay-badge-navy" style={{ padding: '6px 16px', fontSize: '0.75rem' }}>{empId || 'ABSE1022'}</span>
              <span className="clay-badge clay-badge-green" style={{ padding: '6px 16px', fontSize: '0.75rem' }}>{department}</span>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <button className="clay-btn" onClick={handleDownloadProfile} disabled={profileLoading} style={{ gap: '10px', padding: '10px 24px' }}>
                <Download size={18} /> Download Profile
              </button>
              <button className="clay-btn clay-btn-primary" onClick={() => setActiveTab('booking')} style={{ gap: '10px', padding: '10px 24px' }}>
                Back to Booking
              </button>
            </div>
          </div>
        </div>
        {/* Decorative elements */}
        <User size={180} color="var(--accent)" style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.03, transform: 'rotate(-10deg)' }} />
      </div>

      {/* ─── Game Selector ─── */}
      <div className="clay-card" style={{ padding: '24px', borderRadius: '24px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>Select Game</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px' }}>Choose Carrom or Chess to view that game's results.</div>
        </div>
        <div style={{ position: 'relative' }}>
          <select
            className="clay-select"
            value={activeGameId}
            onChange={(e) => setSelectedGame(e.target.value)}
            style={{ padding: '12px 18px', paddingRight: '46px', fontSize: '1rem', fontWeight: 600 }}
          >
            {visibleGames.map((game) => (
              <option key={game.id} value={game.id}>{game.name}</option>
            ))}
          </select>
          <ChevronDown size={20} style={{ position: 'absolute', right: '18px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }} />
        </div>
      </div>

      {/* ─── Stats Grid ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '16px' }}>
        <StatMiniCard label="Games Played" value={stats.gamesPlayed} icon={Gamepad2} color="#1a3c6e" caption="Results captured" />
        <StatMiniCard label="Wins" value={stats.wins} icon={Trophy} color="#2e7d32" caption={`${winPercent}% win rate`} />
        <StatMiniCard label="Losses" value={stats.losses} icon={AlertCircle} color="#e53935" caption={`${lossPercent}% of games`} />
        <StatMiniCard label="Draws" value={stats.draws} icon={Target} color="#f9a825" caption={`${drawPercent}% of games`} />
      </div>

      {/* ─── Points & Streak ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <div className="clay-card" style={{
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          color: 'white', border: 'none', padding: '28px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          borderRadius: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Star size={18} fill="white" /> Points
            </div>
            <div style={{ fontSize: '3.5rem', fontWeight: 800, marginTop: '8px', fontFamily: "'Lufga', sans-serif" }}>{stats.points}</div>
          </div>
          <Star size={80} color="rgba(255,255,255,0.06)" style={{ transform: 'rotate(15deg)' }} />
        </div>

        <div className="clay-card" style={{
          background: 'linear-gradient(135deg, #1a3c6e, #2d5da1)',
          color: 'white', border: 'none', padding: '28px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(26,60,110,0.15)',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8, fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <TrendingUp size={18} /> Winning Streak
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, marginTop: '8px', fontFamily: "'Lufga', sans-serif" }}>{stats.currentWinStreak}</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px', fontWeight: 600 }}>Best streak: {stats.bestWinStreak}</div>
          <Trophy size={90} color="rgba(255,255,255,0.06)" style={{ position: 'absolute', right: '-10px', bottom: '-10px', transform: 'rotate(-10deg)' }} />
        </div>
      </div>

      {/* ─── Current Selection Info ─── */}
      <div className="clay-card" style={{ padding: '24px', borderRadius: '24px', borderLeft: '6px solid var(--accent)' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>Current Selection</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent)', marginTop: '6px' }}>{selectedGameRecord?.name || 'Game'}</div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-soft)', marginTop: '12px', lineHeight: 1.6, maxWidth: '700px' }}>
          Points are calculated from saved match results only. Winning team members receive 4 points each, losing team members receive 1 point each, and both teams get 2 points for a draw.
        </p>
      </div>

      {/* ─── All Games Summary ─── */}
      <div className="clay-card" style={{ padding: '28px', borderRadius: '32px' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-strong)', marginBottom: '20px', fontFamily: "'Lufga', sans-serif" }}>All Games Summary</h3>
        <MobileTable
          columns={[
            { key: 'name', label: 'Game', render: (row) => <strong>{row.game.name}</strong> },
            { key: 'gamesPlayed', label: 'Played', align: 'center' },
            { key: 'wins', label: 'Wins', align: 'center', render: (row) => <span style={{ color: 'var(--success)', fontWeight: 700 }}>{row.wins} ({Math.round((row.wins/Math.max(1, row.wins+row.losses+row.draws))*100)}%)</span> },
            { key: 'points', label: 'Points', align: 'center', render: (row) => <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.1rem' }}>{row.points}</span> },
          ]}
          rows={perGameRows}
          rowKey={(row) => row.game.id}
          cardTitle={(row) => row.game.name}
          cardSubtitle={(row) => (
            <div style={{ marginTop: '8px', display: 'grid', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Games Played</span>
                <span style={{ fontWeight: 700 }}>{row.gamesPlayed}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Wins</span>
                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{row.wins} ({Math.round((row.wins/Math.max(1, row.wins+row.losses+row.draws))*100)}%)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Losses</span>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>{row.losses}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Points</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{row.points}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Best Streak</span>
                <span style={{ fontWeight: 700, color: 'var(--warning)' }}>{row.bestWinStreak}</span>
              </div>
            </div>
          )}
        />
      </div>

      {/* ─── My Certificates ─── */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 8px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: "'Lufga', sans-serif" }}>
            <Medal size={24} color="var(--accent)" /> My Certificates
          </h3>
          <span className="clay-badge clay-badge-grey" style={{ padding: '6px 14px' }}>{certLog.length} certificates issued</span>
        </div>

        {certLoading ? (
          <div className="clay-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>Loading certificates...</div>
        ) : certLog.length === 0 ? (
          <div className="clay-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)', border: '2px dashed var(--border)', background: 'transparent', borderRadius: '24px' }}>
            <AlertCircle size={40} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <div style={{ fontSize: '1rem', fontWeight: 600 }}>No certificates yet</div>
            <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>Participate in tournaments to earn recognition!</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(450px, 1fr))', gap: '20px' }}>
            {certLog.map((c) => {
              const certType = c.certificate_type || 'participation';
              const isRank = certType.startsWith('rank_');
              const certMeta = CERT_TYPE_META[certType] || CERT_TYPE_META.participation;

              return (
                <div key={c.id} className="clay-card" style={{ padding: '24px', borderRadius: '28px', position: 'relative', overflow: 'hidden', borderLeft: `8px solid ${certMeta.accent}` }}>
                  <div style={{ display: 'flex', gap: '20px', position: 'relative', zIndex: 1 }}>
                    <div style={{ color: certMeta.accent, background: `${certMeta.accent}15`, width: '56px', height: '56px', borderRadius: '16px', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {certMeta.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-strong)', fontFamily: "'Lufga', sans-serif" }}>{c.tournaments?.name || 'Tournament Final'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {certMeta.label} • {c.tournaments?.game || 'Game'}
                      </div>

                      <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Position</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-strong)' }}>{isRank ? (POSITION_LABEL[c.position] || 'Runner-up') : 'Participant'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Issued On</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-strong)' }}>{formatDateShort(c.issued_at)}</span>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tournament Period</span>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-strong)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Calendar size={14} /> {formatDateShort(c.tournaments?.start_date)} → {formatDateShort(c.tournaments?.end_date)}
                          </span>
                        </div>
                      </div>

                      <button
                        disabled={certPrinting === c.id}
                        className="clay-btn"
                        onClick={async () => {
                          setCertPrinting(c.id);
                          const result = await generateCertificate({
                            employeeName: getEmployeeName(empId),
                            employeeId: empId,
                            tournamentId: c.tournament_id,
                            tournamentName: c.tournaments?.name || '',
                            position: c.position,
                            certificateType: certType,
                            issuedBy: empId,
                          });
                          setCertPrinting(null);
                          if (result.success) showToast(`${certMeta.label} certificate downloaded!`);
                          else showToast(result.error || 'Failed to generate', 'error');
                        }}
                        style={{
                          marginTop: '24px',
                          width: '100%',
                          justifyContent: 'center',
                          background: 'var(--accent)',
                          color: 'white',
                          border: 'none',
                          padding: '12px',
                          fontWeight: 700,
                          boxShadow: '0 8px 16px rgba(var(--accent-rgb), 0.25)'
                        }}
                      >
                        {certPrinting === c.id ? 'Generating PDF...' : <><Download size={18} /> Download Certificate</>}
                      </button>
                    </div>
                  </div>
                  {/* Decorative faint icon */}
                  <Trophy size={140} color={certMeta.accent} style={{ position: 'absolute', right: '-30px', bottom: '-30px', opacity: 0.05, transform: 'rotate(-15deg)' }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const POSITION_LABEL  = { 1: '🥇 Champion', 2: '🥈 Runner-up', 3: '🥉 3rd Place' };

const CERT_TYPE_META = {
  participation: { icon: <FileText size={28} />, label: 'Participation',  accent: '#546e7a' },
  rank_1:        { icon: <Medal size={28} />, label: 'Rank 1 — Gold',  accent: '#f9a825' },
  rank_2:        { icon: <Medal size={28} />, label: 'Rank 2 — Silver',accent: '#78909c' },
  rank_3:        { icon: <Medal size={28} />, label: 'Rank 3 — Bronze',accent: '#d84315' },
};

const formatDateShort = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt)) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default ProfilePage;