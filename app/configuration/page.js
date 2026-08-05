'use client';
import { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import {
  listRows, insertRow, updateRow, deleteRow, getAuditLog,
  getRoomTypes, getHotelSettings, updateHotelSettings,
} from '../../lib/admin';
import { supabase } from '../../lib/supabase';

const SIMPLE_TABLES = {
  floors: { label: 'Floor Setup', fields: [
    { key: 'floor_number', label: 'Floor Number', type: 'number' },
    { key: 'floor_name', label: 'Floor Name' },
    { key: 'notes', label: 'Notes' },
  ]},
  market_codes: { label: 'Market Code', fields: [
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
  ]},
  source_codes: { label: 'Source Code', fields: [
    { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' },
  ]},
  payment_types: { label: 'Payment Type', fields: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
  ]},
  currencies: { label: 'Currency', fields: [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'exchange_rate', label: 'Exchange Rate', type: 'number' },
    { key: 'is_base', label: 'Base Currency', type: 'checkbox' },
  ]},
  shifts: { label: 'Shift', fields: [
    { key: 'shift_name', label: 'Shift Name' },
    { key: 'start_time', label: 'Start Time', type: 'time' },
    { key: 'end_time', label: 'End Time', type: 'time' },
  ]},
};

export default function ConfigurationPage() {
  const [tab, setTab] = useState('rooms');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eef1f5' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24, marginLeft: 220 }}>
        <h1 style={{ color: '#0f2540', marginBottom: 16 }}>Configuration</h1>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <TabButton active={tab === 'rooms'} onClick={() => setTab('rooms')}>Room Setup</TabButton>
          {Object.entries(SIMPLE_TABLES).map(([key, cfg]) => (
            <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>{cfg.label}</TabButton>
          ))}
          <TabButton active={tab === 'tax'} onClick={() => setTab('tax')}>Tax</TabButton>
          <TabButton active={tab === 'auditlog'} onClick={() => setTab('auditlog')}>Audit Log</TabButton>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <a href="/rates" style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f2540', textDecoration: 'none', fontSize: 13 }}>
            Room Type Setup (Rate Management) &rarr;
          </a>
          <a href="/rates" style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#0f2540', textDecoration: 'none', fontSize: 13 }}>
            Rate Code (Rate Management) &rarr;
          </a>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
          {tab === 'rooms' && <RoomSetup />}
          {Object.keys(SIMPLE_TABLES).includes(tab) && <SimpleCrud table={tab} config={SIMPLE_TABLES[tab]} />}
          {tab === 'tax' && <TaxSetup />}
          {tab === 'auditlog' && <AuditLogView />}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 6, border: '1px solid #e2e8f0',
      background: active ? '#0f2540' : '#fff', color: active ? '#fff' : '#0f2540',
      cursor: 'pointer', fontSize: 13,
    }}>{children}</button>
  );
}

function emptyForm(fields) {
  const f = {};
  fields.forEach(fld => { f[fld.key] = fld.type === 'checkbox' ? false : ''; });
  return f;
}

