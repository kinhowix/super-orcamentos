import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  saveLenteContato, getLenteContatoById, getMarcasContato, addMarcaContato
} from '../services/dataStore';

const EMPTY_LENTE_CONTATO = {
  marca: '',
  modelo: '',
  material: 'Silicone Hidrogel', // Default
  polimero: '',
  tecnologia: '',
  desenho: 'Asférico', // Asférico, Tórtico, Multifocal
  modulo: '',
  dk: '',
  dkt: '',
  conteudoH2O: '',
  curvaBase: '8.6',
  diametro: '14.0',
  miopia_min: '-0.25',
  miopia_max: '-12.00',
  hiper_min: '+0.25',
  hiper_max: '+8.00',
  plano_disponivel: 'Não',
  passos_050: 'Sim', // Passos de 0.50D após +/- 6.00D
  intervalo: '0.25',
  cilindro: '', // Text list like -0.75, -1.25, -1.75, -2.25
  eixo: '', // Text list like 10 a 180 (passos de 10)
  adicao: '', // Text list like Low, High, +1.00, +1.50
  protecaoUV: 'Não',
  descarte: 'Mensal',
  embalagem: 6, // number of lenses per box
  precoCaixa: 0
};

const STANDARD_CYLS = ['-0.75', '-1.25', '-1.75', '-2.25', '-2.75', '-3.25', '-3.75', '-4.25', '-4.75', '-5.25', '-5.75'];
const STANDARD_ADDITIONS = ['Low', 'Mid', 'High', '+1.00', '+1.50', '+2.00', '+2.50'];
const STANDARD_AXES = Array.from({ length: 18 }, (_, i) => `${(i + 1) * 10}º`);

