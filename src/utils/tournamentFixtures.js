const roundLabelFromSize = (size) => {
  if (size <= 2) return 'Final';
  if (size === 4) return 'Semi Final';
  if (size === 8) return 'Quarter Final';
  return `Round of ${size}`;
};

export const normalizeTournamentFormat = (format) => {
  const value = String(format || 'knockout').trim().toLowerCase();
  if (value === 'league') return 'round_robin';
  return value;
};

export const shuffleArray = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const nextPowerOfTwo = (value) => {
  const n = Math.max(2, Number(value) || 2);
  return 2 ** Math.ceil(Math.log2(n));
};

export const getRoundRank = (round) => {
  const code = String(round || '').trim().toUpperCase();
  if (!code) return 999;
  const swissMatch = code.match(/^SW(\d+)$/);
  if (swissMatch) return 1000 + Number(swissMatch[1]);
  if (code === 'RR') return 900;
  if (code === 'GROUP') return 800;
  if (code === 'QUAL') return 700;
  if (code === '3RD') return 650;
  if (code === 'F') return 600;
  if (code === 'SF') return 500;
  if (code === 'QF') return 400;
  const roundOfMatch = code.match(/^R(\d+)$/);
  if (roundOfMatch) return Number(roundOfMatch[1]);
  return 300;
};

export const getRoundLabel = (round, fallbackMatchCount = null) => {
  const code = String(round || '').trim().toUpperCase();
  if (!code) return 'Round';
  if (code === 'RR') return 'Round Robin';
  if (code === 'GROUP') return 'Group Stage';
  if (code === 'QUAL') return 'Qualification';
  if (code === '3RD') return 'Third Place';
  if (code === 'F') return 'Final';
  if (code === 'SF') return 'Semi Final';
  if (code === 'QF') return 'Quarter Final';
  const swissMatch = code.match(/^SW(\d+)$/);
  if (swissMatch) return `Swiss Round ${swissMatch[1]}`;
  const roundMatch = code.match(/^R(\d+)$/);
  if (roundMatch) {
    const size = Number(roundMatch[1]);
    return roundLabelFromSize(size);
  }
  if (fallbackMatchCount && fallbackMatchCount > 1) {
    return `Round ${fallbackMatchCount}`;
  }
  return code.replace(/_/g, ' ');
};

export const compareTournamentRounds = (a, b) => {
  const diff = getRoundRank(a) - getRoundRank(b);
  if (diff !== 0) return diff;
  return String(a || '').localeCompare(String(b || ''));
};

export const groupMatchesByRound = (matches = []) => {
  const map = new Map();
  for (const match of matches) {
    const key = String(match.round || 'ROUND').toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(match);
  }
  return [...map.entries()]
    .sort((a, b) => compareTournamentRounds(a[0], b[0]))
    .map(([round, rows]) => ({
      round,
      label: getRoundLabel(round, rows.length),
      matches: [...rows].sort((a, b) => (a.match_number || 0) - (b.match_number || 0)),
    }));
};

export const getMatchTeams = (match) => {
  const teamA = [
    match?.player_a_employee_id,
    ...(match?.team_a_players || []).map((p) => p.employee_id),
  ].filter(Boolean);
  const teamB = [
    match?.player_b_employee_id,
    ...(match?.team_b_players || []).map((p) => p.employee_id),
  ].filter(Boolean);
  return {
    teamA: [...new Set(teamA)],
    teamB: [...new Set(teamB)],
  };
};

