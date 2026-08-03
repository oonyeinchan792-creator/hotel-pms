'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const styles = {
  page: { padding: '30px', maxWidth: '900px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  subtitle: { color: '#64748b', marginTop: 0, fontSize: '14px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '20px' },
  row: { display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' },
  field: { flex: '1 1 180px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#374151', marginBottom: '4px' },
  input: { width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' },
  btn: { background: '#0f2540', color: 'white', border: 'none', padding: '10px 22px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
  resultCard: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '16px', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: { textAlign: 'left', padding: '10px 14px', background: '#f8fafc', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#0f2540' },
  bookBtn: { background: '#16a34a', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '5px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'none' },
  empty: { padding: '20px', textAlign: 'center', color: '#94a3b8' },
};

function nightsBetween(from, to) {
  const d1 = new Date(from)
  const d2 = new Date(to)
  const diff = (d2 - d1) / (1000 * 60 * 60 * 24)
  return diff > 0 ? diff : 0
}

export default function RateQueryPage() {
  const [roomTypes, setRoomTypes] = useState([])
  const [roomTypeId, setRoomTypeId] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTypes() {
      const { data } = await supabase.from('room_types').select('*').order('base_rate')
      setRoomTypes(data || [])
    }
    loadTypes()
  }, [])

  async function handleSearch(e) {
    e.preventDefault()
    setError('')

    if (!checkIn || !checkOut) {
      setError('Please select both check-in and check-out dates.')
      return
    }
    if (checkOut <= checkIn) {
      setError('Check-out date must be after check-in date.')
      return
    }

    setLoading(true)

    let query = supabase
      .from('rate_plans')
      .select('*, room_types(id, name, base_rate)')
      .eq('is_active', true)

    if (roomTypeId) {
      query = query.eq('room_type_id', roomTypeId)
    }

    const { data, error: qError } = await query.order('rate')

    if (qError) {
      setError(qError.message)
      setLoading(false)
      return
    }

    // Keep only rate plans valid for the requested date range
    // (valid_from/valid_to are optional — null means "no limit")
    const nights = nightsBetween(checkIn, checkOut)
    const matching = (data || []).filter((p) => {
      if (p.valid_from && p.valid_from > checkIn) return false
      if (p.valid_to && p.valid_to < checkOut) return false
      return true
    })

    setResults({ nights, plans: matching })
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <a href="/reservations" style={styles.back}>&larr; Back to Reservations</a>
      <h1 style={styles.title}>Rate Query</h1>
      <p style={styles.subtitle}>Check available rate codes and pricing for a date range</p>

      <div style={styles.card}>
        <form onSubmit={handleSearch}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Room Type</label>
              <select style={styles.input} value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>
                <option value="">All room types</option>
                {roomTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Check-in Date *</label>
              <input style={styles.input} type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Check-out Date *</label>
              <input style={styles.input} type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>}

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? 'Searching...' : 'Search Rates'}
          </button>
        </form>
      </div>

      {results && (
        <div style={styles.resultCard}>
          {results.plans.length === 0 ? (
            <div style={styles.empty}>No rate codes found for these dates.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Code</th>
                  <th style={styles.th}>Name</th>
                  <th style={styles.th}>Room Type</th>
                  <th style={styles.th}>Rate / Night</th>
                  <th style={styles.th}>{results.nights} Night(s) Total</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {results.plans.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...styles.td, fontFamily: 'monospace', fontWeight: 'bold' }}>{p.code}</td>
                    <td style={styles.td}>{p.name}</td>
                    <td style={styles.td}>{p.room_types?.name}</td>
                    <td style={styles.td}>{Number(p.rate).toLocaleString()} MMK</td>
                    <td style={{ ...styles.td, fontWeight: 'bold' }}>
                      {(Number(p.rate) * results.nights).toLocaleString()} MMK
                    </td>
                    <td style={styles.td}>
                      <a
                        href={`/reservations/new?room_type_id=${p.room_type_id}&check_in=${checkIn}&check_out=${checkOut}&rate_plan_id=${p.id}`}
                        style={styles.bookBtn}
                      >
                        Book This Rate
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
