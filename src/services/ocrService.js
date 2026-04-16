import { GoogleGenerativeAI } from "@google/generative-ai";
import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Usamos import.meta.env para ler do arquivo .env (padrão do Vite)
// Isso mantém a chave protegida (máscara) e fora do código-fonte
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Converte um arquivo ou blob para o formato esperado pelo Gemini
 */
async function fileToGenerativePart(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        inlineData: {
          data: reader.result.split(',')[1],
          mimeType: file.type
        },
      });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Processa a imagem da receita usando IA (Gemini Vision)
 * @param {File} image - O arquivo da imagem
 * @param {Function} onProgress - Calback para progresso (simulado já que API é atômica)
 * @returns {Promise<Object>} Dados estruturados da receita
 */
export async function extractTextFromImage(image, onProgress) {
  try {
    onProgress?.(20);
    // Em abril de 2026, o modelo estável padrão é o gemini-2.5-flash.
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    onProgress?.(40);
    const imagePart = await fileToGenerativePart(image);

    const prompt = `
      Você é um especialista em leitura de receitas oftalmológicas brasileiras.
      Analise a imagem e extraia os valores de:
      - Esférico (Sph/Esf)
      - Cilíndrico (Cyl/Cil)
      - Eixo (Axis/Eixo)
      - Adição (Add/Adit)
      
      Para ambos os olhos:
      - OD (Olho Direito / Esquerdo do papel)
      - OE (Olho Esquerdo / Direito do papel)

      Regras importantes:
      1. Se o valor for "PLANO", "PL" ou "0", use "0.00".
      2. Mantenha os sinais (+ ou -) se presentes.
      3. Se o campo estiver vazio, use "".
      4. O eixo deve ser um número inteiro.
      
      Retorne APENAS um objeto JSON válido seguindo este formato:
      {
        "od": { "esferico": "", "cilindro": "", "eixo": "", "adicao": "" },
        "oe": { "esferico": "", "cilindro": "", "eixo": "", "adicao": "" }
      }
    `;

    onProgress?.(60);
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    onProgress?.(90);

    // Limpa o texto caso o modelo retorne blocos de código markdown
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    onProgress?.(100);
    return data;
  } catch (error) {
    console.error("Erro no Gemini OCR:", error);
    throw error;
  }
}

/**
 * Função mantida para compatibilidade, mas agora apenas valida o objeto
 * já que o Gemini já retorna estruturado.
 */
export function parsePrescriptionText(data) {
  // Se recebermos uma string (legado), tentamos tratar, 
  // mas agora o extractTextFromImage já devolve o objeto correto.
  if (typeof data === 'string') {
    return {
      od: { esferico: '', cilindro: '', eixo: '', adicao: '' },
      oe: { esferico: '', cilindro: '', eixo: '', adicao: '' },
    };
  }

  const format = (val) => {
    if (!val || val === '0.00') return '';
    // Garante sinal de + para positivos se não tiver
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n === 0) return '0.00';
    return (n > 0 && !val.toString().startsWith('+') ? '+' : '') + n.toFixed(2);
  };

  const formatEixo = (val) => {
    const n = parseInt(val);
    return isNaN(n) ? '' : n.toString();
  };

  return {
    od: {
      esferico: format(data.od?.esferico),
      cilindro: format(data.od?.cilindro),
      eixo: formatEixo(data.od?.eixo),
      adicao: format(data.od?.adicao),
    },
    oe: {
      esferico: format(data.oe?.esferico),
      cilindro: format(data.oe?.cilindro),
      eixo: formatEixo(data.oe?.eixo),
      adicao: format(data.oe?.adicao),
    }
  };
}

/**
 * Extrai dados de lentes de um PDF de catálogo usando IA (Gemini Flash)
 * @param {File} file - O arquivo PDF
 * @param {number} startPage - Página inicial (1-indexed)
 * @param {number} endPage - Página final (1-indexed)
 * @param {Function} onProgress - Callback de progresso
 */
