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

// ─── 2v2 Team helpers ────────────────────────────────────────────────────────

/**
 * Split a flat participant list into teams of `playersPerTeam`.
 * Returns an array of team objects: { captain, members[] }
 * where members includes all players (captain + partners).
 *
 * Example for 2v2 with [A, B, C, D, E, F]:
 *   → [ {captain:A, members:[A,B]}, {captain:C, members:[C,D]}, {captain:E, members:[E,F]} ]
 *
 * Odd leftover players at the end are discarded (they can't form a full team).
 */
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

/**
 * Promote a match plan produced by any of the build*FixturePlan functions
 * to carry proper 2v2 data.
 *
 * For each match that has `player_a_employee_id` set, looks up the team
 * in `teamMap` (keyed by captain employee_id) and injects:
 *   • player_a_employee_id  — captain A (unchanged)
 *   • player_b_employee_id  — captain B (unchanged)
 *   • team_a_players        — [{employee_id}, …] for ALL team-A members
 *   • team_b_players        — [{employee_id}, …] for ALL team-B members
 *
 * Bye matches are handled: the single captain's team is expanded on the
 * appropriate side; the other side stays null/[].
 */
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

// ─── Scheduled-time helpers ───────────────────────────────────────────────────

/**
 * Build an ISO timestamp (UTC) for a match slot.
 *
 * @param {string|Date} baseDate  — tournament start date ("YYYY-MM-DD" or Date)
 * @param {number}      slotIndex — 0-based slot index (each slot = intervalMinutes apart)
 * @param {number}      startHour — local hour to begin scheduling (default 10 = 10:00 AM)
 * @param {number}      intervalMinutes — gap between matches in minutes (default 30)
 * @param {string}      timezone  — IANA timezone (default "Asia/Kolkata")
 *
 * Returns an ISO-8601 UTC string suitable for storing in a `timestamptz` column.
 */
export const buildMatchTimestamp = (
  baseDate,
  slotIndex = 0,
  startHour = 10,
  intervalMinutes = 30,
  timezone = 'Asia/Kolkata'
) => {
  if (!baseDate) return null;

  // Parse the date part in the target timezone so we don't shift days
  const dateStr = baseDate instanceof Date
    ? baseDate.toLocaleDateString('en-CA', { timeZone: timezone }) // "YYYY-MM-DD"
    : String(baseDate).slice(0, 10);

  const [year, month, day] = dateStr.split('-').map(Number);

  // Build a Date representing `startHour:00` local time in `timezone`
  // Strategy: use Intl to find the UTC offset for that local time
  const localBase = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // noon UTC as anchor

  // Convert noon-UTC to the target timezone to find offset
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(localBase);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localHour = get('hour');

  // Offset in ms between UTC noon and local noon
  const utcOffsetMs = (12 - localHour) * 60 * 60 * 1000;
  // Moment when local clock reads startHour:00:00 on dateStr
  const startMs = Date.UTC(year, month - 1, day, startHour, 0, 0) + utcOffsetMs;

  const slotMs = startMs + slotIndex * intervalMinutes * 60 * 1000;
  return new Date(slotMs).toISOString();
};

/**
 * Stamp every match in `rounds` with a `scheduled_at` value.
 *
 * Matches are numbered globally across all rounds in order, starting at
 * slotIndex 0.  Each subsequent match is spaced `intervalMinutes` apart.
 *
 * @param {Round[]} rounds           — output of any build*FixturePlan
 * @param {string}  tournamentStartDate — "YYYY-MM-DD"
 * @param {object}  opts
 *   @param {number} opts.startHour       — local hour (default 10)
 *   @param {number} opts.intervalMinutes — minutes between matches (default 30)
 *   @param {string} opts.timezone        — IANA tz (default "Asia/Kolkata")
 * @returns {Round[]} — deep copy with scheduled_at set on each match
 */
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
      // Bye matches are auto-completed; no real play time needed, but we
      // still assign a slot so times are contiguous and editable later.
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



