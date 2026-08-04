'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function BillingPage() {
  const [reservations, setReservations] = useState([])
  const [guests, setGuests] = useState({})
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: guestData } = await supabase.from('guests').select('*')
      const guestMap = {}
      guestData?.forEach((g) => (guestMap[g.id] = `${g.first_name} ${g.last_name}`))
      setGuests(guestMap)

      const { data: resData } = await supabase
        .from('reservations')
        .select('*, rooms(room_number)')
        .in('status', ['checked_in', 'checked_out'])
        .order('created_at', { ascending: false })
      setReservations(resData || [])

      // Load balance for each reservation's folio
      const balanceMap = {}
      for (const r of resData || []) {
        const { data: folio } = await supabase
          .from('folios')
          .select('id')
          .eq('reservation_id', r.id)
          .maybeSingle()

        if (folio) {
          const { data: txns } = await supabase
            .from('folio_transactions')
            .select('amount, transaction_type')
            .eq('folio_id', folio.id)
          let balance = 0
          txns?.forEach((t) => {
            balance += t.transaction_type === 'payment' ? -Number(t.amount) : Number(t.amount)
          })
          balanceMap[r.id] = { folioId: folio.id, balance }
        } else {
          balanceMap[r.id] = null
        }
      }
      setBalances(balanceMap)

      setLoading(false)
    }
    load()
  }, [])

  return (
    <main style={{ padding: '40px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Billing / Folios</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <a href="/cityledger" style={{ background: '#0f766e', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
            🏢 City Ledger
          </a>
          <a href="/currency" style={{ background: '#b45309', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
            💱 Currency Exchange
          </a>
          <a href="/billing/shift" style={{ background: '#4338ca', color: 'white', padding: '10px 18px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
            🧾 Cash Shift
          </a>
        </div>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && reservations.length === 0 && (
        <p style={{ color: '#6b7280' }}>No checked-in or checked-out guests yet.</p>
      )}

      {!loading && reservations.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Guest</th>
              <th style={{ padding: '12px' }}>Room</th>
              <th style={{ padding: '12px' }}>Status</th>
              <th style={{ padding: '12px' }}>Balance</th>
              <th style={{ padding: '12px' }}></th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => {
              const bal = balances[r.id]
              return (
                <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{guests[r.guest_id] || 'Unknown'}</td>
                  <td style={{ padding: '12px' }}>{r.rooms?.room_number || '—'}</td>
                  <td style={{ padding: '12px' }}>{r.status === 'checked_in' ? 'In House' : 'Checked Out'}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: bal?.balance > 0 ? '#dc2626' : '#16a34a' }}>
                    {bal ? `${bal.balance.toLocaleString()} MMK` : 'No folio yet'}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <a href={`/billing/${r.id}`} style={{ color: '#2563eb', fontWeight: 'bold' }}>
                      Open Folio &rarr;
                    </a>
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
