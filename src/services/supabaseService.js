/**
 * supabaseService.js — Centralised data-access layer.
 *
 * Every Supabase query that was previously inline inside a component is now
 * a named function here.  Components call these helpers instead of importing
 * `supabase` directly.  This makes testing, caching and eventual migration
 * far easier.
 */

import { supabase } from '../supabaseClient';

// ────────────────────────────────────────────────────────────────────────────
// Assumptions / FX
// ────────────────────────────────────────────────────────────────────────────
export const fetchFxRates = async () => {
  const { data } = await supabase
    .from('assumptions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
};

export const upsertFxRates = async (rates) => {
  const existing = await fetchFxRates();
  if (existing) {
    return supabase.from('assumptions').update(rates).eq('id', existing.id);
  }
  return supabase.from('assumptions').insert(rates);
};

// ────────────────────────────────────────────────────────────────────────────
// Deals
// ────────────────────────────────────────────────────────────────────────────
export const fetchDeals = async () => {
  const { data } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const createDeal = (payload) =>
  supabase.from('deals').insert(payload);

export const updateDeal = (id, payload) =>
  supabase.from('deals').update(payload).eq('id', id);

export const deleteDeal = (id) =>
  supabase.from('deals').delete().eq('id', id);

// ────────────────────────────────────────────────────────────────────────────
// Investors
// ────────────────────────────────────────────────────────────────────────────
export const fetchInvestors = async () => {
  const { data } = await supabase.from('investors').select('*').order('full_name');
  return data || [];
};

export const createInvestor = (payload) =>
  supabase.from('investors').insert(payload);

export const updateInvestor = (id, payload) =>
  supabase.from('investors').update(payload).eq('id', id);

export const deleteInvestor = (id) =>
  supabase.from('investors').delete().eq('id', id);

export const findInvestorByLogin = async (identifier) => {
  const id = identifier.toLowerCase().trim();
  const { data, error } = await supabase
    .from('investors')
    .select('*')
    .or(`username.ilike.${id},email.ilike.${id}`)
    .single();
  return { data, error };
};

export const findAdminByLogin = async (identifier) => {
  const id = identifier.toLowerCase().trim();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .or(`username.ilike.${id},email.ilike.${id}`)
    .single();
  return { data, error };
};

// ────────────────────────────────────────────────────────────────────────────
// Admin Users
// ────────────────────────────────────────────────────────────────────────────
export const fetchAdminUsers = async () => {
  const { data } = await supabase.from('admin_users').select('*').order('full_name');
  return data || [];
};

export const createAdminUser = (payload) =>
  supabase.from('admin_users').insert(payload);

export const updateAdminUser = (id, payload) =>
  supabase.from('admin_users').update(payload).eq('id', id);

export const deleteAdminUser = (id) =>
  supabase.from('admin_users').delete().eq('id', id);

// ────────────────────────────────────────────────────────────────────────────
// Positions
// ────────────────────────────────────────────────────────────────────────────
export const fetchPositions = async (table, filters = {}) => {
  let query = supabase.from(table).select('*');
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      query = query.eq(key, val);
    }
  });
  query = query.order('statement_date', { ascending: false });
  const { data } = await query;
  return data || [];
};

export const insertPosition = (table, payload) =>
  supabase.from(table).insert(payload);

export const updatePosition = (table, id, payload) =>
  supabase.from(table).update(payload).eq('id', id);

export const deletePosition = (table, id) =>
  supabase.from(table).delete().eq('id', id);

// ────────────────────────────────────────────────────────────────────────────
// Distributions
// ────────────────────────────────────────────────────────────────────────────
export const fetchDistributions = async () => {
  const { data } = await supabase
    .from('distributions')
    .select('*, deals(name, currency)')
    .order('distribution_date', { ascending: false });
  return data || [];
};

export const createDistribution = (payload) =>
  supabase.from('distributions').insert(payload);

export const fetchInvestorDistributions = async (distributionId) => {
  const { data } = await supabase
    .from('investor_distributions')
    .select('*, investors(full_name)')
    .eq('distribution_id', distributionId);
  return data || [];
};

export const upsertInvestorDistribution = (payload) =>
  supabase.from('investor_distributions').upsert(payload);

// ────────────────────────────────────────────────────────────────────────────
// Reports
// ────────────────────────────────────────────────────────────────────────────
export const fetchReports = async (dealId) => {
  let query = supabase.from('reports').select('*, deals(name)').order('uploaded_at', { ascending: false });
  if (dealId) query = query.eq('deal_id', dealId);
  const { data } = await query;
  return data || [];
};

export const createReport = (payload) =>
  supabase.from('reports').insert(payload);

export const deleteReport = (id) =>
  supabase.from('reports').delete().eq('id', id);

// ────────────────────────────────────────────────────────────────────────────
// Updates
// ────────────────────────────────────────────────────────────────────────────
export const fetchUpdates = async () => {
  const { data } = await supabase.from('updates').select('*').order('created_at', { ascending: false });
  return data || [];
};

export const createUpdate = (payload) =>
  supabase.from('updates').insert(payload);

export const updateUpdate = (id, payload) =>
  supabase.from('updates').update(payload).eq('id', id);

export const deleteUpdate = (id) =>
  supabase.from('updates').delete().eq('id', id);

// ────────────────────────────────────────────────────────────────────────────
// NAV Management
// ────────────────────────────────────────────────────────────────────────────
export const fetchNavUpdates = async (dealId) => {
  let query = supabase.from('nav_updates').select('*, deals(name, currency)').order('effective_date', { ascending: false });
  if (dealId) query = query.eq('deal_id', dealId);
  const { data } = await query;
  return data || [];
};

export const createNavUpdate = (payload) =>
  supabase.from('nav_updates').insert(payload);

// ────────────────────────────────────────────────────────────────────────────
// Messages
// ────────────────────────────────────────────────────────────────────────────
export const fetchMessages = async (investorId) => {
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('investor_id', investorId)
    .order('created_at');
  return data || [];
};

export const sendMessage = (payload) =>
  supabase.from('messages').insert(payload);

// ────────────────────────────────────────────────────────────────────────────
// Interest Submissions
// ────────────────────────────────────────────────────────────────────────────
export const fetchInterestSubmissions = async (limit = 5) => {
  const { data } = await supabase
    .from('interest_submissions')
    .select('*, investors(full_name), deals(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
};

export const createInterestSubmission = (payload) =>
  supabase.from('interest_submissions').insert(payload);

// ────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ────────────────────────────────────────────────────────────────────────────
export const uploadFile = async (bucket, path, file) => {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Re-export the supabase client for edge cases (real-time subscriptions, etc.)
export { supabase };
