import { supabase } from './supabase';

export const MODULES = [
  { key: '/', label: 'Dashboard' },
  { key: '/rooms', label: 'Room Status' },
  { key: '/reservations', label: 'Reservations' },
  { key: '/frontdesk', label: 'Front Desk' },
  { key: '/guests', label: 'Guests' },
  { key: '/profiles', label: 'Profiles' },
  { key: '/crm', label: 'CRM / Loyalty' },
  { key: '/billing', label: 'Billing' },
  { key: '/reports', label: 'Reports' },
  { key: '/housekeeping', label: 'Housekeeping' },
  { key: '/maintenance', label: 'Maintenance' },
  { key: '/rates', label: 'Rate Management' },
  { key: '/nightaudit', label: 'Night Audit' },
  { key: '/configuration', label: 'Configuration' },
  { key: '/integrations', label: 'Integrations' },
  { key: '/roles', label: 'Roles & Permissions' },
];

// ---- Roles ----
export async function getRoles() {
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return data;
}
export async function createRole(role) {
  const { data, error } = await supabase.from('roles').insert([role]).select().single();
  if (error) throw error;
  return data;
}
export async function deleteRole(id) {
  const { error } = await supabase.from('roles').delete().eq('id', id);
  if (error) throw error;
}

// ---- Permissions ----
export async function getPermissionsForRole(roleId) {
  const { data, error } = await supabase.from('role_permissions').select('*').eq('role_id', roleId);
  if (error) throw error;
  return data;
}
export async function setRolePermissions(roleId, moduleKeys) {
  const { error: delErr } = await supabase.from('role_permissions').delete().eq('role_id', roleId);
  if (delErr) throw delErr;
  if (moduleKeys.length === 0) return [];
  const rows = moduleKeys.map((key) => ({ role_id: roleId, module_key: key, can_access: true }));
  const { data, error } = await supabase.from('role_permissions').insert(rows).select();
  if (error) throw error;
  return data;
}

// ---- Staff assignment ----
export async function getStaffList() {
  const { data, error } = await supabase.from('staff_profiles').select('*').order('full_name');
  if (error) throw error;
  return data;
}
export async function assignStaffRole(staffId, roleId) {
  const { data, error } = await supabase
    .from('staff_profiles')
    .update({ role_id: roleId || null })
    .eq('id', staffId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Access check (used by AuthContext) ----
export async function getAllowedModules(profile) {
  if (!profile) return [];
  if (profile.role === 'admin') return MODULES.map((m) => m.key);
  if (!profile.role_id) return ['/'];
  const { data, error } = await supabase
    .from('role_permissions')
    .select('module_key')
    .eq('role_id', profile.role_id);
  if (error) return ['/'];
  const keys = data.map((r) => r.module_key);
  return keys.includes('/') ? keys : ['/', ...keys];
}
