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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Profiles</h1>
        <Link
          href="/profiles/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          + New Profile
        </Link>
      </div>

      {/* Filters */}
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="border rounded-md px-3 py-2 flex-1 min-w-[240px]"
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border rounded-md px-3 py-2"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900"
        >
          Search
        </button>
      </form>

      {/* Results table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Location</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && profiles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No profiles found.
                </td>
              </tr>
            )}

            {!loading &&
              profiles.map((p) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/profiles/${p.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {p.full_name}
                    </Link>
                    {p.vip_status && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                        {p.vip_status}
                      </span>
                    )}
                  </td>
                  <td className="p-3 capitalize">
                    {TYPE_LABELS[p.profile_type]}
                  </td>
                  <td className="p-3">
                    <div>{p.email || '-'}</div>
                    <div className="text-gray-500">{p.phone || '-'}</div>
                  </td>
                  <td className="p-3">
                    {[p.city, p.country].filter(Boolean).join(', ') || '-'}
                  </td>
                  <td className="p-3">
                    {p.is_blacklisted ? (
                      <span className="text-red-600 font-medium">Blacklisted</span>
                    ) : p.is_active ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-gray-400">Inactive</span>
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
