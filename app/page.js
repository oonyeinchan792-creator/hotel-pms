'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

const card = {
  background: 'white',
  borderRadius: '8px',
  padding: '18px',
  border: '1px solid #e2e8f0',
}
const sectionTitle = {
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#0f2540',
  marginBottom: '12px',
}
const statLabel = { fontSize: '12px', color: '#64748b' }
const statValue = { fontSize: '26px', fontWeight: 'bold', color: '#0f2540' }

export default function Home() {
  const [loading, setLoading] = useState(true)

  const [totalRooms, setTotalRooms] = useState(0)
  const [occupied, setOccupied] = useState(0)

  const [arrivals, setArrivals] = useState(0)
  const [departures, setDepartures] = useState(0)

  const [houseStatus, setHouseStatus] = useState({ vacant: 0, occupied: 0 })

  const [roomStatus, setRoomStatus] = useState({
    dirty: 0, clean: 0, inspected: 0, ooo: 0, oos: 0,
  })

  const [revenueToday, setRevenueToday] = useState(0)
  const [outstandingBalance, setOutstandingBalance] = useState(0)

  const [vipGuests, setVipGuests] = useState([])

  const [taskAlerts, setTaskAlerts] = useState([])

  useEffect(() => {
    async function load() {
      const today = todayStr()

      // ---- Rooms: Occupancy, House Status, Room Status ----
      const { data: roomsData } = await supabase.from('rooms').select('status')
      const rooms = roomsData || []
      setTotalRooms(rooms.length)
      setOccupied(rooms.filter((r) => r.status.startsWith('occupied')).length)

      setHouseStatus({
        vacant: rooms.filter((r) => r.status.startsWith('vacant')).length,
        occupied: rooms.filter((r) => r.status.startsWith('occupied')).length,
      })

      setRoomStatus({
        dirty: rooms.filter((r) => r.status === 'vacant_dirty' || r.status === 'occupied_dirty').length,
        clean: rooms.filter((r) => r.status === 'vacant_clean' || r.status === 'occupied_clean').length,
        inspected: rooms.filter((r) => r.status === 'vacant_inspected').length,
        ooo: rooms.filter((r) => r.status === 'out_of_order').length,
        oos: rooms.filter((r) => r.status === 'out_of_service').length,
      })

      // ---- Arrivals / Departures today ----
      const { data: arrivalData } = await supabase
        .from('reservations')
        .select('id')
        .eq('status', 'reserved')
        .eq('check_in_date', today)
      setArrivals(arrivalData?.length || 0)

      const { data: departureData } = await supabase
        .from('reservations')
        .select('id')
        .eq('status', 'checked_in')
        .eq('check_out_date', today)
      setDepartures(departureData?.length || 0)

      // ---- Revenue Summary (today's folio transactions) ----
      const startOfDay = `${today}T00:00:00`
      const { data: txnsToday } = await supabase
        .from('folio_transactions')
        .select('amount, transaction_type')
        .gte('created_at', startOfDay)

      let revenue = 0
      txnsToday?.forEach((t) => {
        if (t.transaction_type !== 'payment') revenue += Number(t.amount)
      })
      setRevenueToday(revenue)

      const { data: allTxns } = await supabase
        .from('folio_transactions')
        .select('amount, transaction_type')

      let balance = 0
      allTxns?.forEach((t) => {
        balance += t.transaction_type === 'payment' ? -Number(t.amount) : Number(t.amount)
      })
      setOutstandingBalance(balance)

      // ---- VIP Guests ----
      const { data: vipData } = await supabase
        .from('profiles')
        .select('id, full_name, vip_status')
        .eq('profile_type', 'guest')
        .not('vip_status', 'is', null)
        .limit(5)
      setVipGuests(vipData || [])

      // ---- Task Alerts (open housekeeping tasks) ----
      const { data: taskData } = await supabase
        .from('housekeeping_tasks')
        .select('id, assigned_to, status, rooms(room_number)')
        .neq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5)
      setTaskAlerts(taskData || [])

      setLoading(false)
    }
    load()
  }, [])

  const occupancyPct = totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0

  return (
    <main style={{ padding: '30px' }}>
      <h1 style={{ color: '#0f2540', fontSize: '22px', marginBottom: '4px' }}>Dashboard</h1>
      <p style={{ color: '#64748b', marginTop: 0, fontSize: '14px' }}>Property overview</p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          marginTop: '20px',
        }}
      >
        {/* Occupancy */}
        <div style={card}>
          <div style={sectionTitle}>Occupancy</div>
          {loading ? (
            '…'
          ) : (
            <>
              <div style={statValue}>{occupancyPct}%</div>
              <div style={statLabel}>{occupied} of {totalRooms} rooms occupied</div>
            </>
          )}
        </div>

        {/* Arrivals / Departures */}
        <div style={card}>
          <div style={sectionTitle}>Arrivals / Departures Today</div>
          {loading ? '…' : (
            <div style={{ display: 'flex', gap: '30px' }}>
              <div>
                <div style={{ ...statValue, color: '#2563eb' }}>{arrivals}</div>
                <div style={statLabel}>Arrivals</div>
              </div>
              <div>
                <div style={{ ...statValue, color: '#d97706' }}>{departures}</div>
                <div style={statLabel}>Departures</div>
              </div>
            </div>
          )}
        </div>

        {/* House Status */}
        <div style={card}>
          <div style={sectionTitle}>House Status</div>
          {loading ? '…' : (
            <div style={{ display: 'flex', gap: '30px' }}>
              <div>
                <div style={{ ...statValue, color: '#16a34a' }}>{houseStatus.vacant}</div>
                <div style={statLabel}>Vacant</div>
              </div>
              <div>
                <div style={{ ...statValue, color: '#dc2626' }}>{houseStatus.occupied}</div>
                <div style={statLabel}>Occupied</div>
              </div>
            </div>
          )}
        </div>

        {/* Room Status */}
        <div style={card}>
          <div style={sectionTitle}>Room Status</div>
          {loading ? '…' : (
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
              <StatusPill label="Dirty" value={roomStatus.dirty} color="#dc2626" />
              <StatusPill label="Clean" value={roomStatus.clean} color="#16a34a" />
              <StatusPill label="Inspected" value={roomStatus.inspected} color="#0d9488" />
              <StatusPill label="OOO" value={roomStatus.ooo} color="#6b7280" />
              <StatusPill label="OOS" value={roomStatus.oos} color="#1f2937" />
            </div>
          )}
        </div>

        {/* Revenue Summary */}
        <div style={card}>
          <div style={sectionTitle}>Revenue Summary</div>
          {loading ? '…' : (
            <div style={{ display: 'flex', gap: '30px' }}>
              <div>
                <div style={{ ...statValue, color: '#16a34a' }}>{revenueToday.toLocaleString()}</div>
                <div style={statLabel}>Today's Revenue (MMK)</div>
              </div>
              <div>
                <div style={{ ...statValue, color: outstandingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                  {outstandingBalance.toLocaleString()}
                </div>
                <div style={statLabel}>Outstanding Balance (MMK)</div>
              </div>
            </div>
          )}
        </div>

        {/* VIP Guests */}
        <div style={card}>
          <div style={sectionTitle}>VIP Guests</div>
          {loading ? '…' : vipGuests.length === 0 ? (
            <div style={statLabel}>No VIP guests on file.</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {vipGuests.map((g) => (
                <li key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <span style={{ color: '#0f2540' }}>{g.full_name}</span>
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    {g.vip_status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Task Alerts */}
        <div style={card}>
          <div style={sectionTitle}>Task Alerts</div>
          {loading ? '…' : taskAlerts.length === 0 ? (
            <div style={statLabel}>No open housekeeping tasks.</div>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {taskAlerts.map((t) => (
                <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>
                  <span style={{ color: '#0f2540' }}>
                    Room {t.rooms?.room_number} — {t.assigned_to}
                  </span>
                  <span style={{
                    background: t.status === 'pending' ? '#fef3c7' : '#dbeafe',
                    color: t.status === 'pending' ? '#92400e' : '#1e40af',
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold',
                  }}>
                    {t.status === 'pending' ? 'Pending' : 'In Progress'}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <a href="/housekeeping" style={{ display: 'inline-block', marginTop: '10px', fontSize: '12px', color: '#2563eb' }}>
            View all tasks &rarr;
          </a>
        </div>
      </div>

      <p style={{ marginTop: '30px', color: '#64748b', fontSize: '13px' }}>
        Use the sidebar to navigate to Room Status, Reservations, Front Desk, Guests, Profiles, Billing, Reports, and Housekeeping.
      </p>
    </main>
  )
}

function StatusPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color }}>{value}</div>
      <div style={{ fontSize: '11px', color: '#64748b' }}>{label}</div>
    </div>
  )
}
