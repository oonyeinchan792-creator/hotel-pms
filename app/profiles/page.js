// app/profiles/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { searchProfiles } from '../../lib/profiles';

const TYPE_LABELS = {
  all: 'All Profiles',
  guest: 'Guest',
  company: 'Company',
  travel_agent: 'Travel Agent',
  source_agent: 'Source Agent',
  source: 'Source',
  group: 'Group',
};

const styles = {
  page: { padding: '30px' },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: { fontSize: '26px', fontWeight: 'bold', color: '#0f2540', margin: 0 },
  newBtn: {
    background: '#0f2540',
    color: 'white',
    padding: '10px 18px',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  filterCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  input: {
    flex: 1,
    minWidth: '240px',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
  },
  searchBtn: {
    background: '#334155',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tableCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: '12px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    color: '#0f2540',
  },
  emptyRow: {
    padding: '30px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  link: { color: '#1d4ed8', textDecoration: 'none', fontWeight: 'bold' },
  badgeVip: {
    marginLeft: '8px',
    fontSize: '11px',
    background: '#fef3c7',
    color: '#92400e',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  statusActive: { color: '#16a34a', fontWeight: 'bold' },
  statusInactive: { color: '#94a3b8' },
  statusBlacklisted: { color: '#dc2626', fontWeight: 'bold' },
  subText: { color: '#64748b', fontSize: '13px' },
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  async function loadProfiles() {
    setLoading(true);
    try {
      const results = await searchProfiles({ type: typeFilter, searchText });
      setProfiles(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadProfiles();
  }

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Profiles</h1>
        <Link href="/profiles/new" style={styles.newBtn}>
          + New Profile
        </Link>
      </div>

      <form onSubmit={handleSearchSubmit} style={styles.filterCard}>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={styles.input}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.select}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button type="submit" style={styles.searchBtn}>
          Search
        </button>
      </form>

      <div style={styles.tableCard}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Location</th>
              <th style={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>
                  Loading...
                </td>
              </tr>
            )}

            {!loading && profiles.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.emptyRow}>
                  No profiles found.
                </td>
              </tr>
            )}

            {!loading &&
              profiles.map((p) => (
                <tr key={p.id}>
                  <td style={styles.td}>
                    <Link href={`/profiles/${p.id}`} style={styles.link}>
                      {p.full_name}
                    </Link>
                    {p.vip_status && (
                      <span style={styles.badgeVip}>{p.vip_status}</span>
                    )}
                  </td>
                  <td style={styles.td}>{TYPE_LABELS[p.profile_type]}</td>
                  <td style={styles.td}>
                    <div>{p.email || '-'}</div>
                    <div style={styles.subText}>{p.phone || '-'}</div>
                  </td>
                  <td style={styles.td}>
                    {[p.city, p.country].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td style={styles.td}>
                    {p.is_blacklisted ? (
                      <span style={styles.statusBlacklisted}>Blacklisted</span>
                    ) : p.is_active ? (
                      <span style={styles.statusActive}>Active</span>
                    ) : (
                      <span style={styles.statusInactive}>Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
