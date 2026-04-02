import React from 'react';
import { Link } from 'react-router-dom';
import { Glasses, Search, FileText, CheckCircle } from 'lucide-react';
import '../styles/Landing.css';

export default function Landing() {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-logo">
          SO <span>Óticas</span>
        </div>
        <nav className="landing-nav">
          <a href="#recursos" className="nav-link">Recursos</a>
          <a href="#sobre" className="nav-link">Sobre o Sistema</a>
          <Link to="/login" className="btn-login">Acesso Restrito</Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1>A gestão ideal para orçamentos ópticos</h1>
            <p>
              Sistema completo para catalogar lentes, calcular tratamentos e gerar orçamentos rápidos e profissionais para os seus clientes de forma totalmente moderna e responsiva.
            </p>
            <Link to="/login" className="btn-main">
              Acessar o Sistema
            </Link>
          </div>
          <div className="hero-visual">
            <div className="glass-card">
              <div className="glass-card-icon">
                <Glasses size={80} strokeWidth={1} />
              </div>
              <div className="glass-card-lines">
                <div className="gl-line w-3-4"></div>
                <div className="gl-line w-1-2"></div>
                <div className="gl-line w-full"></div>
              </div>
              <div className="glass-card-bottom">
                <div className="gl-circle"></div>
                <div className="gl-box"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="landing-features">
        <div className="features-container">
          <div className="features-header">
            <h2>Principais <span>Recursos</span></h2>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon icon-blue">
                <Search size={32} />
              </div>
              <h3>Catálogo Inteligente</h3>
              <p>Gerencie todas as marcas, índices e tipos de lentes em um só lugar com extrema facilidade, com importação super flexível e busca instantânea.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon icon-green">
                <FileText size={32} />
              </div>
              <h3>Orçamentos Dinâmicos</h3>
              <p>Crie orçamentos em segundos preenchendo receitas e selecionando lentes dinâmicas com os mais variados níveis de tratamento antirreflexo.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon icon-purple">
                <CheckCircle size={32} />
              </div>
              <h3>Integração com WhatsApp</h3>
              <p>Feche muito mais vendas enviando os detalhes das opções de lentes, condições e tratamentos diretamente via WhatsApp para o cliente.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Super Orçamentos Ópticos. Sistema Restrito para Uso Interno.</p>
      </footer>
    </div>
  );
}