export default function CadastroLentesContato() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');

  const [lente, setLente] = useState({ ...EMPTY_LENTE_CONTATO });
  const [marcas, setMarcas] = useState([]);
  const [novaMarca, setNovaMarca] = useState('');
  const [showAddMarca, setShowAddMarca] = useState(false);

  useEffect(() => {
    async function loadData() {
      const currentMarcas = await getMarcasContato();
      setMarcas(currentMarcas);

      if (editId) {
        const existing = await getLenteContatoById(editId);
        if (existing) {
          setLente({ ...EMPTY_LENTE_CONTATO, ...existing });
        }
      }
    }
    loadData();
  }, [editId]);

  const handleFieldChange = (field, value) => {
    setLente(prev => ({ ...prev, [field]: value }));
  };

  const handleAddMarca = async () => {
    if (novaMarca.trim()) {
      const updated = await addMarcaContato(novaMarca.trim());
      setMarcas(updated);
      handleFieldChange('marca', novaMarca.trim());
      setNovaMarca('');
      setShowAddMarca(false);
    }
  };

  const handleSave = async () => {
    if (!lente.marca) {
      toast.error('Selecione uma marca');
      return;
    }
    if (!lente.modelo) {
      toast.error('Informe o modelo da lente de contato');
      return;
    }
    if (!lente.precoCaixa || lente.precoCaixa <= 0) {
      toast.error('Informe um preço válido para a caixa');
      return;
    }

    const lenteParaSalvar = {
      ...lente,
      precoCaixa: parseFloat(lente.precoCaixa) || 0,
      embalagem: parseInt(lente.embalagem) || 1,
    };

    await saveLenteContato(lenteParaSalvar);
    toast.success('Lente de Contato salva com sucesso!');
    
    if (editId) {
      navigate('/catalogo-contato');
    } else {
      setLente({ ...EMPTY_LENTE_CONTATO, marca: lente.marca }); // keep marca to make it faster
    }
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>{editId ? 'Editar Lente de Contato' : 'Cadastro de Lentes de Contato'}</h1>
        <p>Cadastre as especificações técnicas e preços das lentes de contato.</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">📝 Ficha Técnica</h3>
          {editId && (
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/catalogo-contato')}>
              <ArrowLeft size={14} /> Voltar ao Catálogo
            </button>
          )}
        </div>

        {/* Identificação */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Marca</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-select"
                value={lente.marca}
                onChange={e => handleFieldChange('marca', e.target.value)}
              >
                <option value="">Selecione...</option>
                {marcas.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <button
                className="btn btn-secondary btn-icon"
                onClick={() => setShowAddMarca(!showAddMarca)}
                title="Nova Marca"
              >
                <Plus size={16} />
              </button>
            </div>
            {showAddMarca && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <input
                  className="form-input"
                  placeholder="Nome da marca"
                  value={novaMarca}
                  onChange={e => setNovaMarca(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddMarca()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddMarca}>
                  <Check size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Modelo / Produto</label>
            <input
              className="form-input"
              placeholder="Ex: Biofinity Toric"
              value={lente.modelo}
              onChange={e => handleFieldChange('modelo', e.target.value)}
            />
          </div>
        </div>

        {/* Especificações Básicas */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Material</label>
            <input className="form-input" value={lente.material} onChange={e => handleFieldChange('material', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Polímero</label>
            <input className="form-input" placeholder="Ex: Comfilcon A" value={lente.polimero} onChange={e => handleFieldChange('polimero', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tecnologia</label>
            <input className="form-input" placeholder="Ex: Aquaform" value={lente.tecnologia} onChange={e => handleFieldChange('tecnologia', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Desenho</label>
            <select className="form-select" value={lente.desenho} onChange={e => handleFieldChange('desenho', e.target.value)}>
              <option value="Asférico">Asférico (Miopia/Hipermetropia)</option>
              <option value="Tórico">Tórico (Astigmatismo)</option>
              <option value="Multifocal">Multifocal</option>
              <option value="Tórico Multifocal">Tórico Multifocal</option>
            </select>
          </div>
        </div>

        {/* Parâmetros Físicos */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Dk</label>
            <input className="form-input" placeholder="Ex: 128" value={lente.dk} onChange={e => handleFieldChange('dk', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Dk/t</label>
            <input className="form-input" placeholder="Ex: 160" value={lente.dkt} onChange={e => handleFieldChange('dkt', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Conteúdo H2O (%)</label>
            <input className="form-input" placeholder="Ex: 48%" value={lente.conteudoH2O} onChange={e => handleFieldChange('conteudoH2O', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Módulo (Mpa)</label>
            <input className="form-input" placeholder="Ex: 0.8" value={lente.modulo} onChange={e => handleFieldChange('modulo', e.target.value)} />
          </div>
        </div>

        {/* Medidas Base */}
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="form-group">
            <label className="form-label">Curva Base (mm)</label>
            <input className="form-input" placeholder="Ex: 8.6" value={lente.curvaBase} onChange={e => handleFieldChange('curvaBase', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Diâmetro (mm)</label>
            <input className="form-input" placeholder="Ex: 14.0" value={lente.diametro} onChange={e => handleFieldChange('diametro', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Proteção UV</label>
            <select className="form-select" value={lente.protecaoUV} onChange={e => handleFieldChange('protecaoUV', e.target.value)}>
              <option value="Não">Não</option>
              <option value="Sim">Sim</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Descarte</label>
            <select className="form-select" value={lente.descarte} onChange={e => handleFieldChange('descarte', e.target.value)}>
              <option value="Diário">Diário</option>
              <option value="Quinzenal">Quinzenal</option>
              <option value="Mensal">Mensal</option>
              <option value="Anual">Anual</option>
            </select>
          </div>
        </div>

        {/* Dioptrias (Graus) */}
        <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Graus Disponíveis</h4>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <div className="form-group">
              <label className="form-label">Miopia Mínima</label>
              <input className="form-input" type="number" step="0.25" placeholder="-0.25" value={lente.miopia_min} onChange={e => handleFieldChange('miopia_min', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Miopia Máxima</label>
              <input className="form-input" type="number" step="0.25" placeholder="-12.00" value={lente.miopia_max} onChange={e => handleFieldChange('miopia_max', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Hipermetropia Mínima</label>
              <input className="form-input" type="number" step="0.25" placeholder="+0.25" value={lente.hiper_min} onChange={e => handleFieldChange('hiper_min', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Hipermetropia Máxima</label>
              <input className="form-input" type="number" step="0.25" placeholder="+8.00" value={lente.hiper_max} onChange={e => handleFieldChange('hiper_max', e.target.value)} />
            </div>
          </div>
          
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label className="form-label">Plano (0.00) Disponível?</label>
              <select className="form-select" value={lente.plano_disponivel} onChange={e => handleFieldChange('plano_disponivel', e.target.value)}>
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Passos de 0.50D após +/- 6.00?</label>
              <select className="form-select" value={lente.passos_050} onChange={e => handleFieldChange('passos_050', e.target.value)}>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cilindro</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', minHeight: '32px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
                {lente.cilindro.split(',').map(c => c.trim()).filter(Boolean).map(c => (
                  <span key={c} className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => {
                    const current = lente.cilindro.split(',').map(x => x.trim()).filter(Boolean);
                    handleFieldChange('cilindro', current.filter(x => x !== c).join(', '));
                  }}>
                    {c} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
                {!lente.cilindro && <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}>Nenhum selecionado</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {STANDARD_CYLS.map(c => (
                  <button key={c} className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', height: 'auto' }} onClick={() => {
                    const current = lente.cilindro.split(',').map(x => x.trim()).filter(Boolean);
                    if (!current.includes(c)) {
                      handleFieldChange('cilindro', [...current, c].sort((a,b) => parseFloat(a) - parseFloat(b)).join(', '));
                    }
                  }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Eixo</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', minHeight: '32px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
                {lente.eixo.split(',').map(e => e.trim()).filter(Boolean).map(e => (
                  <span key={e} className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => {
                    const current = lente.eixo.split(',').map(x => x.trim()).filter(Boolean);
                    handleFieldChange('eixo', current.filter(x => x !== e).join(', '));
                  }}>
                    {e} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
                {!lente.eixo && <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}>Nenhum selecionado</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                {STANDARD_AXES.map(e => (
                  <button key={e} className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', height: 'auto' }} onClick={() => {
                    const current = lente.eixo.split(',').map(x => x.trim()).filter(Boolean);
                    if (!current.includes(e)) {
                      handleFieldChange('eixo', [...current, e].sort((a,b) => parseInt(a) - parseInt(b)).join(', '));
                    }
                  }}>
                    {e}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                 <button className="btn btn-secondary btn-sm" style={{ fontSize: '10px' }} onClick={() => handleFieldChange('eixo', STANDARD_AXES.join(', '))}>
                    Selecionar Todos (10-180)
                 </button>
                 <button className="btn btn-secondary btn-sm" style={{ fontSize: '10px' }} onClick={() => handleFieldChange('eixo', '')}>
                    Limpar
                 </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Adição</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', minHeight: '32px', padding: '4px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)' }}>
                {lente.adicao.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                  <span key={a} className="badge badge-blue" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }} onClick={() => {
                    const current = lente.adicao.split(',').map(x => x.trim()).filter(Boolean);
                    handleFieldChange('adicao', current.filter(x => x !== a).join(', '));
                  }}>
                    {a} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
                {!lente.adicao && <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '4px' }}>Nenhuma selecionada</span>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {STANDARD_ADDITIONS.map(a => (
                  <button key={a} className="btn btn-secondary btn-sm" style={{ padding: '2px 6px', fontSize: '10px', height: 'auto' }} onClick={() => {
                    const current = lente.adicao.split(',').map(x => x.trim()).filter(Boolean);
                    if (!current.includes(a)) {
                      handleFieldChange('adicao', [...current, a].join(', '));
                    }
                  }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Comercial */}
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '16px', fontWeight: 600 }}>Informações Comerciais</h4>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Lentes por Caixa</label>
              <input className="form-input" type="number" placeholder="Ex: 6" value={lente.embalagem} onChange={e => handleFieldChange('embalagem', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Preço da Caixa (R$)</label>
              <input className="form-input" type="number" step="0.01" placeholder="0.00" value={lente.precoCaixa || ''} onChange={e => handleFieldChange('precoCaixa', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Salvar Lente de Contato
          </button>
        </div>
      </div>
    </div>
  );
}
