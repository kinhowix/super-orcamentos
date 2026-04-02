import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Migracao() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [migrated, setMigrated] = useState(false);

  // Check auth
  useEffect(() => {
    if (currentUser === null) {
      navigate('/login');
    }
  }, [currentUser, navigate]);

  const addLog = (msg) => {
    setLogs(prev => [...prev, msg]);
  };

  const iniciarMigracao = async () => {
    if (!window.confirm("Deseja realmente iniciar a migração dos dados locais para a nuvem?")) {
      return;
    }

    setLoading(true);
    setLogs(["Iniciando migração..."]);

    try {
      // 1. Fornecedores
      const fornecedoresSalvos = localStorage.getItem('ORCAMENTOS_FORNECEDORES');
      if (fornecedoresSalvos) {
        const parsed = JSON.parse(fornecedoresSalvos);
        addLog(`Encontrados ${parsed.length} fornecedores locais.`);
        for (const nome of parsed) {
          await addDoc(collection(db, 'fornecedores'), { nome });
        }
        addLog("Fornecedores migrados com sucesso.");
      } else {
        addLog("Nenhum fornecedor local encontrado.");
      }

      // 2. Níveis AR
      const niveisArSalvos = localStorage.getItem('ORCAMENTOS_NIVEIS_AR');
      if (niveisArSalvos) {
        const parsed = JSON.parse(niveisArSalvos);
        addLog(`Encontrados níveis AR para ${parsed.length} fornecedores.`);
        for (const config of parsed) {
          await addDoc(collection(db, 'niveis_ar_fornecedor'), { 
            fornecedor: config.fornecedor, 
            niveis: config.niveis,
            updatedAt: new Date().toISOString()
          });
        }
        addLog("Níveis AR migrados com sucesso.");
      }

      // 3. Lentes
      const lentesSalvas = localStorage.getItem('ORCAMENTOS_LENTES_V2');
      if (lentesSalvas) {
        let parsed = JSON.parse(lentesSalvas);
        // Em V1 era um objeto agrupado, em V2 é um array. Tratando array:
        if (Array.isArray(parsed)) {
          addLog(`Encontradas ${parsed.length} lentes locais.`);
          for (const lente of parsed) {
            await addDoc(collection(db, 'lentes'), {
              ...lente,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
          addLog("Lentes migradas com sucesso.");
        }
      }

      // 4. Orçamentos
      const orcamentosSalvos = localStorage.getItem('ORCAMENTOS_APP_V2');
      if (orcamentosSalvos) {
        const parsed = JSON.parse(orcamentosSalvos);
        addLog(`Encontrados ${parsed.length} orçamentos.`);
        for (const orc of parsed) {
          await addDoc(collection(db, 'orcamentos'), {
            ...orc,
            updatedAt: new Date().toISOString()
          });
        }
        addLog("Orçamentos migrados com sucesso.");
      }

      addLog("✅ MUGRAÇÃO FINALIZADA COM SUCESSO!");
      setMigrated(true);

    } catch (e) {
      console.error(e);
      addLog(`❌ ERRO: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="card" style={{ padding: '30px' }}>
        <h1 style={{ marginBottom: '10px', color: 'var(--accent-color)' }}>Migração de Dados (Local → Nuvem)</h1>
        <p style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
          Esta ferramenta irá escanear o armazenamento local do seu navegador (onde os dados antigos do Super Orçamentos estavam gravados) 
          e transferi-los para o banco de dados Firebase.
        </p>

        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '4px', marginBottom: '30px', border: '1px solid #ffeeba' }}>
          <strong>Aviso:</strong> Faça esta migração <strong>apenas uma vez</strong>. Se fizer mais de uma vez, os dados serão duplicados no servidor.
        </div>

        <button 
          className="btn btn-primary btn-lg" 
          onClick={iniciarMigracao}
          disabled={loading || migrated}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {loading ? 'Migrando...' : migrated ? 'Migração Concluída' : 'Iniciar Migração para o Firebase'}
        </button>

        {logs.length > 0 && (
          <div style={{ marginTop: '30px', background: '#1e1e2d', color: '#00ffcc', padding: '20px', borderRadius: '8px', fontFamily: 'monospace', maxHeight: '300px', overflowY: 'auto' }}>
            <h3 style={{ color: '#fff', marginBottom: '10px' }}>Log da migração:</h3>
            {logs.map((log, i) => (
              <div key={i} style={{ marginBottom: '5px' }}>{log}</div>
            ))}
          </div>
        )}

        {migrated && (
          <button 
            className="btn btn-secondary" 
            onClick={() => navigate('/dashboard')}
            style={{ marginTop: '20px', width: '100%' }}
          >
            Ir para o Dashboard
          </button>
        )}
      </div>
    </div>
  );
}