/**
 * Classic bracket seeding permutation for a bracket of `n` slots (power of 2).
 * Returns 1-based seed numbers in bracket order so that seed 1 and seed 2
 * can only meet in the final.
 *   n=4  → [1, 4, 3, 2]
 *   n=8  → [1, 8, 5, 4, 3, 6, 7, 2]
 */
const _seedOrder = (n) => {
  if (n === 1) return [1];
  const half = n / 2;
  const left = _seedOrder(half);
  const right = left.map((s) => n + 1 - s);
  const result = [];
  for (let i = 0; i < half; i++) result.push(left[i], right[i]);
  return result;
};

/**
 * Build the seeded slot array: length = bracketSize, each entry is a
 * participant object or null (bye slot).
 */
const _buildSeededSlots = (players) => {
  const size = nextPowerOfTwo(players.length || 2);
  const order = _seedOrder(size); // 1-based seed positions
  return order.map((seed) => (seed <= players.length ? players[seed - 1] : null));
};

// ─── Main builder ─────────────────────────────────────────────────────────

/**
 * @param {object[]} participants     — array of participant objects (each has employee_id)
 * @param {object}   opts
 *   @param {number}  opts.playersPerTeam   — 1 (singles), 2 (doubles), 3 (triples). Default 1.
 *   @param {string}  opts.tournamentStartDate — "YYYY-MM-DD" for auto-scheduling
 *   @param {number}  opts.startHour           — local hour for first match (default 10)
 *   @param {number}  opts.intervalMinutes      — minutes between matches (default 30)
 *   @param {string}  opts.timezone             — IANA tz (default "Asia/Kolkata")
 */
