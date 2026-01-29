// storage.json -> MySQL migration script
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_JSON_PATH = path.join(__dirname, 'storage.json');

function getMysqlPool() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER;
  const password = process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQL_DATABASE;
  
  if (!user || !database) {
    throw new Error('MYSQL_USER ve MYSQL_DATABASE .env içinde tanımlı olmalı.');
  }

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

function readStorageJson() {
  if (!fs.existsSync(STORAGE_JSON_PATH)) {
    console.log('⚠️ storage.json dosyası bulunamadı:', STORAGE_JSON_PATH);
    return null;
  }
  
  try {
    const raw = fs.readFileSync(STORAGE_JSON_PATH, 'utf8');
    const data = JSON.parse(raw);
    console.log('✅ storage.json okundu');
    console.log(`   - ${data.users?.length || 0} kullanıcı`);
    console.log(`   - ${data.categories?.length || 0} kategori`);
    console.log(`   - ${data.tasks?.length || 0} görev`);
    console.log(`   - ${data.rentals?.length || 0} kiralama`);
    console.log(`   - ${data.assets?.length || 0} varlık`);
    return data;
  } catch (error) {
    console.error('❌ storage.json okuma hatası:', error.message);
    return null;
  }
}

async function upsertList(conn, table, items) {
  if (!Array.isArray(items) || items.length === 0) {
    // Boş array ise tabloyu temizle
    await conn.query(`DELETE FROM \`${table}\``);
    return;
  }

  // Her item'ı ekle/güncelle
  for (const item of items) {
    const id = item?.id;
    if (!id) {
      console.log(`⚠️ ${table}: ID olmayan item atlandı:`, item);
      continue;
    }
    
    await conn.query(
      `INSERT INTO \`${table}\` (id, data) VALUES (?, CAST(? AS JSON))
       ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
      [String(id), JSON.stringify(item)]
    );
  }

  // Mevcut olmayan item'ları sil
  const ids = items.map(i => i?.id).filter(Boolean).map(String);
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    await conn.query(`DELETE FROM \`${table}\` WHERE id NOT IN (${placeholders})`, ids);
  }
  
  console.log(`✅ ${table}: ${items.length} kayıt migrate edildi`);
}

async function main() {
  console.log('🚀 storage.json -> MySQL Migration Başlatılıyor...\n');
  
  // 1. storage.json'u oku
  const storage = readStorageJson();
  if (!storage) {
    console.log('\n❌ Migration iptal edildi: storage.json bulunamadı veya okunamadı');
    process.exit(1);
  }

  // 2. MySQL bağlantısı kur
  console.log('\n📡 MySQL bağlantısı kuruluyor...');
  let pool;
  try {
    pool = getMysqlPool();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ MySQL bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MySQL bağlantı hatası:', error.message);
    console.log('\n💡 Çözüm:');
    console.log('   1. MySQL'in çalıştığından emin olun');
    console.log('   2. backend/.env dosyasında MySQL ayarlarını kontrol edin');
    console.log('   3. MySQL veritabanını oluşturun: mysql < backend/mysql-schema.sql');
    process.exit(1);
  }

  // 3. Migration başlat
  console.log('\n📦 Veriler MySQL\'e aktarılıyor...\n');
  const conn = await pool.getConnection();
  
  try {
    await conn.beginTransaction();

    // Verileri migrate et
    await upsertList(conn, 'users', storage.users || []);
    await upsertList(conn, 'categories', storage.categories || []);
    await upsertList(conn, 'tasks', storage.tasks || []);
    await upsertList(conn, 'rentals', storage.rentals || []);
    await upsertList(conn, 'assets', storage.assets || []);

    // Settings'i kaydet
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
    console.log('✅ app_settings: Ayarlar kaydedildi');

    await conn.commit();
    
    console.log('\n🎉 Migration başarıyla tamamlandı!');
    console.log('\n📝 Sonraki adımlar:');
    console.log('   1. Backend\'i yeniden başlatın');
    console.log('   2. Sistem artık MySQL kullanacak');
    console.log('   3. storage.json dosyası yedek olarak kalabilir (opsiyonel: silebilirsiniz)');
    
  } catch (error) {
    await conn.rollback();
    console.error('\n❌ Migration hatası:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('❌ Migration başarısız:', error);
  process.exit(1);
});
