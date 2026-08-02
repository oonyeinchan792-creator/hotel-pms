'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function NightAuditPage() {
  const [businessDate, setBusinessDate] = useState('')
  const [inHouse, setInHouse] = useState([])
  const [totalRooms, setTotalRooms] = useState(0)
  const [postedToday, setPostedToday] = useState(false)
  const [trialBalance, setTrialBalance] = useState(null)
  const [stats, setStats] = useState(null)
  const [auditHistory, setAuditHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [running, setRunning] = useState(false)
  const [staffName, setStaffName] = useState('')

  async function loadAll() {
    setLoading(true)

    const { data: settings } = await supabase.from('hotel_settings').select('*').eq('id', 1).single()
    setBusinessDate(settings?.business_date || '')

    const { data: roomsData } = await supabase.from('rooms').select('id, status')
    setTotalRooms(roomsData?.length || 0)

    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number), room_types(base_rate)')
      .eq('status', 'checked_in')
    setInHouse(resData || [])

    const { data: postedCheck } = await supabase
      .from('folio_transactions')
      .select('id')
      .eq('description', `Room Charge — ${settings?.business_date}`)
      .limit(1)
    setPostedToday((postedCheck || []).length > 0)

    const { data: allTxns } = await supabase.from('folio_transactions').select('transaction_type, amount')
    const tb = { charge: 0, tax: 0, discount: 0, payment: 0, deposit: 0, refund: 0 }
    allTxns?.forEach((t) => {
      tb[t.transaction_type] = (tb[t.transaction_type] || 0) + Number(t.amount)
    })
    const debits = tb.charge + tb.tax + tb.refund
    const credits = tb.payment + tb.deposit + tb.discount
    setTrialBalance({ ...tb, debits, credits })

    const { data: historyData } = await supabase.from('night_audit_log').select('*').order('created_at', { ascending: false }).limit(10)
    setAuditHistory(historyData || [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function postRoomCharges() {
    setRunning(true)
    setMessage('')

    let count = 0
    let totalRevenue = 0

    for (const r of inHouse) {
      let { data: folio } = await supabase.from('folios').select('id').eq('reservation_id', r.id).maybeSingle()
      if (!folio) {
        const { data: newFolio } = await supabase.from('folios').insert({ reservation_id: r.id }).select().single()
        folio = newFolio
      }

      const rate = Number(r.room_types?.base_rate || 0)
      await supabase.from('folio_transactions').insert({
        folio_id: folio.id,
        transaction_type: 'charge',
        description: `Room Charge — ${businessDate}`,
        amount: rate,
      })
      count++
      totalRevenue += rate
    }

    setMessage(`Posted room charges for ${count} room(s), total ${totalRevenue.toLocaleString()} MMK.`)
    setPostedToday(true)
    setRunning(false)
    loadAll()
  }

  function calculateStats() {
    const occupied = inHouse.length
    const occupancyPct = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0
    const roomRevenueToday = inHouse.reduce((sum, r) => sum + Number(r.room_types?.base_rate || 0), 0)
    const adr = occupied > 0 ? roomRevenueToday / occupied : 0
    const revpar = totalRooms > 0 ? roomRevenueToday / totalRooms : 0
    setStats({ occupied, totalRooms, occupancyPct, roomRevenueToday, adr, revpar })
  }

  async function runEndOfDay() {
    if (!postedToday) {
      setMessage('Please post room charges before running end of day.')
      return
    }

    setRunning(true)
    setMessage('')

    const { data: noShowCandidates } = await supabase
      .from('reservations')
      .select('id')
      .eq('status', 'reserved')
      .lte('check_in_date', businessDate)

    let noShowCount = 0
    if (noShowCandidates && noShowCandidates.length > 0) {
      const ids = noShowCandidates.map((r) => r.id)
      await supabase.from('reservations').update({ status: 'no_show' }).in('id', ids)
      noShowCount = ids.length
    }

    const occupied = inHouse.length
    const occupancyPct = totalRooms > 0 ? (occupied / totalRooms) * 100 : 0
    const roomRevenueToday = inHouse.reduce((sum, r) => sum + Number(r.room_types?.base_rate || 0), 0)
    const adr = occupied > 0 ? roomRevenueToday / occupied : 0
    const revpar = totalRooms > 0 ? roomRevenueToday / totalRooms : 0

    await supabase.from('night_audit_log').insert({
      audit_date: businessDate,
      rooms_charged: occupied,
      total_room_revenue: roomRevenueToday,
      no_shows_marked: noShowCount,
      occupancy_pct: occupancyPct.toFixed(2),
      adr: adr.toFixed(2),
      revpar: revpar.toFixed(2),
      run_by: staffName || null,
    })

    const nextDate = new Date(businessDate + 'T00:00:00')
    nextDate.setDate(nextDate.getDate() + 1)
    const nextDateStr = nextDate.toISOString().split('T')[0]
    await supabase.from('hotel_settings').update({ business_date: nextDateStr }).eq('id', 1)

    setMessage(`End of Day complete. Business date advanced to ${nextDateStr}. ${noShowCount} no-show(s) marked.`)
    setRunning(false)
    loadAll()
  }

  const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db' }

  return (
    <main style={{ padding: '30px', maxWidth: '800px' }}>
      <a href="/" style={{ color: '#2563eb' }}>&larr; Back to Dashboard</a>
      <h1 style={{ color: '#0f2540' }}>Night Audit</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>
        Current Business Date: <strong>{businessDate}</strong>
      </p>

      {message && (
        <p style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '6px', color: '#92400e' }}>{message}</p>
      )}

      {loading && <p>Loading...</p>}

      {!loading && (
        <>
          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Step 1 — Revenue Posting</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Post room charges for all {inHouse.length} in-house guest(s) for {businessDate}.
            </p>
            <button
              onClick={postRoomCharges}
              disabled={running || postedToday}
              style={{ background: postedToday ? '#9ca3af' : '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: postedToday ? 'default' : 'pointer' }}
            >
              {postedToday ? '✓ Room Charges Posted' : 'Post Room Charges'}
            </button>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Step 2 — Trial Balance</h3>
            {trialBalance && (
              <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr><td style={{ padding: '6px 0' }}>Charges</td><td style={{ textAlign: 'right' }}>{trialBalance.charge.toLocaleString()} MMK</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Tax</td><td style={{ textAlign: 'right' }}>{trialBalance.tax.toLocaleString()} MMK</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Refunds</td><td style={{ textAlign: 'right' }}>{trialBalance.refund.toLocaleString()} MMK</td></tr>
                  <tr style={{ borderTop: '1px solid #e5e7eb', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>Total Debits</td><td style={{ textAlign: 'right' }}>{trialBalance.debits.toLocaleString()} MMK</td></tr>
                  <tr><td style={{ padding: '6px 0', paddingTop: '10px' }}>Payments</td><td style={{ textAlign: 'right', paddingTop: '10px' }}>{trialBalance.payment.toLocaleString()} MMK</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Deposits</td><td style={{ textAlign: 'right' }}>{trialBalance.deposit.toLocaleString()} MMK</td></tr>
                  <tr><td style={{ padding: '6px 0' }}>Discounts</td><td style={{ textAlign: 'right' }}>{trialBalance.discount.toLocaleString()} MMK</td></tr>
                  <tr style={{ borderTop: '1px solid #e5e7eb', fontWeight: 'bold' }}><td style={{ padding: '6px 0' }}>Total Credits</td><td style={{ textAlign: 'right' }}>{trialBalance.credits.toLocaleString()} MMK</td></tr>
                  <tr style={{ borderTop: '2px solid #111827', fontWeight: 'bold', fontSize: '15px' }}>
                    <td style={{ padding: '8px 0' }}>Outstanding Balance (AR)</td>
                    <td style={{ textAlign: 'right', color: (trialBalance.debits - trialBalance.credits) > 0 ? '#dc2626' : '#16a34a' }}>
                      {(trialBalance.debits - trialBalance.credits).toLocaleString()} MMK
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Step 3 — Statistics</h3>
            <button onClick={calculateStats} style={{ background: '#0d9488', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '14px' }}>
              Calculate Today's Statistics
            </button>
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Occupancy</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f2540' }}>{stats.occupancyPct.toFixed(1)}%</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{stats.occupied}/{stats.totalRooms} rooms</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>Room Revenue</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f2540' }}>{stats.roomRevenueToday.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>MMK</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ADR</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f2540' }}>{stats.adr.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>MMK/occupied room</div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '6px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>RevPAR</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f2540' }}>{stats.revpar.toLocaleString()}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>MMK/available room</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Step 4 — End of Day / Business Date Change</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              This will mark unarrived reservations as no-show and advance the business date to the next day.
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                placeholder="Your name (audit run by)"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                style={{ ...inputStyle, flex: '0 1 220px' }}
              />
              <button
                onClick={runEndOfDay}
                disabled={running || !postedToday}
                style={{ background: '#dc2626', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {running ? 'Running...' : 'Run End of Day'}
              </button>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '8px', padding: '20px' }}>
            <h3 style={{ marginTop: 0 }}>Recent Audit History</h3>
            {auditHistory.length === 0 && <p style={{ color: '#6b7280', fontSize: '13px' }}>No audits run yet.</p>}
            {auditHistory.map((a) => (
              <div key={a.id} style={{ borderTop: '1px solid #e5e7eb', padding: '8px 0', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{a.audit_date} · {a.rooms_charged} rooms · Occ {a.occupancy_pct}% · ADR {Number(a.adr).toLocaleString()}</span>
                <span style={{ color: '#9ca3af' }}>{a.run_by || '—'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
