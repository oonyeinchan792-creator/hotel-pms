'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const vipStyle = {
  none: { bg: '#f3f4f6', color: '#374151', label: 'Standard' },
  silver: { bg: '#e5e7eb', color: '#374151', label: 'Silver' },
  gold: { bg: '#fef3c7', color: '#92400e', label: 'Gold' },
  platinum: { bg: '#ede9fe', color: '#5b21b6', label: 'Platinum' },
}

export default function GuestsPage() {
  const [guests, setGuests] = useState([])
  const [stayCounts, setStayCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: guestData } = await supabase.from('guests').select('*').order('created_at', { ascending: false })
      setGuests(guestData || [])

      const { data: resData } = await supabase.from('reservations').select('guest_id')
      const counts = {}
      resData?.forEach((r) => {
        counts[r.guest_id] = (counts[r.guest_id] || 0) + 1
      })
      setStayCounts(counts)

      setLoading(false)
    }
    load()
  }, [])

  const filtered = guests.filter((g) => {
    const fullName = `${g.first_name} ${g.last_name}`.toLowerCase()
    return fullName.includes(search.toLowerCase())
  })

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <h1>Guest Profiles</h1>

      <input
        placeholder="Search guest by name..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '12px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          marginBottom: '20px',
        }}
      />

      {loading && <p>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <p style={{ color: '#6b7280' }}>No guests found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Phone</th>
              <th style={{ padding: '12px' }}>Total Stays</th>
              <th style={{ padding: '12px' }}>VIP Status</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => {
              const style = vipStyle[g.vip_status] || vipStyle.none
              return (
                <tr key={g.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{g.first_name} {g.last_name}</td>
                  <td style={{ padding: '12px' }}>{g.email || '—'}</td>
                  <td style={{ padding: '12px' }}>{g.phone || '—'}</td>
                  <td style={{ padding: '12px' }}>{stayCounts[g.id] || 0}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {style.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/guests/${g.id}`} style={{ color: '#2563eb', fontWeight: 'bold' }}>View &rarr;</a>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </main>
  )
}
