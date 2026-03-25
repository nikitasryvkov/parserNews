# Автономный запуск ParserNews на сервере

«Автономно» значит: процесс работает **в фоне**, **переживает выход из SSH**, **поднимается после перезагрузки** VPS и при **падении** контейнера/процесса (где это настроено).

---

## Вариант 1: Docker Compose (рекомендуется)

В `docker-compose.yml` для сервисов задано **`restart: unless-stopped`**: после сбоя Docker перезапустит контейнеры, после ребута — тоже.

### Первый запуск

```bash
cd /opt/parser-news   # каталог с проектом и docker-compose.yml
cp .env.example .env && nano .env
docker compose up -d
```

### Автозапуск при включении сервера

Docker обычно уже включён в автозагрузку. Чтобы гарантированно поднимался **ваш** стек, используйте **systemd**-юнит (пример в репозитории):

```bash
sudo cp /opt/parser-news/deploy/systemd/parser-news-docker.service.example /etc/systemd/system/parser-news.service
sudo nano /etc/systemd/system/parser-news.service
# Проверьте WorkingDirectory= и при необходимости User=

sudo systemctl daemon-reload
sudo systemctl enable parser-news.service
sudo systemctl start parser-news.service
```

Проверка: `sudo systemctl status parser-news`

### Обновление без простоя (по сути)

```bash
cd /opt/parser-news
git pull
docker compose build
docker compose up -d
```

---

## Вариант 2: Node на хосте без Docker (PM2)

Нужны **Node 20.18.1+**, **PostgreSQL** и **Redis** на сервере, файл **`.env`**.

```bash
cd /opt/parser-news
npm ci
npm run migrate
npm run build
```

Установка PM2 глобально:

```bash
sudo npm install -g pm2
```

Запуск приложения:

```bash
cd /opt/parser-news
pm2 start npm --name parser-news -- start
pm2 save
pm2 startup
# Выполните команду, которую выведет pm2 startup (скопировать sudo ...)
```

Полезно: `pm2 logs parser-news`, `pm2 restart parser-news`.

---

## Вариант 3: systemd + `node dist/index.js` (без PM2)

Юнит (пример, пути поправьте):

```ini
[Unit]
Description=ParserNews API
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/parser-news
EnvironmentFile=/opt/parser-news/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Сборка должна быть выполнена заранее (`npm run build`). Пользователь `User=` должен иметь права на каталог и `data/`.

---

## Что не делать в продакшене

- Долго держать **`npm run dev`** в открытой SSH-сессии — процесс умрёт при обрыве связи (если не через tmux/screen и без менеджера процессов).
- Запускать без **`restart`** / **PM2** / **systemd** — после ребута сервис не поднимется сам.

---

## Связка с Caddy

Caddy на хосте проксирует на **`127.0.0.1:3000`**. Пока работает контейнер `app` или PM2 с `npm start`, сайт доступен. Убедитесь, что **`systemctl enable caddy`** выполнен, если Caddy ставили через пакетный менеджер.
