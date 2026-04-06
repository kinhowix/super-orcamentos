import { GoogleGenerativeAI } from "@google/generative-ai";

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

