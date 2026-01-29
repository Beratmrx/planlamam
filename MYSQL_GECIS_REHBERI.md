# 🗄️ MySQL'e Geçiş Rehberi

## 📋 ADIM ADIM YAPILACAKLAR

---

## 🖥️ LOCAL DEVELOPMENT İÇİN

### Adım 1: MySQL Kurulumu (Windows)

**Seçenek A: XAMPP (ÖNERİLEN - Kolay)**

1. **XAMPP İndir:**
   - https://www.apachefriends.org/download.html
   - "XAMPP for Windows" indir
   - Kurulumu yap (varsayılan ayarlarla)

2. **MySQL'i Başlat:**
   - XAMPP Control Panel'i aç
   - **MySQL** yanındaki "Start" butonuna tıkla
   - Yeşil olunca hazır!

**Seçenek B: MySQL Community Server**

1. **MySQL İndir:**
   - https://dev.mysql.com/downloads/mysql/
   - "MySQL Installer for Windows" indir
   - Kurulum sırasında "root" şifresi belirleyin

---

### Adım 2: Veritabanını Oluştur

**XAMPP kullanıyorsanız:**

1. **phpMyAdmin'i aç:**
   - Tarayıcıda: http://localhost/phpmyadmin
   - Kullanıcı: `root`
   - Şifre: (boş bırakın)

2. **SQL sekmesine git** ve şu komutu çalıştır:

```sql
CREATE DATABASE IF NOT EXISTS planla
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_turkish_ci;
```

**Veya komut satırından:**

```powershell
# MySQL'e bağlan (XAMPP için şifre yok)
mysql -u root

# Veritabanını oluştur
CREATE DATABASE IF NOT EXISTS planla CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci;
USE planla;

# Tabloları oluştur (mysql-schema.sql dosyasını çalıştır)
SOURCE C:/Users/fatih/OneDrive/Desktop/yapılacaklar - Kopya (3)/backend/mysql-schema.sql;

# Çık
EXIT;
```

**Veya daha kolay:**

```powershell
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)\backend"
mysql -u root < mysql-schema.sql
```

---

### Adım 3: .env Dosyasını Kontrol Et

`backend/.env` dosyası şu şekilde olmalı:

```env
PORT=3002
JSON_LIMIT=10mb

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=          # XAMPP için boş bırakın, MySQL Community için şifrenizi yazın
MYSQL_DATABASE=planla
```

**ÖNEMLİ:** Eğer MySQL Community kullanıyorsanız ve root şifresi varsa, `MYSQL_PASSWORD=` satırına şifrenizi yazın!

---

### Adım 4: Verileri Migrate Et

```powershell
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)\backend"
npm run migrate:json-to-mysql
```

**Beklenen çıktı:**
```
🚀 storage.json -> MySQL Migration Başlatılıyor...
✅ storage.json okundu
   - 1 kullanıcı
   - 5 kategori
   - 3 görev
📡 MySQL bağlantısı kuruluyor...
✅ MySQL bağlantısı başarılı
📦 Veriler MySQL'e aktarılıyor...
✅ users: 1 kayıt migrate edildi
✅ categories: 5 kayıt migrate edildi
✅ tasks: 3 kayıt migrate edildi
✅ app_settings: Ayarlar kaydedildi
🎉 Migration başarıyla tamamlandı!
```

---

### Adım 5: Backend'i Yeniden Başlat

```powershell
# Eğer çalışıyorsa durdur (Ctrl+C)
# Sonra yeniden başlat
npm start
```

**Backend loglarında şunu görmelisiniz:**
```
✅ MySQL veritabanı kullanılıyor
🚀 Backend server çalışıyor: http://localhost:3002
```

**Eğer şunu görürseniz:**
```
✅ JSON dosyası (storage.json) kullanılıyor
```

Bu, MySQL bağlantısının başarısız olduğu anlamına gelir. `.env` dosyasını kontrol edin!

---

## 🐳 DOCKER İLE (Production)

### Adım 1: Docker Compose ile Başlat

