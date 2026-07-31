'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function GroupsPage() {
  const [groups, setGroups] = useState([])
  const [roomCounts, setRoomCounts] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: groupData } = await supabase.from('groups').select('*, companies(name)').order('created_at', { ascending: false })
      setGroups(groupData || [])

      const { data: resData } = await supabase.from('reservations').select('group_id').not('group_id', 'is', null)
      const counts = {}
      resData?.forEach((r) => { counts[r.group_id] = (counts[r.group_id] || 0) + 1 })
      setRoomCounts(counts)

      setLoading(false)
    }
    load()
  }, [])

  return (
    <main style={{ padding: '30px' }}>
      <a href="/reservations" style={{ color: '#2563eb' }}>&larr; Back to Reservations</a>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: '#0f2540' }}>Group Reservations</h1>
        <a
          href="/reservations/group/new"
          style={{ background: '#16a34a', color: 'white', padding: '12px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}
        >
          + New Group
        </a>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && groups.length === 0 && <p style={{ color: '#6b7280' }}>No groups yet. Click "New Group" to create one.</p>}

      {!loading && groups.map((g) => (
        <div key={g.id} style={{ background: 'white', borderRadius: '8px', padding: '16px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <strong>{g.group_name}</strong>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>
              {g.group_leader_name && <span>Leader: {g.group_leader_name} · </span>}
              {g.companies?.name && <span>{g.companies.name} · </span>}
              {roomCounts[g.id] || 0} room(s) booked
            </div>
          </div>
          <a href={`/reservations/group/${g.id}`} style={{ color: '#2563eb', fontWeight: 'bold', fontSize: '13px' }}>Manage &rarr;</a>
        </div>
      ))}
    </main>
  )
}
