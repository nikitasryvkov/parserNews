FROM node:20-alpine

# Chromium (Puppeteer) + psql для entrypoint (создание БД при старте)
RUN apk add --no-cache chromium postgresql-client
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --production

RUN chmod +x docker/entrypoint.sh

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
