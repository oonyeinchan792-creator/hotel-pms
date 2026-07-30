'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const statusStyle = {
  scheduled: { bg: '#dbeafe', color: '#1e40af', label: 'Scheduled' },
  completed: { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  no_answer: { bg: '#fef3c7', color: '#92400e', label: 'No Answer' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
}

export default function WakeupCallPage() {
  const [inHouse, setInHouse] = useState([])
  const [guests, setGuests] = useState({})
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const [selectedReservation, setSelectedReservation] = useState('')
  const [callDate, setCallDate] = useState(today)
  const [callTime, setCallTime] = useState('')
  const [notes, setNotes] = useState('')
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

    const { data: callData } = await supabase
      .from('wakeup_calls')
      .select('*, reservations(guest_id, rooms(room_number))')
      .neq('status', 'cancelled')
      .order('call_date', { ascending: true })
      .order('call_time', { ascending: true })
    setCalls(callData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function scheduleCall() {
    if (!selectedReservation || !callDate || !callTime) return

    await supabase.from('wakeup_calls').insert({
      reservation_id: selectedReservation,
      call_date: callDate,
      call_time: callTime,
      notes: notes.trim() || null,
      taken_by: takenBy.trim() || null,
    })

    setSelectedReservation('')
    setCallTime('')
    setNotes('')
    loadAll()
  }

  async function updateCallStatus(callId, status) {
    await supabase
      .from('wakeup_calls')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', callId)
    loadAll()
  }

  const todayCalls = calls.filter((c) => c.call_date === today)
  const upcomingCalls = calls.filter((c) => c.call_date > today)

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#374151' }
  const fieldWrap = { marginBottom: '16px' }

  function CallRow({ c }) {
    const style = statusStyle[c.status] || statusStyle.scheduled
    return (
      <div style={{ background: 'white', borderRadius: '6px', padding: '14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <strong>Room {c.reservations?.rooms?.room_number}</strong>
          <span style={{ marginLeft: '10px', fontSize: '13px', color: '#6b7280' }}>
            {guests[c.reservations?.guest_id]}
          </span>
          <div style={{ fontSize: '13px', color: '#374151', marginTop: '2px' }}>
            {c.call_date} at <strong>{c.call_time}</strong>
            {c.notes && <span style={{ color: '#9ca3af' }}> — {c.notes}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
            {style.label}
          </span>
          {c.status === 'scheduled' && (
            <>
              <button onClick={() => updateCallStatus(c.id, 'completed')} style={btnStyle('#16a34a')}>Done</button>
              <button onClick={() => updateCallStatus(c.id, 'no_answer')} style={btnStyle('#d97706')}>No Answer</button>
              <button onClick={() => updateCallStatus(c.id, 'cancelled')} style={btnStyle('#dc2626')}>Cancel</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <main style={{ padding: '30px', maxWidth: '700px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>Wakeup Calls</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Schedule and track guest wakeup call requests</p>

      {/* Schedule new call */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Schedule a Wakeup Call</h3>

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

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Date *</label>
            <input style={inputStyle} type="date" value={callDate} onChange={(e) => setCallDate(e.target.value)} />
          </div>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Time *</label>
            <input style={inputStyle} type="time" value={callTime} onChange={(e) => setCallTime(e.target.value)} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Call twice if no answer" />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Taken By (staff name)</label>
          <input style={inputStyle} value={takenBy} onChange={(e) => setTakenBy(e.target.value)} />
        </div>

        <button
          onClick={scheduleCall}
          style={{ background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
        >
          Schedule Call
        </button>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <h3>Today ({todayCalls.length})</h3>
          {todayCalls.length === 0 && <p style={{ color: '#6b7280' }}>No wakeup calls scheduled for today.</p>}
          {todayCalls.map((c) => <CallRow key={c.id} c={c} />)}

          <h3 style={{ marginTop: '24px' }}>Upcoming ({upcomingCalls.length})</h3>
          {upcomingCalls.length === 0 && <p style={{ color: '#6b7280' }}>No upcoming wakeup calls.</p>}
          {upcomingCalls.map((c) => <CallRow key={c.id} c={c} />)}
        </>
      )}
    </main>
  )
}

function btnStyle(color) {
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
