# WhatsApp Cloud API Migration - Quick Reference

## 🚀 Quick Start

### 1. Meta Developer Setup (5-10 dakika)

1. **Hesap Oluştur**: [developers.facebook.com](https://developers.facebook.com)
2. **App Oluştur**: "Create App" → "Business" → WhatsApp ekle
3. **Credentials Al**:
   - Phone Number ID: `123456789012345`
   - Business Account ID: `987654321098765`
   - **Permanent** Access Token: `EAAxxxxxxxxxxxxx`

### 2. Environment Variables

**backend/.env** dosyası oluştur:
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_token
```

**Root .env** dosyası oluştur (Docker için):
```env
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_permanent_token
```

### 3. Test

```bash
# Backend başlat
cd backend
npm start

# Status kontrol
curl http://localhost:3002/api/whatsapp/status

# Test mesajı
curl -X POST http://localhost:3002/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "905XXXXXXXXX", "message": "Test"}'
```

---

## 📋 Checklist

- [ ] Meta Developer hesabı oluşturuldu
- [ ] WhatsApp Business App kuruldu
- [ ] Permanent access token alındı
- [ ] Test telefon numarası eklendi
- [ ] `backend/.env` dosyası oluşturuldu
- [ ] `.env` dosyası oluşturuldu (Docker için)
- [ ] Backend test edildi
- [ ] Test mesajı gönderildi ✅
- [ ] Docker ile deploy edildi (opsiyonel)
- [ ] Webhook kuruldu (opsiyonel)

---

## 🎯 Key Changes

| Özellik | Önce | Sonra |
|---------|------|-------|
| Bağlantı | QR kod | API credentials |
| Docker Image | ~1.5 GB | ~200 MB |
| Chromium | Gerekli | Gereksiz |
| Session | Local dosyalar | Yok |
| Webhook | Yok | Var ✅ |

---

## 📚 Detaylı Dokümantasyon

- [WHATSAPP_CLOUD_API.md](file:///c:/Users/fatih/OneDrive/Desktop/yapılacaklar%20-%20Kopya%20(3)/WHATSAPP_CLOUD_API.md) - Tam kurulum rehberi
- [walkthrough.md](file:///C:/Users/fatih/.gemini/antigravity/brain/83ee0a24-dce3-46bb-af6f-3386999fcca5/walkthrough.md) - Yapılan değişiklikler

---

## ⚡ Hızlı Komutlar

```bash
# Backend test
cd backend && npm start

# Docker build
docker-compose build

# Docker run
docker-compose up -d

# Logs
docker-compose logs -f backend
```
