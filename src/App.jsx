import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import CadastroLentes from './pages/CadastroLentes'
import Catalogo from './pages/Catalogo'
import NovoOrcamento from './pages/NovoOrcamento'
import Orcamentos from './pages/Orcamentos'

import { Menu } from 'lucide-react'

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <ToastProvider>
      <div className="app-layout">
        {/* Mobile Header component */}
        <div className="mobile-header">
          <div className="mobile-header-left">
            <div className="sidebar-logo">SO</div>
            <span className="sidebar-title">Super Orçamentos</span>
          </div>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>

        {mobileOpen && (
          <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
        )}

        <Sidebar mobileOpen={mobileOpen} closeMobile={() => setMobileOpen(false)} />
        <main className="main-content">
          <div className="page-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/cadastro-lentes" element={<CadastroLentes />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/novo-orcamento" element={<NovoOrcamento />} />
              <Route path="/orcamentos" element={<Orcamentos />} />
            </Routes>
          </div>
        </main>
      </div>
    </ToastProvider>
  )
}
