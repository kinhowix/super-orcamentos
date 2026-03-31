// Data Store using localStorage (can be migrated to Firebase later)
const STORAGE_KEYS = {
  LENTES: 'super_orcamentos_lentes',
  ORCAMENTOS: 'super_orcamentos_orcamentos',
  FORNECEDORES: 'super_orcamentos_fornecedores',
  NIVEIS_AR_FORNECEDOR: 'super_orcamentos_niveis_ar_fornecedor',
}

function getItem(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setItem(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ========== LENTES ==========
export function getLentes() {
  return getItem(STORAGE_KEYS.LENTES)
}

export function getLenteById(id) {
  const lentes = getLentes()
  return lentes.find(l => l.id === id)
}

export function saveLente(lente) {
  const lentes = getLentes()
  if (lente.id) {
    const index = lentes.findIndex(l => l.id === lente.id)
    if (index >= 0) {
      lentes[index] = { ...lente, updatedAt: new Date().toISOString() }
    }
  } else {
    lente.id = generateId()
    lente.createdAt = new Date().toISOString()
    lente.updatedAt = new Date().toISOString()
    lentes.push(lente)
  }
  setItem(STORAGE_KEYS.LENTES, lentes)
  return lente
}

export function saveLentesEmLote(lentesArray) {
  const lentes = getLentes()
  const now = new Date().toISOString()
  const novasLentes = lentesArray.map(l => ({
    ...l,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }))
  setItem(STORAGE_KEYS.LENTES, [...lentes, ...novasLentes])
  return novasLentes
}

export function deleteLente(id) {
  const lentes = getLentes().filter(l => l.id !== id)
  setItem(STORAGE_KEYS.LENTES, lentes)
}

// ========== ORÇAMENTOS ==========
export function getOrcamentos() {
  return getItem(STORAGE_KEYS.ORCAMENTOS)
}

export function getOrcamentoById(id) {
  const orcamentos = getOrcamentos()
  return orcamentos.find(o => o.id === id)
}

export function saveOrcamento(orcamento) {
  const orcamentos = getOrcamentos()
  if (orcamento.id) {
    const index = orcamentos.findIndex(o => o.id === orcamento.id)
    if (index >= 0) {
      orcamentos[index] = { ...orcamento, updatedAt: new Date().toISOString() }
    }
  } else {
    orcamento.id = generateId()
    orcamento.createdAt = new Date().toISOString()
    orcamento.updatedAt = new Date().toISOString()
    orcamentos.push(orcamento)
  }
  setItem(STORAGE_KEYS.ORCAMENTOS, orcamentos)
  return orcamento
}

export function deleteOrcamento(id) {
  const orcamentos = getOrcamentos().filter(o => o.id !== id)
  setItem(STORAGE_KEYS.ORCAMENTOS, orcamentos)
}

// ========== FORNECEDORES ==========
export function getFornecedores() {
  const defaultFornecedores = ['Zeiss', 'Essilor', 'Hoya', 'Tokai', 'Shamir', 'Rodenstock']
  const saved = getItem(STORAGE_KEYS.FORNECEDORES)
  if (saved.length === 0) {
    setItem(STORAGE_KEYS.FORNECEDORES, defaultFornecedores)
    return defaultFornecedores
  }
  return saved
}

export function addFornecedor(nome) {
  const fornecedores = getFornecedores()
  if (!fornecedores.includes(nome)) {
    fornecedores.push(nome)
    setItem(STORAGE_KEYS.FORNECEDORES, fornecedores)
  }
  return fornecedores
}

// ========== NÍVEIS AR POR FORNECEDOR ==========
export function getNiveisARFornecedor() {
  return getItem(STORAGE_KEYS.NIVEIS_AR_FORNECEDOR)
}

export function getNiveisARByFornecedor(fornecedor) {
  const todos = getNiveisARFornecedor()
  return todos.find(n => n.fornecedor === fornecedor) || null
}

export function saveNiveisARFornecedor(fornecedor, niveis) {
  const todos = getNiveisARFornecedor()
  const existingIdx = todos.findIndex(n => n.fornecedor === fornecedor)
  const entry = { fornecedor, niveis, updatedAt: new Date().toISOString() }
  if (existingIdx >= 0) {
    todos[existingIdx] = entry
  } else {
    todos.push(entry)
  }
  setItem(STORAGE_KEYS.NIVEIS_AR_FORNECEDOR, todos)
  return entry
}

export function deleteNiveisARFornecedor(fornecedor) {
  const todos = getNiveisARFornecedor().filter(n => n.fornecedor !== fornecedor)
  setItem(STORAGE_KEYS.NIVEIS_AR_FORNECEDOR, todos)
}

// ========== HELPERS ==========
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function getAntiReflexoLabel(key) {
  const labels = {
    // Zeiss
    'duravision_gold': 'Duravision Gold',
    'duravision_platinum': 'Duravision Platinum',
    'duravision_silver': 'Duravision Silver',
    'duravision_chrome': 'Duravision Chrome',
    // Essilor
    'crizal_prevencia': 'Crizal Prevência',
    'crizal_saphire_hr': 'Crizal Saphire HR',
    'crizal_rock': 'Crizal Rock',
    'crizal_easy_pro': 'Crizal Easy Pro',
    'optifog': 'Optifog',
    'trio_easy_clean': 'Trio Easy Clean',
    'verniz_hc': 'Verniz HC',
    // Genérico
    'sem_ar': 'Sem AR',
    'outro': 'Outro',
  }
  return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const TIPOS_LENTE = [
  { value: 'multifocal', label: 'Multifocal' },
  { value: 'visao_simples', label: 'Visão Simples' },
]

export const NIVEIS_AR = [
  'duravision_gold',
  'duravision_platinum',
  'duravision_silver',
  'duravision_chrome',
  'sem_ar',
]
