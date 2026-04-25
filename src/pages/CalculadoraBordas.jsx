import { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, 
  Info, 
  ArrowRight, 
  Layers, 
  Maximize2, 
  Weight, 
  Dna,
  Eye,
  Settings2,
  AlertCircle
} from 'lucide-react';
import { MATERIALS, calculateLensThickness } from '../services/lensCalculations';

const INITIAL_RX = {
  sphere: 0.00,
  cylinder: 0.00,
  axis: 0,
  dnp: 32,
};

const INITIAL_FRAME = {
  a: 54,
  b: 38,
  bridge: 17,
  ed: 56,
  type: 'full-rim' // full-rim, supra, rimless
};

export default function CalculadoraBordas() {
  const [od, setOd] = useState({ ...INITIAL_RX });
  const [oe, setOe] = useState({ ...INITIAL_RX });
  const [frame, setFrame] = useState({ ...INITIAL_FRAME });
  const [materialIndex, setMaterialIndex] = useState(0);
  const [selectedEye, setSelectedEye] = useState('OD');

  const activeRx = selectedEye === 'OD' ? od : oe;
  const material = MATERIALS[materialIndex];

  // Cálculos em tempo real
  const results = useMemo(() => {
    return calculateLensThickness({
      ...activeRx,
      ...frame,
      index: material.index
    });
  }, [activeRx, frame, material]);

  // Handler para inputs de RX
  const handleRxChange = (eye, field, value) => {
    const val = parseFloat(value) || 0;
    if (eye === 'OD') setOd(prev => ({ ...prev, [field]: val }));
    else setOe(prev => ({ ...prev, [field]: val }));
  };

  // Handler para inputs de armação
  const handleFrameChange = (field, value) => {
    const val = field === 'type' ? value : (parseFloat(value) || 0);
    setFrame(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="animate-in fade-in duration-500">
      <header className="page-header">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-accent-primary-bg rounded-lg">
            <Calculator className="text-accent-primary" size={24} />
          </div>
          <h1>Calculadora de Bordas</h1>
        </div>
        <p>Simule a espessura das lentes com base nos graus, medidas e materiais escolhidos.</p>
      </header>

      <div className="content-grid" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
        {/* Coluna de Inputs */}
        <div className="flex flex-col gap-6">
          
          {/* Card de Prescrição */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-accent-primary" />
                <h2 className="card-title">Graus e Medidas</h2>
              </div>
              <div className="flex bg-bg-secondary p-1 rounded-lg">
                <button 
                  className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${selectedEye === 'OD' ? 'bg-accent-primary text-white' : 'text-text-secondary'}`}
                  onClick={() => setSelectedEye('OD')}
                >
                  OD
                </button>
                <button 
                  className={`px-4 py-1 text-xs font-bold rounded-md transition-all ${selectedEye === 'OE' ? 'bg-accent-primary text-white' : 'text-text-secondary'}`}
                  onClick={() => setSelectedEye('OE')}
                >
                  OE
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Esférico</label>
                <input 
                  type="number" step="0.25" className="form-input" 
                  value={activeRx.sphere} 
                  onChange={(e) => handleRxChange(selectedEye, 'sphere', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Cilíndrico</label>
                <input 
                  type="number" step="0.25" className="form-input" 
                  value={activeRx.cylinder} 
                  onChange={(e) => handleRxChange(selectedEye, 'cylinder', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Eixo</label>
                <input 
                  type="number" className="form-input" 
                  value={activeRx.axis} 
                  onChange={(e) => handleRxChange(selectedEye, 'axis', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">DNP (mm)</label>
                <input 
                  type="number" className="form-input" 
                  value={activeRx.dnp} 
                  onChange={(e) => handleRxChange(selectedEye, 'dnp', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5">
              <label className="form-label">Material / Índice</label>
              <select 
                className="form-select" 
                value={materialIndex}
                onChange={(e) => setMaterialIndex(parseInt(e.target.value))}
              >
                {MATERIALS.map((m, i) => (
                  <option key={m.name} value={i}>{m.name} (n={m.index.toFixed(3)})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Card de Armação */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Maximize2 size={18} className="text-accent-amber" />
                <h2 className="card-title">Medidas da Armação</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">Aro (A)</label>
                <input 
                  type="number" className="form-input" 
                  value={frame.a} 
                  onChange={(e) => handleFrameChange('a', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Ponte</label>
                <input 
                  type="number" className="form-input" 
                  value={frame.bridge} 
                  onChange={(e) => handleFrameChange('bridge', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Altura (B)</label>
                <input 
                  type="number" className="form-input" 
                  value={frame.b} 
                  onChange={(e) => handleFrameChange('b', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">M. Diagonal (ED)</label>
                <input 
                  type="number" className="form-input" 
                  value={frame.ed} 
                  onChange={(e) => handleFrameChange('ed', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Coluna de Visualização */}
        <div className="flex flex-col gap-6">
          
          {/* Card Principal de Visualização */}
          <div className="card h-full flex flex-col">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-accent-cyan" />
                <h2 className="card-title">Simulação Visual</h2>
              </div>
              <div className="badge badge-cyan">Representação Aproximada</div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center py-8 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden">
              {/* SVG de Perfil (Topo) */}
              <div className="w-full max-w-[500px] mb-12">
                <h4 className="text-center text-xs font-bold text-text-muted uppercase tracking-widest mb-6">Vista Superior (Perfil da Lente)</h4>
                <LensProfileSVG 
                  results={results} 
                  material={material} 
                  frameType={frame.type}
                />
              </div>

              {/* SVG Frontal */}
              <div className="w-full max-w-[300px]">
                <h4 className="text-center text-xs font-bold text-text-muted uppercase tracking-widest mb-4">Vista Frontal (Espessuras de Borda)</h4>
                <FrontViewSVG results={results} frame={frame} />
              </div>

              {/* Legenda de Escala Real */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-text-muted">
                <div className="w-10 h-[1px] bg-text-muted"></div>
                <span>10mm (Escala Aproximada)</span>
              </div>
            </div>

            {/* Badges de Resultado */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-bg-secondary p-4 rounded-xl border border-white/5 flex flex-col items-center">
                <Maximize2 size={16} className="text-accent-primary mb-2" />
                <span className="text-[10px] uppercase text-text-secondary font-bold">Máxima</span>
                <span className="text-xl font-bold">{results.maxThickness.toFixed(1)}mm</span>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-white/5 flex flex-col items-center">
                <Dna size={16} className="text-accent-green mb-2" />
                <span className="text-[10px] uppercase text-text-secondary font-bold">Base</span>
                <span className="text-xl font-bold">{results.baseCurve.toFixed(2)}</span>
              </div>
              <div className="bg-bg-secondary p-4 rounded-xl border border-white/5 flex flex-col items-center">
                <ArrowRight size={16} className="text-accent-amber mb-2" />
                <span className="text-[10px] uppercase text-text-secondary font-bold">Descentr.</span>
                <span className="text-xl font-bold">{results.decentration.toFixed(1)}mm</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-accent-amber-bg border border-accent-amber/20 rounded-xl flex gap-3 items-start">
        <AlertCircle className="text-accent-amber shrink-0" size={20} />
        <p className="text-xs text-text-secondary">
          <strong>Aviso Importante:</strong> Esta calculadora fornece estimativas baseadas em fórmulas matemáticas ideais. A espessura real pode variar dependendo da marca da lente, otimizações de laboratório (surfaçagem digital), curva base exata e características específicas da armação. A visualização é meramente ilustrativa.
        </p>
      </div>
    </div>
  );
}

// Subcomponente SVG para o Perfil
function LensProfileSVG({ results, material, frameType }) {
  const scale = 5; // Pixels por mm para visualização
  const width = 400;
  const height = 150;
  const centerX = width / 2;
  const centerY = height / 2;

  const ct = results.ct * scale;
  const etMax = results.maxThickness * scale;
  const etMin = results.minThickness * scale;
  const lensDiameter = 70 * scale; // Diâmetro fixo para o blank
  const semiDiameter = lensDiameter / 2;

  // Curvaturas (simuladas visualmente)
  const f1 = results.baseCurve;
  const f2 = f1 - (results.maxThickness > results.ct ? -3 : 3); // Simplificação visual

  // Pontos da lente
  const topEdge = centerY - etMax / 2;
  const bottomEdge = centerY + etMax / 2;
  const centerPoint = centerY;

  // Path da superfície frontal (Convexa)
  const r1 = 200; // Raio visual
  const s1 = 15; // Sagita visual
  const frontPath = `M ${centerX - semiDiameter} ${topEdge} Q ${centerX} ${topEdge - s1}, ${centerX + semiDiameter} ${topEdge}`;
  
  // Path da superfície traseira (Côncava/Convexa dependendo do grau)
  const isNegative = results.maxThickness > results.ct;
  const s2 = isNegative ? 40 : -10;
  const backPath = `M ${centerX + semiDiameter} ${bottomEdge} Q ${centerX} ${bottomEdge - s2}, ${centerX - semiDiameter} ${bottomEdge}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-2xl">
      <defs>
        <linearGradient id="lensGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.2)" />
        </linearGradient>
      </defs>
      
      {/* Corpo da Lente */}
      <path 
        d={`${frontPath} L ${centerX + semiDiameter} ${bottomEdge} ${backPath} Z`} 
        fill="url(#lensGrad)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />

      {/* Linha de centro para espessura central */}
      <line 
        x1={centerX} y1={topEdge - 15} x2={centerX} y2={bottomEdge - (isNegative ? 40 : -10)} 
        stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="4 2"
      />
      <text x={centerX + 5} y={centerY} fill="var(--accent-primary)" fontSize="10" fontWeight="bold">CT: {results.ct.toFixed(1)}mm</text>

      {/* Indicação de borda máxima */}
      <line 
        x1={centerX - semiDiameter - 10} y1={topEdge} x2={centerX - semiDiameter - 10} y2={bottomEdge} 
        stroke="var(--accent-cyan)" strokeWidth="2"
      />
      <text x={centerX - semiDiameter - 45} y={centerY} fill="var(--accent-cyan)" fontSize="10" fontWeight="bold" transform={`rotate(-90, ${centerX - semiDiameter - 45}, ${centerY})`}>ET: {results.maxThickness.toFixed(1)}mm</text>
    </svg>
  );
}

// Subcomponente SVG para Vista Frontal
function FrontViewSVG({ results, frame }) {
  const scale = 3;
  const width = 200;
  const height = 150;
  const cx = width / 2;
  const cy = height / 2;

  const aroA = frame.a * scale;
  const aroB = frame.b * scale;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Aro da Armação */}
      <ellipse 
        cx={cx} cy={cy} rx={aroA / 2} ry={aroB / 2} 
        fill="rgba(255,255,255,0.05)" 
        stroke="var(--text-muted)" 
        strokeWidth="2" 
      />

      {/* Pontos de espessura */}
      {results.points.map((pt, i) => {
        const rad = (pt.angle * Math.PI) / 180;
        const x = cx + (Math.cos(rad) * (aroA / 2 + 15));
        const y = cy + (Math.sin(rad) * (aroB / 2 + 15));
        
        return (
          <g key={i}>
            <circle cx={cx + (Math.cos(rad) * (aroA / 2))} cy={cy + (Math.sin(rad) * (aroB / 2))} r="3" fill="var(--accent-cyan)" />
            <text 
              x={x} y={y} 
              fill={pt.thickness === results.maxThickness ? 'var(--accent-red)' : 'var(--text-secondary)'} 
              fontSize="9" 
              fontWeight="bold" 
              textAnchor="middle"
            >
              {pt.thickness.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Centro Pupilar */}
      <circle cx={cx - (results.decentration * scale)} cy={cy} r="4" fill="var(--accent-primary)" />
      <line x1={cx - (results.decentration * scale) - 5} y1={cy} x2={cx - (results.decentration * scale) + 5} y2={cy} stroke="white" strokeWidth="1" />
      <line x1={cx - (results.decentration * scale)} y1={cy - 5} x2={cx - (results.decentration * scale)} y2={cy + 5} stroke="white" strokeWidth="1" />
    </svg>
  );
}
