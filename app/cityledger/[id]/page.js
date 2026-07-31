'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function CompanyStatementPage() {
  const params = useParams()
  const [company, setCompany] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({ transaction_type: 'payment', description: '', amount: '' })

  async function loadAll() {
    setLoading(true)

    const { data: companyData } = await supabase.from('companies').select('*').eq('id', params.id).single()
    setCompany(companyData)

    const { data: txnData } = await supabase
      .from('city_ledger_transactions')
      .select('*')
      .eq('company_id', params.id)
      .order('created_at', { ascending: true })
    setTransactions(txnData || [])

    setLoading(false)
  }

  useEffect(() => {
    if (params.id) loadAll()
  }, [params.id])

  async function addTransaction(e) {
    e.preventDefault()
    setError('')
    if (!form.description || !form.amount) { setError('Please fill in description and amount.'); return }

    const amount = form.transaction_type === 'payment' ? -Math.abs(Number(form.amount)) : Math.abs(Number(form.amount))

    const { error: insertError } = await supabase.from('city_ledger_transactions').insert({
      company_id: params.id,
      description: form.description,
      amount,
      transaction_type: form.transaction_type,
    })

    if (insertError) { setError(insertError.message); return }

    setForm({ transaction_type: 'payment', description: '', amount: '' })
    loadAll()
  }

  const balance = transactions.reduce((sum, t) => sum + Number(t.amount), 0)

  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }

  if (loading) return <main style={{ padding: '30px' }}>Loading...</main>
  if (!company) return <main style={{ padding: '30px' }}>Company not found.</main>

  return (
    <main style={{ padding: '30px', maxWidth: '700px' }}>
      <a href="/cityledger" style={{ color: '#2563eb' }}>&larr; Back to City Ledger</a>
      <h1 style={{ color: '#0f2540' }}>{company.name}</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>
        {company.type === 'travel_agent' ? 'Travel Agent' : 'Company'} Account Statement
      </p>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Transactions</h3>
        {transactions.length === 0 && <p style={{ color: '#6b7280' }}>No transactions yet.</p>}
        {transactions.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div>{t.description}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{ fontWeight: 'bold', color: Number(t.amount) < 0 ? '#16a34a' : '#111827' }}>
              {Number(t.amount) < 0 ? '' : '+'}{Number(t.amount).toLocaleString()} MMK
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', marginTop: '10px', borderTop: '2px solid #111827', fontWeight: 'bold', fontSize: '18px' }}>
          <div>Balance Owed</div>
          <div style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{balance.toLocaleString()} MMK</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Add Transaction</h3>
        <form onSubmit={addTransaction}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <select value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })} style={inputStyle}>
              <option value="charge">Charge (transferred from folio)</option>
              <option value="payment">Payment Received</option>
            </select>
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              placeholder="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={{ ...inputStyle, width: '140px' }}
            />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
          <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Add Transaction
          </button>
        </form>
      </div>
    </main>
  )
}
