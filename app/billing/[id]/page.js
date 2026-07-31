'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function FolioDetailPage() {
  const params = useParams()
  const [reservation, setReservation] = useState(null)
  const [guest, setGuest] = useState(null)
  const [folio, setFolio] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    transaction_type: 'charge',
    description: '',
    amount: '',
  })

  async function loadAll() {
    setLoading(true)

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number), room_types(name, base_rate)')
      .eq('id', params.id)
      .single()
    setReservation(resData)

    if (resData) {
      const { data: guestData } = await supabase.from('guests').select('*').eq('id', resData.guest_id).single()
      setGuest(guestData)
    }

    // Find or create folio
    let { data: folioData } = await supabase
      .from('folios')
      .select('*')
      .eq('reservation_id', params.id)
      .maybeSingle()

    if (!folioData) {
      const { data: newFolio } = await supabase
        .from('folios')
        .insert({ reservation_id: params.id })
        .select()
        .single()
      folioData = newFolio
    }
    setFolio(folioData)

    if (folioData) {
      const { data: txnData } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('folio_id', folioData.id)
        .order('transaction_date', { ascending: true })
      setTransactions(txnData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (params.id) loadAll()
  }, [params.id])

  async function addTransaction(e) {
    e.preventDefault()
    setError('')

    if (!form.description || !form.amount) {
      setError('Please fill in description and amount.')
      return
    }

    const { error: insertError } = await supabase.from('folio_transactions').insert({
      folio_id: folio.id,
      transaction_type: form.transaction_type,
      description: form.description,
      amount: Number(form.amount),
    })

    if (insertError) {
      setError('Error: ' + insertError.message)
      return
    }

    setForm({ transaction_type: 'charge', description: '', amount: '' })
    loadAll()
  }

  function addRoomCharge() {
    if (!reservation?.room_types) return
    setForm({
      transaction_type: 'charge',
      description: `Room Charge - ${reservation.room_types.name}`,
      amount: reservation.room_types.base_rate,
    })
  }

  const balance = transactions.reduce((sum, t) => {
    if (t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') {
      return sum - Number(t.amount)
    }
    return sum + Number(t.amount) // charge, tax, refund all increase balance owed
  }, 0)

  if (loading) return <main style={{ padding: '40px' }}>Loading...</main>
  if (!reservation) return <main style={{ padding: '40px' }}>Reservation not found.</main>

  return (
    <main style={{ padding: '40px', maxWidth: '700px' }}>
      <a href="/billing" style={{ color: '#2563eb' }}>&larr; Back to Billing</a>
      <h1>Folio — {guest?.first_name} {guest?.last_name}</h1>
      <p style={{ color: '#6b7280' }}>
        Room {reservation.rooms?.room_number || '—'} · Folio# {folio?.folio_number}
      </p>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Transactions</h3>

        {transactions.length === 0 && <p style={{ color: '#6b7280' }}>No transactions yet.</p>}

        {transactions.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
            <div>
              <div>{t.description}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(t.transaction_date).toLocaleString()}</div>
            </div>
            <div style={{ fontWeight: 'bold', color: (t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') ? '#16a34a' : '#111827' }}>
              {(t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') ? '-' : ''}{Number(t.amount).toLocaleString()} MMK
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', marginTop: '10px', borderTop: '2px solid #111827', fontWeight: 'bold', fontSize: '18px' }}>
          <div>Balance Due</div>
          <div style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{balance.toLocaleString()} MMK</div>
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ marginTop: 0 }}>Add Transaction</h3>

        <button
          type="button"
          onClick={addRoomCharge}
          style={{ marginBottom: '14px', marginRight: '10px', background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
        >
          + Quick Add: Room Charge
        </button>

        <button
          type="button"
          onClick={() => setForm({ transaction_type: 'deposit', description: 'Advance Deposit', amount: '' })}
          style={{ marginBottom: '14px', background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
        >
          + Quick Add: Advance Deposit
        </button>

        <form onSubmit={addTransaction}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select
              value={form.transaction_type}
              onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            >
              <option value="charge">Charge</option>
              <option value="payment">Payment</option>
              <option value="deposit">Advance Deposit</option>
              <option value="refund">Refund</option>
              <option value="tax">Tax</option>
              <option value="discount">Discount</option>
            </select>
            <input
              placeholder="Description (e.g. Restaurant, Laundry)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
            <input
              placeholder="Amount"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              style={{ width: '140px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
            />
          </div>

          {error && <p style={{ color: '#dc2626' }}>{error}</p>}

          <button
            type="submit"
            style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Add Transaction
          </button>
        </form>
      </div>
    </main>
  )
}
