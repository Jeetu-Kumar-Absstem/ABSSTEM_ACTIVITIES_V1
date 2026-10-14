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

export const groupIntoTeams = (participants = [], playersPerTeam = 1) => {
  const ppt = Math.max(1, Number(playersPerTeam) || 1);
  if (ppt === 1) return participants.map((p) => ({ captain: p, members: [p] }));

  const teams = [];
  for (let i = 0; i + ppt <= participants.length; i += ppt) {
    const slice = participants.slice(i, i + ppt);
    teams.push({ captain: slice[0], members: slice });
  }
  return teams;
};

export const injectTeamPlayers = (rounds = [], teamMap = {}) => {
  const expand = (captainId) => {
    if (!captainId) return [];
    const team = teamMap[captainId];
    if (!team) return [{ employee_id: captainId }];
    return team.members.map((p) => ({ employee_id: p.employee_id }));
  };

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((m) => ({
      ...m,
      team_a_players: expand(m.player_a_employee_id),
      team_b_players: expand(m.player_b_employee_id),
    })),
  }));
};

export const buildMatchTimestamp = (
  baseDate,
  slotIndex = 0,
  startHour = 10,
  intervalMinutes = 30,
  timezone = 'Asia/Kolkata'
) => {
  if (!baseDate) return null;

  const dateStr = baseDate instanceof Date
    ? baseDate.toLocaleDateString('en-CA', { timeZone: timezone })
    : String(baseDate).slice(0, 10);

  const [year, month, day] = dateStr.split('-').map(Number);

  const localBase = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(localBase);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localHour = get('hour');

  const utcOffsetMs = (12 - localHour) * 60 * 60 * 1000;
  const startMs = Date.UTC(year, month - 1, day, startHour, 0, 0) + utcOffsetMs;

  const slotMs = startMs + slotIndex * intervalMinutes * 60 * 1000;
  return new Date(slotMs).toISOString();
};

export const stampScheduledTimes = (rounds = [], tournamentStartDate = null, opts = {}) => {
  if (!tournamentStartDate) return rounds;

  const {
    startHour       = 10,
    intervalMinutes = 30,
    timezone        = 'Asia/Kolkata',
  } = opts;

  let slotIndex = 0;
  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((m) => {
      const scheduled_at = buildMatchTimestamp(
        tournamentStartDate,
        slotIndex,
        startHour,
        intervalMinutes,
        timezone
      );
      slotIndex += 1;
      return { ...m, scheduled_at };
    }),
  }));
};

const _seedOrder = (n) => {
  if (n === 1) return [1];
  const half = n / 2;
  const left = _seedOrder(half);
  const right = left.map((s) => n + 1 - s);
  const result = [];
  for (let i = 0; i < half; i++) result.push(left[i], right[i]);
  return result;
};

const _buildSeededSlots = (players) => {
  const size = nextPowerOfTwo(players.length || 2);
  const order = _seedOrder(size);
  return order.map((seed) => (seed <= players.length ? players[seed - 1] : null));
};

