import { AuthProvider } from '../context/AuthContext'
import AppShell from '../components/AppShell'

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
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  )
}
