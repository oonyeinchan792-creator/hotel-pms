import { supabase } from './supabase';

export async function logAction(tableName, recordId, action, details, changedBy) {
  await supabase.from('system_audit_log').insert({
    table_name: tableName,
    record_id: String(recordId ?? ''),
    action,
    details,
    changed_by: changedBy || null,
  });
}

export async function listRows(table) {
  const { data, error } = await supabase.from(table).select('*').order('id');
  if (error) throw error;
  return data;
}

export async function insertRow(table, values, actor) {
  const { data, error } = await supabase.from(table).insert(values).select().single();
  if (error) throw error;
  await logAction(table, data.id, 'insert', values, actor);
  return data;
}

export async function updateRow(table, id, values, actor) {
  const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single();
  if (error) throw error;
  await logAction(table, id, 'update', values, actor);
  return data;
}

export async function deleteRow(table, id, actor) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
  await logAction(table, id, 'delete', null, actor);
}

export async function getAuditLog(limit = 50) {
  const { data, error } = await supabase
    .from('system_audit_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getRoomTypes() {
  const { data, error } = await supabase.from('room_types').select('id, name');
  if (error) throw error;
  return data;
}

export async function getHotelSettings() {
  const { data, error } = await supabase.from('hotel_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data;
}

export async function updateHotelSettings(values, actor) {
  const { data, error } = await supabase.from('hotel_settings').update(values).eq('id', 1).select().single();
  if (error) throw error;
  await logAction('hotel_settings', 1, 'update', values, actor);
  return data;
}
