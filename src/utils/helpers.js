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
  return bans.some(b => 
    b.employee === employee && 
    (b.game === game || b.game === 'All Games') &&
    new Date(b.until) > new Date()
  );
};