'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function WalkInPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState([])
  const [availableRooms, setAvailableRooms] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    room_type_id: '',
    room_id: '',
    check_in_date: today,
    check_out_date: tomorrow,
    adults: 1,
    children: 0,
  })

  useEffect(() => {
    async function loadTypes() {
      const { data } = await supabase.from('room_types').select('*').order('base_rate')
      setRoomTypes(data || [])
    }
    loadTypes()
  }, [])

  useEffect(() => {
    async function loadRooms() {
      if (!form.room_type_id) {
        setAvailableRooms([])
        return
      }
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_type_id', form.room_type_id)
        .in('status', ['vacant_clean', 'vacant_inspected'])
        .order('room_number')
      setAvailableRooms(data || [])
    }
    loadRooms()
  }, [form.room_type_id])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value, ...(field === 'room_type_id' ? { room_id: '' } : {}) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name || !form.room_type_id || !form.room_id) {
      setError('Please fill in guest name, room type, and select a room.')
      return
    }

    setSaving(true)

    // 1. Create guest
    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email || null,
        phone: form.phone || null,
      })
      .select()
      .single()

    if (guestError) {
      setError('Error creating guest: ' + guestError.message)
      setSaving(false)
      return
    }

    // 2. Create reservation, already checked in
    const { error: resError } = await supabase.from('reservations').insert({
      guest_id: guestData.id,
      room_id: form.room_id,
      room_type_id: form.room_type_id,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      adults: form.adults,
      children: form.children,
      source: 'walk-in',
      status: 'checked_in',
      actual_check_in: new Date().toISOString(),
    })

    if (resError) {
      setError('Error creating reservation: ' + resError.message)
      setSaving(false)
      return
    }

    // 3. Mark room occupied
    await supabase.from('rooms').update({ status: 'occupied_clean' }).eq('id', form.room_id)

    router.push('/frontdesk')
  }

  const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    marginTop: '4px',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#374151' }
  const fieldWrap = { marginBottom: '16px' }

  return (
    <main style={{ padding: '30px', maxWidth: '600px' }}>
      <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
      <h1 style={{ color: '#0f2540' }}>Walk-In Check-In</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Register a guest without a prior reservation and check them in immediately</p>

      <form onSubmit={handleSubmit}>
        <h3>Guest Information</h3>

        <div style={fieldWrap}>
          <label style={labelStyle}>First Name *</label>
          <input style={inputStyle} value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Last Name *</label>
          <input style={inputStyle} value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Email</label>
          <input style={inputStyle} type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Phone</label>
          <input style={inputStyle} value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
        </div>

        <h3>Room Assignment</h3>

        <div style={fieldWrap}>
          <label style={labelStyle}>Room Type *</label>
          <select style={inputStyle} value={form.room_type_id} onChange={(e) => updateField('room_type_id', e.target.value)}>
            <option value="">Select room type</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.base_rate} MMK/night</option>
            ))}
          </select>
        </div>

        {form.room_type_id && (
          <div style={fieldWrap}>
            <label style={labelStyle}>Available Room *</label>
            <select style={inputStyle} value={form.room_id} onChange={(e) => updateField('room_id', e.target.value)}>
              <option value="">Select room</option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>Room {r.room_number} (Floor {r.floor})</option>
              ))}
            </select>
            {availableRooms.length === 0 && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>No clean/inspected rooms available for this type.</p>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Check-in Date</label>
            <input style={inputStyle} type="date" value={form.check_in_date} onChange={(e) => updateField('check_in_date', e.target.value)} />
          </div>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Check-out Date</label>
            <input style={inputStyle} type="date" value={form.check_out_date} onChange={(e) => updateField('check_out_date', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Adults</label>
            <input style={inputStyle} type="number" min="1" value={form.adults} onChange={(e) => updateField('adults', Number(e.target.value))} />
          </div>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Children</label>
            <input style={inputStyle} type="number" min="0" value={form.children} onChange={(e) => updateField('children', Number(e.target.value))} />
          </div>
        </div>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{
            background: '#16a34a',
            color: 'white',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 'bold',
            fontSize: '16px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '10px',
          }}
        >
          {saving ? 'Checking In...' : 'Register & Check In Now'}
        </button>
      </form>
    </main>
  )
}
