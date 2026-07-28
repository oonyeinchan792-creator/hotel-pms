'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const statusColors = {
  vacant_clean: '#16a34a',
  vacant_dirty: '#eab308',
  occupied_clean: '#2563eb',
  occupied_dirty: '#dc2626',
  out_of_order: '#6b7280',
}

const statusLabels = {
  vacant_clean: 'Vacant Clean',
  vacant_dirty: 'Vacant Dirty',
  occupied_clean: 'Occupied',
  occupied_dirty: 'Occupied Dirty',
  out_of_order: 'Out of Order',
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: typesData } = await supabase.from('room_types').select('*')
      const typesMap = {}
      typesData?.forEach((t) => (typesMap[t.id] = t.name))
      setRoomTypes(typesMap)

      const { data: roomsData } = await supabase.from('rooms').select('*')
      const sorted = (roomsData || []).sort((a, b) => Number(a.room_number) - Number(b.room_number))
      setRooms(sorted)
      setLoading(false)
    }
    load()
  }, [])

  // Group rooms by floor for display
  const roomsByFloor = {}
  rooms.forEach((room) => {
    const floorKey = room.floor || 'Other'
    if (!roomsByFloor[floorKey]) roomsByFloor[floorKey] = []
    roomsByFloor[floorKey].push(room)
  })
  const sortedFloors = Object.keys(roomsByFloor).sort((a, b) => Number(a) - Number(b))

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <h1>Room Status</h1>

      {loading && <p>Loading...</p>}

      {!loading && rooms.length === 0 && (
        <p style={{ color: '#6b7280' }}>
          No rooms yet. Add rooms in Supabase Table Editor &rarr; rooms table.
        </p>
      )}

      {sortedFloors.map((floorKey) => (
        <div key={floorKey} style={{ marginTop: '28px' }}>
          <h3 style={{ color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '6px' }}>
            Floor {floorKey}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {roomsByFloor[floorKey].map((room) => (
              <div
                key={room.id}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: statusColors[room.status] || '#9ca3af',
                  color: 'white',
                }}
              >
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{room.room_number}</div>
                <div style={{ fontSize: '12px' }}>{roomTypes[room.room_type_id] || ''}</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>{statusLabels[room.status] || room.status}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}
