# GitHub / VDS Öncesi Kontrol Listesi

## Yapılan Kontroller

- **Backend:** `.env` sadece `server.js` ile `backend/.env` yolundan yükleniyor; WhatsApp modülü `.env` yüklendikten sonra dinamik import ile yükleniyor (credentials eksik hatası giderildi).
- **WhatsApp:** `whatsapp-cloud-api.js` içinde `dotenv/config` kaldırıldı; token tek kaynaktan (`backend/.env`) okunuyor.
- **.gitignore:** `.env`, `.env.local`, `backend/.env` ignore edildi; hassas bilgi repoya gitmez.
- **Kaynak kod:** Hiçbir yerde gerçek token/şifre yok; sadece `.env.example` / `backend/.env.example` placeholder içeriyor.
- **VDS dokümantasyonu:** `DEPLOY_NETLIFY_VDS.md` içinde VDS `.env` örneğine WhatsApp değişkenleri eklendi.

## Repoya Girmemesi Gerekenler

- `backend/.env` (WHATSAPP_ACCESS_TOKEN, MySQL şifreleri vb.)
- `.env`, `.env.local`
- `storage.json`, `backend/storage.json`
- `node_modules/`

## GitHub'a Yükleme (PowerShell)

Proje klasöründe Terminal açın, aşağıdaki komutları sırayla çalıştırın. **PowerShell'de `&&` yerine `;` kullanın.**

```powershell
# Proje klasörüne git (zaten oradaysanız atlayın)
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"

# Henüz git yoksa
git init

# Tüm dosyaları ekle (.env ve .gitignore'dakiler hariç)
git add .

# Commit
git commit -m "WhatsApp Cloud API credentials fix, VDS .env dokümantasyonu"

# İlk kez remote ekliyorsanız (KULLANICI ve REPO adınızı yazın)
git remote add origin https://github.com/KULLANICI/REPO.git

# Branch adı main olsun
git branch -M main

# GitHub'a gönder (şifre yerine Personal Access Token isteyebilir)
git push -u origin main
```

Zaten remote ekliyse sadece:

```powershell
git add .
git commit -m "WhatsApp credentials fix, VDS .env dokümantasyonu"
git push origin main
```

## VDS'te Güncelleme

GitHub'a push ettikten sonra VDS'e SSH ile bağlanıp projeyi güncelleyin:

```bash
# VDS'e bağlan
ssh KULLANICI@VDS_IP

# Proje klasörüne git (VDS: /root/planla)
cd /root/planla

# Son kodu çek
git pull origin main

# Backend container'ı yeniden build edip başlat
docker compose -f docker-compose.prod.yml up -d --build backend
```

VDS'te `.env` veya `backend/.env` içinde `WHATSAPP_PHONE_NUMBER_ID` ve `WHATSAPP_ACCESS_TOKEN` (kalıcı token) tanımlı olmalı. Yoksa `nano .env` veya `nano backend/.env` ile ekleyip kaydedin, sonra yukarıdaki `docker compose ...` komutunu tekrar çalıştırın.
