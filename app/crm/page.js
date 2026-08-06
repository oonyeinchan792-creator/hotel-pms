'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import {
  getTiers, createTier, deleteTier, getTierForPoints,
  getPointsBalance, getPointsHistory, addPointsTransaction,
  getPromotions, createPromotion, updatePromotion, deletePromotion,
  getCampaigns, createCampaign, updateCampaign, deleteCampaign,
} from '../../lib/crm'

const TABS = ['Membership Tiers', 'Points', 'Promotions', 'Marketing Campaigns']

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 12, color: '#64748b', borderBottom: '1px solid #e2e8f0' }
const td = { padding: '10px 12px', fontSize: 14, borderBottom: '1px solid #e2e8f0' }
const btn = { padding: '8px 14px', background: '#0f2540', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }
const dangerBtn = { ...btn, background: '#dc2626' }
const input = { padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, fontSize: 13 }
const card = { background: 'white', borderRadius: 8, border: '1px solid #e2e8f0' }

export default function CRMPage() {
  const [tab, setTab] = useState('Membership Tiers')

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ color: '#0f2540', marginBottom: 4 }}>CRM / Loyalty</h1>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
        Membership tiers, points, promotions and marketing campaigns
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
        {TABS.map((t) => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 16px',
              cursor: 'pointer',
              color: tab === t ? '#0f2540' : '#64748b',
              borderBottom: tab === t ? '2px solid #0f2540' : '2px solid transparent',
              fontWeight: tab === t ? 'bold' : 'normal',
              fontSize: 14,
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {tab === 'Membership Tiers' && <TiersTab />}
      {tab === 'Points' && <PointsTab />}
      {tab === 'Promotions' && <PromotionsTab />}
      {tab === 'Marketing Campaigns' && <CampaignsTab />}

      <div style={{ marginTop: 30, padding: 16, ...card }}>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          Guest Preferences are managed per-guest under{' '}
          <a href="/profiles" style={{ color: '#0f2540' }}>Profiles → Preferences tab</a>.
        </div>
      </div>
    </div>
  )
}