```bash
# Tüm servisleri başlat (MySQL + Backend + Frontend)
docker-compose -f docker-compose.prod.yml up -d

# MySQL'in hazır olmasını bekle (30 saniye)
docker-compose -f docker-compose.prod.yml logs mysql
```

### Adım 2: Veritabanı Kontrolü

```bash
# MySQL container'ına bağlan
docker exec -it planla-mysql mysql -u planla_user -pplanla_password planla

# Tabloları kontrol et
SHOW TABLES;

# Verileri kontrol et
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM categories;
SELECT COUNT(*) FROM tasks;
```

### Adım 3: Verileri Migrate Et (Eğer storage.json'dan geçiş yapıyorsanız)

```bash
# Backend container'ına bağlan
docker exec -it planla-backend bash

# Migration scriptini çalıştır
npm run migrate:json-to-mysql

# Çık
exit
```

---

## ✅ KONTROL LİSTESİ

### Local:
- [ ] MySQL kurulu ve çalışıyor
- [ ] `planla` veritabanı oluşturuldu
- [ ] Tablolar oluşturuldu (users, categories, tasks, rentals, assets, app_settings)
- [ ] `backend/.env` dosyasında MySQL ayarları var
- [ ] Migration başarılı (`npm run migrate:json-to-mysql`)
- [ ] Backend başlatıldı ve "✅ MySQL veritabanı kullanılıyor" mesajı görünüyor

### Docker:
- [ ] MySQL container çalışıyor (`docker ps`)
- [ ] Backend container MySQL'e bağlanabiliyor
- [ ] Veriler MySQL'de (`docker exec` ile kontrol)

---

## 🧪 TEST ETME

### 1. Backend Loglarını Kontrol Et

Backend başlatıldığında şunu görmelisiniz:
```
✅ MySQL veritabanı kullanılıyor
```

**Eğer şunu görürseniz:**
```
✅ JSON dosyası (storage.json) kullanılıyor
```

Bu, MySQL bağlantısının başarısız olduğu anlamına gelir!

### 2. API ile Test Et

```powershell
# Verileri oku
curl http://localhost:3002/api/storage

# Veya tarayıcıda aç
# http://localhost:3002/api/storage
```

**Beklenen:** JSON formatında verileriniz gelmeli

### 3. MySQL'de Verileri Kontrol Et

```powershell
# MySQL'e bağlan
mysql -u root planla

# Kullanıcıları listele
SELECT id, JSON_EXTRACT(data, '$.name') as name FROM users;

# Kategorileri listele
SELECT id, JSON_EXTRACT(data, '$.name') as name FROM categories;

# Görevleri listele
SELECT id, JSON_EXTRACT(data, '$.title') as title FROM tasks;
```

---

## 🆘 SORUN GİDERME

### "MySQL veritabanı kullanılıyor" mesajı gelmiyor

**Kontrol listesi:**
1. MySQL çalışıyor mu? (XAMPP Control Panel'de yeşil mi?)
2. `.env` dosyasında MySQL ayarları doğru mu?
3. `MYSQL_PASSWORD` doğru mu? (XAMPP için boş olabilir)
4. Veritabanı oluşturuldu mu? (`SHOW DATABASES;` ile kontrol et)

### Migration hatası

```powershell
# MySQL bağlantısını test et
mysql -u root -e "SELECT 1"

# Veritabanını kontrol et
mysql -u root -e "SHOW DATABASES LIKE 'planla'"

# Tabloları kontrol et
mysql -u root planla -e "SHOW TABLES"
```

### "Access denied" hatası

- XAMPP kullanıyorsanız: `MYSQL_PASSWORD=` boş bırakın
- MySQL Community kullanıyorsanız: Root şifresini `.env` dosyasına ekleyin

---

## 📝 ÖNEMLİ NOTLAR

1. **Verileriniz korunur:** Migration sırasında `storage.json` dosyası silinmez, yedek olarak kalır
2. **Geri dönüş:** İsterseniz `.env` dosyasından MySQL ayarlarını silerek JSON dosyasına geri dönebilirsiniz
3. **Docker:** Production'da Docker Compose otomatik olarak MySQL'i başlatır ve bağlanır

---

**Başarılar!** 🚀
