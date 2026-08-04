'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const styles = {
  page: { padding: '30px', maxWidth: '900px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  subtitle: { color: '#64748b', marginTop: 0, fontSize: '14px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' },
  sectionTitle: { fontSize: '15px', fontWeight: 'bold', color: '#0f2540', marginBottom: '12px' },
  row: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
  input: { padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' },
  btn: (color) => ({ background: color, color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '12px' },
  th: { textAlign: 'left', padding: '8px', background: '#f8fafc', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px', borderBottom: '1px solid #f1f5f9' },
};

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState([])
  const [roomClasses, setRoomClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const [classForm, setClassForm] = useState({ name: '', description: '' })
  const [typeForm, setTypeForm] = useState({ id: null, name: '', base_rate: '', room_class_id: '', overbooking_limit: 0 })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: classData } = await supabase.from('room_classes').select('*').order('sort_order')
    setRoomClasses(classData || [])

    const { data: typeData } = await supabase.from('room_types').select('*, room_classes(name)').order('base_rate')
    setRoomTypes(typeData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addClass(e) {
    e.preventDefault()
    if (!classForm.name.trim()) return
    setSaving(true)
    await supabase.from('room_classes').insert(classForm)
    setClassForm({ name: '', description: '' })
    setSaving(false)
    load()
  }

  function editType(t) {
    setTypeForm({
      id: t.id,
      name: t.name,
      base_rate: t.base_rate,
      room_class_id: t.room_class_id || '',
      overbooking_limit: t.overbooking_limit || 0,
    })
  }

  function resetTypeForm() {
    setTypeForm({ id: null, name: '', base_rate: '', room_class_id: '', overbooking_limit: 0 })
  }

  async function saveType(e) {
    e.preventDefault()
    if (!typeForm.name.trim() || !typeForm.base_rate) return
    setSaving(true)

    const payload = {
      name: typeForm.name,
      base_rate: Number(typeForm.base_rate),
      room_class_id: typeForm.room_class_id || null,
      overbooking_limit: Number(typeForm.overbooking_limit) || 0,
    }

    if (typeForm.id) {
      await supabase.from('room_types').update(payload).eq('id', typeForm.id)
    } else {
      await supabase.from('room_types').insert(payload)
    }

    resetTypeForm()
    setSaving(false)
    load()
  }

  return (
    <div style={styles.page}>
      <a href="/rates" style={styles.back}>&larr; Back to Rate Management</a>
      <h1 style={styles.title}>Room Types & Classes</h1>
      <p style={styles.subtitle}>Manage room types, group them into classes, and set overbooking limits</p>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>Room Classes</div>
        <form onSubmit={addClass} style={styles.row}>
          <input style={styles.input} placeholder="Class name (e.g. Standard, Deluxe, Suite)" value={classForm.name}
            onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
          <input style={styles.input} placeholder="Description (optional)" value={classForm.description}
            onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} />
          <button type="submit" style={styles.btn('#0f2540')} disabled={saving}>+ Add Class</button>
        </form>

        {roomClasses.length > 0 && (
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Description</th></tr></thead>
            <tbody>
              {roomClasses.map((c) => (
                <tr key={c.id}><td style={styles.td}>{c.name}</td><td style={styles.td}>{c.description || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={styles.card}>
        <div style={styles.sectionTitle}>{typeForm.id ? 'Edit Room Type' : 'New Room Type'}</div>
        <form onSubmit={saveType} style={styles.row}>
          <input style={styles.input} placeholder="Room type name" value={typeForm.name}
            onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} />
          <input style={styles.input} type="number" placeholder="Base Rate (MMK)" value={typeForm.base_rate}
            onChange={(e) => setTypeForm({ ...typeForm, base_rate: e.target.value })} />
          <select style={styles.input} value={typeForm.room_class_id} onChange={(e) => setTypeForm({ ...typeForm, room_class_id: e.target.value })}>
            <option value="">No class</option>
            {roomClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input
            style={{ ...styles.input, width: '150px' }}
            type="number"
            min="0"
            placeholder="Overbooking Limit"
            value={typeForm.overbooking_limit}
            onChange={(e) => setTypeForm({ ...typeForm, overbooking_limit: e.target.value })}
            title="How many bookings beyond room count are allowed for this type"
          />
          <button type="submit" style={styles.btn('#16a34a')} disabled={saving}>
            {saving ? 'Saving...' : typeForm.id ? 'Update' : '+ Add Type'}
          </button>
          {typeForm.id && (
            <button type="button" onClick={resetTypeForm} style={styles.btn('#6b7280')}>Cancel</button>
          )}
        </form>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Class</th>
              <th style={styles.th}>Base Rate</th>
              <th style={styles.th}>Overbooking Limit</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={styles.td}>Loading...</td></tr>
            ) : roomTypes.map((t) => (
              <tr key={t.id}>
                <td style={styles.td}>{t.name}</td>
                <td style={styles.td}>{t.room_classes?.name || '—'}</td>
                <td style={styles.td}>{Number(t.base_rate).toLocaleString()} MMK</td>
                <td style={styles.td}>{t.overbooking_limit || 0}</td>
                <td style={styles.td}>
                  <button onClick={() => editType(t)} style={{ ...styles.btn('#2563eb'), padding: '4px 10px', fontSize: '11px' }}>Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
