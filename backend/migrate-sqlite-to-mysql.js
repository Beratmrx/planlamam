import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import mysql from 'mysql2/promise';

// One-time migration script:
// backend/data/planla.sqlite -> MySQL tables (users/categories/tasks/rentals/assets + app_settings)

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'planla.sqlite');
const storageJsonPath = path.join(__dirname, 'data', 'storage.json');

function getMysqlPool() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  if (!user || !database) throw new Error('MYSQL_USER ve MYSQL_DATABASE .env içinde tanımlı olmalı.');

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4'
  });
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

function readStorageFromStorageJson() {
  if (!fs.existsSync(storageJsonPath)) return null;
  try {
    const raw = fs.readFileSync(storageJsonPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function upsertList(conn, table, items) {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    const id = item?.id;
    if (!id) continue;
    await conn.query(
      `INSERT INTO \`${table}\` (id, data) VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [String(id), JSON.stringify(item)]
    );
  }

  const ids = items.map(i => i?.id).filter(Boolean).map(String);
  if (ids.length === 0) {
    await conn.query(`DELETE FROM \`${table}\``);
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  await conn.query(`DELETE FROM \`${table}\` WHERE id NOT IN (${placeholders})`, ids);
}

async function main() {
  console.log('🔎 SQLite dosyası:', dbPath);
  const storage = (await readStorageFromSqlite()) || readStorageFromStorageJson();
  if (!storage) {
    console.log('⚠️ Storage bulunamadı (planla.sqlite veya data/storage.json).');
    process.exit(1);
  }

  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await upsertList(conn, 'users', storage.users);
    await upsertList(conn, 'categories', storage.categories);
    await upsertList(conn, 'tasks', storage.tasks);
    await upsertList(conn, 'rentals', storage.rentals);
    await upsertList(conn, 'assets', storage.assets);

    const now = Date.now();
    const settings = {
      savedAt: now,
      whatsAppEnabled: Boolean(storage.whatsAppEnabled),
      phoneNumber: storage.phoneNumber || '',
      secondPhoneNumber: storage.secondPhoneNumber || '',
      auditOptions: Array.isArray(storage.auditOptions) ? storage.auditOptions : []
    };

    await conn.query(
      'INSERT INTO app_settings (`key`, json) VALUES (?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE json = VALUES(json), updated_at = CURRENT_TIMESTAMP',
      ['settings', JSON.stringify(settings)]
    );

    await conn.commit();
    console.log('✅ Migration tamamlandı: MySQL tabloları güncellendi');
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error('❌ Migration başarısız:', e);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('❌ Migration başarısız:', e);
  process.exit(1);
});

