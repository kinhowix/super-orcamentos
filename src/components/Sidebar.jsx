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
} from 'lucide-react'

const navItems = [
  {
    section: 'Principal',
    items: [
      { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
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

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">SO</div>
        {!collapsed && <span className="sidebar-title">Super Orçamentos</span>}
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
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''}`
                }
                end={item.path === '/'}
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
    </aside>
  )
}
