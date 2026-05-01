import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Save, Send, Search } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getLentesContato, saveOrcamento, formatCurrency } from '../services/dataStore';
import { convertPrescriptionToContactLens } from '../services/contactLensCalculations';

const EMPTY_ITEM = {
  lenteId: '',
  marca: '',
  modelo: '',
  precoCaixa: 0,
  qtdCaixasOD: 1,
  qtdCaixasOE: 1
};

export default function NovoOrcamentoContato() {
  const toast = useToast();
  const [lentes, setLentes] = useState([]);
  const [cliente, setCliente] = useState({ nome: '', telefone: '' });
  const [tipoReceita, setTipoReceita] = useState('oculos'); // oculos | contato

  const [receita, setReceita] = useState({
    od: { esferico: '', cilindro: '', eixo: '', adicao: '' },
    oe: { esferico: '', cilindro: '', eixo: '', adicao: '' },
  });

  const [itens, setItens] = useState([{ ...EMPTY_ITEM }]);
  const [observacoes, setObservacoes] = useState('');

  const [searchLente, setSearchLente] = useState('');
  const [activeItemIdx, setActiveItemIdx] = useState(0);
  const [showLenteSelector, setShowLenteSelector] = useState(false);
  const [desconto, setDesconto] = useState(0);
  const [parcelas, setParcelas] = useState(1);

  useEffect(() => {
    async function loadData() {
      const data = await getLentesContato();
      setLentes(data);
    }
    loadData();
  }, []);

  const handleReceitaChange = (eye, field, value) => {
    const sanitizedValue = value.replace(',', '.');
    setReceita(prev => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: sanitizedValue }
    }));
  };

  const handleReceitaBlur = (eye, field) => {
    setReceita(prev => {
      const val = prev[eye][field];
      if (!val || val === '-' || val === '+') return prev;

      let str = String(val).replace(/\s/g, '');
      let num = parseFloat(str);
      if (isNaN(num)) return prev;

      let formatted = val;
      if (field === 'eixo') {
        formatted = Math.round(num).toString();
      } else {
        formatted = num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
      }

      if (prev[eye][field] === formatted) return prev;

      return {
        ...prev,
        [eye]: { ...prev[eye], [field]: formatted }
      };
    });
  };

  // Convert prescription on the fly for UI transparency
  const receitaConvertida = useMemo(() => {
    if (tipoReceita === 'contato') return receita; // No conversion needed
    return {
      od: {
        ...convertPrescriptionToContactLens(receita.od.esferico, receita.od.cilindro, receita.od.eixo),
        adicao: receita.od.adicao // Addition usually remains the same, but you could adjust later if needed
      },
      oe: {
        ...convertPrescriptionToContactLens(receita.oe.esferico, receita.oe.cilindro, receita.oe.eixo),
        adicao: receita.oe.adicao
      }
    };
  }, [receita, tipoReceita]);

  const getCompatibleLenses = () => {
    let result = [...lentes];

    if (searchLente) {
      const term = searchLente.toLowerCase();
      result = result.filter(l =>
        l.modelo?.toLowerCase().includes(term) ||
        l.marca?.toLowerCase().includes(term)
      );
    }

    // A real implementation would also filter by spherical range (esferico_min, esferico_max)
    // based on the receitaConvertida. We'll leave it simple here but we could add it.
    const esfOD = parseFloat(receitaConvertida.od.esferico) || 0;
    const esfOE = parseFloat(receitaConvertida.oe.esferico) || 0;
    const hasAstigmatism = (parseFloat(receitaConvertida.od.cilindro) || 0) !== 0 || (parseFloat(receitaConvertida.oe.cilindro) || 0) !== 0;
    const hasAddition = (parseFloat(receitaConvertida.od.adicao) || 0) > 0 || (parseFloat(receitaConvertida.oe.adicao) || 0) > 0;

    // Smart filtering based on drawing (Desenho)
    if (hasAddition && hasAstigmatism) {
      result = result.filter(l => l.desenho === 'Tórico Multifocal');
    } else if (hasAddition) {
      result = result.filter(l => l.desenho === 'Multifocal' || l.desenho === 'Tórico Multifocal');
    } else if (hasAstigmatism) {
      result = result.filter(l => l.desenho === 'Tórico' || l.desenho === 'Tórico Multifocal');
    } else {
      result = result.filter(l => l.desenho === 'Asférico' || l.desenho === 'Esférico' || l.desenho === 'Tórico');
    }

    const grausIdenticos =
      esfOD === esfOE &&
      (parseFloat(receitaConvertida.od.cilindro) || 0) === (parseFloat(receitaConvertida.oe.cilindro) || 0) &&
      (parseFloat(receitaConvertida.od.eixo) || 0) === (parseFloat(receitaConvertida.oe.eixo) || 0) &&
      (parseFloat(receitaConvertida.od.adicao) || 0) === (parseFloat(receitaConvertida.oe.adicao) || 0);

    // Filter by spherical bounds
    result = result.map(l => {
      const checkSpherical = (esf) => {
        let fits = true;
        let note = null;

        if (esf === 0) {
          fits = l.plano_disponivel === 'Sim';
          return { fits, note };
        }

        const absEsf = Math.abs(esf);

        const checkBounds = (val) => {
          if (val < 0) {
            const mMin = parseFloat(l.miopia_min);
            const mMax = parseFloat(l.miopia_max);
            if (!isNaN(mMin) && val > mMin) return false;
            if (!isNaN(mMax) && val < mMax) return false;
          } else {
            const hMin = parseFloat(l.hiper_min);
            const hMax = parseFloat(l.hiper_max);
            if (!isNaN(hMin) && val < hMin) return false;
            if (!isNaN(hMax) && val > hMax) return false;
          }
          return true;
        };

        fits = checkBounds(esf);

        // Check 0.50 step rule
        if (fits && l.passos_050 === 'Sim' && absEsf > 6.00) {
          if (absEsf % 0.50 !== 0) {
            const suggestedEsf = Math.ceil(esf / 0.50) * 0.50;
            if (checkBounds(suggestedEsf)) {
              note = `Grau sugerido aproximado: ${suggestedEsf > 0 ? '+' : ''}${suggestedEsf.toFixed(2)}`;
            } else {
              fits = false;
            }
          }
        }

        return { fits, note };
      };

      const resultOD = checkSpherical(esfOD);
      const resultOE = checkSpherical(esfOE);

      if (!resultOD.fits && !resultOE.fits) return null;

      let compatibilidade = 'Ambos';
      if (resultOD.fits && !resultOE.fits) compatibilidade = 'Apenas OD';
      if (!resultOD.fits && resultOE.fits) compatibilidade = 'Apenas OE';

      return {
        ...l,
        fitsOD: resultOD.fits,
        fitsOE: resultOE.fits,
        noteOD: resultOD.note,
        noteOE: resultOE.note,
        compatibilidade,
        grausIdenticos
      };
    }).filter(Boolean);

    return result;
  };

  const handleSelectLente = (lente) => {
    setItens(prev => {
      const updated = [...prev];

      let qtdOD = lente.fitsOD ? 1 : 0;
      let qtdOE = lente.fitsOE ? 1 : 0;

      if (lente.grausIdenticos && lente.fitsOD && lente.fitsOE) {
        qtdOD = 1;
        qtdOE = 0;
      }

      updated[activeItemIdx] = {
        ...updated[activeItemIdx],
        lenteId: lente.id,
        marca: lente.marca,
        modelo: lente.modelo,
        precoCaixa: lente.precoCaixa,
        qtdCaixasOD: qtdOD,
        qtdCaixasOE: qtdOE
      };
      return updated;
    });
    setShowLenteSelector(false);
  };

  const addItem = () => {
    setItens(prev => [...prev, { ...EMPTY_ITEM }]);
    setActiveItemIdx(itens.length);
  };

  const removeItem = (idx) => {
    if (itens.length === 1) return;
    setItens(prev => prev.filter((_, i) => i !== idx));
    if (activeItemIdx >= itens.length - 1) {
      setActiveItemIdx(Math.max(0, itens.length - 2));
    }
  };

  const calculateItemTotal = (item) => {
    return (item.precoCaixa * item.qtdCaixasOD) + (item.precoCaixa * item.qtdCaixasOE);
  };

  const total = (itens.reduce((sum, item) => sum + calculateItemTotal(item), 0)) - parseFloat(desconto || 0);

  const handleSave = async (status = 'pendente') => {
    if (!cliente.nome) {
      toast.error('Informe o nome do cliente');
      return;
    }

    const orcamento = {
      tipo: 'contato',
      tipoReceitaOriginal: tipoReceita,
      cliente,
      receitaOriginal: receita,
      receitaConvertida: receitaConvertida,
      itens: itens.map(item => ({
        ...item,
        total: calculateItemTotal(item)
      })),
      desconto: parseFloat(desconto) || 0,
      total,
      observacoes,
      status,
    };

    await saveOrcamento(orcamento);
    toast.success('Orçamento salvo com sucesso!');
    setCliente({ nome: '', telefone: '' });
    setItens([{ ...EMPTY_ITEM }]);
  };

  const maskPhone = (value) => {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').substring(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`;
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Orçamento: Lentes de Contato</h1>
        <p>Gere orçamentos precisos com conversão de vértice automática.</p>
      </div>

      <div className="orcamento-layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Dados Cliente */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">👤 Dados do Cliente</h3>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome</label>
                <input className="form-input" placeholder="Nome do cliente" value={cliente.nome} onChange={e => setCliente(prev => ({ ...prev, nome: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">WhatsApp</label>
                <input className="form-input" placeholder="(00) 00000-0000" value={cliente.telefone} onChange={e => setCliente(prev => ({ ...prev, telefone: maskPhone(e.target.value) }))} maxLength={15} />
              </div>
            </div>
          </div>

          {/* Receita */}
          <div className="card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="card-title">📝 Receita</h3>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>Tipo de Receita:</span>
                <select className="form-select" style={{ width: 'auto' }} value={tipoReceita} onChange={e => setTipoReceita(e.target.value)}>
                  <option value="oculos">Óculos (Calcula Vértice)</option>
                  <option value="contato">Lente de Contato (Digitação Direta)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>Grau Inserido</h4>
                {/* OD Inputs */}
                <div style={{ marginBottom: '16px' }}>
                  <label className="form-label" style={{ fontWeight: 600 }}>Olho Direito (OD)</label>
                  <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, minmax(60px, 1fr))' }}>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Esférico</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.od.esferico} onChange={e => handleReceitaChange('od', 'esferico', e.target.value)} onBlur={() => handleReceitaBlur('od', 'esferico')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.od.cilindro} onChange={e => handleReceitaChange('od', 'cilindro', e.target.value)} onBlur={() => handleReceitaBlur('od', 'cilindro')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Eixo</label><input className="form-input" type="text" inputMode="numeric" placeholder="0" value={receita.od.eixo} onChange={e => handleReceitaChange('od', 'eixo', e.target.value)} onBlur={() => handleReceitaBlur('od', 'eixo')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Adição</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.od.adicao} onChange={e => handleReceitaChange('od', 'adicao', e.target.value)} onBlur={() => handleReceitaBlur('od', 'adicao')} /></div>
                  </div>
                </div>
                {/* OE Inputs */}
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>Olho Esquerdo (OE)</label>
                  <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, minmax(60px, 1fr))' }}>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Esférico</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.oe.esferico} onChange={e => handleReceitaChange('oe', 'esferico', e.target.value)} onBlur={() => handleReceitaBlur('oe', 'esferico')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.oe.cilindro} onChange={e => handleReceitaChange('oe', 'cilindro', e.target.value)} onBlur={() => handleReceitaBlur('oe', 'cilindro')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Eixo</label><input className="form-input" type="text" inputMode="numeric" placeholder="0" value={receita.oe.eixo} onChange={e => handleReceitaChange('oe', 'eixo', e.target.value)} onBlur={() => handleReceitaBlur('oe', 'eixo')} /></div>
                    <div><label className="form-label" style={{ fontSize: '11px' }}>Adição</label><input className="form-input" type="text" inputMode="decimal" placeholder="0.00" value={receita.oe.adicao} onChange={e => handleReceitaChange('oe', 'adicao', e.target.value)} onBlur={() => handleReceitaBlur('oe', 'adicao')} /></div>
                  </div>
                </div>
              </div>

              {/* Conversion Preview */}
              {tipoReceita === 'oculos' && (
                <div style={{ padding: '16px', background: 'var(--accent-primary-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-primary)' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--accent-primary)' }}>✨ Grau Convertido (Lente de Contato)</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Distância ao vértice calculada (12mm).</p>

                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>OD (Direito)</div>
                    <div style={{ display: 'flex', gap: '8px', fontWeight: 600 }}>
                      <span className="badge badge-purple">{receitaConvertida.od.esferico || '0.00'}</span>
                      <span className="badge badge-purple">{receitaConvertida.od.cilindro || '0.00'}</span>
                      <span className="badge badge-purple">{receitaConvertida.od.eixo || '0'}º</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '4px' }}>OE (Esquerdo)</div>
                    <div style={{ display: 'flex', gap: '8px', fontWeight: 600 }}>
                      <span className="badge badge-purple">{receitaConvertida.oe.esferico || '0.00'}</span>
                      <span className="badge badge-purple">{receitaConvertida.oe.cilindro || '0.00'}</span>
                      <span className="badge badge-purple">{receitaConvertida.oe.eixo || '0'}º</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Lentes */}
          {itens.map((item, idx) => (
            <div key={idx} className="card" style={{ border: activeItemIdx === idx ? '1px solid var(--border-active)' : undefined }}>
              <div className="card-header">
                <h3 className="card-title">🔍 Opção {idx + 1}</h3>
                {itens.length > 1 && (
                  <button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(idx)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setActiveItemIdx(idx); setShowLenteSelector(true); }}>
                  <Search size={16} /> {item.modelo ? `${item.marca} - ${item.modelo}` : 'Selecionar Lente de Contato'}
                </button>
              </div>

              {item.lenteId && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Qtd. Caixas (OD)</label>
                    <input className="form-input" type="number" min="0" value={item.qtdCaixasOD} onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setItens(prev => { const arr = [...prev]; arr[idx].qtdCaixasOD = val; return arr; });
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Qtd. Caixas (OE)</label>
                    <input className="form-input" type="number" min="0" value={item.qtdCaixasOE} onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setItens(prev => { const arr = [...prev]; arr[idx].qtdCaixasOE = val; return arr; });
                    }} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço Unitário (Caixa)</label>
                    <input className="form-input" disabled value={formatCurrency(item.precoCaixa)} />
                  </div>
                </div>
              )}
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addItem} style={{ alignSelf: 'flex-start' }}>
            <Plus size={16} /> Adicionar Opção
          </button>
        </div>

        {/* Resumo */}
        <div className="orcamento-summary-sidebar">
          <div className="card" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="card-title" style={{ marginBottom: '20px' }}>💰 Resumo</h3>
            {itens.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Opção {idx + 1}</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(calculateItemTotal(item))}</span>
              </div>
            ))}

            <div style={{ marginTop: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Desconto (R$)</label>
              <input className="form-input" type="number" step="0.01" value={desconto} onChange={e => setDesconto(parseFloat(e.target.value) || 0)} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0 0', fontSize: '18px', fontWeight: 700 }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-green)' }}>{formatCurrency(total)}</span>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', marginTop: '20px' }} onClick={() => handleSave('pendente')}>
              <Save size={16} /> Salvar Orçamento
            </button>
          </div>
        </div>
      </div>

      {/* Modal Lentes */}
      {showLenteSelector && (
        <div className="modal-overlay" onClick={() => setShowLenteSelector(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecionar Lente de Contato</h2>
              <button className="modal-close" onClick={() => setShowLenteSelector(false)}>×</button>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <input className="form-input" placeholder="Buscar lente por modelo ou marca..." value={searchLente} onChange={e => setSearchLente(e.target.value)} autoFocus />
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {getCompatibleLenses().map(lente => (
                <div key={lente.id} className="lente-item" onClick={() => handleSelectLente(lente)} style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{lente.marca} - {lente.modelo}</span>
                      {lente.compatibilidade === 'Apenas OD' && <span className="badge badge-blue">Apenas OD</span>}
                      {lente.compatibilidade === 'Apenas OE' && <span className="badge badge-purple">Apenas OE</span>}
                      {lente.compatibilidade === 'Ambos' && !lente.grausIdenticos && <span className="badge badge-green">Serve para ambos</span>}
                      {lente.compatibilidade === 'Ambos' && lente.grausIdenticos && <span className="badge badge-amber" title="Como os graus são iguais, 1 caixa pode servir para ambos">Graus Idênticos (1 cx serve ambos)</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {lente.desenho} • Descarte: {lente.descarte} • {lente.embalagem} unid/caixa
                    </div>
                    {(lente.noteOD || lente.noteOE) && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>
                        {lente.noteOD && <div>OD: {lente.noteOD}</div>}
                        {lente.noteOE && <div>OE: {lente.noteOE}</div>}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent-green)', display: 'flex', alignItems: 'center' }}>
                    {formatCurrency(lente.precoCaixa)} / cx
                  </div>
                </div>
              ))}
              {getCompatibleLenses().length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhuma lente encontrada. Verifique o grau convertido ou remova os filtros de busca.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
