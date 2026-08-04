'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function RateManagementPage() {
  const [ratePlans, setRatePlans] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    code: '',
    name: '',
    room_type_id: '',
    rate: '',
    valid_from: '',
    valid_to: '',
    min_stay: '',
    max_stay: '',
    closed_to_arrival: false,
    closed_to_departure: false,
  })

  async function loadAll() {
    setLoading(true)

    const { data: typeData } = await supabase.from('room_types').select('*').order('base_rate')
    setRoomTypes(typeData || [])

    const { data: rateData } = await supabase
      .from('rate_plans')
      .select('*, room_types(name)')
      .order('code')
    setRatePlans(rateData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function resetForm() {
    setForm({
      code: '', name: '', room_type_id: '', rate: '', valid_from: '', valid_to: '',
      min_stay: '', max_stay: '', closed_to_arrival: false, closed_to_departure: false,
    })
    setEditingId(null)
  }

  function startEdit(plan) {
    setForm({
      code: plan.code,
      name: plan.name,
      room_type_id: plan.room_type_id,
      rate: plan.rate,
      valid_from: plan.valid_from || '',
      valid_to: plan.valid_to || '',
      min_stay: plan.min_stay || '',
      max_stay: plan.max_stay || '',
      closed_to_arrival: plan.closed_to_arrival || false,
      closed_to_departure: plan.closed_to_departure || false,
    })
    setEditingId(plan.id)
  }

  async function submitForm(e) {
    e.preventDefault()
    setError('')

    if (!form.code || !form.name || !form.room_type_id || !form.rate) {
      setError('Please fill in Code, Name, Room Type, and Rate.')
      return
    }

    const payload = {
      code: form.code.toUpperCase(),
      name: form.name,
      room_type_id: form.room_type_id,
      rate: Number(form.rate),
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      min_stay: form.min_stay ? Number(form.min_stay) : null,
      max_stay: form.max_stay ? Number(form.max_stay) : null,
      closed_to_arrival: form.closed_to_arrival,
      closed_to_departure: form.closed_to_departure,
    }

    if (editingId) {
      const { error: updateError } = await supabase.from('rate_plans').update(payload).eq('id', editingId)
      if (updateError) { setError(updateError.message); return }
    } else {
      const { error: insertError } = await supabase.from('rate_plans').insert(payload)
      if (insertError) { setError(insertError.message); return }
    }

    resetForm()
    loadAll()
  }

  async function toggleActive(plan) {
    await supabase.from('rate_plans').update({ is_active: !plan.is_active }).eq('id', plan.id)
    loadAll()
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/reservations" style={{ color: '#2563eb' }}>&larr; Back to Reservations</a>
      <h1 style={{ color: '#0f2540' }}>Rate Management</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Create and manage rate codes for each room type</p>
      <p>
        <a href="/rates/room-types" style={{ color: '#2563eb', fontSize: '13px', fontWeight: 'bold' }}>
          🏷️ Manage Room Types & Classes &rarr;
        </a>
        {' · '}
        <a href="/rates/dynamic-pricing" style={{ color: '#2563eb', fontSize: '13px', fontWeight: 'bold' }}>
          📈 Dynamic Pricing &rarr;
        </a>
      </p>

      {/* Form */}
      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>{editingId ? 'Edit Rate Plan' : 'New Rate Plan'}</h3>
        <form onSubmit={submitForm}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ flex: '0 1 120px' }}>
              <label style={labelStyle}>Code *</label>
              <input style={inputStyle} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. BAR, CORP" />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label style={labelStyle}>Name *</label>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Best Available Rate" />
            </div>
            <div style={{ flex: '1 1 180px' }}>
              <label style={labelStyle}>Room Type *</label>
              <select style={inputStyle} value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}>
                <option value="">Select room type</option>
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <label style={labelStyle}>Rate (MMK) *</label>
              <input style={inputStyle} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ flex: '0 1 160px' }}>
              <label style={labelStyle}>Valid From</label>
              <input style={inputStyle} type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label style={labelStyle}>Valid To</label>
              <input style={inputStyle} type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
            </div>
          </div>

          <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#92400e', marginBottom: '10px' }}>Restrictions</div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div style={{ flex: '0 1 140px' }}>
                <label style={labelStyle}>Min Stay (nights)</label>
                <input style={inputStyle} type="number" min="0" value={form.min_stay} onChange={(e) => setForm({ ...form, min_stay: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 140px' }}>
                <label style={labelStyle}>Max Stay (nights)</label>
                <input style={inputStyle} type="number" min="0" value={form.max_stay} onChange={(e) => setForm({ ...form, max_stay: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input type="checkbox" checked={form.closed_to_arrival} onChange={(e) => setForm({ ...form, closed_to_arrival: e.target.checked })} />
                Closed to Arrival
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                <input type="checkbox" checked={form.closed_to_departure} onChange={(e) => setForm({ ...form, closed_to_departure: e.target.checked })} />
                Closed to Departure
              </label>
            </div>
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              {editingId ? 'Update Rate Plan' : 'Create Rate Plan'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} style={{ background: '#e2e8f0', color: '#0f2540', border: 'none', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {loading && <p>Loading...</p>}

      {!loading && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Code</th>
              <th style={{ padding: '12px' }}>Name</th>
              <th style={{ padding: '12px' }}>Room Type</th>
              <th style={{ padding: '12px' }}>Rate</th>
              <th style={{ padding: '12px' }}>Valid Period</th>
              <th style={{ padding: '12px' }}>Restrictions</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {ratePlans.map((p) => (
              <tr key={p.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 'bold' }}>{p.code}</td>
                <td style={{ padding: '12px' }}>{p.name}</td>
                <td style={{ padding: '12px' }}>{p.room_types?.name}</td>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{Number(p.rate).toLocaleString()} MMK</td>
                <td style={{ padding: '12px', fontSize: '12px' }}>
                  {p.valid_from || '—'} &rarr; {p.valid_to || '—'}
                </td>
                <td style={{ padding: '12px', fontSize: '11px', color: '#92400e' }}>
                  {p.min_stay ? `Min ${p.min_stay}n ` : ''}
                  {p.max_stay ? `Max ${p.max_stay}n ` : ''}
                  {p.closed_to_arrival ? 'CTA ' : ''}
                  {p.closed_to_departure ? 'CTD ' : ''}
                  {!p.min_stay && !p.max_stay && !p.closed_to_arrival && !p.closed_to_departure && '—'}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ background: p.is_active ? '#dcfce7' : '#f3f4f6', color: p.is_active ? '#166534' : '#6b7280', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => startEdit(p)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => toggleActive(p)} style={{ background: p.is_active ? '#6b7280' : '#16a34a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                    {p.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
