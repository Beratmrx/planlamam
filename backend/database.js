import { createClient } from '@supabase/supabase-js';

// Bu dosya, eski `storage.json` davranışını Supabase Postgres'e taşır:
// - Frontend tek bir payload gönderir (users/categories/tasks/rentals/assets/...)
// - Biz de tablolar halinde saklarız (users/categories/tasks/rentals/assets + app_settings)

let supabase = null;
let hasWarnedAboutSchema = false;

function getSupabase() {
  if (supabase) return supabase;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde tanımlı olmalı.');
  }

  supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  return supabase;
}

async function warnIfSchemaMissing(error) {
  if (hasWarnedAboutSchema) return;
  const msg = String(error?.message || error || '');
  if (msg.toLowerCase().includes('relation') && (msg.toLowerCase().includes('users') || msg.toLowerCase().includes('categories') || msg.toLowerCase().includes('tasks') || msg.toLowerCase().includes('rentals') || msg.toLowerCase().includes('assets') || msg.toLowerCase().includes('app_settings'))) {
    hasWarnedAboutSchema = true;
    console.warn('⚠️ Supabase tablosu bulunamadı. `backend/supabase-schema.sql` içindeki SQL\'i Supabase\'te çalıştırın.');
  }
}

export async function getStorageFormat() {
  const client = getSupabase();
  try {
    const { data, error } = await client.rpc('get_storage');

    if (error) {
      await warnIfSchemaMissing(error);
      return { version: 1 };
    }

    if (!data) return { version: 1 };
    return data;
  } catch (error) {
    await warnIfSchemaMissing(error);
    console.error('❌ Storage okuma hatası:', error);
    return { version: 1 };
  }
}

export async function saveStorageFormat(payload) {
  const client = getSupabase();
  try {
    const { error } = await client.rpc('apply_storage', { p: payload || {} });

    if (error) {
      await warnIfSchemaMissing(error);
      console.error('❌ Storage kaydetme hatası:', error);
      return false;
    }

    return true;
  } catch (error) {
    await warnIfSchemaMissing(error);
    console.error('❌ Storage kaydetme hatası:', error);
    return false;
  }
}
