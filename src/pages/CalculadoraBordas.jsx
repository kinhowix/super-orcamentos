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
import { MATERIALS, calculateLensThickness, getPowerAtMeridian, calculateSagitta } from '../services/lensCalculations';

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

  const [viewAngle, setViewAngle] = useState(0);

  const activeRx = selectedEye === 'OD' ? od : oe;
  const material = MATERIALS[materialIndex];

  // Cálculos em tempo real
  const results = useMemo(() => {
    return calculateLensThickness({
      ...activeRx,
      ...frame,
      index: material.index,
      selectedEye
    });
  }, [activeRx, frame, material, selectedEye]);

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

            <div className="flex-1 flex flex-col justify-center items-center py-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden px-4">
              {/* SVG de Perfil (Topo) */}
              <div className="w-full max-w-[500px] mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vista de Perfil (Meridiano {viewAngle}°)</h4>
                  <div className="flex items-center gap-3 bg-bg-secondary px-3 py-1.5 rounded-full border border-white/10">
                    <span className="text-[10px] text-text-muted font-mono">0°</span>
                    <input 
                      type="range" min="0" max="180" step="15" 
                      className="w-24 accent-accent-primary h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      value={viewAngle}
                      onChange={(e) => setViewAngle(parseInt(e.target.value))}
                    />
                    <span className="text-[10px] text-text-muted font-mono">180°</span>
                  </div>
                </div>
                <LensProfileSVG 
                  results={results} 
                  material={material} 
                  viewAngle={viewAngle}
                  activeRx={activeRx}
                />
              </div>

              {/* SVG Frontal Premium */}
              <div className="w-full">
                <h4 className="text-center text-[10px] font-bold text-text-muted uppercase tracking-widest mb-6">Vista Frontal (Espessuras Cardeais)</h4>
                <FrameOverviewSVG results={results} frame={frame} selectedEye={selectedEye} />
              </div>

              {/* Legenda de Escala Real */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2 text-[10px] text-text-muted">
                <div className="w-10 h-[1px] bg-text-muted"></div>
                <span>Simulação Visual</span>
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

// Subcomponente SVG para o Perfil (Fidelidade Óptica)
function LensProfileSVG({ results, material, viewAngle, activeRx }) {
  const scale = 4; 
  const width = 450;
  const height = 180;
  const cx = width / 2;
  const cy = height / 2;

  const power = getPowerAtMeridian(activeRx.sphere, activeRx.cylinder, activeRx.axis, viewAngle);
  const f1 = results.baseCurve;
  const f2 = power - f1; // F_total = F1 + F2 => F2 = P - F1

  const lensWidth = 70; // mm
  const semiD = lensWidth / 2;
  
  const ct = results.ct * scale;
  const s1 = calculateSagitta(f1, material.index, semiD) * scale;
  const s2 = calculateSagitta(f2, material.index, semiD) * scale;

  // Centro da lente
  const cx_front = cx - ct / 2;
  const cx_back = cx + ct / 2;

  // Bordas X
  const front_edge_x = cx_front + s1;
  const back_edge_x = cx_back - s2;

  // Pontos de controle Q
  const front_ctrl_x = cx_front - s1;
  const back_ctrl_x = cx_back + s2;

  const top_y = cy - semiD * scale;
  const bottom_y = cy + semiD * scale;

  // Path da Frente (vai de topo para base)
  const frontPath = `M ${front_edge_x} ${top_y} Q ${front_ctrl_x} ${cy}, ${front_edge_x} ${bottom_y}`;
  
  // Path de Trás (vai da base para o topo)
  const backPath = `M ${back_edge_x} ${bottom_y} Q ${back_ctrl_x} ${cy}, ${back_edge_x} ${top_y}`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-2xl">
      <defs>
        <linearGradient id="lensProfileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(100, 210, 255, 0.3)" />
          <stop offset="50%" stopColor="rgba(100, 210, 255, 0.1)" />
          <stop offset="100%" stopColor="rgba(100, 210, 255, 0.3)" />
        </linearGradient>
      </defs>
      
      {/* Corpo da Lente */}
      <path 
        d={`${frontPath} L ${back_edge_x} ${bottom_y} ${backPath} Z`} 
        fill="url(#lensProfileGrad)"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="1.5"
      />

      {/* Linhas de Cotação */}
      <g opacity="0.6">
        {/* Espessura Central */}
        <line x1={cx_front} y1={cy} x2={cx_back} y2={cy} stroke="var(--accent-primary)" strokeWidth="1" strokeDasharray="3 2" />
        <text x={cx_back + 5} y={cy} fill="var(--accent-primary)" fontSize="9" fontWeight="bold" dominantBaseline="middle">CT: {results.ct.toFixed(1)}mm</text>
        
        {/* Espessura de Borda (no topo) */}
        <line x1={front_edge_x} y1={top_y} x2={back_edge_x} y2={top_y} stroke="var(--accent-cyan)" strokeWidth="1.5" />
        <text 
          x={Math.max(front_edge_x, back_edge_x) + 5} y={top_y} 
          fill="var(--accent-cyan)" fontSize="9" fontWeight="bold" dominantBaseline="middle"
        >
          ET: {((ct - s2 - s1)/scale).toFixed(1)}mm
        </text>
      </g>
    </svg>
  );
}

