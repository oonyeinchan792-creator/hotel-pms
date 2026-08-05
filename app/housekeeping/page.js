'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const statusInfo = {
  vacant_dirty: { bg: '#dc2626', label: 'Dirty' },
  vacant_clean: { bg: '#22d3ee', label: 'Clean' },
  vacant_inspected: { bg: '#16a34a', label: 'Inspected' },
  occupied_dirty: { bg: '#dc2626', label: 'Dirty' },
  occupied_clean: { bg: '#22d3ee', label: 'Clean' },
  occupied_inspected: { bg: '#16a34a', label: 'Inspected' },
  out_of_order: { bg: '#6b7280', label: 'Out of Order' },
  out_of_service: { bg: '#1f2937', label: 'Out of Service' },
}

const taskStatusInfo = {
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  completed: { bg: '#dcfce7', color: '#166534', label: 'Completed' },
}

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [roomClasses, setRoomClasses] = useState({})
  const [reservationsByRoom, setReservationsByRoom] = useState({})
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    roomType: '',
    fromRoom: '',
    toRoom: '',
    floor: '',
  })

  const [roomStatusCheck, setRoomStatusCheck] = useState({
    dirty: true,
    clean: true,
    inspected: true,
    ooo: true,
    oos: true,
  })
  const [foStatusCheck, setFoStatusCheck] = useState({ vacant: true, occupied: true })

  const [selectedRooms, setSelectedRooms] = useState(new Set())
  const [assignStaff, setAssignStaff] = useState('')

  const [attendantNames, setAttendantNames] = useState('')
  const [floorPlan, setFloorPlan] = useState(null)
  const [autoAssigning, setAutoAssigning] = useState(false)

  const [rangeRows, setRangeRows] = useState([{ id: 1, staffName: '', fromRoom: '', toRoom: '' }])
  const [includeCleanRooms, setIncludeCleanRooms] = useState(false)

  const [editingRoom, setEditingRoom] = useState(null)
  const [modalStatus, setModalStatus] = useState('')
  const [bulkMode, setBulkMode] = useState(false)

  async function loadAll() {
    setLoading(true)

    const { data: classData } = await supabase.from('room_classes').select('*')
    const classMap = {}
    classData?.forEach((c) => (classMap[c.id] = c.name))
    setRoomClasses(classMap)

    const { data: typeData } = await supabase.from('room_types').select('*')
    const typeMap = {}
    typeData?.forEach((t) => (typeMap[t.id] = t))
    setRoomTypes(typeMap)

    const { data: roomsData } = await supabase.from('rooms').select('*')
    const sorted = (roomsData || []).sort((a, b) => Number(a.room_number) - Number(b.room_number))
    setRooms(sorted)

    const today = new Date().toISOString().split('T')[0]
    const { data: resData } = await supabase
      .from('reservations')
      .select('room_id, status, check_in_date, check_out_date')
      .in('status', ['reserved', 'checked_in'])
    const resMap = {}
    resData?.forEach((r) => {
      if (!r.room_id) return
      if (r.status === 'checked_in') {
        resMap[r.room_id] = 'Arrived'
      } else if (r.status === 'reserved' && r.check_in_date === today) {
        resMap[r.room_id] = resMap[r.room_id] || 'Arrival'
      }
    })
    setReservationsByRoom(resMap)

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
    setEditingRoom(null)
    loadAll()
  }

  async function updateStatusBulk(roomIds, newStatus) {
    await supabase.from('rooms').update({ status: newStatus }).in('id', roomIds)
    setBulkMode(false)
    setModalStatus('')
    setSelectedRooms(new Set())
    loadAll()
  }

  function openStatusModal(room) {
    setBulkMode(false)
    setEditingRoom(room)
    setModalStatus(room.status)
  }

  function openBulkStatusModal() {
    if (selectedRooms.size === 0) return
    setBulkMode(true)
    setEditingRoom(null)
    setModalStatus('vacant_dirty')
  }

  function closeStatusModal() {
    setEditingRoom(null)
    setBulkMode(false)
    setModalStatus('')
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

  async function cancelAllTasks() {
    const taskIds = tasks.map((t) => t.id)
    if (taskIds.length === 0) return
    await supabase.from('housekeeping_tasks').delete().in('id', taskIds)
    loadAll()
  }

  function addRangeRow() {
    setRangeRows([...rangeRows, { id: Date.now(), staffName: '', fromRoom: '', toRoom: '' }])
  }

  function removeRangeRow(id) {
    setRangeRows(rangeRows.filter((r) => r.id !== id))
  }

  function updateRangeRow(id, field, value) {
    setRangeRows(rangeRows.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function roomsInRange(fromRoom, toRoom) {
    const eligibleRooms = rooms.filter((r) => {
      if (r.status === 'out_of_order' || r.status === 'out_of_service') return false
      if (includeCleanRooms) return true
      return r.status === 'vacant_dirty' || r.status === 'occupied_dirty'
    })
    return eligibleRooms.filter((r) => {
      const num = Number(r.room_number)
      return num >= Number(fromRoom) && num <= Number(toRoom)
    })
  }

  async function submitRangeAssignments() {
    const validRows = rangeRows.filter((r) => r.staffName.trim() && r.fromRoom && r.toRoom)
    if (validRows.length === 0) return

    const inserts = []
    validRows.forEach((row) => {
      const matchedRooms = roomsInRange(row.fromRoom, row.toRoom)
      matchedRooms.forEach((room) => {
        inserts.push({ room_id: room.id, assigned_to: row.staffName.trim(), status: 'pending' })
      })
    })

    if (inserts.length > 0) {
      await supabase.from('housekeeping_tasks').insert(inserts)
    }

    setRangeRows([{ id: Date.now(), staffName: '', fromRoom: '', toRoom: '' }])
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
    const inserts = Array.from(selectedRooms).map((roomId) => ({ room_id: roomId, assigned_to: assignStaff.trim(), status: 'pending' }))
    await supabase.from('housekeeping_tasks').insert(inserts)
    setSelectedRooms(new Set())
    setAssignStaff('')
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
    const floorGroups = {}
    dirtyRooms.forEach((r) => {
      if (!floorGroups[r.floor]) floorGroups[r.floor] = { floor: r.floor, rooms: [], credit: 0 }
      floorGroups[r.floor].rooms.push(r)
      floorGroups[r.floor].credit += roomCredit(r)
    })

    const floorsList = Object.values(floorGroups).sort((a, b) => b.credit - a.credit)
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
          inserts.push({ room_id: room.id, assigned_to: assignment.name, status: 'pending' })
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

  function getCleanType(status) {
    if (status === 'vacant_dirty' || status === 'occupied_dirty') return 'dirty'
    if (status === 'vacant_clean' || status === 'occupied_clean') return 'clean'
    if (status === 'vacant_inspected' || status === 'occupied_inspected') return 'inspected'
    if (status === 'out_of_order') return 'ooo'
    if (status === 'out_of_service') return 'oos'
    return null
  }

  function getOccupancy(status) {
    if (status.startsWith('vacant')) return 'vacant'
    if (status.startsWith('occupied')) return 'occupied'
    return null
  }

  const filteredRooms = rooms.filter((r) => {
    if (filters.roomType && r.room_type_id !== filters.roomType) return false
    if (filters.floor && r.floor !== filters.floor) return false
    if (filters.fromRoom && Number(r.room_number) < Number(filters.fromRoom)) return false
    if (filters.toRoom && Number(r.room_number) > Number(filters.toRoom)) return false

    const cleanType = getCleanType(r.status)
    if (cleanType && !roomStatusCheck[cleanType]) return false

    const occupancy = getOccupancy(r.status)
    if (occupancy && !foStatusCheck[occupancy]) return false

    return true
  })

  const dirtyCount = rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'occupied_dirty').length
  const oooCount = rooms.filter((r) => r.status === 'out_of_order').length
  const oosCount = rooms.filter((r) => r.status === 'out_of_service').length
  const inspectedCount = rooms.filter((r) => r.status === 'vacant_inspected' || r.status === 'occupied_inspected').length
  const floorOptions = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => Number(a) - Number(b))

  const inputStyle = { padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }

  return (
    <main style={{ padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Housekeeping — Room Status</h1>
          <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Filter rooms and assign cleaning tasks in bulk</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a href="/housekeeping/task-sheet" style={{ background: '#0d9488', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>📊 Task Sheet Grid</a>
          <a href="/housekeeping/print" style={{ background: '#0f2540', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>🖨️ Print Assignment Sheet</a>
          <a href="/housekeeping/lostfound" style={{ background: '#be185d', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>🧳 Lost & Found</a>
          <a href="/housekeeping/laundry" style={{ background: '#0891b2', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>👕 Laundry Status</a>
          <a href="/housekeeping/maintenance" style={{ background: '#dc2626', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>🔧 Maintenance</a>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #dc2626' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Needs Cleaning</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{dirtyCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #16a34a' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Inspected</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{inspectedCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #6b7280' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Out of Order</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{oooCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #1f2937' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Out of Service</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{oosCount}</div>
        </div>
        <div style={{ background: 'white', padding: '18px 20px', borderRadius: '6px', borderTop: '3px solid #d97706' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>Active Tasks</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#0f2540' }}>{tasks.length}</div>
        </div>
      </div>

      {!loading && tasks.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '16px', color: '#0f2540', margin: 0 }}>Active Cleaning Tasks</h2>
            <button onClick={cancelAllTasks} style={actionBtn('#dc2626')}>Cancel All Assignments</button>
          </div>
          {tasks.map((t) => {
            const style = taskStatusInfo[t.status] || taskStatusInfo.pending
            return (
              <div key={t.id} style={{ background: 'white', borderRadius: '6px', padding: '12px 14px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong>Room {t.rooms?.room_number}</strong>
                  <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '10px' }}>Assigned to {t.assigned_to}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{style.label}</span>
                  {t.status === 'pending' && <button onClick={() => startTask(t.id)} style={actionBtn('#2563eb')}>Start</button>}
                  {t.status === 'in_progress' && (
                    <button onClick={() => completeTask(t.id, t.room_id, rooms.find(r => r.id === t.room_id)?.status)} style={actionBtn('#16a34a')}>Mark Complete</button>
                  )}
                  <button onClick={() => cancelTask(t.id)} style={actionBtn('#dc2626')}>Cancel</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px' }}>
        <div style={{ background: '#0f2540', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 'bold' }}>
          Quick Assignment — e.g. Aung Aung (101–110), Nilar (201–220)
        </div>
        <div style={{ padding: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontSize: '13px', color: '#0f2540' }}>
            <input type="checkbox" checked={includeCleanRooms} onChange={(e) => setIncludeCleanRooms(e.target.checked)} />
            Include Vacant Clean rooms (for touch-up cleaning)
          </label>
          {rangeRows.map((row) => {
            const preview = row.fromRoom && row.toRoom ? roomsInRange(row.fromRoom, row.toRoom).length : null
            return (
              <div key={row.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                <input placeholder="Staff name" value={row.staffName} onChange={(e) => updateRangeRow(row.id, 'staffName', e.target.value)} style={{ ...inputStyle, flex: '0 1 160px' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>Room</span>
                <input placeholder="From" value={row.fromRoom} onChange={(e) => updateRangeRow(row.id, 'fromRoom', e.target.value)} style={{ ...inputStyle, width: '80px' }} />
                <span style={{ fontSize: '13px', color: '#64748b' }}>–</span>
                <input placeholder="To" value={row.toRoom} onChange={(e) => updateRangeRow(row.id, 'toRoom', e.target.value)} style={{ ...inputStyle, width: '80px' }} />
                {preview !== null && <span style={{ fontSize: '12px', color: '#d97706', fontWeight: 'bold' }}>{preview} room(s)</span>}
                {rangeRows.length > 1 && <button onClick={() => removeRangeRow(row.id)} style={actionBtn('#dc2626')}>Remove</button>}
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button onClick={addRangeRow} style={{ ...actionBtn('#e2e8f0'), color: '#0f2540' }}>+ Add Attendant</button>
            <button onClick={submitRangeAssignments} style={actionBtn('#16a34a')}>Assign All</button>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px' }}>
        <div style={{ background: '#0f2540', color: 'white', padding: '10px 16px', borderRadius: '6px 6px 0 0', fontSize: '13px', fontWeight: 'bold' }}>
          Auto-Assign by Floor (whole floors only — no cross-floor splitting)
        </div>
        <div style={{ padding: '16px' }}>
          <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Attendant names (comma separated)</label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input placeholder="e.g. Mya, Thida, Kyaw, Nilar..." value={attendantNames} onChange={(e) => setAttendantNames(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
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
                      <td style={{ padding: '8px' }}>{a.floors.length === 0 ? '—' : a.floors.map((f) => `Floor ${f.floor}`).join(', ')}</td>
                      <td style={{ padding: '8px' }}>{a.floors.reduce((sum, f) => sum + f.rooms.length, 0)}</td>
                      <td style={{ padding: '8px' }}>{a.totalCredit.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                <button onClick={confirmFloorPlan} disabled={autoAssigning} style={actionBtn('#16a34a')}>{autoAssigning ? 'Assigning...' : 'Confirm & Create Tasks'}</button>
                <button onClick={() => setFloorPlan(null)} style={actionBtn('#6b7280')}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Panel — Opera style with boxed checkbox groups */}
      <div style={{ background: '#0f2540', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '16px', padding: '14px 16px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ border: '1px solid #f59e0b', borderRadius: '4px', padding: '8px 12px', background: '#0f2540' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '6px' }}>Room Status</div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { key: 'clean', label: 'Clean', color: '#22d3ee' },
              { key: 'dirty', label: 'Dirty', color: '#f87171' },
              { key: 'inspected', label: 'Inspected', color: '#4ade80' },
              { key: 'ooo', label: 'Out of Order', color: '#9ca3af' },
              { key: 'oos', label: 'Out of Service', color: '#d1d5db' },
            ].map((item) => (
              <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: item.color, fontWeight: 'bold' }}>
                <input type="checkbox" checked={roomStatusCheck[item.key]} onChange={(e) => setRoomStatusCheck({ ...roomStatusCheck, [item.key]: e.target.checked })} />
                {item.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ border: '1px solid #f59e0b', borderRadius: '4px', padding: '8px 12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#f59e0b', marginBottom: '6px' }}>FO Status</div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'white' }}>
              <input type="checkbox" checked={foStatusCheck.vacant} onChange={(e) => setFoStatusCheck({ ...foStatusCheck, vacant: e.target.checked })} /> Vacant
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'white' }}>
              <input type="checkbox" checked={foStatusCheck.occupied} onChange={(e) => setFoStatusCheck({ ...foStatusCheck, occupied: e.target.checked })} /> Occupied
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Room Type</label>
            <select style={inputStyle} value={filters.roomType} onChange={(e) => setFilters({ ...filters, roomType: e.target.value })}>
              <option value="">All Types</option>
              {Object.entries(roomTypes).map(([id, t]) => <option key={id} value={id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>From Room</label>
            <input style={{ ...inputStyle, width: '90px' }} value={filters.fromRoom} onChange={(e) => setFilters({ ...filters, fromRoom: e.target.value })} placeholder="101" />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>To Room</label>
            <input style={{ ...inputStyle, width: '90px' }} value={filters.toRoom} onChange={(e) => setFilters({ ...filters, toRoom: e.target.value })} placeholder="2010" />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>Floor</label>
            <select style={inputStyle} value={filters.floor} onChange={(e) => setFilters({ ...filters, floor: e.target.value })}>
              <option value="">All Floors</option>
              {floorOptions.map((f) => <option key={f} value={f}>Floor {f}</option>)}
            </select>
          </div>
          <button
            onClick={() => {
              setFilters({ roomType: '', fromRoom: '', toRoom: '', floor: '' })
              setRoomStatusCheck({ dirty: true, clean: true, inspected: true, ooo: true, oos: true })
              setFoStatusCheck({ vacant: true, occupied: true })
            }}
            style={{ ...actionBtn('#e2e8f0'), color: '#0f2540' }}
          >
            Clear
          </button>
        </div>
      </div>

      {selectedRooms.size > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fdba74', borderRadius: '6px', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '13px' }}>{selectedRooms.size} room(s) selected</strong>
          <button onClick={openBulkStatusModal} style={actionBtn('#7c3aed')}>Change Status for Selected</button>
          <input placeholder="Staff name" value={assignStaff} onChange={(e) => setAssignStaff(e.target.value)} style={{ ...inputStyle, flex: '0 1 200px' }} />
          <button onClick={assignSelected} style={actionBtn('#0f2540')}>Assign Task to Selected</button>
          <button onClick={() => setSelectedRooms(new Set())} style={actionBtn('#6b7280')}>Clear Selection</button>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {!loading && filteredRooms.length === 0 && <p style={{ color: '#6b7280' }}>No rooms match this filter.</p>}

      {/* Opera-style dense grid */}
      {!loading && filteredRooms.length > 0 && (
        <div style={{ border: '2px solid #f59e0b', borderRadius: '4px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#0f2540', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px' }}>
                  <input type="checkbox" checked={selectedRooms.size === filteredRooms.length} onChange={() => toggleSelectAll(filteredRooms)} />
                </th>
                <th style={{ padding: '6px 8px' }}>Room</th>
                <th style={{ padding: '6px 8px' }}>Rm. Type</th>
                <th style={{ padding: '6px 8px' }}>Room Class</th>
                <th style={{ padding: '6px 8px' }}>Room Status</th>
                <th style={{ padding: '6px 8px' }}>FO Status</th>
                <th style={{ padding: '6px 8px' }}>Reservation Status</th>
                <th style={{ padding: '6px 8px' }}>Floor</th>
                <th style={{ padding: '6px 8px' }}>Task</th>
              </tr>
            </thead>
            <tbody>
              {filteredRooms.map((room) => {
                const cleanType = getCleanType(room.status)
                const hasTask = assignedRoomIds.has(room.id)
                const info = statusInfo[room.status] || { bg: '#9ca3af', label: room.status }
                const roomTypeObj = roomTypes[room.room_type_id]
                const className = roomTypeObj?.room_class_id ? roomClasses[roomTypeObj.room_class_id] : ''
                const resStatus = reservationsByRoom[room.id] || 'Not Reserved'

                const rowBg = {
                  dirty: '#fee2e2',
                  clean: '#cffafe',
                  inspected: '#dcfce7',
                  ooo: '#e5e7eb',
                  oos: '#d1d5db',
                }[cleanType] || 'white'

                return (
                  <tr key={room.id} style={{ borderTop: '1px solid #e2e8f0', background: rowBg }}>
                    <td style={{ padding: '5px 8px' }}>
                      <input type="checkbox" checked={selectedRooms.has(room.id)} onChange={() => toggleRoomSelect(room.id)} />
                    </td>
                    <td style={{ padding: '5px 8px', fontWeight: 'bold', color: '#0f2540' }}>{room.room_number}</td>
                    <td style={{ padding: '5px 8px' }}>{roomTypeObj?.name || ''}</td>
                    <td style={{ padding: '5px 8px' }}>{className || 'MAIN'}</td>
                    <td style={{ padding: '5px 8px' }}>
                      <span
                        onClick={() => openStatusModal(room)}
                        style={{
                          display: 'inline-block', minWidth: '80px', padding: '3px 8px', borderRadius: '3px',
                          background: info.bg, color: 'white', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer',
                        }}
                        title="Click to change status"
                      >
                        {info.label}
                      </span>
                    </td>
                    <td style={{ padding: '5px 8px', color: room.status.startsWith('occupied') ? '#dc2626' : '#16a34a', fontWeight: 'bold' }}>
                      {room.status.startsWith('occupied') ? 'OCC' : 'VAC'}
                    </td>
                    <td style={{ padding: '5px 8px' }}>
                      {resStatus === 'Arrived' ? (
                        <span style={{ background: '#fde047', color: '#713f12', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px' }}>Arrived</span>
                      ) : resStatus === 'Arrival' ? (
                        <span style={{ background: '#bfdbfe', color: '#1e40af', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '11px' }}>Arrival</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>Not Reserved</span>
                      )}
                    </td>
                    <td style={{ padding: '5px 8px' }}>{room.floor}</td>
                    <td style={{ padding: '5px 8px', color: hasTask ? '#d97706' : '#9ca3af', fontWeight: hasTask ? 'bold' : 'normal' }}>
                      {hasTask ? 'Assigned' : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {/* Room Status change — popup modal (single room or bulk) */}
      {(editingRoom || bulkMode) && (
        <div
          onClick={closeStatusModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,37,64,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '8px', padding: '24px', width: '360px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}
          >
            {bulkMode ? (
              <>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f2540', marginBottom: '4px' }}>
                  Change Status — {selectedRooms.size} Room(s)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                  This will set the same status for all selected rooms.
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f2540', marginBottom: '4px' }}>
                  Room {editingRoom.room_number}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                  {roomTypes[editingRoom.room_type_id]?.name} · Floor {editingRoom.floor}
                </div>
              </>
            )}

            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Room Status
            </label>
            <select
              value={modalStatus}
              onChange={(e) => setModalStatus(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '13px', marginBottom: '20px', boxSizing: 'border-box' }}
            >
              <option value="vacant_dirty">Vacant Dirty</option>
              <option value="vacant_clean">Vacant Clean</option>
              <option value="vacant_inspected">Vacant Inspected</option>
              <option value="occupied_dirty">Occupied Dirty</option>
              <option value="occupied_clean">Occupied Clean</option>
              <option value="occupied_inspected">Occupied Inspected</option>
              <option value="out_of_order">Out of Order</option>
              <option value="out_of_service">Out of Service</option>
            </select>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={closeStatusModal} style={{ background: '#e2e8f0', color: '#0f2540', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => bulkMode ? updateStatusBulk(Array.from(selectedRooms), modalStatus) : updateStatus(editingRoom.id, modalStatus)}
                style={{ background: '#0f2540', color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {bulkMode ? `Save for ${selectedRooms.size} Room(s)` : 'Save'}
              </button>
            </div>
          </div>
        </div>
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
