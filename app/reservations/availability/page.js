'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

function todayStr(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000)
  return d.toISOString().split('T')[0]
}

function formatShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const DAYS_TO_SHOW = 14

export default function AvailabilityPage() {
  const [roomTypes, setRoomTypes] = useState([])
  const [allRooms, setAllRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [startOffset, setStartOffset] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: typeData } = await supabase.from('room_types').select('*').order('base_rate')
      setRoomTypes(typeData || [])

      const { data: roomsData } = await supabase
        .from('rooms')
        .select('*')
        .neq('status', 'out_of_order')
        .neq('status', 'out_of_service')
      setAllRooms(roomsData || [])

      const { data: resData } = await supabase
        .from('reservations')
        .select('room_type_id, check_in_date, check_out_date, status')
        .in('status', ['reserved', 'checked_in'])
      setReservations(resData || [])

      setLoading(false)
    }
    load()
  }, [])

  const dateColumns = Array.from({ length: DAYS_TO_SHOW }, (_, i) => todayStr(startOffset + i))

  function availableForTypeOnDate(type, dateStr) {
    const physicalRooms = allRooms.filter((r) => r.room_type_id === type.id).length
    const overbookingLimit = Number(type.overbooking_limit) || 0
    const totalCapacity = physicalRooms + overbookingLimit

    const bookedOfType = reservations.filter(
      (r) => r.room_type_id === type.id && r.check_in_date <= dateStr && r.check_out_date > dateStr
    ).length

    return Math.max(totalCapacity - bookedOfType, 0)
  }

  const cellStyle = (available, isOverbookRange) => ({
    padding: '10px 6px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    background: available > 0 ? (isOverbookRange ? '#fef3c7' : '#dcfce7') : '#fee2e2',
    color: available > 0 ? (isOverbookRange ? '#92400e' : '#166534') : '#991b1b',
    borderLeft: '1px solid #e5e7eb',
    cursor: available > 0 ? 'pointer' : 'default',
  })

  return (
    <main style={{ padding: '30px' }}>
      <a href="/reservations" style={{ color: '#2563eb' }}>&larr; Back to Reservations</a>
      <h1 style={{ color: '#0f2540' }}>Room Availability</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Available rooms by type across the next {DAYS_TO_SHOW} days</p>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <button
          onClick={() => setStartOffset(startOffset - DAYS_TO_SHOW)}
          style={{ background: '#0f2540', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          &larr; Previous {DAYS_TO_SHOW} days
        </button>
        <button
          onClick={() => setStartOffset(0)}
          style={{ background: '#e2e8f0', color: '#0f2540', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Today
        </button>
        <button
          onClick={() => setStartOffset(startOffset + DAYS_TO_SHOW)}
          style={{ background: '#0f2540', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          Next {DAYS_TO_SHOW} days &rarr;
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '13px' }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, background: '#0f2540', color: 'white', padding: '10px', textAlign: 'left', minWidth: '140px', zIndex: 1 }}>
                  Room Type
                </th>
                {dateColumns.map((d) => (
                  <th key={d} style={{ background: '#0f2540', color: 'white', padding: '8px 6px', minWidth: '70px', fontSize: '11px', borderLeft: '1px solid #1e3a5f' }}>
                    {formatShort(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((type) => {
                const physicalRooms = allRooms.filter((r) => r.room_type_id === type.id).length
                return (
                  <tr key={type.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ position: 'sticky', left: 0, background: 'white', padding: '10px', fontWeight: 'bold', color: '#0f2540', borderRight: '1px solid #e5e7eb' }}>
                      {type.name}
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'normal' }}>{Number(type.base_rate).toLocaleString()} MMK</div>
                      {type.overbooking_limit > 0 && (
                        <div style={{ fontSize: '10px', color: '#d97706', fontWeight: 'bold' }}>+{type.overbooking_limit} overbook allowed</div>
                      )}
                    </td>
                    {dateColumns.map((d) => {
                      const avail = availableForTypeOnDate(type, d)
                      const isOverbookRange = avail > 0 && (physicalRooms - (reservations.filter(r => r.room_type_id === type.id && r.check_in_date <= d && r.check_out_date > d).length)) <= 0
                      const nextDay = todayStr(dateColumns.indexOf(d) + startOffset + 1)
                      return (
                        <td key={d} style={cellStyle(avail, isOverbookRange)}>
                          {avail > 0 ? (
                            <a
                              href={`/reservations/new?room_type_id=${type.id}&check_in=${d}&check_out=${nextDay}`}
                              style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                              title={isOverbookRange ? `Overbooking — ${type.name} for ${d}` : `Book ${type.name} for ${d}`}
                            >
                              {avail}
                            </a>
                          ) : (
                            avail
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '14px', display: 'flex', gap: '16px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
        <span><span style={{ background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', color: '#166534', fontWeight: 'bold' }}>N</span> = Rooms available (click to book)</span>
        <span><span style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', color: '#92400e', fontWeight: 'bold' }}>N</span> = Overbooking range (physical rooms sold out, using overbooking allowance)</span>
        <span><span style={{ background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', color: '#991b1b', fontWeight: 'bold' }}>0</span> = Sold out (including overbooking)</span>
      </div>
    </main>
  )
}
