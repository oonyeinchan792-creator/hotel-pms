import { supabase } from './supabase';

export async function getOccupancyReport(date) {
  const { data: rooms, error: roomsErr } = await supabase
    .from('rooms').select('id, room_type_id, room_types(name)');
  if (roomsErr) throw roomsErr;

  const { data: resv, error: resvErr } = await supabase
    .from('reservations')
    .select('room_id')
    .lte('check_in_date', date)
    .gt('check_out_date', date)
    .in('status', ['checked_in', 'confirmed']);
  if (resvErr) throw resvErr;

  const occupiedRoomIds = new Set(resv.map(r => r.room_id));
  const totalRooms = rooms.length;
  const occupiedRooms = occupiedRoomIds.size;
  const byType = {};
  rooms.forEach(r => {
    const typeName = r.room_types?.name || 'Unknown';
    if (!byType[typeName]) byType[typeName] = { total: 0, occupied: 0 };
    byType[typeName].total++;
    if (occupiedRoomIds.has(r.id)) byType[typeName].occupied++;
  });

  return {
    date, totalRooms, occupiedRooms, vacantRooms: totalRooms - occupiedRooms,
    occupancyPercent: totalRooms ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
    byType
  };
}

export async function getRevenueReport(dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('folio_transactions')
    .select('amount, transaction_type, created_at')
    .eq('transaction_type', 'charge')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59');
  if (error) throw error;

  const total = data.reduce((s, t) => s + Number(t.amount), 0);
  const byDate = {};
  data.forEach(t => {
    const d = t.created_at.slice(0, 10);
    byDate[d] = (byDate[d] || 0) + Number(t.amount);
  });
  return { total, byDate, count: data.length };
}

export async function getArrivalReport(date) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, check_in_date, check_out_date, status, guests(first_name, last_name), rooms(room_number)')
    .eq('check_in_date', date)
    .neq('status', 'cancelled');
  if (error) throw error;
  return data;
}

export async function getDepartureReport(date) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, check_in_date, check_out_date, status, guests(first_name, last_name), rooms(room_number)')
    .eq('check_out_date', date)
    .neq('status', 'cancelled');
  if (error) throw error;
  return data;
}

export async function getInHouseGuestReport() {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, check_in_date, check_out_date, guests(first_name, last_name), rooms(room_number, floor)')
    .eq('status', 'checked_in');
  if (error) throw error;
  return data;
}

export async function getHousekeepingReport(date) {
  const { data, error } = await supabase
    .from('housekeeping_tasks')
    .select('id, status, assigned_to, room_id, created_at, rooms(room_number)')
    .gte('created_at', date)
    .lte('created_at', date + 'T23:59:59');
  if (error) throw error;

  const byStatus = {};
  data.forEach(t => { byStatus[t.status] = (byStatus[t.status] || 0) + 1; });
  return { tasks: data, byStatus };
}

export async function getCashierReport(date) {
  const { data, error } = await supabase
    .from('folio_transactions')
    .select('amount, transaction_type, payment_method, created_at')
    .gte('created_at', date)
    .lte('created_at', date + 'T23:59:59');
  if (error) throw error;

  const byMethod = {};
  data.forEach(t => {
    const m = t.payment_method || 'N/A';
    if (!byMethod[m]) byMethod[m] = { charge: 0, payment: 0 };
    byMethod[m][t.transaction_type === 'charge' ? 'charge' : 'payment'] += Number(t.amount);
  });
  return { transactions: data, byMethod };
}

export async function getNightAuditReport(limit = 30) {
  const { data, error } = await supabase
    .from('night_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getRoomRevenueReport(dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('folio_transactions')
    .select('amount, transaction_type, created_at, folios(reservation_id, reservations(room_id, rooms(room_number, room_types(name))))')
    .eq('transaction_type', 'charge')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo + 'T23:59:59');
  if (error) throw error;

  const byRoom = {};
  data.forEach(t => {
    const room = t.folios?.reservations?.rooms;
    const key = room?.room_number || 'Unknown';
    if (!byRoom[key]) byRoom[key] = { roomType: room?.room_types?.name || '-', total: 0 };
    byRoom[key].total += Number(t.amount);
  });
  return byRoom;
}

export async function getMarketSegmentReport(dateFrom, dateTo) {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, market_segment, check_in_date, folios(folio_transactions(amount, transaction_type))')
    .gte('check_in_date', dateFrom)
    .lte('check_in_date', dateTo);
  if (error) throw error;

  const bySegment = {};
  data.forEach(r => {
    const seg = r.market_segment || 'Unspecified';
    if (!bySegment[seg]) bySegment[seg] = { count: 0, revenue: 0 };
    bySegment[seg].count++;
    (r.folios || []).forEach(f => {
      (f.folio_transactions || []).forEach(t => {
        if (t.transaction_type === 'charge') bySegment[seg].revenue += Number(t.amount);
      });
    });
  });
  return bySegment;
}
