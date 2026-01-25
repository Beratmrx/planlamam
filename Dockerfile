FROM node:22-slim

RUN apt-get update && apt-get install -y \
  chromium \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/. .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
EXPOSE 3001

CMD ["npm","start"]

