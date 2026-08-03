// app/profiles/new/page.js
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

const styles = {
  page: { padding: '30px', maxWidth: '760px' },
  title: { fontSize: '26px', fontWeight: 'bold', color: '#0f2540', marginBottom: '20px' },
  card: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#64748b',
    textTransform: 'uppercase',
    margin: '20px 0 10px 0',
  },
  row: { display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap' },
  field: { flex: 1, minWidth: '220px' },
  label: { display: 'block', fontSize: '13px', color: '#334155', marginBottom: '4px' },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  saveBtn: {
    background: '#0f2540',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
  },
  cancelLink: {
    marginLeft: '14px',
    color: '#64748b',
    fontSize: '14px',
    textDecoration: 'none',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '14px',
  },
};

const TYPE_OPTIONS = [
  { value: 'guest', label: 'Guest' },
  { value: 'company', label: 'Company' },
  { value: 'travel_agent', label: 'Travel Agent' },
  { value: 'source_agent', label: 'Source Agent' },
  { value: 'source', label: 'Source' },
];

export default function NewProfilePage() {
  const router = useRouter();
  const [profileType, setProfileType] = useState('guest');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // base fields (shared by every profile type)
  const [base, setBase] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
  });

  // type-specific fields
  const [guest, setGuest] = useState({ first_name: '', last_name: '', nationality: '', id_type: '', id_number: '' });
  const [company, setCompany] = useState({ tax_id: '', industry: '', payment_terms: '', primary_contact_name: '', primary_contact_phone: '' });
  const [travelAgent, setTravelAgent] = useState({ iata_number: '', commission_percent: '', primary_contact_name: '', primary_contact_phone: '' });
  const [sourceAgent, setSourceAgent] = useState({ agency_name: '', commission_percent: '', primary_contact_name: '', primary_contact_phone: '' });
  const [source, setSource] = useState({ source_code: '', market_segment: '', channel_type: '' });

  function updateBase(field, value) {
    setBase((b) => ({ ...b, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!base.full_name.trim()) {
      setError('Name is required.');
      return;
    }

    setSaving(true);
    try {
      // 1. insert into base profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          profile_type: profileType,
          full_name: base.full_name,
          email: base.email || null,
          phone: base.phone || null,
          city: base.city || null,
          country: base.country || null,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      // 2. insert into the matching detail table
      if (profileType === 'guest') {
        const { error: detailError } = await supabase.from('guest_profile_details').insert({
          profile_id: profile.id,
          first_name: guest.first_name || null,
          last_name: guest.last_name || null,
          nationality: guest.nationality || null,
          id_type: guest.id_type || null,
          id_number: guest.id_number || null,
        });
        if (detailError) throw detailError;
      } else if (profileType === 'company') {
        const { error: detailError } = await supabase.from('company_profile_details').insert({
          profile_id: profile.id,
          tax_id: company.tax_id || null,
          industry: company.industry || null,
          payment_terms: company.payment_terms || null,
          primary_contact_name: company.primary_contact_name || null,
          primary_contact_phone: company.primary_contact_phone || null,
        });
        if (detailError) throw detailError;
      } else if (profileType === 'travel_agent') {
        const { error: detailError } = await supabase.from('travel_agent_profile_details').insert({
          profile_id: profile.id,
          iata_number: travelAgent.iata_number || null,
          commission_percent: travelAgent.commission_percent ? Number(travelAgent.commission_percent) : null,
          primary_contact_name: travelAgent.primary_contact_name || null,
          primary_contact_phone: travelAgent.primary_contact_phone || null,
        });
        if (detailError) throw detailError;
      } else if (profileType === 'source_agent') {
        const { error: detailError } = await supabase.from('source_agent_profile_details').insert({
          profile_id: profile.id,
          agency_name: sourceAgent.agency_name || null,
          commission_percent: sourceAgent.commission_percent ? Number(sourceAgent.commission_percent) : null,
          primary_contact_name: sourceAgent.primary_contact_name || null,
          primary_contact_phone: sourceAgent.primary_contact_phone || null,
        });
        if (detailError) throw detailError;
      } else if (profileType === 'source') {
        const { error: detailError } = await supabase.from('source_profile_details').insert({
          profile_id: profile.id,
          source_code: source.source_code || null,
          market_segment: source.market_segment || null,
          channel_type: source.channel_type || null,
        });
        if (detailError) throw detailError;
      }

      router.push('/profiles');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>New Profile</h1>

      <div style={styles.card}>
        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Profile Type</label>
              <select
                style={styles.select}
                value={profileType}
                onChange={(e) => setProfileType(e.target.value)}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.sectionTitle}>Basic Information</div>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>
                {profileType === 'guest' ? 'Full Name' : 'Name'}
              </label>
              <input
                style={styles.input}
                value={base.full_name}
                onChange={(e) => updateBase('full_name', e.target.value)}
              />
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                value={base.email}
                onChange={(e) => updateBase('email', e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Phone</label>
              <input
                style={styles.input}
                value={base.phone}
                onChange={(e) => updateBase('phone', e.target.value)}
              />
            </div>
          </div>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>City</label>
              <input
                style={styles.input}
                value={base.city}
                onChange={(e) => updateBase('city', e.target.value)}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Country</label>
              <input
                style={styles.input}
                value={base.country}
                onChange={(e) => updateBase('country', e.target.value)}
              />
            </div>
          </div>

          {/* ---- GUEST fields ---- */}
          {profileType === 'guest' && (
            <>
              <div style={styles.sectionTitle}>Guest Details</div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>First Name</label>
                  <input style={styles.input} value={guest.first_name}
                    onChange={(e) => setGuest({ ...guest, first_name: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Last Name</label>
                  <input style={styles.input} value={guest.last_name}
                    onChange={(e) => setGuest({ ...guest, last_name: e.target.value })} />
                </div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Nationality</label>
                  <input style={styles.input} value={guest.nationality}
                    onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>ID Type</label>
                  <input style={styles.input} placeholder="Passport / National ID" value={guest.id_type}
                    onChange={(e) => setGuest({ ...guest, id_type: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>ID Number</label>
                  <input style={styles.input} value={guest.id_number}
                    onChange={(e) => setGuest({ ...guest, id_number: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* ---- COMPANY fields ---- */}
          {profileType === 'company' && (
            <>
              <div style={styles.sectionTitle}>Company Details</div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Tax ID</label>
                  <input style={styles.input} value={company.tax_id}
                    onChange={(e) => setCompany({ ...company, tax_id: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Industry</label>
                  <input style={styles.input} value={company.industry}
                    onChange={(e) => setCompany({ ...company, industry: e.target.value })} />
                </div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Payment Terms</label>
                  <input style={styles.input} placeholder="e.g. Net 30" value={company.payment_terms}
                    onChange={(e) => setCompany({ ...company, payment_terms: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Name</label>
                  <input style={styles.input} value={company.primary_contact_name}
                    onChange={(e) => setCompany({ ...company, primary_contact_name: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Phone</label>
                  <input style={styles.input} value={company.primary_contact_phone}
                    onChange={(e) => setCompany({ ...company, primary_contact_phone: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* ---- TRAVEL AGENT fields ---- */}
          {profileType === 'travel_agent' && (
            <>
              <div style={styles.sectionTitle}>Travel Agent Details</div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>IATA Number</label>
                  <input style={styles.input} value={travelAgent.iata_number}
                    onChange={(e) => setTravelAgent({ ...travelAgent, iata_number: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Commission %</label>
                  <input style={styles.input} type="number" value={travelAgent.commission_percent}
                    onChange={(e) => setTravelAgent({ ...travelAgent, commission_percent: e.target.value })} />
                </div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Name</label>
                  <input style={styles.input} value={travelAgent.primary_contact_name}
                    onChange={(e) => setTravelAgent({ ...travelAgent, primary_contact_name: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Phone</label>
                  <input style={styles.input} value={travelAgent.primary_contact_phone}
                    onChange={(e) => setTravelAgent({ ...travelAgent, primary_contact_phone: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* ---- SOURCE AGENT fields ---- */}
          {profileType === 'source_agent' && (
            <>
              <div style={styles.sectionTitle}>Source Agent Details</div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Agency Name</label>
                  <input style={styles.input} value={sourceAgent.agency_name}
                    onChange={(e) => setSourceAgent({ ...sourceAgent, agency_name: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Commission %</label>
                  <input style={styles.input} type="number" value={sourceAgent.commission_percent}
                    onChange={(e) => setSourceAgent({ ...sourceAgent, commission_percent: e.target.value })} />
                </div>
              </div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Name</label>
                  <input style={styles.input} value={sourceAgent.primary_contact_name}
                    onChange={(e) => setSourceAgent({ ...sourceAgent, primary_contact_name: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Contact Phone</label>
                  <input style={styles.input} value={sourceAgent.primary_contact_phone}
                    onChange={(e) => setSourceAgent({ ...sourceAgent, primary_contact_phone: e.target.value })} />
                </div>
              </div>
            </>
          )}

          {/* ---- SOURCE fields ---- */}
          {profileType === 'source' && (
            <>
              <div style={styles.sectionTitle}>Source Details</div>
              <div style={styles.row}>
                <div style={styles.field}>
                  <label style={styles.label}>Source Code</label>
                  <input style={styles.input} value={source.source_code}
                    onChange={(e) => setSource({ ...source, source_code: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Market Segment</label>
                  <input style={styles.input} placeholder="OTA / Corporate / Leisure" value={source.market_segment}
                    onChange={(e) => setSource({ ...source, market_segment: e.target.value })} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Channel Type</label>
                  <input style={styles.input} placeholder="Online / Offline" value={source.channel_type}
                    onChange={(e) => setSource({ ...source, channel_type: e.target.value })} />
                </div>
              </div>
            </>
          )}

          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <a href="/profiles" style={styles.cancelLink}>Cancel</a>
        </form>
      </div>
    </div>
  );
}