export async function extractLensesFromPDF(file, startPage = 1, endPage = 1, onProgress) {
  try {
    onProgress?.(10);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pagesToProcess = [];
    
    onProgress?.(20);
    for (let i = startPage; i <= Math.min(endPage, pdf.numPages); i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // Alta qualidade para OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({ canvasContext: context, viewport }).promise;
      const base64Image = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
      
      pagesToProcess.push({
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg"
        }
      });
    }

    onProgress?.(50);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Você é um especialista em leitura de catálogos e tabelas de preços de lentes oftalmológicas brasileiras.
      Analise as imagens do catálogo e extraia TODAS as lentes listadas, seguindo rigorosamente estas regras:

      1. IDENTIFICAÇÃO DO PRODUTO:
         - Nome da Lente: Procure títulos em destaque, cabeçalhos sombreados ou fontes maiores (Ex: "ZEISS GT2", "ZEISS Progressive Light 2 D").
         - Fornecedor: Identifique a marca (ex: Zeiss, Essilor, Hoya).
         - Tipo: Classifique como 'multifocal' ou 'visao_simples'.

      2. MATERIAL E ÍNDICE:
         - Mapeamento Obrigatório:
           - "Poli" ou "Policarbonato" -> Índice: "1.59", Material: "Poli"
           - "1.5" ou "CR39" -> Índice: "1.50", Material: "Resina"
           - "1.6" -> Índice: "1.60", Material: "Resina"
           - "1.67" -> Índice: "1.67", Material: "Resina"
           - "1.74" -> Índice: "1.74", Material: "Resina"
         - Se o índice for detectado mas o material estiver implícito, use "Resina" como padrão para índices que não sejam Poli.

      3. TRATAMENTOS E PREÇOS:
         - Identifique os cabeçalhos das colunas de preços dentro de "TRATAMENTOS" ou abaixo do modelo.
         - Use os NOMES EXATOS encontrados na imagem (ex: "DURAVISION GOLD UV", "DURAVISION PLATINUM UV", "SEM AR").
         - Use esses nomes como chaves no objeto "precos".
         - Converta preços para número (ex: "2.639,00" -> 2639.00).

      4. DISPONIBILIDADE E GRAUS (DISPONIBILIDADE BRASIL):
         - ESFÉRICO: Se houver um intervalo (ex: "-9.00 a +6.00"), separe em "esferico_min" e "esferico_max".
         - CILÍNDRICO: Extraia o valor máximo (ex: "-4.00").
         - ADIÇÃO: Se houver intervalo (ex: "1.00 a 3.50"), separe em "adicao_min" e "adicao_max".
         - DIÂMETRO (Ø): Extraia o número inteiro (ex: 75).
         - PRISMA (Δ): Se houver valor numérico (ex: 4.00), coloque em "prisma_valor" e defina "prisma" como "Sim".

      5. EXTRAS:
         - Marque "fotossensivel": true se encontrar marcas como PhotoFusion, Transitions ou se houver menção a "sensível à luz".
         - Marque "filtroAzul": true se encontrar marcas como Blueguard, Blue UV Capture ou Menção a proteção de luz azul.

      Retorne APENAS um JSON Array seguindo exatamente este formato:
      [{
        "fornecedor": "Zeiss",
        "tipo": "multifocal",
        "nome": "ZEISS GT2 FreeForm BlueGuard",
        "indice": "1.59",
        "material": "Poli",
        "precos": {
          "DURAVISION GOLD UV": 2349.00,
          "DURAVISION PLATINUM UV": 2209.00,
          "SEM AR": 1059.00
        },
        "especificacoes": {
          "esferico_min": -10.00,
          "esferico_max": 6.00,
          "cilindro_max": -6.00,
          "adicao_min": 1.00,
          "adicao_max": 3.00,
          "diametro": 75,
          "prisma": "Sim",
          "prisma_valor": 3.00
        },
        "fotossensivel": false,
        "filtroAzul": true
      }]
    `;

    onProgress?.(70);
    const result = await model.generateContent([prompt, ...pagesToProcess]);
    const response = await result.response;
    const text = response.text();

    onProgress?.(95);
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(jsonStr);

    onProgress?.(100);
    return data;
  } catch (error) {
    console.error("Erro no Gemini PDF Extraction:", error);
    throw error;
  }
}

