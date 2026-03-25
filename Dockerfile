FROM node:20-alpine

# Chromium через apk — быстрее, чем скачивание через Puppeteer (~300 MB)
RUN apk add --no-cache chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
