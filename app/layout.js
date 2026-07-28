export const metadata = {
  title: 'Hotel PMS',
  description: 'Hotel Property Management System',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Arial, sans-serif', margin: 0, background: '#f4f5f7' }}>
        {children}
      </body>
    </html>
  )
}
