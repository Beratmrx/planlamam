# GitHub'a Yükleme Rehberi

Bu rehber, projenizi GitHub'a nasıl yükleyeceğinizi adım adım açıklar.

## 1. GitHub Repository Oluşturma

### Web Üzerinden:
1. [GitHub](https://github.com) hesabınıza giriş yapın
2. Sağ üst köşedeki **+** butonuna tıklayın
3. **New repository** seçin
4. Repository bilgilerini girin:
   - **Repository name**: `planla-app` (veya istediğiniz isim)
   - **Description**: "WhatsApp entegrasyonlu AI destekli görev yöneticisi"
   - **Public** veya **Private** seçin
   - **Initialize this repository** seçeneklerini **BOŞTA** bırakın
5. **Create repository** tıklayın

## 2. Lokal Projeyi GitHub'a Bağlama

Proje dizininizde PowerShell veya Git Bash açın:

```bash
cd "c:\Users\fatih\OneDrive\Desktop\yapılacaklar - Kopya (3)"
```

### Git Başlatma (eğer henüz başlatılmadıysa):
```bash
git init
```

### Dosyaları Stage'e Ekleme:
```bash
git add .
```

### İlk Commit:
```bash
git commit -m "Initial commit: Planla app with WhatsApp integration"
```

### GitHub Repository'yi Remote Olarak Ekleme:
```bash
# KULLANICI_ADINIZ ve REPO_ADINIZ'ı kendi bilgilerinizle değiştirin
git remote add origin https://github.com/KULLANICI_ADINIZ/REPO_ADINIZ.git
```

### Main Branch'e Push:
```bash
git branch -M main
git push -u origin main
```

## 3. GitHub Personal Access Token (Gerekirse)

Eğer şifre istenirse, GitHub artık şifre yerine Personal Access Token kullanıyor:

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. **Generate new token** → **Generate new token (classic)**
3. Token adı: `Planla App Deployment`
4. Scope: `repo` seçeneğini işaretleyin
5. **Generate token** tıklayın
6. Token'ı kopyalayın (bir daha gösterilmeyecek!)
7. Git push yaparken şifre yerine bu token'ı kullanın

## 4. .gitignore Kontrolü

Hassas bilgilerin GitHub'a yüklenmediğinden emin olun:

```bash
# .gitignore dosyasını kontrol edin
cat .gitignore
```

Şu dosyaların ignore edildiğinden emin olun:
- `.env`
- `.env.local`
- `backend/.env`
- `.wwebjs_auth/`
- `node_modules/`
- `storage.json`

## 5. Güncelleme Workflow'u

Değişikliklerinizi GitHub'a göndermek için:

```bash
# Değişiklikleri stage'e ekle
git add .

# Commit oluştur
git commit -m "Açıklayıcı commit mesajı"

# GitHub'a push et
git push origin main
```

## 6. GitHub Actions (Opsiyonel - Otomatik Deployment)

VDS'e otomatik deployment için GitHub Actions kullanabilirsiniz. Ancak bu manuel deployment'tan daha karmaşıktır ve SSH key yapılandırması gerektirir.

Şimdilik manuel deployment önerilir. İhtiyaç duyarsanız GitHub Actions workflow'u eklenebilir.

## Sonraki Adımlar

GitHub'a yükledikten sonra:
1. ✅ Netlify'da repository'yi bağlayın
2. ✅ VDS'te `git clone` ile projeyi indirin
3. ✅ [DEPLOYMENT.md](DEPLOYMENT.md) rehberini takip edin
