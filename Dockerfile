FROM node:20-alpine AS base

RUN apk add --no-cache chromium postgresql-client
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app

FROM base AS deps

COPY package*.json ./
RUN npm ci

FROM deps AS builder

COPY . .
RUN npm run build

FROM base AS runtime

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/docker ./docker
COPY --from=builder /app/knexfile.js ./knexfile.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/src/db/migrations ./src/db/migrations

RUN chmod +x docker/entrypoint.sh

ENTRYPOINT ["./docker/entrypoint.sh"]
CMD ["sh", "-c", "npm run migrate && node dist/index.js"]
