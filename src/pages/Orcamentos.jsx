import { useState, useEffect } from 'react'
import { 
  Search, Trash2, Eye, Send, CheckCircle, Clock, 
  MessageCircle, Filter, X 
} from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import {
  getOrcamentos, deleteOrcamento, saveOrcamento,
  formatCurrency, getAntiReflexoLabel
} from '../services/dataStore'

export default function Orcamentos() {
  const toast = useToast()
  const [orcamentos, setOrcamentos] = useState([])
  const [filtered, setFiltered] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [selectedOrc, setSelectedOrc] = useState(null)

  useEffect(() => {
    loadOrcamentos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orcamentos, searchTerm, filterStatus])

  async function loadOrcamentos() {
    const data = await getOrcamentos();
    const sorted = data.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    )
    setOrcamentos(sorted)
  }

  function applyFilters() {
    let result = [...orcamentos]
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(o =>
        o.cliente?.nome?.toLowerCase().includes(term)
      )
    }
    if (filterStatus) {
      result = result.filter(o => o.status === filterStatus)
    }
    setFiltered(result)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      await deleteOrcamento(id)
      await loadOrcamentos()
      toast.success('Orçamento excluído')
    }
  }

  const handleStatusChange = async (orcamento, newStatus) => {
    await saveOrcamento({ ...orcamento, status: newStatus })
    await loadOrcamentos()
    toast.success(`Status alterado para ${getStatusLabel(newStatus)}`)
  }

  const handleResendWhatsApp = (orc) => {
    let msg = `*🔍 Orçamento de Lentes*\n`
    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*Cliente:* ${orc.cliente?.nome}\n\n`

    orc.itens?.forEach((item, idx) => {
      if (item.lenteName) {
        msg += `*📌 Opção ${idx + 1}:* ${item.lenteName}\n`
        msg += `   Antirreflexo: ${getAntiReflexoLabel(item.antirreflexo)}\n`
        msg += `   Valor: ${formatCurrency(item.preco)}\n\n`
      }
    })

    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*💰 Total: ${formatCurrency(orc.total || 0)}*\n`

    if (orc.observacoes) {
      msg += `\n📝 ${orc.observacoes}\n`
    }

    const phone = orc.cliente?.telefone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
  }

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Orçamentos</h1>
        <p>{orcamentos.length} orçamento(s) registrado(s)</p>
      </div>

      {/* Search & Filters */}
      <div className="actions-bar">
        <div className="actions-left" style={{ flex: 1 }}>
          <div className="search-box" style={{ flex: 1, maxWidth: '400px' }}>
            <Search size={16} className="search-icon" />
            <input
              className="form-input"
              placeholder="Buscar por nome do cliente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="actions-right">
          <div style={{ display: 'flex', gap: '6px' }}>
            {['', 'pendente', 'enviado', 'aprovado'].map(status => (
              <button
                key={status}
                className={`btn btn-sm ${filterStatus === status ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === '' ? 'Todos' : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>Nenhum orçamento encontrado</h3>
            <p>Crie um novo orçamento no menu "Novo Orçamento"</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(orc => (
            <div key={orc.id} className="card" style={{ padding: '16px 24px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-primary-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}>
                    {orc.cliente?.nome?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '16px' }}>
                      {orc.cliente?.nome || 'Sem nome'}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', gap: '12px' }}>
                      <span>{orc.itens?.length || 0} opção(ões)</span>
                      <span>•</span>
                      <span>{new Date(orc.createdAt).toLocaleDateString('pt-BR')}</span>
                      {orc.cliente?.telefone && (
                        <>
                          <span>•</span>
                          <span>{orc.cliente.telefone}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--accent-green)' }}>
                      {formatCurrency(orc.total || 0)}
                    </div>
                    <StatusBadge status={orc.status} />
                  </div>

                  <button
                    className="btn btn-secondary btn-icon btn-sm"
                    onClick={() => setSelectedOrc(orc)}
                    title="Ver detalhes"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    className="btn btn-whatsapp btn-icon btn-sm"
                    onClick={() => handleResendWhatsApp(orc)}
                    title="Enviar WhatsApp"
                    style={{ padding: '0', width: '36px', height: '36px' }}
                  >
                    <MessageCircle size={14} />
                  </button>

                  {orc.status !== 'aprovado' && (
                    <button
                      className="btn btn-success btn-icon btn-sm"
                      onClick={() => handleStatusChange(orc, 'aprovado')}
                      title="Marcar como aprovado"
                      style={{ padding: '0', width: '36px', height: '36px' }}
                    >
                      <CheckCircle size={14} />
                    </button>
                  )}

                  <button
                    className="btn btn-danger btn-icon btn-sm"
                    onClick={() => handleDelete(orc.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedOrc && (
        <div className="modal-overlay" onClick={() => setSelectedOrc(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalhes do Orçamento</h2>
              <button className="modal-close" onClick={() => setSelectedOrc(null)}>×</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '4px' }}>
                    {selectedOrc.cliente?.nome}
                  </h3>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    {selectedOrc.cliente?.telefone || 'Sem telefone'} • 
                    {new Date(selectedOrc.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <StatusBadge status={selectedOrc.status} />
              </div>
            </div>

            <div className="divider" />

            {selectedOrc.itens?.map((item, idx) => (
              <div key={idx} style={{
                padding: '16px',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
                border: '1px solid var(--border-color)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Opção {idx + 1}</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                    {formatCurrency(item.preco || 0)}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  <div>{item.lenteName || 'Lente não selecionada'}</div>
                  {item.antirreflexo && (
                    <div>AR: {getAntiReflexoLabel(item.antirreflexo)}</div>
                  )}
                </div>
              </div>
            ))}

            <div className="divider" />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '20px',
              fontWeight: 700,
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(selectedOrc.total || 0)}
              </span>
            </div>

            {selectedOrc.observacoes && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '14px',
                color: 'var(--text-secondary)',
              }}>
                📝 {selectedOrc.observacoes}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                className="btn btn-whatsapp"
                style={{ flex: 1 }}
                onClick={() => {
                  handleResendWhatsApp(selectedOrc)
                  setSelectedOrc(null)
                }}
              >
                <Send size={16} /> Enviar WhatsApp
              </button>
              {selectedOrc.status !== 'aprovado' && (
                <button
                  className="btn btn-success"
                  style={{ flex: 1 }}
                  onClick={() => {
                    handleStatusChange(selectedOrc, 'aprovado')
                    setSelectedOrc(null)
                  }}
                >
                  <CheckCircle size={16} /> Aprovar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    pendente: { className: 'badge-purple', icon: <Clock size={12} />, label: 'Pendente' },
    enviado: { className: 'badge-amber', icon: <Send size={12} />, label: 'Enviado' },
    aprovado: { className: 'badge-green', icon: <CheckCircle size={12} />, label: 'Aprovado' },
  }
  const c = config[status] || config.pendente
  return (
    <span className={`badge ${c.className}`}>
      {c.icon} {c.label}
    </span>
  )
}

function getStatusLabel(status) {
  return { pendente: 'Pendente', enviado: 'Enviado', aprovado: 'Aprovado' }[status] || status
}
