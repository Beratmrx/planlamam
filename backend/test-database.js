// Database bağlantı test scripti
import 'dotenv/config';

async function testDatabase() {
  console.log('🔍 Veritabanı durumu kontrol ediliyor...\n');
  
  // Environment variables kontrolü
  console.log('📋 Environment Variables:');
  console.log('  MYSQL_HOST:', process.env.MYSQL_HOST || 'YOK');
  console.log('  MYSQL_DATABASE:', process.env.MYSQL_DATABASE || 'YOK');
  console.log('  MYSQL_USER:', process.env.MYSQL_USER || 'YOK');
  console.log('  MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? '***' : 'YOK');
  console.log('');
  
  // Database modülü seçimi
  let dbModule;
  let dbType;
  
  try {
    if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE && process.env.MYSQL_USER) {
      dbModule = await import('./database.js');
      dbType = 'MySQL';
      console.log('✅ MySQL veritabanı kullanılacak');
    } else {
      throw new Error('MySQL config yok');
    }
  } catch (error) {
    dbModule = await import('./database-simple.js');
    dbType = 'JSON Dosyası (storage.json)';
    console.log('✅ JSON dosyası (storage.json) kullanılacak');
  }
  
  console.log('');
  console.log('📊 Veritabanı Tipi:', dbType);
  console.log('');
  
  // Test: Veri okuma
  console.log('🧪 Test 1: Veri Okuma...');
  try {
    const data = await dbModule.getStorageFormat();
    console.log('✅ Veri okuma başarılı!');
    console.log('   - Kullanıcı sayısı:', data.users?.length || 0);
    console.log('   - Kategori sayısı:', data.categories?.length || 0);
    console.log('   - Görev sayısı:', data.tasks?.length || 0);
    console.log('   - Kiralama sayısı:', data.rentals?.length || 0);
    console.log('   - Varlık sayısı:', data.assets?.length || 0);
  } catch (error) {
    console.log('❌ Veri okuma hatası:', error.message);
    return false;
  }
  
  console.log('');
  
  // Test: Veri yazma
  console.log('🧪 Test 2: Veri Yazma...');
  try {
    const testData = {
      users: [],
      categories: [],
      tasks: [],
      rentals: [],
      assets: [],
      whatsAppEnabled: false,
      phoneNumber: '',
      secondPhoneNumber: '',
      auditOptions: []
    };
    
    const result = await dbModule.saveStorageFormat(testData);
    if (result) {
      console.log('✅ Veri yazma başarılı!');
    } else {
      console.log('❌ Veri yazma başarısız!');
      return false;
    }
  } catch (error) {
    console.log('❌ Veri yazma hatası:', error.message);
    return false;
  }
  
  console.log('');
  console.log('🎉 Tüm testler başarılı!');
  console.log('');
  console.log('📝 Özet:');
  console.log('   - Veritabanı Tipi:', dbType);
  console.log('   - Veri Okuma: ✅ Çalışıyor');
  console.log('   - Veri Yazma: ✅ Çalışıyor');
  console.log('');
  
  if (dbType === 'JSON Dosyası (storage.json)') {
    console.log('💡 MySQL kullanmak isterseniz:');
    console.log('   1. backend/.env dosyasını açın');
    console.log('   2. MySQL ayarlarını ekleyin (MYSQL_HOST, MYSQL_DATABASE, MYSQL_USER, MYSQL_PASSWORD)');
    console.log('   3. MySQL veritabanını oluşturun: mysql < backend/mysql-schema.sql');
    console.log('   4. Backend\'i yeniden başlatın');
  }
  
  return true;
}

testDatabase().catch(console.error);
