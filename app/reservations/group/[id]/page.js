'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function GroupDetailPage() {
  const params = useParams()
  const [group, setGroup] = useState(null)
  const [roster, setRoster] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    room_type_id: '',
    check_in_date: '',
    check_out_date: '',
  })

  async function loadAll() {
    setLoading(true)

    const { data: groupData } = await supabase.from('groups').select('*, companies(name)').eq('id', params.id).single()
    setGroup(groupData)

    const { data: typeData } = await supabase.from('room_types').select('*').order('base_rate')
    setRoomTypes(typeData || [])

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, guests(first_name, last_name), room_types(name), rooms(room_number)')
      .eq('group_id', params.id)
      .order('created_at', { ascending: true })
    setRoster(resData || [])

    setLoading(false)
  }

  useEffect(() => {
    if (params.id) loadAll()
  }, [params.id])

  async function addRoomToGroup(e) {
    e.preventDefault()
    setError('')

    if (!form.first_name || !form.last_name || !form.room_type_id || !form.check_in_date || !form.check_out_date) {
      setError('Please fill in all fields.')
      return
    }

    const { data: guestData, error: guestError } = await supabase
      .from('guests')
      .insert({ first_name: form.first_name, last_name: form.last_name })
      .select()
      .single()

    if (guestError) { setError(guestError.message); return }

    const { error: resError } = await supabase.from('reservations').insert({
      guest_id: guestData.id,
      room_type_id: form.room_type_id,
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      source: 'group',
      group_id: params.id,
      company_id: group?.company_id || null,
      status: 'reserved',
    })

    if (resError) { setError(resError.message); return }

    setForm({ first_name: '', last_name: '', room_type_id: '', check_in_date: '', check_out_date: '' })
    loadAll()
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px' }

  if (loading) return <main style={{ padding: '30px' }}>Loading...</main>
  if (!group) return <main style={{ padding: '30px' }}>Group not found.</main>

  return (
    <main style={{ padding: '30px' }}>
      <a href="/reservations/group" style={{ color: '#2563eb' }}>&larr; Back to Groups</a>
      <h1 style={{ color: '#0f2540' }}>{group.group_name}</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>
        {group.group_leader_name && <span>Leader: {group.group_leader_name} · </span>}
        {group.companies?.name && <span>Billed to: {group.companies.name} · </span>}
        {roster.length} room(s)
      </p>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>Add Room to Group</h3>
        <form onSubmit={addRoomToGroup}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>First Name</label>
              <input style={inputStyle} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Last Name</label>
              <input style={inputStyle} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
            <div style={{ flex: '1 1 160px' }}>
              <label style={labelStyle}>Room Type</label>
              <select style={inputStyle} value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}>
                <option value="">Select</option>
                {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>Check-in</label>
              <input style={inputStyle} type="date" value={form.check_in_date} onChange={(e) => setForm({ ...form, check_in_date: e.target.value })} />
            </div>
            <div style={{ flex: '0 1 150px' }}>
              <label style={labelStyle}>Check-out</label>
              <input style={inputStyle} type="date" value={form.check_out_date} onChange={(e) => setForm({ ...form, check_out_date: e.target.value })} />
            </div>
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
          <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            + Add to Group
          </button>
        </form>
      </div>

      <h3>Group Roster</h3>
      {roster.length === 0 && <p style={{ color: '#6b7280' }}>No rooms added yet.</p>}

      {roster.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Guest</th>
              <th style={{ padding: '10px' }}>Room Type</th>
              <th style={{ padding: '10px' }}>Room</th>
              <th style={{ padding: '10px' }}>Check-in</th>
              <th style={{ padding: '10px' }}>Check-out</th>
              <th style={{ padding: '10px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                <td style={{ padding: '10px' }}>{r.guests?.first_name} {r.guests?.last_name}</td>
                <td style={{ padding: '10px' }}>{r.room_types?.name}</td>
                <td style={{ padding: '10px' }}>{r.rooms?.room_number || '—'}</td>
                <td style={{ padding: '10px' }}>{r.check_in_date}</td>
                <td style={{ padding: '10px' }}>{r.check_out_date}</td>
                <td style={{ padding: '10px', textTransform: 'capitalize' }}>{r.status.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
