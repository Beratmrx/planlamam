# 📱 WhatsApp Entegrasyonu - Kullanım Kılavuzu

## 🎯 Özellikler

✅ **QR Kod ile Bağlantı**: WhatsApp Web gibi QR kod tarayarak hesabınızı bağlayın
✅ **Kalıcı Oturum**: Bir kez bağlandıktan sonra tekrar QR kod gerektirmez
✅ **Otomatik Bildirim**: Her görev tamamlandığında otomatik WhatsApp mesajı gönderir
✅ **Özelleştirilebilir Numara**: Bildirimlerin gönderileceği numarayı ayarlayabilirsiniz

## 🚀 Nasıl Kullanılır?

### 1️⃣ Sunucuları Başlatın

#### Backend Sunucusu (Terminal 1):
```bash
cd backend
npm start
```
**Durum**: ✅ Backend şu anda zaten çalışıyor!

#### Frontend Uygulaması (Terminal 2):
```bash
npm run dev
```

### 2️⃣ WhatsApp Hesabınızı Bağlayın

1. **Uygulamayı açın**: `http://localhost:5173` (Vite default port)
2. **WhatsApp butonuna tıklayın**: Sağ üstteki WhatsApp ikonu (yeşil veya gri)
3. **"WhatsApp'ı Başlat" butonuna basın**
4. **QR Kod görünecek**: Modal'da bir QR kod belirecek
5. **Telefonunuzla okutun**:
   - WhatsApp uygulamasını açın
   - Menü (⋮) > **Bağlı Cihazlar**
   - **Cihaz Bağla**
   - QR kodu telefonunuzla tarayın
6. **Bağlantı tamamlandı!** ✅ işareti görünecek

### 3️⃣ Telefon Numarasını Ayarlayın

1. WhatsApp modal'ında **telefon numarası girin**
2. Varsayılan: `05536789487` (sizin belirttiğiniz numara)
3. **"Kaydet"** butonuna basın

### 4️⃣ Görev Tamamlayın ve Bildirim Alın

1. Herhangi bir görevi **tamamlandı olarak işaretleyin** ✓
2. **Otomatik olarak WhatsApp mesajı gönderilecek!**

Mesaj formatı:
```
✅ Görev Tamamlandı!

📝 [Görev Başlığı]
📁 Kategori: [Kategori Adı]
⏰ [Tarih ve Saat]
```

## 🔧 Teknik Detaylar

### Backend (Node.js + Express)
- **Port**: 3001
- **Kütüphane**: whatsapp-web.js (QR kod tabanlı)
- **Oturum Yönetimi**: LocalAuth (kalıcı oturum)
- **API Endpoints**:
  - `POST /api/whatsapp/initialize` - WhatsApp'ı başlat
  - `GET /api/whatsapp/status` - Bağlantı durumu ve QR kod
  - `POST /api/whatsapp/send` - Mesaj gönder

### Frontend (React + TypeScript)
- **Service**: `services/whatsappService.ts`
- **UI**: App.tsx içinde WhatsApp modal
- **State Management**: React useState hooks

## 🐛 Sorun Giderme

### Backend Başlamıyor
```bash
cd backend
npm install
npm start
```

### QR Kod Görünmüyor
1. Backend'in çalıştığından emin olun (port 3001)
2. WhatsApp modal'ını kapatıp tekrar açın
3. Backend loglarını kontrol edin

### Mesaj Gönderilmiyor
1. WhatsApp bağlantısının "✅ Bağlı ve Hazır" durumunda olduğunu kontrol edin
2. Telefon numarasının doğru formatta olduğundan emin olun (05XXXXXXXXX)
3. Backend konsolunda hata mesajlarını kontrol edin

### Bağlantı Kopuyor
1. "Bağlantıyı Kes" butonuna basın
2. Backend'i yeniden başlatın
3. Tekrar QR kod ile bağlanın

## 📋 Sistem Gereksinimleri

- **Node.js**: v14 veya üzeri
- **Chromium**: whatsapp-web.js için (otomatik indirilir)
- **WhatsApp**: Telefonda yüklü ve aktif WhatsApp hesabı

## 🔐 Güvenlik Notu

- Oturum bilgileri `backend/.wwebjs_auth` klasöründe **lokal olarak** saklanır
- Hiçbir veri üçüncü parti sunuculara gönderilmez
- WhatsApp Web protokolü kullanılır (resmi olmayan ama yaygın kullanılan)

## 💡 İpuçları

1. **Kalıcı Oturum**: İlk bağlantıdan sonra backend her başladığında otomatik bağlanır
2. **Birden Fazla Cihaz**: WhatsApp'ta maksimum 4 cihaz bağlanabilir
3. **Numara Formatı**: Türkiye için 90 ülke kodu otomatik eklenir (05XXXXXXXXX → 905XXXXXXXXX)
4. **Backend Always On**: Backend sürekli çalışmalı, yoksa bildirimler gönderilmez

## 🎨 Özelleştirme

### Mesaj Şablonunu Değiştirme
`App.tsx` dosyasında `toggleTask` fonksiyonunda mesaj formatını düzenleyebilirsiniz:

```typescript
const message = `✅ Görev Tamamlandı!\n\n📝 ${task.title}\n📁 Kategori: ${category?.name || 'Bilinmiyor'}\n⏰ ${new Date().toLocaleString('tr-TR')}`;
```

### Farklı Numaralara Gönderme
Her kategori için farklı numara ayarlamak isterseniz, `Category` type'ına `phoneNumber` alanı ekleyebilirsiniz.

---

**Hazırlayan**: AI Asistan  
**Tarih**: 22 Ocak 2026  
**Versiyon**: 1.0

