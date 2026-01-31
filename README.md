<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Planla - Akıllı Görev Yöneticisi

WhatsApp entegrasyonlu, AI destekli görev yönetim uygulaması.

## 🚀 Özellikler

- 📱 WhatsApp entegrasyonu ile görev bildirimleri
- 🤖 Google Gemini AI ile akıllı görev önerileri
- 📊 Görev önceliklendirme ve kategorizasyon
- 🔔 Otomatik hatırlatmalar
- 💾 JSON veya MySQL veritabanı desteği

## 🌐 Canlı Demo

- **Frontend**: [https://etkegym.com](https://etkegym.com)
- **Backend API**: [https://api.nexayazilim.com](https://api.nexayazilim.com)

## 📦 Kurulum

### Lokal Geliştirme

**Gereksinimler:** Node.js 22+

1. Bağımlılıkları yükleyin:
   ```bash
   npm install
   cd backend && npm install
   ```

2. Environment variables ayarlayın:
   - Frontend: `.env.local` dosyasında `GEMINI_API_KEY` ayarlayın
   - Backend: `backend/.env` dosyasını düzenleyin

3. Uygulamayı çalıştırın:
   ```bash
   # Frontend
   npm run dev
   
   # Backend (ayrı terminal)
   cd backend
   npm start
   ```

### Docker ile Deployment

Detaylı deployment talimatları için [DEPLOYMENT.md](DEPLOYMENT.md) dosyasına bakın.

**Hızlı başlangıç:**
```bash
# Development
docker-compose up --build

# Production (VDS)
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Dokümantasyon

- [DEPLOYMENT.md](DEPLOYMENT.md) - VDS ve Netlify deployment rehberi
- [DOCKER_KURULUM.md](DOCKER_KURULUM.md) - Docker kurulum detayları
- [WHATSAPP_KULLANIM.md](WHATSAPP_KULLANIM.md) - WhatsApp entegrasyonu

## 🛠️ Teknolojiler

- **Frontend**: React 19, Vite, TypeScript
- **Backend**: Node.js, Express, WhatsApp Web.js
- **AI**: Google Gemini API
- **Database**: JSON / MySQL
- **Deployment**: Docker, Netlify

## 📄 Lisans

MIT
