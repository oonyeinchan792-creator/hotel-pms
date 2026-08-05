'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import { listRows, insertRow, updateRow, deleteRow } from '../../lib/admin';

const CATEGORIES = [
  { key: 'pos', label: 'POS Integration' },
  { key: 'door_lock', label: 'Door Lock System' },
  { key: 'channel_manager', label: 'Channel Manager' },
  { key: 'ota', label: 'OTA (Booking.com, Agoda)' },
  { key: 'payment_gateway', label: 'Payment Gateway' },
  { key: 'email_sms', label: 'Email/SMS' },
  { key: 'accounting', label: 'Accounting Software' },
  { key: 'key_card', label: 'Key Card System' },
];

const emptyForm = { provider_name: '', api_key: '', api_secret: '', endpoint_url: '', is_enabled: false, notes: '' };

function maskSecret(v) {
  if (!v) return '-';
  if (v.length <= 4) return '****';
  return '*'.repeat(v.length - 4) + v.slice(-4);
}

export default function IntegrationsPage() {
  const [category, setCategory] = useState('pos');
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSecrets, setShowSecrets] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const all = await listRows('integrations');
      setRows((all || []).filter(r => r.category === category));
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  useEffect(() => { load(); setForm(emptyForm); setEditId(null); }, [category]);

  async function save() {
    try {
      const values = { ...form, category };
      if (editId) await updateRow('integrations', editId, values, 'admin');
      else await insertRow('integrations', values, 'admin');
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this integration entry?')) return;
    try { await deleteRow('integrations', id, 'admin'); load(); } catch (e) { setError(e.message); }
  }

  function edit(row) {
    setEditId(row.id);
    setForm({
      provider_name: row.provider_name || '',
      api_key: row.api_key || '',
      api_secret: row.api_secret || '',
      endpoint_url: row.endpoint_url || '',
      is_enabled: !!row.is_enabled,
      notes: row.notes || '',
    });
  }

  const currentLabel = CATEGORIES.find(c => c.key === category)?.label;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eef1f5' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, marginLeft: 220 }}>
        <h1 style={{ color: '#0f2540', marginBottom: 8 }}>Interfaces / Integrations</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
          This is a settings framework to store connection details for each provider. No live connections are made yet —
          add a provider's API key/endpoint here once you have a vendor account, and each one can be wired up to actually
          call out later.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
                background: category === c.key ? '#0f2540' : '#fff',
                color: category === c.key ? '#fff' : '#0f2540',
                cursor: 'pointer', fontSize: 13,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: '#0f2540', margin: 0 }}>{currentLabel}</h3>
            <label style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="checkbox" checked={showSecrets} onChange={e => setShowSecrets(e.target.checked)} />
              Show API keys/secrets
            </label>
          </div>

          {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Provider Name</label>
              <input value={form.provider_name} onChange={e => setForm({ ...form, provider_name: e.target.value })}
                placeholder="e.g. Booking.com, Stripe, dormakaba"
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, minWidth: 180 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Endpoint / URL</label>
              <input value={form.endpoint_url} onChange={e => setForm({ ...form, endpoint_url: e.target.value })}
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, minWidth: 200 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>API Key</label>
              <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })}
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, minWidth: 160 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>API Secret</label>
              <input value={form.api_secret} onChange={e => setForm({ ...form, api_secret: e.target.value })}
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, minWidth: 160 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Notes</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6, minWidth: 160 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" checked={form.is_enabled} onChange={e => setForm({ ...form, is_enabled: e.target.checked })} />
                Enabled
              </label>
            </div>
            <button onClick={save} style={{ padding: '9px 20px', background: '#0f2540', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {editId ? 'Update' : 'Add'}
            </button>
            {editId && (
              <button onClick={() => { setEditId(null); setForm(emptyForm); }}
                style={{ padding: '9px 20px', background: '#fff', color: '#0f2540', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
            )}
          </div>

          {loading ? <p>Loading...</p> : rows.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No {currentLabel} providers configured yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Provider</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Endpoint</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>API Key</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>API Secret</th>
                  <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Status</th>
                  <th style={{ padding: 8, borderBottom: '2px solid #e2e8f0' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>{r.provider_name || '-'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{r.endpoint_url || '-'}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace' }}>
                      {showSecrets ? (r.api_key || '-') : maskSecret(r.api_key)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13, fontFamily: 'monospace' }}>
                      {showSecrets ? (r.api_secret || '-') : maskSecret(r.api_secret)}
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 'bold',
                        background: r.is_enabled ? '#dcfce7' : '#f1f5f9',
                        color: r.is_enabled ? '#166534' : '#64748b',
                      }}>
                        {r.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                      <button onClick={() => edit(r)} style={{ marginRight: 8, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => remove(r.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