export const buildKnockoutFixturePlan = (teams = [], opts = {}) => {
  if (!teams || teams.length < 2) return { rounds: [], bracketSize: 2 };

  const {
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const shuffled = shuffleArray(teams);
  const size = nextPowerOfTwo(shuffled.length);
  const slots = _buildSeededSlots(shuffled);

  let rounds = [];
  const matchByCode = new Map();

  const round0RoundSize = size;
  const round0Code = (() => {
    if (round0RoundSize === 2) return 'F';
    if (round0RoundSize === 4) return 'SF';
    if (round0RoundSize === 8) return 'QF';
    return `R${round0RoundSize}`;
  })();

  const r0Matches = [];
  const r0EffectiveSlots = [];

  for (let i = 0; i < size; i += 2) {
    const teamA = slots[i];
    const teamB = slots[i + 1];

    if (!teamA && !teamB) {
      r0EffectiveSlots.push({ type: 'empty' });
      continue;
    }

    const isBye = !teamA || !teamB;
    const winnerTeamId = isBye ? (teamA?.id || teamB?.id) : null;
    const matchNum = r0Matches.length + 1;
    const matchCode = `${round0Code}${matchNum}`;

    const match = {
      round:                 round0Code,
      match_number:          matchNum,
      match_code:            matchCode,
      team_a_id:             teamA?.id || null,
      team_b_id:             teamB?.id || null,
      status:                isBye ? 'bye' : 'scheduled',
      winner_team_id:        winnerTeamId,
      score_a:               null,
      score_b:               null,
      _bye_winner:           winnerTeamId,
      _feeds_into:           null,
      _feeds_from_a:         null,
      _feeds_from_b:         null,
      _has_advanced:         false,
    };

    r0Matches.push(match);
    matchByCode.set(matchCode, match);

    r0EffectiveSlots.push(
      isBye
        ? { type: 'bye', teamId: winnerTeamId, matchCode, hasAdvanced: false }
        : { type: 'match', matchCode, hasAdvanced: false }
    );
  }

  if (r0Matches.length > 0) {
    rounds.push({
      round: round0Code,
      label: getRoundLabel(round0Code, r0Matches.length),
      matches: r0Matches,
    });
  }

  let prevEffective = r0EffectiveSlots;
  const numRounds = Math.log2(size);

  for (let depth = numRounds - 2; depth >= 0; depth--) {
    const roundSize = 2 ** (depth + 1);
    const roundCode = (() => {
      if (roundSize === 2) return 'F';
      if (roundSize === 4) return 'SF';
      if (roundSize === 8) return 'QF';
      return `R${roundSize}`;
    })();

    const roundMatches = [];
    const nextEffective = [];

    for (let i = 0; i < prevEffective.length; i += 2) {
      const slotA = prevEffective[i]   || { type: 'empty' };
      const slotB = prevEffective[i+1] || { type: 'empty' };

      if (slotA.type === 'empty' && slotB.type === 'empty') {
        nextEffective.push({ type: 'empty' });
        continue;
      }

      if (slotA.type === 'empty' || slotB.type === 'empty') {
        const real = slotA.type !== 'empty' ? slotA : slotB;
        if (real.matchCode) {
          const sourceMatch = matchByCode.get(real.matchCode);
          if (sourceMatch) {
            sourceMatch._has_advanced = true;
          }
        }
        nextEffective.push({
          ...real,
          hasAdvanced: true,
        });
        continue;
      }

      const matchNum = roundMatches.length + 1;
      const matchCode = `${roundCode}${matchNum}`;

      const teamAId = slotA.type === 'bye' ? slotA.teamId : null;
      const teamBId = slotB.type === 'bye' ? slotB.teamId : null;

      for (const slot of [slotA, slotB]) {
        if (slot.matchCode) {
          const feeder = matchByCode.get(slot.matchCode);
          if (feeder && !feeder._feeds_into) {
            feeder._feeds_into = matchCode;
          }
        }
      }

      const status = 'scheduled';
      const winnerTeamId = null;

      const newMatch = {
        round:                 roundCode,
        match_number:          matchNum,
        match_code:            matchCode,
        team_a_id:             teamAId,
        team_b_id:             teamBId,
        status:                status,
        winner_team_id:        winnerTeamId,
        score_a:               null,
        score_b:               null,
        _preplace_a:           slotA.type === 'bye' ? slotA.teamId : null,
        _preplace_b:           slotB.type === 'bye' ? slotB.teamId : null,
        _feeds_from_a:         slotA.type === 'match' ? slotA.matchCode : null,
        _feeds_from_b:         slotB.type === 'match' ? slotB.matchCode : null,
        _bye_winner:           null,
        _feeds_into:           null,
        _both_byes:            slotA.type === 'bye' && slotB.type === 'bye',
        _has_advanced:         false,
      };

      roundMatches.push(newMatch);
      matchByCode.set(matchCode, newMatch);

      nextEffective.push({
        type: 'match',
        matchCode,
        hasAdvanced: false,
      });
    }

    if (roundMatches.length > 0) {
      rounds.push({
        round: roundCode,
        label: getRoundLabel(roundCode, roundMatches.length),
        matches: roundMatches,
      });
    }

    prevEffective = nextEffective;
  }

  if (tournamentStartDate) {
    rounds = stampScheduledTimes(rounds, tournamentStartDate, {
      startHour, intervalMinutes, timezone,
    });
  }

  return { rounds, bracketSize: size };
};

export const buildRoundRobinFixturePlan = (teams = [], opts = {}) => {
  const {
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const matches = [];
  let counter = 1;
  for (let i = 0; i < teams.length; i += 1) {
    for (let j = i + 1; j < teams.length; j += 1) {
      matches.push({
        round: 'RR',
        match_number: counter,
        match_code: `RR${counter}`,
        team_a_id: teams[i]?.id || null,
        team_b_id: teams[j]?.id || null,
        status: 'scheduled',
        winner_team_id: null,
        score_a: null,
        score_b: null,
      });
      counter += 1;
    }
  }

  let rounds = [{ round: 'RR', label: 'Round Robin', matches }];

  if (tournamentStartDate) {
    rounds = stampScheduledTimes(rounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  return { rounds };
};

const buildOpponentMap = (matches = []) => {
  const map = new Map();
  for (const match of matches) {
    const a = String(match.team_a_id || '').toUpperCase();
    const b = String(match.team_b_id || '').toUpperCase();
    if (a && b) {
      if (!map.has(a)) map.set(a, new Set());
      if (!map.has(b)) map.set(b, new Set());
      map.get(a).add(b);
      map.get(b).add(a);
    }
  }
  return map;
};

const hasByeBefore = (teamId, matches = []) =>
  matches.some((match) =>
    String(match.status || '').toLowerCase() === 'bye' &&
    String(match.winner_team_id || '').toUpperCase() === String(teamId || '').toUpperCase()
  );

export const computeSwissStandings = (teams = [], matches = []) => {
  const stats = new Map();
  const opponentMap = buildOpponentMap(matches);

  for (const team of teams) {
    const id = String(team.id || '').toUpperCase();
    if (!id) continue;
    stats.set(id, {
      team_id: team.id,
      seed: team.seed || 0,
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
    const a = String(match.team_a_id || '').toUpperCase();
    const b = String(match.team_b_id || '').toUpperCase();
    const winner = String(match.winner_team_id || '').toUpperCase();
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

export const computeRoundRobinStandings = (matches = [], teams = []) => {
  const stats = {};

  for (const t of teams) {
    const id = String(t.id || '').toUpperCase();
    if (!id) continue;
    stats[id] = {
      team_id: t.id,
      seed: t.seed || 0,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      points: 0,
      score_diff: 0,
    };
  }

  for (const m of matches) {
    const round     = String(m.round      || '').toUpperCase();
    const matchCode = String(m.match_code || '').toUpperCase();
    if (!round.startsWith('RR') || matchCode.startsWith('KO_')) continue;

    const status = String(m.status || '').toLowerCase();
    if (!['completed', 'walkover', 'no_show', 'draw'].includes(status)) continue;

    const a = String(m.team_a_id || '').toUpperCase();
    const b = String(m.team_b_id || '').toUpperCase();
    if (!a || !b) continue;

    if (stats[a]) stats[a].played += 1;
    if (stats[b]) stats[b].played += 1;

    const sa = Number(m.score_a ?? 0);
    const sb = Number(m.score_b ?? 0);
    if (stats[a]) stats[a].score_diff += sa - sb;
    if (stats[b]) stats[b].score_diff += sb - sa;

    if (status === 'draw') {
      if (stats[a]) { stats[a].drawn += 1; stats[a].points += 1; }
      if (stats[b]) { stats[b].drawn += 1; stats[b].points += 1; }
      continue;
    }

    const winner = String(m.winner_team_id || '').toUpperCase();
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

export const buildRoundRobinKnockoutPlan = (standings = [], opts = {}) => {
  const top5 = standings.slice(0, 5);
  if (top5.length < 2) return [];

  const seed = (n) => top5[n - 1]?.team_id || null;

  const matches = [
    {
      round: 'QF',
      match_number: 1,
      match_code: 'KO_QF1',
      team_a_id: seed(4),
      team_b_id: seed(5),
      status: seed(4) && seed(5) ? 'scheduled' : 'bye',
      winner_team_id: !(seed(4) && seed(5)) ? (seed(4) || seed(5)) : null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'SF',
      match_number: 1,
      match_code: 'KO_SF1',
      team_a_id: seed(1),
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'SF',
      match_number: 2,
      match_code: 'KO_SF2',
      team_a_id: seed(2),
      team_b_id: seed(3),
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'F',
      match_number: 1,
      match_code: 'KO_F1',
      team_a_id: null,
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
  ];

  if (!seed(5) && seed(4)) {
    matches[0].status = 'bye';
    matches[0].winner_team_id = seed(4);
    matches[1].team_b_id = seed(4);
  }

  const {
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  if (tournamentStartDate) {
    const stamped = stampScheduledTimes(
      [{ round: 'KO', label: 'Knockout', matches }],
      tournamentStartDate,
      { startHour, intervalMinutes, timezone }
    );
    return stamped[0].matches;
  }

  return matches;
};

export const buildLeagueFullFixturePlan = (teams = [], opts = {}) => {
  const {
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const rrMatches = [];
  let counter = 1;
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      rrMatches.push({
        round: 'RR',
        match_number: counter,
        match_code: `RR${counter}`,
        team_a_id: teams[i]?.id || null,
        team_b_id: teams[j]?.id || null,
        status: 'scheduled',
        winner_team_id: null,
        score_a: null,
        score_b: null,
      });
      counter++;
    }
  }

  let rrRounds = [{ round: 'RR', label: 'Round Robin', matches: rrMatches }];
  if (tournamentStartDate) {
    rrRounds = stampScheduledTimes(rrRounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  const koMatches = [
    {
      round: 'QF',
      match_number: 1,
      match_code: 'KO_QF1',
      team_a_id: null,
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'SF',
      match_number: 1,
      match_code: 'KO_SF1',
      team_a_id: null,
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'SF',
      match_number: 2,
      match_code: 'KO_SF2',
      team_a_id: null,
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
    {
      round: 'F',
      match_number: 1,
      match_code: 'KO_F1',
      team_a_id: null,
      team_b_id: null,
      status: 'scheduled',
      winner_team_id: null,
      score_a: null,
      score_b: null,
    },
  ];

  return { rrRounds, koMatches };
};

export const computeKnockoutShellUpdates = (standings = [], koMatches = []) => {
  const byCode = new Map(koMatches.map((m) => [String(m.match_code || '').toUpperCase(), m]));

  const seed = (n) => standings[n - 1]?.team_id || null;

  const updates = [];

  const tryUpdate = (code, field, value) => {
    if (!value) return;
    const match = byCode.get(code);
    if (!match) return;
    if (String(match.status || '').toLowerCase() === 'completed') return;
    if (String(match[field] || '') === String(value)) return;
    updates.push({ id: match.id, update: { [field]: value } });
  };

  tryUpdate('KO_QF1', 'team_a_id', seed(4));
  tryUpdate('KO_QF1', 'team_b_id', seed(5));
  tryUpdate('KO_SF1', 'team_a_id', seed(1));
  tryUpdate('KO_SF2', 'team_a_id', seed(2));
  tryUpdate('KO_SF2', 'team_b_id', seed(3));

  return updates;
};

export const buildSwissRoundPlan = (teams = [], matches = [], roundNumber = 1, opts = {}) => {
  const standings = computeSwissStandings(teams, matches);
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
      if (paired.has(candidate.team_id)) continue;
      if (candidate.team_id === player.team_id) continue;
      if (!opponentMap.get(player.team_id)?.has(candidate.team_id)) return candidate;
    }
    return null;
  };

  for (const points of orderedPoints) {
    const pool = [...byPoints.get(String(points))].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return (a.seed || 0) - (b.seed || 0);
    });
    for (const player of pool) {
      if (paired.has(player.team_id)) continue;
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
        paired.add(player.team_id);
        paired.add(opponent.team_id);
        roundMatches.push({
          round: `SW${roundNumber}`,
          match_number: roundMatches.length + 1,
          match_code: `SW${roundNumber}-${roundMatches.length + 1}`,
          team_a_id: player.team_id,
          team_b_id: opponent.team_id,
          status: 'scheduled',
          winner_team_id: null,
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
        team_a_id: byePlayer.team_id,
        team_b_id: null,
        status: 'bye',
        winner_team_id: byePlayer.team_id,
        score_a: 1,
        score_b: 0,
      });
    }
  }

  const {
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  let rounds = [{
    round: `SW${roundNumber}`,
    label: `Swiss Round ${roundNumber}`,
    matches: roundMatches,
  }];

  if (tournamentStartDate) {
    rounds = stampScheduledTimes(rounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  return { standings, rounds };
};

export const isPhantomMatch = (m) =>
  !m.team_a_id && !m.team_b_id;

export const isByeMatch = (m) =>
  String(m.status || '').toLowerCase() === 'bye' ||
  (!m.team_a_id && !!m.team_b_id) ||
  (!!m.team_a_id && !m.team_b_id);

export const refreshKnockoutPlan = (existingMatches = [], teams = []) => {
  const DONE = new Set(['completed', 'walkover', 'no_show', 'bye', 'draw', 'cancelled']);
  const doneMatches    = existingMatches.filter((m) => DONE.has(String(m.status || '').toLowerCase()));
  const pendingMatches = existingMatches.filter((m) => !DONE.has(String(m.status || '').toLowerCase()));

  const currentIds = new Set(teams.map((t) => t.id));
  const playedIds  = new Set(
    doneMatches.flatMap((m) => [m.team_a_id, m.team_b_id].filter(Boolean))
  );

  const addedIds   = [...currentIds].filter((id) => !playedIds.has(id));
  const removedIds = [...playedIds].filter((id) => !currentIds.has(id));

  if (pendingMatches.length === 0 && addedIds.length === 0 && removedIds.length === 0) {
    return {
      status:           'up_to_date',
      message:          'Fixtures are already up to date.',
      matchesToDelete:  [],
      newRounds:        [],
    };
  }

  const decidedWinners = new Set(
    doneMatches.filter((m) => m.winner_team_id).map((m) => m.winner_team_id)
  );
  const eliminatedIds = new Set(
    doneMatches
      .filter((m) => m.winner_team_id && String(m.status || '') !== 'bye')
      .flatMap((m) => [m.team_a_id, m.team_b_id].filter(Boolean))
      .filter((id) => !decidedWinners.has(id))
  );

  const stillActive = teams.filter((t) => !eliminatedIds.has(t.id));

  if (stillActive.length < 2) {
    return {
      status:           'up_to_date',
      message:          'Tournament is effectively over — no pending rounds to rebuild.',
      matchesToDelete:  [],
      newRounds:        [],
    };
  }

  const newPlan = buildKnockoutFixturePlan(stillActive);
  const deleted = pendingMatches.length;
  const added   = newPlan.rounds.reduce((sum, r) => sum + r.matches.length, 0);

  return {
    status:           'changed',
    message:          `Removed ${deleted} pending match${deleted !== 1 ? 'es' : ''} and regenerated ${added} match${added !== 1 ? 'es' : ''} for remaining rounds.`,
    matchesToDelete:  pendingMatches.map((m) => m.id),
    newRounds:        newPlan.rounds,
  };
};
