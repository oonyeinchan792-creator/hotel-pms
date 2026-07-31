'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function InHousePage() {
  const [inHouse, setInHouse] = useState([])
  const [guests, setGuests] = useState({})
  const [roomTypes, setRoomTypes] = useState({})
  const [pendingMsgCounts, setPendingMsgCounts] = useState({})
  const [keyCardCounts, setKeyCardCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [issuingCard, setIssuingCard] = useState(null)

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

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number, floor)')
      .eq('status', 'checked_in')
      .order('check_out_date')
    setInHouse(resData || [])

    const { data: msgData } = await supabase.from('guest_messages').select('reservation_id').eq('is_delivered', false)
    const msgCounts = {}
    msgData?.forEach((m) => { msgCounts[m.reservation_id] = (msgCounts[m.reservation_id] || 0) + 1 })
    setPendingMsgCounts(msgCounts)

    const { data: cardData } = await supabase.from('key_card_log').select('reservation_id')
    const cardCounts = {}
    cardData?.forEach((c) => { cardCounts[c.reservation_id] = (cardCounts[c.reservation_id] || 0) + 1 })
    setKeyCardCounts(cardCounts)

    setLoading(false)
  }

  async function issueKeyCard(reservationId, roomId) {
    setIssuingCard(reservationId)
    await supabase.from('key_card_log').insert({
      reservation_id: reservationId,
      room_id: roomId,
      reason: 're-issue',
    })
    setIssuingCard(null)
    loadAll()
  }

  useEffect(() => {
    loadAll()
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const filtered = inHouse.filter((r) => {
    const guest = guests[r.guest_id]
    const fullName = guest ? `${guest.first_name} ${guest.last_name}`.toLowerCase() : ''
    const roomNum = r.rooms?.room_number || ''
    return fullName.includes(search.toLowerCase()) || roomNum.includes(search)
  })

  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', width: '100%', maxWidth: '350px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>In-House Guests</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>{inHouse.length} guest(s) currently in house</p>

      <input
        placeholder="Search by guest name or room number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: '20px' }}
      />

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: '#6b7280' }}>No matching in-house guests.</p>}

      {!loading && filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Room</th>
              <th style={{ padding: '12px' }}>Guest</th>
              <th style={{ padding: '12px' }}>Room Type</th>
              <th style={{ padding: '12px' }}>Check-in</th>
              <th style={{ padding: '12px' }}>Check-out</th>
              <th style={{ padding: '12px' }}>Nights Left</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const guest = guests[r.guest_id]
              const nightsLeft = Math.round((new Date(r.check_out_date) - new Date(today)) / 86400000)
              const isDepartureToday = r.check_out_date === today
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb', background: isDepartureToday ? '#fff7ed' : 'white' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.rooms?.room_number}</td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/guests/${r.guest_id}`} style={{ color: '#0f2540', fontWeight: 'bold', textDecoration: 'none' }}>
                      {guest ? `${guest.first_name} ${guest.last_name}` : 'Unknown'}
                    </a>
                    {guest?.vip_status && guest.vip_status !== 'none' && (
                      <span style={{ marginLeft: '6px', fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '8px' }}>
                        {guest.vip_status}
                      </span>
                    )}
                    {pendingMsgCounts[r.id] > 0 && (
                      <a href="/frontdesk/messages" style={{ marginLeft: '6px', fontSize: '11px', background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '8px', textDecoration: 'none' }}>
                        ✉️ {pendingMsgCounts[r.id]}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>{roomTypes[r.room_type_id]}</td>
                  <td style={{ padding: '12px' }}>{r.check_in_date}</td>
                  <td style={{ padding: '12px', fontWeight: isDepartureToday ? 'bold' : 'normal', color: isDepartureToday ? '#d97706' : 'inherit' }}>
                    {r.check_out_date} {isDepartureToday && '(Today)'}
                  </td>
                  <td style={{ padding: '12px' }}>{nightsLeft}</td>
                  <td style={{ padding: '12px' }}>
                    <button
                      onClick={() => issueKeyCard(r.id, r.room_id)}
                      disabled={issuingCard === r.id}
                      title={keyCardCounts[r.id] ? `${keyCardCounts[r.id]} card(s) issued so far` : 'No cards issued yet'}
                      style={{ background: '#eab308', color: '#78350f', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginRight: '10px' }}
                    >
                      🔑 {keyCardCounts[r.id] || 0}
                    </button>
                    <a href={`/frontdesk/regcard/${r.id}`} style={{ color: '#7c3aed', fontSize: '12px', fontWeight: 'bold', marginRight: '10px' }}>Reg Card &rarr;</a>
                    <a href="/billing" style={{ color: '#2563eb', fontSize: '12px', fontWeight: 'bold' }}>Folio &rarr;</a>
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
