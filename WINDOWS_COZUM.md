# 🔧 Windows EPERM Hatası Çözümü

## ❌ Sorun
Frontend başlatılırken `Error: spawn EPERM` hatası alıyorsunuz. Bu Windows Defender veya antivirüs yazılımının esbuild.exe dosyasını engellemesinden kaynaklanıyor.

## ✅ Çözüm Yöntemi 1: Windows Defender Dışlama (ÖNERİLEN)

### Adım 1: Windows Güvenlik'i Açın
1. Windows tuşuna basın
2. "Windows Güvenliği" yazın ve açın
3. "Virüs ve tehdit koruması" seçeneğine tıklayın

### Adım 2: Dışlamaları Ekleyin
1. "Virüs ve tehdit koruması ayarları"na gidin
2. "Ayarları yönet" linkine tıklayın
3. Aşağı kaydırın ve "Dışlamalar"ı bulun
4. "Dışlama ekle veya kaldır" seçeneğine tıklayın
5. "Dışlama ekle" butonuna tıklayın
6. "Klasör" seçin
7. Şu klasörü seçin:
   ```
   C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)
   ```

### Adım 3: Frontend'i Tekrar Başlatın
```powershell
npm run dev
```

## ✅ Çözüm Yöntemi 2: Antivirüs Geçici Olarak Kapat

Eğer üçüncü parti antivirüs kullanıyorsanız (Avast, AVG, Norton, vb.):
1. Antivirüsü geçici olarak devre dışı bırakın (5 dakika)
2. Frontend'i başlatın: `npm run dev`
3. Başlatıldıktan sonra antivirüsü tekrar açabilirsiniz

## ✅ Çözüm Yöntemi 3: Alternatif Başlatma (EN KOLAY)

Vite config olmadan basit HTTP sunucusu kullanın:

### PowerShell'de:
```powershell
# 1. Python ile basit sunucu (Python kuruluysa)
python -m http.server 3000

# VEYA

# 2. npx ile serve (her zaman çalışır)
npx serve -p 3000
```

Sonra tarayıcıda açın: `http://localhost:3000`

## 🎯 Hangi Yöntemi Seçmeliyim?

- **Yöntem 1**: En güvenli ve kalıcı çözüm ✅
- **Yöntem 2**: Hızlı ama geçici
- **Yöntem 3**: Acil durum çözümü

## 📝 Yöntem 1'i Uyguladıktan Sonra

1. Windows Defender'a dışlama ekleyin
2. Terminal'i kapatın
3. **YENİ** bir PowerShell terminali açın
4. Şu komutları çalıştırın:

```powershell
# Ana klasörde
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"
npm run dev
```

## 🔍 Sorun Devam Ediyorsa

Eğer hala çalışmıyorsa, esbuild'i manuel olarak test edin:

```powershell
# esbuild binary'sini test et
.\node_modules\.bin\esbuild --version
```

**Hata alırsanız**: Kesinlikle antivirüs engelliyor
**Versiyon görürsünüz**: esbuild çalışıyor, başka bir sorun var

## ⚡ Hızlı Test

Windows Defender dışlamayı ekledikten sonra test için:

```powershell
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
npm run dev
```

Her iki sunucu da başarıyla başlamalı!

## 🎊 Başarı Göstergeleri

✅ Backend: `http://localhost:3001` - Çalışıyor
✅ Frontend: `http://localhost:3000` - Çalışıyor  
✅ Vite mesajı: `VITE v6.2.0 ready in XXX ms`
✅ Local: `http://localhost:3000/` görebilirsiniz

---

**Not**: Bu sorun sadece Windows'a özgüdür ve geliştirme ortamında çok yaygındır. Production'da bu sorun olmaz.
