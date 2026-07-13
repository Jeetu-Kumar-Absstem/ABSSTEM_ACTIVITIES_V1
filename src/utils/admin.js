// src/utils/admin.js

// Client-side mirror of public.app_admins (see models/18_admins.sql).
// The DB table is the authoritative source — keep this list in sync so admin
// UI shows up on first paint without waiting for a round-trip.
// When you add/remove an admin, update BOTH this file AND the
// `public.app_admins` table (insert / delete rows).

export const ADMIN_IDS = [
  'atemp157',
  'ABSE1022',
  'ABCD1234',
  'atemp139'
  // Add more admin IDs here as needed
];

// Check if an employee ID is an admin
export const isAdminId = (empId) => {
  if (!empId) return false;
  return ADMIN_IDS.includes(String(empId).trim().toUpperCase());
};
