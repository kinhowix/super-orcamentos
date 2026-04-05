import { createWorker } from 'tesseract.js';

/**
 * Process a prescription image and extract its text
 * @param {File|Blob|string} image - The image to process
 * @param {Function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<string>} The extracted text
 */
export async function extractTextFromImage(image, onProgress) {
  const worker = await createWorker('por', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        onProgress?.(Math.round(m.progress * 100));
      }
    }
  });

  try {
    const { data: { text } } = await worker.recognize(image);
    return text;
  } finally {
    await worker.terminate();
  }
}

/**
 * Parses raw OCR text into a structured prescription object
 * @param {string} text - Raw text from OCR
 * @returns {Object} Structured data { od: {...}, oe: {...} }
 */
export function parsePrescriptionText(text) {
  const lines = text.split('\n').map(l => l.trim().toUpperCase()).filter(l => l.length > 5);
  
  const result = {
    od: { esferico: '', cilindro: '', eixo: '', adicao: '' },
    oe: { esferico: '', cilindro: '', eixo: '', adicao: '' },
  };

  // Common patterns for OD and OE
  const odPatterns = ['OD', 'OLHO DIREITO', 'DIR', 'RIGHT'];
  const oePatterns = ['OE', 'OLHO ESQUERDO', 'ESQ', 'LEFT'];

  // Helper to extract numbers from a string
  const extractNumbers = (str) => {
    // Matches numbers like -2.25, +1,50, 180, etc.
    // Also matches "PL", "PLAN", "PLANO" as 0
    const numbers = [];
    const tokens = str.replace(/,/g, '.').split(/\s+/);
    
    tokens.forEach(token => {
      if (token.match(/^(PL|PLAN|PLANO|0\.00)$/)) {
        numbers.push('0.00');
        return;
      }
      
      const match = token.match(/[+-]?\d+([.,]\d+)?/);
      if (match) {
        let num = match[0].replace(',', '.');
        // Ensure decimal if it looks like a degree (e.g. -200 -> -2.00) 
        // but only if it has 3 or more digits and no dot
        if (num.length >= 4 && !num.includes('.') && Math.abs(parseFloat(num)) >= 100) {
           // Many OCRs miss the dot in -200
           // However, this is risky for axis (e.g. 180). 
           // We'll skip this heuristic for now to be safe and rely on user confirmation.
        }
        numbers.push(num);
      }
    });
    return numbers;
  };

  let odLine = '';
  let oeLine = '';

  // Try to find lines that are clearly OD and OE
  for (const line of lines) {
    if (odPatterns.some(p => line.includes(p)) && !oePatterns.some(p => line.includes(p))) {
      odLine = line;
    } else if (oePatterns.some(p => line.includes(p))) {
      oeLine = line;
    }
  }

  // If we didn't find clear OD/OE markers, try to find two lines with multiple numbers
  if (!odLine && !oeLine) {
    const linesWithNumbers = lines.filter(l => extractNumbers(l).length >= 2);
    if (linesWithNumbers.length >= 2) {
      odLine = linesWithNumbers[0];
      oeLine = linesWithNumbers[1];
    }
  }

  const fillEye = (eyeObj, line) => {
    const nums = extractNumbers(line);
    // Usually: Esf, Cil, Eixo, (Add)
    if (nums.length >= 1) eyeObj.esferico = formatValue(nums[0]);
    if (nums.length >= 2) eyeObj.cilindro = formatValue(nums[1]);
    if (nums.length >= 3) eyeObj.eixo = Math.round(parseFloat(nums[2])).toString();
    if (nums.length >= 4) eyeObj.adicao = formatValue(nums[3]);
  };

  const formatValue = (val) => {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    return (n > 0 ? '+' : '') + n.toFixed(2);
  };

  if (odLine) fillEye(result.od, odLine);
  if (oeLine) fillEye(result.oe, oeLine);

  return result;
}
