import { useState, useEffect } from 'react'
import { Search, Trash2, Edit3, Filter, Glasses, X } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { getLentes, deleteLente, formatCurrency, getAntiReflexoLabel } from '../services/dataStore'

export default function Catalogo() {
  const toast = useToast()
  const [lentes, setLentes] = useState([])
  const [filteredLentes, setFilteredLentes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterFornecedor, setFilterFornecedor] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterIndice, setFilterIndice] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLente, setSelectedLente] = useState(null)

  useEffect(() => {
    loadLentes()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [lentes, searchTerm, filterFornecedor, filterTipo, filterIndice])

  function loadLentes() {
    const data = getLentes()
    setLentes(data)
    setFilteredLentes(data)
  }

  function applyFilters() {
    let result = [...lentes]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(l =>
        l.nome?.toLowerCase().includes(term) ||
        l.fornecedor?.toLowerCase().includes(term) ||
        l.material?.toLowerCase().includes(term)
      )
    }

    if (filterFornecedor) {
      result = result.filter(l => l.fornecedor === filterFornecedor)
    }

    if (filterTipo) {
      result = result.filter(l => l.tipo === filterTipo)
    }

    if (filterIndice) {
      result = result.filter(l => l.indice === filterIndice)
    }

    setFilteredLentes(result)
  }

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta lente?')) {
      deleteLente(id)
      loadLentes()
      toast.success('Lente excluída com sucesso')
    }
  }

  const fornecedores = [...new Set(lentes.map(l => l.fornecedor).filter(Boolean))]
  const indices = [...new Set(lentes.map(l => l.indice).filter(Boolean))].sort()
  const activeFilters = [filterFornecedor, filterTipo, filterIndice].filter(Boolean).length

  // Group lenses by name+fornecedor for display
  const groupedLentes = {}
  filteredLentes.forEach(l => {
    const key = `${l.fornecedor}-${l.nome}-${l.tipo}`
    if (!groupedLentes[key]) {
      groupedLentes[key] = {
        fornecedor: l.fornecedor,
        nome: l.nome,
        tipo: l.tipo,
        lentes: []
      }
    }
    groupedLentes[key].lentes.push(l)
  })

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Catálogo de Lentes</h1>
        <p>{lentes.length} lentes cadastradas</p>
      </div>

      {/* Search & Filters */}
      <div className="actions-bar">
        <div className="actions-left" style={{ flex: 1 }}>
          <div className="search-box" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={16} className="search-icon" />
            <input
              className="form-input"
              placeholder="Buscar por nome, fornecedor ou material..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="actions-right">
          <button
            className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filtros
            {activeFilters > 0 && (
              <span className="badge badge-amber" style={{ marginLeft: '4px' }}>
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '20px', animation: 'slideUp 200ms ease' }}>
          <div className="form-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Fornecedor</label>
              <select
                className="form-select"
                value={filterFornecedor}
                onChange={e => setFilterFornecedor(e.target.value)}
              >
                <option value="">Todos</option>
                {fornecedores.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={filterTipo}
                onChange={e => setFilterTipo(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="multifocal">Multifocal</option>
                <option value="visao_simples">Visão Simples</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Índice</label>
              <select
                className="form-select"
                value={filterIndice}
                onChange={e => setFilterIndice(e.target.value)}
              >
                <option value="">Todos</option>
                {indices.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>
          {activeFilters > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '12px' }}
              onClick={() => {
                setFilterFornecedor('')
                setFilterTipo('')
                setFilterIndice('')
              }}
            >
              <X size={14} /> Limpar Filtros
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {Object.keys(groupedLentes).length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>{lentes.length === 0 ? 'Nenhuma lente cadastrada' : 'Nenhuma lente encontrada'}</h3>
            <p>
              {lentes.length === 0
                ? 'Comece cadastrando lentes no menu "Cadastrar Lentes"'
                : 'Tente alterar os filtros de busca'}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(groupedLentes).map(([key, group]) => (
            <div key={key} className="card">
              <div className="card-header" style={{ marginBottom: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 className="card-title" style={{ fontSize: '18px' }}>{group.nome}</h3>
                    <span className={`badge ${group.tipo === 'multifocal' ? 'badge-purple' : 'badge-cyan'}`}>
                      {group.tipo === 'multifocal' ? 'Multifocal' : 'Visão Simples'}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {group.fornecedor} • {group.lentes.length} variação(ões)
                  </span>
                </div>
              </div>

              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Índice</th>
                      <th>Material</th>
                      {/* Get all AR keys from this group */}
                      {getGroupARKeys(group.lentes).map(ar => (
                        <th key={ar}>{getAntiReflexoLabel(ar)}</th>
                      ))}
                      <th>Esférico</th>
                      <th>Cil. Máx</th>
                      {group.tipo === 'multifocal' && <th>Adição</th>}
                      <th>Ø</th>
                      <th>Prisma</th>
                      <th style={{ width: '80px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lentes
                      .sort((a, b) => parseFloat(a.indice || 0) - parseFloat(b.indice || 0))
                      .map(lente => (
                        <tr key={lente.id}>
                          <td>
                            <span className="badge badge-purple">{lente.indice}</span>
                          </td>
                          <td>{lente.material || '-'}</td>
                          {getGroupARKeys(group.lentes).map(ar => (
                            <td key={ar} style={{ fontWeight: 600 }}>
                              {lente.precos?.[ar]
                                ? formatCurrency(lente.precos[ar])
                                : <span style={{ color: 'var(--text-muted)' }}>-</span>
                              }
                            </td>
                          ))}
                          <td style={{ fontSize: '13px' }}>
                            {formatSpec(lente.especificacoes?.esferico_min, lente.especificacoes?.esferico_max)}
                          </td>
                          <td>{lente.especificacoes?.cilindro_max || '-'}</td>
                          {group.tipo === 'multifocal' && (
                            <td style={{ fontSize: '13px' }}>
                              {formatSpec(lente.especificacoes?.adicao_min, lente.especificacoes?.adicao_max)}
                            </td>
                          )}
                          <td>{lente.especificacoes?.diametro || '-'}</td>
                          <td>{lente.especificacoes?.prisma || '-'}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-icon btn-sm"
                              onClick={() => handleDelete(lente.id)}
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function getGroupARKeys(lentes) {
  const keys = new Set()
  lentes.forEach(l => {
    if (l.precos) {
      Object.keys(l.precos).forEach(k => keys.add(k))
    }
  })
  return Array.from(keys)
}

function formatSpec(min, max) {
  if (min == null && max == null) return '-'
  const minStr = min != null ? (min >= 0 ? `+${min}` : `${min}`) : '?'
  const maxStr = max != null ? (max >= 0 ? `+${max}` : `${max}`) : '?'
  return `${minStr} a ${maxStr}`
}
