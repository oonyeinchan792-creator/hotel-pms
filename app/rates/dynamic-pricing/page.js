'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

const styles = {
  page: { padding: '30px', maxWidth: '800px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  title: { color: '#0f2540', fontSize: '22px', margin: '10px 0 4px 0' },
  subtitle: { color: '#64748b', marginTop: 0, fontSize: '14px' },
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' },
  row: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
  input: { padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' },
  btn: (color) => ({ background: color, color: 'white', border: 'none', padding: '9px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }),
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginTop: '12px' },
  th: { textAlign: 'left', padding: '8px', background: '#f8fafc', color: '#64748b', fontSize: '11px', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '8px', borderBottom: '1px solid #f1f5f9' },
  liveCard: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginTop: '16px' },
};

export default function DynamicPricingPage() {
  const [rules, setRules] = useState([])
  const [roomTypes, setRoomTypes] = useState([])
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    room_type_id: '',
    min_occupancy_percent: '',
    adjustment_type: 'percent',
    adjustment_value: '',
  })

  async function load() {
    setLoading(true)
    const { data: typeData } = await supabase.from('room_types').select('*').order('base_rate')
    setRoomTypes(typeData || [])

    const { data: roomsData } = await supabase.from('rooms').select('id, room_type_id')
    setRooms(roomsData || [])

    const today = new Date().toISOString().split('T')[0]
    const { data: resData } = await supabase
      .from('reservations')
      .select('room_type_id')
      .in('status', ['reserved', 'checked_in'])
      .lte('check_in_date', today)
      .gt('check_out_date', today)
    setReservations(resData || [])

    const { data: ruleData } = await supabase
      .from('dynamic_pricing_rules')
      .select('*, room_types(name, base_rate)')
      .order('min_occupancy_percent', { ascending: true })
    setRules(ruleData || [])

    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addRule(e) {
    e.preventDefault()
    if (!form.room_type_id || !form.min_occupancy_percent || !form.adjustment_value) return
    setSaving(true)
    await supabase.from('dynamic_pricing_rules').insert({
      room_type_id: form.room_type_id,
      min_occupancy_percent: Number(form.min_occupancy_percent),
      adjustment_type: form.adjustment_type,
      adjustment_value: Number(form.adjustment_value),
    })
    setForm({ room_type_id: '', min_occupancy_percent: '', adjustment_type: 'percent', adjustment_value: '' })
    setSaving(false)
    load()
  }

  async function toggleRule(rule) {
    await supabase.from('dynamic_pricing_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    load()
  }

  // Compute current occupancy % per room type and which rule (if any) applies right now
  function occupancyForType(typeId) {
    const total = rooms.filter((r) => r.room_type_id === typeId).length
    if (total === 0) return 0
    const occupied = reservations.filter((r) => r.room_type_id === typeId).length
    return Math.round((occupied / total) * 100)
  }

  function currentRateForType(type) {
    const occ = occupancyForType(type.id)
    const applicable = rules
      .filter((r) => r.room_type_id === type.id && r.is_active && occ >= r.min_occupancy_percent)
      .sort((a, b) => b.min_occupancy_percent - a.min_occupancy_percent)[0]

    if (!applicable) return { rate: Number(type.base_rate), rule: null, occ }

    const base = Number(type.base_rate)
    const adjusted = applicable.adjustment_type === 'percent'
      ? base * (1 + Number(applicable.adjustment_value) / 100)
      : base + Number(applicable.adjustment_value)

    return { rate: Math.round(adjusted), rule: applicable, occ }
  }

  return (
    <div style={styles.page}>
      <a href="/rates" style={styles.back}>&larr; Back to Rate Management</a>
      <h1 style={styles.title}>Dynamic Pricing</h1>
      <p style={styles.subtitle}>Automatically adjust rates when occupancy crosses a threshold</p>

      <div style={styles.card}>
        <div style={{ fontWeight: 'bold', color: '#0f2540', marginBottom: '10px', fontSize: '14px' }}>New Rule</div>
        <form onSubmit={addRule} style={styles.row}>
          <select style={styles.input} value={form.room_type_id} onChange={(e) => setForm({ ...form, room_type_id: e.target.value })}>
            <option value="">Room type</option>
            {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input
            style={{ ...styles.input, width: '150px' }}
            type="number" min="0" max="100"
            placeholder="Occupancy % ≥"
            value={form.min_occupancy_percent}
            onChange={(e) => setForm({ ...form, min_occupancy_percent: e.target.value })}
          />
          <select style={styles.input} value={form.adjustment_type} onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })}>
            <option value="percent">% increase</option>
            <option value="fixed">Fixed amount (MMK)</option>
          </select>
          <input
            style={{ ...styles.input, width: '150px' }}
            type="number"
            placeholder={form.adjustment_type === 'percent' ? 'e.g. 15' : 'e.g. 20000'}
            value={form.adjustment_value}
            onChange={(e) => setForm({ ...form, adjustment_value: e.target.value })}
          />
          <button type="submit" style={styles.btn('#16a34a')} disabled={saving}>
            {saving ? 'Saving...' : '+ Add Rule'}
          </button>
        </form>

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Room Type</th>
              <th style={styles.th}>When Occupancy ≥</th>
              <th style={styles.th}>Adjustment</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={styles.td}>Loading...</td></tr>
            ) : rules.length === 0 ? (
              <tr><td colSpan={5} style={styles.td}>No rules yet.</td></tr>
            ) : rules.map((r) => (
              <tr key={r.id}>
                <td style={styles.td}>{r.room_types?.name}</td>
                <td style={styles.td}>{r.min_occupancy_percent}%</td>
                <td style={styles.td}>
                  {r.adjustment_type === 'percent' ? `+${r.adjustment_value}%` : `+${Number(r.adjustment_value).toLocaleString()} MMK`}
                </td>
                <td style={styles.td}>
                  <span style={{ background: r.is_active ? '#dcfce7' : '#f3f4f6', color: r.is_active ? '#166534' : '#6b7280', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' }}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={styles.td}>
                  <button onClick={() => toggleRule(r)} style={{ ...styles.btn(r.is_active ? '#6b7280' : '#16a34a'), padding: '4px 10px', fontSize: '11px' }}>
                    {r.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && roomTypes.length > 0 && (
        <div style={styles.liveCard}>
          <div style={{ fontWeight: 'bold', color: '#166534', marginBottom: '10px' }}>Live Rates Right Now</div>
          {roomTypes.map((t) => {
            const { rate, rule, occ } = currentRateForType(t)
            return (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #dcfce7', fontSize: '13px' }}>
                <span>{t.name} <span style={{ color: '#64748b' }}>({occ}% occupied)</span></span>
                <span style={{ fontWeight: 'bold' }}>
                  {rate.toLocaleString()} MMK
                  {rule && <span style={{ color: '#d97706', fontSize: '11px', marginLeft: '6px' }}>(rule applied)</span>}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
