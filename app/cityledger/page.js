'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function CityLedgerPage() {
  const [companies, setCompanies] = useState([])
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ name: '', type: 'company', contact_person: '', phone: '', email: '', credit_limit: '' })
  const [showForm, setShowForm] = useState(false)

  async function loadAll() {
    setLoading(true)

    const { data: companyData } = await supabase.from('companies').select('*').order('name')
    setCompanies(companyData || [])

    const { data: txnData } = await supabase.from('city_ledger_transactions').select('company_id, amount')
    const balMap = {}
    txnData?.forEach((t) => {
      balMap[t.company_id] = (balMap[t.company_id] || 0) + Number(t.amount)
    })
    setBalances(balMap)

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function submitCompany(e) {
    e.preventDefault()
    setError('')
    if (!form.name) { setError('Company name is required.'); return }

    const { error: insertError } = await supabase.from('companies').insert({
      name: form.name,
      type: form.type,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : null,
    })

    if (insertError) { setError(insertError.message); return }

    setForm({ name: '', type: 'company', contact_person: '', phone: '', email: '', credit_limit: '' })
    setShowForm(false)
    loadAll()
  }

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px' }

  return (
    <main style={{ padding: '30px' }}>
      <a href="/billing" style={{ color: '#2563eb' }}>&larr; Back to Billing</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: '#0f2540', marginBottom: '4px' }}>City Ledger</h1>
          <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Company and travel agent direct-billing accounts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + New Company
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <form onSubmit={submitCompany}>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={labelStyle}>Company Name *</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="company">Company</option>
                  <option value="travel_agent">Travel Agent</option>
                </select>
              </div>
              <div style={{ flex: '1 1 180px' }}>
                <label style={labelStyle}>Contact Person</label>
                <input style={inputStyle} value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div style={{ flex: '0 1 160px' }}>
                <label style={labelStyle}>Credit Limit (MMK)</label>
                <input style={inputStyle} type="number" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
              </div>
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
            <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Save Company
            </button>
          </form>
        </div>
      )}

      {loading && <p>Loading...</p>}
      {!loading && companies.length === 0 && <p style={{ color: '#6b7280' }}>No companies yet. Click "New Company" to add one.</p>}

      {!loading && companies.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Company</th>
              <th style={{ padding: '12px' }}>Type</th>
              <th style={{ padding: '12px' }}>Contact</th>
              <th style={{ padding: '12px' }}>Credit Limit</th>
              <th style={{ padding: '12px' }}>Balance Owed</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => {
              const balance = balances[c.id] || 0
              return (
                <tr key={c.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ padding: '12px' }}>{c.type === 'travel_agent' ? 'Travel Agent' : 'Company'}</td>
                  <td style={{ padding: '12px' }}>{c.contact_person || '—'}</td>
                  <td style={{ padding: '12px' }}>{c.credit_limit ? Number(c.credit_limit).toLocaleString() + ' MMK' : '—'}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                    {balance.toLocaleString()} MMK
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/cityledger/${c.id}`} style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '13px' }}>View Statement &rarr;</a>
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
