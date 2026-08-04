'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const statusStyle = {
  stored: { bg: '#dbeafe', color: '#1e40af', label: 'Stored' },
  claimed: { bg: '#dcfce7', color: '#166534', label: 'Claimed' },
  disposed: { bg: '#f3f4f6', color: '#374151', label: 'Disposed' },
}

export default function LostAndFoundPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ item_description: '', found_location: '', found_by: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('lost_and_found').select('*').order('found_date', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addItem(e) {
    e.preventDefault()
    if (!form.item_description.trim()) return
    setSaving(true)
    await supabase.from('lost_and_found').insert(form)
    setForm({ item_description: '', found_location: '', found_by: '' })
    setSaving(false)
    load()
  }

  async function markClaimed(id, claimedBy) {
    await supabase.from('lost_and_found').update({
      status: 'claimed',
      claimed_by: claimedBy || 'Guest',
      claimed_date: new Date().toISOString().split('T')[0],
    }).eq('id', id)
    load()
  }

  async function markDisposed(id) {
    await supabase.from('lost_and_found').update({ status: 'disposed' }).eq('id', id)
    load()
  }

  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: 1, minWidth: '160px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/housekeeping" style={{ color: '#2563eb' }}>&larr; Back to Housekeeping</a>
      <h1 style={{ color: '#0f2540' }}>Lost & Found</h1>

      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '14px' }}>Log a Found Item</h3>
        <form onSubmit={addItem} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input style={inputStyle} placeholder="Item description" value={form.item_description}
            onChange={(e) => setForm({ ...form, item_description: e.target.value })} />
          <input style={inputStyle} placeholder="Found location (e.g. Room 204)" value={form.found_location}
            onChange={(e) => setForm({ ...form, found_location: e.target.value })} />
          <input style={inputStyle} placeholder="Found by (staff name)" value={form.found_by}
            onChange={(e) => setForm({ ...form, found_by: e.target.value })} />
          <button type="submit" disabled={saving} style={{ background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Saving...' : '+ Log Item'}
          </button>
        </form>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && <p style={{ color: '#6b7280' }}>No items logged yet.</p>}

      {!loading && items.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Item</th>
              <th style={{ padding: '12px' }}>Location</th>
              <th style={{ padding: '12px' }}>Found</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const style = statusStyle[it.status] || statusStyle.stored
              return (
                <tr key={it.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{it.item_description}</td>
                  <td style={{ padding: '12px' }}>{it.found_location || '—'}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{it.found_date} {it.found_by ? `· ${it.found_by}` : ''}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {style.label}
                    </span>
                    {it.status === 'claimed' && it.claimed_by && (
                      <span style={{ marginLeft: '6px', fontSize: '12px', color: '#64748b' }}>by {it.claimed_by}</span>
                    )}
                  </td>
                  <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                    {it.status === 'stored' && (
                      <>
                        <button onClick={() => markClaimed(it.id)} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                          Mark Claimed
                        </button>
                        <button onClick={() => markDisposed(it.id)} style={{ background: '#6b7280', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                          Dispose
                        </button>
                      </>
                    )}
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
