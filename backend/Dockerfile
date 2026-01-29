FROM node:22-slim

# Chromium'un çalışması için gerekli runtime kütüphaneleri yükle
# (Puppeteer kendi Chromium'unu indirecek, bu yüzden sadece runtime deps gerekli)
RUN apt-get update && apt-get install -y \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Package dosyalarını kopyala ve bağımlılıkları yükle
# Önce tüm bağımlılıkları yükle (Puppeteer Chromium'u indirmek için)
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Production bağımlılıklarını temizle (devDependencies hariç)
RUN npm prune --production

# Uygulama dosyalarını kopyala
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Port'u expose et
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/api/whatsapp/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Uygulamayı başlat
CMD ["node", "server.js"]
