/**
 * Sanitizes numeric input by converting commas to dots and removing invalid characters.
 * Limits decimal places and applies min/max constraints.
 * @param {string} value - The input value to sanitize.
 * @param {number|null} maxDecimals - Maximum decimal places allowed.
 * @param {number|null} min - Minimum value allowed.
 * @param {number|null} max - Maximum value allowed.
 * @returns {string} The sanitized numeric string.
 */
export function sanitizeNumericInput(value, maxDecimals = 2, min = null, max = null) {
  if (typeof value !== 'string') return value;
  
  // Replace comma with dot
  let sanitized = value.replace(',', '.');
  
  // Keep track of negative sign if it's at the start
  const isNegative = sanitized.startsWith('-');
  
  // Remove all non-numeric characters except dot
  sanitized = sanitized.replace(/[^\d.]/g, '');
  
  // Handle multiple dots - keep only the first one
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // For validation, we need to know the actual numeric value including potential negative sign
  let checkValue = sanitized;
  if (isNegative) checkValue = '-' + sanitized;
  
  const numValue = parseFloat(checkValue);
  
  // Re-add negative sign to sanitized string if applicable (unless min is 0 or positive)
  if (isNegative && (min === null || min < 0)) {
    sanitized = '-' + sanitized;
  }
  
  // Handle max decimals
  if (maxDecimals !== null && sanitized.includes('.')) {
    const [integerPart, decimalPart] = sanitized.split('.');
    if (maxDecimals === 0) {
      sanitized = integerPart;
    } else if (decimalPart.length > maxDecimals) {
      sanitized = `${integerPart}.${decimalPart.substring(0, maxDecimals)}`;
    }
  }

  // Handle min/max constraints using the checkValue
  if (!isNaN(numValue)) {
    if (min !== null && numValue < min) {
      sanitized = min.toString();
    }
    if (max !== null && numValue > max) {
      sanitized = max.toString();
    }
  }
  
  return sanitized;
}

/**
 * Rounds a diopter value to the nearest 0.25 step.
 * @param {number|string} value - The value to round.
 * @returns {number} The rounded value.
 */
export function roundToDiopterStep(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 0;
  
  // Multiply by 4 to bring 0.25 to 1.0, round to integer, then divide by 4
  return Math.round(num * 4) / 4;
}

/**
 * Formats a diopter value for display (e.g., +2.25, -1.00).
 * @param {number|string} value - The value to format.
 * @param {boolean} isEixo - If true, treats as an axis (no decimals).
 * @returns {string} The formatted string.
 */
export function formatDiopter(value, isEixo = false) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return isEixo ? '0' : '0.00';
  
  if (isEixo) {
    return Math.round(num).toString();
  }
  
  const absNum = Math.abs(num).toFixed(2);
  return num > 0 ? `+${absNum}` : num < 0 ? `-${absNum}` : '0.00';
}
