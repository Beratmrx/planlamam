# Deployment Rehberi

Bu rehber, Planla uygulamasını VDS'te (backend) ve Netlify'da (frontend) nasıl deploy edeceğinizi adım adım açıklar.

## 📋 Ön Gereksinimler

- VDS sunucusu (Ubuntu 20.04+ önerilir)
- Domain adları:
  - `etkegym.com` → Frontend (Netlify)
  - `api.nexayazilim.com` → Backend (VDS)
- GitHub hesabı
- Netlify hesabı
- Gemini API Key

## 🔧 VDS Backend Deployment

### 1. VDS Hazırlığı

SSH ile VDS'nize bağlanın:
```bash
ssh root@YOUR_VDS_IP
```

### 2. Docker Kurulumu

```bash
# Docker kurulumu
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulumu
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Kurulumu doğrula
docker --version
docker-compose --version
```

### 3. Projeyi Clone Edin

```bash
# Proje dizini oluştur
mkdir -p /opt/planla
cd /opt/planla

# GitHub'dan clone et
git clone https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git .
```

### 4. Environment Variables Ayarlayın

Backend için `.env` dosyası oluşturun:
```bash
cd /opt/planla/backend
nano .env
```

Aşağıdaki içeriği ekleyin:
```env
PORT=3002
NODE_ENV=production
JSON_LIMIT=10mb

# Puppeteer/Chromium ayarları
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# CORS
CORS_ORIGIN=https://etkegym.com

# MySQL (opsiyonel - kullanmak isterseniz)
# MYSQL_HOST=mysql
# MYSQL_PORT=3306
# MYSQL_USER=planla_user
# MYSQL_PASSWORD=GÜÇLÜ_ŞİFRE
# MYSQL_DATABASE=planla
```

### 5. Docker Container'ı Başlatın

```bash
cd /opt/planla
docker-compose -f docker-compose.prod.yml up -d
```

### 6. Container Durumunu Kontrol Edin

```bash
# Container'ların çalıştığını kontrol et
docker ps

# Backend loglarını görüntüle
docker logs planla-backend -f

# Health check
curl http://localhost:3002/api/whatsapp/status
```

### 7. Domain Yapılandırması

`api.nexayazilim.com` domain'inizi VDS IP adresinize yönlendirin:

**DNS Ayarları:**
- Type: `A`
- Name: `api`
- Value: `YOUR_VDS_IP`
- TTL: `3600`

### 8. SSL Sertifikası (Nginx + Let's Encrypt)

```bash
# Nginx kurulumu
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Nginx yapılandırması
sudo nano /etc/nginx/sites-available/planla-backend
```

Aşağıdaki yapılandırmayı ekleyin:
```nginx
server {
    listen 80;
    server_name api.nexayazilim.com;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Yapılandırmayı aktifleştirin:
```bash
sudo ln -s /etc/nginx/sites-available/planla-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# SSL sertifikası al
sudo certbot --nginx -d api.nexayazilim.com
```

### 9. Otomatik Güncelleme (Opsiyonel)

GitHub'dan otomatik güncelleme için webhook veya cron job kurabilirsiniz:

```bash
# Güncelleme scripti oluştur
nano /opt/planla/update.sh
```

Script içeriği:
```bash
#!/bin/bash
cd /opt/planla
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

Scripti çalıştırılabilir yapın:
```bash
chmod +x /opt/planla/update.sh
```

---

## 🌐 Netlify Frontend Deployment

### 1. GitHub Repository'yi Netlify'a Bağlayın

1. [Netlify](https://netlify.com) hesabınıza giriş yapın
2. "Add new site" → "Import an existing project" seçin
3. GitHub repository'nizi seçin

### 2. Build Ayarlarını Yapılandırın

**Build settings:**
- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: (boş bırakın)

### 3. Environment Variables Ekleyin

Netlify dashboard'da **Site settings** → **Environment variables**:

```
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
VITE_BACKEND_URL=https://etkegym.com
```

> **Not:** `VITE_BACKEND_URL` Netlify domain'inizi kullanmalı çünkü Netlify proxy ile backend'e yönlendirecek.

### 4. Domain Ayarları

**Site settings** → **Domain management**:
1. "Add custom domain" tıklayın
2. `etkegym.com` ekleyin
3. DNS ayarlarınızı Netlify'ın verdiği değerlerle güncelleyin

**DNS Ayarları (Domain sağlayıcınızda):**
```
Type: CNAME
Name: www
Value: YOUR-SITE.netlify.app

Type: A
Name: @
Value: 75.2.60.5 (Netlify IP)
```

### 5. Deploy Edin

Netlify otomatik olarak deploy edecektir. Manuel deploy için:
```bash
# Netlify CLI kurulumu (opsiyonel)
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

---

## ✅ Deployment Doğrulama

### Backend Kontrolü

```bash
# Health check
curl https://api.nexayazilim.com/api/whatsapp/status

# Beklenen yanıt:
# {"ready":false,"qrCode":null,"hasClient":false}
```

### Frontend Kontrolü

1. Tarayıcıda `https://etkegym.com` açın
2. WhatsApp bağlantısını test edin
3. Görev ekleme/silme işlemlerini test edin

### CORS Kontrolü

Tarayıcı console'da CORS hatası olmamalı. Eğer varsa:
- Backend `.env` dosyasında `CORS_ORIGIN=https://etkegym.com` olduğundan emin olun
- Backend container'ı yeniden başlatın: `docker-compose -f docker-compose.prod.yml restart backend`

---

## 🔄 Güncelleme ve Bakım

### Backend Güncelleme

```bash
cd /opt/planla
git pull origin main
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Frontend Güncelleme

Netlify otomatik olarak GitHub'daki değişiklikleri algılar ve deploy eder. Manuel deploy için:
```bash
git push origin main
```

### Logları İzleme

```bash
# Backend logs
docker logs planla-backend -f --tail 100

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### WhatsApp Session Yedekleme

```bash
# WhatsApp session'ı yedekle
docker cp planla-backend:/app/.wwebjs_auth ./whatsapp-backup

# Geri yükle
docker cp ./whatsapp-backup planla-backend:/app/.wwebjs_auth
docker-compose -f docker-compose.prod.yml restart backend
```

---

## 🐛 Troubleshooting

### Backend Çalışmıyor

```bash
# Container durumunu kontrol et
docker ps -a

# Logları kontrol et
docker logs planla-backend

# Container'ı yeniden başlat
docker-compose -f docker-compose.prod.yml restart backend
```

### WhatsApp Bağlanamıyor

```bash
# Chromium kurulu mu kontrol et
docker exec planla-backend which chromium

# WhatsApp session'ı temizle
docker exec planla-backend rm -rf /app/.wwebjs_auth
docker-compose -f docker-compose.prod.yml restart backend
```

### CORS Hatası

Backend `.env` dosyasını kontrol edin:
```bash
docker exec planla-backend cat /app/.env | grep CORS_ORIGIN
```

Doğru değilse:
```bash
cd /opt/planla/backend
nano .env  # CORS_ORIGIN=https://etkegym.com
docker-compose -f docker-compose.prod.yml restart backend
```

### Netlify Build Hatası

1. Netlify deploy log'larını kontrol edin
2. Environment variables'ın doğru ayarlandığından emin olun
3. `package.json` ve `vite.config.js` dosyalarını kontrol edin

---

## 📞 Destek

Sorun yaşarsanız:
1. GitHub Issues açın
2. Logları paylaşın
3. Hata mesajlarını ekleyin
