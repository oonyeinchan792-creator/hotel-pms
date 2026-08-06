'use client'
import { useState, useEffect } from 'react'
import {
  getWorkOrders, createWorkOrder, updateWorkOrder, deleteWorkOrder,
  getEquipment, createEquipment, updateEquipment, deleteEquipment,
  getPMSchedules, createPMSchedule, updatePMSchedule, deletePMSchedule, addDays,
  getAccessRecords, createAccessRecord, deleteAccessRecord,
} from '../../lib/maintenance'

const TABS = ['Work Orders', 'Room Maintenance', 'Preventive Maintenance', 'Equipment Status', 'Access Management']

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }
const td = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #e2e8f0' }
const btn = { padding: '8px 14px', background: '#0f2540', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }
const dangerBtn = { ...btn, background: '#dc2626' }
const input = { padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }
const card = { background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }

function priorityStyle(p) {
  if (p === 'urgent') return { bg: '#fee2e2', text: '#991b1b' }
  if (p === 'high') return { bg: '#ffedd5', text: '#9a3412' }
  if (p === 'low') return { bg: '#f1f5f9', text: '#64748b' }
  return { bg: '#fef9c3', text: '#854d0e' }
}
function equipStatusStyle(s) {
  if (s === 'operational') return { bg: '#dcfce7', text: '#166534' }
  if (s === 'needs_repair') return { bg: '#fef9c3', text: '#854d0e' }
  return { bg: '#fee2e2', text: '#991b1b' }
}

export default function MaintenancePage() {
  const [tab, setTab] = useState('Work Orders')

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ color: '#0f2540', marginBottom: 4 }}>Maintenance / Engineering</h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Work orders, preventive maintenance, equipment status and access management
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              color: tab === t ? '#0f2540' : '#64748b',
              borderBottom: tab === t ? '2px solid #0f2540' : '2px solid transparent',
              fontWeight: tab === t ? 'bold' : 'normal',
              fontSize: 14,
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {tab === 'Work Orders' && <WorkOrderBoard />}
      {tab === 'Room Maintenance' && <WorkOrderBoard lockCategory="Room" />}
      {tab === 'Preventive Maintenance' && <PreventiveMaintenanceTab />}
      {tab === 'Equipment Status' && <EquipmentTab />}
      {tab === 'Access Management' && <AccessManagementTab />}
    </div>
  )
}

