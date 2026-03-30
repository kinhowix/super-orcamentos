import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import { ToastProvider } from './contexts/ToastContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import CadastroLentes from './pages/CadastroLentes'
import Catalogo from './pages/Catalogo'
import NovoOrcamento from './pages/NovoOrcamento'
import Orcamentos from './pages/Orcamentos'

export default function App() {
  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
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
