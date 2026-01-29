# VDS’te Eski Projeden Docker’a Geçiş

Repo aynı: **https://github.com/Beratmrx/planlamam.git**  
Eski proje Docker’sız çalışıyorsa, aşağıdaki adımlarla Docker’a geçin.

---

## 0. Proje Klasörünü Bulmak (Nereye Attığınızı Hatırlamıyorsanız)

VDS’e SSH ile bağlandıktan sonra şu komutlardan birini çalıştırın:

**Git repo adına göre arama (planlamam):**
```bash
sudo find / -name ".git" -type d 2>/dev/null | while read d; do
  if grep -q "planlamam" "$d/config" 2>/dev/null; then
    echo "$(dirname "$d")"
  fi
done
```

**Veya daha basit – planlamam / planla geçen klasörler:**
```bash
sudo find /var /home /root -type d -name "*planla*" 2>/dev/null
```

**Veya git config’te github.com/Beratmrx geçen yerler:**
```bash
sudo grep -r "Beratmrx/planlamam" /var /home /root 2>/dev/null | head -5
```
(Çıkan satırda path’in başındaki klasör genelde proje köküdür.)

**Yaygın yerler (elle kontrol):**
```bash
ls -la /var/www/
ls -la /home/*/
ls -la /root/
```
İçinde `backend`, `docker-compose.yml`, `package.json` gördüğünüz klasör proje köküdür.

**“root/backend” dediyseniz – /root ve /root/backend kontrol:**
```bash
ls -la /root/
ls -la /root/backend/
```
- **/root/** içinde `backend` klasörü + `docker-compose.yml` + `package.json` varsa → proje kökü **/root** (veya /root/planlamam gibi bir alt klasör).
- **/root/backend/** sadece backend dosyaları (server.js, package.json) ise → o zaman tüm proje oraya atılmamış; proje kökü başka yerde veya yeniden clone etmeniz gerekir. Proje kökünde mutlaka `docker-compose.yml`, `backend/`, `App.tsx` olmalı.

---

## 1. VDS’e SSH ile Bağlanın

```bash
ssh KULLANICI@VDS_IP
```

(Kullanıcı: root veya ubuntu, IP: sunucu IP’niz.)

---

## 2. Eski Projeyi Durdurun

Eski backend’i nasıl çalıştırdığınıza göre birini uygulayın.

**PM2 ile çalışıyorsa:**
```bash
pm2 list
pm2 stop all
# veya sadece planla/backend için:
# pm2 stop planla-backend
```

**Manuel `node` veya `npm start` ile çalışıyorsa:**  
O terminalde Ctrl+C ile durdurun; veya process’i bulup öldürün:
```bash
ps aux | grep node
kill PID_NUMARASI
```

**Eski bir screen/tmux oturumunda çalışıyorsa:**  
O oturuma girip process’i durdurun.

---

## 3. Proje Klasörüne Gidin ve Kodu Güncelleyin

Projenin VDS’te nerede olduğunu biliyorsanız (örn. `/var/www/planlamam` veya `/home/ubuntu/planlamam`):

```bash
cd /var/www/planlamam
# veya
# cd /home/ubuntu/planlamam
```

Sonra GitHub’daki son hali çekin (Docker dosyaları dahil):

```bash
git fetch origin
git pull origin main
```

(Branch adınız `master` ise: `git pull origin master`)

---

## 4. Docker Kurulu mu Kontrol Edin

```bash
docker --version
docker-compose --version
```

Yoksa (Ubuntu/Debian):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Sonra **oturumu kapatıp tekrar girin** (örn. `exit` → tekrar `ssh`).

---

## 5. Production İçin `.env` Dosyası

Proje **kök dizininde** (backend’in bir üstünde) `.env` olmalı. `docker-compose.prod.yml` bu dosyayı kullanır.

```bash
cd /var/www/planlamam
nano .env
```

Örnek içerik (şifreleri kendinize göre değiştirin):

```env
# MySQL
MYSQL_ROOT_PASSWORD=guclu_root_sifre
MYSQL_DATABASE=planla
MYSQL_USER=planla_user
MYSQL_PASSWORD=planla_sifre

# Netlify frontend adresiniz (CORS için)
CORS_ORIGIN=https://planlamam.netlify.app
```

Kaydet: **Ctrl+O**, Enter, **Ctrl+X**.

Netlify adresiniz farklıysa `CORS_ORIGIN`’i ona göre yazın.

---

## 6. Docker ile Çalıştırın

VDS’te build sırasında DNS hatası alıyorsanız (**"Temporary failure resolving 'deb.debian.org'"**) önce backend imajını **host ağıyla** elle build edin, sonra compose ile çalıştırın.

**Adım 1 – Backend imajını host ağıyla build edin (DNS hatasını önler):**

```bash
cd /root/planla
docker build --network=host -f backend/Dockerfile -t planla-backend:latest ./backend
```

Bu komut birkaç dakika sürebilir. Bittikten sonra:

**Adım 2 – MySQL ve backend’i çalıştırın:**

```bash
docker compose -f docker-compose.prod.yml up -d mysql backend
```

(Bu komut **yeniden build yapmaz**, önceki adımda oluşturduğunuz `planla-backend:latest` imajını kullanır.)

---

**DNS sorunu yoksa** aynı proje kök dizininde:

```bash
docker compose -f docker-compose.prod.yml up -d mysql backend
```

Bu komut:

- MySQL container’ı ayağa kaldırır
- Backend’i Docker içinde build edip çalıştırır
- İlk çalıştırmada image build birkaç dakika sürebilir

---

## 7. Çalıştığını Kontrol Edin

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f backend
```

- `planla-backend` ve `planla-mysql` **Up** görünmeli.
- Backend loglarında `Backend server çalışıyor: http://localhost:3002` benzeri bir satır görmelisiniz.

Tarayıcıdan: `http://VDS_IP:3002/api/whatsapp/status` açın; JSON cevap gelmeli.

---

## 8. GitHub Actions ile Otomatik Güncelleme (Opsiyonel)

Backend’i her push’ta VDS’te otomatik güncellemek için GitHub repo’da:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret** ile ekleyin:

| Secret adı          | Değer                          |
|---------------------|---------------------------------|
| `VDS_HOST`          | VDS IP adresi                   |
| `VDS_USER`          | SSH kullanıcı adı (root/ubuntu) |
| `VDS_SSH_KEY`       | SSH private key (tam metni)     |
| `VDS_PROJECT_PATH`  | Proje yolu (örn. `/var/www/planlamam`) |

Bundan sonra `main` branch’e push ettiğinizde (özellikle `backend/` veya `docker-compose.prod.yml` değişince) GitHub Actions VDS’e bağlanıp `git pull` + `docker-compose ... up -d --build backend` çalıştırır.

---

## Özet

| Adım | Komut / İşlem |
|------|-------------------------------|
| 1 | SSH ile VDS’e bağlan |
| 2 | Eski backend’i durdur (pm2 stop / kill) |
| 3 | `cd PROJE_DIZINI` → `git pull origin main` |
| 4 | Docker kurulu değilse kur |
| 5 | Proje kökünde `.env` oluştur (MySQL + CORS_ORIGIN) |
| 6 | `docker-compose -f docker-compose.prod.yml up -d` |
| 7 | `docker-compose ... ps` ve `logs backend` ile kontrol et |

Repo adresi: **https://github.com/Beratmrx/planlamam.git** — VDS’te bu reponun clone’u zaten varsa sadece `git pull` + `.env` + `docker-compose` yeterli.