function SimpleCrud({ table, config }) {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyForm(config.fields));
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try { setRows(await listRows(table)); } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); setForm(emptyForm(config.fields)); setEditId(null); }, [table]);

  async function save() {
    try {
      if (editId) await updateRow(table, editId, form, 'admin');
      else await insertRow(table, form, 'admin');
      setForm(emptyForm(config.fields));
      setEditId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this row?')) return;
    try { await deleteRow(table, id, 'admin'); load(); } catch (e) { setError(e.message); }
  }

  function edit(row) {
    setEditId(row.id);
    const f = {};
    config.fields.forEach(fld => { f[fld.key] = row[fld.key] ?? (fld.type === 'checkbox' ? false : ''); });
    setForm(f);
  }

  return (
    <div>
      <h3 style={{ color: '#0f2540', marginTop: 0 }}>{config.label}</h3>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        {config.fields.map(fld => (
          <div key={fld.key}>
            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>{fld.label}</label>
            {fld.type === 'checkbox' ? (
              <input type="checkbox" checked={!!form[fld.key]} onChange={e => setForm({ ...form, [fld.key]: e.target.checked })} />
            ) : (
              <input
                type={fld.type || 'text'}
                value={form[fld.key]}
                onChange={e => setForm({ ...form, [fld.key]: e.target.value })}
                style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}
              />
            )}
          </div>
        ))}
        <button onClick={save} style={{ padding: '9px 20px', background: '#0f2540', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {editId ? 'Update' : 'Add'}
        </button>
        {editId && (
          <button onClick={() => { setEditId(null); setForm(emptyForm(config.fields)); }}
            style={{ padding: '9px 20px', background: '#fff', color: '#0f2540', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {config.fields.map(fld => (
                <th key={fld.key} style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>{fld.label}</th>
              ))}
              <th style={{ padding: 8, borderBottom: '2px solid #e2e8f0' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                {config.fields.map(fld => (
                  <td key={fld.key} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>
                    {fld.type === 'checkbox' ? (row[fld.key] ? 'Yes' : 'No') : String(row[fld.key] ?? '-')}
                  </td>
                ))}
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0' }}>
                  <button onClick={() => edit(row)} style={{ marginRight: 8, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(row.id)} style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function RoomSetup() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [form, setForm] = useState({ room_number: '', floor: '', room_type_id: '', status: 'vacant_clean' });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('rooms').select('*, room_types(name)').order('room_number');
      if (error) throw error;
      setRooms(data || []);
      setRoomTypes(await getRoomTypes());
    } catch (e) { setError(e.message); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    try {
      if (editId) await updateRow('rooms', editId, form, 'admin');
      else await insertRow('rooms', form, 'admin');
      setForm({ room_number: '', floor: '', room_type_id: '', status: 'vacant_clean' });
      setEditId(null);
      load();
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    if (!confirm('Delete this room?')) return;
    try { await deleteRow('rooms', id, 'admin'); load(); } catch (e) { setError(e.message); }
  }

  function edit(r) {
    setEditId(r.id);
    setForm({ room_number: r.room_number || '', floor: r.floor || '', room_type_id: r.room_type_id || '', status: r.status || 'vacant_clean' });
  }

  return (
    <div>
      <h3 style={{ color: '#0f2540', marginTop: 0 }}>Room Setup</h3>
      {error && <div style={{ color: '#dc2626', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Room Number</label>
          <input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Floor</label>
          <input value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Room Type</label>
          <select value={form.room_type_id} onChange={e => setForm({ ...form, room_type_id: e.target.value })} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <option value="">-- select --</option>
            {roomTypes.map(rt => <option key={rt.id} value={rt.id}>{rt.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <option value="vacant_clean">Vacant Clean</option>
            <option value="vacant_dirty">Vacant Dirty</option>
            <option value="occupied_clean">Occupied Clean</option>
            <option value="occupied_dirty">Occupied Dirty</option>
            <option value="out_of_order">Out of Order</option>
          </select>
        </div>
        <button onClick={save} style={{ padding: '9px 20px', background: '#0f2540', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          {editId ? 'Update' : 'Add'}
        </button>
        {editId && (
          <button onClick={() => { setEditId(null); setForm({ room_number: '', floor: '', room_type_id: '', status: 'vacant_clean' }); }}
            style={{ padding: '9px 20px', background: '#fff', color: '#0f2540', border: '1px solid #e2e8f0', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </div>

      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Room</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Floor</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Room Type</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Status</th>
              <th style={{ padding: 8, borderBottom: '2px solid #e2e8f0' }}></th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(r => (
              <tr key={r.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>{r.room_number}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>{r.floor}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>{r.room_types?.name || '-'}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>{r.status}</td>
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
  );
}

function TaxSetup() {
  const [settings, setSettings] = useState(null);
  const [taxName, setTaxName] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [message, setMessage] = useState('');

  async function load() {
    const s = await getHotelSettings();
    setSettings(s);
    setTaxName(s.tax_name || 'Tax');
    setTaxRate(Number(s.tax_rate_percent) || 0);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    await updateHotelSettings({ tax_name: taxName, tax_rate_percent: taxRate }, 'admin');
    setMessage('Tax settings updated.');
    load();
  }

  if (!settings) return <p>Loading...</p>;

  return (
    <div>
      <h3 style={{ color: '#0f2540', marginTop: 0 }}>Tax</h3>
      {message && <div style={{ background: '#dcfce7', color: '#166534', padding: 10, borderRadius: 6, marginBottom: 12 }}>{message}</div>}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tax Name</label>
          <input value={taxName} onChange={e => setTaxName(e.target.value)} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Tax Rate (%)</label>
          <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
        </div>
        <button onClick={save} style={{ padding: '9px 20px', background: '#0f2540', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          Save
        </button>
      </div>
    </div>
  );
}

function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLog().then(setLogs).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h3 style={{ color: '#0f2540', marginTop: 0 }}>Audit Log</h3>
      <p style={{ fontSize: 12, color: '#64748b' }}>Tracks changes made through this Configuration page. Other modules will be wired in later.</p>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Time</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Table</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>Action</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>By</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id}>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{new Date(l.changed_at).toLocaleString()}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{l.table_name}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{l.action}</td>
                <td style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 13 }}>{l.changed_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