// Subcomponente SVG para Vista Frontal (Premium com Armação Completa)
function FrameOverviewSVG({ results, frame, selectedEye }) {
  const scale = 2.5;
  const width = 400;
  const height = 180;
  const cx = width / 2;
  const cy = height / 2;

  const aroA = frame.a * scale;
  const aroB = frame.b * scale;
  const bridge = frame.bridge * scale;
  
  // Coordenadas dos centros das lentes
  const distBetweenCenters = aroA + bridge;
  const odX = cx - distBetweenCenters / 2;
  const oeX = cx + distBetweenCenters / 2;

  const card = results.cardinals;

  const Callout = ({ x, y, value, label, align = 'center', side = 'top' }) => {
    const isMain = selectedEye === (x < cx ? 'OD' : 'OE');
    const color = isMain ? 'var(--accent-primary)' : 'var(--text-muted)';
    const offset = 25;
    
    let lineX = x;
    let lineY = y;
    let textX = x;
    let textY = y;

    if (side === 'top') { textY -= offset; }
    if (side === 'bottom') { textY += offset; }
    if (side === 'left') { textX -= offset; }
    if (side === 'right') { textX += offset; }

    return (
      <g opacity={isMain ? 1 : 0.4}>
        <line x1={x} y1={y} x2={textX} y2={textY} stroke={color} strokeWidth="1" />
        <rect 
          x={textX - 15} y={textY - 8} width="30" height="16" rx="4" 
          fill="rgba(0,0,0,0.8)" stroke={color} strokeWidth="0.5" 
        />
        <text 
          x={textX} y={textY} 
          fill="white" fontSize="9" fontWeight="bold" 
          textAnchor="middle" dominantBaseline="middle"
        >
          {value.toFixed(1)}
        </text>
        <text 
          x={textX} y={textY + (side === 'bottom' ? 15 : -15)} 
          fill={color} fontSize="7" fontWeight="bold" 
          textAnchor="middle" className="uppercase tracking-tighter"
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Ponte da Armação */}
      <path 
        d={`M ${odX + aroA/2} ${cy - 5} Q ${cx} ${cy - 15} ${oeX - aroA/2} ${cy - 5}`} 
        fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" 
      />

      {/* Lentes / Aros */}
      {[odX, oeX].map((x, i) => {
        const isSelected = (i === 0 && selectedEye === 'OD') || (i === 1 && selectedEye === 'OE');
        return (
          <g key={i}>
            {/* Aro */}
            <rect 
              x={x - aroA/2} y={cy - aroB/2} width={aroA} height={aroB} rx={aroA/4} 
              fill="rgba(255,255,255,0.03)" 
              stroke={isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'} 
              strokeWidth={isSelected ? 2 : 1} 
            />
            
            {/* Centro Pupilar (se selecionado) */}
            {isSelected && (
              <g transform={`translate(${x - (results.decentration * scale * (i === 0 ? 1 : -1))}, ${cy})`}>
                <circle r="3" fill="var(--accent-primary)" />
                <line x1="-5" y1="0" x2="5" y2="0" stroke="white" strokeWidth="0.5" />
                <line x1="0" y1="-5" x2="0" y2="5" stroke="white" strokeWidth="0.5" />
              </g>
            )}

            {/* Labels Cardinais (Apenas se for o olho selecionado) */}
            {isSelected && (
              <>
                <Callout x={x} y={cy - aroB/2} value={card.superior} label="Superior" side="top" />
                <Callout x={x} y={cy + aroB/2} value={card.inferior} label="Inferior" side="bottom" />
                <Callout 
                  x={x + (aroA/2 * (i === 0 ? 1 : -1))} y={cy} 
                  value={card.nasal} label="Nasal" side={i === 0 ? 'right' : 'left'} 
                />
                <Callout 
                  x={x - (aroA/2 * (i === 0 ? 1 : -1))} y={cy} 
                  value={card.temporal} label="Temporal" side={i === 0 ? 'left' : 'right'} 
                />
              </>
            )}
          </g>
        );
      })}

      {/* Rótulos OD/OE */}
      <text x={odX} y={cy + aroB/2 + 35} fill="var(--text-muted)" fontSize="10" fontWeight="bold" textAnchor="middle">OLHO DIREITO (OD)</text>
      <text x={oeX} y={cy + aroB/2 + 35} fill="var(--text-muted)" fontSize="10" fontWeight="bold" textAnchor="middle">OLHO ESQUERDO (OE)</text>
    </svg>
  );
}
