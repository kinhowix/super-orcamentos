import { useState, useEffect } from 'react'
import {
  Search, Trash2, Eye, Send, CheckCircle, Clock,
  MessageCircle, Filter, X, FileText, TrendingUp
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
    msg += `*Cliente:* ${orc.cliente?.nome}\n`

    const rec = orc.receita || (orc.itens?.[0]?.olhoDireito ? {
      od: orc.itens[0].olhoDireito,
      oe: orc.itens[0].olhoEsquerdo
    } : null);

    if (rec) {
      msg += `\n*Receita:* \n`
      msg += `OD: ${rec.od?.esferico || '0.00'}/${rec.od?.cilindro || '0.00'} Eixo: ${rec.od?.eixo || '0'}° Add: ${rec.od?.adicao || '0.00'}\n`
      msg += `OE: ${rec.oe?.esferico || '0.00'}/${rec.oe?.cilindro || '0.00'} Eixo: ${rec.oe?.eixo || '0'}° Add: ${rec.oe?.adicao || '0.00'}\n`
    }

    msg += `\n`

    orc.itens?.forEach((item, idx) => {
      if (item.lenteName) {
        msg += `*📌 Opção ${idx + 1}:* ${item.lenteName}\n`
        msg += `   Antirreflexo: ${getAntiReflexoLabel(item.antirreflexo)}\n\n`
      }
    })

    if (orc.armacao && orc.armacao.referencia) {
      msg += `*👓 Armação:* ${orc.armacao.referencia}\n\n`
    }

    msg += `━━━━━━━━━━━━━━━━━━\n`
    msg += `*💰 Total: ${formatCurrency(orc.total || 0)}*\n`

    if (orc.observacoes) {
      msg += `\n📝 ${orc.observacoes}\n`
    }

    const phone = orc.cliente?.telefone?.replace(/\D/g, '') || ''
    const url = phone
      ? `https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`

    window.open(url, '_blank')
  }

  const totalOrcamentos = orcamentos.length
  const valorTotal = orcamentos.reduce((sum, o) => sum + (o.total || 0), 0)
  const orcamentosPendentes = orcamentos.filter(o => o.status === 'pendente').length

  return (
    <div className="animate-in">
      <div className="page-header">
        <h1>Orçamentos</h1>
        <p>{orcamentos.length} orçamento(s) registrado(s)</p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .stats-grid-small {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .stat-card-small {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--bg-card);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
        }
        .stat-icon-small {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justifyContent: center;
        }
        .stat-info-small h3 {
          font-size: 16px;
          margin: 0;
          line-height: 1.2;
        }
        .stat-info-small p {
          font-size: 11px;
          margin: 0;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}} />

      <div className="stats-grid-small">
        <div className="stat-card-small">
          <div className="stat-icon-small green" style={{ background: 'var(--accent-green-bg)', color: 'var(--accent-green)' }}>
            <FileText size={18} />
          </div>
          <div className="stat-info-small">
            <h3>{totalOrcamentos}</h3>
            <p>Gerados</p>
          </div>
        </div>

        <div className="stat-card-small">
          <div className="stat-icon-small amber" style={{ background: 'var(--accent-amber-bg)', color: 'var(--accent-amber)' }}>
            <TrendingUp size={18} />
          </div>
          <div className="stat-info-small">
            <h3>{formatCurrency(valorTotal)}</h3>
            <p>Valor Total</p>
          </div>
        </div>

        <div className="stat-card-small">
          <div className="stat-icon-small purple" style={{ background: 'var(--accent-primary-bg)', color: 'var(--accent-primary-hover)' }}>
            <Clock size={18} />
          </div>
          <div className="stat-info-small">
            <h3>{orcamentosPendentes}</h3>
            <p>Pendentes</p>
          </div>
        </div>
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

                      <span>{new Date(orc.createdAt).toLocaleDateString('pt-BR')}</span>
                      {orc.cliente?.telefone && (
                        <>

                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right', marginRight: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent-green)' }}>
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

            {/* Prescription Display */}
            {(() => {
              const rec = selectedOrc.receita || (selectedOrc.itens?.[0]?.olhoDireito ? {
                od: selectedOrc.itens[0].olhoDireito,
                oe: selectedOrc.itens[0].olhoEsquerdo
              } : null);

              if (!rec) return null;

              return (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    📝 Receita (Graus)
                  </h4>
                  <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>Olho</th>
                          <th style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>Esférico</th>
                          <th style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>Cilíndrico</th>
                          <th style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>Eixo</th>
                          <th style={{ padding: '8px 4px', color: 'var(--text-muted)' }}>Adição</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 4px', fontWeight: 600 }}>OD</td>
                          <td style={{ padding: '8px 4px' }}>{rec.od?.esferico || '0.00'}</td>
                          <td style={{ padding: '8px 4px' }}>{rec.od?.cilindro || '0.00'}</td>
                          <td style={{ padding: '8px 4px' }}>{rec.od?.eixo || '0'}°</td>
                          <td style={{ padding: '8px 4px' }}>{rec.od?.adicao || '0.00'}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 4px', fontWeight: 600 }}>OE</td>
                          <td style={{ padding: '8px 4px' }}>{rec.oe?.esferico || '0.00'}</td>
                          <td style={{ padding: '8px 4px' }}>{rec.oe?.cilindro || '0.00'}</td>
                          <td style={{ padding: '8px 4px' }}>{rec.oe?.eixo || '0'}°</td>
                          <td style={{ padding: '8px 4px' }}>{rec.oe?.adicao || '0.00'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

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

            {selectedOrc.armacao && (selectedOrc.armacao.referencia || selectedOrc.armacao.preco > 0) && (
              <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '12px',
                border: '1px solid var(--border-color)',
                borderLeft: '4px solid var(--accent-primary)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👓 Armação
                  </span>
                  {selectedOrc.armacao.preco > 0 && (
                    <span style={{ fontWeight: 700, color: 'var(--accent-green)' }}>
                      {formatCurrency(selectedOrc.armacao.preco)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {selectedOrc.armacao.referencia || 'Referência não informada'}
                </div>
              </div>
            )}

            <div className="divider" />

            {selectedOrc.desconto > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: 'var(--accent-red)',
                marginBottom: '8px',
                fontWeight: 600
              }}>
                <span>Desconto</span>
                <span>-{formatCurrency(selectedOrc.desconto)}</span>
              </div>
            )}

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
