'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const CURRENCIES = ['USD', 'THB', 'SGD', 'EUR', 'CNY', 'GBP', 'JPY']

export default function CurrencyExchangePage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    currency_code: 'USD',
    foreign_amount: '',
    exchange_rate: '',
    direction: 'buy',
    staff_name: '',
  })

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase.from('currency_exchange_log').select('*').order('created_at', { ascending: false }).limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadLogs()
  }, [])

  const mmkAmount = form.foreign_amount && form.exchange_rate
    ? (Number(form.foreign_amount) * Number(form.exchange_rate)).toFixed(0)
    : 0

  async function submitExchange(e) {
    e.preventDefault()
    setError('')

    if (!form.foreign_amount || !form.exchange_rate) {
      setError('Please fill in amount and exchange rate.')
      return
    }

    const { error: insertError } = await supabase.from('currency_exchange_log').insert({
      currency_code: form.currency_code,
      foreign_amount: Number(form.foreign_amount),
      exchange_rate: Number(form.exchange_rate),
      mmk_amount: Number(mmkAmount),
      direction: form.direction,
      staff_name: form.staff_name || null,
    })

    if (insertError) { setError(insertError.message); return }

    setForm({ ...form, foreign_amount: '', exchange_rate: '' })
    loadLogs()
  }

  const today = new Date().toISOString().split('T')[0]
  const todayLogs = logs.filter((l) => l.created_at.startsWith(today))
  const todayTotal = todayLogs.reduce((sum, l) => sum + Number(l.mmk_amount), 0)

  const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }
  const labelStyle = { fontWeight: 'bold', fontSize: '13px', color: '#374151', display: 'block', marginBottom: '4px' }

  return (
    <main style={{ padding: '30px', maxWidth: '700px' }}>
      <a href="/billing" style={{ color: '#2563eb' }}>&larr; Back to Billing</a>
      <h1 style={{ color: '#0f2540' }}>Currency Exchange</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Log foreign currency exchange transactions</p>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>New Exchange</h3>
        <form onSubmit={submitExchange}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div style={{ flex: '0 1 120px' }}>
              <label style={labelStyle}>Currency</label>
              <select style={inputStyle} value={form.currency_code} onChange={(e) => setForm({ ...form, currency_code: e.target.value })}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <label style={labelStyle}>Direction</label>
              <select style={inputStyle} value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
                <option value="buy">Buy (from guest)</option>
                <option value="sell">Sell (to guest)</option>
              </select>
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <label style={labelStyle}>Foreign Amount</label>
              <input style={inputStyle} type="number" value={form.foreign_amount} onChange={(e) => setForm({ ...form, foreign_amount: e.target.value })} />
            </div>
            <div style={{ flex: '0 1 140px' }}>
              <label style={labelStyle}>Exchange Rate</label>
              <input style={inputStyle} type="number" step="0.01" value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: e.target.value })} placeholder="e.g. 2100" />
            </div>
            <div style={{ flex: '0 1 160px' }}>
              <label style={labelStyle}>Staff Name</label>
              <input style={inputStyle} value={form.staff_name} onChange={(e) => setForm({ ...form, staff_name: e.target.value })} />
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '14px', fontSize: '15px', fontWeight: 'bold' }}>
            MMK Amount: {Number(mmkAmount).toLocaleString()} MMK
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

          <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Log Exchange
          </button>
        </form>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '14px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
        <strong>Today's Total ({todayLogs.length} transaction{todayLogs.length !== 1 ? 's' : ''})</strong>
        <strong>{todayTotal.toLocaleString()} MMK</strong>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && logs.length === 0 && <p style={{ color: '#6b7280' }}>No exchange transactions logged yet.</p>}

      {!loading && logs.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left', fontSize: '12px' }}>
              <th style={{ padding: '10px' }}>Date</th>
              <th style={{ padding: '10px' }}>Currency</th>
              <th style={{ padding: '10px' }}>Direction</th>
              <th style={{ padding: '10px' }}>Foreign Amt</th>
              <th style={{ padding: '10px' }}>Rate</th>
              <th style={{ padding: '10px' }}>MMK</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} style={{ borderTop: '1px solid #e5e7eb', fontSize: '13px' }}>
                <td style={{ padding: '10px' }}>{new Date(l.created_at).toLocaleString()}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{l.currency_code}</td>
                <td style={{ padding: '10px' }}>{l.direction === 'buy' ? 'Buy' : 'Sell'}</td>
                <td style={{ padding: '10px' }}>{Number(l.foreign_amount).toLocaleString()}</td>
                <td style={{ padding: '10px' }}>{l.exchange_rate}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{Number(l.mmk_amount).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
