'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const displayTypes = [
  { key: 'dirty', label: 'Dirty', color: '#dc2626' },
  { key: 'clean', label: 'Clean', color: '#0e7490' },
  { key: 'inspected', label: 'Inspected', color: '#16a34a' },
  { key: 'ooo', label: 'Out of Order', color: '#6b7280' },
  { key: 'oos', label: 'Out of Service', color: '#1f2937' },
]

function getCleanType(status) {
  if (status === 'vacant_dirty' || status === 'occupied_dirty') return 'dirty'
  if (status === 'vacant_clean' || status === 'occupied_clean') return 'clean'
  if (status === 'vacant_inspected') return 'inspected'
  if (status === 'out_of_order') return 'ooo'
  if (status === 'out_of_service') return 'oos'
  return null
}

function roomCredit(status) {
  if (status === 'vacant_dirty') return 1.0
  if (status === 'occupied_dirty') return 0.5
  return 0.3 // touch-up credit for clean/inspected re-checks
}

export default function TaskSheetGridPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [display, setDisplay] = useState({ dirty: true, clean: true, inspected: true, ooo: true, oos: true })

  useEffect(() => {
    async function load() {
      const { data: taskData } = await supabase
        .from('housekeeping_tasks')
        .select('*, rooms(room_number, status)')
        .neq('status', 'completed')
      setTasks(taskData || [])
      setLoading(false)
    }
    load()
  }, [])

  // Group by attendant
  const byStaff = {}
  tasks.forEach((t) => {
    const roomStatus = t.rooms?.status
    const cleanType = getCleanType(roomStatus)
    if (cleanType && !display[cleanType]) return // filtered out by display toggle

    if (!byStaff[t.assigned_to]) byStaff[t.assigned_to] = []
    byStaff[t.assigned_to].push({ ...t, cleanType, credit: roomCredit(roomStatus) })
  })

  const staffColumns = Object.entries(byStaff).map(([name, rooms]) => ({
    name,
    rooms: rooms.sort((a, b) => Number(a.rooms?.room_number) - Number(b.rooms?.room_number)),
    totalCredit: rooms.reduce((sum, r) => sum + r.credit, 0),
  }))

  const linenChangeTotal = tasks.filter((t) => getCleanType(t.rooms?.status) === 'dirty').length

  return (
    <main style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Housekeeping Task Sheet Grid</h1>
          <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Assignment overview by attendant</p>
        </div>
        <a href="/housekeeping" style={{ color: '#2563eb', fontSize: '14px' }}>&larr; Back to Housekeeping</a>
      </div>

      {/* Display filter bar - Opera style */}
      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px 16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '13px', color: '#0f2540' }}>Display:</strong>
          {displayTypes.map((d) => (
            <label key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: d.color, fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={display[d.key]}
                onChange={(e) => setDisplay({ ...display, [d.key]: e.target.checked })}
              />
              {d.label}
            </label>
          ))}
        </div>
        <div style={{ fontSize: '13px', color: '#0f2540', fontWeight: 'bold' }}>
          Linen Change Total for the Day: {linenChangeTotal}
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && staffColumns.length === 0 && (
        <p style={{ color: '#6b7280' }}>No active task assignments. Go to Housekeeping to assign tasks.</p>
      )}

      {/* Multi-column grid - one column per attendant */}
      {!loading && staffColumns.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
          {staffColumns.map((col) => (
            <div key={col.name} style={{ minWidth: '150px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}>
              <div style={{ background: '#0f2540', color: 'white', padding: '8px 10px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                {col.name}
                <div style={{ fontSize: '10px', fontWeight: 'normal', color: '#94a3b8' }}>Rms {col.rooms.length}</div>
              </div>

              {col.rooms.map((r) => {
                const typeColor = displayTypes.find((d) => d.key === r.cleanType)?.color || '#9ca3af'
                return (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '12px',
                      background: typeColor,
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  >
                    <span>{r.rooms?.room_number}</span>
                    <span>{r.credit.toFixed(1)}</span>
                  </div>
                )
              })}

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderTop: '2px solid #0f2540', fontSize: '12px', fontWeight: 'bold', color: '#0f2540' }}>
                <span>Credits</span>
                <span>{col.totalCredit.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
