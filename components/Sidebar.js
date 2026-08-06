'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { logout } from '../lib/auth'

const navItems = [
  { name: 'Dashboard', href: '/', icon: '🏨' },
  { name: 'Room Status', href: '/rooms', icon: '🛏️' },
  { name: 'Reservations', href: '/reservations', icon: '📅' },
  { name: 'Front Desk', href: '/frontdesk', icon: '🛎️' },
  { name: 'Guests', href: '/guests', icon: '👤' },
  { name: 'Profiles', href: '/profiles', icon: '🗂️' },
  { name: 'CRM / Loyalty', href: '/crm', icon: '🎁' },
  { name: 'Billing', href: '/billing', icon: '💳' },
  { name: 'Reports', href: '/reports', icon: '📋' },
  { name: 'Housekeeping', href: '/housekeeping', icon: '🧹' },
  { name: 'Maintenance', href: '/maintenance', icon: '🔧' },
  { name: 'Rate Management', href: '/rates', icon: '💲' },
  { name: 'Night Audit', href: '/nightaudit', icon: '🌙' },
  { name: 'Configuration', href: '/configuration', icon: '⚙️' },
  { name: 'Integrations', href: '/integrations', icon: '🔌' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const profile = auth?.profile

  async function handleLogout() {
    await logout()
    router.push('/login')
  }

  return (
    <aside
      style={{
        width: '220px',
        background: '#0f2540',
        color: '#cbd5e1',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        paddingTop: '20px',
        paddingBottom: '90px',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '0 20px 20px 20px', borderBottom: '1px solid #1e3a5f' }}>
        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>Hotel PMS</div>
        <div style={{ fontSize: '11px', color: '#7d97b8' }}>Property Management</div>
      </div>
      <nav style={{ marginTop: '10px' }}>
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <a
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                color: active ? 'white' : '#a8bdd6',
                background: active ? '#1e3a5f' : 'transparent',
                borderLeft: active ? '3px solid #f97316' : '3px solid transparent',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: active ? 'bold' : 'normal',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </a>
          )
        })}
        <button
          onClick={() => window.print()}
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '12px 20px',
            color: '#a8bdd6',
            background: 'transparent',
            border: 'none',
            borderLeft: '3px solid transparent',
            borderTop: '1px solid #1e3a5f',
            marginTop: '10px',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '14px',
            fontFamily: 'inherit',
          }}
        >
          <span>🖨️</span>
          <span>Print This Page</span>
        </button>
      </nav>

      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '220px',
          background: '#0f2540',
          padding: '14px 20px',
          borderTop: '1px solid #1e3a5f',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ color: 'white', fontSize: '13px', marginBottom: '8px' }}>
          {profile?.full_name || 'Staff'}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '8px',
            background: '#1e3a5f',
            color: '#e2e8f0',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
