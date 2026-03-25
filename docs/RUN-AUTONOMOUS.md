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

### Автозапуск при включении сервера (systemd) — подробно

**Зачем:** команда `docker compose up -d` в SSH сама по себе **не привязана** к автозагрузке ОС. После **перезагрузки VPS** контейнеры могут не подняться, если их никто не запустил. Юнит **systemd** один раз настраивается и дальше:

- стек поднимается **при старте сервера**;
- **не зависит от SSH** — можно закрыть ноутбук;
- управляется как обычный сервис: `start` / `stop` / `status`.

**Предварительно:** проект уже лежит на сервере (например `/opt/parser-news`), есть `.env`, один раз вы уже успешно выполнили `docker compose up -d` и проверили сайт.

#### Шаг 1. Путь к проекту и к `docker compose`

Убедитесь в каталоге проекта:

```bash
cd /opt/parser-news
docker compose ps
```

Проверьте, где лежит бинарник (для unit-файла):

```bash
command -v docker
# Обычно ExecStart использует:
#   /usr/bin/docker compose up -d
# Если у вас только старый docker-compose:
#   /usr/local/bin/docker-compose up -d
```

В примере ниже используется **`docker compose`** (плагин v2).

#### Шаг 2. Скопировать и отредактировать unit-файл

```bash
sudo cp /opt/parser-news/deploy/systemd/parser-news-docker.service.example /etc/systemd/system/parser-news.service
sudo nano /etc/systemd/system/parser-news.service
```

Обязательно проверьте строку **`WorkingDirectory=`** — она должна указывать на каталог, где лежат **`docker-compose.yml`** и **`.env`**. Если проект в другом месте (например `/home/deploy/parser-news`), замените путь.

Строки **`ExecStart`** / **`ExecStop`** должны вызывать тот же `docker`, что работает у вас из консоли.

#### Шаг 3. Подключить unit в systemd

```bash
sudo systemctl daemon-reload
sudo systemctl enable parser-news.service
sudo systemctl start parser-news.service
```

- **`enable`** — запускать при загрузке системы.
- **`start`** — поднять стек сейчас.

#### Шаг 4. Проверка

```bash
sudo systemctl status parser-news
docker compose -f /opt/parser-news/docker-compose.yml ps
```

Логи юнита:

```bash
journalctl -u parser-news -n 50 --no-pager
journalctl -u parser-news -f
```

#### Что означают части unit-файла (кратко)

| Директива | Смысл |
|-----------|--------|
| `After=docker.service` | Запуск **после** Docker, иначе `compose up` может упасть. |
| `Requires=docker.service` | Если Docker не стартовал, юнит не помечается успешным. |
| `Type=oneshot` + `RemainAfterExit=yes` | Команда `compose up -d` быстро завершается; systemd считает сервис «активным» до `stop`. |
| `ExecStop=... compose stop` | При `systemctl stop parser-news` или выключении сервера — корректная остановка контейнеров (тома **не** удаляются). |

#### Обычные операции после настройки

- **Обновить код и пересобрать** (как раньше, из каталога проекта):

  ```bash
  cd /opt/parser-news
  git pull
  docker compose build
  docker compose up -d
  ```

  Юнит при этом **не обязательно** перезапускать — вы сами обновили контейнеры.

- **Перезапустить только через systemd:**

  ```bash
  sudo systemctl restart parser-news
  ```

- **Временно остановить стек:**

  ```bash
  sudo systemctl stop parser-news
  ```

#### Caddy

Caddy на хосте обычно оформлен отдельным юнитом (`caddy.service`). Он поднимает **80/443** и проксирует на `127.0.0.1:3000`. Имеет смысл включить автозапуск Caddy:

```bash
sudo systemctl enable --now caddy
```

Порядок: сначала Docker и ваш стек, Caddy может стартовать раньше или позже приложения — при первом запросе бэкенд уже должен слушать порт (или будет 502 до готовности контейнера).

#### Если что-то не работает

- `failed` у `parser-news`: смотрите `journalctl -u parser-news -b`.
- **Неверный путь** в `WorkingDirectory` — `compose` не находит файл.
- **Нет прав** у пользователя, от которого запускается unit (по умолчанию **root** — обычно достаточно для Docker).
- Старый синтаксис: замените `ExecStart` на полный путь к `docker-compose`, если плагин `docker compose` не установлен.

#### Про cron `@reboot`

Запись в crontab вроде `@reboot cd /opt/parser-news && docker compose up -d` **может** сработать, но **хуже**, чем systemd: нет зависимости от `docker.service`, сложнее смотреть логи и статус. **Рекомендуется systemd**, как выше.

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
