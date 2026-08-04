'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const styles = {
  page: { padding: '30px', maxWidth: '800px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  label: { color: '#64748b' },
  value: { color: '#0f2540', fontWeight: 'bold' },
  input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', marginTop: '4px' },
  fieldLabel: { fontSize: '13px', fontWeight: 'bold', color: '#374151' },
  fieldWrap: { marginBottom: '14px' },
  btn: (color) => ({ background: color, color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }),
  badge: (bg, color) => ({ background: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }),
};

export default function CashShiftPage() {
  const [activeShift, setActiveShift] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [openForm, setOpenForm] = useState({ cashier_name: '', opening_balance: '' })
  const [closeForm, setCloseForm] = useState({ closing_balance: '', notes: '' })
  const [closedSummary, setClosedSummary] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: shift } = await supabase
      .from('cash_shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .maybeSingle()
    setActiveShift(shift)

    if (shift) {
      const { data: txns } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('shift_id', shift.id)
        .order('transaction_date', { ascending: true })
      setTransactions(txns || [])
    } else {
      setTransactions([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openShift(e) {
    e.preventDefault()
    setError('')
    if (!openForm.cashier_name.trim()) {
      setError('Please enter the cashier name.')
      return
    }
    setSaving(true)
    const { error: insertError } = await supabase.from('cash_shifts').insert({
      cashier_name: openForm.cashier_name,
      opening_balance: Number(openForm.opening_balance) || 0,
      status: 'open',
    })
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }
    setOpenForm({ cashier_name: '', opening_balance: '' })
    setSaving(false)
    load()
  }

  // Totals for the closure summary
  const cashPayments = transactions.filter((t) => t.transaction_type === 'payment' && (t.payment_method || 'cash') === 'cash')
  const cardPayments = transactions.filter((t) => t.transaction_type === 'payment' && t.payment_method === 'card')
  const otherPayments = transactions.filter((t) => t.transaction_type === 'payment' && t.payment_method && t.payment_method !== 'cash' && t.payment_method !== 'card')
  const refunds = transactions.filter((t) => t.transaction_type === 'refund')

  const cashTotal = cashPayments.reduce((s, t) => s + Number(t.amount), 0)
  const cardTotal = cardPayments.reduce((s, t) => s + Number(t.amount), 0)
  const otherTotal = otherPayments.reduce((s, t) => s + Number(t.amount), 0)
  const refundTotal = refunds.reduce((s, t) => s + Number(t.amount), 0)

  const expectedCash = activeShift ? Number(activeShift.opening_balance) + cashTotal - refundTotal : 0

  async function closeShift(e) {
    e.preventDefault()
    setError('')
    if (closeForm.closing_balance === '') {
      setError('Please enter the counted closing cash balance.')
      return
    }
    setSaving(true)

    const actual = Number(closeForm.closing_balance)
    const variance = actual - expectedCash

    await supabase
      .from('cash_shifts')
      .update({
        status: 'closed',
        closing_balance: actual,
        closed_at: new Date().toISOString(),
        notes: closeForm.notes || null,
      })
      .eq('id', activeShift.id)

    setClosedSummary({
      cashierName: activeShift.cashier_name,
      openingBalance: Number(activeShift.opening_balance),
      cashTotal, cardTotal, otherTotal, refundTotal,
      expectedCash, actualCash: actual, variance,
    })

    setSaving(false)
    setCloseForm({ closing_balance: '', notes: '' })
    load()
  }

  if (loading) return <main style={styles.page}>Loading...</main>

  return (
    <div style={styles.page}>
      <a href="/billing" style={styles.back}>&larr; Back to Billing</a>
      <h1 style={styles.title}>Cash Shift</h1>

      {closedSummary && (
        <div style={{ ...styles.card, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '10px' }}>
            Shift Closed — Cashier Closure Summary
          </div>
          <div style={styles.row}><span style={styles.label}>Cashier</span><span style={styles.value}>{closedSummary.cashierName}</span></div>
          <div style={styles.row}><span style={styles.label}>Opening Balance</span><span style={styles.value}>{closedSummary.openingBalance.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Cash Payments</span><span style={styles.value}>{closedSummary.cashTotal.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Card Payments</span><span style={styles.value}>{closedSummary.cardTotal.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Other Payments</span><span style={styles.value}>{closedSummary.otherTotal.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Refunds</span><span style={styles.value}>-{closedSummary.refundTotal.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Expected Cash</span><span style={styles.value}>{closedSummary.expectedCash.toLocaleString()} MMK</span></div>
          <div style={styles.row}><span style={styles.label}>Actual Counted Cash</span><span style={styles.value}>{closedSummary.actualCash.toLocaleString()} MMK</span></div>
          <div style={{ ...styles.row, borderBottom: 'none' }}>
            <span style={styles.label}>Variance</span>
            <span style={{ ...styles.value, color: closedSummary.variance === 0 ? '#16a34a' : (closedSummary.variance > 0 ? '#2563eb' : '#dc2626') }}>
              {closedSummary.variance > 0 ? '+' : ''}{closedSummary.variance.toLocaleString()} MMK
              {closedSummary.variance === 0 ? ' (Balanced)' : closedSummary.variance > 0 ? ' (Over)' : ' (Short)'}
            </span>
          </div>
        </div>
      )}

      {!activeShift ? (
        <div style={styles.card}>
          <div style={{ fontWeight: 'bold', color: '#0f2540', marginBottom: '10px' }}>No Active Shift — Open One to Begin</div>
          <form onSubmit={openShift}>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel}>Cashier Name *</label>
              <input style={styles.input} value={openForm.cashier_name} onChange={(e) => setOpenForm({ ...openForm, cashier_name: e.target.value })} />
            </div>
            <div style={styles.fieldWrap}>
              <label style={styles.fieldLabel}>Opening Cash Balance (MMK)</label>
              <input style={styles.input} type="number" min="0" value={openForm.opening_balance} onChange={(e) => setOpenForm({ ...openForm, opening_balance: e.target.value })} />
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
            <button type="submit" style={styles.btn('#16a34a')} disabled={saving}>
              {saving ? 'Opening...' : 'Open Shift'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', color: '#0f2540' }}>Active Shift</div>
              <span style={styles.badge('#dcfce7', '#166534')}>Open</span>
            </div>
            <div style={styles.row}><span style={styles.label}>Cashier</span><span style={styles.value}>{activeShift.cashier_name}</span></div>
            <div style={styles.row}><span style={styles.label}>Opened At</span><span style={styles.value}>{new Date(activeShift.opened_at).toLocaleString()}</span></div>
            <div style={styles.row}><span style={styles.label}>Opening Balance</span><span style={styles.value}>{Number(activeShift.opening_balance).toLocaleString()} MMK</span></div>
            <div style={styles.row}><span style={styles.label}>Cash Payments So Far</span><span style={styles.value}>{cashTotal.toLocaleString()} MMK</span></div>
            <div style={styles.row}><span style={styles.label}>Card Payments So Far</span><span style={styles.value}>{cardTotal.toLocaleString()} MMK</span></div>
            <div style={{ ...styles.row, borderBottom: 'none' }}><span style={styles.label}>Expected Cash Now</span><span style={styles.value}>{expectedCash.toLocaleString()} MMK</span></div>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              Note: to attribute a payment to this shift, add "shift_id" when posting it from the Folio page (payment method + shift linking can be refined further as needed).
            </p>
          </div>

          <div style={styles.card}>
            <div style={{ fontWeight: 'bold', color: '#0f2540', marginBottom: '10px' }}>Close Shift — Cashier Closure</div>
            <form onSubmit={closeShift}>
              <div style={styles.fieldWrap}>
                <label style={styles.fieldLabel}>Counted Closing Cash Balance (MMK) *</label>
                <input style={styles.input} type="number" value={closeForm.closing_balance} onChange={(e) => setCloseForm({ ...closeForm, closing_balance: e.target.value })} />
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.fieldLabel}>Notes (optional)</label>
                <input style={styles.input} value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} />
              </div>
              {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}
              <button type="submit" style={styles.btn('#dc2626')} disabled={saving}>
                {saving ? 'Closing...' : 'Close Shift'}
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
