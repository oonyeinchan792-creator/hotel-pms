'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function FrontDeskPage() {
  const [reserved, setReserved] = useState([])
  const [checkedIn, setCheckedIn] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [availableRooms, setAvailableRooms] = useState({}) // keyed by reservation id
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadAll() {
    setLoading(true)

    const { data: guestData } = await supabase.from('guests').select('*')
    const guestMap = {}
    guestData?.forEach((g) => (guestMap[g.id] = `${g.first_name} ${g.last_name}`))
    setGuests(guestMap)

    const { data: typeData } = await supabase.from('room_types').select('*')
    const typeMap = {}
    typeData?.forEach((t) => (typeMap[t.id] = t.name))
    setRoomTypes(typeMap)

    const { data: reservedData } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'reserved')
      .order('check_in_date')
    setReserved(reservedData || [])

    // For each reserved booking, load available rooms matching its room_type
    const roomsMap = {}
    for (const r of reservedData || []) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_type_id', r.room_type_id)
        .in('status', ['vacant_clean', 'vacant_dirty', 'vacant_inspected'])
        .order('room_number')
      roomsMap[r.id] = rooms || []
    }
    setAvailableRooms(roomsMap)

    const { data: checkedInData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number)')
      .eq('status', 'checked_in')
      .order('check_out_date')
    setCheckedIn(checkedInData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function handleCheckIn(reservationId, roomId) {
    if (!roomId) {
      setMessage('Please select a room first.')
      return
    }
    setMessage('')

    const { error: resErr } = await supabase
      .from('reservations')
      .update({ room_id: roomId, status: 'checked_in', actual_check_in: new Date().toISOString() })
      .eq('id', reservationId)

    if (resErr) {
      setMessage('Error: ' + resErr.message)
      return
    }

    await supabase.from('rooms').update({ status: 'occupied_clean' }).eq('id', roomId)

    setMessage('Guest checked in successfully.')
    loadAll()
  }

  async function handleCheckOut(reservationId, roomId) {
    setMessage('')

    const { error: resErr } = await supabase
      .from('reservations')
      .update({ status: 'checked_out', actual_check_out: new Date().toISOString() })
      .eq('id', reservationId)

    if (resErr) {
      setMessage('Error: ' + resErr.message)
      return
    }

    if (roomId) {
      await supabase.from('rooms').update({ status: 'vacant_dirty' }).eq('id', roomId)
    }

    setMessage('Guest checked out successfully.')
    loadAll()
  }

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Front Desk</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href="/frontdesk/roommove"
            style={{ background: '#7c3aed', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
          >
            ↔️ Room Move
          </a>
          <a
            href="/frontdesk/walkin"
            style={{ background: '#d97706', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}
          >
            + Walk-In Check-In
          </a>
        </div>
      </div>

      {message && (
        <p style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '6px', color: '#92400e' }}>
          {message}
        </p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <h2 style={{ marginTop: '30px' }}>Arrivals — Check In</h2>
          {reserved.length === 0 && <p style={{ color: '#6b7280' }}>No pending arrivals.</p>}

          {reserved.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong>{guests[r.guest_id] || 'Unknown Guest'}</strong>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {roomTypes[r.room_type_id]} · {r.check_in_date} &rarr; {r.check_out_date} · Conf# {r.confirmation_number}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  id={`room-select-${r.id}`}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                  defaultValue=""
                >
                  <option value="">Select room</option>
                  {(availableRooms[r.id] || []).map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const select = document.getElementById(`room-select-${r.id}`)
                    handleCheckIn(r.id, select.value)
                  }}
                  style={{
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  Check In
                </button>
              </div>
            </div>
          ))}

          <h2 style={{ marginTop: '40px' }}>In House — Check Out</h2>
          {checkedIn.length === 0 && <p style={{ color: '#6b7280' }}>No guests currently in house.</p>}

          {checkedIn.map((r) => (
            <div
              key={r.id}
              style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <strong>{guests[r.guest_id] || 'Unknown Guest'}</strong>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  Room {r.rooms?.room_number || '—'} · Check-out due {r.check_out_date} · Conf# {r.confirmation_number}
                </div>
              </div>

              <button
                onClick={() => handleCheckOut(r.id, r.room_id)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                Check Out
              </button>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
