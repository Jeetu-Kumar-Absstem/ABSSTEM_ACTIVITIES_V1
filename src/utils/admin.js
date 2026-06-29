// src/utils/admin.js

// List of admin employee IDs
export const ADMIN_IDS = [
  'ABCD1234',
  'ABCD6789',
  // Add more admin IDs here as needed
];

// Check if an employee ID is an admin
export const isAdminId = (empId) => {
  if (!empId) return false;
  return ADMIN_IDS.includes(String(empId).trim().toUpperCase());
};
