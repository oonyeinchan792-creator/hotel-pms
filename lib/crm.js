import { supabase } from './supabase';

// ---- Loyalty Tiers ----
export async function getTiers() {
  const { data, error } = await supabase.from('loyalty_tiers').select('*').order('min_points', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createTier(tier) {
  const { data, error } = await supabase.from('loyalty_tiers').insert([tier]).select().single();
  if (error) throw error;
  return data;
}
export async function deleteTier(id) {
  const { error } = await supabase.from('loyalty_tiers').delete().eq('id', id);
  if (error) throw error;
}
export function getTierForPoints(points, tiers) {
  const sorted = [...tiers].sort((a, b) => b.min_points - a.min_points);
  return sorted.find((t) => points >= t.min_points) || null;
}

// ---- Points ----
export async function getPointsBalance(profileId) {
  const { data, error } = await supabase.from('loyalty_points').select('points').eq('profile_id', profileId);
  if (error) throw error;
  return data.reduce((sum, row) => sum + row.points, 0);
}
export async function getPointsHistory(profileId) {
  const { data, error } = await supabase
    .from('loyalty_points')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function addPointsTransaction(entry) {
  const { data, error } = await supabase.from('loyalty_points').insert([entry]).select().single();
  if (error) throw error;
  return data;
}

// ---- Promotions ----
export async function getPromotions() {
  const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createPromotion(promo) {
  const { data, error } = await supabase.from('promotions').insert([promo]).select().single();
  if (error) throw error;
  return data;
}
export async function updatePromotion(id, updates) {
  const { data, error } = await supabase.from('promotions').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deletePromotion(id) {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw error;
}

// ---- Marketing Campaigns ----
export async function getCampaigns() {
  const { data, error } = await supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createCampaign(campaign) {
  const { data, error } = await supabase.from('marketing_campaigns').insert([campaign]).select().single();
  if (error) throw error;
  return data;
}
export async function updateCampaign(id, updates) {
  const { data, error } = await supabase.from('marketing_campaigns').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteCampaign(id) {
  const { error } = await supabase.from('marketing_campaigns').delete().eq('id', id);
  if (error) throw error;
}
