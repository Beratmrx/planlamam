# 📱 WhatsApp Entegrasyon Kurulum Rehberi

## 🚀 Kurulum Adımları

### 1. Backend Paketlerini Yükle
```bash
cd backend
npm install
```

### 2. Frontend Paketleri (Zaten Kurulu)
Ana klasörde:
```bash
npm install
```

### 3. Backend'i Başlat
Backend klasöründe:
```bash
npm start
```
Backend `http://localhost:3001` adresinde çalışacak.

### 4. Frontend'i Başlat
Ana klasörde (yeni bir terminal penceresi açın):
```bash
npm run dev
```
Frontend `http://localhost:5173` adresinde açılacak.

## 📲 WhatsApp Bağlantısı Kurma

1. **Uygulamayı açın** - Frontend'de sol üst köşede yeşil veya gri WhatsApp ikonuna tıklayın

2. **WhatsApp'ı Başlat** butonuna tıklayın

3. **QR Kodu Tarayın**:
   - Telefonunuzda WhatsApp'ı açın
   - Menü (⋮) > Bağlı Cihazlar > Cihaz Bağla
   - Ekranda gözüken QR kodu telefonunuzla tarayın

4. **Telefon Numarasını Ayarlayın**:
   - Varsayılan: `05536789487`
   - İstediğiniz numarayı girin
   - "Kaydet" butonuna tıklayın

5. **Hazır!** 🎉
   - WhatsApp ikonu yeşil olacak
   - Artık görevleri tamamladığınızda otomatik WhatsApp mesajı gönderilecek

## 📋 Nasıl Çalışır?

- Bir görevi tamamlamak için ✓ butonuna tıklayın
- Eğer WhatsApp bağlıysa, otomatik olarak şu formatta mesaj gönderilir:

```
✅ Görev Tamamlandı!

📝 [Görev Adı]
📁 Kategori: [Kategori Adı]
⏰ [Tarih ve Saat]
```

## ⚙️ Teknik Detaylar

- **Backend**: Express.js + whatsapp-web.js + Puppeteer
- **QR Kod**: QR kod tarama ile WhatsApp Web protokolü kullanılır
- **Oturum**: LocalAuth ile oturum kaydedilir (tekrar QR kod taramaya gerek kalmaz)
- **Port**: Backend 3001, Frontend 5173

## 🔧 Sorun Giderme

### Backend Başlamıyor
- `backend` klasöründe `npm install` komutunu çalıştırdınızdan emin olun
- Port 3001'in kullanılmadığından emin olun

### QR Kod Çıkmıyor
- Backend'in çalıştığını kontrol edin (`http://localhost:3001`)
- Browser console'da hata var mı kontrol edin
- Backend terminalinde hataları kontrol edin

### Mesaj Gönderilmiyor
- WhatsApp'ın "Bağlı" olduğundan emin olun (yeşil ikon)
- Telefon numarasının doğru formatta olduğundan emin olun
- Backend terminalinde hata mesajlarını kontrol edin

### Chromium İndirme Hatası
Eğer Puppeteer chromium indirme hatası verirse:
```bash
cd backend
npx puppeteer browsers install chrome
```

## 📞 Telefon Numarası Formatı

- ✅ Doğru: `05536789487`, `5536789487`, `905536789487`
- ❌ Yanlış: `+905536789487`, `0 553 678 94 87`

Sistem otomatik olarak numarayı düzeltir:
- 0 ile başlıyorsa kaldırır
- 90 ile başlamıyorsa ekler
- Sadece rakamları alır

## 🎯 Özellikler

✅ QR kod ile kolay bağlantı (Cloud API gerekmez)
✅ Oturum kaydı (bir kez bağlandıktan sonra tekrar QR kod taramaya gerek yok)
✅ Otomatik mesaj gönderimi
✅ Özelleştirilebilir telefon numarası
✅ Görsel durum göstergesi
✅ Modern ve şık UI

## 📝 Notlar

- WhatsApp bağlantısı bilgisayarınızda kalır
- Backend her kapandığında bağlantı kesilmez (LocalAuth sayesinde)
- Birden fazla cihaz bağlanabilir
- WhatsApp Business ve normal WhatsApp hesapları desteklenir

