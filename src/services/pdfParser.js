// PDF Parser utility for extracting lens data from catalog PDFs
// Uses pdf.js to extract text and then parses the tabular data

import * as pdfjsLib from 'pdfjs-dist'

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Extract text content from a PDF file
 * @param {File} file - The PDF file to parse
 * @returns {Promise<Array<{page: number, lines: string[]}>>} Array of pages with text lines
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pages = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    
    // Group text items by Y position to reconstruct lines
    const items = textContent.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height,
    }))

    // Sort by Y (descending - PDF coords are bottom-up) then X
    items.sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) < 3) return a.x - b.x // same line
      return yDiff
    })

    // Group into lines (items with similar Y coordinates)
    const lines = []
    let currentLine = []
    let currentY = null

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) < 5) {
        currentLine.push(item)
        currentY = item.y
      } else {
        if (currentLine.length > 0) {
          // Sort line items by X position
          currentLine.sort((a, b) => a.x - b.x)
          lines.push(currentLine.map(i => i.text).join(' '))
        }
        currentLine = [item]
        currentY = item.y
      }
    }
    if (currentLine.length > 0) {
      currentLine.sort((a, b) => a.x - b.x)
      lines.push(currentLine.map(i => i.text).join(' '))
    }

    pages.push({ page: i, lines })
  }

  return pages
}

/**
 * Parse extracted text to find lens data in tabular format
 * Tries to identify price tables with AR columns and specification columns
 * @param {Array} pages - Extracted pages with text lines
 * @returns {Array} Parsed lens data
 */
export function parseLensData(pages) {
  const allLenses = []

  for (const pageData of pages) {
    const lines = pageData.lines

    // Try to identify the structure
    let currentLensName = ''
    let arColumns = []
    let inPriceTable = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Try to detect AR column headers
      const arPatterns = [
        /duravision/i, /crizal/i, /sem\s*ar/i, /optifog/i,
        /gold/i, /platinum/i, /silver/i, /chrome/i,
        /sapphire/i, /prevencia/i, /easy/i, /rock/i,
      ]

      if (arPatterns.some(p => p.test(line))) {
        // This might be a header line with AR levels
        arColumns = extractARColumns(line)
        inPriceTable = true
        continue
      }

      // Try to detect lens name (usually in bold/larger text, preceding the table)
      if (!inPriceTable && /^[A-Z]/.test(line) && !line.match(/^\d/) && line.length > 3) {
        // Heuristic: lens name lines
        if (!line.match(/esf[eé]rico|cil|adi[çc]/i)) {
          currentLensName = line
        }
      }

      // Try to detect price rows (lines with index values like 1.50, 1.60, etc.)
      const indexMatch = line.match(/\b(1[.,]\d{2})\b/)
      if (indexMatch && inPriceTable) {
        const prices = extractPrices(line)
        if (prices.length > 0) {
          // Try to get specs from the same or nearby line
          const specs = extractSpecs(line)
          
          allLenses.push({
            nome: currentLensName,
            indice: indexMatch[1].replace(',', '.'),
            precos: mapPricesToAR(prices, arColumns),
            especificacoes: specs,
            pagina: pageData.page,
            linhaOriginal: line,
          })
        }
      }
    }
  }

  return allLenses
}

function extractARColumns(headerLine) {
  const columns = []
  const patterns = [
    { regex: /duravision\s*gold/i, key: 'duravision_gold' },
    { regex: /duravision\s*platinum/i, key: 'duravision_platinum' },
    { regex: /duravision\s*silver/i, key: 'duravision_silver' },
    { regex: /duravision\s*chrome/i, key: 'duravision_chrome' },
    { regex: /crizal\s*sapphire/i, key: 'crizal_sapphire' },
    { regex: /crizal\s*prevencia/i, key: 'crizal_prevencia' },
    { regex: /crizal\s*easy/i, key: 'crizal_easy' },
    { regex: /crizal\s*rock/i, key: 'crizal_rock' },
    { regex: /optifog/i, key: 'optifog' },
    { regex: /sem\s*ar/i, key: 'sem_ar' },
  ]

  for (const p of patterns) {
    if (p.regex.test(headerLine)) {
      columns.push(p.key)
    }
  }

  return columns
}

