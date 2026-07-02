// src/utils/helpers.js
export const getDayName = (date) => {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
};

export const formatDate = (date) => {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const getSlotCapacity = (bookings, day, slotId) => {
  return bookings?.[day]?.[slotId]?.length || 0;
};

export const isSlotFull = (bookings, day, slotId, max = 4) => {
  return getSlotCapacity(bookings, day, slotId) >= max;
};

export const isBanned = (employee, game, bans) => {
  if (!bans || !employee) return false;
  const employeeName = typeof employee === 'string' ? employee : employee.name || employee.employee || '';
  const employeeId = typeof employee === 'string'
    ? employee
    : employee.employee_id || employee.emp_id || employee.user_metadata?.emp_id || '';
  const normalizedGame = (value) => `${value || ''}`.trim().toLowerCase();
  const selectedGame = normalizedGame(game);

  return bans.some(b => {
    const bannedEmployeeName = normalizedGame(b.employee);
    const bannedEmployeeId = normalizedGame(b.employee_id);
    const bannedGame = normalizedGame(b.game);
    const untilDate = b.until_date || b.until;
    const employeeMatches = Boolean(employeeId)
      ? bannedEmployeeId === normalizedGame(employeeId)
      : bannedEmployeeName === normalizedGame(employeeName);
    const gameMatches = !selectedGame
      || bannedGame === 'all games'
      || bannedGame === 'all'
      || bannedGame === selectedGame;

    return employeeMatches && gameMatches && untilDate && new Date(untilDate) > new Date();
  });
};

const WEEKDAY_OFFSETS = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
};

export const getWeekStartDate = (referenceDate = new Date()) => {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date;
};

export const getSlotDateTime = (day, time, referenceDate = new Date()) => {
  const weekStart = getWeekStartDate(referenceDate);
  const offset = WEEKDAY_OFFSETS[day] ?? 0;
  const slotDate = new Date(weekStart);
  slotDate.setDate(weekStart.getDate() + offset);

  const [hourPart, minutePart] = String(time || '00:00').split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  slotDate.setHours(hour, minute, 0, 0);
  return slotDate;
};

export const isSlotFinished = (day, slot, referenceDate = new Date(), now = new Date()) => {
  if (!slot?.endTime) return false;
  return getSlotDateTime(day, slot.endTime, referenceDate) <= now;
};

export const getPlayerStatsFromResults = (results = [], employeeId = '') => {
  const normalizedEmployeeId = String(employeeId || '').trim().toUpperCase();
  const orderedResults = [...results].sort((a, b) => {
    const aTime = new Date(a.created_at || a.updated_at || 0).getTime();
    const bTime = new Date(b.created_at || b.updated_at || 0).getTime();
    return aTime - bTime;
  });

  return orderedResults.reduce(
    (acc, result) => {
      const teamA = Array.isArray(result.team_a_players) ? result.team_a_players : [];
      const teamB = Array.isArray(result.team_b_players) ? result.team_b_players : [];
      const flattenedPlayers = [...teamA, ...teamB];
      const playerTeam = teamA.some((player) => String(player.employee_id || '').toUpperCase() === normalizedEmployeeId)
        ? 'team_a'
        : teamB.some((player) => String(player.employee_id || '').toUpperCase() === normalizedEmployeeId)
          ? 'team_b'
          : null;

      if (!playerTeam) {
        return acc;
      }

      acc.gamesPlayed += 1;
      acc.participations.push({
        day: result.day,
        slotId: result.slot_id,
        result: result.result,
        teamA,
        teamB,
        players: flattenedPlayers,
      });

      if (String(result.result).toLowerCase() === 'draw') {
        acc.draws += 1;
        acc.points += 2;
        acc.currentWinStreak = 0;
        return acc;
      }

      if (String(result.result).toLowerCase() === playerTeam) {
        acc.wins += 1;
        acc.points += 4;
        acc.currentWinStreak += 1;
        acc.bestWinStreak = Math.max(acc.bestWinStreak, acc.currentWinStreak);
      } else {
        acc.losses += 1;
        acc.points += 1;
        acc.currentWinStreak = 0;
      }

      return acc;
    },
    {
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      participations: [],
    }
  );
};
