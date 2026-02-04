# 🚀 Docker Hızlı Başlangıç

## 📦 Local'de Test Etme

### 1. Backend ve Frontend Birlikte

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Durdur
docker-compose down
```

### 2. Sadece Backend

```bash
cd backend
docker build -t planla-backend .
docker run -d \
  -p 3002:3002 \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  -v $(pwd)/storage.json:/app/storage.json \
  --name planla-backend \
  planla-backend

# Logları izle
docker logs -f planla-backend
```

---

## 🌐 Production Deployment

### VDS'te Backend

1. **SSH ile VDS'e bağlan**
```bash
ssh user@your-vds-ip
```

2. **Projeyi klonla/kopyala**
```bash
git clone https://github.com/your-username/your-repo.git
cd your-repo
```

3. **Environment variables ayarla**
```bash
cd backend
cp .env.example .env
nano .env  # PORT, CORS_ORIGIN vs. ayarla
```

4. **Docker ile başlat**
```bash
cd ..
docker-compose -f docker-compose.prod.yml up -d
```

5. **Kontrol et**
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
curl http://localhost:3002/api/whatsapp/status
```

### Netlify'da Frontend

1. **Netlify Dashboard'a git**
2. **Site Settings > Environment variables**:
   - `VITE_BACKEND_URL`: `https://api.yourdomain.com` (veya VDS IP:3002)
3. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. **Deploy!**

---

## 🔄 GitHub Actions Setup

### Secrets Ekle (GitHub Repo > Settings > Secrets)

**Backend için:**
- `VDS_HOST`: VDS IP adresi
- `VDS_USER`: SSH kullanıcı adı
- `VDS_SSH_KEY`: SSH private key
- `VDS_SSH_PORT`: SSH port (varsayılan: 22)
- `VDS_PROJECT_PATH`: Proje yolu (örn: `/root/planla`)

**Frontend için:**
- `NETLIFY_AUTH_TOKEN`: Netlify auth token
- `NETLIFY_SITE_ID`: Netlify site ID
- `VITE_BACKEND_URL`: Backend URL (örn: `https://api.yourdomain.com`)

---

## ✅ Test Checklist

- [ ] Backend container başladı mı? (`docker ps`)
- [ ] Backend health check geçti mi? (`curl http://localhost:3002/api/whatsapp/status`)
- [ ] WhatsApp QR kod geliyor mu?
- [ ] Frontend build başarılı mı?
- [ ] Frontend backend'e bağlanabiliyor mu?
- [ ] CORS hatası var mı? (Browser console kontrol et)

---

**Detaylı bilgi için:** `DOCKER_KURULUM.md` dosyasına bakın! 📚
