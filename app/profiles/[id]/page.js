// app/profiles/[id]/page.js
'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

const styles = {
  page: { padding: '30px', maxWidth: '900px' },
  back: { color: '#2563eb', textDecoration: 'none', fontSize: '14px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px', flexWrap: 'wrap', gap: '10px' },
  name: { fontSize: '24px', fontWeight: 'bold', color: '#0f2540', margin: 0 },
  typeTag: { fontSize: '12px', color: '#64748b', textTransform: 'capitalize' },
  badges: { display: 'flex', gap: '8px' },
  vipBadge: { background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  blacklistBadge: { background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold' },
  tabBar: { display: 'flex', gap: '4px', marginTop: '20px', borderBottom: '1px solid #e2e8f0' },
  tab: (active) => ({
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: active ? '#0f2540' : '#94a3b8',
    borderBottom: active ? '2px solid #0f2540' : '2px solid transparent',
    cursor: 'pointer',
  }),
  card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginTop: '16px' },
  row: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
  label: { color: '#64748b' },
  value: { color: '#0f2540', fontWeight: 'bold' },
  actionsRow: { display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' },
  btn: (color) => ({ background: color, color: 'white', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }),
  formRow: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' },
  input: { flex: '1 1 160px', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' },
  listItem: { padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between' },
  empty: { color: '#94a3b8', fontSize: '13px' },
};

const TABS_BY_TYPE = {
  guest: ['overview', 'membership', 'preferences', 'documents', 'history'],
  company: ['overview'],
  travel_agent: ['overview'],
  source_agent: ['overview'],
  source: ['overview'],
  group: ['overview'],
};

const TAB_LABELS = {
  overview: 'Overview',
  membership: 'Membership / Loyalty',
  preferences: 'Preferences',
  documents: 'Documents',
  history: 'Guest History',
};

export default function ProfileDetailPage() {
  const params = useParams()
  const [profile, setProfile] = useState(null)
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  async function loadProfile() {
    setLoading(true)
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', params.id).single()
    setProfile(profileData)

    if (profileData) {
      const detailTable = {
        guest: 'guest_profile_details',
        company: 'company_profile_details',
        travel_agent: 'travel_agent_profile_details',
        source_agent: 'source_agent_profile_details',
        source: 'source_profile_details',
      }[profileData.profile_type]

      if (detailTable) {
        const { data: detailData } = await supabase.from(detailTable).select('*').eq('profile_id', params.id).maybeSingle()
        setDetails(detailData)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    if (params.id) loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  async function toggleVip() {
    const newStatus = profile.vip_status ? null : 'VIP1'
    await supabase.from('profiles').update({ vip_status: newStatus }).eq('id', params.id)
    loadProfile()
  }

  async function toggleBlacklist() {
    await supabase.from('profiles').update({ is_blacklisted: !profile.is_blacklisted }).eq('id', params.id)
    loadProfile()
  }

  if (loading) return <main style={styles.page}>Loading...</main>
  if (!profile) return <main style={styles.page}>Profile not found.</main>

  const tabs = TABS_BY_TYPE[profile.profile_type] || ['overview']

  return (
    <div style={styles.page}>
      <a href="/profiles" style={styles.back}>&larr; Back to Profiles</a>

      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.name}>{profile.full_name}</h1>
          <div style={styles.typeTag}>{profile.profile_type.replace('_', ' ')} Profile</div>
        </div>
        <div style={styles.badges}>
          {profile.vip_status && <span style={styles.vipBadge}>{profile.vip_status}</span>}
          {profile.is_blacklisted && <span style={styles.blacklistBadge}>Blacklisted</span>}
        </div>
      </div>

      <div style={styles.tabBar}>
        {tabs.map((t) => (
          <div key={t} style={styles.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
            {TAB_LABELS[t]}
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          profile={profile}
          details={details}
          onToggleVip={toggleVip}
          onToggleBlacklist={toggleBlacklist}
        />
      )}
      {activeTab === 'membership' && <MembershipTab profileId={params.id} />}
      {activeTab === 'preferences' && <PreferencesTab profileId={params.id} />}
      {activeTab === 'documents' && <DocumentsTab profileId={params.id} />}
      {activeTab === 'history' && <HistoryTab profileId={params.id} />}
    </div>
  )
}

function OverviewTab({ profile, details, onToggleVip, onToggleBlacklist }) {
  return (
    <div style={styles.card}>
      <div style={styles.row}><span style={styles.label}>Email</span><span style={styles.value}>{profile.email || '—'}</span></div>
      <div style={styles.row}><span style={styles.label}>Phone</span><span style={styles.value}>{profile.phone || '—'}</span></div>
      <div style={styles.row}><span style={styles.label}>Location</span><span style={styles.value}>{[profile.city, profile.country].filter(Boolean).join(', ') || '—'}</span></div>

      {details && Object.entries(details).map(([key, val]) => {
        if (key === 'profile_id' || !val) return null
        return (
          <div style={styles.row} key={key}>
            <span style={styles.label}>{key.replace(/_/g, ' ')}</span>
            <span style={styles.value}>{String(val)}</span>
          </div>
        )
      })}

      <div style={styles.actionsRow}>
        <button style={styles.btn(profile.vip_status ? '#6b7280' : '#d97706')} onClick={onToggleVip}>
          {profile.vip_status ? 'Remove VIP Status' : 'Mark as VIP'}
        </button>
        <button style={styles.btn(profile.is_blacklisted ? '#16a34a' : '#dc2626')} onClick={onToggleBlacklist}>
          {profile.is_blacklisted ? 'Remove from Blacklist' : 'Add to Blacklist'}
        </button>
      </div>
    </div>
  )
}

function MembershipTab({ profileId }) {
  const [memberships, setMemberships] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ membership_number: '', tier: 'Basic' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('membership_profiles').select('*').eq('profile_id', profileId)
    setMemberships(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId])

  async function addMembership(e) {
    e.preventDefault()
    if (!form.membership_number.trim()) return
    setSaving(true)
    await supabase.from('membership_profiles').insert({
      profile_id: profileId,
      membership_number: form.membership_number,
      tier: form.tier,
    })
    setForm({ membership_number: '', tier: 'Basic' })
    setSaving(false)
    load()
  }

  return (
    <div style={styles.card}>
      {loading ? '…' : memberships.length === 0 ? (
        <p style={styles.empty}>No membership on file.</p>
      ) : (
        memberships.map((m) => (
          <div key={m.id} style={styles.listItem}>
            <span>{m.membership_number} — {m.tier}</span>
            <span style={{ color: '#64748b' }}>{m.points_balance} pts · {m.status}</span>
          </div>
        ))
      )}

      <form onSubmit={addMembership} style={{ marginTop: '16px' }}>
        <div style={styles.formRow}>
          <input style={styles.input} placeholder="Membership Number" value={form.membership_number}
            onChange={(e) => setForm({ ...form, membership_number: e.target.value })} />
          <select style={styles.input} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
            <option value="Basic">Basic</option>
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
          </select>
        </div>
        <button type="submit" style={styles.btn('#0f2540')} disabled={saving}>
          {saving ? 'Saving...' : '+ Add Membership'}
        </button>
      </form>
    </div>
  )
}

function PreferencesTab({ profileId }) {
  const [prefs, setPrefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ preference_type: 'Room', preference_value: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('guest_preferences').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    setPrefs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId])

  async function addPref(e) {
    e.preventDefault()
    if (!form.preference_value.trim()) return
    setSaving(true)
    await supabase.from('guest_preferences').insert({
      profile_id: profileId,
      preference_type: form.preference_type,
      preference_value: form.preference_value,
    })
    setForm({ preference_type: 'Room', preference_value: '' })
    setSaving(false)
    load()
  }

  return (
    <div style={styles.card}>
      {loading ? '…' : prefs.length === 0 ? (
        <p style={styles.empty}>No preferences on file.</p>
      ) : (
        prefs.map((p) => (
          <div key={p.id} style={styles.listItem}>
            <span style={{ fontWeight: 'bold' }}>{p.preference_type}</span>
            <span>{p.preference_value}</span>
          </div>
        ))
      )}

      <form onSubmit={addPref} style={{ marginTop: '16px' }}>
        <div style={styles.formRow}>
          <select style={styles.input} value={form.preference_type} onChange={(e) => setForm({ ...form, preference_type: e.target.value })}>
            <option value="Room">Room</option>
            <option value="Bed">Bed</option>
            <option value="Floor">Floor</option>
            <option value="Dietary">Dietary</option>
            <option value="Housekeeping">Housekeeping</option>
            <option value="Other">Other</option>
          </select>
          <input style={styles.input} placeholder="e.g. High floor, King bed, No peanuts" value={form.preference_value}
            onChange={(e) => setForm({ ...form, preference_value: e.target.value })} />
        </div>
        <button type="submit" style={styles.btn('#0f2540')} disabled={saving}>
          {saving ? 'Saving...' : '+ Add Preference'}
        </button>
      </form>
    </div>
  )
}

function DocumentsTab({ profileId }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ document_type: 'Passport', document_number: '', issuing_country: '', expiry_date: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('guest_documents').select('*').eq('profile_id', profileId).order('created_at', { ascending: false })
    setDocs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [profileId])

  async function addDoc(e) {
    e.preventDefault()
    if (!form.document_number.trim()) return
    setSaving(true)
    await supabase.from('guest_documents').insert({
      profile_id: profileId,
      document_type: form.document_type,
      document_number: form.document_number,
      issuing_country: form.issuing_country || null,
      expiry_date: form.expiry_date || null,
    })
    setForm({ document_type: 'Passport', document_number: '', issuing_country: '', expiry_date: '' })
    setSaving(false)
    load()
  }

  return (
    <div style={styles.card}>
      {loading ? '…' : docs.length === 0 ? (
        <p style={styles.empty}>No documents on file.</p>
      ) : (
        docs.map((d) => (
          <div key={d.id} style={styles.listItem}>
            <span>{d.document_type} — {d.document_number} {d.issuing_country ? `(${d.issuing_country})` : ''}</span>
            <span style={{ color: '#64748b' }}>{d.expiry_date ? `Expires ${d.expiry_date}` : ''}</span>
          </div>
        ))
      )}

      <form onSubmit={addDoc} style={{ marginTop: '16px' }}>
        <div style={styles.formRow}>
          <select style={styles.input} value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
            <option value="Passport">Passport</option>
            <option value="National ID">National ID</option>
            <option value="Visa">Visa</option>
            <option value="Driving License">Driving License</option>
          </select>
          <input style={styles.input} placeholder="Document Number" value={form.document_number}
            onChange={(e) => setForm({ ...form, document_number: e.target.value })} />
          <input style={styles.input} placeholder="Issuing Country" value={form.issuing_country}
            onChange={(e) => setForm({ ...form, issuing_country: e.target.value })} />
          <input style={styles.input} type="date" value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </div>
        <button type="submit" style={styles.btn('#0f2540')} disabled={saving}>
          {saving ? 'Saving...' : '+ Add Document'}
        </button>
      </form>
    </div>
  )
}

function HistoryTab({ profileId }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase.from('guest_history').select('*').eq('profile_id', profileId).order('event_date', { ascending: false })
      setHistory(data || [])
      setLoading(false)
    }
    load()
  }, [profileId])

  return (
    <div style={styles.card}>
      {loading ? '…' : history.length === 0 ? (
        <p style={styles.empty}>No history recorded yet.</p>
      ) : (
        history.map((h) => (
          <div key={h.id} style={styles.listItem}>
            <span><strong>{h.event_type}</strong> — {h.description || ''}</span>
            <span style={{ color: '#64748b' }}>{h.event_date}</span>
          </div>
        ))
      )}
    </div>
  )
}
