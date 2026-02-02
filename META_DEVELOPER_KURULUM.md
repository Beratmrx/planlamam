# Meta Developer Console - WhatsApp Cloud API Kurulum Rehberi

Bu rehber, Meta Developer Console'da sıfırdan WhatsApp Cloud API kurulumunu adım adım anlatmaktadır.

---

## 📋 Gereksinimler

- Facebook hesabı (kişisel veya business)
- Telefon numarası (WhatsApp'ta kayıtlı olmalı)
- Email adresi

---

## 🚀 Adım 1: Meta Developer Hesabı Oluşturma

### 1.1 Developer Console'a Giriş

1. Tarayıcınızda [https://developers.facebook.com](https://developers.facebook.com) adresine gidin
2. Sağ üst köşede **"Get Started"** veya **"My Apps"** butonuna tıklayın
3. Facebook hesabınızla giriş yapın
4. İlk kez giriyorsanız, developer hesabı kayıt formunu doldurun:
   - İsim
   - Email
   - Telefon numarası (doğrulama için)

### 1.2 Developer Hesabını Doğrulama

1. Email adresinize gelen doğrulama linkine tıklayın
2. Telefon numaranıza gelen SMS kodunu girin
3. Developer Terms'i kabul edin

---

## 🎯 Adım 2: WhatsApp Business App Oluşturma

### 2.1 Yeni App Oluşturma

1. Meta Developer Dashboard'da **"My Apps"** sayfasına gidin
2. **"Create App"** butonuna tıklayın
3. App tipi seçin:
   - **"Business"** seçeneğini seçin (WhatsApp için gerekli)
   - **"Next"** tıklayın

### 2.2 App Bilgilerini Girme

1. **App Display Name**: Uygulamanızın adını girin (örn: "Planla WhatsApp")
2. **App Contact Email**: İletişim email adresinizi girin
3. **Business Portfolio**: 
   - Eğer yoksa "Create a Portfolio" seçin
   - Varsa mevcut portfolio'nuzu seçin
4. **"Create App"** butonuna tıklayın

### 2.3 Güvenlik Doğrulaması

1. Facebook şifrenizi girin
2. İki faktörlü doğrulama varsa, kodu girin
3. App başarıyla oluşturuldu!

---

## 📱 Adım 3: WhatsApp Product Ekleme

### 3.1 WhatsApp'ı App'e Ekleme

1. App Dashboard'da **"Add Products"** bölümünü bulun
2. **"WhatsApp"** kartını bulun
3. **"Set up"** butonuna tıklayın
4. WhatsApp Business Platform sayfası açılacak

### 3.2 WhatsApp Business Account Oluşturma

1. **"Create a Business Account"** seçeneğini seçin
2. Business bilgilerini girin:
   - **Business Name**: İşletme adınız (örn: "Planla")
   - **Business Category**: Kategori seçin (örn: "Software")
   - **Business Description**: Kısa açıklama (opsiyonel)
3. **"Continue"** tıklayın

---

## 🔑 Adım 4: API Credentials Alma

### 4.1 API Setup Sayfası

WhatsApp kurulumu tamamlandıktan sonra **"API Setup"** sayfasına yönlendirileceksiniz.

Bu sayfada göreceğiniz önemli bilgiler:

#### A) Phone Number ID

```
📱 From phone number ID: 123456789012345
```

- Bu numarayı kopyalayın
- `.env` dosyasında `WHATSAPP_PHONE_NUMBER_ID` olarak kullanacaksınız

#### B) WhatsApp Business Account ID

```
🏢 WhatsApp Business Account ID: 987654321098765
```

- Bu numarayı kopyalayın
- `.env` dosyasında `WHATSAPP_BUSINESS_ACCOUNT_ID` olarak kullanacaksınız

#### C) Temporary Access Token

```
🔐 Temporary access token: EAAxxxxxxxxxxxxxxxxxxxxx
```

- Bu token **24 saat** sonra sona erer
- Geçici test için kullanabilirsiniz
- **Production için permanent token oluşturmalısınız** (Adım 5)

### 4.2 Test Telefon Numarası Ekleme

API Setup sayfasında **"To"** bölümünde:

1. **"Add phone number"** butonuna tıklayın
2. Telefon numaranızı girin (örn: +90 5XX XXX XX XX)
3. **"Send Code"** tıklayın
4. WhatsApp'tan gelen 6 haneli kodu girin
5. **"Verify"** tıklayın
6. Numara başarıyla eklendi! ✅

> **Not**: Test modunda sadece bu numaraya mesaj gönderebilirsiniz. Production'a geçince herkese gönderebilirsiniz.

### 4.3 İlk Test Mesajı Gönderme

API Setup sayfasında:

1. **"To"** bölümünde eklediğiniz numarayı seçin
2. **"Message"** alanında örnek mesaj göreceksiniz
3. **"Send message"** butonuna tıklayın
4. Telefonunuza WhatsApp mesajı gelecek! 🎉

---

## 🔐 Adım 5: Permanent Access Token Oluşturma

⚠️ **ÇOK ÖNEMLİ**: Temporary token 24 saat sonra sona erer. Production için permanent token şart!

### 5.1 System User Oluşturma

1. Meta Business Suite'e gidin: [https://business.facebook.com](https://business.facebook.com)
2. Sol menüden **"Business Settings"** tıklayın
3. **"Users"** → **"System Users"** seçin
4. **"Add"** butonuna tıklayın
5. System user bilgilerini girin:
   - **Name**: "Planla WhatsApp API"
   - **Role**: "Admin" seçin
6. **"Create System User"** tıklayın

### 5.2 Permanent Token Oluşturma

1. Oluşturduğunuz system user'a tıklayın
2. **"Generate New Token"** butonuna tıklayın
3. Token ayarları:
   - **App**: Oluşturduğunuz app'i seçin (örn: "Planla WhatsApp")
   - **Token Expiration**: **"Never"** seçin (hiç sona ermesin)
   - **Permissions**: Aşağıdaki izinleri seçin:
     - ✅ `whatsapp_business_messaging`
     - ✅ `whatsapp_business_management`
4. **"Generate Token"** tıklayın
5. Token'ı kopyalayın ve **güvenli bir yere kaydedin**!

> ⚠️ **UYARI**: Bu token'ı bir daha göremezsiniz! Kaybederseniz yeni token oluşturmanız gerekir.

### 5.3 WhatsApp Business Account'a Erişim Verme

1. Business Settings → **"Accounts"** → **"WhatsApp Accounts"**
2. WhatsApp Business Account'unuzu seçin
3. **"Add People"** tıklayın
4. Oluşturduğunuz system user'ı seçin
5. **"Full Control"** yetkisi verin
6. **"Assign"** tıklayın

---

## 📝 Adım 6: Environment Variables Ayarlama

Artık tüm credentials'ları aldınız! Şimdi projenize ekleyin.

### 6.1 Backend .env Dosyası

`backend/.env` dosyası oluşturun:

```env
PORT=3002
NODE_ENV=production
JSON_LIMIT=10mb
CORS_ORIGIN=https://etkegym.com

# WhatsApp Cloud API Credentials
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=planla_webhook_token_2024
```

**Değiştirmeniz gerekenler**:
- `WHATSAPP_PHONE_NUMBER_ID`: API Setup'tan aldığınız Phone Number ID
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: API Setup'tan aldığınız Business Account ID
- `WHATSAPP_ACCESS_TOKEN`: Adım 5'te oluşturduğunuz **permanent token**

### 6.2 Docker .env Dosyası

Proje root'unda `.env` dosyası oluşturun:

```env
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_BUSINESS_ACCOUNT_ID=987654321098765
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_WEBHOOK_VERIFY_TOKEN=planla_webhook_token_2024
```

---

## 🧪 Adım 7: Test Etme

### 7.1 Backend'i Başlatma

```bash
cd backend
npm install
npm start
```

Çıktıda şunu görmelisiniz:
```
🚀 Backend server çalışıyor: http://localhost:3002
📱 WhatsApp Cloud API entegrasyonu aktif
✅ WhatsApp Cloud API hazır: +90 XXX XXX XX XX
```

### 7.2 Status Kontrolü

Yeni bir terminal açın:

```bash
curl http://localhost:3002/api/whatsapp/status
```

Başarılı yanıt:
```json
{
  "ready": true,
  "message": "WhatsApp Cloud API bağlantısı aktif",
  "hasCredentials": true,
  "phoneNumber": "+90 XXX XXX XX XX",
  "verifiedName": "Planla"
}
```

### 7.3 Test Mesajı Gönderme

```bash
curl -X POST http://localhost:3002/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "905XXXXXXXXX", "message": "Merhaba! Bu bir test mesajıdır."}'
```

Başarılı yanıt:
```json
{
  "success": true,
  "message": "Mesaj başarıyla gönderildi",
  "messageId": "wamid.xxx"
}
```

Telefonunuza WhatsApp mesajı gelecek! 🎉

---

## 🔗 Adım 8: Webhook Kurulumu (Opsiyonel)

Gelen mesajları almak için webhook kurmanız gerekir.

### 8.1 Public URL Hazırlama

**Seçenek 1: ngrok (Local test için)**

```bash
# ngrok indir ve kur
ngrok http 3002
```

ngrok size public URL verecek: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`

**Seçenek 2: Production Domain**

VDS'nizde çalışan domain: `https://yourdomain.com`

### 8.2 Meta Console'da Webhook Ayarlama

1. Meta Developer Console → App Dashboard
2. Sol menüden **"WhatsApp"** → **"Configuration"**
3. **"Webhook"** bölümünde **"Edit"** tıklayın
4. Webhook bilgilerini girin:
   - **Callback URL**: `https://yourdomain.com/api/whatsapp/webhook`
   - **Verify Token**: `planla_webhook_token_2024` (`.env` dosyasındaki ile aynı olmalı)
5. **"Verify and Save"** tıklayın

Meta, webhook'unuzu doğrulamak için GET isteği gönderecek. Backend'iniz otomatik olarak yanıt verecek.

### 8.3 Webhook Fields Seçme

1. **"Webhook fields"** bölümünde **"Manage"** tıklayın
2. Aşağıdaki field'ları seçin:
   - ✅ `messages` - Gelen mesajlar
   - ✅ `message_status` - Mesaj durumu (delivered, read, vb.)
3. **"Save"** tıklayın

### 8.4 Webhook Test

1. Meta Console'da **"Test"** butonuna tıklayın
2. Backend loglarında şunu görmelisiniz:
   ```
   ✅ Webhook doğrulandı
   📨 Gelen WhatsApp mesajı: {...}
   ```

---

## 🎓 Adım 9: Production'a Geçiş (İsteğe Bağlı)

Test modundan production'a geçmek için:

### 9.1 Business Verification

1. Meta Business Suite → Business Settings
2. **"Business Info"** → **"Business Verification"**
3. Gerekli belgeleri yükleyin (vergi levhası, vb.)
4. Onay bekleyin (1-3 gün)

### 9.2 WhatsApp Business Display Name

1. WhatsApp Manager → **"Account Tools"** → **"Display Name"**
2. Business adınızı girin
3. Onay için başvurun

### 9.3 Message Templates

Production'da 24 saat içinde yanıt vermediğiniz kullanıcılara sadece onaylanmış template mesajlar gönderebilirsiniz.

1. WhatsApp Manager → **"Message Templates"**
2. **"Create Template"** tıklayın
3. Template oluşturun ve onay bekleyin

---

## ✅ Kurulum Tamamlandı!

Tebrikler! WhatsApp Cloud API kurulumunu başarıyla tamamladınız.

### Özet Checklist

- [x] Meta Developer hesabı oluşturuldu
- [x] WhatsApp Business App oluşturuldu
- [x] Phone Number ID alındı
- [x] Business Account ID alındı
- [x] Permanent Access Token oluşturuldu
- [x] Test telefon numarası eklendi
- [x] `.env` dosyaları oluşturuldu
- [x] Backend test edildi
- [x] Test mesajı gönderildi ✅
- [ ] Webhook kuruldu (opsiyonel)
- [ ] Production'a geçildi (opsiyonel)

---

## 🆘 Sorun Giderme

### "Invalid access token"

- Permanent token kullandığınızdan emin olun
- Token'ın doğru kopyalandığını kontrol edin
- System user'a WhatsApp Account erişimi verildiğini kontrol edin

### "Phone number not registered"

- Test numarasını Meta Console'da eklediğinizden emin olun
- Numara formatının doğru olduğunu kontrol edin (90XXXXXXXXXX)

### "Webhook verification failed"

- Callback URL'in public olduğundan emin olun
- Verify token'ın `.env` dosyasındaki ile aynı olduğunu kontrol edin
- Backend'in çalıştığından emin olun

---

## 📚 Faydalı Linkler

- [Meta Developer Console](https://developers.facebook.com)
- [Meta Business Suite](https://business.facebook.com)
- [WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Manager](https://business.facebook.com/wa/manage)

---

## 💡 İpuçları

1. **Permanent Token Kullanın**: Temporary token 24 saat sonra sona erer
2. **Test Numarası Ekleyin**: Production'a geçmeden test edin
3. **Webhook Kurun**: Gelen mesajları almak için gerekli
4. **Business Verification**: Production için gerekli
5. **Rate Limiting**: Test hesabı günde 250 mesaj ile sınırlı

---

Başarılar! 🚀
