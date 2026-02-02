# WhatsApp Cloud API - Kurulum ve Kullanım Rehberi

## 📋 Genel Bakış

Bu proje artık **WhatsApp Cloud API** kullanıyor. Eski QR kod tabanlı `whatsapp-web.js` kütüphanesi kaldırıldı.

### ✅ Avantajlar
- ✅ QR kod tarama gerektirmez
- ✅ Chromium/Puppeteer bağımlılığı yok (çok daha hafif Docker image)
- ✅ Daha stabil ve güvenilir
- ✅ Resmi Meta API
- ✅ Webhook desteği (gelen mesajlar için)
- ✅ Production-ready

### ⚠️ Limitler
- Test numarası ile günde 250 mesaj (ücretsiz)
- Production için ücretli plan gerekebilir
- Sadece onaylanmış template mesajları veya 24 saat içinde yanıt

---

## 🚀 Kurulum Adımları

### 1. Meta Developer Hesabı Oluşturma

1. [Meta Developer Console](https://developers.facebook.com)'a gidin
2. Hesap oluşturun veya giriş yapın
3. "My Apps" → "Create App" tıklayın
4. "Business" tipini seçin
5. Uygulama adı girin (örn: "Planla WhatsApp")

### 2. WhatsApp Business App Kurulumu

1. Dashboard'da "Add Product" → "WhatsApp" seçin
2. "Set up WhatsApp" tıklayın
3. "API Setup" sayfasında:
   - **Phone Number ID**: Kopyalayın (örn: `123456789012345`)
   - **WhatsApp Business Account ID**: Kopyalayın
   - **Temporary Access Token**: Kopyalayın (geçici token)

### 3. Permanent Access Token Oluşturma

⚠️ **ÖNEMLİ**: Temporary token 24 saat sonra sona erer. Permanent token oluşturmalısınız!

1. Meta Developer Console → "Tools" → "Access Token Tool"
2. "Create System User" tıklayın
3. System User oluşturduktan sonra "Generate New Token" tıklayın
4. Permissions: `whatsapp_business_messaging` seçin
5. Token'ı kopyalayın ve güvenli bir yerde saklayın

### 4. Test Telefon Numarası Ekleme

1. API Setup sayfasında "To" bölümünde "Add phone number" tıklayın
2. Telefon numaranızı ekleyin (Türkiye için +90 ile başlamalı)
3. WhatsApp'tan gelen doğrulama kodunu girin
4. Artık bu numaraya test mesajı gönderebilirsiniz

---

## ⚙️ Environment Variables Ayarlama

### Backend (.env)

`backend/.env` dosyası oluşturun:

```env
PORT=3002
NODE_ENV=production
JSON_LIMIT=10mb
CORS_ORIGIN=https://etkegym.com

# WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=planla_webhook_token_2024
```

### Docker Compose (.env)

Proje root'unda `.env` dosyası oluşturun:

```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here
WHATSAPP_ACCESS_TOKEN=your_permanent_access_token_here
WHATSAPP_WEBHOOK_VERIFY_TOKEN=planla_webhook_token_2024
```

---

## 🧪 Test Etme

### 1. Local Test (Backend)

```bash
cd backend
npm install
npm start
```

Backend başladıktan sonra:

```bash
# Status kontrolü
curl http://localhost:3002/api/whatsapp/status

# Test mesajı gönderme
curl -X POST http://localhost:3002/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "905XXXXXXXXX", "message": "Test mesajı"}'
```

### 2. Docker Test

```bash
# Docker image build
cd backend
docker build -t planla-backend .

# Image boyutunu kontrol et (öncekinden çok daha küçük olmalı)
docker images planla-backend

# Docker Compose ile çalıştır
cd ..
docker-compose up -d

# Logları kontrol et
docker-compose logs -f backend
```

---

## 🔗 Webhook Kurulumu (Opsiyonel)

Gelen mesajları almak için webhook kurmanız gerekir.

### 1. Webhook URL'i Hazırlama

Webhook URL'iniz public olmalı (örn: `https://yourdomain.com/api/whatsapp/webhook`)

### 2. Meta Developer Console'da Webhook Ayarlama

1. WhatsApp → "Configuration" → "Webhook"
2. "Edit" tıklayın
3. **Callback URL**: `https://yourdomain.com/api/whatsapp/webhook`
4. **Verify Token**: `.env` dosyasındaki `WHATSAPP_WEBHOOK_VERIFY_TOKEN` değeri
5. "Verify and Save" tıklayın
6. "Webhook fields" bölümünde `messages` seçin

### 3. Webhook Test

Meta Console'dan "Test" butonuna tıklayarak webhook'u test edebilirsiniz.

---

## 📱 Mesaj Gönderme

### Normal Mesaj

```javascript
// Frontend'den
import { sendWhatsAppMessage } from './services/whatsappService';

const result = await sendWhatsAppMessage('905XXXXXXXXX', 'Merhaba!');
console.log(result);
```

### Backend API

```bash
POST /api/whatsapp/send
Content-Type: application/json

{
  "phoneNumber": "905XXXXXXXXX",
  "message": "Görev atandı: Yeni proje başladı"
}
```

### Template Mesaj (Opsiyonel)

Template mesajlar için önce Meta'da template oluşturmalısınız.

```bash
POST /api/whatsapp/send-template
Content-Type: application/json

{
  "phoneNumber": "905XXXXXXXXX",
  "templateName": "hello_world",
  "languageCode": "tr"
}
```

---

## 🐛 Sorun Giderme

### "WhatsApp Cloud API credentials eksik"

- `.env` dosyasının doğru konumda olduğundan emin olun
- Environment variables'ların doğru ayarlandığını kontrol edin
- Backend'i yeniden başlatın

### "WhatsApp Cloud API bağlantısı başarısız"

- Access token'ın geçerli olduğundan emin olun (permanent token kullanın)
- Phone Number ID'nin doğru olduğunu kontrol edin
- Meta Developer Console'da app'in aktif olduğunu kontrol edin

### "Bu numara WhatsApp'ta kayıtlı değil"

- Numaranın test numarası olarak eklendiğinden emin olun
- Numara formatının doğru olduğunu kontrol edin (90XXXXXXXXXX)

### Webhook çalışmıyor

- Webhook URL'inin public olduğundan emin olun (ngrok kullanabilirsiniz)
- Verify token'ın doğru olduğunu kontrol edin
- Meta Console'da webhook fields'in seçildiğinden emin olun

---

## 📊 Önceki Versiyondan Farklar

| Özellik | Eski (whatsapp-web.js) | Yeni (Cloud API) |
|---------|------------------------|------------------|
| Bağlantı | QR kod tarama | API credentials |
| Chromium | Gerekli (500+ MB) | Gereksiz |
| Docker Image | ~1.5 GB | ~200 MB |
| Stabilite | Orta (browser crashes) | Yüksek |
| Session | Local dosyalar | Yok (stateless) |
| Webhook | Yok | Var |
| Maliyet | Ücretsiz | Test: Ücretsiz, Prod: Ücretli |

---

## 🔄 Migration Checklist

- [x] whatsapp-web.js kaldırıldı
- [x] Puppeteer/Chromium kaldırıldı
- [x] WhatsApp Cloud API servisi eklendi
- [x] Backend endpoints güncellendi
- [x] Frontend QR kod UI kaldırıldı
- [x] Docker Compose güncellendi
- [x] Dockerfile basitleştirildi
- [ ] Meta Developer hesabı oluşturuldu
- [ ] WhatsApp Business App kuruldu
- [ ] Credentials alındı ve .env'e eklendi
- [ ] Test mesajı gönderildi
- [ ] Webhook kuruldu (opsiyonel)

---

## 📚 Kaynaklar

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Getting Started Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Webhook Setup](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)

---

## 💡 İpuçları

1. **Permanent Token Kullanın**: Temporary token 24 saat sonra sona erer
2. **Test Numarası Ekleyin**: Production'a geçmeden önce test numarası ile test edin
3. **Webhook Kurun**: Gelen mesajları almak için webhook kurmalısınız
4. **Rate Limiting**: Test hesabı günde 250 mesaj ile sınırlıdır
5. **Template Mesajlar**: 24 saat içinde yanıt vermediğiniz kullanıcılara sadece template mesaj gönderebilirsiniz
