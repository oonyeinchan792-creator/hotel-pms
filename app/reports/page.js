'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

function todayStr() {
  const d = new Date()
  return d.toISOString().split('T')[0]
}

export default function ReportsPage() {
  const [arrivals, setArrivals] = useState([])
  const [departures, setDepartures] = useState([])
  const [stayOvers, setStayOvers] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const today = todayStr()

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

      // Arrival List: reservations checking in today, not yet checked in
      const { data: arrivalData } = await supabase
        .from('reservations')
        .select('*')
        .eq('status', 'reserved')
        .eq('check_in_date', today)
      setArrivals(arrivalData || [])

      // Departure List: currently checked in, checking out today
      const { data: departureData } = await supabase
        .from('reservations')
        .select('*, rooms(room_number)')
        .eq('status', 'checked_in')
        .eq('check_out_date', today)
      setDepartures(departureData || [])

      // Stay-Over List: currently checked in, NOT checking out today (staying longer)
      const { data: stayOverData } = await supabase
        .from('reservations')
        .select('*, rooms(room_number)')
        .eq('status', 'checked_in')
        .neq('check_out_date', today)
      setStayOvers(stayOverData || [])

      setLoading(false)
    }
    load()
  }, [today])

  const cardStyle = { background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '10px' }

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <h1>Front Office Reports</h1>
      <p style={{ color: '#6b7280' }}>Date: {today}</p>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <h2 style={{ marginTop: '30px', color: '#2563eb' }}>Arrival List ({arrivals.length})</h2>
          {arrivals.length === 0 && <p style={{ color: '#6b7280' }}>No arrivals scheduled for today.</p>}
          {arrivals.map((r) => (
            <div key={r.id} style={cardStyle}>
              <strong>{guests[r.guest_id] || 'Unknown'}</strong>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {roomTypes[r.room_type_id]} · Conf# {r.confirmation_number}
              </div>
            </div>
          ))}

          <h2 style={{ marginTop: '40px', color: '#dc2626' }}>Departure List ({departures.length})</h2>
          {departures.length === 0 && <p style={{ color: '#6b7280' }}>No departures scheduled for today.</p>}
          {departures.map((r) => (
            <div key={r.id} style={cardStyle}>
              <strong>{guests[r.guest_id] || 'Unknown'}</strong>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Room {r.rooms?.room_number || '—'} · Conf# {r.confirmation_number}
              </div>
            </div>
          ))}

          <h2 style={{ marginTop: '40px', color: '#16a34a' }}>Stay-Over List ({stayOvers.length})</h2>
          {stayOvers.length === 0 && <p style={{ color: '#6b7280' }}>No stay-over guests.</p>}
          {stayOvers.map((r) => (
            <div key={r.id} style={cardStyle}>
              <strong>{guests[r.guest_id] || 'Unknown'}</strong>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                Room {r.rooms?.room_number || '—'} · Departing {r.check_out_date} · Conf# {r.confirmation_number}
              </div>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
