import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  PlusCircle,
  Glasses,
  FileText,
  List,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react'

const navItems = [
  {
    section: 'Principal',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ]
  },
  {
    section: 'Lentes',
    items: [
      { path: '/cadastro-lentes', icon: PlusCircle, label: 'Cadastrar Lentes' },
      { path: '/catalogo', icon: Glasses, label: 'Catálogo' },
    ]
  },
  {
    section: 'Orçamentos',
    items: [
      { path: '/novo-orcamento', icon: FileText, label: 'Novo Orçamento' },
      { path: '/orcamentos', icon: List, label: 'Orçamentos' },
    ]
  },
]

import { LogOut } from 'lucide-react'

export default function Sidebar({ mobileOpen, closeMobile, onLogout, userEmail, collapsed, setCollapsed }) {
  const location = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">SO</div>
        {!collapsed && <span className="sidebar-title">Super Orçamentos</span>}
        <button className="mobile-close-btn" onClick={closeMobile}>
          <X size={20} />
        </button>
      </div>

      <button 
        className="sidebar-toggle" 
        onClick={() => setCollapsed(!collapsed)}
        title={collapsed ? 'Expandir' : 'Recolher'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <nav className="sidebar-nav">
        {navItems.map(section => (
          <div key={section.section} className="nav-section">
            {!collapsed && (
              <div className="nav-section-title">{section.section}</div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''}`
                }
                end={item.path === '/dashboard'}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">
                  <item.icon size={20} />
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / Logout */}
      <div className="sidebar-footer mt-auto p-4 border-t border-gray-100">
        {!collapsed && userEmail && (
          <div className="text-xs text-gray-500 mb-2 truncate px-2" title={userEmail}>
            {userEmail}
          </div>
        )}
        <button 
          onClick={onLogout}
          className="nav-item text-red-600 hover:bg-red-50 w-full flex items-center mb-0 mt-0 bg-transparent border-0 cursor-pointer"
          title={collapsed ? 'Sair' : undefined}
        >
          <span className="nav-item-icon text-red-600">
            <LogOut size={20} />
          </span>
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}
