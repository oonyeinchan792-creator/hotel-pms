'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const statusStyle = {
  reserved: { bg: '#dbeafe', color: '#1e40af', label: 'Reserved' },
  checked_in: { bg: '#dcfce7', color: '#166534', label: 'Checked In' },
  checked_out: { bg: '#f3f4f6', color: '#374151', label: 'Checked Out' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
}

export default function GuestDetailPage() {
  const params = useParams()
  const [guest, setGuest] = useState(null)
  const [reservations, setReservations] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [savingNote, setSavingNote] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      const { data: guestData } = await supabase.from('guests').select('*').eq('id', params.id).single()
      setGuest(guestData)
      setNotes(guestData?.notes || '')

      const { data: typeData } = await supabase.from('room_types').select('*')
      const typeMap = {}
      typeData?.forEach((t) => (typeMap[t.id] = t.name))
      setRoomTypes(typeMap)

      const { data: resData } = await supabase
        .from('reservations')
        .select('*')
        .eq('guest_id', params.id)
        .order('check_in_date', { ascending: false })
      setReservations(resData || [])

      setLoading(false)
    }
    if (params.id) load()
  }, [params.id])

  async function saveNotes() {
    setSavingNote(true)
    await supabase.from('guests').update({ notes }).eq('id', params.id)
    setSavingNote(false)
  }

  if (loading) return <main style={{ padding: '40px' }}>Loading...</main>
  if (!guest) return <main style={{ padding: '40px' }}>Guest not found.</main>

  return (
    <main style={{ padding: '40px' }}>
      <a href="/guests" style={{ color: '#2563eb' }}>&larr; Back to Guests</a>
      <h1>{guest.first_name} {guest.last_name}</h1>

      <div style={{ background: 'white', borderRadius: '8px', padding: '20px', marginBottom: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Email</div>
          <div>{guest.email || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Phone</div>
          <div>{guest.phone || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Nationality</div>
          <div>{guest.nationality || '—'}</div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Stays</div>
          <div>{reservations.length}</div>
        </div>
      </div>

      <h3>Notes / Preferences</h3>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
        placeholder="e.g. Prefers high floor, allergic to feather pillows..."
      />
      <button
        onClick={saveNotes}
        disabled={savingNote}
        style={{ marginTop: '8px', background: '#2563eb', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer' }}
      >
        {savingNote ? 'Saving...' : 'Save Notes'}
      </button>

      <h3 style={{ marginTop: '30px' }}>Stay History</h3>
      {reservations.length === 0 && <p style={{ color: '#6b7280' }}>No stays on record.</p>}

      {reservations.map((r) => {
        const style = statusStyle[r.status] || statusStyle.reserved
        return (
          <div key={r.id} style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong>{roomTypes[r.room_type_id] || ''}</strong>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {r.check_in_date} &rarr; {r.check_out_date} · Conf# {r.confirmation_number}
              </div>
            </div>
            <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
              {style.label}
            </span>
          </div>
        )
      })}
    </main>
  )
}
