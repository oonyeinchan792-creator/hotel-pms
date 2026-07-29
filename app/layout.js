import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'Hotel PMS',
  description: 'Hotel Property Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, background: '#eef1f5' }}>
        <style>{`
          @media print {
            .app-sidebar, .app-header, .no-print { display: none !important; }
            .app-content { margin-left: 0 !important; }
            body { background: white !important; }
          }
        `}</style>
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
          {children}
        </div>
      </body>
    </html>
  )
}
