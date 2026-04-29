export function roundToNearestQuarter(value) {
  return Math.round(value * 4) / 4;
}

export function calculateVertexPower(power, vertexDistance = 0.012) {
  if (!power) return 0;
  const p = parseFloat(power);
  if (p === 0) return 0;
  
  if (Math.abs(p) <= 4.00) {
    return p;
  }

  const converted = p / (1 - (vertexDistance * p));
  return roundToNearestQuarter(converted);
}

export function convertPrescriptionToContactLens(esferico, cilindro, eixo, vertexDistance = 0.012) {
  const sph = parseFloat(esferico) || 0;
  const cyl = parseFloat(cilindro) || 0;
  const axis = parseInt(eixo, 10) || 0;

  if (cyl === 0) {
    const newSph = calculateVertexPower(sph, vertexDistance);
    return {
      esferico: newSph > 0 ? `+${newSph.toFixed(2)}` : newSph.toFixed(2),
      cilindro: '',
      eixo: ''
    };
  }

  // Meridian 1 = Sphere
  const p1 = sph;
  // Meridian 2 = Sphere + Cylinder
  const p2 = sph + cyl;

  const cp1 = calculateVertexPower(p1, vertexDistance);
  const cp2 = calculateVertexPower(p2, vertexDistance);

  const newSph = cp1;
  const newCyl = cp2 - cp1;

  return {
    esferico: newSph > 0 ? `+${newSph.toFixed(2)}` : newSph.toFixed(2),
    cilindro: newCyl > 0 ? `+${newCyl.toFixed(2)}` : newCyl.toFixed(2),
    eixo: axis ? axis.toString() : ''
  };
}

export function getSphericalEquivalent(esferico, cilindro) {
  const sph = parseFloat(esferico) || 0;
  const cyl = parseFloat(cilindro) || 0;
  const seq = sph + (cyl / 2);
  const rounded = roundToNearestQuarter(seq);
  return rounded > 0 ? `+${rounded.toFixed(2)}` : rounded.toFixed(2);
}
