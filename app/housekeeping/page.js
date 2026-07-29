'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const statusInfo = {
  vacant_clean: { bg: '#16a34a', label: 'Vacant Clean' },
  vacant_dirty: { bg: '#eab308', label: 'Vacant Dirty' },
  occupied_clean: { bg: '#2563eb', label: 'Occupied Clean' },
  occupied_dirty: { bg: '#dc2626', label: 'Occupied Dirty' },
  out_of_order: { bg: '#6b7280', label: 'Out of Order' },
}

const taskStatusInfo = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed: { bg: '#dcfce7', color: '#166534', label: 'Completed' },
}

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    roomType: '',
    fromRoom: '',
    toRoom: '',
    floor: '',
    statusFilter: 'needs_attention',
  })

  const [selectedRooms, setSelectedRooms] = useState(new Set())
  const [assignStaff, setAssignStaff] = useState('')
  const [showAssignBar, setShowAssignBar] = useState(false)

  const [attendantNames, setAttendantNames] = useState('')
  const [floorPlan, setFloorPlan] = useState(null) // preview before confirming
  const [autoAssigning, setAutoAssigning] = useState(false)

  async function loadAll() {
    setLoading(true)

    const { data: typeData } = await supabase.from('room_types').select('*')
    const typeMap = {}
    typeData?.forEach((t) => (typeMap[t.id] = t.name))
    setRoomTypes(typeMap)

    const { data: roomsData } = await supabase.from('rooms').select('*')
    const sorted = (roomsData || []).sort((a, b) => Number(a.room_number) - Number(b.room_number))
    setRooms(sorted)

    const { data: taskData } = await supabase
      .from('housekeeping_tasks')
      .select('*, rooms(room_number)')
      .neq('status', 'completed')
      .order('created_at', { ascending: false })
    setTasks(taskData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function updateStatus(roomId, newStatus) {
    await supabase.from('rooms').update({ status: newStatus }).eq('id', roomId)
    loadAll()
  }

  async function startTask(taskId) {
    await supabase.from('housekeeping_tasks').update({ status: 'in_progress', started_at: new Date().toISOString() }).eq('id', taskId)
    loadAll()
  }

  async function completeTask(taskId, roomId, currentRoomStatus) {
    await supabase.from('housekeeping_tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', taskId)
    const newRoomStatus = currentRoomStatus === 'occupied_dirty' ? 'occupied_clean' : 'vacant_clean'
    await supabase.from('rooms').update({ status: newRoomStatus }).eq('id', roomId)
    loadAll()
  }

  async function cancelTask(taskId) {
    await supabase.from('housekeeping_tasks').delete().eq('id', taskId)
    loadAll()
  }

  function toggleRoomSelect(roomId) {
    const next = new Set(selectedRooms)
    if (next.has(roomId)) next.delete(roomId)
    else next.add(roomId)
    setSelectedRooms(next)
  }

  function toggleSelectAll(filteredRooms) {
    if (selectedRooms.size === filteredRooms.length) {
      setSelectedRooms(new Set())
    } else {
      setSelectedRooms(new Set(filteredRooms.map((r) => r.id)))
    }
  }

  async function assignSelected() {
    if (!assignStaff.trim() || selectedRooms.size === 0) return

    const inserts = Array.from(selectedRooms).map((roomId) => ({
      room_id: roomId,
      assigned_to: assignStaff.trim(),
      status: 'pending',
    }))

    await supabase.from('housekeeping_tasks').insert(inserts)
    setSelectedRooms(new Set())
    setAssignStaff('')
    setShowAssignBar(false)
    loadAll()
  }

  function roomCredit(room) {
    if (room.status === 'vacant_dirty') return 1.0
    if (room.status === 'occupied_dirty') return 0.5
    return 0
  }

  function generateFloorPlan() {
    const names = attendantNames.split(',').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return

    const dirtyRooms = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'occupied_dirty')

    // Group rooms by floor, compute credit per floor
    const floorGroups = {}
    dirtyRooms.forEach((r) => {
      if (!floorGroups[r.floor]) floorGroups[r.floor] = { floor: r.floor, rooms: [], credit: 0 }
      floorGroups[r.floor].rooms.push(r)
      floorGroups[r.floor].credit += roomCredit(r)
    })

    // Sort floors by credit descending (largest first for better balance)
    const floorsList = Object.values(floorGroups).sort((a, b) => b.credit - a.credit)

    // Greedy: assign each WHOLE floor to the attendant with the lowest current total
    const assignments = names.map((name) => ({ name, floors: [], totalCredit: 0 }))

    floorsList.forEach((floorGroup) => {
      assignments.sort((a, b) => a.totalCredit - b.totalCredit)
      assignments[0].floors.push(floorGroup)
      assignments[0].totalCredit += floorGroup.credit
    })

    setFloorPlan(assignments)
  }

  async function confirmFloorPlan() {
    if (!floorPlan) return
    setAutoAssigning(true)

    const inserts = []
    floorPlan.forEach((assignment) => {
      assignment.floors.forEach((floorGroup) => {
        floorGroup.rooms.forEach((room) => {
          inserts.push({
            room_id: room.id,
            assigned_to: assignment.name,
            status: 'pending',
          })
        })
      })
    })

    if (inserts.length > 0) {
      await supabase.from('housekeeping_tasks').insert(inserts)
    }

    setFloorPlan(null)
    setAttendantNames('')
    setAutoAssigning(false)
    loadAll()
  }

  const assignedRoomIds = new Set(tasks.map((t) => t.room_id))

  const filteredRooms = rooms.filter((r) => {
    if (filters.roomType && r.room_type_id !== filters.roomType) return false
    if (filters.floor && r.floor !== filters.floor) return false
    if (filters.fromRoom && Number(r.room_number) < Number(filters.fromRoom)) return false
    if (filters.toRoom && Number(r.room_number) > Number(filters.toRoom)) return false
    if (filters.statusFilter === 'needs_attention') {
      return r.status === 'vacant_dirty' || r.status === 'occupied_dirty'
    }
    if (filters.statusFilter === 'out_of_order') return r.status === 'out_of_order'
    return true
  })

  const dirtyCount = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'occupied_dirty').length
  const oooCount = rooms.filter((r) => r.status === 'out_of_order').length
  const floorOptions = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => Number(a) - Number(b))

  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }

  return (
    <main style={{ padding: '30px' }}>
      <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Housekeeping — Task Assignment</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Filter rooms and assign cleaning tasks in bulk</p>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', marginTop: '20px' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #dc2626' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Needs Cleaning</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{dirtyCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #6b7280' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Out of Order</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{oooCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #d97706' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Tasks</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{tasks.length}</div>
        </div>
      </div>

      {/* Active Tasks */}
      {!loading && tasks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', color: '#0f2540' }}>Active Cleaning Tasks</h2>
          {tasks.map((t) => {
            const style = taskStatusInfo[t.status] || taskStatusInfo.pending
            return (
              <div key={t.id} style={{ background: 'white', borderRadius: '6px', padding: '12px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>Room {t.rooms?.room_number}</strong>
                  <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '10px' }}>Assigned to {t.assigned_to}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                    {style.label}
                  </span>
                  {t.status === 'pending' && (
                    <button onClick={() => startTask(t.id)} style={actionBtn('#2563eb')}>Start</button>
                  )}
                  {t.status === 'in_progress' && (
                    <button onClick={() => completeTask(t.id, t.room_id, rooms.find(r => r.id === t.room_id)?.status)} style={actionBtn('#16a34a')}>
                      Mark Complete
                    </button>
                  )}
                  <button onClick={() => cancelTask(t.id)} style={actionBtn('#dc2626')}>Cancel</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-Assign by Floor */}
      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px' }}>
        <div style={{ background: '#0f2540', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 'bold' }}>
          Auto-Assign by Floor (whole floors only — no cross-floor splitting)
        </div>
        <div style={{ padding: '16px' }}>
          <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
            Attendant names (comma separated)
          </label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input
              placeholder="e.g. Mya, Thida, Kyaw, Nilar..."
              value={attendantNames}
              onChange={(e) => setAttendantNames(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={generateFloorPlan} style={actionBtn('#0f2540')}>Generate Floor Plan</button>
          </div>

          {floorPlan && (
            <div style={{ marginTop: '14px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Attendant</th>
                    <th style={{ padding: '8px' }}>Assigned Floor(s)</th>
                    <th style={{ padding: '8px' }}>Rooms</th>
                    <th style={{ padding: '8px' }}>Total Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {floorPlan.map((a) => (
                    <tr key={a.name} style={{ borderTop: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{a.name}</td>
                      <td style={{ padding: '8px' }}>
                        {a.floors.length === 0 ? '—' : a.floors.map((f) => `Floor ${f.floor}`).join(', ')}
                      </td>
                      <td style={{ padding: '8px' }}>{a.floors.reduce((sum, f) => sum + f.rooms.length, 0)}</td>
                      <td style={{ padding: '8px' }}>{a.totalCredit.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <button onClick={confirmFloorPlan} disabled={autoAssigning} style={actionBtn('#16a34a')}>
                  {autoAssigning ? 'Assigning...' : 'Confirm & Create Tasks'}
                </button>
                <button onClick={() => setFloorPlan(null)} style={actionBtn('#6b7280')}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel - Oracle Opera style */}
      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px' }}>
        <div style={{ background: '#0f2540', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 'bold' }}>
          Filter
        </div>
        <div style={{ padding: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Room Type</label>
            <select style={inputStyle} value={filters.roomType} onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}>
              <option value="">All Types</option>
              {Object.entries(roomTypes).map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>From Room</label>
            <input style={{ ...inputStyle, width: '90px' }} value={filters.fromRoom} onChange={(e) => setFilters({ ...filters, fromRoom: e.target.value })} placeholder="101" />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>To Room</label>
            <input style={{ ...inputStyle, width: '90px' }} value={filters.toRoom} onChange={(e) => setFilters({ ...filters, toRoom: e.target.value })} placeholder="2010" />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Floor</label>
            <select style={inputStyle} value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
              <option value="">All Floors</option>
              {floorOptions.map((f) => (
                <option key={f} value={f}>Floor {f}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Status</label>
            <select style={inputStyle} value={filters.statusFilter} onChange={(e) => setFilters({ ...filters, statusFilter: e.target.value })}>
              <option value="needs_attention">Needs Cleaning</option>
              <option value="out_of_order">Out of Order</option>
              <option value="all">All Rooms</option>
            </select>
          </div>
          <button
            onClick={() => setFilters({ roomType: '', fromRoom: '', toRoom: '', floor: '', statusFilter: 'needs_attention' })}
            style={{ ...actionBtn('#e2e8f0'), color: '#0f2540' }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Bulk assign bar */}
      {selectedRooms.size > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '13px' }}>{selectedRooms.size} room(s) selected</strong>
          <input
            placeholder="Staff name"
            value={assignStaff}
            onChange={(e) => setAssignStaff(e.target.value)}
            style={{ ...inputStyle, flex: '0 1 200px' }}
          />
          <button onClick={assignSelected} style={actionBtn('#0f2540')}>Assign Task to Selected</button>
          <button onClick={() => setSelectedRooms(new Set())} style={actionBtn('#6b7280')}>Clear Selection</button>
        </div>
      )}

      {loading && <p>Loading...</p>}

      {!loading && filteredRooms.length === 0 && (
        <p style={{ color: '#6b7280' }}>No rooms match this filter.</p>
      )}

      {/* Table view - Oracle Opera style grid */}
      {!loading && filteredRooms.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
          <thead>
            <tr style={{ background: '#0f2540', color: 'white', textAlign: 'left', fontSize: '13px' }}>
              <th style={{ padding: '10px' }}>
                <input type="checkbox" checked={selectedRooms.size === filteredRooms.length} onChange={() => toggleSelectAll(filteredRooms)} />
              </th>
              <th style={{ padding: '10px' }}>Room</th>
              <th style={{ padding: '10px' }}>Floor</th>
              <th style={{ padding: '10px' }}>Room Type</th>
              <th style={{ padding: '10px' }}>Status</th>
              <th style={{ padding: '10px' }}>Task</th>
              <th style={{ padding: '10px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room) => {
              const info = statusInfo[room.status] || { bg: '#9ca3af', label: room.status }
              const hasTask = assignedRoomIds.has(room.id)
              return (
                <tr key={room.id} style={{ borderTop: '1px solid #e2e8f0', fontSize: '13px' }}>
                  <td style={{ padding: '10px' }}>
                    <input type="checkbox" checked={selectedRooms.has(room.id)} onChange={() => toggleRoomSelect(room.id)} />
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{room.room_number}</td>
                  <td style={{ padding: '10px' }}>{room.floor}</td>
                  <td style={{ padding: '10px' }}>{roomTypes[room.room_type_id]}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: info.bg, color: 'white', padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>
                      {info.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px', color: hasTask ? '#d97706' : '#9ca3af', fontSize: '12px' }}>
                    {hasTask ? 'Assigned' : '—'}
                  </td>
                  <td style={{ padding: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {(room.status === 'vacant_dirty' || room.status === 'occupied_dirty') && (
                      <button onClick={() => updateStatus(room.id, room.status === 'vacant_dirty' ? 'vacant_clean' : 'occupied_clean')} style={actionBtn('#16a34a')}>
                        Mark Clean
                      </button>
                    )}
                    {room.status !== 'out_of_order' && (
                      <button onClick={() => updateStatus(room.id, 'out_of_order')} style={actionBtn('#6b7280')}>OOO</button>
                    )}
                    {room.status === 'out_of_order' && (
                      <button onClick={() => updateStatus(room.id, 'vacant_clean')} style={actionBtn('#2563eb')}>Return</button>
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

function actionBtn(color) {
  return {
    background: color,
    color: 'white',
    border: 'none',
    padding: '6px 10px',
    borderRadius: '5px',
    fontSize: '12px',
    cursor: 'pointer',
  }
}
