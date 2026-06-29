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
