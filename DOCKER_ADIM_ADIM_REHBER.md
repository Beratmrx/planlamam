# 🎯 Docker Kurulum - Adım Adım Rehber (Başlangıç Seviyesi)

Bu rehber, Docker bilgisi olmayanlar için hazırlanmıştır. Her adımı tek tek takip edin.

---

## 📋 İÇİNDEKİLER

1. [Docker Kurulumu](#1-docker-kurulumu)
2. [Local'de Test Etme](#2-localde-test-etme)
3. [VDS'e Backend Deploy](#3-vdse-backend-deploy)
4. [Netlify'a Frontend Deploy](#4-netlifya-frontend-deploy)
5. [GitHub Actions Kurulumu](#5-github-actions-kurulumu)

---

## 1. DOCKER KURULUMU

### Windows için:

1. **Docker Desktop İndir**
   - https://www.docker.com/products/docker-desktop/ adresine git
   - "Download for Windows" butonuna tıkla
   - İndirilen `.exe` dosyasını çalıştır

2. **Kurulum**
   - "Install" butonuna tıkla
   - Kurulum tamamlanınca bilgisayarı yeniden başlat

3. **Docker'ı Başlat**
   - Windows başlat menüsünden "Docker Desktop" aç
   - Sistem tepsinde Docker ikonu görünene kadar bekle (1-2 dakika)
   - İkon yeşil olunca hazırsınız!

4. **Kontrol Et**
   - PowerShell veya CMD aç
   - Şu komutu çalıştır:
   ```powershell
   docker --version
   ```
   - Versiyon numarası görünmeli (örn: `Docker version 24.0.0`)

---

## 2. LOCAL'DE TEST ETME

### Adım 1: Proje Klasörüne Git

```powershell
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"
```

### Adım 2: Docker Compose ile Başlat

```powershell
docker-compose up -d
```

**Ne olacak?**
- İlk seferde Docker image'ları indirilecek (5-10 dakika sürebilir)
- Backend ve Frontend container'ları başlayacak

### Adım 3: Logları İzle

```powershell
docker-compose logs -f
```

**Ne göreceksiniz?**
- Backend logları
- Frontend logları
- WhatsApp başlatma mesajları

**Çıkmak için:** `Ctrl+C` tuşlarına basın

### Adım 4: Tarayıcıda Test Et

1. **Frontend:** http://localhost açın
2. **Backend:** http://localhost:3002/api/whatsapp/status açın

**Backend'de şunu görmelisiniz:**
```json
{
  "ready": false,
  "qrCode": "...",
  "hasClient": true
}
```

### Adım 5: Durdurma

```powershell
docker-compose down
```

---

## 3. VDS'E BACKEND DEPLOY

### ÖN HAZIRLIK

#### 3.1 VDS'e SSH ile Bağlanma

**Windows PowerShell'de:**

```powershell
ssh kullanici_adi@vds_ip_adresi
```

**Örnek:**
```powershell
ssh root@192.168.1.100
```

**İlk bağlantıda:** "yes" yazıp Enter'a basın

**Şifre sorarsa:** VDS şifrenizi girin

---

#### 3.2 VDS'te Docker Kurulumu

VDS'e bağlandıktan sonra:

```bash
# Docker kurulumu (Ubuntu/Debian için)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Kontrol et
docker --version
docker-compose --version
```

---

#### 3.3 Projeyi VDS'e Kopyalama

**Seçenek 1: Git ile (ÖNERİLEN)**

```bash
# Git kurulu değilse
sudo apt update
sudo apt install git -y

# Projeyi klonla
cd /var/www  # veya istediğiniz klasör
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
cd REPO_ADINIZ
```

**Seçenek 2: Manuel Kopyalama**

1. **Windows'ta WinSCP veya FileZilla indir**
2. **VDS'e bağlan** (SFTP protokolü ile)
3. **Proje klasörünü VDS'e kopyala** (örn: `/root/planla`)

---

#### 3.4 Environment Variables Ayarlama

```bash
cd backend
cp .env.example .env
nano .env
```

**`.env` dosyasına şunları ekleyin:**

```env
PORT=3002
NODE_ENV=production
JSON_LIMIT=10mb
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# ÖNEMLİ: Netlify domain'inizi buraya ekleyin!
CORS_ORIGIN=https://your-app.netlify.app,https://yourdomain.com
```

**Kaydet:** `Ctrl+O` → Enter → `Ctrl+X`

---

#### 3.5 Docker ile Başlatma

```bash
# Ana klasöre dön
cd ..

# Production compose ile başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs -f backend
```

**Çıkmak için:** `Ctrl+C`

---

#### 3.6 Kontrol Etme

```bash
# Container çalışıyor mu?
docker ps

# Backend çalışıyor mu?
curl http://localhost:3002/api/whatsapp/status
```

**Başarılı ise şunu görmelisiniz:**
```json
{"ready":false,"qrCode":"...","hasClient":true}
```

---

#### 3.7 Firewall Ayarları (Gerekirse)

```bash
# Port 3002'yi aç
sudo ufw allow 3002/tcp
sudo ufw reload
```

---

## 4. NETLIFY'A FRONTEND DEPLOY

### 4.1 Netlify Hesabı Oluşturma

1. **https://app.netlify.com** adresine git
2. **"Sign up"** butonuna tıkla
3. **GitHub ile giriş yap** (önerilir)

---

### 4.2 Yeni Site Oluşturma

1. **Netlify Dashboard'da** "Add new site" → "Import an existing project"
2. **GitHub'ı seç** ve repo'nuzu bağla
3. **Build settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **"Deploy site"** butonuna tıkla

---

### 4.3 Environment Variables Ekleme

1. **Site Settings** → **Environment variables**
2. **"Add a variable"** butonuna tıkla
3. **Şunları ekle:**
   - **Key:** `VITE_BACKEND_URL`
   - **Value:** `https://api.yourdomain.com` (veya VDS IP: `http://VDS_IP:3002`)
4. **"Save"** butonuna tıkla
5. **"Trigger deploy"** → **"Clear cache and deploy site"**

---

### 4.4 Custom Domain (Opsiyonel)

1. **Site Settings** → **Domain management**
2. **"Add custom domain"** butonuna tıkla
3. **Domain'inizi girin** (örn: `app.yourdomain.com`)
4. **DNS ayarlarını yapın** (Netlify size talimat verecek)

---

## 5. GITHUB ACTIONS KURULUMU

### 5.1 GitHub Secrets Ekleme

1. **GitHub repo'nuzda** → **Settings** → **Secrets and variables** → **Actions**

2. **Backend için şu secret'ları ekle:**

   **VDS_HOST:**
   - Name: `VDS_HOST`
   - Value: VDS IP adresiniz (örn: `192.168.1.100`)

   **VDS_USER:**
   - Name: `VDS_USER`
   - Value: SSH kullanıcı adınız (örn: `root`)

   **VDS_SSH_KEY:**
   - Name: `VDS_SSH_KEY`
   - Value: SSH private key'iniz (aşağıdaki adımlarda oluşturacağız)

   **VDS_PROJECT_PATH:**
   - Name: `VDS_PROJECT_PATH`
   - Value: Proje yolu (örn: `/root/planla`)

3. **Frontend için şu secret'ları ekle:**

   **NETLIFY_AUTH_TOKEN:**
   - Name: `NETLIFY_AUTH_TOKEN`
   - Value: Netlify'dan alacağız (aşağıda)

   **NETLIFY_SITE_ID:**
   - Name: `NETLIFY_SITE_ID`
   - Value: Netlify site ID'niz

   **VITE_BACKEND_URL:**
   - Name: `VITE_BACKEND_URL`
   - Value: Backend URL'iniz (örn: `https://api.yourdomain.com`)

---

### 5.2 SSH Key Oluşturma (VDS için)

**Windows PowerShell'de:**

```powershell
# SSH key oluştur
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Dosya adı sorarsa: Enter'a bas (varsayılan: id_rsa)
# Şifre sorarsa: Enter'a bas (boş bırak)

# Public key'i kopyala
cat ~/.ssh/id_rsa.pub
```

**Çıkan metni kopyalayın!**

**VDS'e bağlan ve public key'i ekle:**

```bash
# VDS'te
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys
# Kopyaladığınız public key'i buraya yapıştırın
# Ctrl+O → Enter → Ctrl+X
chmod 600 ~/.ssh/authorized_keys
```

**Private key'i GitHub'a ekle:**

```powershell
# Windows'ta private key'i oku
cat ~/.ssh/id_rsa
```

**Tüm içeriği kopyalayın** (-----BEGIN ile başlayıp -----END ile biten) ve GitHub Secrets'a `VDS_SSH_KEY` olarak ekleyin.

---

### 5.3 Netlify Token Alma

1. **Netlify Dashboard** → **User settings** → **Applications**
2. **"New access token"** butonuna tıkla
3. **Token adı verin** (örn: "GitHub Actions")
4. **Token'ı kopyalayın** ve GitHub Secrets'a `NETLIFY_AUTH_TOKEN` olarak ekleyin

**Site ID'yi bulma:**
- Netlify Dashboard → Site Settings → General → Site details
- **Site ID** burada görünür

---

### 5.4 Test Etme

1. **GitHub'da bir değişiklik yapın** (örn: README.md'ye bir satır ekleyin)
2. **Commit ve push yapın:**
   ```bash
   git add .
   git commit -m "Test commit"
   git push origin main
   ```
3. **GitHub Actions sekmesine gidin**
4. **Workflow'un çalıştığını görün**
5. **Başarılı olursa:** Backend VDS'te, Frontend Netlify'da güncellenecek!

---

## ✅ KONTROL LİSTESİ

### Local Test:
- [ ] Docker Desktop kurulu ve çalışıyor
- [ ] `docker-compose up -d` başarılı
- [ ] http://localhost açılıyor
- [ ] http://localhost:3002/api/whatsapp/status çalışıyor

### VDS Backend:
- [ ] VDS'e SSH ile bağlanabiliyorum
- [ ] Docker VDS'te kurulu
- [ ] Proje VDS'te
- [ ] `.env` dosyası ayarlandı
- [ ] `docker-compose -f docker-compose.prod.yml up -d` başarılı
- [ ] Backend çalışıyor (curl test)

### Netlify Frontend:
- [ ] Netlify hesabı var
- [ ] Site oluşturuldu
- [ ] Environment variable eklendi (`VITE_BACKEND_URL`)
- [ ] Build başarılı
- [ ] Site açılıyor

### GitHub Actions:
- [ ] Tüm secret'lar eklendi
- [ ] SSH key oluşturuldu ve VDS'e eklendi
- [ ] Netlify token alındı
- [ ] Test commit yapıldı
- [ ] Workflow başarılı

---

## 🆘 SORUN GİDERME

### Docker çalışmıyor:
```powershell
# Docker Desktop'ı yeniden başlat
# Veya
docker-compose down
docker-compose up -d
```

### VDS'e bağlanamıyorum:
```bash
# SSH key kontrolü
ssh -v kullanici@vds_ip

# Firewall kontrolü
sudo ufw status
```

### Backend çalışmıyor:
```bash
# Logları kontrol et
docker-compose logs backend

# Container'ı yeniden başlat
docker-compose restart backend
```

### Frontend build hatası:
- Netlify'da **Build logs** sekmesine bakın
- `VITE_BACKEND_URL` environment variable'ının doğru olduğundan emin olun

---

## 📞 YARDIM

Sorun yaşarsanız:
1. **Logları kontrol edin** (`docker-compose logs`)
2. **Environment variables'ı kontrol edin**
3. **GitHub Issues'da sorun açın**

**Başarılar!** 🚀
