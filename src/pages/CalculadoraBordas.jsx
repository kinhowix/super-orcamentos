import { useState, useMemo } from 'react';
import { 
  Calculator, 
  AlertCircle
} from 'lucide-react';
import { MATERIALS, calculateLensThickness } from '../services/lensCalculations';

const INITIAL_RX = {
  sphere: 0.00,
  cylinder: 0.00,
  axis: 0,
  dnp: 32,
  matIndex: 0 // Default material index
};

const INITIAL_FRAME = {
  type: 'Acetato - Fechado',
  a: 52, // MHA
  b: 40, // MVA
  bridge: 20, // PONTE
  ed: 61, // DMA
  alt: 16 // ALT
};

export default function CalculadoraBordas() {
  const [od, setOd] = useState({ ...INITIAL_RX, dnp: 28 });
  const [oe, setOe] = useState({ ...INITIAL_RX, dnp: 28 });
  const [frame, setFrame] = useState({ ...INITIAL_FRAME });

  // Cálculos em tempo real para ambos os olhos
  const resultsOD = useMemo(() => {
    return calculateLensThickness({
      ...od,
      ...frame,
      index: MATERIALS[od.matIndex].index,
      density: MATERIALS[od.matIndex].density,
      selectedEye: 'OD'
    });
  }, [od, frame]);

  const resultsOE = useMemo(() => {
    return calculateLensThickness({
      ...oe,
      ...frame,
      index: MATERIALS[oe.matIndex].index,
      density: MATERIALS[oe.matIndex].density,
      selectedEye: 'OE'
    });
  }, [oe, frame]);

  // Handlers
  const handleRxChange = (eye, field, value) => {
    const val = field === 'matIndex' ? parseInt(value) : (parseFloat(value) || 0);
    if (eye === 'OD') setOd(prev => ({ ...prev, [field]: val }));
    else setOe(prev => ({ ...prev, [field]: val }));
  };

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
        <p>Simulação avançada com representação simultânea de ambos os olhos.</p>
      </header>

      <div className="content-grid" style={{ gridTemplateColumns: '380px 1fr' }}>
        
        {/* COLUNA ESQUERDA: INPUTS */}
        <div className="flex flex-col gap-6">
          
          {/* Dados da Armação */}
          <div className="card">
            <div className="card-header bg-bg-secondary p-3 -mx-6 -mt-6 mb-4 rounded-t-2xl border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Dados da Armação</h2>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-text-secondary w-12">TIPO</label>
                <select 
                  className="form-select flex-1 bg-black/20" 
                  value={frame.type} 
                  onChange={e => handleFrameChange('type', e.target.value)}
                >
                  <option value="Acetato - Fechado">Acetato - Fechado</option>
                  <option value="Metal - Fechado">Metal - Fechado</option>
                  <option value="Nylon - Meio Aro">Nylon - Meio Aro</option>
                  <option value="Parafusada - Balgrife">Parafusada - Balgrife</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-text-secondary w-12">PONTE</label>
                <input 
                  type="number" className="form-input w-24 bg-black/20 text-center" 
                  value={frame.bridge} 
                  onChange={e => handleFrameChange('bridge', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-text-secondary w-12" title="Maior Horizontal do Aro">MHA</label>
                  <input 
                    type="number" className="form-input flex-1 bg-black/20 text-center" 
                    value={frame.a} 
                    onChange={e => handleFrameChange('a', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-text-secondary w-12" title="Maior Vertical do Aro">MVA</label>
                  <input 
                    type="number" className="form-input flex-1 bg-black/20 text-center" 
                    value={frame.b} 
                    onChange={e => handleFrameChange('b', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-text-secondary w-12">ALT</label>
                  <input 
                    type="number" className="form-input flex-1 bg-black/20 text-center" 
                    value={frame.alt} 
                    onChange={e => handleFrameChange('alt', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-text-secondary w-12" title="Diagonal Maior">DMA</label>
                  <input 
                    type="number" className="form-input flex-1 bg-black/20 text-center" 
                    value={frame.ed} 
                    onChange={e => handleFrameChange('ed', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dados da Lente */}
          <div className="card">
            <div className="card-header bg-bg-secondary p-3 -mx-6 -mt-6 mb-4 rounded-t-2xl border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Dados da Lente</h2>
            </div>
            
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="w-12"></th>
                  <th className="text-center pb-3 text-xs font-bold text-text-secondary">OD</th>
                  <th className="text-center pb-3 text-xs font-bold text-text-secondary">OE</th>
                </tr>
              </thead>
              <tbody className="space-y-3">
                <tr>
                  <td className="text-xs font-bold text-text-secondary align-middle pr-2">MAT</td>
                  <td className="pr-2 pb-3">
                    <select className="form-select w-full bg-black/20 text-xs py-1.5 px-1 h-auto" value={od.matIndex} onChange={e => handleRxChange('OD', 'matIndex', e.target.value)}>
                      {MATERIALS.map((m, i) => <option key={i} value={i}>{m.name.split(' ')[0]} {m.index.toFixed(2)}</option>)}
                    </select>
                  </td>
                  <td className="pb-3">
                    <select className="form-select w-full bg-black/20 text-xs py-1.5 px-1 h-auto" value={oe.matIndex} onChange={e => handleRxChange('OE', 'matIndex', e.target.value)}>
                      {MATERIALS.map((m, i) => <option key={i} value={i}>{m.name.split(' ')[0]} {m.index.toFixed(2)}</option>)}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td className="text-xs font-bold text-text-secondary align-middle pr-2">DNP</td>
                  <td className="pr-2 pb-3"><input type="number" step="0.5" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={od.dnp} onChange={e => handleRxChange('OD', 'dnp', e.target.value)} /></td>
                  <td className="pb-3"><input type="number" step="0.5" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={oe.dnp} onChange={e => handleRxChange('OE', 'dnp', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="text-xs font-bold text-text-secondary align-middle pr-2">ESF</td>
                  <td className="pr-2 pb-3"><input type="number" step="0.25" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={od.sphere} onChange={e => handleRxChange('OD', 'sphere', e.target.value)} /></td>
                  <td className="pb-3"><input type="number" step="0.25" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={oe.sphere} onChange={e => handleRxChange('OE', 'sphere', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="text-xs font-bold text-text-secondary align-middle pr-2">CIL</td>
                  <td className="pr-2 pb-3"><input type="number" step="0.25" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={od.cylinder} onChange={e => handleRxChange('OD', 'cylinder', e.target.value)} /></td>
                  <td className="pb-3"><input type="number" step="0.25" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={oe.cylinder} onChange={e => handleRxChange('OE', 'cylinder', e.target.value)} /></td>
                </tr>
                <tr>
                  <td className="text-xs font-bold text-text-secondary align-middle pr-2">EIXO</td>
                  <td className="pr-2"><input type="number" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={od.axis} onChange={e => handleRxChange('OD', 'axis', e.target.value)} /></td>
                  <td><input type="number" className="form-input w-full bg-black/20 text-center py-1.5 h-auto text-xs" value={oe.axis} onChange={e => handleRxChange('OE', 'axis', e.target.value)} /></td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

        {/* COLUNA DIREITA: SIMULAÇÃO */}
        <div className="card flex flex-col items-center min-h-[600px]">
          <div className="w-full card-header bg-bg-secondary p-3 -mx-6 -mt-6 mb-6 rounded-t-2xl border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">Simulação Visual OD/OE</h2>
            <div className="badge badge-cyan">Representação Aproximada</div>
          </div>

          <div className="w-full flex-1 flex flex-col items-center">
            {/* VISTA FRONTAL (Ambos os olhos) */}
            <div className="w-full max-w-[650px] mb-6">
              <FrameOverviewSVG resultsOD={resultsOD} resultsOE={resultsOE} frame={frame} />
            </div>

            {/* CURVA BASE, PESO E BLOCO */}
            <div className="w-full max-w-[500px] flex justify-between mb-8">
              {/* Box OD */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <div className="text-xs text-text-secondary font-bold">Curva base ideal {resultsOD.baseCurve.toFixed(2)}</div>
                  <div className="text-[10px] text-text-muted">Peso estimado {resultsOD.weight.toFixed(1)} g</div>
                </div>
                <div className="relative w-20 h-20 rounded-full border border-dashed border-accent-cyan/30 bg-accent-cyan/5 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-full w-[1px] bg-accent-cyan/20 rotate-45"></div>
                  </div>
                  <div className="bg-bg-primary px-2 py-1 rounded text-xs font-bold text-accent-cyan z-10">
                    {Math.ceil(resultsOD.effectiveDiameter)}mm
                  </div>
                </div>
              </div>

              {/* Box OE */}
              <div className="flex flex-col items-center gap-3">
                <div className="text-center">
                  <div className="text-xs text-text-secondary font-bold">Curva base ideal {resultsOE.baseCurve.toFixed(2)}</div>
                  <div className="text-[10px] text-text-muted">Peso estimado {resultsOE.weight.toFixed(1)} g</div>
                </div>
                <div className="relative w-20 h-20 rounded-full border border-dashed border-accent-cyan/30 bg-accent-cyan/5 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-full w-[1px] bg-accent-cyan/20 rotate-45"></div>
                  </div>
                  <div className="bg-bg-primary px-2 py-1 rounded text-xs font-bold text-accent-cyan z-10">
                    {Math.ceil(resultsOE.effectiveDiameter)}mm
                  </div>
                </div>
              </div>
            </div>

            {/* PERFIS DAS LENTES (Animados Lado a Lado) */}
            <div className="w-full max-w-[500px] flex justify-between mt-auto pb-4">
              <div className="w-[45%] flex flex-col items-center">
                <LensProfileSVG results={resultsOD} rx={od} label="PERFIL OD" />
              </div>
              <div className="w-[45%] flex flex-col items-center">
                <LensProfileSVG results={resultsOE} rx={oe} label="PERFIL OE" />
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-accent-amber-bg border border-accent-amber/20 rounded-xl flex gap-3 items-start">
        <AlertCircle className="text-accent-amber shrink-0" size={20} />
        <p className="text-xs text-text-secondary">
          <strong>Aviso Importante:</strong> Esta calculadora fornece estimativas baseadas em fórmulas matemáticas ideais e aproximações volumétricas. A espessura e peso reais variam dependendo da surfaçagem digital e laboratório.
        </p>
      </div>
    </div>
  );
}

// Subcomponente SVG para Vista Frontal de Ambos os Olhos
function FrameOverviewSVG({ resultsOD, resultsOE, frame }) {
  const scale = 2.5;
  const width = 600;
  const height = 220;
  const cx = width / 2;
  const cy = height / 2 + 10;

  const aroA = frame.a * scale;
  const aroB = frame.b * scale;
  const bridge = frame.bridge * scale;
  
  // Coordenadas dos centros das lentes
  const distBetweenCenters = aroA + bridge;
  const odX = cx - distBetweenCenters / 2;
  const oeX = cx + distBetweenCenters / 2;

  const Callout = ({ x, y, value }) => {
    return (
      <g>
        <rect 
          x={x - 18} y={y - 10} width="36" height="20" rx="10" 
          fill="rgba(0,0,0,0.8)" stroke="var(--accent-primary)" strokeWidth="0.5" 
        />
        <text 
          x={x} y={y + 1} 
          fill="white" fontSize="9" fontWeight="bold" 
          textAnchor="middle" dominantBaseline="middle"
        >
          {value.toFixed(1)}mm
        </text>
      </g>
    );
  };

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Rótulos Superiores */}
      <rect x={odX - 50} y={15} width="100" height="20" rx="10" fill="var(--bg-secondary)" stroke="var(--white-10)" />
      <text x={odX} y={28} fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">OLHO DIREITO</text>

      <rect x={oeX - 50} y={15} width="100" height="20" rx="10" fill="var(--bg-secondary)" stroke="var(--white-10)" />
      <text x={oeX} y={28} fill="white" fontSize="9" fontWeight="bold" textAnchor="middle">OLHO ESQUERDO</text>

      {/* Ponte da Armação */}
      <path 
        d={`M ${odX + aroA/2} ${cy - 10} Q ${cx} ${cy - 20} ${oeX - aroA/2} ${cy - 10}`} 
        fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" 
      />

      {/* Lente OD */}
      <g>
        <path 
          d={`M ${odX - aroA/2} ${cy - aroB/4} 
              Q ${odX - aroA/2} ${cy - aroB/2} ${odX} ${cy - aroB/2} 
              Q ${odX + aroA/2} ${cy - aroB/2} ${odX + aroA/2} ${cy - aroB/4}
              L ${odX + aroA/2} ${cy + aroB/4}
              Q ${odX + aroA/2} ${cy + aroB/2} ${odX} ${cy + aroB/2}
              Q ${odX - aroA/2} ${cy + aroB/2} ${odX - aroA/2} ${cy + aroB/4} Z`}
          fill="rgba(255,255,255,0.02)" stroke="var(--text-secondary)" strokeWidth="1.5"
        />
        
        {/* Callouts OD */}
        <Callout x={odX} y={cy - aroB/2} value={resultsOD.cardinals.superior} />
        <Callout x={odX} y={cy + aroB/2} value={resultsOD.cardinals.inferior} />
        <Callout x={odX + aroA/2} y={cy} value={resultsOD.cardinals.nasal} />
        <Callout x={odX - aroA/2} y={cy} value={resultsOD.cardinals.temporal} />
        <Callout x={odX} y={cy} value={resultsOD.ct} />
      </g>

      {/* Lente OE */}
      <g>
        <path 
          d={`M ${oeX - aroA/2} ${cy - aroB/4} 
              Q ${oeX - aroA/2} ${cy - aroB/2} ${oeX} ${cy - aroB/2} 
              Q ${oeX + aroA/2} ${cy - aroB/2} ${oeX + aroA/2} ${cy - aroB/4}
              L ${oeX + aroA/2} ${cy + aroB/4}
              Q ${oeX + aroA/2} ${cy + aroB/2} ${oeX} ${cy + aroB/2}
              Q ${oeX - aroA/2} ${cy + aroB/2} ${oeX - aroA/2} ${cy + aroB/4} Z`}
          fill="rgba(255,255,255,0.02)" stroke="var(--text-secondary)" strokeWidth="1.5"
        />

        {/* Callouts OE */}
        <Callout x={oeX} y={cy - aroB/2} value={resultsOE.cardinals.superior} />
        <Callout x={oeX} y={cy + aroB/2} value={resultsOE.cardinals.inferior} />
        <Callout x={oeX - aroA/2} y={cy} value={resultsOE.cardinals.nasal} />
        <Callout x={oeX + aroA/2} y={cy} value={resultsOE.cardinals.temporal} />
        <Callout x={oeX} y={cy} value={resultsOE.ct} />
      </g>
    </svg>
  );
}

// Subcomponente SVG para o Perfil Simplificado Animado
function LensProfileSVG({ results, rx, label }) {
  const width = 200;
  const height = 120;
  
  const esferico = parseFloat(rx.sphere) || 0;
  const cilindro = parseFloat(rx.cylinder) || 0;
  const equivalenteEsferico = esferico + (cilindro / 2);
  const isPositive = equivalenteEsferico > 0;
  
  const scale = 3.5; 
  const CT = Math.max(results.ct * scale, 2); 
  const ET = Math.max(results.maxThickness * scale, 2); 

  let lensPath = "";
  
  const cy = height/2 + 10;
  const frontY = cy - 40;
  const backY = cy + 40;

  if (isPositive) {
    const frontEdgeX = 90;
    const backEdgeX = frontEdgeX + ET;
    const backCenterX = backEdgeX - 20; 
    const frontCenterX = backCenterX - CT;

    lensPath = `M ${frontEdgeX} ${frontY} Q ${frontCenterX} ${cy}, ${frontEdgeX} ${backY} L ${backEdgeX} ${backY} Q ${backCenterX} ${cy}, ${backEdgeX} ${frontY} Z`;
  } else {
    const frontEdgeX = 85;
    const backEdgeX = frontEdgeX + ET;
    const frontCenterX = frontEdgeX - 10; 
    const backCenterX = frontCenterX + CT;

    lensPath = `M ${frontEdgeX} ${frontY} Q ${frontCenterX} ${cy}, ${frontEdgeX} ${backY} L ${backEdgeX} ${backY} Q ${backCenterX} ${cy}, ${backEdgeX} ${frontY} Z`;
  }

  const tipoLabel = isPositive ? "Positiva" : "Negativa";
  
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-lg bg-black/10 rounded-xl border border-white/5">
      <defs>
        <linearGradient id="lensProfileGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(100, 210, 255, 0.5)" />
          <stop offset="50%" stopColor="rgba(100, 210, 255, 0.2)" />
          <stop offset="100%" stopColor="rgba(100, 210, 255, 0.5)" />
        </linearGradient>
      </defs>
      
      <text x={width/2} y={20} fill="var(--text-muted)" fontSize="10" fontWeight="bold" textAnchor="middle" className="uppercase tracking-widest">
        {label} ({tipoLabel})
      </text>

      <path 
        d={lensPath} 
        fill="url(#lensProfileGrad)"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        style={{ transition: 'all 0.4s ease-out' }}
      />
    </svg>
  );
}
