'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const priorityStyle = {
  low: { bg: '#f3f4f6', color: '#374151' },
  normal: { bg: '#dbeafe', color: '#1e40af' },
  high: { bg: '#fef3c7', color: '#92400e' },
  urgent: { bg: '#fee2e2', color: '#991b1b' },
}
const statusStyle = {
  open: { bg: '#fee2e2', color: '#991b1b', label: 'Open' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  resolved: { bg: '#dcfce7', color: '#166534', label: 'Resolved' },
}

export default function MaintenancePage() {
  const [reports, setReports] = useState([])
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ room_id: '', reported_by: '', issue_description: '', priority: 'normal' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('open')

  async function load() {
    setLoading(true)
    const { data: roomsData } = await supabase.from('rooms').select('id, room_number').order('room_number')
    setRooms(roomsData || [])

    const { data } = await supabase
      .from('maintenance_reports')
      .select('*, rooms(room_number)')
      .order('reported_at', { ascending: false })
    setReports(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addReport(e) {
    e.preventDefault()
    if (!form.room_id || !form.issue_description.trim()) return
    setSaving(true)

    await supabase.from('maintenance_reports').insert(form)

    // also log to room history
    await supabase.from('room_history').insert({
      room_id: form.room_id,
      event_type: 'Maintenance',
      description: form.issue_description,
      logged_by: form.reported_by || null,
    })

    setForm({ room_id: '', reported_by: '', issue_description: '', priority: 'normal' })
    setSaving(false)
    load()
  }

  async function updateStatus(report, newStatus) {
    const update = { status: newStatus }
    if (newStatus === 'resolved') update.resolved_at = new Date().toISOString()
    await supabase.from('maintenance_reports').update(update).eq('id', report.id)

    if (newStatus === 'resolved') {
      await supabase.from('room_history').insert({
        room_id: report.room_id,
        event_type: 'Maintenance',
        description: `Resolved: ${report.issue_description}`,
      })
    }
    load()
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter)
  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: 1, minWidth: '160px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/housekeeping" style={{ color: '#2563eb' }}>&larr; Back to Housekeeping</a>
      <h1 style={{ color: '#0f2540' }}>Maintenance Reports</h1>

      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, fontSize: '14px' }}>Report an Issue</h3>
        <form onSubmit={addReport} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <select style={inputStyle} value={form.room_id} onChange={(e) => setForm({ ...form, room_id: e.target.value })}>
            <option value="">Select room</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
          </select>
          <input style={inputStyle} placeholder="Issue description" value={form.issue_description}
            onChange={(e) => setForm({ ...form, issue_description: e.target.value })} />
          <select style={{ ...inputStyle, maxWidth: '140px' }} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input style={{ ...inputStyle, maxWidth: '160px' }} placeholder="Reported by" value={form.reported_by}
            onChange={(e) => setForm({ ...form, reported_by: e.target.value })} />
          <button type="submit" disabled={saving} style={{ background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            {saving ? 'Saving...' : '+ Report Issue'}
          </button>
        </form>
      </div>

      <div style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
        {['open', 'in_progress', 'resolved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
              background: filter === f ? '#0f2540' : '#e2e8f0',
              color: filter === f ? 'white' : '#374151',
            }}
          >
            {f === 'all' ? 'All' : (statusStyle[f]?.label || f)}
          </button>
        ))}
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: '#6b7280' }}>No reports match this filter.</p>}

      {!loading && filtered.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Room</th>
              <th style={{ padding: '12px' }}>Issue</th>
              <th style={{ padding: '12px' }}>Priority</th>
              <th style={{ padding: '12px' }}>Reported</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const pStyle = priorityStyle[r.priority] || priorityStyle.normal
              const sStyle = statusStyle[r.status] || statusStyle.open
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{r.rooms?.room_number}</td>
                  <td style={{ padding: '12px' }}>{r.issue_description}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: pStyle.bg, color: pStyle.color, padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {r.priority}
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '13px' }}>{new Date(r.reported_at).toLocaleDateString()} {r.reported_by ? `· ${r.reported_by}` : ''}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ background: sStyle.bg, color: sStyle.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {sStyle.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    {r.status === 'open' && (
                      <button onClick={() => updateStatus(r, 'in_progress')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        Start
                      </button>
                    )}
                    {r.status === 'in_progress' && (
                      <button onClick={() => updateStatus(r, 'resolved')} style={{ background: '#16a34a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
                        Resolve
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
