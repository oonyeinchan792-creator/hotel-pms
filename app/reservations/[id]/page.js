'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const statusStyle = {
  reserved: { bg: '#dbeafe', color: '#1e40af', label: 'Reserved' },
  checked_in: { bg: '#dcfce7', color: '#166534', label: 'Checked In' },
  checked_out: { bg: '#f3f4f6', color: '#374151', label: 'Checked Out' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
}

const styles = {
  page: { padding: '30px', maxWidth: '700px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  label: { color: '#64748b' },
  value: { color: '#0f2540', fontWeight: 'bold' },
  actionsCard: { display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' },
  btn: { border: 'none', padding: '10px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', color: 'white' },
  reasonBox: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '10px', boxSizing: 'border-box' },
};

export default function ReservationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [reservation, setReservation] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [roomTypeName, setRoomTypeName] = useState('')
  const [loading, setLoading] = useState(true)
  const [pendingAction, setPendingAction] = useState(null) // 'cancelled' | 'no_show'
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data: resData } = await supabase
      .from('reservations')
      .select('*, rooms(room_number), rate_plans(code, name)')
      .eq('id', params.id)
      .single()

    setReservation(resData)

    if (resData?.guest_id) {
      const { data: guestData } = await supabase.from('guests').select('*').eq('id', resData.guest_id).single()
      if (guestData) setGuestName(`${guestData.first_name} ${guestData.last_name}`)
    }

    if (resData?.room_type_id) {
      const { data: typeData } = await supabase.from('room_types').select('name').eq('id', resData.room_type_id).single()
      if (typeData) setRoomTypeName(typeData.name)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function confirmStatusChange() {
    setSaving(true)
    await supabase
      .from('reservations')
      .update({
        status: pendingAction,
        status_reason: reason || null,
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', params.id)

    setSaving(false)
    setPendingAction(null)
    setReason('')
    load()
  }

  if (loading) return <main style={styles.page}>Loading...</main>
  if (!reservation) return <main style={styles.page}>Reservation not found.</main>

  const style = statusStyle[reservation.status] || statusStyle.reserved
  const canCancelOrNoShow = reservation.status === 'reserved' || reservation.status === 'checked_in'

  return (
    <div style={styles.page}>
      <a href="/reservations" style={styles.back}>&larr; Back to Reservations</a>
      <h1 style={styles.title}>Reservation {reservation.confirmation_number}</h1>
      <span style={{ background: style.bg, color: style.color, padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
        {style.label}
      </span>

      <div style={styles.card}>
        <div style={styles.row}><span style={styles.label}>Guest</span><span style={styles.value}>{guestName || '—'}</span></div>
        <div style={styles.row}><span style={styles.label}>Room Type</span><span style={styles.value}>{roomTypeName || '—'}</span></div>
        <div style={styles.row}><span style={styles.label}>Room</span><span style={styles.value}>{reservation.rooms?.room_number || 'Not assigned'}</span></div>
        <div style={styles.row}><span style={styles.label}>Check-in</span><span style={styles.value}>{reservation.check_in_date}</span></div>
        <div style={styles.row}><span style={styles.label}>Check-out</span><span style={styles.value}>{reservation.check_out_date}</span></div>
        <div style={styles.row}><span style={styles.label}>Adults / Children</span><span style={styles.value}>{reservation.adults} / {reservation.children}</span></div>
        <div style={styles.row}><span style={styles.label}>Rate Code</span><span style={styles.value}>{reservation.rate_plans ? `${reservation.rate_plans.code} — ${reservation.rate_plans.name}` : 'Standard rate'}</span></div>
        <div style={styles.row}><span style={styles.label}>Agreed Rate</span><span style={styles.value}>{reservation.agreed_rate ? `${Number(reservation.agreed_rate).toLocaleString()} MMK/night` : '—'}</span></div>
        <div style={styles.row}><span style={styles.label}>Deposit</span><span style={styles.value}>
          {reservation.deposit_amount > 0
            ? `${Number(reservation.deposit_amount).toLocaleString()} MMK (${reservation.deposit_paid ? 'Collected' : 'Not yet collected'})`
            : 'None'}
        </span></div>
        <div style={{ ...styles.row, borderBottom: 'none' }}><span style={styles.label}>Booking Source</span><span style={styles.value}>{reservation.source}</span></div>
        {reservation.status_reason && (
          <div style={{ ...styles.row, borderBottom: 'none' }}><span style={styles.label}>Status Note</span><span style={styles.value}>{reservation.status_reason}</span></div>
        )}
      </div>

      {canCancelOrNoShow && (
        <div style={styles.card}>
          <div style={{ fontWeight: 'bold', color: '#0f2540', marginBottom: '10px', fontSize: '14px' }}>Change Status</div>

          {!pendingAction && (
            <div style={styles.actionsCard}>
              <button style={{ ...styles.btn, background: '#dc2626' }} onClick={() => setPendingAction('cancelled')}>
                Cancel Reservation
              </button>
              <button style={{ ...styles.btn, background: '#d97706' }} onClick={() => setPendingAction('no_show')}>
                Mark as No Show
              </button>
            </div>
          )}

          {pendingAction && (
            <div>
              <p style={{ fontSize: '13px', color: '#374151' }}>
                {pendingAction === 'cancelled'
                  ? 'This will mark the reservation as Cancelled.'
                  : 'This will mark the reservation as No Show.'}
              </p>
              <textarea
                style={styles.reasonBox}
                placeholder="Reason (optional)"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  style={{ ...styles.btn, background: pendingAction === 'cancelled' ? '#dc2626' : '#d97706' }}
                  onClick={confirmStatusChange}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
                <button style={{ ...styles.btn, background: '#6b7280' }} onClick={() => { setPendingAction(null); setReason('') }}>
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
