export default function Home() {
  const stats = [
    { label: 'Total Rooms', value: '200', color: '#0f2540' },
    { label: 'Occupied', value: '—', color: '#dc2626' },
    { label: 'Vacant', value: '—', color: '#16a34a' },
    { label: "Today's Arrivals", value: '—', color: '#2563eb' },
  ]

  return (
    <main style={{ padding: '30px' }}>
      <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Property overview</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginTop: '20px' }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: '6px', padding: '18px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <p style={{ marginTop: '30px', color: '#64748b', fontSize: '13px' }}>
        Use the sidebar to navigate to Room Status, Reservations, Front Desk, Guests, Billing, Reports, and Housekeeping.
      </p>
    </main>
  )
}
