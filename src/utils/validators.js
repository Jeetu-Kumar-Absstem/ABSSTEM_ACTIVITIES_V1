// src/utils/validators.js

/**
 * Validate Employee ID format: 4 letters + 4 digits
 * Example: ABCD1234, XYZW5678
 */
export const validateEmpId = (id) => {
  if (!id || id.length !== 8) return false;
  const firstFour = id.slice(0, 4);
  const lastFour = id.slice(4, 8);
  const isFirstFourLetters = /^[a-zA-Z]{4}$/.test(firstFour);
  const isLastFourDigits = /^[0-9]{4}$/.test(lastFour);
  return isFirstFourLetters && isLastFourDigits;
};

/**
 * Format Employee ID as user types
 * - First 4 chars: letters only (A-Z)
 * - Last 4 chars: digits only (0-9)
 */
export const formatEmpId = (value) => {
  // Remove any non-alphanumeric characters
  let cleaned = value.replace(/[^a-zA-Z0-9]/g, '');
  
  let formatted = '';
  let letterIndex = 0;
  let digitIndex = 0;
  
  for (let i = 0; i < cleaned.length && formatted.length < 8; i++) {
    const char = cleaned[i];
    
    if (formatted.length < 4) {
      // First 4 chars: letters only
      if (/[a-zA-Z]/.test(char)) {
        formatted += char.toUpperCase();
      }
      // If not a letter, skip it (don't add)
    } else {
      // Last 4 chars: digits only
      if (/[0-9]/.test(char)) {
        formatted += char;
      }
      // If not a digit, skip it
    }
  }
  
  return formatted;
};

/**
 * Validate password: min 8 chars, uppercase, lowercase, digit, special (# or @)
 */
export const validatePassword = (pass) => {
  const minLength = pass.length >= 8;
  const hasUpperCase = /[A-Z]/.test(pass);
  const hasLowerCase = /[a-z]/.test(pass);
  const hasDigit = /[0-9]/.test(pass);
  const hasSpecial = /[#@]/.test(pass);
  return minLength && hasUpperCase && hasLowerCase && hasDigit && hasSpecial;
};

/**
 * Get password validation errors
 */
export const getPasswordErrors = (pass) => {
  const errors = [];
  if (pass.length < 8) errors.push('Minimum 8 characters');
  if (!/[A-Z]/.test(pass)) errors.push('At least 1 uppercase letter');
  if (!/[a-z]/.test(pass)) errors.push('At least 1 lowercase letter');
  if (!/[0-9]/.test(pass)) errors.push('At least 1 digit');
  if (!/[#@]/.test(pass)) errors.push('At least 1 special character (# or @)');
  return errors;
};