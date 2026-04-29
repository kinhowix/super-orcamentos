import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import CadastroLentes from './pages/CadastroLentes'
import Catalogo from './pages/Catalogo'
import NovoOrcamento from './pages/NovoOrcamento'
import Orcamentos from './pages/Orcamentos'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Migracao from './pages/Migracao'
import CalculadoraBordas from './pages/CalculadoraBordas'
import CadastroLentesContato from './pages/CadastroLentesContato'
import NovoOrcamentoContato from './pages/NovoOrcamentoContato'
import CatalogoContato from './pages/CatalogoContato'

import { Menu, LogOut } from 'lucide-react'

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (currentUser === undefined) return null; // Wait for initial check
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { logout, currentUser } = useAuth()

  return (
    <div className={`app-layout ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Mobile Header component - Hidden by default in desktop via layout CSS */}
      <div className="mobile-header">
        <div className="flex items-center space-x-2">
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

      <Sidebar 
        mobileOpen={mobileOpen} 
        closeMobile={() => setMobileOpen(false)} 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogout={logout} 
        userEmail={currentUser?.email} 
      />
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="page-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/cadastro-lentes" element={<CadastroLentes />} />
            <Route path="/catalogo" element={<Catalogo />} />
            <Route path="/novo-orcamento" element={<NovoOrcamento />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/migracao" element={<Migracao />} />
            <Route path="/calculadora-bordas" element={<CalculadoraBordas />} />
            <Route path="/cadastro-lentes-contato" element={<CadastroLentesContato />} />
            <Route path="/catalogo-contato" element={<CatalogoContato />} />
            <Route path="/novo-orcamento-contato" element={<NovoOrcamentoContato />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          } />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
