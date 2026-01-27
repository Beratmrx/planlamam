import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { createClient } from '@supabase/supabase-js';

// One-time migration script:
// backend/data/planla.sqlite -> Supabase tables (users/categories/tasks/rentals/assets + app_settings)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'planla.sqlite');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY .env içinde tanımlı olmalı.');
  }
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function readStorageFromSqlite() {
  if (!fs.existsSync(dbPath)) return null;
  const SQL = await initSqlJs();
  const fileBuf = fs.readFileSync(dbPath);
  const db = new SQL.Database(new Uint8Array(fileBuf));

  const stmt = db.prepare('SELECT json FROM kv WHERE key = ? LIMIT 1');
  stmt.bind(['storage']);
  try {
    if (!stmt.step()) return null;
    const row = stmt.getAsObject();
    try {
      return JSON.parse(row.json);
    } catch {
      return null;
    }
  } finally {
    stmt.free();
    db.close();
  }
}

async function main() {
  console.log('🔎 SQLite dosyası:', dbPath);
  const storage = await readStorageFromSqlite();
  if (!storage) {
    console.log('⚠️ SQLite içinde storage bulunamadı. (kv.key = storage)');
    process.exit(1);
  }

  const supabase = getSupabase();
  const now = Date.now();
  const payload = {
    ...storage,
    version: storage?.version ?? 1,
    migratedAt: now
  };

  console.log('☁️ Supabase\'e yazılıyor...');
  const { error } = await supabase.rpc('apply_storage', { p: payload });

  if (error) {
    console.error('❌ Supabase yazma hatası:', error);
    process.exit(1);
  }

  console.log('✅ Migration tamamlandı: tablolar güncellendi');
}

main().catch((e) => {
  console.error('❌ Migration başarısız:', e);
  process.exit(1);
});

