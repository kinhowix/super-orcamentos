import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Glasses, FileText, TrendingUp, Users,
  PlusCircle, ArrowRight, Clock
} from 'lucide-react'
import { getLentes, getOrcamentos, formatCurrency } from '../services/dataStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const [lentes, setLentes] = useState([])
  const [orcamentos, setOrcamentos] = useState([])

  useEffect(() => {
    async function loadData() {
      const lentesData = await getLentes();
      const orcamentosData = await getOrcamentos();
      setLentes(lentesData);
      setOrcamentos(orcamentosData);
    }
    loadData();
  }, [])

  const totalOrcamentos = orcamentos.length
  const totalLentes = lentes.length
  const valorTotal = orcamentos.reduce((sum, o) => sum + (o.total || 0), 0)
  const orcamentosPendentes = orcamentos.filter(o => o.status === 'pendente').length
  const orcamentosRecentes = [...orcamentos]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  return (
    <div className="animate-in">
      <div style={{ marginTop: '24px' }}></div>

      <div className="stats-grid">


      </div>

      <div className="content-grid">
        {/* Ações Rápidas */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Ações Rápidas</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => navigate('/novo-orcamento')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} /> Novo Orçamento
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => navigate('/cadastro-lentes')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <PlusCircle size={20} /> Cadastrar Lentes
              </span>
              <ArrowRight size={18} />
            </button>
            <button
              className="btn btn-secondary btn-lg"
              style={{ width: '100%', justifyContent: 'space-between' }}
              onClick={() => navigate('/catalogo')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Glasses size={20} /> Ver Catálogo
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Orçamentos Recentes */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Orçamentos Recentes</h3>
            {orcamentos.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/orcamentos')}>
                Ver Todos
              </button>
            )}
          </div>

          {orcamentosRecentes.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 10px' }}>
              <div className="empty-state-icon">📋</div>
              <h3>Nenhum orçamento</h3>
              <p>Comece criando seu primeiro orçamento</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {orcamentosRecentes.map(orc => (
                    <tr key={orc.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/orcamentos')}>
                      <td style={{ fontWeight: 600 }}>{orc.cliente?.nome || 'Sem nome'}</td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(orc.total || 0)}</td>
                      <td>
                        <span className={`badge ${orc.status === 'aprovado' ? 'badge-green' :
                            orc.status === 'enviado' ? 'badge-amber' : 'badge-purple'
                          }`}>
                          {orc.status === 'aprovado' ? 'Aprovado' :
                            orc.status === 'enviado' ? 'Enviado' : 'Pendente'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(orc.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
