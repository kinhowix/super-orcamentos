import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Trash2, Save, Send, Search, Camera, ClipboardCheck, Loader2
} from 'lucide-react'
import { extractTextFromImage, parsePrescriptionText } from '../services/ocrService'

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
}

export default function NovoOrcamento() {
  const toast = useToast()
  const [lentes, setLentes] = useState([])
  const [cliente, setCliente] = useState({ nome: '', telefone: '' })
  const [itens, setItens] = useState([{ ...EMPTY_ITEM }])
  const [receita, setReceita] = useState({
    od: { esferico: '', cilindro: '', eixo: '', adicao: '' },
    oe: { esferico: '', cilindro: '', eixo: '', adicao: '' },
  })
  const [observacoes, setObservacoes] = useState('')
  const [searchLente, setSearchLente] = useState('')
  const [activeItemIdx, setActiveItemIdx] = useState(0)
  const [showLenteSelector, setShowLenteSelector] = useState(false)

  // OCR States
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [showOcrConfirm, setShowOcrConfirm] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)
  const [ocrPreview, setOcrPreview] = useState(null)
  const [parcelas, setParcelas] = useState(1)
  const [armacao, setArmacao] = useState({ referencia: '', preco: 0 })
  const [desconto, setDesconto] = useState(0)

  // Selection Filters
  const [filterIndex, setFilterIndex] = useState('')
  const [filterFornecedor, setFilterFornecedor] = useState('')
  const [filterPrecoMax, setFilterPrecoMax] = useState('')
  const [filterFotossensivel, setFilterFotossensivel] = useState(false)
  const [filterFiltroAzul, setFilterFiltroAzul] = useState(false)


  useEffect(() => {
    async function loadData() {
      const data = await getLentes();
      setLentes(data);
    }
    loadData();
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
  const getCompatibleLenses = () => {
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
      Math.abs(parseFloat(receita.od.esferico) || 0),
      Math.abs(parseFloat(receita.oe.esferico) || 0)
    )
    const cil = Math.max(
      Math.abs(parseFloat(receita.od.cilindro) || 0),
      Math.abs(parseFloat(receita.oe.cilindro) || 0)
    )
    const ad = Math.max(
      Math.abs(parseFloat(receita.od.adicao) || 0),
      Math.abs(parseFloat(receita.oe.adicao) || 0)
    )

    // Filter type based on addition
    if (ad === 0) {
      // Se não tem adição, só permite visão simples
      result = result.filter(l => l.tipo !== 'multifocal')
    } else {
      // Se tem adição, só permite multifocal
      result = result.filter(l => l.tipo === 'multifocal')
    }

    if (esf !== 0 || cil !== 0 || ad !== 0) {
      result = result.filter(l => {
        const spec = l.especificacoes
        if (!spec) return true

        const esfOD = parseFloat(receita.od.esferico) || 0
        const esfOE = parseFloat(receita.oe.esferico) || 0
        const cilOD = Math.abs(parseFloat(receita.od.cilindro) || 0)
        const cilOE = Math.abs(parseFloat(receita.oe.cilindro) || 0)
        const adOD = Math.abs(parseFloat(receita.od.adicao) || 0)
        const adOE = Math.abs(parseFloat(receita.oe.adicao) || 0)

        // 1. Check grid-based availability (MANDATORY if useGrid is true)
        if (spec.useGrid && spec.grid) {
          const checkGridEye = (esfVal, cilVal) => {
            const key = parseFloat(esfVal).toFixed(2)
            const gridRow = spec.grid[key]

            // If sphere is NOT in grid, lens is incompatible
            if (!gridRow) return false

            // Check specific cylinder limit for this sphere
            if (gridRow.maxCyl !== null && gridRow.maxCyl !== undefined) {
              const maxCyl = Math.abs(parseFloat(gridRow.maxCyl))
              if (cilVal > maxCyl) return false
            }
            return true
          }

          if (!checkGridEye(esfOD, cilOD) || !checkGridEye(esfOE, cilOE)) return false
        }

        // 2. Global Check spherical range
        const eMin = spec.esferico_min !== "" && spec.esferico_min !== null ? parseFloat(spec.esferico_min) : null
        const eMax = spec.esferico_max !== "" && spec.esferico_max !== null ? parseFloat(spec.esferico_max) : null

        if (eMin !== null && eMax !== null) {
          const min = Math.min(eMin, eMax)
          const max = Math.max(eMin, eMax)
          if (esfOD < min || esfOD > max) return false
          if (esfOE < min || esfOE > max) return false
        }

        // 3. Global Check cylinder (if not already handled by grid)
        if (spec.cilindro_max !== "" && spec.cilindro_max !== null) {
          const maxCyl = Math.abs(parseFloat(spec.cilindro_max))
          if (cilOD > maxCyl || cilOE > maxCyl) return false
        }

        // 4. Global Check addition (for multifocal)
        if (ad > 0 && spec.adicao_min != null && spec.adicao_max != null) {
          const aMin = parseFloat(spec.adicao_min)
          const aMax = parseFloat(spec.adicao_max)
          if (adOD > 0 && (adOD < aMin || adOD > aMax)) return false
          if (adOE > 0 && (adOE < aMin || adOE > aMax)) return false
        }

        return true
      })
    }

    // 5. Apply User Filters (Optional)
    if (filterIndex) {
      result = result.filter(l => l.indice === filterIndex)
    }

    if (filterFornecedor) {
      result = result.filter(l => l.fornecedor === filterFornecedor)
    }

    if (filterPrecoMax) {
      const max = parseFloat(filterPrecoMax)
      if (!isNaN(max)) {
        result = result.filter(l => {
          const prices = Object.values(l.precos || {})
          if (prices.length === 0) return true
          const minPrice = Math.min(...prices)
          return minPrice <= max
        })
      }
    }

    // 6. Filter by Extra Features (Fotossensível / Filtro Azul)
    if (filterFotossensivel) {
      result = result.filter(l => l.especificacoes?.fotossensivel === true)
    }

    if (filterFiltroAzul) {
      result = result.filter(l => l.especificacoes?.filtroAzul === true)
    }

    return result
  }

  // Group compatible lenses
  const groupedCompatibleLenses = useMemo(() => {
    const compatible = getCompatibleLenses()
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
  }, [lentes, searchLente, receita, filterIndex, filterFornecedor, filterPrecoMax, filterFotossensivel, filterFiltroAzul])

  // Get unique indices and vendors from compatible lenses (pre-filter)
  const filterOptions = useMemo(() => {
    // We want the options based on prescription compatibility ONLY, 
    // so the user can see what's available for their degree
    const compatibleWithDegree = lentes.filter(l => {
      // Simple version of getCompatibleLenses logic just for degree
      const esfOD = parseFloat(receita.od.esferico) || 0
      const esfOE = parseFloat(receita.oe.esferico) || 0
      const cilOD = Math.abs(parseFloat(receita.od.cilindro) || 0)
      const cilOE = Math.abs(parseFloat(receita.oe.cilindro) || 0)
      const ad = Math.max(Math.abs(parseFloat(receita.od.adicao) || 0), Math.abs(parseFloat(receita.oe.adicao) || 0))

      if (ad === 0 && l.tipo === 'multifocal') return false
      if (ad > 0 && l.tipo !== 'multifocal') return false

      const spec = l.especificacoes
      if (!spec) return true

      if (spec.useGrid && spec.grid) {
        const checkGrid = (esf, cil) => {
          const row = spec.grid[parseFloat(esf).toFixed(2)]
          if (!row) return false
          if (row.maxCyl != null && cil > Math.abs(parseFloat(row.maxCyl))) return false
          return true
        }
        if (!checkGrid(esfOD, cilOD) || !checkGrid(esfOE, cilOE)) return false
      }
      return true
    })

    return {
      indices: [...new Set(compatibleWithDegree.map(l => l.indice))].sort(),
      fornecedores: [...new Set(compatibleWithDegree.map(l => l.fornecedor))].sort()
    }
  }, [lentes, receita])

  const clearFilters = () => {
    setSearchLente('')
    setFilterIndex('')
    setFilterFornecedor('')
    setFilterPrecoMax('')
    setFilterFotossensivel(false)
    setFilterFiltroAzul(false)
  }

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

  const handleReceitaChange = (eye, field, value) => {
    // Troca vírgula por ponto para facilitar a digitação
    const sanitizedValue = value.replace(',', '.')
    setReceita(prev => ({
      ...prev,
      [eye]: { ...prev[eye], [field]: sanitizedValue }
    }))
  }

  const handleReceitaBlur = (eye, field) => {
    setReceita(prev => {
      const val = prev[eye][field]
      if (!val || val === '-' || val === '+') return prev

      let str = String(val).replace(/\s/g, '')
      let num = parseFloat(str)
      if (isNaN(num)) return prev

      let formatted = val
      if (field === 'eixo') {
        formatted = Math.round(num).toString()
      } else {
        formatted = num > 0 ? `+${num.toFixed(2)}` : num.toFixed(2)
      }

      if (prev[eye][field] === formatted) return prev

      return {
        ...prev,
        [eye]: { ...prev[eye], [field]: formatted }
      }
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

  const total = (itens.reduce((sum, item) => sum + (item.preco || 0), 0) + (parseFloat(armacao.preco) || 0)) - (parseFloat(desconto) || 0)

  const maskPhone = (value) => {
    if (!value) return ''
    // Remove tudo que não é dígito
    const digits = value.replace(/\D/g, '').substring(0, 11)

    // Aplica a máscara
    if (digits.length <= 2) return digits
    if (digits.length <= 7) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`
    return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7, 11)}`
  }

  const handlePhoneChange = (e) => {
    const formatted = maskPhone(e.target.value)
    setCliente(prev => ({ ...prev, telefone: formatted }))
  }

  const handleCaptureImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onload = (event) => setOcrPreview(event.target.result)
    reader.readAsDataURL(file)

    setOcrLoading(true)
    setOcrProgress(0)

    try {
      const text = await extractTextFromImage(file, (progress) => {
        setOcrProgress(progress)
      })

      const parsed = parsePrescriptionText(text)
      setOcrResult(parsed)
      setShowOcrConfirm(true)
    } catch (error) {
      console.error('OCR Error:', error)
      toast.error('Erro ao ler a imagem. Tente novamente.')
    } finally {
      setOcrLoading(false)
    }
  }

  const applyOcrResult = () => {
    if (ocrResult) {
      setReceita(ocrResult)
      toast.success('Receita preenchida!')
    }
    setShowOcrConfirm(false)
    setOcrPreview(null)
  }

  const handleSave = async (status = 'pendente') => {
    if (!cliente.nome) {
      toast.error('Informe o nome do cliente')
      return
    }

    const orcamento = {
      cliente,
      receita,
      itens: itens.map(item => ({
        ...item,
        preco: parseFloat(item.preco) || 0,
      })),
      armacao: {
        ...armacao,
        preco: parseFloat(armacao.preco) || 0
      },
      desconto: parseFloat(desconto) || 0,
      total,
      observacoes,
      status,
    }

    await saveOrcamento(orcamento)
    toast.success('Orçamento salvo com sucesso!')

    // Reset form
    setCliente({ nome: '', telefone: '' })
    setReceita({
      od: { esferico: '', cilindro: '', eixo: '', adicao: '' },
      oe: { esferico: '', cilindro: '', eixo: '', adicao: '' },
    })
    setItens([{ ...EMPTY_ITEM }])
    setArmacao({ referencia: '', preco: 0 })
    setDesconto(0)
    setObservacoes('')
    setActiveItemIdx(0)
  }

  const handleSendWhatsApp = async () => {
    if (!cliente.nome) {
      toast.error('Informe o nome do cliente')
      return
    }

    // Save first
    await handleSave('enviado')

    // Build WhatsApp message
    let msg = `*🔍 Orçamento de Lentes*\n`
    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*Cliente:* ${cliente.nome}\n`

    if (receita.od.esferico || receita.oe.esferico) {
      msg += `\n*Receita:* \n`
      msg += `OD: ${receita.od.esferico || '0.00'}/${receita.od.cilindro || '0.00'} Eixo: ${receita.od.eixo || '0'}° Add: ${receita.od.adicao || '0.00'}\n`
      msg += `OE: ${receita.oe.esferico || '0.00'}/${receita.oe.cilindro || '0.00'} Eixo: ${receita.oe.eixo || '0'}° Add: ${receita.oe.adicao || '0.00'}\n`
    }

    msg += `\n`

    itens.forEach((item, idx) => {
      if (item.lenteName) {
        msg += `*📌 Opção ${idx + 1}:* ${item.lenteName}\n`
        msg += `   Antirreflexo: ${getAntiReflexoLabel(item.antirreflexo)}\n\n`
      }
    })

    if (armacao.referencia) {
      msg += `*👓 Armação:* ${armacao.referencia}\n\n`
    }

    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*💰 Total: ${formatCurrency(total)}*\n`

    if (parcelas > 1) {
      msg += `*💳 Pagamento:* ${parcelas}x de ${formatCurrency(total / parcelas)} sem juros\n`
    } else {
      msg += `*💳 Pagamento:* À vista no ${formatCurrency(total)}\n`
    }

    if (observacoes) {
      msg += `\n📝 *Obs:* ${observacoes}\n`
    }

    // Clean phone number for URL
    const phone = cliente.telefone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Novo Orçamento</h1>
        <p>Monte o orçamento de lentes para o cliente</p>
      </div>

      <div className="orcamento-layout">
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
                  onChange={handlePhoneChange}
                  maxLength={15} // (XX) XXXXX-XXXX = 15 chars
                />
              </div>
            </div>
          </div>

          {/* Prescription */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">📝 Receita do Cliente</h3>
              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                {ocrLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                <span style={{ marginLeft: '8px' }}>
                  {ocrLoading ? `Lendo... ${ocrProgress}%` : 'Ler Receita'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleCaptureImage}
                  disabled={ocrLoading}
                />
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>Olho Direito (OD)</label>
              <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Esférico</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.od.esferico}
                    onChange={e => handleReceitaChange('od', 'esferico', e.target.value)}
                    onBlur={() => handleReceitaBlur('od', 'esferico')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.od.cilindro}
                    onChange={e => handleReceitaChange('od', 'cilindro', e.target.value)}
                    onBlur={() => handleReceitaBlur('od', 'cilindro')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Eixo</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={receita.od.eixo}
                    onChange={e => handleReceitaChange('od', 'eixo', e.target.value)}
                    onBlur={() => handleReceitaBlur('od', 'eixo')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Adição</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.od.adicao}
                    onChange={e => handleReceitaChange('od', 'adicao', e.target.value)}
                    onBlur={() => handleReceitaBlur('od', 'adicao')}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontWeight: 600 }}>Olho Esquerdo (OE)</label>
              <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Esférico</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.oe.esferico}
                    onChange={e => handleReceitaChange('oe', 'esferico', e.target.value)}
                    onBlur={() => handleReceitaBlur('oe', 'esferico')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Cilíndrico</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.oe.cilindro}
                    onChange={e => handleReceitaChange('oe', 'cilindro', e.target.value)}
                    onBlur={() => handleReceitaBlur('oe', 'cilindro')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Eixo</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={receita.oe.eixo}
                    onChange={e => handleReceitaChange('oe', 'eixo', e.target.value)}
                    onBlur={() => handleReceitaBlur('oe', 'eixo')}
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '11px' }}>Adição</label>
                  <input
                    className="form-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={receita.oe.adicao}
                    onChange={e => handleReceitaChange('oe', 'adicao', e.target.value)}
                    onBlur={() => handleReceitaBlur('oe', 'adicao')}
                  />
                </div>
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

          {/* Frame Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">👓 Dados da Armação (Opcional)</h3>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Referência / Modelo</label>
                <input
                  className="form-input"
                  placeholder="Ex: Ray-Ban RB3025"
                  value={armacao.referencia}
                  onChange={e => setArmacao(prev => ({ ...prev, referencia: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Preço da Armação</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={armacao.preco || ''}
                  onChange={e => setArmacao(prev => ({ ...prev, preco: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="orcamento-summary-sidebar">
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

            {armacao.preco > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '14px',
              }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Armação {armacao.referencia ? `(${armacao.referencia})` : ''}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {formatCurrency(armacao.preco)}
                </span>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Desconto (R$)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={desconto || ''}
                onChange={e => setDesconto(parseFloat(e.target.value) || 0)}
                style={{ height: '36px', fontSize: '14px' }}
              />
            </div>

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
              <label className="form-label">Condições de Pagamento</label>
              <select
                className="form-select"
                value={parcelas}
                onChange={e => setParcelas(parseInt(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                  <option key={n} value={n}>
                    {n === 1 ? 'À vista' : `${n}x sem juros`}
                  </option>
                ))}
              </select>
              {parcelas > 1 && (
                <div style={{ fontSize: '13px', marginTop: '8px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {parcelas}x de {formatCurrency(total / parcelas)}
                </div>
              )}
            </div>

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

            <div className="summary-actions">
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

            <div className="search-box" style={{ marginBottom: '12px' }}>
              <Search size={16} className="search-icon" />
              <input
                className="form-input"
                placeholder="Buscar por nome ou modelo..."
                value={searchLente}
                onChange={e => setSearchLente(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)', /* Sub-glass effect */
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.02)'
            }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Índice</label>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(0, 0, 0, 0.2)' }}
                  value={filterIndex}
                  onChange={e => setFilterIndex(e.target.value)}
                >
                  <option value="">Todos</option>
                  {filterOptions.indices.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Marca/Fornecedor</label>
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(0, 0, 0, 0.2)' }}
                  value={filterFornecedor}
                  onChange={e => setFilterFornecedor(e.target.value)}
                >
                  <option value="">Todas</option>
                  {filterOptions.fornecedores.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preço Máximo</label>
                <input
                  type="number"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '13px', background: 'rgba(0, 0, 0, 0.2)' }}
                  placeholder="Até R$..."
                  value={filterPrecoMax}
                  onChange={e => setFilterPrecoMax(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setFilterFotossensivel(!filterFotossensivel)}>
                  <input type="checkbox" checked={filterFotossensivel} onChange={() => { }} style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Fotossensível</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setFilterFiltroAzul(!filterFiltroAzul)}>
                  <input type="checkbox" checked={filterFiltroAzul} onChange={() => { }} style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Filtro Azul</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', padding: '8px', fontSize: '12px', height: '38px', borderRadius: 'var(--radius-sm)' }}
                  onClick={clearFilters}
                >
                  Limpar Filtros
                </button>
              </div>
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
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {group.nome}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {group.lentes.some(l => l.especificacoes?.fotossensivel) && (
                          <span title="Fotossensível" style={{ fontSize: '10px', background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)', padding: '2px 6px', borderRadius: '4px' }}>🌟 Foto</span>
                        )}
                        {group.lentes.some(l => l.especificacoes?.filtroAzul) && (
                          <span title="Filtro Azul" style={{ fontSize: '10px', background: 'var(--accent-primary-bg)', color: 'var(--accent-primary-hover)', padding: '2px 6px', borderRadius: '4px' }}>🔵 Azul</span>
                        )}
                      </div>
                    </div>
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
                              {(() => {
                                const currentItem = itens[activeItemIdx] || EMPTY_ITEM
                                if (lente.especificacoes?.useGrid && lente.especificacoes?.grid) {
                                  const od = (parseFloat(receita.od.esferico) || 0).toFixed(2)
                                  const oe = (parseFloat(receita.oe.esferico) || 0).toFixed(2)
                                  const diamOD = lente.especificacoes.grid[od]?.diametro
                                  const diamOE = lente.especificacoes.grid[oe]?.diametro
                                  if (diamOD || diamOE) {
                                    return ` • Ø ${diamOD || '?'}${diamOD !== diamOE ? '/' + (diamOE || '?') : ''}`
                                  }
                                }
                                return lente.especificacoes?.diametro ? ` • Ø ${lente.especificacoes.diametro}` : ''
                              })()}
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

      {/* OCR Confirmation Modal */}
      {showOcrConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Confirmar Graus Lidos</h2>
              <button className="modal-close" onClick={() => setShowOcrConfirm(false)}>×</button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
              Identificamos os seguintes valores na imagem. Verifique se estão corretos antes de aplicar.
            </p>

            {ocrPreview && (
              <div className="ocr-preview-container">
                <img src={ocrPreview} alt="Preview da receita" />
              </div>
            )}

            <div className="ocr-results-grid">
              <div />
              <div className="ocr-result-header">OD (Direito)</div>
              <div className="ocr-result-header">OE (Esquerdo)</div>

              <div className="ocr-result-row">
                <div className="ocr-result-eye">Esférico</div>
                <input
                  className="ocr-result-input"
                  value={ocrResult?.od.esferico}
                  onChange={e => setOcrResult(prev => ({ ...prev, od: { ...prev.od, esferico: e.target.value } }))}
                />
                <input
                  className="ocr-result-input"
                  value={ocrResult?.oe.esferico}
                  onChange={e => setOcrResult(prev => ({ ...prev, oe: { ...prev.oe, esferico: e.target.value } }))}
                />
              </div>

              <div className="ocr-result-row">
                <div className="ocr-result-eye">Cilíndrico</div>
                <input
                  className="ocr-result-input"
                  value={ocrResult?.od.cilindro}
                  onChange={e => setOcrResult(prev => ({ ...prev, od: { ...prev.od, cilindro: e.target.value } }))}
                />
                <input
                  className="ocr-result-input"
                  value={ocrResult?.oe.cilindro}
                  onChange={e => setOcrResult(prev => ({ ...prev, oe: { ...prev.oe, cilindro: e.target.value } }))}
                />
              </div>

              <div className="ocr-result-row">
                <div className="ocr-result-eye">Eixo</div>
                <input
                  className="ocr-result-input"
                  value={ocrResult?.od.eixo}
                  onChange={e => setOcrResult(prev => ({ ...prev, od: { ...prev.od, eixo: e.target.value } }))}
                />
                <input
                  className="ocr-result-input"
                  value={ocrResult?.oe.eixo}
                  onChange={e => setOcrResult(prev => ({ ...prev, oe: { ...prev.oe, eixo: e.target.value } }))}
                />
              </div>

              <div className="ocr-result-row">
                <div className="ocr-result-eye">Adição</div>
                <input
                  className="ocr-result-input"
                  value={ocrResult?.od.adicao}
                  onChange={e => setOcrResult(prev => ({ ...prev, od: { ...prev.od, adicao: e.target.value } }))}
                />
                <input
                  className="ocr-result-input"
                  value={ocrResult?.oe.adicao}
                  onChange={e => setOcrResult(prev => ({ ...prev, oe: { ...prev.oe, adicao: e.target.value } }))}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={applyOcrResult}>
                <ClipboardCheck size={18} /> Confirmar e Preencher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

