'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function NewGroupPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    group_name: '',
    group_leader_name: '',
    group_leader_phone: '',
    company_id: '',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('companies').select('*').order('name')
      setCompanies(data || [])
    }
    load()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.group_name) { setError('Group name is required.'); return }

    setSaving(true)
    const { data, error: insertError } = await supabase.from('groups').insert({
      group_name: form.group_name,
      group_leader_name: form.group_leader_name || null,
      group_leader_phone: form.group_leader_phone || null,
      company_id: form.company_id || null,
      notes: form.notes || null,
    }).select().single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/reservations/group/${data.id}`)
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '14px', color: '#374151' }
  const fieldWrap = { marginBottom: '16px' }

  return (
    <main style={{ padding: '30px', maxWidth: '600px' }}>
      <a href="/reservations/group" style={{ color: '#2563eb' }}>&larr; Back to Groups</a>
      <h1 style={{ color: '#0f2540' }}>New Group</h1>

      <form onSubmit={handleSubmit}>
        <div style={fieldWrap}>
          <label style={labelStyle}>Group Name *</label>
          <input style={inputStyle} value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} placeholder="e.g. ABC Company Conference 2026" />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Group Leader Name</label>
          <input style={inputStyle} value={form.group_leader_name} onChange={(e) => setForm({ ...form, group_leader_name: e.target.value })} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Group Leader Phone</label>
          <input style={inputStyle} value={form.group_leader_phone} onChange={(e) => setForm({ ...form, group_leader_phone: e.target.value })} />
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Company / Travel Agent (optional, for City Ledger billing)</label>
          <select style={inputStyle} value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}>
            <option value="">None (individual billing)</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={fieldWrap}>
          <label style={labelStyle}>Notes</label>
          <textarea style={{ ...inputStyle, minHeight: '70px' }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        {error && <p style={{ color: '#dc2626' }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ background: '#16a34a', color: 'white', padding: '14px 24px', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer', width: '100%' }}
        >
          {saving ? 'Creating...' : 'Create Group'}
        </button>
      </form>
    </main>
  )
}
