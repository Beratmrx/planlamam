import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import qrTerminal from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
import puppeteer from 'puppeteer';
import fs from 'fs';
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
const { Client, LocalAuth } = pkg;

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

let whatsappClient = null;
let qrCodeData = null;
let isWhatsAppReady = false;
let isSendSeenPatched = false;
let isWhatsAppStarting = false;

const patchSendSeen = async () => {
  if (!whatsappClient?.pupPage) return false;
  try {
    await whatsappClient.pupPage.evaluate(() => {
      if (window.WWebJS && typeof window.WWebJS.sendSeen === 'function') {
        window.WWebJS.sendSeen = async () => { };
      }
    });
    return true;
  } catch (error) {
    console.error('❌ sendSeen patch hatası:', error.message);
    return false;
  }
};

// WhatsApp Client Başlatma
const resolveChromiumPath = () => {
  let puppeteerPath;
  try {
    puppeteerPath = puppeteer?.executablePath?.();
  } catch {
    puppeteerPath = undefined;
  }
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    puppeteerPath,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable'
  ].filter(Boolean);

  const found = candidates.find(path => fs.existsSync(path));
  if (found) {
    console.log(`🧭 Chromium bulundu: ${found}`);
  } else {
    console.warn('⚠️ Chromium bulunamadı. PUPPETEER_EXECUTABLE_PATH kontrol edin.');
  }
  return found;
};

const chromiumPath = resolveChromiumPath();

const stopWhatsApp = async () => {
  const client = whatsappClient;
  whatsappClient = null;
  isWhatsAppReady = false;
  isSendSeenPatched = false;
  qrCodeData = null;
  isWhatsAppStarting = false;

  if (!client) return true;
  try {
    // whatsapp-web.js supports destroy() to close browser/session
    await client.destroy();
    return true;
  } catch (error) {
    console.error('❌ WhatsApp durdurma hatası:', error?.message || error);
    return false;
  }
};

const initializeWhatsApp = () => {
  if (isWhatsAppStarting) return;
  isWhatsAppStarting = true;
  console.log('🚀 WhatsApp Client başlatılıyor...');

  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      ...(chromiumPath ? { executablePath: chromiumPath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    }
  });

  whatsappClient.on('loading_screen', (percent, message) => {
    console.log('📱 LOADING:', percent, message);
  });

  whatsappClient.on('qr', async (qr) => {
    console.log('\n');
    console.log('='.repeat(60));
    console.log('✅ QR KOD ALINDI! Telefonunuzla aşağıdaki QR kodu okutun:');
    console.log('='.repeat(60));
    console.log('\n');

    // QR kodu terminalde göster
    qrTerminal.generate(qr, { small: true });

    console.log('\n');
    console.log('='.repeat(60));
    console.log('Veya tarayıcıdaki modal\'da göreceksiniz');
    console.log('='.repeat(60));
    console.log('\n');

    try {
      qrCodeData = await qrcode.toDataURL(qr);
      isWhatsAppReady = false;
      console.log('✅ QR Kod Data URL oluşturuldu, uzunluk:', qrCodeData.length);
    } catch (err) {
      console.error('❌ QR kod oluşturma hatası:', err);
    }
  });

  whatsappClient.on('ready', () => {
    console.log('✅ WhatsApp bağlantısı hazır!');
    isWhatsAppReady = true;
    qrCodeData = null;
    isWhatsAppStarting = false;
    patchSendSeen().then((patched) => {
      isSendSeenPatched = patched;
      console.log(patched ? '🛡️ sendSeen patch uygulandı' : '⚠️ sendSeen patch uygulanamadı');
    });
  });

  whatsappClient.on('authenticated', async () => {
    console.log('✅ WhatsApp kimlik doğrulandı!');

    // Client state'ini kontrol et
    try {
      const info = await whatsappClient.info;
      console.log('📱 Client Info:', { wid: info?.wid, platform: info?.platform });
    } catch (err) {
      console.log('⚠️ Client info alınamadı:', err.message);
    }

    // Periyodik state kontrolü: Her 5 saniyede bir client state'ini kontrol et
    let consecutiveHasInfoCount = 0;
    const stateCheckInterval = setInterval(async () => {
      if (isWhatsAppReady) {
        clearInterval(stateCheckInterval);
        return;
      }
      try {
        const info = await whatsappClient.info;
        const hasInfo = !!info && info.wid;

        if (hasInfo) {
          consecutiveHasInfoCount++;

          // Eğer 3 kere üst üste hasInfo true ise ve ready event gelmediyse, manuel olarak ready yap
          if (consecutiveHasInfoCount >= 3 && !isWhatsAppReady) {
            console.log('✅ WhatsApp bağlantısı hazır! (Manuel - ready event gelmedi ama client hazır)');
            isWhatsAppReady = true;
            qrCodeData = null;
            isWhatsAppStarting = false;
            clearInterval(stateCheckInterval);
            patchSendSeen().then((patched) => {
              isSendSeenPatched = patched;
              console.log(patched ? '🛡️ sendSeen patch uygulandı' : '⚠️ sendSeen patch uygulanamadı');
            });
          }
        } else {
          consecutiveHasInfoCount = 0;
        }
      } catch (err) {
        consecutiveHasInfoCount = 0;
      }
    }, 5000);

    // Timeout ekle: 30 saniye sonra ready gelmezse log
    setTimeout(() => {
      clearInterval(stateCheckInterval);
      if (!isWhatsAppReady) {
        console.log('⚠️ UYARI: authenticated\'dan 30 saniye sonra ready event gelmedi!');
      }
    }, 30000);
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Kimlik doğrulama hatası:', msg);
    isWhatsAppReady = false;
    isWhatsAppStarting = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp bağlantısı kesildi:', reason);
    isWhatsAppReady = false;
    qrCodeData = null;
    isWhatsAppStarting = false;
  });

  // Hata yakalama
  whatsappClient.on('remote_session_saved', () => {
    console.log('💾 Remote session saved');
  });

  // State change tracking
  whatsappClient.on('change_state', (state) => {
    console.log('🔄 WhatsApp state değişti:', state);
  });

  // WhatsApp'ı başlat ve hataları yakala
  whatsappClient.initialize().then(() => {
    console.log('✅ initialize() promise resolved');
  }).catch(err => {
    console.error('❌ WhatsApp başlatma hatası:', err.message);
    whatsappClient = null;
    isWhatsAppReady = false;
    qrCodeData = null;
    isWhatsAppStarting = false;
  });
};

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
    const ok = await saveStorageFormat(payload);
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Storage yazılamadı' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Storage yazma hatası:', error);
    res.status(500).json({ success: false, message: 'Storage yazılamadı' });
  }
});