export const buildKnockoutFixturePlan = (participants = []) => {
  const shuffled = shuffleArray(participants);
  const size = nextPowerOfTwo(shuffled.length || 2);
  const roundCount = Math.max(1, Math.log2(size));
  const firstRoundSlots = [...shuffled, ...Array(Math.max(0, size - shuffled.length)).fill(null)];
  const rounds = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const matchesInRound = size / (2 ** (roundIndex + 1));
    const roundSize = size / (2 ** roundIndex);
    const roundCode = (() => {
      if (roundSize === 2) return 'F';
      if (roundSize === 4) return 'SF';
      if (roundSize === 8) return 'QF';
      return `R${roundSize}`;
    })();
    const matches = [];

    for (let i = 0; i < matchesInRound; i += 1) {
      const playerA = roundIndex === 0 ? firstRoundSlots[i * 2] : null;
      const playerB = roundIndex === 0 ? firstRoundSlots[i * 2 + 1] : null;
      const bye = roundIndex === 0 && (!!playerA || !!playerB) && (!playerA || !playerB);
      matches.push({
        round: roundCode,
        match_number: i + 1,
        match_code: `${roundCode}${i + 1}`,
        player_a_employee_id: playerA?.employee_id || null,
        player_b_employee_id: playerB?.employee_id || null,
        status: bye ? 'bye' : 'scheduled',
        winner_employee_id: bye ? (playerA?.employee_id || playerB?.employee_id || null) : null,
        score_a: bye ? 1 : null,
        score_b: bye ? 0 : null,
      });
    }

    rounds.push({
      round: roundCode,
      label: getRoundLabel(roundCode, matches.length),
      matches,
    });
  }

  return { rounds, bracketSize: size };
};

export const buildRoundRobinFixturePlan = (participants = []) => {
  const matches = [];
  let counter = 1;
  for (let i = 0; i < participants.length; i += 1) {
    for (let j = i + 1; j < participants.length; j += 1) {
      matches.push({
        round: 'RR',
        match_number: counter,
        match_code: `RR${counter}`,
        player_a_employee_id: participants[i]?.employee_id || null,
        player_b_employee_id: participants[j]?.employee_id || null,
        status: 'scheduled',
        winner_employee_id: null,
        score_a: null,
        score_b: null,
      });
      counter += 1;
    }
  }
  return {
    rounds: [{
      round: 'RR',
      label: 'Round Robin',
      matches,
    }],
  };
};

const buildOpponentMap = (matches = []) => {
  const map = new Map();
  for (const match of matches) {
    const a = String(match.player_a_employee_id || '').toUpperCase();
    const b = String(match.player_b_employee_id || '').toUpperCase();
    if (a && b) {
      if (!map.has(a)) map.set(a, new Set());
      if (!map.has(b)) map.set(b, new Set());
      map.get(a).add(b);
      map.get(b).add(a);
    }
  }
  return map;
};

const hasByeBefore = (employeeId, matches = []) =>
  matches.some((match) =>
    String(match.status || '').toLowerCase() === 'bye' &&
    String(match.winner_employee_id || '').toUpperCase() === String(employeeId || '').toUpperCase()
  );

export const computeSwissStandings = (participants = [], matches = []) => {
  const stats = new Map();
  const opponentMap = buildOpponentMap(matches);

  for (const participant of participants) {
    const id = String(participant.employee_id || '').toUpperCase();
    if (!id) continue;
    stats.set(id, {
      employee_id: participant.employee_id,
      seed: participant.seed || 0,
      matches_played: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      bye: hasByeBefore(id, matches),
      opponents: opponentMap.get(id) || new Set(),
    });
  }

  for (const match of matches) {
    const status = String(match.status || '').toLowerCase();
    const a = String(match.player_a_employee_id || '').toUpperCase();
    const b = String(match.player_b_employee_id || '').toUpperCase();
    const winner = String(match.winner_employee_id || '').toUpperCase();
    if (!a && !b) continue;

    const bumpPlayed = (id) => {
      if (!id || !stats.has(id)) return;
      stats.get(id).matches_played += 1;
    };

    if (status === 'bye') {
      if (stats.has(winner)) {
        stats.get(winner).matches_played += 1;
        stats.get(winner).wins += 1;
        stats.get(winner).points += 3;
        stats.get(winner).bye = true;
      }
      continue;
    }

    if (status !== 'completed' && status !== 'walkover' && status !== 'no_show' && status !== 'draw') continue;
    bumpPlayed(a);
    bumpPlayed(b);

    if (status === 'draw') {
      if (stats.has(a)) {
        stats.get(a).draws += 1;
        stats.get(a).points += 1;
      }
      if (stats.has(b)) {
        stats.get(b).draws += 1;
        stats.get(b).points += 1;
      }
      continue;
    }

    const loser = winner === a ? b : a;
    if (stats.has(winner)) {
      stats.get(winner).wins += 1;
      stats.get(winner).points += 3;
    }
    if (stats.has(loser)) {
      stats.get(loser).losses += 1;
    }
  }

  return [...stats.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (a.losses !== b.losses) return a.losses - b.losses;
    if ((a.bye ? 1 : 0) !== (b.bye ? 1 : 0)) return (a.bye ? 1 : 0) - (b.bye ? 1 : 0);
    return (a.seed || 0) - (b.seed || 0);
  });
};

