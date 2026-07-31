'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function QueueRoomsPage() {
  const [queued, setQueued] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)

    const { data: guestData } = await supabase.from('guests').select('*')
    const guestMap = {}
    guestData?.forEach((g) => (guestMap[g.id] = g))
    setGuests(guestMap)

    const { data: typeData } = await supabase.from('room_types').select('*')
    const typeMap = {}
    typeData?.forEach((t) => (typeMap[t.id] = t.name))
    setRoomTypes(typeMap)

    const { data: reservedData } = await supabase
      .from('reservations')
      .select('*')
      .eq('status', 'reserved')
      .order('created_at', { ascending: true })

    // For each reserved booking, check if a clean/inspected room of that type exists
    const queuedList = []
    for (const r of reservedData || []) {
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_type_id', r.room_type_id)
        .in('status', ['vacant_clean', 'vacant_inspected'])
        .limit(1)

      if (!rooms || rooms.length === 0) {
        queuedList.push(r)
      }
    }
    setQueued(queuedList)

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function waitTime(createdAt) {
    const mins = Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>Queue Rooms</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>
        Arrivals waiting because no clean/inspected room of the requested type is available yet
      </p>

      {loading && <p>Loading...</p>}
      {!loading && queued.length === 0 && (
        <p style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ No guests currently in queue — all room types have availability.</p>
      )}

      {!loading && queued.map((r, index) => {
        const guest = guests[r.guest_id]
        return (
          <div
            key={r.id}
            style={{
              background: 'white',
              borderLeft: '5px solid #d97706',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', marginRight: '10px' }}>
                {index + 1}
              </span>
              <strong>{guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown'}</strong>
              <div style={{ fontSize: '13px', color: '#6b7280', marginLeft: '34px' }}>
                Waiting for: {roomTypes[r.room_type_id]} · Conf# {r.confirmation_number}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: '#d97706', fontWeight: 'bold' }}>Waiting {waitTime(r.created_at)}</div>
              <a href="/housekeeping" style={{ fontSize: '12px', color: '#2563eb' }}>Check Housekeeping &rarr;</a>
            </div>
          </div>
        )
      })}

      <button
        onClick={loadAll}
        style={{ marginTop: '20px', background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        🔄 Refresh Queue
      </button>
    </main>
  )
}
