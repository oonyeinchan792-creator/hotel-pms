'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function WaitingListPage() {
  const router = useRouter()
  const [waitlist, setWaitlist] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    room_type_id: '',
    desired_check_in: '',
    desired_check_out: '',
    priority: 'normal',
    notes: '',
  })

  async function loadAll() {
    setLoading(true)

    const { data: typeData } = await supabase.from('room_types').select('*').order('base_rate')
    setRoomTypes(typeData || [])

    const { data: waitData } = await supabase
      .from('waiting_list')
      .select('*, room_types(name)')
      .eq('status', 'waiting')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
    setWaitlist(waitData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function submitForm(e) {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name || !form.room_type_id || !form.desired_check_in || !form.desired_check_out) {
      setError('Please fill in all required fields.')
      return
    }

    const { error: insertError } = await supabase.from('waiting_list').insert({
      first_name: form.first_name,
      last_name: form.last_name,
      phone: form.phone || null,
      email: form.email || null,
      room_type_id: form.room_type_id,
      desired_check_in: form.desired_check_in,
      desired_check_out: form.desired_check_out,
      priority: form.priority,
      notes: form.notes || null,
    })

    if (insertError) { setError(insertError.message); return }

    setForm({ first_name: '', last_name: '', phone: '', email: '', room_type_id: '', desired_check_in: '', desired_check_out: '', priority: 'normal', notes: '' })
    setShowForm(false)
    loadAll()
  }

  async function cancelWaiting(id) {
    await supabase.from('waiting_list').update({ status: 'cancelled' }).eq('id', id)
    loadAll()
  }

  function convertToReservation(entry) {
    // Navigate to New Reservation pre-filled with this waitlist entry's details
    const params = new URLSearchParams({
      room_type_id: entry.room_type_id,
      check_in: entry.desired_check_in,
      check_out: entry.desired_check_out,
    })
    router.push(`/reservations/new?${params.toString()}`)
    // Mark as converted after navigating
    supabase.from('waiting_list').update({ status: 'converted' }).eq('id', entry.id)
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/reservations" style={{ color: '#2563eb' }}>&larr; Back to Reservations</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#0f2540', marginBottom: '4px' }}>Waiting List</h1>
          <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Guests waiting for a room type with no current availability</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Add to Waiting List
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <form onSubmit={submitForm}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle}>First Name *</label>
                <input style={inputStyle} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle}>Last Name *</label>
                <input style={inputStyle} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div style={{ flex: '1 1 160px' }}>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>Room Type *</label>
                <select style={inputStyle} value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}>
                  <option value="">Select room type</option>
                  {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={labelStyle}>Desired Check-in *</label>
                <input style={inputStyle} type="date" value={form.desired_check_in} onChange={(e) => setForm({ ...form, desired_check_in: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={labelStyle}>Desired Check-out *</label>
                <input style={inputStyle} type="date" value={form.desired_check_out} onChange={(e) => setForm({ ...form, desired_check_out: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 140px' }}>
                <label style={labelStyle}>Priority</label>
                <select style={inputStyle} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="normal">Normal</option>
                  <option value="high">High (VIP)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Flexible on dates, prefers high floor" />
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

            <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Add to Waiting List
            </button>
          </form>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {!loading && waitlist.length === 0 && <p style={{ color: '#6b7280' }}>No one is currently on the waiting list.</p>}

      {!loading && waitlist.map((w) => (
        <div
          key={w.id}
          style={{
            background: 'white',
            borderLeft: w.priority === 'high' ? '5px solid #d97706' : '5px solid #94a3b8',
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
            <strong>{w.first_name} {w.last_name}</strong>
            {w.priority === 'high' && (
              <span style={{ marginLeft: '8px', fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                VIP
              </span>
            )}
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {w.room_types?.name} · {w.desired_check_in} &rarr; {w.desired_check_out}
              {w.phone && <span> · {w.phone}</span>}
            </div>
            {w.notes && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{w.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => convertToReservation(w)}
              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Convert to Reservation
            </button>
            <button
              onClick={() => cancelWaiting(w.id)}
              style={{ background: '#dc2626', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </main>
  )
}
