'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function RoomMovePage() {
  const [inHouse, setInHouse] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [selectedReservation, setSelectedReservation] = useState('')
  const [availableRooms, setAvailableRooms] = useState([])
  const [newRoomId, setNewRoomId] = useState('')
  const [reason, setReason] = useState('')

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

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number, floor)')
      .eq('status', 'checked_in')
      .order('check_out_date')
    setInHouse(resData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  const currentReservation = inHouse.find((r) => r.id === selectedReservation)

  useEffect(() => {
    async function loadAvailable() {
      if (!currentReservation) {
        setAvailableRooms([])
        return
      }
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_type_id', currentReservation.room_type_id)
        .in('status', ['vacant_clean', 'vacant_inspected'])
        .order('room_number')
      setAvailableRooms(data || [])
    }
    loadAvailable()
    setNewRoomId('')
  }, [selectedReservation])

  async function submitMove() {
    setMessage('')
    if (!selectedReservation || !newRoomId) {
      setMessage('Please select a guest and a new room.')
      return
    }

    const oldRoomId = currentReservation.room_id

    // 1. Update reservation to point to new room
    const { error: resError } = await supabase
      .from('reservations')
      .update({ room_id: newRoomId })
      .eq('id', selectedReservation)

    if (resError) {
      setMessage('Error: ' + resError.message)
      return
    }

    // 2. New room becomes occupied
    await supabase.from('rooms').update({ status: 'occupied_clean' }).eq('id', newRoomId)

    // 3. Old room becomes vacant dirty (needs cleaning after guest leaves)
    if (oldRoomId) {
      await supabase.from('rooms').update({ status: 'vacant_dirty' }).eq('id', oldRoomId)
    }

    // 4. Log the move as a folio transaction note if a folio exists
    const { data: folio } = await supabase.from('folios').select('id').eq('reservation_id', selectedReservation).maybeSingle()
    if (folio) {
      await supabase.from('folio_transactions').insert({
        folio_id: folio.id,
        transaction_type: 'charge',
        description: `Room Move${reason ? ' — ' + reason : ''} (0 MMK)`,
        amount: 0,
      })
    }

    setMessage('Room move completed successfully.')
    setSelectedReservation('')
    setNewRoomId('')
    setReason('')
    loadAll()
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#374151' }
  const fieldWrap = { marginBottom: '16px' }

  return (
    <main style={{ padding: '30px', maxWidth: '600px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>Room Move</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Transfer an in-house guest to a different room</p>

      {message && (
        <p style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '6px', color: '#92400e' }}>{message}</p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div style={fieldWrap}>
            <label style={labelStyle}>Guest (currently in house) *</label>
            <select style={inputStyle} value={selectedReservation} onChange={(e) => setSelectedReservation(e.target.value)}>
              <option value="">Select guest</option>
              {inHouse.map((r) => (
                <option key={r.id} value={r.id}>
                  {guests[r.guest_id]} — Room {r.rooms?.room_number} ({roomTypes[r.room_type_id]})
                </option>
              ))}
            </select>
          </div>

          {currentReservation && (
            <>
              <div style={{ background: 'white', borderRadius: '6px', padding: '14px', marginBottom: '16px', fontSize: '13px' }}>
                <strong>Current Room:</strong> {currentReservation.rooms?.room_number} (Floor {currentReservation.rooms?.floor}) · {roomTypes[currentReservation.room_type_id]}
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>New Room *</label>
                <select style={inputStyle} value={newRoomId} onChange={(e) => setNewRoomId(e.target.value)}>
                  <option value="">Select new room</option>
                  {availableRooms.map((r) => (
                    <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
                  ))}
                </select>
                {availableRooms.length === 0 && (
                  <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>No clean/inspected rooms of the same type available.</p>
                )}
              </div>

              <div style={fieldWrap}>
                <label style={labelStyle}>Reason for Move</label>
                <input style={inputStyle} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Maintenance issue, guest request, upgrade" />
              </div>

              <button
                onClick={submitMove}
                style={{ background: '#16a34a', color: 'white', padding: '14px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }}
              >
                Confirm Room Move
              </button>
            </>
          )}
        </>
      )}
    </main>
  )
}