// ── Round-Robin standings ────────────────────────────────────────────────────
// Tallies wins / draws / losses from completed RR matches and returns a sorted
// array of participant stat objects (best-to-worst).
export const computeRoundRobinStandings = (matches = [], participants = []) => {
  const stats = {};

  for (const p of participants) {
    const id = String(p.employee_id || '').toUpperCase();
    if (!id) continue;
    stats[id] = {
      employee_id: p.employee_id,
      seed: p.seed || 0,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      points: 0,
      score_diff: 0,
    };
  }

  for (const m of matches) {
    // Only round-robin phase matches — skip KO phase matches (identified by
    // match_code prefix "KO_", since their round values are QF/SF/F).
    const round     = String(m.round      || '').toUpperCase();
    const matchCode = String(m.match_code || '').toUpperCase();
    if (!round.startsWith('RR') || matchCode.startsWith('KO_')) continue;

    const status = String(m.status || '').toLowerCase();
    if (!['completed', 'walkover', 'no_show', 'draw'].includes(status)) continue;

    const a = String(m.player_a_employee_id || '').toUpperCase();
    const b = String(m.player_b_employee_id || '').toUpperCase();
    if (!a || !b) continue;

    if (stats[a]) stats[a].played += 1;
    if (stats[b]) stats[b].played += 1;

    // Score differential (used as secondary tiebreaker)
    const sa = Number(m.score_a ?? 0);
    const sb = Number(m.score_b ?? 0);
    if (stats[a]) stats[a].score_diff += sa - sb;
    if (stats[b]) stats[b].score_diff += sb - sa;

    if (status === 'draw') {
      if (stats[a]) { stats[a].drawn += 1; stats[a].points += 1; }
      if (stats[b]) { stats[b].drawn += 1; stats[b].points += 1; }
      continue;
    }

    const winner = String(m.winner_employee_id || '').toUpperCase();
    const loser  = winner === a ? b : a;
    if (stats[winner]) { stats[winner].won += 1; stats[winner].points += 3; }
    if (stats[loser])  { stats[loser].lost  += 1; }
  }

  return Object.values(stats).sort((a, b) => {
    if (b.points      !== a.points)      return b.points      - a.points;
    if (b.won         !== a.won)         return b.won         - a.won;
    if (b.score_diff  !== a.score_diff)  return b.score_diff  - a.score_diff;
    if (a.lost        !== b.lost)        return a.lost        - b.lost;
    return (a.seed || 0) - (b.seed || 0);
  });
};

