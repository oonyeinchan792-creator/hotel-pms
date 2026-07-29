'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const taskStatusLabel = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
}

export default function HousekeepingPrintPage() {
  const [tasks, setTasks] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    async function load() {
      const { data: typeData } = await supabase.from('room_types').select('*')
      const typeMap = {}
      typeData?.forEach((t) => (typeMap[t.id] = t.name))
      setRoomTypes(typeMap)

      const { data: taskData } = await supabase
        .from('housekeeping_tasks')
        .select('*, rooms(room_number, floor, room_type_id)')
        .neq('status', 'completed')
        .order('assigned_to')
      setTasks(taskData || [])

      setLoading(false)
    }
    load()
  }, [])

  // Group tasks by staff
  const byStaff = {}
  tasks.forEach((t) => {
    if (!byStaff[t.assigned_to]) byStaff[t.assigned_to] = []
    byStaff[t.assigned_to].push(t)
  })
  const staffNames = Object.keys(byStaff).sort()

  return (
    <main style={{ padding: '30px', maxWidth: '900px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/housekeeping" style={{ color: '#2563eb' }}>&larr; Back to Housekeeping</a>
        <button
          onClick={() => window.print()}
          style={{ background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🖨️ Print
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #0f2540', paddingBottom: '14px' }}>
        <h1 style={{ margin: 0, color: '#0f2540' }}>Grand Hotel</h1>
        <div style={{ fontSize: '14px', color: '#64748b' }}>Housekeeping Task Assignment Sheet</div>
        <div style={{ fontSize: '13px', color: '#64748b' }}>{today}</div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && staffNames.length === 0 && (
        <p style={{ textAlign: 'center', color: '#6b7280' }}>No active assignments to print.</p>
      )}

      {!loading && staffNames.map((staff) => (
        <div key={staff} style={{ marginBottom: '26px', pageBreakInside: 'avoid' }}>
          <div style={{ background: '#0f2540', color: 'white', padding: '8px 14px', fontWeight: 'bold', fontSize: '14px' }}>
            Attendant: {staff} &nbsp;·&nbsp; {byStaff[staff].length} room(s)
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Room</th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Floor</th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Room Type</th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Task Status</th>
                <th style={{ padding: '8px', border: '1px solid #cbd5e1' }}>Completed ✓</th>
              </tr>
            </thead>
            <tbody>
              {byStaff[staff]
                .sort((a, b) => Number(a.rooms?.room_number) - Number(b.rooms?.room_number))
                .map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', fontWeight: 'bold' }}>{t.rooms?.room_number}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{t.rooms?.floor}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{roomTypes[t.rooms?.room_type_id] || ''}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1' }}>{taskStatusLabel[t.status]}</td>
                    <td style={{ padding: '8px', border: '1px solid #cbd5e1', width: '80px' }}></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b' }}>
        <div>Supervisor Signature: ________________________</div>
        <div>Printed: {new Date().toLocaleString()}</div>
      </div>
    </main>
  )
}
