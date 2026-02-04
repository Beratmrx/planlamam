# 🚀 Docker Hızlı Komut Referansı

## 📦 LOCAL TEST

```powershell
# Tüm servisleri başlat
docker-compose up -d

# Logları izle
docker-compose logs -f

# Sadece backend logları
docker-compose logs -f backend

# Container'ları durdur
docker-compose down

# Container'ları durdur ve volume'ları sil (YEREL TEST İÇİN - VDS'te KULLANMAYIN; MySQL verisi silinir!)
docker-compose down -v

# Yeniden build et ve başlat
docker-compose up -d --build
```

---

## 🌐 VDS BACKEND

```bash
# VDS'e bağlan
ssh kullanici@vds_ip

# Projeye git (VDS proje kökü: /root/planla)
cd /root/planla

# Environment ayarla
cd backend
cp .env.example .env
nano .env  # Düzenle ve kaydet

# Docker ile başlat
cd ..
docker-compose -f docker-compose.prod.yml up -d

# Logları izle
docker-compose -f docker-compose.prod.yml logs -f backend

# Container'ı yeniden başlat
docker-compose -f docker-compose.prod.yml restart backend

# Container'ı durdur (VDS: -v KULLANMAYIN; aksi halde mysql_data silinir ve tüm veritabanı sıfırlanır)
docker-compose -f docker-compose.prod.yml down

# Güncelleme (Git pull + restart)
git pull
docker-compose -f docker-compose.prod.yml up -d --build backend
```

---

## 🔍 KONTROL KOMUTLARI

```bash
# Çalışan container'ları listele
docker ps

# Tüm container'ları listele (durdurulmuş dahil)
docker ps -a

# Container loglarını gör
docker logs planla-backend

# Container içine gir (debug için)
docker exec -it planla-backend bash

# Container'ı durdur
docker stop planla-backend

# Container'ı sil
docker rm planla-backend

# Image'ları listele
docker images

# Kullanılmayan image'ları temizle
docker image prune -a
```

---

## 🐛 SORUN GİDERME

```bash
# Backend çalışmıyor mu?
docker-compose logs backend

# Port çakışması mı var?
netstat -ano | findstr :3002  # Windows
lsof -i :3002                 # Linux/Mac

# Container yeniden başlat
docker-compose restart backend

# Tamamen temizle ve yeniden başlat
docker-compose down
docker-compose up -d --build

# WhatsApp session temizle
docker exec planla-backend rm -rf /app/.wwebjs_auth
docker-compose restart backend
```

---

## 📊 DURUM KONTROLÜ

```bash
# Backend sağlık kontrolü
curl http://localhost:3002/api/whatsapp/status

# Container kaynak kullanımı
docker stats

# Network kontrolü
docker network inspect planla-network

# Volume kontrolü
docker volume ls
docker volume inspect planla_whatsapp-data
```

---

## 🔄 GÜNCELLEME

```bash
# Git'ten çek
git pull origin main

# Backend'i yeniden build et
cd backend
docker build -t planla-backend .

# Veya compose ile
docker-compose -f docker-compose.prod.yml up -d --build backend
```

---

**Detaylı bilgi için:** `DOCKER_ADIM_ADIM_REHBER.md` dosyasına bakın! 📚
