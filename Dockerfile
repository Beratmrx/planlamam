# Multi-stage build: Build stage
FROM node:22-slim AS builder

# Build sırasında frontend'in /api kullanması için (Nginx reverse proxy)
ARG VITE_BACKEND_URL=http://backend:3002
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

WORKDIR /app

# Frontend bağımlılıklarını yükle
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Frontend dosyalarını kopyala ve build et
COPY . .
RUN npm run build

# Production stage: Nginx ile serve et
FROM nginx:alpine

# Build edilmiş dosyaları kopyala
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx config (SPA için)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /api { \
        proxy_pass http://backend:3002; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_set_header X-Real-IP $remote_addr; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
        proxy_set_header X-Forwarded-Proto $scheme; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
