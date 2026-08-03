'use client'
import { usePathname } from 'next/navigation'
const navItems = [
  { name: 'Dashboard', href: '/', icon: '🏨' },
  { name: 'Room Status', href: '/rooms', icon: '🛏️' },
  { name: 'Reservations', href: '/reservations', icon: '📅' },
  { name: 'Front Desk', href: '/frontdesk', icon: '🛎️' },
  { name: 'Guests', href: '/guests', icon: '👤' },
  { name: 'Profiles', href: '/profiles', icon: '🗂️' },
  { name: 'Billing', href: '/billing', icon: '💳' },
  { name: 'Reports', href: '/reports', icon: '📋' },
  { name: 'Housekeeping', href: '/housekeeping', icon: '🧹' },
  { name: 'Rate Management', href: '/rates', icon: '💲' },
  { name: 'Night Audit', href: '/nightaudit', icon: '🌙' },
]
export default function Sidebar() {
  const pathname = usePathname()
  return (
    <aside
      style={{
        width: '220px',
        background: '#0f2540',
        color: '#cbd5e1',
        minHeight: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        paddingTop: '20px',
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
      </nav>
    </aside>
  )
}
