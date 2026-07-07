// src/utils/admin.js

// List of admin employee IDs
export const ADMIN_IDS = [
  'atemp157',
  'ABSE1022',
  // Add more admin IDs here as needed
];

// Check if an employee ID is an admin
export const isAdminId = (empId) => {
  if (!empId) return false;
  return ADMIN_IDS.includes(String(empId).trim().toUpperCase());
};
