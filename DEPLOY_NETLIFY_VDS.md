# Netlify + VDS Deployment Rehberi (Docker ile)

Projeyi **aynı GitHub repo** üzerinden Netlify (frontend) ve VDS (backend) sunucunuza atmak için adımlar.

---

## 1. GitHub’a Kodunuzu Gönderin

**Aynı repoya** push edeceksiniz. Yeni repo açmanıza gerek yok.

```powershell
cd "C:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"

# Henüz git yoksa:
git init
git add .
git commit -m "Docker ile Netlify + VDS deploy hazır"

# Repo adresinizi kullanın (örnek):
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git branch -M main
git push -u origin main
```

Zaten GitHub’a bağlıysa sadece:

```powershell
git add .
git commit -m "Docker deploy ve CORS düzenlemeleri"
git push origin main
```

---

## 2. Netlify (Frontend) Ayarları

### 2.1 Site Netlify’da Zaten Varsa

1. [Netlify Dashboard](https://app.netlify.com) → Sitenizi seçin  
2. **Site configuration** → **Environment variables**  
3. **Add a variable** veya **Edit**:
   - **Key:** `VITE_BACKEND_URL`  
   - **Value:** Backend adresiniz, örnek:
     - `https://api.sizin-domain.com` (VDS’te domain + reverse proxy kullanıyorsanız)
     - veya `http://VDS_IP_ADRESI:3002` (sadece IP ile erişiyorsanız)  
   - **Scopes:** Build’i etkilemesi için en azından **Build** seçili olsun  

4. **Trigger deploy** → **Deploy site** ile bir kez yeniden build alın.

### 2.2 Yeni Site Bağlıyorsanız

1. Netlify → **Add new site** → **Import an existing project**  
2. **GitHub** seçin, aynı repoyu seçin  
3. Ayarlar:
   - **Branch:** `main` (veya kullandığınız branch)
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **Environment variables** → **Add a variable**:
   - **Key:** `VITE_BACKEND_URL`  
   - **Value:** Backend URL’iniz (yukarıdaki gibi)  
5. **Deploy site** ile ilk deploy’u başlatın.

Push sonrası Netlify otomatik build alır; frontend’i güncellemek için `main`’e push yeterli.

---

## 3. VDS (Backend + Docker) Ayarları

### 3.1 VDS’te İlk Kurulum (Bir Kez)

SSH ile VDS’e bağlanın:

```bash
ssh KULLANICI@VDS_IP
```

Proje klasörü (örnek: `/var/www/planla`):

```bash
sudo mkdir -p /var/www/planla
sudo chown $USER:$USER /var/www/planla
cd /var/www/planla
git clone https://github.com/KULLANICI_ADI/REPO_ADI.git .
```

Docker yüklü değilse (Ubuntu/Debian):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Çıkış yapıp tekrar girin (docker grubu için)
```

### 3.2 Ortam Dosyası (`.env`)

Proje kökünde (VDS’te) `.env` oluşturun:

```bash
cd /var/www/planla
nano .env
```

Örnek içerik (kendi değerlerinizle değiştirin):

```env
# MySQL (docker-compose.prod.yml ile kullanılır)
MYSQL_ROOT_PASSWORD=guclu_sifre_buraya
MYSQL_DATABASE=planla
MYSQL_USER=planla_user
MYSQL_PASSWORD=planla_sifre

# Backend’in hangi frontend’e izin vereceği (Netlify adresiniz)
CORS_ORIGIN=https://sizin-site-adiniz.netlify.app
```

Kaydedin (Ctrl+O, Enter, Ctrl+X).

### 3.3 İlk Kez Backend + MySQL Çalıştırma

```bash
cd /var/www/planla
docker-compose -f docker-compose.prod.yml up -d
```

- MySQL + backend ayağa kalkar.  
- Port **3002** dışarı açıksa backend’e `http://VDS_IP:3002` ile erişilir.

Log kontrolü:

```bash
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 3.4 GitHub Secrets (Otomatik Deploy İçin)

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret** ile ekleyin:

| Secret adı          | Açıklama / örnek                          |
|---------------------|-------------------------------------------|
| `VDS_HOST`          | VDS IP adresi (örn. `123.45.67.89`)       |
| `VDS_USER`          | SSH kullanıcı adı (örn. `root` veya `ubuntu`) |
| `VDS_SSH_KEY`       | SSH private key’in tam metni             |
| `VDS_SSH_PORT`      | (Opsiyonel) SSH port, varsayılan 22       |
| `VDS_PROJECT_PATH`  | Proje yolu (örn. `/var/www/planla`)      |

Sonrasında `main` branch’e push yaptığınızda (özellikle `backend/` veya `docker-compose.prod.yml` değişince) GitHub Actions VDS’e SSH ile bağlanıp:

- `git pull`
- `docker-compose -f docker-compose.prod.yml up -d --build backend`

çalıştırır; backend Docker ile güncellenir.

---

## 4. Özet Akış

| Nerede        | Ne yapılıyor |
|---------------|----------------|
| **GitHub**    | Tüm kod tek repo’da (frontend + backend + Docker). |
| **Netlify**   | Repo’ya bağlı; `main` push → otomatik build, `VITE_BACKEND_URL` ile backend’e istek atar. |
| **VDS**       | Aynı repo clone; `docker-compose.prod.yml` ile backend + MySQL Docker’da çalışır. GitHub Actions ile push sonrası otomatik deploy. |

---

## 5. Kontrol Listesi

- [ ] Kod GitHub’a push edildi (aynı repo).
- [ ] Netlify’da `VITE_BACKEND_URL` = backend URL (https veya http://VDS_IP:3002).
- [ ] VDS’te proje clone, `.env` (MySQL + `CORS_ORIGIN`) yazıldı.
- [ ] VDS’te `docker-compose -f docker-compose.prod.yml up -d` çalıştırıldı.
- [ ] GitHub Secrets (VDS_HOST, VDS_USER, VDS_SSH_KEY, VDS_PROJECT_PATH) eklendi.
- [ ] Firewall’da 3002 (ve gerekiyorsa 22) açık.

Bu adımlardan sonra frontend Netlify’da, backend VDS’te Docker ile sorunsuz çalışır; güncellemek için `main`’e push yeterli.
