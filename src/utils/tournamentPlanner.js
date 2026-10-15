// ─────────────────────────────────────────────────────────────────────────────
// tournamentPlanner.js
//
// PURE planning helpers for tournaments (no Supabase / React / DOM imports).
// Answers: "given a format, a player cap and a team size, how many teams are
// there, who is left over, how many matches, how long will it take, and is
// this combination even valid?"
//
// Used by: the create/edit form (live preview), registration cap,
// generateTournamentFixtures (pre-validation) and the fixture builders
// (playoff shape).
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_TEAMS = { knockout: 2, round_robin: 2, swiss: 4 };

const normalizeFormat = (format) => {
  const f = String(format || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (f === 'league' || f === 'round_robin' || f === 'roundrobin') return 'round_robin';
  if (f === 'knockout' || f === 'single_elimination') return 'knockout';
  if (f === 'swiss') return 'swiss';
  return f;
};

const toPositiveInt = (value, fallback = 1) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};

const nextPow2 = (n) => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

// ── Teams & leftovers ───────────────────────────────────────────────────────
export const computeTeamCount = (players, playersPerTeam = 1) => {
  const p = Math.max(0, Math.floor(Number(players) || 0));
  const ppt = toPositiveInt(playersPerTeam, 1);
  return { teams: Math.floor(p / ppt), leftover: p % ppt };
};

// Round the player cap down to a whole number of teams.
export const getEffectiveMaxPlayers = (maxPlayers, playersPerTeam = 1) => {
  const max = Math.max(0, Math.floor(Number(maxPlayers) || 0));
  const ppt = toPositiveInt(playersPerTeam, 1);
  return Math.floor(max / ppt) * ppt;
};

// ── Knockout bracket math ───────────────────────────────────────────────────
export const getKnockoutStats = (teamCount) => {
  const t = Math.max(0, Math.floor(Number(teamCount) || 0));
  if (t < 2) return { bracketSize: t, byes: 0, playedMatches: 0, rounds: 0 };
  const bracketSize = nextPow2(t);
  return {
    bracketSize,
    byes: bracketSize - t,
    playedMatches: t - 1,
    rounds: Math.log2(bracketSize),
  };
};

// ── Playoff shape for round robin ───────────────────────────────────────────
// Single source of truth for which KO_* shells exist for a given team count,
// how they are wired (pointers) and which league seed fills which slot.
//
//   2 teams  → no playoff (league winner is champion)
//   3 teams  → SF1 (2 v 3) → F1 (seed 1 waits as team A)
//   4 teams  → SF1 (1 v 4), SF2 (2 v 3) → F1
//   5+ teams → QF1 (4 v 5) → SF1 (1 v QF1 winner), SF2 (2 v 3) → F1
export const getPlayoffShape = (teamCount, playoffMode = 'auto') => {
  const n = Math.max(0, Math.floor(Number(teamCount) || 0));
  const none = { kind: 'none', matches: [], pointers: [], seedMap: {}, codes: [] };

  if (String(playoffMode).toLowerCase() === 'none' || n < 3) return none;

  const m = (round, number, code) => ({ round, match_number: number, match_code: code });

  if (n === 3) {
    return {
      kind: 'sf_final_bye',
      matches: [m('SF', 1, 'KO_SF1'), m('F', 1, 'KO_F1')],
      pointers: [{ from: 'KO_SF1', to: 'KO_F1' }],
      seedMap: { KO_SF1: { a: 2, b: 3 }, KO_F1: { a: 1 } },
      codes: ['KO_SF1', 'KO_F1'],
    };
  }

  if (n === 4) {
    return {
      kind: 'sf_final',
      matches: [m('SF', 1, 'KO_SF1'), m('SF', 2, 'KO_SF2'), m('F', 1, 'KO_F1')],
      pointers: [
        { from: 'KO_SF1', to: 'KO_F1' },
        { from: 'KO_SF2', to: 'KO_F1' },
      ],
      seedMap: { KO_SF1: { a: 1, b: 4 }, KO_SF2: { a: 2, b: 3 } },
      codes: ['KO_SF1', 'KO_SF2', 'KO_F1'],
    };
  }

  return {
    kind: 'qf_sf_final',
    matches: [m('QF', 1, 'KO_QF1'), m('SF', 1, 'KO_SF1'), m('SF', 2, 'KO_SF2'), m('F', 1, 'KO_F1')],
    pointers: [
      { from: 'KO_QF1', to: 'KO_SF1' },
      { from: 'KO_SF1', to: 'KO_F1' },
      { from: 'KO_SF2', to: 'KO_F1' },
    ],
    seedMap: {
      KO_QF1: { a: 4, b: 5 },
      KO_SF1: { a: 1 },
      KO_SF2: { a: 2, b: 3 },
    },
    codes: ['KO_QF1', 'KO_SF1', 'KO_SF2', 'KO_F1'],
  };
};