function WorkOrderBoard({ lockCategory }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({
    title: '', description: '', category: lockCategory || 'General', room_number: '', location: '',
    priority: 'medium', assigned_to: '', reported_by: '', due_date: '',
  })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setOrders(await getWorkOrders())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createWorkOrder({ ...form, status: 'open' })
    setForm({ title: '', description: '', category: lockCategory || 'General', room_number: '', location: '', priority: 'medium', assigned_to: '', reported_by: '', due_date: '' })
    load()
  }
  async function setStatus(o, status) {
    await updateWorkOrder(o.id, { status, completed_at: status === 'completed' ? new Date().toISOString() : null })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this work order?')) return
    await deleteWorkOrder(id)
    load()
  }

  const visible = orders
    .filter((o) => (lockCategory ? o.category === lockCategory : true))
    .filter((o) => (statusFilter === 'all' ? true : o.status === statusFilter))

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        {!lockCategory && (
          <select style={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>General</option>
            <option>Room</option>
            <option>Plumbing</option>
            <option>Electrical</option>
            <option>HVAC</option>
            <option>Equipment</option>
          </select>
        )}
        {(lockCategory === 'Room' || form.category === 'Room') && (
          <input style={input} placeholder="Room #" value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
        )}
        <input style={input} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <select style={input} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
        <input style={input} placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
        <input style={input} placeholder="Reported by" value={form.reported_by} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} />
        <input style={input} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button style={btn} type="submit">Create Work Order</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        {['all', 'open', 'in_progress', 'completed', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              ...input, marginRight: 6, cursor: 'pointer',
              background: statusFilter === s ? '#0f2540' : 'white',
              color: statusFilter === s ? 'white' : '#0f2540',
              border: '1px solid #0f2540',
            }}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Title</th>
              {!lockCategory && <th style={th}>Category</th>}
              <th style={th}>Room/Location</th>
              <th style={th}>Priority</th>
              <th style={th}>Assigned</th>
              <th style={th}>Due</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id}>
                <td style={td}>{o.title}</td>
                {!lockCategory && <td style={td}>{o.category}</td>}
                <td style={td}>{o.room_number || o.location || '-'}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: priorityStyle(o.priority).bg, color: priorityStyle(o.priority).text }}>
                    {o.priority}
                  </span>
                </td>
                <td style={td}>{o.assigned_to || '-'}</td>
                <td style={td}>{o.due_date || '-'}</td>
                <td style={td}>
                  <select value={o.status} onChange={(e) => setStatus(o, e.target.value)} style={{ ...input, padding: 4 }}>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td style={td}><button onClick={() => handleDelete(o.id)} style={dangerBtn}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function PreventiveMaintenanceTab() {
  const [schedules, setSchedules] = useState([])
  const [equipmentList, setEquipmentList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ equipment_id: '', task_name: '', frequency_days: '30', last_done_date: '', assigned_to: '', notes: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [pm, eq] = await Promise.all([getPMSchedules(), getEquipment()])
    setSchedules(pm)
    setEquipmentList(eq)
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    const next_due_date = addDays(form.last_done_date || null, form.frequency_days)
    await createPMSchedule({
      equipment_id: form.equipment_id || null,
      task_name: form.task_name,
      frequency_days: Number(form.frequency_days) || 30,
      last_done_date: form.last_done_date || null,
      next_due_date,
      assigned_to: form.assigned_to,
      notes: form.notes,
    })
    setForm({ equipment_id: '', task_name: '', frequency_days: '30', last_done_date: '', assigned_to: '', notes: '' })
    load()
  }
  async function markDone(s) {
    const last_done_date = new Date().toISOString().split('T')[0]
    const next_due_date = addDays(last_done_date, s.frequency_days)
    await updatePMSchedule(s.id, { last_done_date, next_due_date })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this schedule?')) return
    await deletePMSchedule(id)
    load()
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select style={input} value={form.equipment_id} onChange={(e) => setForm({ ...form, equipment_id: e.target.value })}>
          <option value="">(No specific equipment)</option>
          {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
        </select>
        <input style={input} placeholder="Task (e.g. Filter change)" value={form.task_name} onChange={(e) => setForm({ ...form, task_name: e.target.value })} required />
        <input style={input} placeholder="Every X days" type="number" value={form.frequency_days} onChange={(e) => setForm({ ...form, frequency_days: e.target.value })} required />
        <input style={input} type="date" value={form.last_done_date} onChange={(e) => setForm({ ...form, last_done_date: e.target.value })} />
        <input style={input} placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button style={btn} type="submit">Add Schedule</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Task</th>
              <th style={th}>Equipment</th>
              <th style={th}>Every</th>
              <th style={th}>Last Done</th>
              <th style={th}>Next Due</th>
              <th style={th}>Assigned</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id}>
                <td style={td}>{s.task_name}</td>
                <td style={td}>{s.equipment?.name || '-'}</td>
                <td style={td}>{s.frequency_days}d</td>
                <td style={td}>{s.last_done_date || '-'}</td>
                <td style={td}>
                  <span style={{ color: s.next_due_date && s.next_due_date <= today ? '#dc2626' : 'inherit', fontWeight: s.next_due_date && s.next_due_date <= today ? 'bold' : 'normal' }}>
                    {s.next_due_date || '-'}
                  </span>
                </td>
                <td style={td}>{s.assigned_to || '-'}</td>
                <td style={td}>
                  <button onClick={() => markDone(s)} style={{ ...btn, marginRight: 6 }}>Mark Done</button>
                  <button onClick={() => handleDelete(s.id)} style={dangerBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function EquipmentTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', category: '', location: '', status: 'operational', last_serviced_date: '', notes: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setList(await getEquipment())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createEquipment(form)
    setForm({ name: '', category: '', location: '', status: 'operational', last_serviced_date: '', notes: '' })
    load()
  }
  async function setStatus(eq, status) {
    await updateEquipment(eq.id, { status })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this equipment?')) return
    await deleteEquipment(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Equipment name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="Category (e.g. HVAC)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input style={input} placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input style={input} type="date" value={form.last_serviced_date} onChange={(e) => setForm({ ...form, last_serviced_date: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button style={btn} type="submit">Add Equipment</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Location</th>
              <th style={th}>Last Serviced</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((eq) => (
              <tr key={eq.id}>
                <td style={td}>{eq.name}</td>
                <td style={td}>{eq.category || '-'}</td>
                <td style={td}>{eq.location || '-'}</td>
                <td style={td}>{eq.last_serviced_date || '-'}</td>
                <td style={td}>
                  <select
                    value={eq.status}
                    onChange={(e) => setStatus(eq, e.target.value)}
                    style={{ ...input, padding: 4, background: equipStatusStyle(eq.status).bg, color: equipStatusStyle(eq.status).text }}
                  >
                    <option value="operational">Operational</option>
                    <option value="needs_repair">Needs Repair</option>
                    <option value="out_of_service">Out of Service</option>
                  </select>
                </td>
                <td style={td}><button onClick={() => handleDelete(eq.id)} style={dangerBtn}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function AccessManagementTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ area_name: '', staff_name: '', access_level: 'standard', granted_date: '', expiry_date: '', notes: '' })

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setList(await getAccessRecords())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createAccessRecord(form)
    setForm({ area_name: '', staff_name: '', access_level: 'standard', granted_date: '', expiry_date: '', notes: '' })
    load()
  }
  async function handleRevoke(id) {
    if (!confirm('Revoke/delete this access record?')) return
    await deleteAccessRecord(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Area (e.g. Mechanical Room)" value={form.area_name} onChange={(e) => setForm({ ...form, area_name: e.target.value })} required />
        <input style={input} placeholder="Staff name" value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} required />
        <select style={input} value={form.access_level} onChange={(e) => setForm({ ...form, access_level: e.target.value })}>
          <option value="standard">Standard</option>
          <option value="master">Master</option>
          <option value="restricted">Restricted</option>
        </select>
        <input style={input} type="date" value={form.granted_date} onChange={(e) => setForm({ ...form, granted_date: e.target.value })} />
        <input style={input} type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button style={btn} type="submit">Grant Access</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Area</th>
              <th style={th}>Staff</th>
              <th style={th}>Level</th>
              <th style={th}>Granted</th>
              <th style={th}>Expires</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td style={td}>{a.area_name}</td>
                <td style={td}>{a.staff_name}</td>
                <td style={td}>{a.access_level}</td>
                <td style={td}>{a.granted_date || '-'}</td>
                <td style={td}>{a.expiry_date || '-'}</td>
                <td style={td}><button onClick={() => handleRevoke(a.id)} style={dangerBtn}>Revoke</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
