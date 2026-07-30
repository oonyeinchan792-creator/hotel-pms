'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function RegistrationCardPage() {
  const params = useParams()
  const [reservation, setReservation] = useState(null)
  const [guest, setGuest] = useState(null)
  const [roomType, setRoomType] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: resData } = await supabase
        .from('reservations')
        .select('*, rooms(room_number, floor)')
        .eq('id', params.id)
        .single()
      setReservation(resData)

      if (resData) {
        const { data: guestData } = await supabase.from('guests').select('*').eq('id', resData.guest_id).single()
        setGuest(guestData)

        const { data: typeData } = await supabase.from('room_types').select('*').eq('id', resData.room_type_id).single()
        setRoomType(typeData)
      }

      setLoading(false)
    }
    if (params.id) load()
  }, [params.id])

  if (loading) return <main style={{ padding: '30px' }}>Loading...</main>
  if (!reservation) return <main style={{ padding: '30px' }}>Reservation not found.</main>

  const nights = Math.max(
    Math.round((new Date(reservation.check_out_date) - new Date(reservation.check_in_date)) / 86400000),
    1
  )
  const estimatedTotal = roomType ? Number(roomType.base_rate) * nights : 0

  const row = { display: 'flex', borderBottom: '1px solid #cbd5e1', padding: '8px 0' }
  const labelCol = { width: '160px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }
  const valueCol = { flex: 1, fontSize: '14px', color: '#111827', fontWeight: 'bold' }

  return (
    <main style={{ padding: '30px', maxWidth: '750px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/frontdesk" style={{ color: '#2563eb' }}>&larr; Back to Front Desk</a>
        <button
          onClick={() => window.print()}
          style={{ background: '#0f2540', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          🖨️ Print Registration Card
        </button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px solid #0f2540', paddingBottom: '16px' }}>
        <h1 style={{ margin: 0, color: '#0f2540' }}>Grand Hotel</h1>
        <div style={{ fontSize: '14px', color: '#64748b' }}>Guest Registration Card</div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '20px', marginBottom: '20px' }}>
        <div style={row}>
          <div style={labelCol}>Confirmation #</div>
          <div style={{ ...valueCol, fontFamily: 'monospace' }}>{reservation.confirmation_number}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Guest Name</div>
          <div style={valueCol}>{guest?.first_name} {guest?.last_name}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Nationality</div>
          <div style={valueCol}>{guest?.nationality || '—'}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>ID / Passport No.</div>
          <div style={valueCol}>{guest?.id_number || '_________________________'}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Email</div>
          <div style={valueCol}>{guest?.email || '—'}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Phone</div>
          <div style={valueCol}>{guest?.phone || '—'}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Address</div>
          <div style={valueCol}>{guest?.address || '_________________________'}</div>
        </div>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '20px', marginBottom: '20px' }}>
        <div style={row}>
          <div style={labelCol}>Room Number</div>
          <div style={valueCol}>{reservation.rooms?.room_number} (Floor {reservation.rooms?.floor})</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Room Type</div>
          <div style={valueCol}>{roomType?.name}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Check-in Date</div>
          <div style={valueCol}>{reservation.check_in_date}</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Check-out Date</div>
          <div style={valueCol}>{reservation.check_out_date} ({nights} night{nights > 1 ? 's' : ''})</div>
        </div>
        <div style={row}>
          <div style={labelCol}>Adults / Children</div>
          <div style={valueCol}>{reservation.adults} / {reservation.children}</div>
        </div>
        <div style={{ ...row, borderBottom: 'none' }}>
          <div style={labelCol}>Rate / Est. Total</div>
          <div style={valueCol}>{Number(roomType?.base_rate || 0).toLocaleString()} MMK/night · Est. {estimatedTotal.toLocaleString()} MMK</div>
        </div>
      </div>

      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '30px', lineHeight: 1.6 }}>
        I acknowledge that I have read and agree to the hotel's terms and conditions, including check-out time,
        cancellation policy, and liability for damages. I authorize the hotel to charge my folio for room, tax,
        and incidental charges incurred during my stay.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
        <div style={{ fontSize: '13px' }}>
          Guest Signature: ________________________
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Date: ______________</div>
        </div>
        <div style={{ fontSize: '13px' }}>
          Front Desk Agent: ________________________
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Date: ______________</div>
        </div>
      </div>
    </main>
  )
}
