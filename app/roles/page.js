'use client'
import { useState, useEffect } from 'react'
import {
  MODULES, getRoles, createRole, deleteRole,
  getPermissionsForRole, setRolePermissions,
  getStaffList, assignStaffRole,
} from '../../lib/roles'

const TABS = ['Roles', 'Permission Matrix', 'Staff Assignment']

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }
const td = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #e2e8f0' }
const btn = { padding: '8px 14px', background: '#0f2540', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }
const dangerBtn = { ...btn, background: '#dc2626' }
const input = { padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }
const card = { background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }

export default function RolesPage() {
  const [tab, setTab] = useState('Roles')

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ color: '#0f2540', marginBottom: 4 }}>Roles & Permissions</h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Define positions (e.g. Front Office Manager, Cashier) and control which modules each can access
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

      {tab === 'Roles' && <RolesTab />}
      {tab === 'Permission Matrix' && <PermissionsTab />}
      {tab === 'Staff Assignment' && <StaffTab />}
    </div>
  )
}

function RolesTab() {
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setRoles(await getRoles())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createRole(form)
    setForm({ name: '', description: '' })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this role? Staff assigned to it will lose access until reassigned.')) return
    await deleteRole(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Role name (e.g. Front Office Manager)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button style={btn} type="submit">Add Role</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Role</th>
              <th style={th}>Description</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id}>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.description || '-'}</td>
                <td style={td}><button onClick={() => handleDelete(r.id)} style={dangerBtn}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function PermissionsTab() {
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [checked, setChecked] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadRoles() }, [])
  useEffect(() => { if (selectedRoleId) loadPermissions(selectedRoleId) }, [selectedRoleId])

  async function loadRoles() {
    const r = await getRoles()
    setRoles(r)
    if (r.length > 0) setSelectedRoleId(r[0].id)
    setLoading(false)
  }
  async function loadPermissions(roleId) {
    const perms = await getPermissionsForRole(roleId)
    const map = {}
    perms.forEach((p) => { map[p.module_key] = true })
    setChecked(map)
  }
  function toggle(key) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }
  async function handleSave() {
    setSaving(true)
    const keys = Object.keys(checked).filter((k) => checked[k])
    await setRolePermissions(selectedRoleId, keys)
    setSaving(false)
    alert('Permissions saved')
  }

  if (loading) return <div>Loading...</div>
  if (roles.length === 0) return <div style={{ color: '#64748b' }}>Create a role first in the Roles tab.</div>

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <select style={input} value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button style={btn} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Permissions'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
        {MODULES.map((m) => (
          <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, ...card, cursor: 'pointer' }}>
            <input type="checkbox" checked={!!checked[m.key]} onChange={() => toggle(m.key)} />
            <span style={{ fontSize: 14 }}>{m.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function StaffTab() {
  const [staff, setStaff] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    const [s, r] = await Promise.all([getStaffList(), getRoles()])
    setStaff(s)
    setRoles(r)
    setLoading(false)
  }
  async function handleAssign(staffId, roleId) {
    await assignStaffRole(staffId, roleId)
    load()
  }

  return (
    <div>
      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Username</th>
              <th style={th}>Account Type</th>
              <th style={th}>Assigned Position (Role)</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td style={td}>{s.full_name}</td>
                <td style={td}>{s.username}</td>
                <td style={td}>{s.role === 'admin' ? 'Admin (full access)' : 'Staff'}</td>
                <td style={td}>
                  {s.role === 'admin' ? (
                    <span style={{ color: '#64748b', fontSize: 13 }}>N/A — admin has full access</span>
                  ) : (
                    <select style={input} value={s.role_id || ''} onChange={(e) => handleAssign(s.id, e.target.value)}>
                      <option value="">(No role — Dashboard only)</option>
                      {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
