import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Upload, Plus, Trash2, Save, FileText, Eye, 
  ChevronDown, ChevronUp, Copy, AlertCircle, Check, Settings, GripVertical, ArrowLeft
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import {
  saveLente, saveLentesEmLote, getLenteById, getFornecedores, addFornecedor,
  getAntiReflexoLabel, formatCurrency,
  getNiveisARFornecedor, getNiveisARByFornecedor,
  saveNiveisARFornecedor, deleteNiveisARFornecedor
} from '../services/dataStore'
import { extractPDFStructured } from '../services/pdfParser'

// AR levels predefinidos por marca conhecida
const AR_PREDEFINIDOS = {
  Zeiss: [
    { key: 'duravision_platinum', label: 'Duravision Platinum' },
    { key: 'duravision_gold', label: 'Duravision Gold' },
    { key: 'duravision_silver', label: 'Duravision Silver' },
    { key: 'duravision_chrome', label: 'Duravision Chrome' },
    { key: 'sem_ar', label: 'Sem AR' },
  ],
  Essilor: [
    { key: 'crizal_prevencia', label: 'Crizal Prevência' },
    { key: 'crizal_saphire_hr', label: 'Crizal Saphire HR' },
    { key: 'crizal_rock', label: 'Crizal Rock' },
    { key: 'crizal_easy_pro', label: 'Crizal Easy Pro' },
    { key: 'optifog', label: 'Optifog' },
    { key: 'trio_easy_clean', label: 'Trio Easy Clean' },
    { key: 'verniz_hc', label: 'Verniz HC' },
  ],
}

const AR_FALLBACK = [
  { key: 'sem_ar', label: 'Sem AR' },
]

const EMPTY_INDICE = {
  indice: '',
  material: '',
  precos: {}
}

const generateSphereRange = (max = 6.0, min = -8.0) => {
  const range = []
  for (let s = max; s >= min; s -= 0.25) {
    range.push(s.toFixed(2))
  }
  return range
}

// Retorna os níveis de AR para um fornecedor (do config)
function resolveNiveisAR(fornecedor, config = []) {
  if (!fornecedor) return AR_FALLBACK.map(n => n.key)
  const saved = config.find(c => c.fornecedor === fornecedor)
  if (saved) return saved.niveis
  // Tenta predefinido
  const pre = AR_PREDEFINIDOS[fornecedor]
  if (pre) return pre.map(n => n.key)
  return AR_FALLBACK.map(n => n.key)
}

const EMPTY_LENTE = {
  fornecedor: '',
  tipo: 'multifocal',
  nome: '',
  niveisAR: AR_FALLBACK.map(n => n.key),
  indices: [{ ...EMPTY_INDICE }],
  especificacoes: {
    esferico_min: '',
    esferico_max: '',
    cilindro_max: '',
    adicao_min: '',
    adicao_max: '',
    diametro: '',
    prisma: 'Não',
    useGrid: false,
    grid: {},
    fotossensivel: false,
    filtroAzul: false
  }
}

