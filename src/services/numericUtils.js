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
 * Interpreta entradas numéricas rápidas (sem pontuação) e converte para dioptrias.
 * Exemplos:
 *   - '200' -> 2.00
 *   - '20'  -> 2.00
 *   - '25'  -> 2.50
 *   - '10'  -> 1.00
 *   - '15'  -> 1.50
 *   - '12'  -> 12.00 (grau inteiro direto de 2 dígitos)
 *   - '255' -> 2.55 (será validado para múltiplo de 0.25)
 *   - '1000' -> 10.00
 *   - '2.5' -> 2.50
 * @param {string|number} value
 * @returns {number}
 */
export function parseDiopterShorthand(value) {
  if (value === undefined || value === null) return 0;
  
  const str = String(value).trim().replace(',', '.');
  if (!str) return 0;
  
  // Se já contém ponto decimal explícito (ex: "2.5", "2.25", "12.0")
  if (str.includes('.')) {
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }
  
  const digits = str.replace(/\D/g, '');
  if (!digits) return 0;
  
  const len = digits.length;
  
  if (len === 1) {
    // 1 dígito: "2" -> 2.00, "5" -> 5.00
    return parseFloat(digits);
  }
  
  if (len === 2) {
    // Caso especial "75" -> 0.75 (em óptica clínica, "grau 75" é 0.75)
    if (digits === '75') {
      return 0.75;
    }
    
    // Começa com '0' (ex: "05" -> 0.50)
    if (digits.startsWith('0')) {
      return parseFloat(digits) / 10;
    }
    
    // Termina em '0' ou '5' (ex: "20" -> 2.00, "25" -> 2.50, "10" -> 1.00, "15" -> 1.50)
    if (digits.endsWith('0') || digits.endsWith('5')) {
      return parseFloat(digits) / 10;
    }
    
    // Demais números de 2 dígitos (ex: "11", "12", "13", "14", "16", "18", "21")
    // Tratados como dioptrias inteiras diretas (ex: "12" -> 12.00)
    return parseFloat(digits);
  }
  
  if (len === 3) {
    // 3 dígitos: divide por 100 (ex: "200" -> 2.00, "225" -> 2.25, "250" -> 2.50, "255" -> 2.55, "075" -> 0.75)
    return parseFloat(digits) / 100;
  }
  
  // 4 ou mais dígitos (ex: "1000" -> 10.00, "1050" -> 10.50, "1200" -> 12.00, "1250" -> 12.50)
  return parseFloat(digits) / 100;
}

/**
 * Verifica se um valor de dioptria é múltiplo exato de 0.25 (.00, .25, .50, .75).
 * @param {number} num 
 * @returns {boolean}
 */
export function isValidDiopterStep(num) {
  if (isNaN(num)) return false;
  const remainder = Math.abs(num * 4 - Math.round(num * 4));
  return remainder < 0.0001;
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
 * Processa uma entrada de dioptria completa:
 * - Interpreta atalhos numéricos sem separador
 * - Valida se é múltiplo de 0.25
 * - Ajusta para o múltiplo mais próximo se inválido (ex: 2.55 -> 2.50)
 * - Formata com 2 casas decimais e preserva o sinal (+ / -)
 * 
 * @param {string|number} rawValue - Valor digitado
 * @param {boolean|null} isNegativeOverride - Se especificado, força sinal negativo ou positivo
 * @param {boolean} includeSign - Se true, inclui '+' para positivos (padrão em receitas: formatDiopter)
 * @returns {{
 *   formatted: string,
 *   numericValue: number,
 *   wasAdjusted: boolean,
 *   adjustedFrom: string,
 *   originalRaw: string
 * }}
 */
export function processDiopterValue(rawValue, isNegativeOverride = null, includeSign = false) {
  if (rawValue === undefined || rawValue === null) {
    return { formatted: '', numericValue: 0, wasAdjusted: false, adjustedFrom: '', originalRaw: '' };
  }

  const rawStr = String(rawValue).trim();
  if (rawStr === '' || rawStr === '-' || rawStr === '+') {
    return { formatted: '', numericValue: 0, wasAdjusted: false, adjustedFrom: '', originalRaw: rawStr };
  }

  // Determina o sinal negativo
  let isNegative = false;
  if (isNegativeOverride !== null) {
    isNegative = Boolean(isNegativeOverride);
  } else if (rawStr.startsWith('-')) {
    isNegative = true;
  }

  // Remove sinais da string para processamento da magnitude
  const magnitudeStr = rawStr.replace(/^[+-]/, '').trim();
  
  // Interpreta atalhos e obtém valor numérico
  const parsedMagnitude = parseDiopterShorthand(magnitudeStr);
  
  // Valida múltiplo de 0.25
  const isValid = isValidDiopterStep(parsedMagnitude);
  let finalMagnitude = parsedMagnitude;
  let wasAdjusted = false;
  let adjustedFrom = '';

  if (!isValid) {
    finalMagnitude = roundToDiopterStep(parsedMagnitude);
    wasAdjusted = true;
    adjustedFrom = parsedMagnitude.toFixed(2);
  }

  const formattedMag = finalMagnitude.toFixed(2);
  const numericValue = isNegative ? -finalMagnitude : finalMagnitude;
  
  let formatted = formattedMag;
  if (isNegative) {
    formatted = `-${formattedMag}`;
  } else if (includeSign && finalMagnitude > 0) {
    formatted = `+${formattedMag}`;
  }

  return {
    formatted,
    numericValue,
    wasAdjusted,
    adjustedFrom,
    originalRaw: rawStr
  };
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
