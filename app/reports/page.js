'use client';
import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import {
  getOccupancyReport, getRevenueReport, getArrivalReport, getDepartureReport,
  getInHouseGuestReport, getHousekeepingReport, getCashierReport,
  getNightAuditReport, getRoomRevenueReport, getMarketSegmentReport
} from '../../lib/reports';

const REPORT_TYPES = [
  { key: 'occupancy', label: 'Occupancy Report', dateMode: 'single' },
  { key: 'revenue', label: 'Revenue Report', dateMode: 'range' },
  { key: 'arrival', label: 'Arrival Report', dateMode: 'single' },
  { key: 'departure', label: 'Departure Report', dateMode: 'single' },
  { key: 'inhouse', label: 'In-House Guest Report', dateMode: 'none' },
  { key: 'housekeeping', label: 'Housekeeping Report', dateMode: 'single' },
  { key: 'cashier', label: 'Cashier Report', dateMode: 'single' },
  { key: 'nightaudit', label: 'Night Audit Report', dateMode: 'none' },
  { key: 'roomrevenue', label: 'Room Revenue Report', dateMode: 'range' },
  { key: 'marketsegment', label: 'Market Segment Report', dateMode: 'range' },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState('occupancy');
  const [date, setDate] = useState(today());
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const currentType = REPORT_TYPES.find(r => r.key === activeReport);

  async function runReport() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      let data;
      switch (activeReport) {
        case 'occupancy': data = await getOccupancyReport(date); break;
        case 'revenue': data = await getRevenueReport(dateFrom, dateTo); break;
        case 'arrival': data = await getArrivalReport(date); break;
        case 'departure': data = await getDepartureReport(date); break;
        case 'inhouse': data = await getInHouseGuestReport(); break;
        case 'housekeeping': data = await getHousekeepingReport(date); break;
        case 'cashier': data = await getCashierReport(date); break;
        case 'nightaudit': data = await getNightAuditReport(); break;
        case 'roomrevenue': data = await getRoomRevenueReport(dateFrom, dateTo); break;
        case 'marketsegment': data = await getMarketSegmentReport(dateFrom, dateTo); break;
        default: data = null;
      }
      setResult(data);
    } catch (e) {
      setError(e.message || 'Error loading report');
    }
    setLoading(false);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#eef1f5' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: 24 }}>
        <h1 style={{ color: '#0f2540', marginBottom: 16 }}>Reports</h1>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {REPORT_TYPES.map(rt => (
            <button
              key={rt.key}
              onClick={() => { setActiveReport(rt.key); setResult(null); setError(''); }}
              style={{
                padding: '8px 14px',
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: activeReport === rt.key ? '#0f2540' : '#fff',
                color: activeReport === rt.key ? '#fff' : '#0f2540',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              {rt.label}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {currentType.dateMode === 'single' && (
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
              </div>
            )}
            {currentType.dateMode === 'range' && (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    style={{ padding: 8, border: '1px solid #e2e8f0', borderRadius: 6 }} />
                </div>
              </>
            )}
            <button onClick={runReport} disabled={loading}
              style={{ padding: '9px 20px', background: '#0f2540', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              {loading ? 'Loading...' : 'Run Report'}
            </button>
            {result && (
              <button onClick={() => window.print()}
                style={{ padding: '9px 20px', background: '#fff', color: '#0f2540', border: '1px solid #0f2540', borderRadius: 6, cursor: 'pointer' }}>
                Print
              </button>
            )}
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', marginBottom: 16 }}>{error}</div>}

        {result && (
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
            <ReportOutput type={activeReport} data={result} />
          </div>
        )}
      </div>
    </div>
  );
}

function th(text) {
  return <th style={{ textAlign: 'left', padding: 8, borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: 12 }}>{text}</th>;
}
function td(content, key) {
  return <td key={key} style={{ padding: 8, borderBottom: '1px solid #e2e8f0', fontSize: 14, color: '#0f2540' }}>{content}</td>;
}

function ReportOutput({ type, data }) {
  if (type === 'occupancy') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Occupancy Report — {data.date}</h3>
        <div style={{ display: 'flex', gap: 24, margin: '16px 0' }}>
          <Stat label="Total Rooms" value={data.totalRooms} />
          <Stat label="Occupied" value={data.occupiedRooms} />
          <Stat label="Vacant" value={data.vacantRooms} />
          <Stat label="Occupancy %" value={`${data.occupancyPercent}%`} />
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Room Type')}{th('Total')}{th('Occupied')}{th('Occ %')}</tr></thead>
          <tbody>
            {Object.entries(data.byType).map(([name, v]) => (
              <tr key={name}>
                {td(name)}{td(v.total)}{td(v.occupied)}{td(v.total ? ((v.occupied / v.total) * 100).toFixed(1) + '%' : '-')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'revenue') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Revenue Report</h3>
        <Stat label="Total Revenue" value={data.total.toFixed(2)} />
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
          <thead><tr>{th('Date')}{th('Amount')}</tr></thead>
          <tbody>
            {Object.entries(data.byDate).sort().map(([d, amt]) => (
              <tr key={d}>{td(d)}{td(amt.toFixed(2))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'arrival' || type === 'departure') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>{type === 'arrival' ? 'Arrival' : 'Departure'} Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Guest')}{th('Room')}{th('Check-In')}{th('Check-Out')}{th('Status')}</tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                {td(`${r.guests?.first_name || ''} ${r.guests?.last_name || ''}`)}
                {td(r.rooms?.room_number || '-')}
                {td(r.check_in_date)}
                {td(r.check_out_date)}
                {td(r.status)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'inhouse') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>In-House Guest Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Guest')}{th('Room')}{th('Floor')}{th('Check-In')}{th('Check-Out')}</tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.id}>
                {td(`${r.guests?.first_name || ''} ${r.guests?.last_name || ''}`)}
                {td(r.rooms?.room_number || '-')}
                {td(r.rooms?.floor ?? '-')}
                {td(r.check_in_date)}
                {td(r.check_out_date)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'housekeeping') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Housekeeping Report</h3>
        <div style={{ display: 'flex', gap: 24, margin: '16px 0' }}>
          {Object.entries(data.byStatus).map(([s, c]) => <Stat key={s} label={s} value={c} />)}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Room')}{th('Status')}{th('Assigned To')}{th('Time')}</tr></thead>
          <tbody>
            {data.tasks.map(t => (
              <tr key={t.id}>
                {td(t.rooms?.room_number || '-')}
                {td(t.status)}
                {td(t.assigned_to || '-')}
                {td(new Date(t.created_at).toLocaleString())}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'cashier') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Cashier Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Payment Method')}{th('Charges')}{th('Payments')}</tr></thead>
          <tbody>
            {Object.entries(data.byMethod).map(([m, v]) => (
              <tr key={m}>{td(m)}{td(v.charge.toFixed(2))}{td(v.payment.toFixed(2))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'nightaudit') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Night Audit Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Business Date')}{th('Run At')}{th('Revenue Posted')}{th('Tax Posted')}{th('Rooms Processed')}</tr></thead>
          <tbody>
            {data.map(l => (
              <tr key={l.id}>
                {td(l.business_date)}
                {td(l.run_at ? new Date(l.run_at).toLocaleString() : '-')}
                {td(Number(l.revenue_posted).toFixed(2))}
                {td(Number(l.tax_posted).toFixed(2))}
                {td(l.rooms_processed ?? '-')}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'roomrevenue') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Room Revenue Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Room')}{th('Room Type')}{th('Revenue')}</tr></thead>
          <tbody>
            {Object.entries(data).map(([room, v]) => (
              <tr key={room}>{td(room)}{td(v.roomType)}{td(v.total.toFixed(2))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === 'marketsegment') {
    return (
      <div>
        <h3 style={{ color: '#0f2540' }}>Market Segment Report</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{th('Segment')}{th('Reservations')}{th('Revenue')}</tr></thead>
          <tbody>
            {Object.entries(data).map(([seg, v]) => (
              <tr key={seg}>{td(seg)}{td(v.count)}{td(v.revenue.toFixed(2))}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

function Stat({ label, value }) {
  return (
    <div style={{ background: '#eef1f5', padding: '12px 20px', borderRadius: 8, minWidth: 100 }}>
      <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#0f2540' }}>{value}</div>
    </div>
  );
}