function TiersTab() {
  const [tiers, setTiers] = useState([])
  const [form, setForm] = useState({ name: '', min_points: '', discount_percent: '', benefits: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setTiers(await getTiers())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createTier({
      name: form.name,
      min_points: Number(form.min_points) || 0,
      discount_percent: Number(form.discount_percent) || 0,
      benefits: form.benefits,
    })
    setForm({ name: '', min_points: '', discount_percent: '', benefits: '' })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this tier?')) return
    await deleteTier(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Tier name (e.g. Gold)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="Min points" type="number" value={form.min_points} onChange={(e) => setForm({ ...form, min_points: e.target.value })} required />
        <input style={input} placeholder="Discount %" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 180 }} placeholder="Benefits" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
        <button style={btn} type="submit">Add Tier</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Tier</th>
              <th style={th}>Min Points</th>
              <th style={th}>Discount %</th>
              <th style={th}>Benefits</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => (
              <tr key={t.id}>
                <td style={td}>{t.name}</td>
                <td style={td}>{t.min_points}</td>
                <td style={td}>{t.discount_percent}%</td>
                <td style={td}>{t.benefits}</td>
                <td style={td}><button onClick={() => handleDelete(t.id)} style={dangerBtn}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function PointsTab() {
  const [profileId, setProfileId] = useState('')
  const [profile, setProfile] = useState(null)
  const [balance, setBalance] = useState(0)
  const [history, setHistory] = useState([])
  const [tiers, setTiers] = useState([])
  const [form, setForm] = useState({ points: '', transaction_type: 'earn', reference: '', notes: '' })
  const [error, setError] = useState('')

  async function handleLookup(e) {
    e.preventDefault()
    setError('')
    setProfile(null)
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', profileId.trim()).single()
      if (error || !data) throw new Error('Guest profile not found — check the ID')
      const [bal, hist, tierList] = await Promise.all([
        getPointsBalance(data.id),
        getPointsHistory(data.id),
        getTiers(),
      ])
      setProfile(data)
      setBalance(bal)
      setHistory(hist)
      setTiers(tierList)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAddTransaction(e) {
    e.preventDefault()
    await addPointsTransaction({
      profile_id: profile.id,
      points: form.transaction_type === 'redeem' ? -Math.abs(Number(form.points)) : Math.abs(Number(form.points)),
      transaction_type: form.transaction_type,
      reference: form.reference,
      notes: form.notes,
    })
    setForm({ points: '', transaction_type: 'earn', reference: '', notes: '' })
    const [bal, hist] = await Promise.all([getPointsBalance(profile.id), getPointsHistory(profile.id)])
    setBalance(bal)
    setHistory(hist)
  }

  const currentTier = profile ? getTierForPoints(balance, tiers) : null

  return (
    <div>
      <form onSubmit={handleLookup} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ ...input, flex: 1 }}
          placeholder="Paste Guest Profile ID (from the /profiles/[id] page URL)"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          required
        />
        <button style={btn} type="submit">Look up</button>
      </form>
      {error && <div style={{ color: '#dc2626', marginBottom: 16 }}>{error}</div>}

      {profile && (
        <>
          <div style={{ padding: 16, marginBottom: 16, ...card }}>
            <div style={{ fontWeight: 'bold', color: '#0f2540' }}>{profile.full_name || profile.name || profile.id}</div>
            <div style={{ fontSize: 24, color: '#0f2540', marginTop: 4 }}>{balance} pts</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>Tier: {currentTier ? currentTier.name : 'None'}</div>
          </div>

          <form onSubmit={handleAddTransaction} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select style={input} value={form.transaction_type} onChange={(e) => setForm({ ...form, transaction_type: e.target.value })}>
              <option value="earn">Earn</option>
              <option value="redeem">Redeem</option>
              <option value="adjust">Adjust</option>
            </select>
            <input style={input} placeholder="Points" type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} required />
            <input style={input} placeholder="Reference (e.g. Reservation #)" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <button style={btn} type="submit">Add Transaction</button>
          </form>

          <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
            <thead>
              <tr>
                <th style={th}>Date</th>
                <th style={th}>Type</th>
                <th style={th}>Points</th>
                <th style={th}>Reference</th>
                <th style={th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td style={td}>{new Date(h.created_at).toLocaleDateString()}</td>
                  <td style={td}>{h.transaction_type}</td>
                  <td style={td}>{h.points > 0 ? `+${h.points}` : h.points}</td>
                  <td style={td}>{h.reference || '-'}</td>
                  <td style={td}>{h.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function PromotionsTab() {
  const [promos, setPromos] = useState([])
  const [form, setForm] = useState({ name: '', code: '', discount_type: 'percent', discount_value: '', start_date: '', end_date: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setPromos(await getPromotions())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createPromotion({
      name: form.name,
      code: form.code || null,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      description: form.description,
      is_active: true,
    })
    setForm({ name: '', code: '', discount_type: 'percent', discount_value: '', start_date: '', end_date: '', description: '' })
    load()
  }
  async function toggleActive(promo) {
    await updatePromotion(promo.id, { is_active: !promo.is_active })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this promotion?')) return
    await deletePromotion(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Promotion name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="Code (optional)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <select style={input} value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}>
          <option value="percent">% off</option>
          <option value="fixed">Fixed amount off</option>
        </select>
        <input style={input} placeholder="Value" type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required />
        <input style={input} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        <input style={input} type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 160 }} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button style={btn} type="submit">Add Promotion</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Code</th>
              <th style={th}>Discount</th>
              <th style={th}>Valid</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {promos.map((p) => (
              <tr key={p.id}>
                <td style={td}>{p.name}</td>
                <td style={td}>{p.code || '-'}</td>
                <td style={td}>{p.discount_type === 'percent' ? `${p.discount_value}%` : p.discount_value}</td>
                <td style={td}>{p.start_date || '-'} → {p.end_date || '-'}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: p.is_active ? '#dcfce7' : '#f1f5f9', color: p.is_active ? '#166534' : '#64748b' }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={td}>
                  <button onClick={() => toggleActive(p)} style={{ ...btn, marginRight: 6 }}>{p.is_active ? 'Deactivate' : 'Activate'}</button>
                  <button onClick={() => handleDelete(p.id)} style={dangerBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([])
  const [form, setForm] = useState({ name: '', channel: 'email', target_segment: '', message: '', scheduled_date: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])
  async function load() {
    setLoading(true)
    setCampaigns(await getCampaigns())
    setLoading(false)
  }
  async function handleAdd(e) {
    e.preventDefault()
    await createCampaign({
      name: form.name,
      channel: form.channel,
      target_segment: form.target_segment,
      message: form.message,
      scheduled_date: form.scheduled_date || null,
      status: 'draft',
    })
    setForm({ name: '', channel: 'email', target_segment: '', message: '', scheduled_date: '' })
    load()
  }
  async function markSent(id) {
    await updateCampaign(id, { status: 'sent' })
    load()
  }
  async function handleDelete(id) {
    if (!confirm('Delete this campaign?')) return
    await deleteCampaign(id)
    load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input style={input} placeholder="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select style={input} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="both">Email + SMS</option>
        </select>
        <input style={input} placeholder="Target segment (e.g. Gold tier, VIP)" value={form.target_segment} onChange={(e) => setForm({ ...form, target_segment: e.target.value })} />
        <input style={input} type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
        <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button style={btn} type="submit">Add Campaign</button>
      </form>

      {loading ? <div>Loading...</div> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', ...card }}>
          <thead>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Channel</th>
              <th style={th}>Segment</th>
              <th style={th}>Scheduled</th>
              <th style={th}>Status</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td style={td}>{c.name}</td>
                <td style={td}>{c.channel}</td>
                <td style={td}>{c.target_segment || '-'}</td>
                <td style={td}>{c.scheduled_date || '-'}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, background: c.status === 'sent' ? '#dcfce7' : '#f1f5f9', color: c.status === 'sent' ? '#166534' : '#64748b' }}>
                    {c.status}
                  </span>
                </td>
                <td style={td}>
                  {c.status !== 'sent' && <button onClick={() => markSent(c.id)} style={{ ...btn, marginRight: 6 }}>Mark Sent</button>}
                  <button onClick={() => handleDelete(c.id)} style={dangerBtn}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
