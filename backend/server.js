import express from 'express';
import cors from 'cors';
import qrcode from 'qrcode';
import qrTerminal from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
import fs from 'fs';
const { Client, LocalAuth } = pkg;

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

let whatsappClient = null;
let qrCodeData = null;
let isWhatsAppReady = false;
let isSendSeenPatched = false;

const patchSendSeen = async () => {
  if (!whatsappClient?.pupPage) return false;
  try {
    await whatsappClient.pupPage.evaluate(() => {
      if (window.WWebJS && typeof window.WWebJS.sendSeen === 'function') {
        window.WWebJS.sendSeen = async () => {};
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
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
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

const initializeWhatsApp = () => {
  console.log('🚀 WhatsApp Client başlatılıyor...');
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      executablePath: chromiumPath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
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
    patchSendSeen().then((patched) => {
      isSendSeenPatched = patched;
      console.log(patched ? '🛡️ sendSeen patch uygulandı' : '⚠️ sendSeen patch uygulanamadı');
    });
  });

  whatsappClient.on('authenticated', () => {
    console.log('✅ WhatsApp kimlik doğrulandı!');
  });

  whatsappClient.on('auth_failure', (msg) => {
    console.error('❌ Kimlik doğrulama hatası:', msg);
    isWhatsAppReady = false;
  });

  whatsappClient.on('disconnected', (reason) => {
    console.log('❌ WhatsApp bağlantısı kesildi:', reason);
    isWhatsAppReady = false;
    qrCodeData = null;
  });

  // Hata yakalama
  whatsappClient.on('remote_session_saved', () => {
    console.log('💾 Remote session saved');
  });

  // WhatsApp'ı başlat ve hataları yakala
  whatsappClient.initialize().catch(err => {
    console.error('❌ WhatsApp başlatma hatası:', err.message);
    whatsappClient = null;
    isWhatsAppReady = false;
    qrCodeData = null;
  });
};

// API Endpoints
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server çalışıyor: http://localhost:${PORT}`);
});

