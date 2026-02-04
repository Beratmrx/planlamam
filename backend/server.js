import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });
if (process.env.WHATSAPP_ACCESS_TOKEN) {
  console.log('📂 .env yüklendi:', envPath, '| WHATSAPP_ACCESS_TOKEN: uzunluk', process.env.WHATSAPP_ACCESS_TOKEN.length);
} else {
  console.log('⚠️ .env yüklendi ama WHATSAPP_ACCESS_TOKEN yok:', envPath);
}
// .env yüklendikten SONRA yükle; ES modüllerinde static import önce çalıştığı için
// aksi halde whatsapp-cloud-api process.env'i boş görür ve "credentials eksik" hatası verir.
const { default: whatsappCloudAPI } = await import('./whatsapp-cloud-api.js');

// Database seçimi: MySQL varsa MySQL kullan, yoksa JSON dosyası kullan
let dbModule;
try {
  // MySQL environment variables kontrolü
  if (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE && process.env.MYSQL_USER) {
    dbModule = await import('./database.js');
    console.log('✅ MySQL veritabanı kullanılıyor');
  } else {
    throw new Error('MySQL config yok');
  }
} catch (error) {
  dbModule = await import('./database-simple.js');
  console.log('✅ JSON dosyası (storage.json) kullanılıyor');
}

const { getStorageFormat, saveStorageFormat } = dbModule;

const app = express();
const PORT = process.env.PORT || 3002;
const JSON_LIMIT = process.env.JSON_LIMIT || '10mb';

// CORS configuration — frontend origin (etkegym.com) izin verilmeli
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean)
  : (process.env.NODE_ENV === 'production'
    ? ['https://etkegym.com']
    : true);
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: JSON_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: JSON_LIMIT }));

// API Endpoints
app.get('/api/storage', async (req, res) => {
  try {
    const data = await getStorageFormat();
    res.json(data);
  } catch (error) {
    console.error('❌ Storage okuma hatası:', error);
    res.status(500).json({ success: false, message: 'Storage okunamadı' });
  }
});

app.post('/api/storage', async (req, res) => {
  try {
    const payload = req.body || {};
    const savedAt = await saveStorageFormat(payload);
    if (!savedAt) {
      return res.status(500).json({ success: false, message: 'Storage yazılamadı' });
    }
    res.json({ success: true, savedAt });
  } catch (error) {
    // Stale-write (eski payload) koruması: 409 döndür.
    if (error?.code === 'STALE_WRITE') {
      return res.status(409).json({
        success: false,
        message: 'Eski verilerle kaydetme engellendi. Lütfen sayfayı yenileyin.',
        currentSavedAt: error.currentSavedAt || null
      });
    }
    console.error('❌ Storage yazma hatası:', error);
    res.status(500).json({ success: false, message: 'Storage yazılamadı' });
  }
});

// WhatsApp Cloud API Endpoints

/**
 * Sunucu tanı: env yüklü mü, Meta IP'ye (443) erişim var mı.
 * Local'de çalışıp sunucuda çalışmıyorsa: curl http://SUNUCU:3002/api/whatsapp/diagnose
 */
app.get('/api/whatsapp/diagnose', async (req, res) => {
  const META_IP = process.env.META_GRAPH_IP || '157.240.196.17';
  const out = {
    env: {
      hasToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
      tokenLength: process.env.WHATSAPP_ACCESS_TOKEN ? process.env.WHATSAPP_ACCESS_TOKEN.length : 0,
      hasPhoneId: !!process.env.WHATSAPP_PHONE_NUMBER_ID,
      nodeEnv: process.env.NODE_ENV,
      metaGraphIp: META_IP
    },
    metaReachable: null,
    metaError: null,
    statusCheck: null
  };
  try {
    const net = await import('net');
    await new Promise((resolve, reject) => {
      const socket = net.createConnection(443, META_IP, () => {
        socket.destroy();
        resolve();
      });
      socket.setTimeout(5000);
      socket.on('error', reject);
      socket.on('timeout', () => { socket.destroy(); reject(new Error('ETIMEDOUT')); });
    });
    out.metaReachable = true;
  } catch (e) {
    out.metaReachable = false;
    out.metaError = e.code || e.message || String(e);
  }
  try {
    const status = await whatsappCloudAPI.checkStatus();
    out.statusCheck = { ready: status.ready, message: status.message, errorCode: status.errorCode };
  } catch (e) {
    out.statusCheck = { ready: false, message: e.message, errorCode: e.code };
  }
  res.json(out);
});

