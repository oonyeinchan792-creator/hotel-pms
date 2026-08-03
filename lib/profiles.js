// lib/profiles.js
//
// Database ကို ဒီနေရာကနေပဲ ခေါ်ဆိုမှာပါ

import { supabase } from './supabase';

// --------------------------------------------------------
// Search / list profiles (optionally filter by type + text)
// --------------------------------------------------------
export async function searchProfiles({ type, searchText }) {
  let query = supabase
    .from('profiles')
    .select(
      'id, profile_type, full_name, email, phone, city, country, is_active, is_blacklisted, vip_status, created_at'
    )
    .order('created_at', { ascending: false });

  if (type && type !== 'all') {
    query = query.eq('profile_type', type);
  }

  if (searchText && searchText.trim() !== '') {
    const term = `%${searchText.trim()}%`;
    query = query.or(
      `full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`
    );
  }

  const { data, error } = await query.limit(100);

  if (error) {
    console.error('searchProfiles error:', error);
    throw error;
  }

  return data;
}

// --------------------------------------------------------
// Get one profile + its type-specific detail row
// --------------------------------------------------------
const DETAIL_TABLE_BY_TYPE = {
  guest: 'guest_profile_details',
  company: 'company_profile_details',
  travel_agent: 'travel_agent_profile_details',
  source_agent: 'source_agent_profile_details',
  source: 'source_profile_details',
  group: null, // group profiles use only the base table for now
};

export async function getProfileWithDetails(id) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (profileError) throw profileError;

  const detailTable = DETAIL_TABLE_BY_TYPE[profile.profile_type];
  let details = null;

  if (detailTable) {
    const { data, error } = await supabase
      .from(detailTable)
      .select('*')
      .eq('profile_id', id)
      .maybeSingle();

    if (error) throw error;
    details = data;
  }

  return { profile, details };
}
