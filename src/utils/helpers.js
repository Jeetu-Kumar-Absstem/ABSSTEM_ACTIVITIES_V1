// src/utils/helpers.js
export const getDayName = (date) => {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()];
};

export const formatDate = (date) => {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const normalizeText = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const normalizeEmployeeId = (value) =>
  String(value || '')
    .trim()
    .toUpperCase();

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

  return bans.some((b) => {
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

    return (b.active !== false) && employeeMatches && gameMatches && untilDate && new Date(untilDate) > new Date();
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

export const getWeekEndDate = (referenceDate = new Date()) => {
  const date = getWeekStartDate(referenceDate);
  date.setDate(date.getDate() + 4);
  date.setHours(23, 59, 59, 999);
  return date;
};

export const getWeekRange = (referenceDate = new Date()) => ({
  start: getWeekStartDate(referenceDate),
  end: getWeekEndDate(referenceDate),
});

export const isDateInWeek = (dateValue, referenceDate = new Date()) => {
  if (!dateValue) return true;
  const { start, end } = getWeekRange(referenceDate);
  const date = new Date(dateValue);
  return date >= start && date <= end;
};

export const isBookingInWeek = (booking, referenceDate = new Date()) => {
  if (!booking) return false;
  return isDateInWeek(booking.booked_at || booking.created_at || booking.updated_at, referenceDate);
};

export const filterBookingsToWeek = (bookings = {}, referenceDate = new Date()) => {
  const filtered = {};
  Object.entries(bookings || {}).forEach(([day, slots]) => {
    filtered[day] = {};
    Object.entries(slots || {}).forEach(([slotId, slotBookings]) => {
      filtered[day][slotId] = (slotBookings || []).filter((booking) => isBookingInWeek(booking, referenceDate));
    });
  });
  return filtered;
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

export const getPlayerStatsFromResults = (results = [], employeeId = '', employeeName = '') => {
  const normalizedEmployeeId = String(employeeId || '').trim().toUpperCase();
  const normalizedEmployeeName = String(employeeName || '').trim().toLowerCase();
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
      const matchesPlayer = (player) =>
        String(player.employee_id || '').toUpperCase() === normalizedEmployeeId ||
        String(player.name || '').trim().toLowerCase() === normalizedEmployeeName ||
        String(player.employee || '').trim().toLowerCase() === normalizedEmployeeName;

      const playerTeam = teamA.some(matchesPlayer)
        ? 'team_a'
        : teamB.some(matchesPlayer)
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

export const buildEmployeeLeaderboard = (employees = [], matchResults = {}) => {
  const leaderboard = new Map();
  const byEmployeeId = new Map();
  const byName = new Map();

  const getEmployeeKey = (employee = {}) => {
    const empId = normalizeEmployeeId(employee.employee_code || employee.employee_id || employee.emp_id || '');
    if (empId) return `id:${empId}`;
    const name = normalizeText(employee.name || employee.employee_name || '');
    return name ? `name:${name}` : null;
  };

  const getOrCreateRow = (employee = {}, fallbackPlayer = {}) => {
    const employeeId = normalizeEmployeeId(
      employee.employee_code || employee.employee_id || employee.emp_id || fallbackPlayer.employee_id || ''
    );
    const name = employee.name || employee.employee_name || fallbackPlayer.name || fallbackPlayer.employee || 'Employee';
    const department = employee.department || fallbackPlayer.department || 'General';
    const key = getEmployeeKey(employee) || getEmployeeKey(fallbackPlayer) || `name:${normalizeText(name)}`;

    if (!leaderboard.has(key)) {
      leaderboard.set(key, {
        rank: 0,
        employee_id: employeeId,
        name,
        department,
        points: 0,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      });
    }

    const row = leaderboard.get(key);
    row.employee_id = row.employee_id || employeeId;
    row.name = row.name || name;
    row.department = row.department || department;
    if (employeeId) byEmployeeId.set(employeeId, row);
    if (row.name) byName.set(normalizeText(row.name), row);
    return row;
  };

  employees.forEach((employee) => {
    getOrCreateRow(employee);
  });

  const resultRows = [
    ...(matchResults.carrom || []).map((row) => ({ ...row, game: 'carrom' })),
    ...(matchResults.chess || []).map((row) => ({ ...row, game: 'chess' })),
  ].sort((a, b) => new Date(a.created_at || a.updated_at || 0).getTime() - new Date(b.created_at || b.updated_at || 0).getTime());

  const resolvePlayerRow = (player = {}) => {
    const empId = normalizeEmployeeId(player.employee_id || player.emp_id || '');
    const name = normalizeText(player.name || player.employee || '');
    if (empId && byEmployeeId.has(empId)) return byEmployeeId.get(empId);
    if (name && byName.has(name)) return byName.get(name);
    return getOrCreateRow({}, player);
  };

  resultRows.forEach((result) => {
    const teamA = Array.isArray(result.team_a_players) ? result.team_a_players : [];
    const teamB = Array.isArray(result.team_b_players) ? result.team_b_players : [];
    const resultKey = normalizeText(result.result);
    const isDraw = resultKey === 'draw';

    teamA.forEach((player) => {
      const row = resolvePlayerRow(player);
      row.gamesPlayed += 1;
      if (isDraw) {
        row.draws += 1;
        row.points += 2;
      } else if (resultKey === 'team_a') {
        row.wins += 1;
        row.points += 4;
      } else {
        row.losses += 1;
        row.points += 1;
      }
    });

    teamB.forEach((player) => {
      const row = resolvePlayerRow(player);
      row.gamesPlayed += 1;
      if (isDraw) {
        row.draws += 1;
        row.points += 2;
      } else if (resultKey === 'team_b') {
        row.wins += 1;
        row.points += 4;
      } else {
        row.losses += 1;
        row.points += 1;
      }
    });
  });

  return [...leaderboard.values()]
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.gamesPlayed !== a.gamesPlayed) return b.gamesPlayed - a.gamesPlayed;
      return a.name.localeCompare(b.name);
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
};