// Detect the shape from the KO_* shells that already exist in the database.
// (Used when updating shells after round-robin results arrive.)
export const detectPlayoffShapeFromCodes = (codes = []) => {
  const set = new Set(codes.map((c) => String(c || '').toUpperCase()));
  if (set.has('KO_QF1')) return getPlayoffShape(5);
  if (set.has('KO_SF2')) return getPlayoffShape(4);
  if (set.has('KO_SF1')) return getPlayoffShape(3);
  return getPlayoffShape(2);
};

// ── Main entry point ────────────────────────────────────────────────────────
export const planTournament = ({
  format,
  maxPlayers,
  playersPerTeam = 1,
  registeredPlayers,
  playoffMode = 'auto',
  leftoverPolicy = 'block', // 'block' | 'exclude' | 'smaller_team'
  matchesPerSlot = 1,
  intervalMinutes = 30,
  dayStartHour = 10,
  dayEndHour = 18,
} = {}) => {
  const errors = [];
  const warnings = [];

  const fmt = normalizeFormat(format);
  const ppt = toPositiveInt(playersPerTeam, 1);
  const policy = ['block', 'exclude', 'smaller_team'].includes(leftoverPolicy) ? leftoverPolicy : 'block';

  // Planning from the cap (create form): a cap that is not a multiple of the team
  // size is rounded down to whole teams and reported as a warning. Planning from
  // real registrations: leftover players are subject to the leftover policy.
  const planningFromCap = registeredPlayers == null;
  const rawPlayers = planningFromCap
    ? (policy === 'smaller_team' ? maxPlayers : getEffectiveMaxPlayers(maxPlayers, ppt))
    : registeredPlayers;
  const players = Math.max(0, Math.floor(Number(rawPlayers) || 0));

  if (!MIN_TEAMS[fmt]) {
    errors.push(`Unsupported tournament format: ${format || '(none)'}`);
  }
  if (!Number.isInteger(Number(playersPerTeam)) || Number(playersPerTeam) < 1) {
    errors.push('Players per team must be a whole number of at least 1.');
  }

  let { teams, leftover } = computeTeamCount(players, ppt);

  // smaller_team: leftover players form one extra, shorter team.
  let smallerTeamSize = 0;
  if (leftover > 0 && policy === 'smaller_team') {
    teams += 1;
    smallerTeamSize = leftover;
    leftover = 0;
    warnings.push(`One team will have only ${smallerTeamSize} player${smallerTeamSize > 1 ? 's' : ''} instead of ${ppt}.`);
  }

  const effectiveMaxPlayers = getEffectiveMaxPlayers(maxPlayers ?? players, ppt);
  if (maxPlayers != null && Number(maxPlayers) !== effectiveMaxPlayers && policy !== 'smaller_team') {
    warnings.push(
      `${maxPlayers} is not a multiple of ${ppt}; only ${effectiveMaxPlayers} players (${effectiveMaxPlayers / ppt} teams) can be placed in teams.`
    );
  }

  const minTeams = MIN_TEAMS[fmt] || 2;
  if (MIN_TEAMS[fmt] && teams < minTeams) {
    errors.push(
      `Need at least ${minTeams} teams for ${fmt.replace('_', ' ')}, but ${players} player${players === 1 ? '' : 's'} ÷ ${ppt} per team gives ${teams} team${teams === 1 ? '' : 's'}.`
    );
  }

  if (leftover > 0) {
    if (policy === 'block') {
      errors.push(
        `${leftover} player${leftover > 1 ? 's' : ''} would be left out (${players} players ÷ ${ppt} per team). Change the team size or player count, or choose how to handle leftover players.`
      );
    } else if (policy === 'exclude') {
      warnings.push(`${leftover} player${leftover > 1 ? 's' : ''} will be left out of the tournament.`);
    }
  }

  // ── Match counts ──────────────────────────────────────────────────────────
  let leagueMatches = 0;
  let playoffMatches = 0;
  let knockoutMatches = 0;
  let bracketSize = 0;
  let byes = 0;
  let swissRounds = 0;
  let playoffKind = 'none';

  if (teams >= 2) {
    if (fmt === 'knockout') {
      const k = getKnockoutStats(teams);
      knockoutMatches = k.playedMatches;
      bracketSize = k.bracketSize;
      byes = k.byes;
      if (byes > 0) {
        warnings.push(`${teams} teams is not a power of two: ${byes} team${byes > 1 ? 's' : ''} will get a first-round bye.`);
      }
    } else if (fmt === 'round_robin') {
      leagueMatches = (teams * (teams - 1)) / 2;
      const shape = getPlayoffShape(teams, playoffMode);
      playoffMatches = shape.matches.length;
      playoffKind = shape.kind;
      if (shape.kind === 'none' && String(playoffMode).toLowerCase() !== 'none') {
        warnings.push('With only 2 teams there is no playoff; the league winner is the champion.');
      }
      if (teams > 12) {
        warnings.push(`${teams} teams means ${leagueMatches} league matches. Consider a knockout or Swiss format.`);
      }
    } else if (fmt === 'swiss') {
      swissRounds = Math.max(1, Math.ceil(Math.log2(teams)));
      leagueMatches = Math.floor(teams / 2) * swissRounds;
      warnings.push(`Swiss: ${swissRounds} rounds are recommended for ${teams} teams.`);
    }
  }

  const totalMatches = leagueMatches + playoffMatches + knockoutMatches;

  // ── Suggestions: concrete ways to fix a contradiction ───────────────────
  // Each suggestion: { id, text, apply } where `apply` is an optional patch the UI
  // can apply with one click: { max_participants?, players_per_team?, leftoverPolicy? }
  const suggestions = [];
  const addSuggestion = (sg) => {
    if (suggestions.length < 5 && !suggestions.some((x) => x.id === sg.id)) suggestions.push(sg);
  };
  const exactSizes = (count) => {
    const out = [];
    for (let size = 1; size <= Math.min(count, ppt + 6); size += 1) {
      if (size !== ppt && count % size === 0 && count / size >= minTeams) out.push(size);
    }
    return out.sort((a, b) => Math.abs(a - ppt) - Math.abs(b - ppt)).slice(0, 2);
  };

  if (MIN_TEAMS[fmt]) {
    const rawMax = Math.max(0, Math.floor(Number(maxPlayers) || 0));

    if (planningFromCap) {
      // Create / edit form: only the cap and team size are known.
      if (rawMax % ppt !== 0 && policy !== 'smaller_team') {
        if (effectiveMaxPlayers / ppt >= minTeams) {
          addSuggestion({
            id: 'cap-down',
            text: `Use ${effectiveMaxPlayers} max players (${effectiveMaxPlayers / ppt} teams of ${ppt}).`,
            apply: { max_participants: effectiveMaxPlayers },
          });
        }
        addSuggestion({
          id: 'cap-up',
          text: `Use ${effectiveMaxPlayers + ppt} max players (${effectiveMaxPlayers / ppt + 1} teams of ${ppt}).`,
          apply: { max_participants: effectiveMaxPlayers + ppt },
        });
        exactSizes(rawMax).forEach((size) =>
          addSuggestion({
            id: `size-${size}`,
            text: `Use ${size} players per team: ${rawMax} players make ${rawMax / size} teams with nobody left out.`,
            apply: { players_per_team: size },
          })
        );
      }
      if (teams < minTeams) {
        addSuggestion({
          id: 'cap-min',
          text: `Increase max players to ${minTeams * ppt} (${minTeams} teams of ${ppt}).`,
          apply: { max_participants: minTeams * ppt },
        });
        const smaller = Math.floor(rawMax / minTeams);
        if (smaller >= 1 && smaller < ppt) {
          addSuggestion({
            id: `size-${smaller}`,
            text: `Reduce players per team to ${smaller}: ${rawMax} players make ${Math.floor(rawMax / smaller)} teams.`,
            apply: { players_per_team: smaller },
          });
        }
      }
    } else {
      // Generate step: real registrations are known.
      if (teams < minTeams) {
        const needed = minTeams * ppt - players;
        if (needed > 0) {
          addSuggestion({
            id: 'add-players',
            text: `Register ${needed} more player${needed > 1 ? 's' : ''} (${minTeams * ppt} players = ${minTeams} teams of ${ppt}).`,
          });
        }
        const smaller = Math.floor(players / minTeams);
        if (smaller >= 1 && smaller < ppt) {
          addSuggestion({
            id: `size-${smaller}`,
            text: `Reduce players per team to ${smaller}: ${players} players make ${Math.floor(players / smaller)} teams.`,
            apply: { players_per_team: smaller },
          });
        }
      } else if (leftover > 0 && policy === 'block') {
        const needed = ppt - leftover;
        addSuggestion({
          id: 'add-players',
          text: `Register ${needed} more player${needed > 1 ? 's' : ''}: ${players + needed} players make ${teams + 1} teams of ${ppt}.`,
        });
        exactSizes(players).forEach((size) =>
          addSuggestion({
            id: `size-${size}`,
            text: `Change players per team to ${size}: ${players} players make ${players / size} teams with nobody left out.`,
            apply: { players_per_team: size },
          })
        );
        addSuggestion({
          id: 'smaller-team',
          text: `Put the ${leftover} extra player${leftover > 1 ? 's' : ''} in one smaller team.`,
          apply: { leftoverPolicy: 'smaller_team' },
        });
        addSuggestion({
          id: 'exclude',
          text: `Leave the ${leftover} extra player${leftover > 1 ? 's' : ''} out of the tournament.`,
          apply: { leftoverPolicy: 'exclude' },
        });
      }
    }

    if (fmt === 'knockout' && byes > 0 && teams >= 2) {
      const lowerTeams = bracketSize / 2;
      const upperTeams = bracketSize;
      if (lowerTeams >= 2) {
        addSuggestion({
          id: 'bracket-down',
          text: `For a bracket with no byes use ${lowerTeams} teams (${lowerTeams * ppt} players) or ${upperTeams} teams (${upperTeams * ppt} players).`,
          apply: planningFromCap ? { max_participants: lowerTeams * ppt } : undefined,
        });
      }
    }
  }

  // ── Duration ──────────────────────────────────────────────────────────────
  const perSlot = toPositiveInt(matchesPerSlot, 1);
  const interval = toPositiveInt(intervalMinutes, 30);
  const slots = Math.ceil(totalMatches / perSlot);
  const estimatedMinutes = slots * interval;
  const dayMinutes = Math.max(interval, (Number(dayEndHour) - Number(dayStartHour)) * 60);
  const estimatedDays = totalMatches > 0 ? Math.max(1, Math.ceil(estimatedMinutes / dayMinutes)) : 0;

  if (estimatedDays > 3) {
    warnings.push(
      `This needs about ${Math.round((estimatedMinutes / 60) * 10) / 10} hours of play (~${estimatedDays} days). Add more courts / matches per slot or pick a shorter format.`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    format: fmt,
    players,
    playersPerTeam: ppt,
    teams,
    leftover,
    smallerTeamSize,
    effectiveMaxPlayers,
    leagueMatches,
    playoffMatches,
    playoffKind,
    knockoutMatches,
    totalMatches,
    bracketSize,
    byes,
    swissRounds,
    estimatedMinutes,
    estimatedDays,
    suggestions,
  };
};

// One-line human summary, e.g. "20 players ÷ 5 = 4 teams · 6 league + 3 playoff matches · ≈ 4.5 h"
export const summarizePlan = (plan) => {
  if (!plan) return '';
  const parts = [`${plan.players} player${plan.players === 1 ? '' : 's'} ÷ ${plan.playersPerTeam} = ${plan.teams} team${plan.teams === 1 ? '' : 's'}`];
  if (plan.leftover > 0) parts.push(`${plan.leftover} left out`);
  if (plan.format === 'round_robin' && plan.teams >= 2) {
    parts.push(`${plan.leagueMatches} league${plan.playoffMatches ? ` + ${plan.playoffMatches} playoff` : ''} matches`);
  } else if (plan.format === 'knockout' && plan.teams >= 2) {
    parts.push(`${plan.knockoutMatches} matches`);
  } else if (plan.format === 'swiss' && plan.teams >= 4) {
    parts.push(`${plan.swissRounds} rounds`);
  }
  if (plan.totalMatches > 0) {
    const hours = Math.round((plan.estimatedMinutes / 60) * 10) / 10;
    parts.push(`≈ ${hours} h`);
  }
  return parts.join(' · ');
};