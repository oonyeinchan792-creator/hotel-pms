export default function Home() {
  const modules = [
    { name: 'Room Status', href: '/rooms', color: '#2563eb' },
    { name: 'Reservations', href: '/reservations', color: '#16a34a' },
    { name: 'Front Desk', href: '/frontdesk', color: '#d97706' },
    { name: 'Guests', href: '/guests', color: '#7c3aed' },
    { name: 'Billing', href: '/billing', color: '#0891b2' },
  ]

  return (
    <main style={{ padding: '40px' }}>
      <h1 style={{ color: '#111827' }}>Hotel PMS</h1>
      <p style={{ color: '#6b7280' }}>Property Management Dashboard</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
        {modules.map((m) => (
          <a
            key={m.name}
            href={m.href}
            style={{
              display: 'block',
              padding: '24px',
              borderRadius: '12px',
              background: m.color,
              color: 'white',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '18px',
              textAlign: 'center',
            }}
          >
            {m.name}
          </a>
        ))}
      </div>
    </main>
  )
}
