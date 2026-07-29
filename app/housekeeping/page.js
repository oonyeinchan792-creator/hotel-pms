'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const statusInfo = {
  vacant_clean: { bg: '#16a34a', label: 'Vacant Clean' },
  vacant_dirty: { bg: '#eab308', label: 'Vacant Dirty' },
  occupied_clean: { bg: '#2563eb', label: 'Occupied Clean' },
  occupied_dirty: { bg: '#dc2626', label: 'Occupied Dirty' },
  out_of_order: { bg: '#6b7280', label: 'Out of Order' },
}

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('needs_attention')

  async function loadRooms() {
    setLoading(true)

    const { data: typeData } = await supabase.from('room_types').select('*')
    const typeMap = {}
    typeData?.forEach((t) => (typeMap[t.id] = t.name))
    setRoomTypes(typeMap)

    const { data: roomsData } = await supabase.from('rooms').select('*')
    const sorted = (roomsData || []).sort((a, b) => Number(a.room_number) - Number(b.room_number))
    setRooms(sorted)

    setLoading(false)
  }

  useEffect(() => {
    loadRooms()
  }, [])

  async function updateStatus(roomId, newStatus) {
    await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId)
    loadRooms()
  }

  const dirtyCount = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'occupied_dirty').length
  const oooCount = rooms.filter((r) => r.status === 'out_of_order').length

  const visibleRooms = rooms.filter((r) => {
    if (filter === 'needs_attention') return r.status === 'vacant_dirty' || r.status === 'occupied_dirty'
    if (filter === 'out_of_order') return r.status === 'out_of_order'
    return true // 'all'
  })

  return (
    <main style={{ padding: '30px' }}>
      <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Housekeeping</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Room cleaning and maintenance status</p>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', marginTop: '20px' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #dc2626' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Needs Cleaning</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{dirtyCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #6b7280' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Out of Order</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{oooCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #0f2540' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Total Rooms</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{rooms.length}</div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setFilter('needs_attention')} style={{ ...filterBtn, background: filter === 'needs_attention' ? '#0f2540' : '#e2e8f0', color: filter === 'needs_attention' ? 'white' : '#0f2540' }}>
          Needs Cleaning
        </button>
        <button onClick={() => setFilter('out_of_order')} style={{ ...filterBtn, background: filter === 'out_of_order' ? '#0f2540' : '#e2e8f0', color: filter === 'out_of_order' ? 'white' : '#0f2540' }}>
          Out of Order
        </button>
        <button onClick={() => setFilter('all')} style={{ ...filterBtn, background: filter === 'all' ? '#0f2540' : '#e2e8f0', color: filter === 'all' ? 'white' : '#0f2540' }}>
          All Rooms
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && visibleRooms.length === 0 && (
        <p style={{ color: '#6b7280' }}>No rooms in this view. Nice — housekeeping is caught up!</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
        {visibleRooms.map((room) => {
          const info = statusInfo[room.status] || { bg: '#9ca3af', label: room.status }
          return (
            <div key={room.id} style={{ background: 'white', borderRadius: '8px', padding: '14px', borderLeft: `6px solid ${info.bg}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '18px' }}>Room {room.room_number}</strong>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Floor {room.floor}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                {roomTypes[room.room_type_id]} · {info.label}
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(room.status === 'vacant_dirty' || room.status === 'occupied_dirty') && (
                  <button
                    onClick={() => updateStatus(room.id, room.status === 'vacant_dirty' ? 'vacant_clean' : 'occupied_clean')}
                    style={actionBtn('#16a34a')}
                  >
                    Mark Clean
                  </button>
                )}
                {room.status !== 'out_of_order' && (
                  <button onClick={() => updateStatus(room.id, 'out_of_order')} style={actionBtn('#6b7280')}>
                    Set Out of Order
                  </button>
                )}
                {room.status === 'out_of_order' && (
                  <button onClick={() => updateStatus(room.id, 'vacant_clean')} style={actionBtn('#2563eb')}>
                    Return to Service
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

const filterBtn = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  marginRight: '8px',
  cursor: 'pointer',
  fontWeight: 'bold',
}

function actionBtn(color) {
  return {
    background: color,
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '5px',
    fontSize: '12px',
    cursor: 'pointer',
  }
}
