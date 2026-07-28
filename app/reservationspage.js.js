'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const statusStyle = {
  reserved: { bg: '#dbeafe', color: '#1e40af', label: 'Reserved' },
  checked_in: { bg: '#dcfce7', color: '#166534', label: 'Checked In' },
  checked_out: { bg: '#f3f4f6', color: '#374151', label: 'Checked Out' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: guestData } = await supabase.from('guests').select('*')
      const guestMap = {}
      guestData?.forEach((g) => (guestMap[g.id] = `${g.first_name} ${g.last_name}`))
      setGuests(guestMap)

      const { data: typeData } = await supabase.from('room_types').select('*')
      const typeMap = {}
      typeData?.forEach((t) => (typeMap[t.id] = t.name))
      setRoomTypes(typeMap)

      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .order('check_in_date', { ascending: true })
      setReservations(resData || [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
        <h1>Reservations</h1>
        <a
          href="/reservations/new"
          style={{
            background: '#16a34a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 'bold',
          }}
        >
          + New Reservation
        </a>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && reservations.length === 0 && (
        <p style={{ color: '#6b7280', marginTop: '20px' }}>No reservations yet. Click "New Reservation" to create one.</p>
      )}

      {!loading && reservations.length > 0 && (
        <table style={{ width: '100%', marginTop: '20px', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Confirmation #</th>
              <th style={{ padding: '12px' }}>Guest</th>
              <th style={{ padding: '12px' }}>Room Type</th>
              <th style={{ padding: '12px' }}>Check-in</th>
              <th style={{ padding: '12px' }}>Check-out</th>
              <th style={{ padding: '12px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => {
              const style = statusStyle[r.status] || statusStyle.reserved
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace' }}>{r.confirmation_number}</td>
                  <td style={{ padding: '12px' }}>{guests[r.guest_id] || 'Unknown'}</td>
                  <td style={{ padding: '12px' }}>{roomTypes[r.room_type_id] || ''}</td>
                  <td style={{ padding: '12px' }}>{r.check_in_date}</td>
                  <td style={{ padding: '12px' }}>{r.check_out_date}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {style.label}
                    </span>
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
