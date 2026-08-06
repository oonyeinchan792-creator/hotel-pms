import { supabase } from './supabase';

function usernameToEmail(username) {
  return `${username.trim().toLowerCase().replace(/\s+/g, '')}@hotelpms.local`;
}

export async function loginWithUsername(username, password) {
  const email = usernameToEmail(username);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentStaffProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  return data;
}
