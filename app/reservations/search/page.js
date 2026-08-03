'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const statusStyle = {
  reserved: { bg: '#dbeafe', color: '#1e40af', label: 'Reserved' },
  checked_in: { bg: '#dcfce7', color: '#166534', label: 'Checked In' },
  checked_out: { bg: '#f3f4f6', color: '#374151', label: 'Checked Out' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  no_show: { bg: '#fef3c7', color: '#92400e', label: 'No Show' },
}

const styles = {
  page: { padding: '30px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  subtitle: { color: '#64748b', marginTop: 0, fontSize: '14px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '18px', marginTop: '16px' },
  row: { display: 'flex', gap: '14px', flexWrap: 'wrap' },
  field: { flex: '1 1 180px' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', fontSize: '13px' },
  btn: { background: '#0f2540', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  clearBtn: { background: '#e2e8f0', color: '#0f2540', border: 'none', padding: '10px 22px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  tableCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '16px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f2540' },
  empty: { padding: '30px', textAlign: 'center', color: '#94a3b8' },
};

export default function ReservationSearchPage() {
  const [guests, setGuests] = useState([])
  const [allReservations, setAllReservations] = useState([])
  const [roomTypes, setRoomTypes] = useState({})
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    guestName: '',
    confirmationNumber: '',
    status: 'all',
    fromDate: '',
    toDate: '',
  })

  useEffect(() => {
    async function load() {
      const { data: guestData } = await supabase.from('guests').select('*')
      setGuests(guestData || [])

      const { data: typeData } = await supabase.from('room_types').select('*')
      const typeMap = {}
      typeData?.forEach((t) => (typeMap[t.id] = t.name))
      setRoomTypes(typeMap)

      const { data: resData } = await supabase
        .from('reservations')
        .select('*, rooms(room_number)')
        .order('check_in_date', { ascending: false })
      setAllReservations(resData || [])

      setLoading(false)
    }
    load()
  }, [])

  const guestMap = {}
  guests.forEach((g) => (guestMap[g.id] = `${g.first_name} ${g.last_name}`))

  const filtered = allReservations.filter((r) => {
    if (filters.guestName.trim()) {
      const name = (guestMap[r.guest_id] || '').toLowerCase()
      if (!name.includes(filters.guestName.trim().toLowerCase())) return false
    }
    if (filters.confirmationNumber.trim()) {
      if (!String(r.confirmation_number || '').toLowerCase().includes(filters.confirmationNumber.trim().toLowerCase())) return false
    }
    if (filters.status !== 'all' && r.status !== filters.status) return false
    if (filters.fromDate && r.check_in_date < filters.fromDate) return false
    if (filters.toDate && r.check_in_date > filters.toDate) return false
    return true
  })

  return (
    <div style={styles.page}>
      <a href="/reservations" style={styles.back}>&larr; Back to Reservations</a>
      <h1 style={styles.title}>Reservation Search</h1>
      <p style={styles.subtitle}>Search current and past reservations — filter by guest to view their stay history</p>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Guest Name</label>
            <input
              style={styles.input}
              placeholder="e.g. Aung Aung"
              value={filters.guestName}
              onChange={(e) => setFilters({ ...filters, guestName: e.target.value })}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Confirmation #</label>
            <input
              style={styles.input}
              value={filters.confirmationNumber}
              onChange={(e) => setFilters({ ...filters, confirmationNumber: e.target.value })}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All Statuses</option>
              <option value="reserved">Reserved</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Check-in From</label>
            <input style={styles.input} type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Check-in To</label>
            <input style={styles.input} type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
          </div>
        </div>

        <div style={{ marginTop: '14px' }}>
          <button
            style={styles.clearBtn}
            onClick={() => setFilters({ guestName: '', confirmationNumber: '', status: 'all', fromDate: '', toDate: '' })}
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Confirmation #</th>
              <th style={styles.th}>Guest</th>
              <th style={styles.th}>Room Type</th>
              <th style={styles.th}>Room</th>
              <th style={styles.th}>Check-in</th>
              <th style={styles.th}>Check-out</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={styles.empty}>Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} style={styles.empty}>No reservations match these filters.</td></tr>
            )}
            {!loading && filtered.map((r) => {
              const style = statusStyle[r.status] || statusStyle.reserved
              return (
                <tr key={r.id}>
                  <td style={styles.td}>
                    <a href={`/reservations/${r.id}`} style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none', fontFamily: 'monospace' }}>
                      {r.confirmation_number}
                    </a>
                  </td>
                  <td style={styles.td}>{guestMap[r.guest_id] || 'Unknown'}</td>
                  <td style={styles.td}>{roomTypes[r.room_type_id] || ''}</td>
                  <td style={styles.td}>{r.rooms?.room_number || '—'}</td>
                  <td style={styles.td}>{r.check_in_date}</td>
                  <td style={styles.td}>{r.check_out_date}</td>
                  <td style={styles.td}>
                    <span style={{ background: style.bg, color: style.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      {style.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!loading && filters.guestName.trim() && filtered.length > 0 && (
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px' }}>
          Showing {filtered.length} stay record(s) for guests matching "{filters.guestName}" — this is their reservation history.
        </p>
      )}
    </div>
  )
}