export default function CadastroLentes() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editId = searchParams.get('edit')
  
  const fileInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('manual') // manual | pdf | lote | niveis_ar
  const [fornecedores, setFornecedores] = useState([])
  const [novoFornecedor, setNovoFornecedor] = useState('')
  const [showAddFornecedor, setShowAddFornecedor] = useState(false)

  // Manual form state
  const [lente, setLente] = useState({ ...EMPTY_LENTE })
  const [customAR, setCustomAR] = useState([])
  const [showAddAR, setShowAddAR] = useState(false)
  const [novoAR, setNovoAR] = useState('')

  // PDF state
  const [pdfData, setPdfData] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfFileName, setPdfFileName] = useState('')
  const [selectedRows, setSelectedRows] = useState([])
  const [pdfPage, setPdfPage] = useState(0)

  // Lote (batch) state
  const [loteLentes, setLoteLentes] = useState([createEmptyLoteLente()])
  const [loteFornecedor, setLoteFornecedor] = useState('')
  const [loteTipo, setLoteTipo] = useState('multifocal')
  const [loteNome, setLoteNome] = useState('')
  const [loteARColumns, setLoteARColumns] = useState(AR_FALLBACK.map(n => n.key))

  // Níveis AR por fornecedor state
  const [niveisARConfig, setNiveisARConfig] = useState([])
  const [arEditFornecedor, setArEditFornecedor] = useState('')
  const [arEditNiveis, setArEditNiveis] = useState([])
  const [novoAREdit, setNovoAREdit] = useState('')
  const [novoAREditLabel, setNovoAREditLabel] = useState('')
  const [gridRowIndex, setGridRowIndex] = useState(null)

  useEffect(() => {
    async function loadConfig() {
      const currentFornecedores = await getFornecedores()
      const currentNiveisARConfig = await getNiveisARFornecedor()
      setFornecedores(currentFornecedores)
      setNiveisARConfig(currentNiveisARConfig)

      if (editId) {
        const existing = await getLenteById(editId)
        if (existing) {
          // Map database structure to form structure
          setLente({
            id: existing.id,
            fornecedor: existing.fornecedor,
            tipo: existing.tipo,
            nome: existing.nome,
            niveisAR: Object.keys(existing.precos || {}),
            indices: [{
              indice: existing.indice,
              material: existing.material || '',
              precos: existing.precos || {}
            }],
            especificacoes: {
              esferico_min: existing.especificacoes?.esferico_min ?? '',
              esferico_max: existing.especificacoes?.esferico_max ?? '',
              cilindro_max: existing.especificacoes?.cilindro_max ?? '',
              adicao_min: existing.especificacoes?.adicao_min ?? '',
              adicao_max: existing.especificacoes?.adicao_max ?? '',
              diametro: existing.especificacoes?.diametro ?? '',
              prisma: existing.especificacoes?.prisma || 'Não',
              useGrid: existing.especificacoes?.useGrid || false,
              grid: existing.especificacoes?.grid || {},
              fotossensivel: existing.especificacoes?.fotossensivel || false,
              filtroAzul: existing.especificacoes?.filtroAzul || false
            }
          })
          setActiveTab('manual')
        }
      }
    }
    loadConfig()
  }, [editId])

  // ========== AR Levels Management ==========
  const getAllARLevels = () => {
    const base = resolveNiveisAR(lente.fornecedor, niveisARConfig)
    return [...new Set([...base, ...customAR])]
  }

  const getARLabel = (key) => {
    return getAntiReflexoLabel(key)
  }

  // Quando o fornecedor muda no manual form, auto-carrega os níveis de AR
  const handleFornecedorChange = (value) => {
    const niveis = resolveNiveisAR(value, niveisARConfig)
    setLente(prev => ({
      ...prev,
      fornecedor: value,
      niveisAR: niveis,
    }))
    setCustomAR([])
  }

  // Quando o fornecedor muda no lote, auto-carrega
  const handleLoteFornecedorChange = (value) => {
    const niveis = resolveNiveisAR(value, niveisARConfig)
    setLoteFornecedor(value)
    setLoteARColumns(niveis)
  }


  const handleAddAR = () => {
    if (novoAR.trim()) {
      const key = novoAR.trim().toLowerCase().replace(/\s+/g, '_')
      if (!getAllARLevels().includes(key)) {
        setCustomAR(prev => [...prev, key])
        setLente(prev => ({
          ...prev,
          niveisAR: [...prev.niveisAR, key]
        }))
      }
      setNovoAR('')
      setShowAddAR(false)
    }
  }

  const toggleAR = (arKey) => {
    setLente(prev => ({
      ...prev,
      niveisAR: prev.niveisAR.includes(arKey)
        ? prev.niveisAR.filter(k => k !== arKey)
        : [...prev.niveisAR, arKey]
    }))
  }

  // ========== Manual Form Handlers ==========
  const handleLenteChange = (field, value) => {
    setLente(prev => ({ ...prev, [field]: value }))
  }

  const handleSpecChange = (field, value) => {
    setLente(prev => ({
      ...prev,
      especificacoes: { ...prev.especificacoes, [field]: value }
    }))
  }

  const addIndice = () => {
    setLente(prev => ({
      ...prev,
      indices: [...prev.indices, { ...EMPTY_INDICE }]
    }))
  }

  const removeIndice = (index) => {
    setLente(prev => ({
      ...prev,
      indices: prev.indices.filter((_, i) => i !== index)
    }))
  }

  const handleIndiceChange = (index, field, value) => {
    setLente(prev => {
      const newIndices = [...prev.indices]
      newIndices[index] = { ...newIndices[index], [field]: value }
      return { ...prev, indices: newIndices }
    })
  }

  const handlePrecoChange = (indiceIndex, arKey, value) => {
    setLente(prev => {
      const newIndices = [...prev.indices]
      newIndices[indiceIndex] = {
        ...newIndices[indiceIndex],
        precos: {
          ...newIndices[indiceIndex].precos,
          [arKey]: value
        }
      }
      return { ...prev, indices: newIndices }
    })
  }

  const handleAddFornecedor = async () => {
    if (novoFornecedor.trim()) {
      const updated = await addFornecedor(novoFornecedor.trim())
      setFornecedores(updated)
      handleFornecedorChange(novoFornecedor.trim())
      setNovoFornecedor('')
      setShowAddFornecedor(false)
    }
  }

  const handleSaveManual = async () => {
    if (!lente.fornecedor) {
      toast.error('Selecione um fornecedor')
      return
    }
    if (!lente.nome) {
      toast.error('Informe o nome da lente')
      return
    }

    // Bug Fix: Filter prices to save only the ones currently visible/selected in the AR columns
    const filterPrecos = (precos) => {
      return Object.fromEntries(
        Object.entries(precos)
          .filter(([k, v]) => lente.niveisAR.includes(k) && v && parseFloat(v) > 0)
          .map(([k, v]) => [k, parseFloat(v)])
      )
    }

    if (lente.id) {
      // UPDATE MODE (Single lens update)
      const indice = lente.indices[0]
      const updatedLente = {
        id: lente.id,
        fornecedor: lente.fornecedor,
        tipo: lente.tipo,
        nome: lente.nome,
        indice: indice.indice,
        material: indice.material,
        precos: filterPrecos(indice.precos),
        especificacoes: {
          esferico_min: lente.especificacoes.esferico_min ? parseFloat(lente.especificacoes.esferico_min) : null,
          esferico_max: lente.especificacoes.esferico_max ? parseFloat(lente.especificacoes.esferico_max) : null,
          cilindro_max: lente.especificacoes.cilindro_max ? parseFloat(lente.especificacoes.cilindro_max) : null,
          adicao_min: lente.especificacoes.adicao_min ? parseFloat(lente.especificacoes.adicao_min) : null,
          adicao_max: lente.especificacoes.adicao_max ? parseFloat(lente.especificacoes.adicao_max) : null,
          diametro: lente.especificacoes.diametro ? parseInt(lente.especificacoes.diametro) : null,
          prisma: lente.especificacoes.prisma,
          useGrid: lente.especificacoes.useGrid || false,
          grid: lente.especificacoes.grid || {},
          fotossensivel: lente.especificacoes.fotossensivel,
          filtroAzul: lente.especificacoes.filtroAzul
        }
      }
      await saveLente(updatedLente)
      toast.success('Lente atualizada com sucesso!')
      navigate('/catalogo')
    } else {
      // CREATE MODE (Batch save indices as separate lenses)
      const lentesParaSalvar = lente.indices.map(indice => ({
        fornecedor: lente.fornecedor,
        tipo: lente.tipo,
        nome: lente.nome,
        indice: indice.indice,
        material: indice.material,
        precos: filterPrecos(indice.precos),
        especificacoes: {
          esferico_min: lente.especificacoes.esferico_min ? parseFloat(lente.especificacoes.esferico_min) : null,
          esferico_max: lente.especificacoes.esferico_max ? parseFloat(lente.especificacoes.esferico_max) : null,
          cilindro_max: lente.especificacoes.cilindro_max ? parseFloat(lente.especificacoes.cilindro_max) : null,
          adicao_min: lente.especificacoes.adicao_min ? parseFloat(lente.especificacoes.adicao_min) : null,
          adicao_max: lente.especificacoes.adicao_max ? parseFloat(lente.especificacoes.adicao_max) : null,
          diametro: lente.especificacoes.diametro ? parseInt(lente.especificacoes.diametro) : null,
          prisma: lente.especificacoes.prisma,
          useGrid: lente.especificacoes.useGrid || false,
          grid: lente.especificacoes.grid || {},
          fotossensivel: lente.especificacoes.fotossensivel,
          filtroAzul: lente.especificacoes.filtroAzul
        }
      }))

      await saveLentesEmLote(lentesParaSalvar)
      toast.success(`${lentesParaSalvar.length} lente(s) cadastrada(s) com sucesso!`)
      setLente({ ...EMPTY_LENTE })
    }
  }

  // ========== PDF Handlers ==========
  const handlePDFUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast.error('Por favor, selecione um arquivo PDF')
      return
    }

    setPdfLoading(true)
    setPdfFileName(file.name)

    try {
      const data = await extractPDFStructured(file)
      setPdfData(data)
      setPdfPage(0)
      setSelectedRows([])
      toast.success(`PDF carregado! ${data.numPages} página(s) encontrada(s)`)
    } catch (err) {
      console.error('Error parsing PDF:', err)
      toast.error('Erro ao processar o PDF: ' + err.message)
    } finally {
      setPdfLoading(false)
    }
  }

  const toggleRowSelection = (pageIdx, rowIdx) => {
    const key = `${pageIdx}-${rowIdx}`
    setSelectedRows(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const getSelectedRowsData = () => {
    if (!pdfData) return []
    return selectedRows.map(key => {
      const [pageIdx, rowIdx] = key.split('-').map(Number)
      return pdfData.pages[pageIdx]?.rows[rowIdx]
    }).filter(Boolean)
  }

  const copyRowToLote = () => {
    const rows = getSelectedRowsData()
    if (rows.length === 0) {
      toast.error('Selecione linhas do PDF para copiar')
      return
    }

    // Transfer selected rows to batch mode for editing
    const newLoteLentes = rows.map(row => {
      const cells = row.cells || []
      return {
        indice: findIndexValue(cells) || '',
        material: '',
        precos: {},
        esferico_min: '',
        esferico_max: '',
        cilindro_max: '',
        adicao_min: '',
        adicao_max: '',
        diametro: '',
        prisma: 'Não',
        useGrid: false,
        grid: {},
        fotossensivel: false,
        filtroAzul: false,
        rawText: row.text || cells.join(' | '),
      }
    })

    setLoteLentes(newLoteLentes)
    setActiveTab('lote')
    toast.info(`${rows.length} linha(s) copiada(s) para edição em lote`)
  }

  // ========== Batch (Lote) Handlers ==========
  function createEmptyLoteLente() {
    return {
      indice: '',
      material: '',
      precos: {},
      esferico_min: '',
      esferico_max: '',
      cilindro_max: '',
      adicao_min: '',
      adicao_max: '',
      diametro: '',
      prisma: 'Não',
      useGrid: false,
      grid: {},
      fotossensivel: false,
      filtroAzul: false,
      rawText: '',
    }
  }

  const addLoteRow = () => {
    setLoteLentes(prev => [...prev, createEmptyLoteLente()])
  }

  const removeLoteRow = (index) => {
    setLoteLentes(prev => prev.filter((_, i) => i !== index))
  }

  const handleLoteChange = (index, field, value) => {
    setLoteLentes(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleLotePrecoChange = (index, arKey, value) => {
    setLoteLentes(prev => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        precos: { ...updated[index].precos, [arKey]: value }
      }
      return updated
    })
  }

  const handleToggleLoteAR = (arKey) => {
    setLoteARColumns(prev =>
      prev.includes(arKey)
        ? prev.filter(k => k !== arKey)
        : [...prev, arKey]
    )
  }

  const handleSaveLote = async () => {
    if (!loteFornecedor) {
      toast.error('Selecione um fornecedor')
      return
    }
    if (!loteNome) {
      toast.error('Informe o nome da lente')
      return
    }

    const lentesParaSalvar = loteLentes
      .filter(l => l.indice)
      .map(l => ({
        fornecedor: loteFornecedor,
        tipo: loteTipo,
        nome: loteNome,
        indice: l.indice,
        material: l.material,
        precos: Object.fromEntries(
          Object.entries(l.precos)
            .filter(([_, v]) => v && parseFloat(v) > 0)
            .map(([k, v]) => [k, parseFloat(v)])
        ),
        especificacoes: {
          esferico_min: l.esferico_min ? parseFloat(l.esferico_min) : null,
          esferico_max: l.esferico_max ? parseFloat(l.esferico_max) : null,
          cilindro_max: l.cilindro_max ? parseFloat(l.cilindro_max) : null,
          adicao_min: l.adicao_min ? parseFloat(l.adicao_min) : null,
          adicao_max: l.adicao_max ? parseFloat(l.adicao_max) : null,
          diametro: l.diametro ? parseInt(l.diametro) : null,
          prisma: l.prisma,
          useGrid: l.useGrid || false,
          grid: l.grid || {},
          fotossensivel: l.fotossensivel,
          filtroAzul: l.filtroAzul
        }
      }))

    if (lentesParaSalvar.length === 0) {
      toast.error('Nenhuma lente com índice preenchido para salvar')
      return
    }

    await saveLentesEmLote(lentesParaSalvar)
    toast.success(`${lentesParaSalvar.length} lente(s) cadastrada(s) com sucesso!`)
    setLoteLentes([createEmptyLoteLente()])
    setLoteNome('')
  }

  // ========== Níveis AR por Fornecedor Handlers ==========
  const handleSelectAREdit = (fornecedor) => {
    setArEditFornecedor(fornecedor)
    const saved = niveisARConfig.find(c => c.fornecedor === fornecedor)
    if (saved) {
      setArEditNiveis(saved.niveis.map(key => ({ key, label: getAntiReflexoLabel(key) })))
    } else if (AR_PREDEFINIDOS[fornecedor]) {
      setArEditNiveis([...AR_PREDEFINIDOS[fornecedor]])
    } else {
      setArEditNiveis([])
    }
    setNovoAREdit('')
    setNovoAREditLabel('')
  }

  const handleAddAREdit = () => {
    const rawLabel = novoAREditLabel.trim() || novoAREdit.trim()
    const key = novoAREdit.trim().toLowerCase().replace(/\s+/g, '_')
    if (!key) return
    if (arEditNiveis.find(n => n.key === key)) {
      toast.error('Esse AR já existe na lista')
      return
    }
    setArEditNiveis(prev => [...prev, { key, label: rawLabel }])
    setNovoAREdit('')
    setNovoAREditLabel('')
  }

  const handleRemoveAREdit = (key) => {
    setArEditNiveis(prev => prev.filter(n => n.key !== key))
  }

  const handleMoveAREdit = (idx, dir) => {
    setArEditNiveis(prev => {
      const arr = [...prev]
      const target = idx + dir
      if (target < 0 || target >= arr.length) return arr
      ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
      return arr
    })
  }

  const handleSaveAREdit = async () => {
    if (!arEditFornecedor) {
      toast.error('Selecione um fornecedor')
      return
    }
    if (arEditNiveis.length === 0) {
      toast.error('Adicione pelo menos um nível de AR')
      return
    }
    await saveNiveisARFornecedor(arEditFornecedor, arEditNiveis.map(n => n.key))
    setNiveisARConfig(await getNiveisARFornecedor())
    toast.success(`Níveis de AR da ${arEditFornecedor} salvos com sucesso!`)
  }

  const handleDeleteARConfig = async (fornecedor) => {
    await deleteNiveisARFornecedor(fornecedor)
    setNiveisARConfig(await getNiveisARFornecedor())
    if (arEditFornecedor === fornecedor) {
      setArEditFornecedor('')
      setArEditNiveis([])
    }
    toast.success(`Configuração da ${fornecedor} removida`)
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Cadastro de Lentes</h1>
        <p>Cadastre lentes manualmente, importe de PDF ou cadastre em lote</p>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
        >
          ✏️ Manual
        </button>
        <button
          className={`tab ${activeTab === 'pdf' ? 'active' : ''}`}
          onClick={() => setActiveTab('pdf')}
        >
          📄 Importar PDF
        </button>
        <button
          className={`tab ${activeTab === 'lote' ? 'active' : ''}`}
          onClick={() => setActiveTab('lote')}
        >
          📋 Cadastro em Lote
        </button>
        <button
          className={`tab ${activeTab === 'niveis_ar' ? 'active' : ''}`}
          onClick={() => setActiveTab('niveis_ar')}
        >
          <Settings size={14} style={{ marginRight: '6px', display: 'inline' }} />
          Níveis de AR
        </button>
      </div>

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <ManualForm
          lente={lente}
          fornecedores={fornecedores}
          showAddFornecedor={showAddFornecedor}
          novoFornecedor={novoFornecedor}
          showAddAR={showAddAR}
          novoAR={novoAR}
          customAR={customAR}
          onLenteChange={handleLenteChange}
          onFornecedorChange={handleFornecedorChange}
          onSpecChange={handleSpecChange}
          onAddIndice={addIndice}
          onRemoveIndice={removeIndice}
          onIndiceChange={handleIndiceChange}
          onPrecoChange={handlePrecoChange}
          onToggleAR={toggleAR}
          onSetShowAddFornecedor={setShowAddFornecedor}
          onSetNovoFornecedor={setNovoFornecedor}
          onAddFornecedor={handleAddFornecedor}
          onSetShowAddAR={setShowAddAR}
          onSetNovoAR={setNovoAR}
          onAddAR={handleAddAR}
          onSave={handleSaveManual}
          getAllARLevels={getAllARLevels}
          getARLabel={getARLabel}
        />
      )}

      {/* PDF Tab */}
      {activeTab === 'pdf' && (
        <PDFImport
          fileInputRef={fileInputRef}
          pdfData={pdfData}
          pdfLoading={pdfLoading}
          pdfFileName={pdfFileName}
          pdfPage={pdfPage}
          selectedRows={selectedRows}
          onUpload={handlePDFUpload}
          onPageChange={setPdfPage}
          onToggleRow={toggleRowSelection}
          onCopyToLote={copyRowToLote}
        />
      )}

      {/* Lote Tab */}
      {activeTab === 'lote' && (
        <LoteForm
          loteLentes={loteLentes}
          loteFornecedor={loteFornecedor}
          loteTipo={loteTipo}
          loteNome={loteNome}
          loteARColumns={loteARColumns}
          fornecedores={fornecedores}
          gridRowIndex={gridRowIndex}
          setGridRowIndex={setGridRowIndex}
          onLoteChange={handleLoteChange}
          onLotePrecoChange={handleLotePrecoChange}
          onSetLoteFornecedor={handleLoteFornecedorChange}
          onSetLoteTipo={setLoteTipo}
          onSetLoteNome={setLoteNome}
          onToggleLoteAR={handleToggleLoteAR}
          onAddRow={addLoteRow}
          onRemoveRow={removeLoteRow}
          onSave={handleSaveLote}
          getARLabel={getARLabel}
          getAllARLevels={() => resolveNiveisAR(loteFornecedor, niveisARConfig)}
        />
      )}

      {/* Níveis AR Tab */}
      {activeTab === 'niveis_ar' && (
        <NiveisARForm
          fornecedores={fornecedores}
          niveisARConfig={niveisARConfig}
          arEditFornecedor={arEditFornecedor}
          arEditNiveis={arEditNiveis}
          novoAREdit={novoAREdit}
          novoAREditLabel={novoAREditLabel}
          onSelectFornecedor={handleSelectAREdit}
          onAddAR={handleAddAREdit}
          onRemoveAR={handleRemoveAREdit}
          onMoveAR={handleMoveAREdit}
          onSave={handleSaveAREdit}
          onDelete={handleDeleteARConfig}
          onSetNovoAREdit={setNovoAREdit}
          onSetNovoAREditLabel={setNovoAREditLabel}
          getARLabel={getARLabel}
        />
      )}
    </div>
  )
}

