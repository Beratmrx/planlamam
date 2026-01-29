# 🐳 Docker Kurulum ve Deployment Rehberi

## 📋 İçindekiler
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [GitHub Actions ile Otomatik Deploy](#github-actions-ile-otomatik-deploy)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Local Development

### 1. Docker Compose ile Başlatma

```bash
# Tüm servisleri başlat (backend + frontend)
docker-compose up -d

# Logları izle
docker-compose logs -f

# Servisleri durdur
docker-compose down
```

### 2. Sadece Backend'i Çalıştırma

```bash
cd backend
docker build -t planla-backend .
docker run -d \
  -p 3002:3002 \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  -v $(pwd)/storage.json:/app/storage.json \
  --name planla-backend \
  planla-backend
```

### 3. Sadece Frontend'i Çalıştırma

```bash
# Build et
docker build -t planla-frontend .

# Çalıştır
docker run -d \
  -p 80:80 \
  -e VITE_BACKEND_URL=http://localhost:3002 \
  --name planla-frontend \
  planla-frontend
```

---

## 🌐 Production Deployment

### VDS'te Backend Deployment

#### 1. Projeyi VDS'e Kopyala

```bash
# VDS'e SSH ile bağlan
ssh user@your-vds-ip

# Projeyi klonla veya kopyala
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

#### 2. Environment Variables Ayarla

```bash
cd backend
cp .env.example .env
nano .env  # Veya vi .env
```

`.env` dosyasına şunları ekle:
```env
PORT=3002
NODE_ENV=production
JSON_LIMIT=10mb
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

#### 3. Docker ile Başlat

```bash
# Production compose ile başlat
docker-compose -f docker-compose.prod.yml up -d

# Logları kontrol et
docker-compose -f docker-compose.prod.yml logs -f backend
```

#### 4. Nginx Reverse Proxy (Opsiyonel)

Eğer domain kullanıyorsanız, Nginx reverse proxy ekleyin:

```nginx
# /etc/nginx/sites-available/planla-backend
server {
    listen 80;
    server_name api.yourdomain.com;

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

---

### Netlify'da Frontend Deployment

#### 1. Netlify Build Ayarları

Netlify dashboard'da:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Environment variables**:
  - `VITE_BACKEND_URL`: `https://api.yourdomain.com` (veya VDS IP:3002)

#### 2. Netlify.toml (Opsiyonel)

Proje root'una `netlify.toml` ekle:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  VITE_BACKEND_URL = "https://api.yourdomain.com"
```

---

## 🔄 GitHub Actions ile Otomatik Deploy

### Backend için GitHub Actions

`.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to VDS

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to VDS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VDS_HOST }}
          username: ${{ secrets.VDS_USER }}
          key: ${{ secrets.VDS_SSH_KEY }}
          script: |
            cd /path/to/your/project
            git pull origin main
            cd backend
            docker-compose -f ../docker-compose.prod.yml up -d --build backend
```

### Frontend için GitHub Actions

`.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend to Netlify

on:
  push:
    branches: [ main ]
    paths:
      - '**'
      - '!backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_BACKEND_URL: ${{ secrets.VITE_BACKEND_URL }}
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --dir=dist --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 🔧 Troubleshooting

### Backend Container Başlamıyor

```bash
# Logları kontrol et
docker-compose logs backend

# Container'ı yeniden başlat
docker-compose restart backend

# Container'ı sil ve yeniden oluştur
docker-compose down
docker-compose up -d --build backend
```

### WhatsApp QR Kod Gelmiyor

```bash
# WhatsApp session klasörünü kontrol et
docker exec planla-backend ls -la /app/.wwebjs_auth

# Session'ı temizle (gerekirse)
docker exec planla-backend rm -rf /app/.wwebjs_auth
docker-compose restart backend
```

### Frontend Backend'e Bağlanamıyor

1. **CORS ayarlarını kontrol et**: Backend'de `cors()` middleware'i aktif mi?
2. **Environment variable kontrol et**: `VITE_BACKEND_URL` doğru mu?
3. **Network kontrol et**: Frontend ve backend aynı network'te mi?

```bash
# Network'ü kontrol et
docker network inspect planla-network

# Container'ları network'e ekle
docker network connect planla-network planla-backend
docker network connect planla-network planla-frontend
```

### Port Çakışması

```bash
# Port'u kullanan process'i bul
sudo lsof -i :3002

# Process'i durdur
sudo kill -9 <PID>
```

---

## 📝 Önemli Notlar

1. **WhatsApp Session**: `.wwebjs_auth` klasörü volume olarak mount edilmiş, böylece container yeniden başlatıldığında session kaybolmaz.

2. **Storage**: `storage.json` dosyası da volume olarak mount edilmiş, veriler kalıcıdır.

3. **Environment Variables**: Production'da mutlaka `.env` dosyasını ayarlayın.

4. **Health Check**: Backend container'ı health check ile izleniyor, otomatik restart yapılır.

5. **Resource Limits**: Production'da `docker-compose.prod.yml` kullanarak resource limitleri ayarlayın.

---

## 🎯 Hızlı Başlangıç

```bash
# 1. Clone repo
git clone https://github.com/your-username/your-repo.git
cd your-repo

# 2. Backend environment ayarla
cd backend
cp .env.example .env
# .env dosyasını düzenle

# 3. Docker compose ile başlat
cd ..
docker-compose up -d

# 4. Logları izle
docker-compose logs -f

# 5. Tarayıcıda aç
# Frontend: http://localhost
# Backend: http://localhost:3002/api/whatsapp/status
```

---

**Sorun mu var?** GitHub Issues'da sorun açın veya logları kontrol edin! 🚀