/**
 * WhatsApp durumunu kontrol et
 * QR kod yok, sadece API bağlantı durumu
 */
app.get('/api/whatsapp/status', async (req, res) => {
  try {
    const status = await whatsappCloudAPI.checkStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ WhatsApp status hatası:', error);
    res.status(500).json({
      ready: false,
      message: 'WhatsApp durum kontrolü başarısız',
      hasCredentials: false
    });
  }
});

/**
 * WhatsApp başlatma (Cloud API için sadece credentials kontrolü)
 * Artık QR kod yok, credentials varsa otomatik hazır
 */
app.post('/api/whatsapp/initialize', async (req, res) => {
  try {
    const status = await whatsappCloudAPI.checkStatus();
    if (status.ready) {
      res.json({
        success: true,
        message: 'WhatsApp Cloud API bağlantısı aktif',
        ...status
      });
    } else {
      res.json({
        success: false,
        message: status.message || 'WhatsApp Cloud API credentials eksik veya hatalı',
        ...status
      });
    }
  } catch (error) {
    console.error('❌ WhatsApp initialize hatası:', error);
    res.status(500).json({
      success: false,
      message: 'WhatsApp başlatılamadı: ' + error.message
    });
  }
});

/**
 * WhatsApp mesaj gönder
 */
app.post('/api/whatsapp/send', async (req, res) => {
  const { phoneNumber, message } = req.body;

  if (!phoneNumber || !message) {
    return res.status(400).json({
      success: false,
      message: 'Telefon numarası ve mesaj gerekli'
    });
  }

  try {
    const result = await whatsappCloudAPI.sendMessage(phoneNumber, message);
    res.json(result);
  } catch (error) {
    console.error('❌ Mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * WhatsApp template mesaj gönder
 */
app.post('/api/whatsapp/send-template', async (req, res) => {
  const { phoneNumber, templateName, languageCode, components } = req.body;

  if (!phoneNumber || !templateName) {
    return res.status(400).json({
      success: false,
      message: 'Telefon numarası ve template adı gerekli'
    });
  }

  try {
    const result = await whatsappCloudAPI.sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode || 'tr',
      components || []
    );
    res.json(result);
  } catch (error) {
    console.error('❌ Template mesaj hatası:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * WhatsApp logout (Cloud API'de oturum yok; frontend state temizliği için)
 */
app.post('/api/whatsapp/logout', (req, res) => {
  res.json({ success: true, message: 'WhatsApp Cloud API oturumu kapatıldı (frontend state temizlendi)' });
});

/**
 * WhatsApp Webhook - GET (Meta tarafından doğrulama için kullanılır)
 */
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifiedChallenge = whatsappCloudAPI.verifyWebhook(mode, token, challenge);

  if (verifiedChallenge) {
    res.status(200).send(verifiedChallenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

/**
 * WhatsApp Webhook - POST (Gelen mesajlar için)
 */
app.post('/api/whatsapp/webhook', async (req, res) => {
  try {
    const result = await whatsappCloudAPI.handleWebhook(req.body);

    // Meta'ya hızlı yanıt dön (200 OK)
    res.status(200).json({ success: true });

    // Webhook işleme sonucunu logla
    if (result.success) {
      console.log('✅ Webhook işlendi:', result);
    } else {
      console.error('❌ Webhook işleme hatası:', result);
    }
  } catch (error) {
    console.error('❌ Webhook hatası:', error);
    // Yine de 200 dön (Meta'nın tekrar denemesini önlemek için)
    res.status(200).json({ success: false });
  }
});

// Body limit / JSON parse errors
app.use((err, req, res, next) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: `Payload too large (limit: ${JSON_LIMIT})`
    });
  }
  return next(err);
});

const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Backend server çalışıyor: http://localhost:${PORT}`);
  console.log('📱 WhatsApp Cloud API entegrasyonu aktif');

  // Startup'ta WhatsApp durumunu kontrol et
  whatsappCloudAPI.checkStatus().then(status => {
    if (status.ready) {
      console.log('✅ WhatsApp Cloud API hazır:', status.phoneNumber);
    } else {
      console.log('⚠️ WhatsApp Cloud API bağlanamadı:', status.message || 'credentials eksik');
      console.log('💡 .env veya backend/.env: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN (kalıcı token)');
    }
  });
});
