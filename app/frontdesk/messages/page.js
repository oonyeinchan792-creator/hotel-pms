'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function GuestMessagesPage() {
  const [inHouse, setInHouse] = useState([])
  const [guests, setGuests] = useState({})
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedReservation, setSelectedReservation] = useState('')
  const [messageText, setMessageText] = useState('')
  const [takenBy, setTakenBy] = useState('')

  async function loadAll() {
    setLoading(true)

    const { data: guestData } = await supabase.from('guests').select('*')
    const guestMap = {}
    guestData?.forEach((g) => (guestMap[g.id] = `${g.first_name} ${g.last_name}`))
    setGuests(guestMap)

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number)')
      .eq('status', 'checked_in')
      .order('check_out_date')
    setInHouse(resData || [])

    const { data: msgData } = await supabase
      .from('guest_messages')
      .select('*, reservations(guest_id, rooms(room_number))')
      .order('created_at', { ascending: false })
    setMessages(msgData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function submitMessage() {
    if (!selectedReservation || !messageText.trim()) return

    await supabase.from('guest_messages').insert({
      reservation_id: selectedReservation,
      message: messageText.trim(),
      taken_by: takenBy.trim() || null,
    })

    setMessageText('')
    setSelectedReservation('')
    loadAll()
  }

  async function markDelivered(messageId) {
    await supabase.from('guest_messages').update({ is_delivered: true, delivered_at: new Date().toISOString() }).eq('id', messageId)
    loadAll()
  }

  const pendingMessages = messages.filter((m) => !m.is_delivered)
  const deliveredMessages = messages.filter((m) => m.is_delivered)

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#374151' }
  const fieldWrap = { marginBottom: '16px' }

  return (
    <main style={{ padding: '30px', maxWidth: '700px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>Guest Messages</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Record and deliver messages for in-house guests</p>

      {/* Take a new message */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Take a Message</h3>

        <div style={fieldWrap}>
          <label style={labelStyle}>Guest (in house) *</label>
          <select style={inputStyle} value={selectedReservation} onChange={(e) => setSelectedReservation(e.target.value)}>
            <option value="">Select guest</option>
            {inHouse.map((r) => (
              <option key={r.id} value={r.id}>
                {guests[r.guest_id]} — Room {r.rooms?.room_number}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Message *</label>
          <textarea
            style={{ ...inputStyle, minHeight: '80px' }}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="e.g. Your friend Ko Ko called, please call back at 09xxxxxxxx"
          />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Taken By (staff name)</label>
          <input style={inputStyle} value={takenBy} onChange={(e) => setTakenBy(e.target.value)} placeholder="e.g. Thida" />
        </div>

        <button
          onClick={submitMessage}
          style={{ background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
        >
          Save Message
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {/* Pending messages */}
      {!loading && (
        <>
          <h3>Pending Delivery ({pendingMessages.length})</h3>
          {pendingMessages.length === 0 && <p style={{ color: '#6b7280' }}>No pending messages.</p>}
          {pendingMessages.map((m) => (
            <div key={m.id} style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                <div>
                  <strong>Room {m.reservations?.rooms?.room_number}</strong>
                  <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                  <div style={{ marginTop: '4px' }}>{m.message}</div>
                  {m.taken_by && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Taken by {m.taken_by}</div>}
                </div>
                <button onClick={() => markDelivered(m.id)} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  Mark Delivered
                </button>
              </div>
            </div>
          ))}

          <h3 style={{ marginTop: '24px' }}>Delivered ({deliveredMessages.length})</h3>
          {deliveredMessages.length === 0 && <p style={{ color: '#6b7280' }}>No delivered messages yet.</p>}
          {deliveredMessages.map((m) => (
            <div key={m.id} style={{ background: '#f9fafb', borderRadius: '6px', padding: '12px 14px', marginBottom: '6px', opacity: 0.7 }}>
              <strong>Room {m.reservations?.rooms?.room_number}</strong>
              <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>{m.message}</span>
            </div>
          ))}
        </>
      )}
    </main>
  )
}
