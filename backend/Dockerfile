FROM node:22-slim

# Sadece temel sistem paketleri
RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Package dosyalarını kopyala ve bağımlılıkları yükle
COPY package*.json ./
RUN npm install --no-audit --no-fund

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
