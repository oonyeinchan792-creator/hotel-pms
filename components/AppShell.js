'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

export default function AppShell({ children }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'
  const auth = useAuth()

  if (isLoginPage) {
    return <>{children}</>
  }

  const allowed = auth?.allowedModules
  const hasAccess =
    !allowed ||
    allowed.some((m) => m === pathname || (m !== '/' && pathname.startsWith(m)))

  return (
    <>
      <div className="app-sidebar">
        <Sidebar />
      </div>
      <div className="app-content" style={{ marginLeft: '220px', minHeight: '100vh' }}>
        <div
          className="app-header"
          style={{
            background: 'white',
            borderBottom: '1px solid #e2e8f0',
            padding: '14px 30px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontWeight: 'bold', color: '#0f2540' }}>Grand Hotel</div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
        {hasAccess ? children : (
          <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🚫</div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#0f2540' }}>Access Denied</div>
            <div style={{ marginTop: 8 }}>Your account doesn't have permission to view this page. Contact your administrator.</div>
          </div>
        )}
      </div>
    </>
  )
}