// ── Round-Robin → Knockout phase ─────────────────────────────────────────────
// Takes the standings from the RR phase and builds the knockout bracket:
//   • Top 5 qualify
//   • Seeds 1, 2, 3 → automatic BYE into Semifinals
//   • Seed 4 vs Seed 5 → KO_QF (sole Quarterfinal)
//   • KO_SF1: Seed 1  vs winner of KO_QF
//   • KO_SF2: Seed 2  vs Seed 3
//   • KO_F  : winner of KO_SF1 vs winner of KO_SF2
//
// Returns an array of match payload objects ready for Supabase insert
// (tournament_id must be set by the caller).
export const buildRoundRobinKnockoutPlan = (standings = []) => {
  const top5 = standings.slice(0, 5);
  if (top5.length < 2) return [];

  const seed = (n) => top5[n - 1]?.employee_id || null;

  // round values must satisfy the DB check constraint — use the standard
  // round codes (QF / SF / F). The match_code prefix "KO_" is what we use
  // in JS to identify these as the RR-knockout phase (not a pure knockout
  // tournament bracket).
  const matches = [
    // Quarterfinal — Seed 4 vs Seed 5
    {
      round: 'QF',
      match_number: 1,
      match_code: 'KO_QF1',
      player_a_employee_id: seed(4),
      player_b_employee_id: seed(5),
      status: seed(4) && seed(5) ? 'scheduled' : 'bye',
      winner_employee_id: !(seed(4) && seed(5)) ? (seed(4) || seed(5)) : null,
      score_a: null,
      score_b: null,
    },
    // Semifinal 1 — Seed 1 vs winner of KO_QF
    {
      round: 'SF',
      match_number: 1,
      match_code: 'KO_SF1',
      player_a_employee_id: seed(1),
      player_b_employee_id: null,          // filled when KO_QF completes
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
    // Semifinal 2 — Seed 2 vs Seed 3
    {
      round: 'SF',
      match_number: 2,
      match_code: 'KO_SF2',
      player_a_employee_id: seed(2),
      player_b_employee_id: seed(3),
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
    // Final — winner SF1 vs winner SF2
    {
      round: 'F',
      match_number: 1,
      match_code: 'KO_F1',
      player_a_employee_id: null,
      player_b_employee_id: null,
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
  ];

  // If only 4 players qualified, skip QF and put seed 4 straight into SF1
  if (!seed(5) && seed(4)) {
    matches[0].status = 'bye';
    matches[0].winner_employee_id = seed(4);
    matches[1].player_b_employee_id = seed(4);
  }

  return matches;
};

export const buildSwissRoundPlan = (participants = [], matches = [], roundNumber = 1) => {
  const standings = computeSwissStandings(participants, matches);
  const opponentMap = buildOpponentMap(matches);
  const byPoints = new Map();

  for (const row of standings) {
    const key = `${row.points}`;
    if (!byPoints.has(key)) byPoints.set(key, []);
    byPoints.get(key).push(row);
  }

  const orderedPoints = [...byPoints.keys()]
    .map((n) => Number(n))
    .sort((a, b) => b - a);
  const paired = new Set();
  const byeCandidates = [];
  const roundMatches = [];

  const pickOpponent = (player, pool) => {
    for (const candidate of pool) {
      if (paired.has(candidate.employee_id)) continue;
      if (candidate.employee_id === player.employee_id) continue;
      if (!opponentMap.get(player.employee_id)?.has(candidate.employee_id)) return candidate;
    }
    return null;
  };

  for (const points of orderedPoints) {
    const pool = [...byPoints.get(String(points))].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (a.seed || 0) - (b.seed || 0);
    });
    for (const player of pool) {
      if (paired.has(player.employee_id)) continue;
      let opponent = pickOpponent(player, pool);
      if (!opponent) {
        const fallbackPools = orderedPoints
          .filter((p) => p <= points)
          .map((p) => byPoints.get(String(p)) || [])
          .flat()
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.wins !== a.wins) return b.wins - a.wins;
            return (a.seed || 0) - (b.seed || 0);
          });
        opponent = pickOpponent(player, fallbackPools);
      }
      if (opponent) {
        paired.add(player.employee_id);
        paired.add(opponent.employee_id);
        roundMatches.push({
          round: `SW${roundNumber}`,
          match_number: roundMatches.length + 1,
          match_code: `SW${roundNumber}-${roundMatches.length + 1}`,
          player_a_employee_id: player.employee_id,
          player_b_employee_id: opponent.employee_id,
          status: 'scheduled',
          winner_employee_id: null,
          score_a: null,
          score_b: null,
        });
      } else {
        byeCandidates.push(player);
      }
    }
  }

  if (byeCandidates.length > 0) {
    const byePlayer = byeCandidates.find((player) => !player.bye) || byeCandidates[0];
    if (byePlayer) {
      roundMatches.push({
        round: `SW${roundNumber}`,
        match_number: roundMatches.length + 1,
        match_code: `SW${roundNumber}-${roundMatches.length + 1}`,
        player_a_employee_id: byePlayer.employee_id,
        player_b_employee_id: null,
        status: 'bye',
        winner_employee_id: byePlayer.employee_id,
        score_a: 1,
        score_b: 0,
      });
    }
  }

  return {
    standings,
    rounds: [{
      round: `SW${roundNumber}`,
      label: `Swiss Round ${roundNumber}`,
      matches: roundMatches,
    }],
  };
};