export const buildKnockoutFixturePlan = (participants = [], opts = {}) => {
  if (!participants || participants.length < 2) return { rounds: [], bracketSize: 2 };

  const {
    playersPerTeam      = 1,
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const ppt = Math.max(1, Number(playersPerTeam) || 1);

  // For team play: group participants into teams, use the captain as the
  // "player" slot in the bracket.  Build a lookup map for later team injection.
  let teamMap = {};
  let bracketParticipants = participants;

  if (ppt > 1) {
    const shuffledAll = shuffleArray(participants);
    const teams = groupIntoTeams(shuffledAll, ppt);
    teamMap = Object.fromEntries(
      teams.map((t) => [t.captain.employee_id, t])
    );
    bracketParticipants = teams.map((t) => t.captain);
  }

  const shuffled = ppt > 1 ? bracketParticipants : shuffleArray(participants);
  const size = nextPowerOfTwo(shuffled.length);
  const slots = _buildSeededSlots(shuffled); // length = size, null = bye slot

  const rounds = [];

  // ── Round 0 (first round played) ────────────────────────────────────────
  // Pair slots: [0,1], [2,3], …
  // Skip pair if BOTH are null → phantom match (never create).
  const round0RoundSize = size;
  const round0Code = (() => {
    if (round0RoundSize === 2) return 'F';
    if (round0RoundSize === 4) return 'SF';
    if (round0RoundSize === 8) return 'QF';
    return `R${round0RoundSize}`;
  })();

  const r0Matches = [];
  // Track the "effective winner slot" for each pair so later rounds can
  // reference it. Each entry: { type: 'match'|'bye', matchCode?, playerId? }
  const r0EffectiveSlots = [];

  for (let i = 0; i < size; i += 2) {
    const playerA = slots[i];
    const playerB = slots[i + 1];

    // Both null → phantom: skip, mark both slots as empty
    if (!playerA && !playerB) {
      r0EffectiveSlots.push({ type: 'empty' });
      continue;
    }

    const isBye = !playerA || !playerB;
    const winnerId = isBye ? (playerA?.employee_id || playerB?.employee_id) : null;
    const matchNum = r0Matches.length + 1;
    const matchCode = `${round0Code}${matchNum}`;

    r0Matches.push({
      round:                 round0Code,
      match_number:          matchNum,
      match_code:            matchCode,
      player_a_employee_id:  playerA?.employee_id || null,
      player_b_employee_id:  playerB?.employee_id || null,
      status:                isBye ? 'bye' : 'scheduled',
      winner_employee_id:    winnerId,
      score_a:               isBye ? 1 : null,
      score_b:               isBye ? 0 : null,
      // Internal — used by AppContext pointer-wiring
      _bye_winner:           winnerId,
      // Filled in after the next round is built (see below)
      _feeds_into:           null,
    });

    r0EffectiveSlots.push(
      isBye
        ? { type: 'bye', playerId: winnerId }
        : { type: 'match', matchCode }
    );
  }

  if (r0Matches.length > 0) {
    rounds.push({
      round: round0Code,
      label: getRoundLabel(round0Code, r0Matches.length),
      matches: r0Matches,
    });
  }

  // ── Subsequent rounds ────────────────────────────────────────────────────
  // For each round we pair up the effective slots from the previous round.
  // Pairing rules:
  //   both empty            → skip, mark next slot as empty
  //   one real + one empty  → the real slot advances for free (no new match)
  //   both real             → create a match; pre-fill any known bye winners
  //
  // We also back-fill `_feeds_into` on every feeder match so AppContext can
  // wire next_match_winner_id and auto-advance byes using a reliable
  // code→code map instead of fragile Math.floor(index/2) arithmetic.
  let prevEffective = r0EffectiveSlots;

  // Flat map of matchCode → match object across ALL rounds built so far
  const matchByCode = new Map(r0Matches.map((m) => [m.match_code, m]));

  const numRounds = Math.log2(size); // total rounds in the bracket

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

      // Both empty → propagate empty
      if (slotA.type === 'empty' && slotB.type === 'empty') {
        nextEffective.push({ type: 'empty' });
        continue;
      }

      // One empty → the real slot advances without a new shell match.
      // Propagate unchanged so it can feed a real match in a later round.
      if (slotA.type === 'empty' || slotB.type === 'empty') {
        const real = slotA.type !== 'empty' ? slotA : slotB;
        nextEffective.push(real);
        continue;
      }

      // Both real → create a match
      const matchNum  = roundMatches.length + 1;
      const matchCode = `${roundCode}${matchNum}`;

      // Pre-fill slots when the feeder is already a known bye winner
      const playerAId = slotA.type === 'bye' ? slotA.playerId : null;
      const playerBId = slotB.type === 'bye' ? slotB.playerId : null;

      const isBye = slotA.type === 'bye' && slotB.type === 'bye';
      const winnerId = isBye ? playerAId : null;

      // Back-fill _feeds_into on both feeder matches so AppContext can use it
      for (const slot of [slotA, slotB]) {
        if (slot.matchCode) {
          const feeder = matchByCode.get(slot.matchCode);
          if (feeder) feeder._feeds_into = matchCode;
        }
      }

      const newMatch = {
        round:                 roundCode,
        match_number:          matchNum,
        match_code:            matchCode,
        player_a_employee_id:  playerAId,
        player_b_employee_id:  playerBId,
        status:                isBye ? 'bye' : 'scheduled',
        winner_employee_id:    winnerId,
        score_a:               isBye ? 1 : null,
        score_b:               isBye ? 0 : null,
        // Internal hints for AppContext: which bye winner to pre-place
        _preplace_a:           slotA.type === 'bye' ? slotA.playerId : null,
        _preplace_b:           slotB.type === 'bye' ? slotB.playerId : null,
        // Which prior match feeds each slot (used for pointer wiring)
        _feeds_from_a:         slotA.type === 'match' ? slotA.matchCode : null,
        _feeds_from_b:         slotB.type === 'match' ? slotB.matchCode : null,
        _bye_winner:           winnerId,
        _feeds_into:           null, // filled when the next round is built
      };

      roundMatches.push(newMatch);
      matchByCode.set(matchCode, newMatch);

      nextEffective.push(
        isBye
          ? { type: 'bye', playerId: winnerId, matchCode }
          : { type: 'match', matchCode }
      );
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

  // Inject team members for 2v2+ matches
  let finalRounds = ppt > 1 ? injectTeamPlayers(rounds, teamMap) : rounds;

  // Stamp scheduled times if a start date was provided
  if (tournamentStartDate) {
    finalRounds = stampScheduledTimes(finalRounds, tournamentStartDate, {
      startHour, intervalMinutes, timezone,
    });
  }

  return { rounds: finalRounds, bracketSize: size };
};

// ─── UI helpers ───────────────────────────────────────────────────────────

/**
 * Returns true when a match record has no players at all (TBD vs TBD).
 * These should never appear in the DB with the new engine, but guard
 * defensively in the UI.
 */
export const isPhantomMatch = (m) =>
  !m.player_a_employee_id && !m.player_b_employee_id;

/**
 * Returns true when a match is a bye — only one real player, or the
 * `status` field is explicitly 'bye'.
 */
export const isByeMatch = (m) =>
  String(m.status || '').toLowerCase() === 'bye' ||
  (!m.player_a_employee_id && !!m.player_b_employee_id) ||
  (!!m.player_a_employee_id && !m.player_b_employee_id);

// ─── Smart Refresh helper ─────────────────────────────────────────────────

/**
 * refreshKnockoutPlan(existingMatches, participants)
 *
 * Compares the current participant list with existing fixtures and returns
 * an action plan describing what needs to change.
 *
 * Returns:
 * {
 *   status: 'up_to_date' | 'changed',
 *   message: string,
 *   matchesToDelete: string[],   // IDs of pending matches to remove
 *   newRounds: Round[],          // new rounds to insert (from buildKnockoutFixturePlan)
 * }
 */
export const refreshKnockoutPlan = (existingMatches = [], participants = []) => {
  const DONE = new Set(['completed', 'walkover', 'no_show', 'bye', 'draw', 'cancelled']);
  const doneMatches    = existingMatches.filter((m) => DONE.has(String(m.status || '').toLowerCase()));
  const pendingMatches = existingMatches.filter((m) => !DONE.has(String(m.status || '').toLowerCase()));

  const currentIds = new Set(participants.map((p) => p.employee_id));
  const playedIds  = new Set(
    doneMatches.flatMap((m) => [m.player_a_employee_id, m.player_b_employee_id].filter(Boolean))
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

  // Players eliminated in done matches cannot be re-entered
  const decidedWinners = new Set(
    doneMatches.filter((m) => m.winner_employee_id).map((m) => m.winner_employee_id)
  );
  const eliminatedIds = new Set(
    doneMatches
      .filter((m) => m.winner_employee_id && String(m.status || '') !== 'bye')
      .flatMap((m) => [m.player_a_employee_id, m.player_b_employee_id].filter(Boolean))
      .filter((id) => !decidedWinners.has(id))
  );

  const stillActive = participants.filter((p) => !eliminatedIds.has(p.employee_id));

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

/**
 * @param {object[]} participants
 * @param {object}   opts  — same shape as buildKnockoutFixturePlan opts
 */
export const buildRoundRobinFixturePlan = (participants = [], opts = {}) => {
  const {
    playersPerTeam      = 1,
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const ppt = Math.max(1, Number(playersPerTeam) || 1);

  let teamMap = {};
  let bracketParticipants = participants;

  if (ppt > 1) {
    const teams = groupIntoTeams(participants, ppt);
    teamMap = Object.fromEntries(teams.map((t) => [t.captain.employee_id, t]));
    bracketParticipants = teams.map((t) => t.captain);
  }

  const matches = [];
  let counter = 1;
  for (let i = 0; i < bracketParticipants.length; i += 1) {
    for (let j = i + 1; j < bracketParticipants.length; j += 1) {
      matches.push({
        round: 'RR',
        match_number: counter,
        match_code: `RR${counter}`,
        player_a_employee_id: bracketParticipants[i]?.employee_id || null,
        player_b_employee_id: bracketParticipants[j]?.employee_id || null,
        status: 'scheduled',
        winner_employee_id: null,
        score_a: null,
        score_b: null,
      });
      counter += 1;
    }
  }

  let rounds = [{ round: 'RR', label: 'Round Robin', matches }];

  if (ppt > 1) rounds = injectTeamPlayers(rounds, teamMap);
  if (tournamentStartDate) {
    rounds = stampScheduledTimes(rounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  return { rounds };
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
export const buildRoundRobinKnockoutPlan = (standings = [], opts = {}) => {
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

/**
 * Build a complete League fixture plan:
 *   • ALL round-robin matches (every participant plays each other once)
 *   • Complete knockout bracket SHELLS (QF / SF / Final) with null players = TBD
 *
 * The KO shells are created immediately so the bracket is visible from day 1.
 * As RR results come in, call `updateKnockoutShellsFromStandings` to fill in
 * the actual player slots.
 *
 * KO structure (matches top-5 from standings):
 *   Seed 1, 2, 3 → BYE into SF
 *   KO_QF1: Seed 4 vs Seed 5
 *   KO_SF1: Seed 1 vs winner(KO_QF1)
 *   KO_SF2: Seed 2 vs Seed 3
 *   KO_F1 : winner(KO_SF1) vs winner(KO_SF2)
 *
 * @param {object[]} participants
 * @param {object}   opts
 * @returns {{ rrRounds: Round[], koMatches: object[] }}
 */
export const buildLeagueFullFixturePlan = (participants = [], opts = {}) => {
  const {
    playersPerTeam      = 1,
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const ppt = Math.max(1, Number(playersPerTeam) || 1);

  let teamMap = {};
  let bracketParticipants = participants;

  if (ppt > 1) {
    const teams = groupIntoTeams(participants, ppt);
    teamMap = Object.fromEntries(teams.map((t) => [t.captain.employee_id, t]));
    bracketParticipants = teams.map((t) => t.captain);
  }

  // ── Round-Robin matches ─────────────────────────────────────────────────
  const rrMatches = [];
  let counter = 1;
  for (let i = 0; i < bracketParticipants.length; i++) {
    for (let j = i + 1; j < bracketParticipants.length; j++) {
      rrMatches.push({
        round: 'RR',
        match_number: counter,
        match_code: `RR${counter}`,
        player_a_employee_id: bracketParticipants[i]?.employee_id || null,
        player_b_employee_id: bracketParticipants[j]?.employee_id || null,
        status: 'scheduled',
        winner_employee_id: null,
        score_a: null,
        score_b: null,
      });
      counter++;
    }
  }

  let rrRounds = [{ round: 'RR', label: 'Round Robin', matches: rrMatches }];
  if (ppt > 1) rrRounds = injectTeamPlayers(rrRounds, teamMap);
  if (tournamentStartDate) {
    rrRounds = stampScheduledTimes(rrRounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  // ── KO Shell matches (all TBD) ──────────────────────────────────────────
  // Shells are inserted with null players; they get filled as RR results come in.
  const koMatches = [
    // QF: Seed 4 vs Seed 5
    {
      round: 'QF',
      match_number: 1,
      match_code: 'KO_QF1',
      player_a_employee_id: null,
      player_b_employee_id: null,
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
    // SF1: Seed 1 vs winner(QF)
    {
      round: 'SF',
      match_number: 1,
      match_code: 'KO_SF1',
      player_a_employee_id: null,
      player_b_employee_id: null,
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
    // SF2: Seed 2 vs Seed 3
    {
      round: 'SF',
      match_number: 2,
      match_code: 'KO_SF2',
      player_a_employee_id: null,
      player_b_employee_id: null,
      status: 'scheduled',
      winner_employee_id: null,
      score_a: null,
      score_b: null,
    },
    // Final
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

  return { rrRounds, koMatches };
};

/**
 * Given current RR standings (sorted best→worst), return the set of Supabase
 * updates needed to fill KO shell matches with the correct players.
 *
 * Only updates slots that can be determined and are not yet filled by a real
 * match result. Returns an array of { matchCode, update } objects.
 *
 * Seeding:
 *   Seed 1 → KO_SF1.player_a
 *   Seed 2 → KO_SF2.player_a
 *   Seed 3 → KO_SF2.player_b
 *   Seed 4 → KO_QF1.player_a
 *   Seed 5 → KO_QF1.player_b
 *
 * @param {object[]} standings   — computeRoundRobinStandings result (sorted)
 * @param {object[]} koMatches   — existing KO match rows from Supabase
 * @returns {Array<{ id: string, update: object }>}
 */
export const computeKnockoutShellUpdates = (standings = [], koMatches = []) => {
  const byCode = new Map(koMatches.map((m) => [String(m.match_code || '').toUpperCase(), m]));

  const seed = (n) => standings[n - 1]?.employee_id || null;

  const updates = [];

  const tryUpdate = (code, field, value) => {
    if (!value) return; // no player determined yet
    const match = byCode.get(code);
    if (!match) return;
    // Don't overwrite a slot that already has a real match result player
    // (i.e. the match is completed/walkover) — only update TBD slots.
    if (String(match.status || '').toLowerCase() === 'completed') return;
    if (String(match[field] || '') === String(value)) return; // already correct
    updates.push({ id: match.id, update: { [field]: value } });
  };

  // KO_QF1: Seed4 vs Seed5
  tryUpdate('KO_QF1', 'player_a_employee_id', seed(4));
  tryUpdate('KO_QF1', 'player_b_employee_id', seed(5));

  // KO_SF1: Seed1 vs winner(QF) — only fill Seed1 here (QF winner filled by advanceWinner)
  tryUpdate('KO_SF1', 'player_a_employee_id', seed(1));

  // KO_SF2: Seed2 vs Seed3
  tryUpdate('KO_SF2', 'player_a_employee_id', seed(2));
  tryUpdate('KO_SF2', 'player_b_employee_id', seed(3));

  return updates;
};

/**
 * @param {object[]} participants
 * @param {object[]} matches       — existing matches (for standing + opponent tracking)
 * @param {number}   roundNumber
 * @param {object}   opts          — same shape as buildKnockoutFixturePlan opts
 */
export const buildSwissRoundPlan = (participants = [], matches = [], roundNumber = 1, opts = {}) => {
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

  const {
    playersPerTeam      = 1,
    tournamentStartDate = null,
    startHour           = 10,
    intervalMinutes     = 30,
    timezone            = 'Asia/Kolkata',
  } = opts;

  const ppt = Math.max(1, Number(playersPerTeam) || 1);
  let teamMap = {};
  if (ppt > 1) {
    const teams = groupIntoTeams(participants, ppt);
    teamMap = Object.fromEntries(teams.map((t) => [t.captain.employee_id, t]));
  }

  let rounds = [{
    round: `SW${roundNumber}`,
    label: `Swiss Round ${roundNumber}`,
    matches: roundMatches,
  }];

  if (ppt > 1) rounds = injectTeamPlayers(rounds, teamMap);
  if (tournamentStartDate) {
    rounds = stampScheduledTimes(rounds, tournamentStartDate, { startHour, intervalMinutes, timezone });
  }

  return { standings, rounds };
};