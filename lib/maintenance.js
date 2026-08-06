import { supabase } from './supabase';

// ---- Work Orders ----
export async function getWorkOrders() {
  const { data, error } = await supabase.from('work_orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createWorkOrder(wo) {
  const { data, error } = await supabase.from('work_orders').insert([wo]).select().single();
  if (error) throw error;
  return data;
}
export async function updateWorkOrder(id, updates) {
  const { data, error } = await supabase.from('work_orders').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteWorkOrder(id) {
  const { error } = await supabase.from('work_orders').delete().eq('id', id);
  if (error) throw error;
}

// ---- Equipment ----
export async function getEquipment() {
  const { data, error } = await supabase.from('equipment').select('*').order('name', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createEquipment(eq) {
  const { data, error } = await supabase.from('equipment').insert([eq]).select().single();
  if (error) throw error;
  return data;
}
export async function updateEquipment(id, updates) {
  const { data, error } = await supabase.from('equipment').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deleteEquipment(id) {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  if (error) throw error;
}

// ---- Preventive Maintenance ----
export async function getPMSchedules() {
  const { data, error } = await supabase
    .from('pm_schedules')
    .select('*, equipment(name)')
    .order('next_due_date', { ascending: true });
  if (error) throw error;
  return data;
}
export async function createPMSchedule(pm) {
  const { data, error } = await supabase.from('pm_schedules').insert([pm]).select().single();
  if (error) throw error;
  return data;
}
export async function updatePMSchedule(id, updates) {
  const { data, error } = await supabase.from('pm_schedules').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}
export async function deletePMSchedule(id) {
  const { error } = await supabase.from('pm_schedules').delete().eq('id', id);
  if (error) throw error;
}
export function addDays(dateStr, days) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().split('T')[0];
}

// ---- Access Management ----
export async function getAccessRecords() {
  const { data, error } = await supabase.from('access_records').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}
export async function createAccessRecord(rec) {
  const { data, error } = await supabase.from('access_records').insert([rec]).select().single();
  if (error) throw error;
  return data;
}
export async function deleteAccessRecord(id) {
  const { error } = await supabase.from('access_records').delete().eq('id', id);
  if (error) throw error;
}
