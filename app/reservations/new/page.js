'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

function NewReservationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [roomTypes, setRoomTypes] = useState([])
  const [companies, setCompanies] = useState([])
  const [packages, setPackages] = useState([])
  const [ratePlans, setRatePlans] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    room_type_id: searchParams.get('room_type_id') || '',
    check_in_date: searchParams.get('check_in') || '',
    check_out_date: searchParams.get('check_out') || '',
    adults: 1,
    children: 0,
    source: 'walk-in',
    company_id: '',
    package_id: '',
    rate_plan_id: searchParams.get('rate_plan_id') || '',
    deposit_amount: '',
    deposit_paid: false,
  })

  useEffect(() => {
    async function loadTypes() {
      const { data } = await supabase.from('room_types').select('*').order('base_rate')
      setRoomTypes(data || [])

      const { data: companyData } = await supabase.from('companies').select('*').order('name')
      setCompanies(companyData || [])

      const { data: packageData } = await supabase.from('packages').select('*').eq('is_active', true).order('name')
      setPackages(packageData || [])

      const { data: rateData } = await supabase.from('rate_plans').select('*').eq('is_active', true).order('code')
      setRatePlans(rateData || [])
    }
    loadTypes()
  }, [])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // rate plans that apply to the currently selected room type
  const availableRatePlans = form.room_type_id
    ? ratePlans.filter((p) => p.room_type_id === form.room_type_id)
    : ratePlans

  const selectedRatePlan = ratePlans.find((p) => p.id === form.rate_plan_id)
  const selectedRoomType = roomTypes.find((t) => t.id === form.room_type_id)
  const nightlyRate = selectedRatePlan ? Number(selectedRatePlan.rate) : (selectedRoomType ? Number(selectedRoomType.base_rate) : 0)

  function nights() {
    if (!form.check_in_date || !form.check_out_date) return 0
    const diff = (new Date(form.check_out_date) - new Date(form.check_in_date)) / (1000 * 60 * 60 * 24)
    return diff > 0 ? diff : 0
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
      company_id: form.company_id || null,
      package_id: form.package_id || null,
      rate_plan_id: form.rate_plan_id || null,
      agreed_rate: nightlyRate || null,
      deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : 0,
      deposit_paid: form.deposit_paid,
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
          <select style={inputStyle} value={form.room_type_id} onChange={(e) => { updateField('room_type_id', e.target.value); updateField('rate_plan_id', '') }}>
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
            <option value="company">Company</option>
            <option value="travel_agent">Travel Agent</option>
          </select>
        </div>

        {(form.source === 'company' || form.source === 'travel_agent') && (
          <div style={fieldWrap}>
            <label style={labelStyle}>{form.source === 'company' ? 'Company' : 'Travel Agent'} (bills to City Ledger)</label>
            <select style={inputStyle} value={form.company_id} onChange={(e) => updateField('company_id', e.target.value)}>
              <option value="">Select {form.source === 'company' ? 'company' : 'travel agent'}</option>
              {companies
                .filter((c) => (form.source === 'company' ? c.type === 'company' : c.type === 'travel_agent'))
                .map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {companies.length === 0 && (
              <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                No companies set up yet. Add one in City Ledger first.
              </p>
            )}
          </div>
        )}

        <div style={fieldWrap}>
          <label style={labelStyle}>Package (optional)</label>
          <select style={inputStyle} value={form.package_id} onChange={(e) => updateField('package_id', e.target.value)}>
            <option value="">No package</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.name} (+{Number(p.extra_charge).toLocaleString()} MMK)</option>
            ))}
          </select>
        </div>

        <h3>Rate & Deposit</h3>

        <div style={fieldWrap}>
          <label style={labelStyle}>Rate Code</label>
          <select style={inputStyle} value={form.rate_plan_id} onChange={(e) => updateField('rate_plan_id', e.target.value)}>
            <option value="">Use room type's standard rate</option>
            {availableRatePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name} ({Number(p.rate).toLocaleString()} MMK/night)
              </option>
            ))}
          </select>
          {form.room_type_id && availableRatePlans.length === 0 && (
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              No rate codes set up for this room type yet — standard rate will be used.
            </p>
          )}
        </div>

        {nights() > 0 && nightlyRate > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px' }}>
            <strong>{nightlyRate.toLocaleString()} MMK</strong> / night × {nights()} night(s) = {' '}
            <strong>{(nightlyRate * nights()).toLocaleString()} MMK</strong> total (before package/tax)
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ ...fieldWrap, flex: 1 }}>
            <label style={labelStyle}>Deposit Amount (MMK)</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="0"
              value={form.deposit_amount}
              onChange={(e) => updateField('deposit_amount', e.target.value)}
            />
          </div>
          <div style={{ ...fieldWrap, flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={form.deposit_paid}
                onChange={(e) => updateField('deposit_paid', e.target.checked)}
              />
              Deposit already collected
            </label>
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
          {saving ? 'Saving...' : 'Create Reservation'}
        </button>
      </form>
    </main>
  )
}

export default function NewReservationPage() {
  return (
    <Suspense fallback={<main style={{ padding: '30px' }}>Loading...</main>}>
      <NewReservationForm />
    </Suspense>
  )
}