app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    ready: isWhatsAppReady,
    qrCode: qrCodeData,
    hasClient: whatsappClient !== null
  });
});

app.post('/api/whatsapp/initialize', (req, res) => {
  if (whatsappClient) {
    return res.json({
      success: false,
      message: 'WhatsApp zaten başlatılmış',
      ready: isWhatsAppReady
    });
  }

  initializeWhatsApp();
  res.json({
    success: true,
    message: 'WhatsApp başlatılıyor...'
  });
});

app.post('/api/whatsapp/stop', async (req, res) => {
  const ok = await stopWhatsApp();
  res.json({ success: ok, message: ok ? 'WhatsApp durduruldu' : 'WhatsApp durdurulamadı' });
});

app.post('/api/whatsapp/restart', async (req, res) => {
  await stopWhatsApp();
  initializeWhatsApp();
  res.json({ success: true, message: 'WhatsApp yeniden başlatılıyor...' });
});

app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    console.log('🔓 WhatsApp oturumu sonlandırılıyor...');

    // 1. WhatsApp client'ı tamamen durdur
    const client = whatsappClient;
    whatsappClient = null;
    isWhatsAppReady = false;
    isSendSeenPatched = false;
    qrCodeData = null;
    isWhatsAppStarting = false;

    if (client) {
      console.log('📴 WhatsApp client kapatılıyor...');
      await client.destroy();
      console.log('✅ WhatsApp client kapatıldı');
    }

    // 2. Browser'ın tamamen kapanması için bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. .wwebjs_auth klasörünü sil
    const authPath = './.wwebjs_auth';
    if (fs.existsSync(authPath)) {
      fs.rmSync(authPath, { recursive: true, force: true });
      console.log('✅ WhatsApp oturum dosyaları silindi');
    }

    // 4. .wwebjs_cache klasörünü de sil (varsa)
    const cachePath = './.wwebjs_cache';
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log('✅ WhatsApp cache silindi');
    }

    console.log('✅ WhatsApp oturumu tamamen sonlandırıldı!');
    console.log('💡 Tekrar bağlanmak için /api/whatsapp/initialize endpoint\'ini çağırın');

    res.json({
      success: true,
      message: 'WhatsApp oturumu tamamen sonlandırıldı. Tekrar bağlanmak için QR kod gerekecek.'
    });
  } catch (error) {
    console.error('❌ Logout hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Oturum sonlandırılamadı: ' + error.message
    });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { phoneNumber, message } = req.body;

  console.log('📱 Mesaj gönderme isteği alındı:', {
    phoneNumber,
    messagePreview: message.substring(0, 50),
    isWhatsAppReady,
    hasClient: whatsappClient !== null
  });

  if (!isWhatsAppReady || !whatsappClient) {
    console.log('❌ WhatsApp hazır değil!');
    return res.status(400).json({
      success: false,
      message: 'WhatsApp hazır değil'
    });
  }

  try {
    if (!isSendSeenPatched) {
      isSendSeenPatched = await patchSendSeen();
    }
    // Türkiye telefon numarası formatı: 90 ile başlamalı
    let formattedNumber = phoneNumber.replace(/\D/g, '');

    // 0 ile başlıyorsa kaldır
    if (formattedNumber.startsWith('0')) {
      formattedNumber = formattedNumber.substring(1);
    }

    // 90 ile başlamıyorsa ekle
    if (!formattedNumber.startsWith('90')) {
      formattedNumber = '90' + formattedNumber;
    }

    const chatId = formattedNumber + '@c.us';

    console.log('📞 Formatlanmış numara:', formattedNumber);
    console.log('📨 Chat ID:', chatId);
    console.log('💬 Mesaj gönderiliyor...');

    // Numarayı doğrula
    const numberId = await whatsappClient.getNumberId(formattedNumber);
    console.log('🔍 Numara ID:', numberId);

    if (!numberId) {
      throw new Error('Bu numara WhatsApp\'ta kayıtlı değil!');
    }

    // Mesaj gönder (sendSeen patch ve sendSeen: false ile)
    await whatsappClient.sendMessage(chatId, message, { sendSeen: false });

    console.log('✅ Mesaj başarıyla gönderildi!');

    res.json({
      success: true,
      message: 'Mesaj gönderildi!'
    });
  } catch (error) {
    console.error('❌ Mesaj gönderme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Mesaj gönderilemedi: ' + error.message
    });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server çalışıyor: http://localhost:${PORT}`);
});

