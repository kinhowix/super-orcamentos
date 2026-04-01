import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Save, Send, Search
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import {
  getLentes, saveOrcamento, formatCurrency, getAntiReflexoLabel
} from '../services/dataStore'

const EMPTY_ITEM = {
  lenteId: '',
  lenteName: '',
  fornecedor: '',
  indice: '',
  antirreflexo: '',
  preco: 0,
  olhoDireito: { esferico: '', cilindro: '', eixo: '', adicao: '' },
  olhoEsquerdo: { esferico: '', cilindro: '', eixo: '', adicao: '' },
}

export default function NovoOrcamento() {
  const toast = useToast()
  const [lentes, setLentes] = useState([])
  const [cliente, setCliente] = useState({ nome: '', telefone: '' })
  const [itens, setItens] = useState([{ ...EMPTY_ITEM }])
  const [observacoes, setObservacoes] = useState('')
  const [searchLente, setSearchLente] = useState('')
  const [activeItemIdx, setActiveItemIdx] = useState(0)
  const [showLenteSelector, setShowLenteSelector] = useState(false)

  useEffect(() => {
    setLentes(getLentes())
  }, [])

  // Get available AR options for selected lens
  const getAROptions = (item) => {
    if (!item.lenteId) return []
    const lente = lentes.find(l => l.id === item.lenteId)
    if (!lente?.precos) return []
    return Object.keys(lente.precos).map(key => ({
      key,
      label: getAntiReflexoLabel(key),
      preco: lente.precos[key]
    }))
  }

  // Filter lenses based on prescription
  const getCompatibleLenses = (item) => {
    let result = [...lentes]

    // Filter by search
    if (searchLente) {
      const term = searchLente.toLowerCase()
      result = result.filter(l =>
        l.nome?.toLowerCase().includes(term) ||
        l.fornecedor?.toLowerCase().includes(term)
      )
    }

    // Filter by prescription compatibility
    const esf = Math.max(
      Math.abs(parseFloat(item.olhoDireito.esferico) || 0),
      Math.abs(parseFloat(item.olhoEsquerdo.esferico) || 0)
    )
    const cil = Math.max(
      Math.abs(parseFloat(item.olhoDireito.cilindro) || 0),
      Math.abs(parseFloat(item.olhoEsquerdo.cilindro) || 0)
    )
    const ad = Math.max(
      Math.abs(parseFloat(item.olhoDireito.adicao) || 0),
      Math.abs(parseFloat(item.olhoEsquerdo.adicao) || 0)
    )

    // Filter type based on addition
    if (ad === 0) {
      // Se não tem adição, só permite visão simples
      result = result.filter(l => l.tipo !== 'multifocal')
    } else {
      // Se tem adição, só permite multifocal
      result = result.filter(l => l.tipo === 'multifocal')
    }

    if (esf > 0 || cil > 0 || ad > 0) {
      result = result.filter(l => {
        const spec = l.especificacoes
        if (!spec) return true

        // Check spherical range
        if (esf > 0 && spec.esferico_min != null && spec.esferico_max != null) {
          if (esf > Math.max(Math.abs(spec.esferico_min), Math.abs(spec.esferico_max))) {
            return false
          }
        }

        // Check cylinder
        if (cil > 0 && spec.cilindro_max != null) {
          if (cil > Math.abs(spec.cilindro_max)) return false
        }

        // Check addition (for multifocal)
        if (ad > 0 && spec.adicao_min != null && spec.adicao_max != null) {
          if (ad < spec.adicao_min || ad > spec.adicao_max) return false
        }

        return true
      })
    }

    return result
  }

  // Group compatible lenses
  const groupedCompatibleLenses = useMemo(() => {
    const compatible = getCompatibleLenses(itens[activeItemIdx] || EMPTY_ITEM)
    const groups = {}
    compatible.forEach(l => {
      const key = `${l.fornecedor}-${l.nome}`
      if (!groups[key]) {
        groups[key] = {
          fornecedor: l.fornecedor,
          nome: l.nome,
          tipo: l.tipo,
          lentes: []
        }
      }
      groups[key].lentes.push(l)
    })
    return groups
  }, [lentes, searchLente, itens, activeItemIdx])

  const handleSelectLente = (lente) => {
    const arKeys = Object.keys(lente.precos || {})
    const firstAR = arKeys[0] || ''
    const preco = firstAR ? lente.precos[firstAR] : 0

    setItens(prev => {
      const updated = [...prev]
      updated[activeItemIdx] = {
        ...updated[activeItemIdx],
        lenteId: lente.id,
        lenteName: `${lente.fornecedor} - ${lente.nome} (${lente.indice})`,
        fornecedor: lente.fornecedor,
        indice: lente.indice,
        antirreflexo: firstAR,
        preco: preco,
      }
      return updated
    })
    setShowLenteSelector(false)
  }

  const handleARChange = (itemIdx, arKey) => {
    const item = itens[itemIdx]
    const lente = lentes.find(l => l.id === item.lenteId)
    const preco = lente?.precos?.[arKey] || 0

    setItens(prev => {
      const updated = [...prev]
      updated[itemIdx] = {
        ...updated[itemIdx],
        antirreflexo: arKey,
        preco: preco,
      }
      return updated
    })
  }

  const handleEyeChange = (itemIdx, eye, field, value) => {
    setItens(prev => {
      const updated = [...prev]
      updated[itemIdx] = {
        ...updated[itemIdx],
        [eye]: { ...updated[itemIdx][eye], [field]: value }
      }
      return updated
    })
  }

  const addItem = () => {
    setItens(prev => [...prev, { ...EMPTY_ITEM }])
    setActiveItemIdx(itens.length)
  }

  const removeItem = (idx) => {
    if (itens.length === 1) return
    setItens(prev => prev.filter((_, i) => i !== idx))
    if (activeItemIdx >= itens.length - 1) {
      setActiveItemIdx(Math.max(0, itens.length - 2))
    }
  }

  const total = itens.reduce((sum, item) => sum + (item.preco || 0), 0)

  const handleSave = (status = 'pendente') => {
    if (!cliente.nome) {
      toast.error('Informe o nome do cliente')
      return
    }

    const orcamento = {
      cliente,
      itens: itens.map(item => ({
        ...item,
        preco: parseFloat(item.preco) || 0,
      })),
      total,
      observacoes,
      status,
    }

    saveOrcamento(orcamento)
    toast.success('Orçamento salvo com sucesso!')

    // Reset form
    setCliente({ nome: '', telefone: '' })
    setItens([{ ...EMPTY_ITEM }])
    setObservacoes('')
    setActiveItemIdx(0)
  }

  const handleSendWhatsApp = () => {
    if (!cliente.nome) {
      toast.error('Informe o nome do cliente')
      return
    }

    // Save first
    handleSave('enviado')

    // Build WhatsApp message
    let msg = `*Orçamento de Lentes*\n`
    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*Cliente:* ${cliente.nome.trim}\n\n`

    itens.forEach((item, idx) => {
      if (item.lenteName) {

        // Uso do .trim() para garantir que o texto cole no asterisco
        const nomeLente = item.lenteName.trim();
        const antiReflexo = getAntiReflexoLabel(item.antirreflexo).trim();
        const valor = formatCurrency(item.preco).trim();

        msg += `*Opção ${idx + 1}:* ${item.lenteName}\n`
        msg += `Antirreflexo: ${getAntiReflexoLabel(item.antirreflexo)}\n`
        msg += `Valor: ${formatCurrency(item.preco)}\n\n`
      }
    })

    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*Total: ${formatCurrency(total).trim}*\n`

    if (observacoes) {
      msg += `\n${observacoes.trim}\n`
    }

    const phone = cliente.telefone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Novo Orçamento</h1>
        <p>Monte o orçamento de lentes para o cliente</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        {/* Main Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Client Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">👤 Dados do Cliente</h3>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nome</label>
                <input
                  className="form-input"
                  placeholder="Nome do cliente"
                  value={cliente.nome}
                  onChange={e => setCliente(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">WhatsApp</label>
                <input
                  className="form-input"
                  placeholder="(00) 00000-0000"
                  value={cliente.telefone}
                  onChange={e => setCliente(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Lens Items */}
          {itens.map((item, idx) => (
            <div key={idx} className="card" style={{
              border: activeItemIdx === idx ? '1px solid var(--border-active)' : undefined,
            }}>
              <div className="card-header">
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🔍 Opção {idx + 1}
                  {item.lenteName && (
                    <span className="badge badge-green" style={{ fontWeight: 500 }}>
                      {item.lenteName}
                    </span>
                  )}
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {itens.length > 1 && (
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => removeItem(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Prescription */}
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Receita - Olho Direito (OD)</label>
                <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Esférico</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoDireito.esferico}
                      onChange={e => handleEyeChange(idx, 'olhoDireito', 'esferico', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoDireito.cilindro}
                      onChange={e => handleEyeChange(idx, 'olhoDireito', 'cilindro', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Eixo</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0"
                      value={item.olhoDireito.eixo}
                      onChange={e => handleEyeChange(idx, 'olhoDireito', 'eixo', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Adição</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoDireito.adicao}
                      onChange={e => handleEyeChange(idx, 'olhoDireito', 'adicao', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Receita - Olho Esquerdo (OE)</label>
                <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Esférico</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoEsquerdo.esferico}
                      onChange={e => handleEyeChange(idx, 'olhoEsquerdo', 'esferico', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoEsquerdo.cilindro}
                      onChange={e => handleEyeChange(idx, 'olhoEsquerdo', 'cilindro', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Eixo</label>
                    <input
                      className="form-input"
                      type="number"
                      placeholder="0"
                      value={item.olhoEsquerdo.eixo}
                      onChange={e => handleEyeChange(idx, 'olhoEsquerdo', 'eixo', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '11px' }}>Adição</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.25"
                      placeholder="0.00"
                      value={item.olhoEsquerdo.adicao}
                      onChange={e => handleEyeChange(idx, 'olhoEsquerdo', 'adicao', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Lens Selection */}
              <div style={{ marginBottom: '16px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                  onClick={() => {
                    setActiveItemIdx(idx)
                    setShowLenteSelector(true)
                    setSearchLente('')
                  }}
                >
                  <Search size={16} />
                  {item.lenteName ? 'Trocar Lente' : 'Selecionar Lente'}
                </button>
              </div>

              {/* AR Selection */}
              {item.lenteId && (
                <div>
                  <label className="form-label">Antirreflexo</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {getAROptions(item).map(ar => (
                      <button
                        key={ar.key}
                        className="chip"
                        onClick={() => handleARChange(idx, ar.key)}
                        style={{
                          cursor: 'pointer',
                          background: item.antirreflexo === ar.key
                            ? 'var(--accent-green-bg)'
                            : 'var(--bg-glass)',
                          borderColor: item.antirreflexo === ar.key
                            ? 'rgba(16, 185, 129, 0.3)'
                            : 'var(--border-color)',
                          color: item.antirreflexo === ar.key
                            ? 'var(--accent-green)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {ar.label} - {formatCurrency(ar.preco)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button className="btn btn-secondary" onClick={addItem} style={{ alignSelf: 'flex-start' }}>
            <Plus size={16} /> Adicionar Opção
          </button>
        </div>

        {/* Summary Sidebar */}
        <div style={{ position: 'sticky', top: '32px', alignSelf: 'flex-start' }}>
          <div className="card" style={{ background: 'var(--gradient-card)' }}>
            <h3 className="card-title" style={{ marginBottom: '20px' }}>💰 Resumo</h3>

            {itens.map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '14px',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Opção {idx + 1}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {item.preco ? formatCurrency(item.preco) : '-'}
                </span>
              </div>
            ))}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px 0 0',
              fontSize: '18px',
              fontWeight: 700,
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(total)}
              </span>
            </div>

            <div className="divider" />

            <div className="form-group">
              <label className="form-label">Observações</label>
              <textarea
                className="form-textarea"
                placeholder="Prazo, condições, etc."
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => handleSave('pendente')}>
                <Save size={16} /> Salvar
              </button>
              <button className="btn btn-whatsapp" onClick={handleSendWhatsApp}>
                <Send size={16} /> Enviar WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lens Selector Modal */}
      {showLenteSelector && (
        <div className="modal-overlay" onClick={() => setShowLenteSelector(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Selecionar Lente</h2>
              <button className="modal-close" onClick={() => setShowLenteSelector(false)}>×</button>
            </div>

            <div className="search-box" style={{ marginBottom: '16px' }}>
              <Search size={16} className="search-icon" />
              <input
                className="form-input"
                placeholder="Buscar por nome ou fornecedor..."
                value={searchLente}
                onChange={e => setSearchLente(e.target.value)}
                autoFocus
              />
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
              {Object.keys(groupedCompatibleLenses).length === 0
                ? 'Nenhuma lente compatível encontrada'
                : `Mostrando lentes compatíveis com a receita informada`}
            </p>

            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              {Object.entries(groupedCompatibleLenses).map(([key, group]) => (
                <div key={key} style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    color: 'var(--text-secondary)',
                  }}>
                    {group.fornecedor} - {group.nome}
                    <span className={`badge ${group.tipo === 'multifocal' ? 'badge-purple' : 'badge-cyan'}`}
                      style={{ marginLeft: '8px' }}>
                      {group.tipo === 'multifocal' ? 'Multi' : 'VS'}
                    </span>
                  </div>
                  {group.lentes
                    .sort((a, b) => parseFloat(a.indice || 0) - parseFloat(b.indice || 0))
                    .map(lente => {
                      const minPrice = Math.min(...Object.values(lente.precos || { 0: 0 }))
                      const maxPrice = Math.max(...Object.values(lente.precos || { 0: 0 }))
                      return (
                        <div
                          key={lente.id}
                          onClick={() => handleSelectLente(lente)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'all 150ms ease',
                          }}
                          onMouseOver={e => {
                            e.currentTarget.style.background = 'var(--accent-primary-bg)'
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)'
                          }}
                          onMouseOut={e => {
                            e.currentTarget.style.background = ''
                            e.currentTarget.style.borderColor = 'var(--border-color)'
                          }}
                        >
                          <div>
                            <span className="badge badge-purple" style={{ marginRight: '8px' }}>
                              {lente.indice}
                            </span>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                              {lente.material}
                            </span>
                          </div>
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>
                            {minPrice === maxPrice
                              ? formatCurrency(minPrice)
                              : `${formatCurrency(minPrice)} ~ ${formatCurrency(maxPrice)}`
                            }
                          </span>
                        </div>
                      )
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
