'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function FolioDetailPage() {
  const params = useParams()
  const [reservation, setReservation] = useState(null)
  const [guest, setGuest] = useState(null)
  const [folios, setFolios] = useState([])
  const [activeFolioId, setActiveFolioId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeShift, setActiveShift] = useState(null)
  const [newFolioType, setNewFolioType] = useState('')
  const [showNewFolio, setShowNewFolio] = useState(false)

  const [form, setForm] = useState({
    transaction_type: 'charge',
    description: '',
    amount: '',
    payment_method: 'cash',
  })

  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState('')
  const [transferMsg, setTransferMsg] = useState('')

  async function loadAll(keepActiveFolio) {
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

    // Load ALL folios for this reservation (Multiple Folio support)
    let { data: folioList } = await supabase
      .from('folios')
      .select('*')
      .eq('reservation_id', params.id)
      .order('is_primary', { ascending: false })

    if (!folioList || folioList.length === 0) {
      const { data: newFolio } = await supabase
        .from('folios')
        .insert({ reservation_id: params.id, folio_type: 'Guest Folio', is_primary: true })
        .select()
        .single()
      folioList = [newFolio]
    }
    setFolios(folioList)

    const nextActiveId = keepActiveFolio && folioList.find((f) => f.id === keepActiveFolio)
      ? keepActiveFolio
      : folioList[0].id
    setActiveFolioId(nextActiveId)

    const { data: txnData } = await supabase
      .from('folio_transactions')
      .select('*')
      .eq('folio_id', nextActiveId)
      .order('transaction_date', { ascending: true })
    setTransactions(txnData || [])

    const { data: companyData } = await supabase.from('companies').select('*').order('name')
    setCompanies(companyData || [])

    const { data: shiftData } = await supabase.from('cash_shifts').select('*').eq('status', 'open').maybeSingle()
    setActiveShift(shiftData)

    setLoading(false)
  }

  useEffect(() => {
    if (params.id) loadAll(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function switchFolio(folioId) {
    setActiveFolioId(folioId)
    const { data: txnData } = await supabase
      .from('folio_transactions')
      .select('*')
      .eq('folio_id', folioId)
      .order('transaction_date', { ascending: true })
    setTransactions(txnData || [])
  }

  async function createFolio(e) {
    e.preventDefault()
    if (!newFolioType.trim()) return
    const { data: newFolio } = await supabase
      .from('folios')
      .insert({ reservation_id: params.id, folio_type: newFolioType, is_primary: false })
      .select()
      .single()
    setNewFolioType('')
    setShowNewFolio(false)
    await loadAll(newFolio.id)
  }

  async function addTransaction(e) {
    e.preventDefault()
    setError('')

    if (!form.description || !form.amount) {
      setError('Please fill in description and amount.')
      return
    }

    const isCashOrCard = form.transaction_type === 'payment' || form.transaction_type === 'refund'

    const { error: insertError } = await supabase.from('folio_transactions').insert({
      folio_id: activeFolioId,
      transaction_type: form.transaction_type,
      description: form.description,
      amount: Number(form.amount),
      payment_method: isCashOrCard ? form.payment_method : null,
      shift_id: isCashOrCard && activeShift ? activeShift.id : null,
    })

    if (insertError) {
      setError('Error: ' + insertError.message)
      return
    }

    setForm({ transaction_type: 'charge', description: '', amount: '', payment_method: 'cash' })
    loadAll(activeFolioId)
  }

  function addRoomCharge() {
    if (!reservation?.room_types) return
    setForm({
      transaction_type: 'charge',
      description: `Room Charge - ${reservation.room_types.name}`,
      amount: reservation.room_types.base_rate,
      payment_method: 'cash',
    })
  }

  // Split Folio: move a transaction to a different folio
  async function moveTransaction(txnId, targetFolioId) {
    if (!targetFolioId || targetFolioId === activeFolioId) return
    await supabase.from('folio_transactions').update({ folio_id: targetFolioId }).eq('id', txnId)
    loadAll(activeFolioId)
  }

  const balance = transactions.reduce((sum, t) => {
    if (t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') {
      return sum - Number(t.amount)
    }
    return sum + Number(t.amount) // charge, tax, refund all increase balance owed
  }, 0)

  async function transferToCityLedger() {
    setTransferMsg('')
    if (!selectedCompany) {
      setTransferMsg('Please select a company first.')
      return
    }
    if (balance <= 0) {
      setTransferMsg('No outstanding balance to transfer.')
      return
    }

    await supabase.from('city_ledger_transactions').insert({
      company_id: selectedCompany,
      reservation_id: reservation.id,
      description: `Folio ${activeFolio?.folio_number} — ${guest?.first_name} ${guest?.last_name} — Room ${reservation.rooms?.room_number || ''}`,
      amount: balance,
      transaction_type: 'charge',
    })

    await supabase.from('folio_transactions').insert({
      folio_id: activeFolioId,
      transaction_type: 'payment',
      description: 'Transferred to City Ledger',
      amount: balance,
    })

    setTransferMsg('Balance transferred to City Ledger successfully.')
    loadAll(activeFolioId)
  }

  if (loading) return <main style={{ padding: '40px' }}>Loading...</main>
  if (!reservation) return <main style={{ padding: '40px' }}>Reservation not found.</main>

  const activeFolio = folios.find((f) => f.id === activeFolioId)

  return (
    <main style={{ padding: '40px', maxWidth: '760px' }}>
      <a href="/billing" style={{ color: '#2563eb' }}>&larr; Back to Billing</a>
      <h1>Folio — {guest?.first_name} {guest?.last_name}</h1>
      <p style={{ color: '#6b7280' }}>
        Room {reservation.rooms?.room_number || '—'}
        {activeShift ? ` · Active shift: ${activeShift.cashier_name}` : ' · No active cash shift — payments won\'t be linked to a shift'}
      </p>

      {/* Folio tabs — Multiple Folio */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {folios.map((f) => (
          <button
            key={f.id}
            onClick={() => switchFolio(f.id)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: f.id === activeFolioId ? '2px solid #0f2540' : '1px solid #d1d5db',
              background: f.id === activeFolioId ? '#0f2540' : 'white',
              color: f.id === activeFolioId ? 'white' : '#374151',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {f.folio_type || 'Folio'} #{f.folio_number}
          </button>
        ))}
        <button
          onClick={() => setShowNewFolio(!showNewFolio)}
          style={{ padding: '8px 16px', borderRadius: '6px', border: '1px dashed #94a3b8', background: 'white', color: '#64748b', fontSize: '13px', cursor: 'pointer' }}
        >
          + New Folio
        </button>
      </div>

      {showNewFolio && (
        <form onSubmit={createFolio} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input
            placeholder="e.g. Company Folio, Incidentals"
            value={newFolioType}
            onChange={(e) => setNewFolioType(e.target.value)}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
          />
          <button type="submit" style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Create
          </button>
        </form>
      )}

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0 }}>{activeFolio?.folio_type} — Transactions</h3>

        {transactions.length === 0 && <p style={{ color: '#6b7280' }}>No transactions yet.</p>}

        {transactions.map((t) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', gap: '10px', flexWrap: 'wrap' }}>
            <div>
              <div>{t.description} {t.payment_method && <span style={{ fontSize: '11px', color: '#94a3b8' }}>({t.payment_method})</span>}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{new Date(t.transaction_date).toLocaleString()}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ fontWeight: 'bold', color: (t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') ? '#16a34a' : '#111827' }}>
                {(t.transaction_type === 'payment' || t.transaction_type === 'deposit' || t.transaction_type === 'discount') ? '-' : ''}{Number(t.amount).toLocaleString()} MMK
              </div>
              {folios.length > 1 && (
                <select
                  defaultValue=""
                  onChange={(e) => moveTransaction(t.id, e.target.value)}
                  style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="">Move to...</option>
                  {folios.filter((f) => f.id !== activeFolioId).map((f) => (
                    <option key={f.id} value={f.id}>{f.folio_type} #{f.folio_number}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '14px', marginTop: '10px', borderTop: '2px solid #111827', fontWeight: 'bold', fontSize: '18px' }}>
          <div>Balance Due (this folio)</div>
          <div style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>{balance.toLocaleString()} MMK</div>
        </div>
      </div>

      {companies.length > 0 && balance > 0 && (
        <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', color: '#0f766e' }}>Transfer to City Ledger</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', flex: '1 1 200px' }}>
              <option value="">Select company / travel agent</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button onClick={transferToCityLedger} style={{ background: '#0f766e', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
              Transfer {balance.toLocaleString()} MMK
            </button>
          </div>
          {transferMsg && <p style={{ fontSize: '13px', color: '#0f766e', marginTop: '8px' }}>{transferMsg}</p>}
        </div>
      )}

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
          onClick={() => setForm({ transaction_type: 'deposit', description: 'Advance Deposit', amount: '', payment_method: 'cash' })}
          style={{ marginBottom: '14px', background: '#f3f4f6', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer' }}
        >
          + Quick Add: Advance Deposit
        </button>

        <form onSubmit={addTransaction}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
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

            {(form.transaction_type === 'payment' || form.transaction_type === 'refund') && (
              <select
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Wallet</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            )}

            <input
              placeholder="Description (e.g. Restaurant, Laundry)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              style={{ flex: 1, minWidth: '160px', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }}
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
