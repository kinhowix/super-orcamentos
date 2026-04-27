/**
 * Utilitário de cálculos ópticos para espessura de lentes
 */

export const MATERIALS = [
  { name: 'CR-39 (Básico)', index: 1.499, density: 1.32, abbe: 58 },
  { name: 'Trivex', index: 1.53, density: 1.11, abbe: 45 },
  { name: 'NK-55 (1.56)', index: 1.56, density: 1.28, abbe: 38 },
  { name: 'Policarbonato', index: 1.591, density: 1.20, abbe: 30 },
  { name: 'Resina 1.60', index: 1.60, density: 1.30, abbe: 40 },
  { name: 'Resina 1.67', index: 1.67, density: 1.35, abbe: 32 },
  { name: 'Hi-Index 1.74', index: 1.74, density: 1.46, abbe: 33 },
];

/**
 * Calcula a potência da lente em um determinado meridiano (ângulo)
 */
export function getPowerAtMeridian(sphere, cylinder, axis, targetAngle) {
  const thetaRad = ((targetAngle - axis) * Math.PI) / 180;
  return sphere + cylinder * Math.pow(Math.sin(thetaRad), 2);
}

/**
 * Calcula a sagita de uma superfície
 * s = R - sqrt(R^2 - y^2)
 * @param {number} F - Potência da superfície (D)
 * @param {number} n - Índice de refração do material
 * @param {number} y - Semi-diâmetro (mm)
 */
export function calculateSagitta(F, n, y) {
  if (F === 0) return 0;
  const R = ((n - 1) * 1000) / F; // Raio em mm
  const absR = Math.abs(R);
  
  if (y >= absR) return absR; // Limite físico
  
  const s = absR - Math.sqrt(Math.pow(absR, 2) - Math.pow(y, 2));
  return F > 0 ? s : -s; // Positiva para convexas, negativa para côncavas
}

/**
 * Estima a espessura da lente
 */
export function calculateLensThickness(params) {
  const {
    sphere,
    cylinder,
    axis,
    index,
    a, // Horizontal do aro (mm)
    b, // Vertical do aro (mm)
    bridge, // Ponte (mm)
    dnp, // DNP (mm)
    ed, // Maior diagonal (mm)
    selectedEye = 'OD',
  } = params;

  // 1. Calcular descentralização
  // Centro mecânico do aro = (A + Ponte) / 2
  const frameCenter = (a + bridge) / 2;
  const decentration = Math.abs(frameCenter - dnp);

  // 2. Diâmetro efetivo necessário considerando descentralização
  const effectiveDiameter = ed + 2 * decentration;
  const semiDiameter = effectiveDiameter / 2;

  // 3. Escolher Curva Base (Regra de Vogel simplificada)
  let baseCurve = 4.0;
  const se = sphere + cylinder / 2; // Equivalente Esférico
  if (se > 4) baseCurve = 8.0;
  else if (se > 2) baseCurve = 6.0;
  else if (se > -2) baseCurve = 4.0;
  else if (se > -6) baseCurve = 2.0;
  else baseCurve = 0.5;

  // 4. Potências das superfícies
  const f1 = baseCurve; // Frontal
  
  // Espessura Central (CT)
  let ct = 2.0; 
  if (se > 0) {
    const maxPower = Math.max(
      Math.abs(getPowerAtMeridian(sphere, cylinder, axis, 0)),
      Math.abs(getPowerAtMeridian(sphere, cylinder, axis, 90))
    );
    const s1 = Math.abs(calculateSagitta(f1, index, semiDiameter));
    const s2 = Math.abs(calculateSagitta(f1 - maxPower, index, semiDiameter));
    ct = 1.0 + Math.abs(s2 - s1);
  } else {
    ct = (index >= 1.59) ? 1.2 : 1.8; 
  }

  const points = [];
  let maxThickness = 0;
  let minThickness = 100;

  // Calculamos em intervalos menores para encontrar o máximo real
  for (let angle = 0; angle < 360; angle += 15) {
    const power = getPowerAtMeridian(sphere, cylinder, axis, angle);
    const f2 = f1 - power;

    const s1 = Math.abs(calculateSagitta(f1, index, semiDiameter));
    const s2 = Math.abs(calculateSagitta(f2, index, semiDiameter));

    // Espessura de borda = CT + s_back - s_front (para lentes positivas s1 > s2, para negativas s2 > s1)
    const et = ct + (s2 - s1);
    
    points.push({ angle, thickness: et });
    maxThickness = Math.max(maxThickness, et);
    minThickness = Math.min(minThickness, et);
  }

  // Extrair pontos cardeais
  const getThicknessAt = (ang) => {
    const p = points.find(p => p.angle === ang) || points[0];
    return p.thickness;
  };

  const cardinals = {
    superior: getThicknessAt(90),
    inferior: getThicknessAt(270),
    nasal: selectedEye === 'OD' ? getThicknessAt(180) : getThicknessAt(0),
    temporal: selectedEye === 'OD' ? getThicknessAt(0) : getThicknessAt(180),
  };

  return {
    ct,
    maxThickness,
    minThickness,
    points,
    cardinals,
    baseCurve,
    decentration,
    effectiveDiameter,
    f1,
    se
  };
}
