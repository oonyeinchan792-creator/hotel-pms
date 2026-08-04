'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const statusFlow = ['picked_up', 'in_progress', 'ready', 'delivered']
const statusStyle = {
  picked_up: { bg: '#fef3c7', color: '#92400e', label: 'Picked Up' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  ready: { bg: '#e0e7ff', color: '#3730a3', label: 'Ready' },
  delivered: { bg: '#dcfce7', color: '#166534', label: 'Delivered' },
}

export default function LaundryPage() {
  const [orders, setOrders] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ room_id: '', item_count: 1, item_description: '', service_type: 'standard' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: roomsData } = await supabase.from('rooms').select('id, room_number').order('room_number')
    setRooms(roomsData || [])

    const { data } = await supabase
      .from('laundry_orders')
      .select('*, rooms(room_number)')
      .order('picked_up_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addOrder(e) {
    e.preventDefault()
    if (!form.room_id) return
    setSaving(true)
    await supabase.from('laundry_orders').insert({
      room_id: form.room_id,
      item_count: Number(form.item_count) || 1,
      item_description: form.item_description || null,
      service_type: form.service_type,
    })
    setForm({ room_id: '', item_count: 1, item_description: '', service_type: 'standard' })
    setSaving(false)
    load()
  }

  async function advanceStatus(order) {
    const idx = statusFlow.indexOf(order.status)
    const next = statusFlow[idx + 1]
    if (!next) return

    const update = { status: next }
    if (next === 'ready') update.ready_at = new Date().toISOString()
    if (next === 'delivered') update.delivered_at = new Date().toISOString()

    await supabase.from('laundry_orders').update(update).eq('id', order.id)
    load()
  }

  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: 1, minWidth: '140px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/housekeeping" style={{ color: '#2563eb' }}>&larr; Back to Housekeeping</a>
      <h1 style={{ color: '#0f2540' }}>Laundry Status</h1>

      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '14px' }}>New Laundry Order</h3>
        <form onSubmit={addOrder} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select style={inputStyle} value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
            <option value="">Select room</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
          </select>
          <input style={{ ...inputStyle, maxWidth: '90px' }} type="number" min="1" placeholder="Items" value={form.item_count}
            onChange={(e) => setForm({ ...form, item_count: e.target.value })} />
          <input style={inputStyle} placeholder="Description (optional)" value={form.item_description}
            onChange={(e) => setForm({ ...form, item_description: e.target.value })} />
          <select style={{ ...inputStyle, maxWidth: '140px' }} value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })}>
            <option value="standard">Standard</option>
            <option value="express">Express</option>
          </select>
          <button type="submit" disabled={saving} style={{ background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Saving...' : '+ Add Order'}
          </button>
        </form>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && orders.length === 0 && <p style={{ color: '#6b7280' }}>No laundry orders yet.</p>}

      {!loading && orders.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Room</th>
              <th style={{ padding: '12px' }}>Items</th>
              <th style={{ padding: '12px' }}>Service</th>
              <th style={{ padding: '12px' }}>Picked Up</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const style = statusStyle[o.status] || statusStyle.picked_up
              const nextLabel = { picked_up: 'Start Processing', in_progress: 'Mark Ready', ready: 'Mark Delivered' }[o.status]
              return (
                <tr key={o.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{o.rooms?.room_number}</td>
                  <td style={{ padding: '12px' }}>{o.item_count} {o.item_description ? `— ${o.item_description}` : ''}</td>
                  <td style={{ padding: '12px' }}>{o.service_type === 'express' ? '⚡ Express' : 'Standard'}</td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(o.picked_up_at).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {style.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {nextLabel && (
                      <button onClick={() => advanceStatus(o)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        {nextLabel}
                      </button>
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
