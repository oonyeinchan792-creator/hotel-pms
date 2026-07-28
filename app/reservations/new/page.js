'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function NewReservationPage() {
  const router = useRouter()
  const [roomTypes, setRoomTypes] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    room_type_id: '',
    check_in_date: '',
    check_out_date: '',
    adults: 1,
    children: 0,
    source: 'walk-in',
  })

  useEffect(() => {
    async function loadTypes() {
      const { data } = await supabase.from('room_types').select('*').order('base_rate')
      setRoomTypes(data || [])
    }
    loadTypes()
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name || !form.room_type_id || !form.check_in_date || !form.check_out_date) {
      setError('Please fill in all required fields.')
      return
    }
    if (form.check_out_date <= form.check_in_date) {
      setError('Check-out date must be after check-in date.')
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

    // 2. Create reservation
    const { error: resError } = await supabase.from('reservations').insert({
      guest_id: guestData.id,
      room_type_id: form.room_type_id,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      adults: form.adults,
      children: form.children,
      source: form.source,
      status: 'reserved',
    })

    if (resError) {
      setError('Error creating reservation: ' + resError.message)
      setSaving(false)
      return
    }

    router.push('/reservations')
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
    <main style={{ padding: '40px', maxWidth: '600px' }}>
      <a href="/reservations" style={{ color: '#2563eb' }}>&larr; Back to Reservations</a>
      <h1>New Reservation</h1>

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

        <h3>Stay Details</h3>

        <div style={fieldWrap}>
          <label style={labelStyle}>Room Type *</label>
          <select style={inputStyle} value={form.room_type_id} onChange={(e) => updateField('room_type_id', e.target.value)}>
            <option value="">Select room type</option>
            {roomTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.base_rate} MMK/night
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Check-in Date *</label>
            <input style={inputStyle} type="date" value={form.check_in_date} onChange={(e) => updateField('check_in_date', e.target.value)} />
          </div>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Check-out Date *</label>
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

        <div style={fieldWrap}>
          <label style={labelStyle}>Booking Source</label>
          <select style={inputStyle} value={form.source} onChange={(e) => updateField('source', e.target.value)}>
            <option value="walk-in">Walk-in</option>
            <option value="phone">Phone</option>
            <option value="website">Website</option>
            <option value="ota">OTA (Booking.com, Agoda, etc.)</option>
          </select>
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
          {saving ? 'Saving...' : 'Create Reservation'}
        </button>
      </form>
    </main>
  )
}
