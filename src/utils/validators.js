// src/utils/validators.js

/**
 * Validate Employee ID format:
 * - 3 to 5 letters followed by 3 to 4 digits
 * Examples: ABC123, ABC1234, ABCD1234, ABCDE123
 */
export const validateEmpId = (id) => {
  if (!id) return false;
  return /^[A-Za-z]{3,5}[0-9]{3,4}$/.test(String(id).trim());
};

/**
 * Format Employee ID as user types.
 * Keeps the alphabetic prefix first, then up to 4 trailing digits.
 */
export const formatEmpId = (value) => {
  const cleaned = String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  let letters = '';
  let digits = '';

  for (const char of cleaned) {
    if (/[A-Z]/.test(char)) {
      if (letters.length < 5 && digits.length === 0) {
        letters += char;
      }
    } else if (/[0-9]/.test(char)) {
      if (letters.length >= 3 && digits.length < 4) {
        digits += char;
      }
    }
  }

  return `${letters}${digits}`;
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