// ========== MANUAL FORM COMPONENT ==========
function ManualForm({
  lente, fornecedores, showAddFornecedor, novoFornecedor,
  showAddAR, novoAR, customAR,
  onLenteChange, onFornecedorChange, onSpecChange, onAddIndice, onRemoveIndice,
  onIndiceChange, onPrecoChange, onToggleAR,
  onSetShowAddFornecedor, onSetNovoFornecedor, onAddFornecedor,
  onSetShowAddAR, onSetNovoAR, onAddAR,
  onSave, getAllARLevels, getARLabel
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">
          {lente.id ? '✏️ Editar Lente' : '📝 Cadastro Manual de Lente'}
        </h3>
        {lente.id && (
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/catalogo')}>
            <ArrowLeft size={14} /> Voltar ao Catálogo
          </button>
        )}
      </div>

      {/* Basic Info */}
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>
        <div className="form-group">
          <label className="form-label">Fornecedor</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              className="form-select"
              value={lente.fornecedor}
              onChange={e => onFornecedorChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {fornecedores.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => onSetShowAddFornecedor(!showAddFornecedor)}
              title="Novo fornecedor"
            >
              <Plus size={16} />
            </button>
          </div>
          {showAddFornecedor && (
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                className="form-input"
                placeholder="Nome do fornecedor"
                value={novoFornecedor}
                onChange={e => onSetNovoFornecedor(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onAddFornecedor()}
              />
              <button className="btn btn-primary btn-sm" onClick={onAddFornecedor}>
                <Check size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            value={lente.tipo}
            onChange={e => onLenteChange('tipo', e.target.value)}
          >
            <option value="multifocal">Multifocal</option>
            <option value="visao_simples">Visão Simples</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Nome da Lente</label>
          <input
            className="form-input"
            placeholder="Ex: Progressive Individual 2"
            value={lente.nome}
            onChange={e => onLenteChange('nome', e.target.value)}
          />
        </div>
      </div>

      {/* Características Extras */}
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '-10px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="fotossensivel"
            checked={lente.especificacoes.fotossensivel}
            onChange={e => onSpecChange('fotossensivel', e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="fotossensivel" style={{ fontWeight: 500, cursor: 'pointer' }}>
            Lente Fotossensível (Transitions / Photocromática)
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox" 
            id="filtroAzul"
            checked={lente.especificacoes.filtroAzul}
            onChange={e => onSpecChange('filtroAzul', e.target.checked)}
            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
          />
          <label htmlFor="filtroAzul" style={{ fontWeight: 500, cursor: 'pointer' }}>
            Tem Filtro de Luz Azul
          </label>
        </div>
      </div>

      <div className="divider" />

      {/* AR Levels Selection */}
      <div className="form-group">
        <label className="form-label">Níveis de Antirreflexo (colunas de preço)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {getAllARLevels().map(arKey => (
            <button
              key={arKey}
              className={`chip ${lente.niveisAR.includes(arKey) ? '' : ''}`}
              style={{
                background: lente.niveisAR.includes(arKey)
                  ? 'var(--accent-primary-bg)'
                  : 'var(--bg-glass)',
                borderColor: lente.niveisAR.includes(arKey)
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'var(--border-color)',
                color: lente.niveisAR.includes(arKey)
                  ? 'var(--accent-primary-hover)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onClick={() => onToggleAR(arKey)}
            >
              {lente.niveisAR.includes(arKey) ? '✓ ' : ''}{getARLabel(arKey)}
            </button>
          ))}
          <button
            className="chip"
            style={{ cursor: 'pointer', borderStyle: 'dashed' }}
            onClick={() => onSetShowAddAR(!showAddAR)}
          >
            <Plus size={14} /> Novo AR
          </button>
        </div>
        {showAddAR && (
          <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
            <input
              className="form-input"
              placeholder="Nome do antirreflexo"
              value={novoAR}
              onChange={e => onSetNovoAR(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onAddAR()}
            />
            <button className="btn btn-primary btn-sm" onClick={onAddAR}>
              Adicionar
            </button>
          </div>
        )}
      </div>

      <div className="divider" />

      {/* Indices & Prices Table */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Índices e Preços</label>
          <button className="btn btn-secondary btn-sm" onClick={onAddIndice}>
            <Plus size={14} /> Adicionar Índice
          </button>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ minWidth: '80px' }}>Índice</th>
                <th style={{ minWidth: '120px' }}>Material</th>
                {lente.niveisAR.map(ar => (
                  <th key={ar} style={{ minWidth: '130px' }}>{getARLabel(ar)}</th>
                ))}
                <th style={{ width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {lente.indices.map((indice, idx) => (
                <tr key={idx}>
                  <td>
                    <input
                      className="form-input"
                      placeholder="1.50"
                      value={indice.indice}
                      onChange={e => onIndiceChange(idx, 'indice', e.target.value)}
                      style={{ minWidth: '70px' }}
                    />
                  </td>
                  <td>
                    <input
                      className="form-input"
                      placeholder="Orma"
                      value={indice.material}
                      onChange={e => onIndiceChange(idx, 'material', e.target.value)}
                      style={{ minWidth: '100px' }}
                    />
                  </td>
                  {lente.niveisAR.map(ar => (
                    <td key={ar}>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={indice.precos[ar] || ''}
                        onChange={e => onPrecoChange(idx, ar, e.target.value)}
                        style={{ minWidth: '100px' }}
                      />
                    </td>
                  ))}
                  <td>
                    {lente.indices.length > 1 && (
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => onRemoveIndice(idx)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="divider" />

      {/* Specifications */}
      <div className="form-group">
        <label className="form-label">Especificações Técnicas</label>
        <div className="form-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Esférico Mín</label>
            <input
              className="form-input"
              type="number"
              step="0.25"
              placeholder="-10.00"
              value={lente.especificacoes.esferico_min}
              onChange={e => onSpecChange('esferico_min', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Esférico Máx</label>
            <input
              className="form-input"
              type="number"
              step="0.25"
              placeholder="+6.00"
              value={lente.especificacoes.esferico_max}
              onChange={e => onSpecChange('esferico_max', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Cilindro Máx</label>
            <input
              className="form-input"
              type="number"
              step="0.25"
              placeholder="-4.00"
              value={lente.especificacoes.cilindro_max}
              onChange={e => onSpecChange('cilindro_max', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '11px' }}>Diâmetro (Ø)</label>
            <input
              className="form-input"
              type="number"
              placeholder="70"
              value={lente.especificacoes.diametro}
              onChange={e => onSpecChange('diametro', e.target.value)}
            />
          </div>
        </div>

        {lente.tipo === 'multifocal' && (
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Adição Mín</label>
              <input
                className="form-input"
                type="number"
                step="0.25"
                placeholder="0.75"
                value={lente.especificacoes.adicao_min}
                onChange={e => onSpecChange('adicao_min', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Adição Máx</label>
              <input
                className="form-input"
                type="number"
                step="0.25"
                placeholder="3.50"
                value={lente.especificacoes.adicao_max}
                onChange={e => onSpecChange('adicao_max', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '11px' }}>Prisma</label>
              <select
                className="form-select"
                value={lente.especificacoes.prisma}
                onChange={e => onSpecChange('prisma', e.target.value)}
              >
                <option value="Não">Não</option>
                <option value="Sim">Sim</option>
              </select>
            </div>
          </div>
        )}
        {lente.tipo === 'visao_simples' && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <input 
                type="checkbox" 
                id="useGrid"
                checked={lente.especificacoes.useGrid}
                onChange={e => onSpecChange('useGrid', e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="useGrid" style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--accent-primary-hover)' }}>
                Usar Grade de Disponibilidade Detalhada
              </label>
            </div>
            
            {lente.especificacoes.useGrid && (
              <GridEditor 
                grid={lente.especificacoes.grid || {}} 
                onChange={(newGrid) => onSpecChange('grid', newGrid)}
              />
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button className="btn btn-secondary" onClick={() => onLenteChange('nome', '')}>
          Limpar
        </button>
        <button className="btn btn-primary" onClick={onSave}>
          <Save size={16} /> {lente.id ? 'Atualizar Lente' : 'Salvar Lente'}
        </button>
      </div>
    </div>
  )
}

// ========== PDF IMPORT COMPONENT ==========
function PDFImport({
  fileInputRef, pdfData, pdfLoading, pdfFileName,
  pdfPage, selectedRows,
  onUpload, onPageChange, onToggleRow, onCopyToLote
}) {
  return (
    <div>
      {/* Upload Zone */}
      <div
        className={`upload-zone ${pdfLoading ? 'active' : ''}`}
        onClick={() => fileInputRef.current?.click()}
        style={{ marginBottom: '24px' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={onUpload}
          style={{ display: 'none' }}
        />
        {pdfLoading ? (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
            <h3>Processando PDF...</h3>
            <p>Extraindo dados do catálogo</p>
          </>
        ) : (
          <>
            <div className="upload-zone-icon">📄</div>
            <h3>{pdfFileName || 'Clique para selecionar um arquivo PDF'}</h3>
            <p>Ou arraste e solte o catálogo de lentes aqui</p>
          </>
        )}
      </div>

      {/* PDF Preview */}
      {pdfData && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <FileText size={18} style={{ marginRight: '8px' }} />
              Conteúdo do PDF - {pdfFileName}
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="badge badge-purple">
                {selectedRows.length} linhas selecionadas
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={onCopyToLote}
                disabled={selectedRows.length === 0}
              >
                <Copy size={14} /> Enviar para Edição
              </button>
            </div>
          </div>

          {/* Info alert */}
          <div style={{
            background: 'var(--accent-primary-bg)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--accent-primary-hover)',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Como usar:</strong> Selecione as linhas que contém dados de lentes (índice, preços) 
              clicando nelas. Depois clique em "Enviar para Edição" para ajustar os dados antes de salvar. 
              As linhas do catálogo serão organizadas na aba de Cadastro em Lote.
            </div>
          </div>

          {/* Page Navigation */}
          {pdfData.numPages > 1 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {Array.from({ length: pdfData.numPages }, (_, i) => (
                <button
                  key={i}
                  className={`btn btn-sm ${pdfPage === i ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => onPageChange(i)}
                >
                  Página {i + 1}
                </button>
              ))}
            </div>
          )}

          {/* Rows */}
          <div className="table-container" style={{ maxHeight: '500px', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>✓</th>
                  <th style={{ width: '40px' }}>#</th>
                  <th>Conteúdo da Linha</th>
                </tr>
              </thead>
              <tbody>
                {pdfData.pages[pdfPage]?.rows.map((row, rowIdx) => {
                  const isSelected = selectedRows.includes(`${pdfPage}-${rowIdx}`)
                  return (
                    <tr
                      key={rowIdx}
                      onClick={() => onToggleRow(pdfPage, rowIdx)}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-primary-bg)' : undefined,
                      }}
                    >
                      <td>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '4px',
                          border: isSelected
                            ? '2px solid var(--accent-primary)'
                            : '2px solid var(--border-color)',
                          background: isSelected ? 'var(--accent-primary)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isSelected && <Check size={12} color="white" />}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                        {rowIdx + 1}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        {row.cells.map((cell, ci) => (
                          <span key={ci} style={{
                            marginRight: '12px',
                            padding: '2px 6px',
                            background: 'var(--bg-glass)',
                            borderRadius: '3px',
                            display: 'inline-block',
                            marginBottom: '2px',
                          }}>
                            {cell}
                          </span>
                        ))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== LOTE (BATCH) FORM COMPONENT ==========
function LoteForm({
  loteLentes, loteFornecedor, loteTipo, loteNome, loteARColumns,
  fornecedores, gridRowIndex, setGridRowIndex,
  onLoteChange, onLotePrecoChange,
  onSetLoteFornecedor, onSetLoteTipo, onSetLoteNome,
  onToggleLoteAR, onAddRow, onRemoveRow, onSave,
  getARLabel, getAllARLevels
}) {
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">📋 Cadastro em Lote</h3>
        <button className="btn btn-primary btn-sm" onClick={onAddRow}>
          <Plus size={14} /> Nova Linha
        </button>
      </div>

      {/* Common fields */}
      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 2fr' }}>
        <div className="form-group">
          <label className="form-label">Fornecedor</label>
          <select
            className="form-select"
            value={loteFornecedor}
            onChange={e => onSetLoteFornecedor(e.target.value)}
          >
            <option value="">Selecione...</option>
            {fornecedores.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            value={loteTipo}
            onChange={e => onSetLoteTipo(e.target.value)}
          >
            <option value="multifocal">Multifocal</option>
            <option value="visao_simples">Visão Simples</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nome da Lente</label>
          <input
            className="form-input"
            placeholder="Ex: Progressive Individual 2"
            value={loteNome}
            onChange={e => onSetLoteNome(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row" style={{ marginTop: '-10px', marginBottom: '15px' }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loteLentes.forEach((_, i) => onLoteChange(i, 'fotossensivel', true));
            }}
          >
            🌟 Marcar todas como Fotossensível
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loteLentes.forEach((_, i) => onLoteChange(i, 'filtroAzul', true));
            }}
          >
            🔵 Marcar todas como Filtro Azul
          </button>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              loteLentes.forEach((_, i) => {
                onLoteChange(i, 'fotossensivel', false);
                onLoteChange(i, 'filtroAzul', false);
              });
            }}
          >
            🧹 Limpar Extras
          </button>
        </div>
      </div>

      {/* AR Columns Selection */}
      <div className="form-group">
        <label className="form-label">Colunas de Antirreflexo</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {getAllARLevels().map(arKey => (
            <button
              key={arKey}
              className="chip"
              style={{
                background: loteARColumns.includes(arKey)
                  ? 'var(--accent-primary-bg)'
                  : 'var(--bg-glass)',
                borderColor: loteARColumns.includes(arKey)
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'var(--border-color)',
                color: loteARColumns.includes(arKey)
                  ? 'var(--accent-primary-hover)'
                  : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
              onClick={() => onToggleLoteAR(arKey)}
            >
              {loteARColumns.includes(arKey) ? '✓ ' : ''}{getARLabel(arKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* Raw text display for PDF-imported rows */}
      {loteLentes.some(l => l.rawText) && (
        <div style={{
          background: 'var(--accent-amber-bg)',
          border: '1px solid rgba(245, 158, 11, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '16px',
          fontSize: '13px',
          color: 'var(--accent-amber)',
        }}>
          <strong>📌 Dados importados do PDF:</strong> Ajuste os valores nas colunas abaixo conforme necessário.
        </div>
      )}

      {/* Batch Table */}
      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ minWidth: '70px' }}>Índice</th>
              <th style={{ minWidth: '90px' }}>Material</th>
              {loteARColumns.map(ar => (
                <th key={ar} style={{ minWidth: '110px' }}>{getARLabel(ar)}</th>
              ))}
              <th style={{ minWidth: '80px' }}>Esf. Mín</th>
              <th style={{ minWidth: '80px' }}>Esf. Máx</th>
              <th style={{ minWidth: '80px' }}>Cil. Máx</th>
              {loteTipo === 'multifocal' && (
                <>
                  <th style={{ minWidth: '80px' }}>Ad. Mín</th>
                  <th style={{ minWidth: '80px' }}>Ad. Máx</th>
                </>
              )}
              <th style={{ minWidth: '60px' }}>Ø</th>
              <th style={{ minWidth: '60px' }}>Prisma</th>
              <th style={{ minWidth: '40px' }} title="Fotossensível">F</th>
              <th style={{ minWidth: '40px' }} title="Filtro Azul">LA</th>
              {loteTipo === 'visao_simples' && <th style={{ minWidth: '60px' }}>Grade</th>}
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loteLentes.map((item, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    className="form-input"
                    placeholder="1.50"
                    value={item.indice}
                    onChange={e => onLoteChange(idx, 'indice', e.target.value)}
                    style={{ minWidth: '60px' }}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    placeholder="Orma"
                    value={item.material}
                    onChange={e => onLoteChange(idx, 'material', e.target.value)}
                    style={{ minWidth: '80px' }}
                  />
                </td>
                {loteARColumns.map(ar => (
                  <td key={ar}>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      placeholder="R$"
                      value={item.precos[ar] || ''}
                      onChange={e => onLotePrecoChange(idx, ar, e.target.value)}
                      style={{ minWidth: '90px' }}
                    />
                  </td>
                ))}
                <td>
                  <input
                    className="form-input"
                    type="number"
                    step="0.25"
                    placeholder="-10"
                    value={item.esferico_min}
                    onChange={e => onLoteChange(idx, 'esferico_min', e.target.value)}
                    style={{ minWidth: '70px' }}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    step="0.25"
                    placeholder="+6"
                    value={item.esferico_max}
                    onChange={e => onLoteChange(idx, 'esferico_max', e.target.value)}
                    style={{ minWidth: '70px' }}
                  />
                </td>
                <td>
                  <input
                    className="form-input"
                    type="number"
                    step="0.25"
                    placeholder="-4"
                    value={item.cilindro_max}
                    onChange={e => onLoteChange(idx, 'cilindro_max', e.target.value)}
                    style={{ minWidth: '70px' }}
                  />
                </td>
                {loteTipo === 'multifocal' && (
                  <>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        step="0.25"
                        placeholder="0.75"
                        value={item.adicao_min}
                        onChange={e => onLoteChange(idx, 'adicao_min', e.target.value)}
                        style={{ minWidth: '70px' }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        type="number"
                        step="0.25"
                        placeholder="3.50"
                        value={item.adicao_max}
                        onChange={e => onLoteChange(idx, 'adicao_max', e.target.value)}
                        style={{ minWidth: '70px' }}
                      />
                    </td>
                  </>
                )}
                <td>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="70"
                    value={item.diametro}
                    onChange={e => onLoteChange(idx, 'diametro', e.target.value)}
                    style={{ minWidth: '50px' }}
                  />
                </td>
                <td>
                  <select
                    className="form-select"
                    value={item.prisma}
                    onChange={e => onLoteChange(idx, 'prisma', e.target.value)}
                    style={{ minWidth: '55px', padding: '10px 8px' }}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </td>
                <td>
                  <input 
                    type="checkbox"
                    checked={item.fotossensivel}
                    onChange={e => onLoteChange(idx, 'fotossensivel', e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                </td>
                <td>
                  <input 
                    type="checkbox"
                    checked={item.filtroAzul}
                    onChange={e => onLoteChange(idx, 'filtroAzul', e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                </td>
                {loteTipo === 'visao_simples' && (
                  <td>
                    <button 
                      className={`btn btn-sm btn-icon ${item.useGrid ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setGridRowIndex(idx)}
                      title="Configurar Grade"
                    >
                      <Settings size={14} />
                    </button>
                  </td>
                )}
                <td>
                  {loteLentes.length > 1 && (
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => onRemoveRow(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Raw text from PDF */}
      {loteLentes.some(l => l.rawText) && (
        <div style={{ marginTop: '16px' }}>
          <label className="form-label">Texto original do PDF (referência)</label>
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            maxHeight: '200px',
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}>
            {loteLentes.filter(l => l.rawText).map((l, i) => (
              <div key={i} style={{ marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{i + 1}.</span> {l.rawText}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
        <button className="btn btn-primary" onClick={onSave}>
          <Save size={16} /> Salvar Todas as Lentes
        </button>
      </div>

      {/* Grid Modal for Lote */}
      {gridRowIndex !== null && (
        <div className="modal-overlay" onClick={() => setGridRowIndex(null)}>
          <div className="modal modal-md" onClick={e => e.stopPropagation()} style={{ maxWidth: '604px', width: '95%' }}>
            <div className="modal-header">
              <h2>Grade de Disponibilidade: {loteLentes[gridRowIndex].indice}</h2>
              <button className="modal-close" onClick={() => setGridRowIndex(null)}>×</button>
            </div>
            <div style={{ padding: '0 20px 20px' }}>
               <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                 Defina o cilindro máximo e o diâmetro para cada grau esférico desta lente.
               </p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                 <input 
                   type="checkbox" 
                   id="loteUseGrid"
                   checked={loteLentes[gridRowIndex].useGrid}
                   onChange={e => onLoteChange(gridRowIndex, 'useGrid', e.target.checked)}
                   style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                 />
                 <label htmlFor="loteUseGrid" style={{ fontWeight: 600, cursor: 'pointer' }}>
                   Usar Grade nesta lente
                 </label>
               </div>
               {loteLentes[gridRowIndex].useGrid && (
                 <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                   <GridEditor 
                     grid={loteLentes[gridRowIndex].grid || {}}
                     onChange={(newGrid) => onLoteChange(gridRowIndex, 'grid', newGrid)}
                   />
                 </div>
               )}
               <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                 <button className="btn btn-primary" onClick={() => setGridRowIndex(null)}>
                   Pronto
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ========== NÍVEIS AR POR FORNECEDOR COMPONENT ==========
function NiveisARForm({
  fornecedores, niveisARConfig, arEditFornecedor, arEditNiveis,
  novoAREdit, novoAREditLabel,
  onSelectFornecedor, onAddAR, onRemoveAR, onMoveAR, onSave, onDelete,
  onSetNovoAREdit, onSetNovoAREditLabel, getARLabel
}) {
  // Fornecedores que já têm config salva
  const fornecedoresComConfig = niveisARConfig.map(n => n.fornecedor)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', alignItems: 'start' }}>
      
      {/* Left: supplier list */}
      <div className="card" style={{ padding: '0' }}>
        <div className="card-header" style={{ padding: '16px 20px' }}>
          <h3 className="card-title" style={{ fontSize: '14px' }}>⚙️ Fornecedores</h3>
        </div>
        <div style={{ padding: '8px' }}>
          {fornecedores.map(f => {
            const hasConfig = fornecedoresComConfig.includes(f)
            const isEditing = arEditFornecedor === f
            return (
              <div
                key={f}
                onClick={() => onSelectFornecedor(f)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  background: isEditing ? 'var(--accent-primary-bg)' : 'transparent',
                  border: isEditing ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                  marginBottom: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: hasConfig ? 'var(--accent-green)' : 'var(--border-color)',
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '14px',
                    color: isEditing ? 'var(--accent-primary-hover)' : 'var(--text-primary)',
                    fontWeight: isEditing ? '600' : '400',
                  }}>{f}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {hasConfig && (
                    <span style={{
                      fontSize: '10px',
                      background: 'var(--accent-green-bg, rgba(16,185,129,0.1))',
                      color: 'var(--accent-green)',
                      padding: '2px 6px',
                      borderRadius: '10px',
                    }}>
                      {niveisARConfig.find(n => n.fornecedor === f)?.niveis.length} AR
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block', marginRight: '6px' }} />
          Configurado &nbsp;
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border-color)', display: 'inline-block', marginRight: '6px', marginLeft: '8px' }} />
          Padrão
        </div>
      </div>

      {/* Right: editor */}
      <div className="card">
        {!arEditFornecedor ? (
          <div style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
            <h3 style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
              Selecione um fornecedor
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px' }}>
              Clique em um fornecedor à esquerda para configurar seus níveis de antirreflexo
            </p>
          </div>
        ) : (
          <>
            <div className="card-header">
              <div>
                <h3 className="card-title">Níveis de AR — {arEditFornecedor}</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Configure os antirreflexos disponíveis para esta marca. A ordem define a sequência das colunas de preço.
                </p>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onDelete(arEditFornecedor)}
                title="Remover configuração"
              >
                <Trash2 size={14} /> Remover Config
              </button>
            </div>

            <div style={{ padding: '0 0 16px' }}>
              {/* Info about auto-load */}
              <div style={{
                background: 'var(--accent-primary-bg)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 14px',
                marginBottom: '20px',
                fontSize: '13px',
                color: 'var(--accent-primary-hover)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}>
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Ao selecionar <strong>{arEditFornecedor}</strong> no cadastro de lentes, esses níveis de AR 
                  serão preenchidos automaticamente.
                </span>
              </div>

              {/* AR List */}
              {arEditNiveis.length === 0 ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '14px',
                  marginBottom: '16px',
                }}>
                  Nenhum nível de AR adicionado ainda. Use o formulário abaixo para adicionar.
                </div>
              ) : (
                <div style={{ marginBottom: '16px' }}>
                  {arEditNiveis.map((nivel, idx) => (
                    <div
                      key={nivel.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '6px',
                      }}
                    >
                      {/* Order number */}
                      <span style={{
                        width: '24px', height: '24px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary-bg)',
                        color: 'var(--accent-primary-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: '700', flexShrink: 0,
                      }}>
                        {idx + 1}
                      </span>

                      {/* Label */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', fontSize: '14px', color: 'var(--text-primary)' }}>
                          {nivel.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {nivel.key}
                        </div>
                      </div>

                      {/* Move buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => onMoveAR(idx, -1)}
                          disabled={idx === 0}
                          title="Mover para cima"
                          style={{ opacity: idx === 0 ? 0.3 : 1 }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-icon btn-sm"
                          onClick={() => onMoveAR(idx, 1)}
                          disabled={idx === arEditNiveis.length - 1}
                          title="Mover para baixo"
                          style={{ opacity: idx === arEditNiveis.length - 1 ? 0.3 : 1 }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-icon btn-sm"
                          onClick={() => onRemoveAR(nivel.key)}
                          title="Remover"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new AR */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '20px',
              }}>
                <label className="form-label" style={{ marginBottom: '10px' }}>
                  ➕ Adicionar Nível de AR
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Nome de exibição</label>
                    <input
                      className="form-input"
                      placeholder="Ex: Crizal Prevência"
                      value={novoAREditLabel}
                      onChange={e => onSetNovoAREditLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && onAddAR()}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Chave (gerada automático)</label>
                    <input
                      className="form-input"
                      placeholder="crizal_prevencia"
                      value={novoAREdit}
                      onChange={e => onSetNovoAREdit(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && onAddAR()}
                      style={{ fontFamily: 'monospace', fontSize: '13px' }}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={onAddAR} style={{ height: '42px' }}>
                    <Plus size={14} /> Adicionar
                  </button>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Preencha apenas o "Nome de exibição" — a chave será gerada automaticamente. Ou defina ambos manualmente.
                </p>
              </div>

              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={onSave}>
                  <Save size={16} /> Salvar Níveis de AR
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ========== GRID EDITOR COMPONENT ==========
function GridEditor({ grid, onChange }) {
  const [globalCyl, setGlobalCyl] = useState('')
  const [globalDiam, setGlobalDiam] = useState('')
  const [maxSph, setMaxSph] = useState(6.0)
  const [minSph, setMinSph] = useState(-8.0)

  // Auto-detect range from existing grid keys
  useEffect(() => {
    const keys = Object.keys(grid).map(Number)
    if (keys.length > 0) {
      const currentMax = Math.max(...keys)
      const currentMin = Math.min(...keys)
      if (currentMax > maxSph) setMaxSph(currentMax)
      if (currentMin < minSph) setMinSph(currentMin)
    }
  }, [grid])

  const visibleRange = generateSphereRange(maxSph, minSph)

  const handleRowChange = (sph, field, value) => {
    const newGrid = { ...grid }
    if (!newGrid[sph]) newGrid[sph] = { maxCyl: null, diametro: null }
    
    if (field === 'maxCyl') {
      newGrid[sph].maxCyl = (value !== "" && value !== null) ? parseFloat(value) : null
    } else {
      newGrid[sph].diametro = (value !== "" && value !== null) ? parseInt(value) : null
    }
    onChange(newGrid)
  }

  const applyGlobal = () => {
    const newGrid = { ...grid }
    visibleRange.forEach(sph => {
      if (!newGrid[sph]) newGrid[sph] = { maxCyl: null, diametro: null }
      if (globalCyl !== "" && globalCyl !== null) newGrid[sph].maxCyl = parseFloat(globalCyl)
      if (globalDiam !== "" && globalDiam !== null) newGrid[sph].diametro = parseInt(globalDiam)
    })
    onChange(newGrid)
  }

  return (
    <div className="grid-editor" style={{ 
      background: 'var(--bg-glass)', 
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-sm)',
      padding: '16px'
    }}>
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px', 
        padding: '12px', 
        background: 'rgba(99, 102, 241, 0.05)',
        borderRadius: 'var(--radius-xs)',
        alignItems: 'flex-end'
      }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Cil. Máx Global</label>
          <input 
            className="form-input form-input-sm" 
            type="number" 
            step="0.25" 
            value={globalCyl} 
            onChange={e => setGlobalCyl(e.target.value)}
            placeholder="-2.00"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: '11px' }}>Ø Global</label>
          <input 
            className="form-input form-input-sm" 
            type="number" 
            value={globalDiam} 
            onChange={e => setGlobalDiam(e.target.value)}
            placeholder="70"
          />
        </div>
        <button className="btn btn-secondary btn-sm" onClick={applyGlobal} type="button">
          Aplicar em Todos
        </button>
      </div>

      <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table className="table table-sm">
          <thead style={{ position: 'sticky', top: 0, background: 'var(--card-bg)', zIndex: 1 }}>
            <tr>
              <th>SVP (Esférico)</th>
              <th>Cilindro Máximo</th>
              <th>Diâmetro (Ø)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
              <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setMaxSph(prev => prev + 1.0)}
                  type="button"
                  style={{ width: '100%', border: '1px dashed var(--accent-primary)' }}
                >
                  <Plus size={10} style={{ marginRight: '6px' }} /> 
                  Expandir Grade Positiva (+1.00 grau)
                </button>
              </td>
            </tr>
            {visibleRange.map(sph => (
              <tr key={sph}>
                <td style={{ fontWeight: 600 }}>{parseFloat(sph) > 0 ? `+${sph}` : sph}</td>
                <td>
                  <input 
                    className="form-input form-input-sm" 
                    type="number" 
                    step="0.25"
                    placeholder="Mesmo da lente"
                    value={grid[sph]?.maxCyl ?? ''}
                    onChange={e => handleRowChange(sph, 'maxCyl', e.target.value)}
                  />
                </td>
                <td>
                  <input 
                    className="form-input form-input-sm" 
                    type="number" 
                    placeholder="70"
                    value={grid[sph]?.diametro ?? ''}
                    onChange={e => handleRowChange(sph, 'diametro', e.target.value)}
                  />
                </td>
              </tr>
            ))}
            <tr style={{ background: 'rgba(99, 102, 241, 0.05)' }}>
              <td colSpan="3" style={{ padding: '8px', textAlign: 'center' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setMinSph(prev => prev - 1.0)}
                  type="button"
                  style={{ width: '100%', border: '1px dashed var(--accent-primary)' }}
                >
                  <Plus size={10} style={{ marginRight: '6px' }} /> 
                  Expandir Grade Negativa (-1.00 grau)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Helper function
function findIndexValue(cells) {
  for (const cell of cells) {
    const match = cell.match(/\b(1[.,]\d{2})\b/)
    if (match) return match[1].replace(',', '.')
  }
  return ''
}