function extractPrices(line) {
  // Find all price-like values (numbers with comma or period for decimal)
  const priceRegex = /\b(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})\b/g
  const matches = []
  let match
  while ((match = priceRegex.exec(line)) !== null) {
    // Skip index values like 1.50, 1.60
    const val = match[1]
    if (!val.match(/^1[.,]\d{2}$/)) {
      matches.push(parseFloat(val.replace(/\./g, '').replace(',', '.')))
    }
  }
  return matches
}

function extractSpecs(line) {
  const specs = {
    esferico_min: null,
    esferico_max: null,
    cilindro_max: null,
    adicao_min: null,
    adicao_max: null,
    diametro: null,
    prisma: null,
  }

  // Try to find spherical range (e.g., -10.00 a +6.00 or -10,00/+6,00)
  const esf = line.match(/([+-]?\d+[.,]\d{2})\s*(?:a|\/|~)\s*([+-]?\d+[.,]\d{2})/)
  if (esf) {
    specs.esferico_min = parseFloat(esf[1].replace(',', '.'))
    specs.esferico_max = parseFloat(esf[2].replace(',', '.'))
  }

  // Try to find cylinder (e.g., Cil -4.00 or -4,00)
  const cil = line.match(/cil[^\d]*([+-]?\d+[.,]\d{2})/i)
  if (cil) {
    specs.cilindro_max = parseFloat(cil[1].replace(',', '.'))
  }

  // Try to find addition (e.g., Ad 0.75 a 3.50)
  const add = line.match(/ad(?:i[çc][ãa]o)?[^\d]*(\d+[.,]\d{2})\s*(?:a|\/|~)\s*(\d+[.,]\d{2})/i)
  if (add) {
    specs.adicao_min = parseFloat(add[1].replace(',', '.'))
    specs.adicao_max = parseFloat(add[2].replace(',', '.'))
  }

  // Try to find diameter (e.g., Ø 70 or Ø70)
  const dia = line.match(/[Øø∅]\s*(\d+)/i)
  if (dia) {
    specs.diametro = parseInt(dia[1])
  }

  return specs
}

function mapPricesToAR(prices, arColumns) {
  const result = {}
  for (let i = 0; i < arColumns.length && i < prices.length; i++) {
    result[arColumns[i]] = prices[i]
  }
  return result
}

/**
 * Extract structured text blocks from PDF for user review
 */
export async function extractPDFStructured(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const result = {
    numPages: pdf.numPages,
    pages: []
  }

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    
    const items = textContent.items
      .filter(item => item.str.trim())
      .map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4]),
        y: Math.round(item.transform[5]),
      }))
    
    // Sort by Y desc, then X asc
    items.sort((a, b) => {
      const yDiff = b.y - a.y
      if (Math.abs(yDiff) < 4) return a.x - b.x
      return yDiff
    })

    // Group into rows
    const rows = []
    let currentRow = []
    let currentY = null

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) < 4) {
        currentRow.push(item)
        if (currentY === null) currentY = item.y
      } else {
        if (currentRow.length > 0) {
          currentRow.sort((a, b) => a.x - b.x)
          rows.push({
            y: currentY,
            cells: currentRow.map(c => c.text),
            text: currentRow.map(c => c.text).join(' | ')
          })
        }
        currentRow = [item]
        currentY = item.y
      }
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x)
      rows.push({
        y: currentY,
        cells: currentRow.map(c => c.text),
        text: currentRow.map(c => c.text).join(' | ')
      })
    }

    result.pages.push({
      page: i,
      rows
    })
  }

  return result
}
