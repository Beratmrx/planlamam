import mysql from 'mysql2/promise';

// Bu dosya, eski `storage.json` davranışını MySQL'e taşır:
// - Frontend tek bir payload gönderir (users/categories/tasks/rentals/assets/...)
// - Biz de tablolar halinde saklarız (users/categories/tasks/rentals/assets + app_settings)

let pool = null;

function getPool() {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;

  if (!user || !database) {
    throw new Error('MYSQL_USER ve MYSQL_DATABASE .env içinde tanımlı olmalı.');
  }

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  });

  return pool;
}

function safeJsonParse(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

async function readAllJsonRows(table) {
  const p = getPool();
  const [rows] = await p.query(`SELECT data FROM \`${table}\``);
  return (rows || []).map(r => safeJsonParse(r.data)).filter(Boolean);
}

async function getSettings() {
  const p = getPool();
  const [rows] = await p.query('SELECT json FROM app_settings WHERE `key` = ? LIMIT 1', ['settings']);
  const row = Array.isArray(rows) && rows.length ? rows[0] : null;
  return safeJsonParse(row?.json) || {};
}

async function upsertJsonRows(conn, table, items) {
  if (!Array.isArray(items)) return;

  // Upsert each row (id + json)
  for (const item of items) {
    const id = item?.id;
    if (!id) continue;
    await conn.query(
      `INSERT INTO \`${table}\` (id, data) VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [String(id), JSON.stringify(item)]
    );
  }

  // Delete rows that are not present anymore
  const ids = items.map(i => i?.id).filter(Boolean).map(String);
  if (ids.length === 0) {
    await conn.query(`DELETE FROM \`${table}\``);
    return;
  }

  const placeholders = ids.map(() => '?').join(',');
  await conn.query(`DELETE FROM \`${table}\` WHERE id NOT IN (${placeholders})`, ids);
}

export async function getStorageFormat() {
  try {
    const [users, categories, tasks, rentals, assets, settings] = await Promise.all([
      readAllJsonRows('users'),
      readAllJsonRows('categories'),
      readAllJsonRows('tasks'),
      readAllJsonRows('rentals'),
      readAllJsonRows('assets'),
      getSettings()
    ]);

    const savedAt = Number(settings?.savedAt || 0) || 0;
    const mergedSettings = { ...(settings || {}) };
    delete mergedSettings.savedAt;

    return {
      version: 1,
      savedAt,
      users,
      categories,
      tasks,
      rentals,
      assets,
      ...mergedSettings
    };
  } catch (error) {
    console.error('❌ MySQL storage okuma hatası:', error);
    return { version: 1 };
  }
}

export async function saveStorageFormat(payload) {
  const p = getPool();
  const conn = await p.getConnection();
  try {
    await conn.beginTransaction();

    await upsertJsonRows(conn, 'users', payload?.users);
    await upsertJsonRows(conn, 'categories', payload?.categories);
    await upsertJsonRows(conn, 'tasks', payload?.tasks);
    await upsertJsonRows(conn, 'rentals', payload?.rentals);
    await upsertJsonRows(conn, 'assets', payload?.assets);

    const now = Date.now();
    const settings = {
      savedAt: now,
      whatsAppEnabled: Boolean(payload?.whatsAppEnabled),
      phoneNumber: payload?.phoneNumber || '',
      secondPhoneNumber: payload?.secondPhoneNumber || '',
      auditOptions: Array.isArray(payload?.auditOptions) ? payload.auditOptions : []
    };

    await conn.query(
      'INSERT INTO app_settings (`key`, json) VALUES (?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE json = VALUES(json), updated_at = CURRENT_TIMESTAMP',
      ['settings', JSON.stringify(settings)]
    );

    await conn.commit();
    return true;
  } catch (error) {
    try { await conn.rollback(); } catch {}
    console.error('❌ MySQL storage kaydetme hatası:', error);
    return false;
  } finally {
    conn.release();
  }
}
