// src/utils/validators.js

/**
 * Validate Employee ID format (8 chars total):
 *   - 4 letters + 4 digits  (e.g. ABCD1234)
 *   - 5 letters + 3 digits  (e.g. ABCDE123)
 */
export const validateEmpId = (id) => {
  if (!id || id.length !== 8) return false;
  const firstFour = id.slice(0, 4);
  const lastFour = id.slice(4, 8);

  const isFirstFourLetters = /^[a-zA-Z]{4}$/.test(firstFour);
  const isLastFourDigits = /^[0-9]{4}$/.test(lastFour);
  //



  // we have to add this validation for 5 letters 3 numbers 

  const firstFive = id.slice(0, 5);
  const lastThree = id.slice(5, 8);

  const isFirstFiveLetters = /^[a-zA-Z]{5}$/.test(firstFive);
  const isLastThreeDigits = /^[0-9]{3}$/.test(lastThree);


  if (isFirstFiveLetters && isLastThreeDigits) {
    return true;
  }
  return isFirstFourLetters && isLastFourDigits;
};

/**
 * Format Employee ID as user types.
 * Supports two formats (both 8 chars):
 *   - 4 letters + 4 digits  (e.g. ABCD1234)
 *   - 5 letters + 3 digits  (e.g. ABCDE123)
 *
 * Strategy: collect letters first, then digits.
 * The split point (4 or 5) is determined once the user starts typing digits.
 * Until a digit is entered, up to 5 letters are accepted.
 * Once a digit is entered, no more letters are allowed.
 */
export const formatEmpId = (value) => {
  // Strip anything that isn't a letter or digit
  const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  let letters = '';
  let digits = '';
  let digitStarted = false;

  for (const char of cleaned) {
    if (!digitStarted && /[A-Z]/.test(char)) {
      // Accept letters until we hit a digit, max 5
      if (letters.length < 5) letters += char;
    } else if (/[0-9]/.test(char)) {
      digitStarted = true;
      // Total length must stay at 8: digits fill the remaining slots
      const maxDigits = 8 - letters.length;
      if (digits.length < maxDigits) digits += char;
    }
    // Letters after digits have started are silently dropped
  }

  return letters + digits;
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