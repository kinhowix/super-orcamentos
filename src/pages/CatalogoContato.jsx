import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Search, PlusCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { getLentesContato, deleteLenteContato, formatCurrency } from '../services/dataStore';

export default function CatalogoContato() {
  const [lentes, setLentes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadLentes();
  }, []);

  const loadLentes = async () => {
    const data = await getLentesContato();
    // Sort by marca and modelo
    data.sort((a, b) => {
      if (a.marca === b.marca) {
        return (a.modelo || '').localeCompare(b.modelo || '');
      }
      return (a.marca || '').localeCompare(b.marca || '');
    });
    setLentes(data);
  };

  const handleDelete = async (id, modelo) => {
    if (window.confirm(`Tem certeza que deseja excluir a lente "${modelo}"?`)) {
      await deleteLenteContato(id);
      toast.success('Lente excluída com sucesso');
      loadLentes();
    }
  };

  const handleEdit = (id) => {
    navigate(`/cadastro-lentes-contato?edit=${id}`);
  };

  const filteredLentes = lentes.filter(l => 
    l.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.marca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Catálogo de Lentes de Contato</h1>
          <p>Gerencie as lentes de contato cadastradas no sistema.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/cadastro-lentes-contato')}
        >
          <PlusCircle size={20} />
          Nova Lente de Contato
        </button>
      </div>

      <div className="card">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
          <div className="search-bar" style={{ maxWidth: '400px' }}>
            <Search size={20} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Buscar por marca ou modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Desenho</th>
                <th>Descarte</th>
                <th>Limites (Esf)</th>
                <th>Preço (Cx)</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredLentes.map((lente) => (
                <tr key={lente.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{lente.marca}</div>
                  </td>
                  <td>{lente.modelo}</td>
                  <td>
                    <span className="badge badge-purple">{lente.desenho}</span>
                  </td>
                  <td>{lente.descarte}</td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Miopia: {lente.miopia_min || '-0.25'} a {lente.miopia_max || '-12.00'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Hiper: {lente.hiper_min || '+0.25'} a {lente.hiper_max || '+8.00'}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                    {formatCurrency(lente.precoCaixa)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-icon btn-secondary btn-sm"
                        onClick={() => handleEdit(lente.id)}
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn btn-icon btn-danger btn-sm"
                        onClick={() => handleDelete(lente.id, lente.modelo)}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLentes.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Nenhuma lente de contato encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
