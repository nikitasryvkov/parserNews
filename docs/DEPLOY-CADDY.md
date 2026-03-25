# Развёртывание ParserNews на сервере с Caddy

Инструкция для **VPS с Linux** (Debian/Ubuntu). Предполагается домен вида **`parser.drivebro.ru`** и установка через **Docker Compose**. Веб-сервер — **Caddy** (автоматический HTTPS, простой конфиг).

---

## Содержание

1. [Что понадобится](#1-что-понадобится)
2. [Подготовка сервера](#2-подготовка-сервера)
3. [DNS](#3-dns)
4. [Клонирование и настройка проекта](#4-клонирование-и-настройка-проекта)
5. [Запуск Docker Compose](#5-запуск-docker-compose)
6. [Установка и настройка Caddy](#6-установка-и-настройка-caddy)
7. [Проверка и firewall](#7-проверка-и-firewall)
8. [Безопасность (API ключ)](#8-безопасность-api-ключ)
9. [Обновление приложения](#9-обновление-приложения)
10. [Резервное копирование](#10-резервное-копирование)
11. [Устранение неполадок](#11-устранение-неполадок)

Подробно про **фоновый запуск, автозапуск после перезагрузки, PM2 и systemd** — см. **[RUN-AUTONOMOUS.md](./RUN-AUTONOMOUS.md)**.

---

## 1. Что понадобится

- VPS с **публичным IPv4** (или IPv6, если DNS и Caddy настроены под него).
- **Ubuntu 22.04/24.04** или **Debian 12** (другие дистрибутивы — по аналогии).
- Доменное имя (**`parser.drivebro.ru`**) с правом на запись DNS-записей.
- SSH-доступ с вашей машины.
- На сервере: **Docker Engine** + **Docker Compose plugin** (v2).

Стек приложения: **Node.js** (внутри образа), **PostgreSQL**, **Redis**, **BullMQ**, статика и API.

**Версия Node.js:** проект рассчитан на **Node.js 20.18.1+** (см. `engines` в `package.json`). Запуск без Docker на **Node 18** не поддерживается: зависимость **cheerio** использует **undici 7**, которому нужен глобальный `File` (есть в Node 20+). Обновите Node через [NodeSource](https://github.com/nodesource/distributions), [nvm](https://github.com/nvm-sh/nvm) или пакеты дистрибутива.

---

## 2. Подготовка сервера

### 2.1. Обновление и базовые пакеты

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates
```

### 2.2. Установка Docker

Официальная инструкция: [https://docs.docker.com/engine/install/ubuntu/](https://docs.docker.com/engine/install/ubuntu/) (для Debian — аналогичный раздел).

Кратко:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Проверка:

```bash
docker --version
docker compose version
```

Добавьте пользователя в группу `docker` (чтобы не писать `sudo` каждый раз):

```bash
sudo usermod -aG docker "$USER"
# Выйдите из SSH и зайдите снова, либо: newgrp docker
```

---

## 3. DNS

В панели регистратора домена **`drivebro.ru`** создайте запись:

| Тип | Имя (host) | Значение |
|-----|------------|----------|
| **A** | `parser` | **IP вашего VPS** |

TTL можно оставить по умолчанию. Подождите 5–30 минут и проверьте:

```bash
dig +short parser.drivebro.ru
# должен вернуть IP сервера
```

---

## 4. Клонирование и настройка проекта

```bash
cd /opt
sudo git clone https://github.com/YOUR_ORG/ParserNews.git parser-news
sudo chown -R "$USER:$USER" parser-news
cd parser-news
```

(Замените URL на ваш репозиторий.)

### 4.1. Пароли и переменные окружения

Сервис **`app`** подключает файл **`env_file: .env`**. Создайте его **до** первого запуска:

```bash
cp .env.example .env
nano .env
```

Заполните минимум:

- **`DB_PASSWORD`** — длинный случайный пароль (один и тот же пароль используется и приложением, и контейнером `postgres` через подстановку `${DB_PASSWORD:-postgres}` в `docker-compose.yml`).
- При желании **`API_KEY`** — тогда все запросы к `/api/*` потребуют заголовок `Authorization: Bearer …`.
- **`LOG_LEVEL`**, **`REDIS_PASSWORD`** — по необходимости (см. `.env.example`).

Переменные из `.env` попадают в контейнер приложения; для БД и Redis внутри Compose хосты заданы в `docker-compose.yml` (`DB_HOST=postgres`, `REDIS_HOST=redis`).

### 4.2. Что уже настроено в репозитории

- Сервис **`app`** слушает порт **3000** только на **127.0.0.1** хоста — снаружи доступ идёт через **Caddy**, прямой доступ к Node из интернета не нужен.
- Том **`app_data`** смонтирован в **`/app/data`** — загрузки, raw-кэш, история ВПО сохраняются при пересоздании контейнера.

---

## 5. Запуск Docker Compose

Из каталога проекта:

```bash
docker compose build
docker compose up -d
```

Проверка:

```bash
docker compose ps
docker compose logs -f app
```

Приложение должно подняться, в логах — миграции Knex и строка про прослушивание API.

Проверка локально на сервере (без домена):

```bash
curl -sS http://127.0.0.1:3000/api/health
```

Ожидается JSON со статусом (и проверкой Redis, если настроено).

---

## 6. Установка и настройка Caddy

### 6.1. Установка Caddy

Рекомендуется официальный репозиторий: [https://caddyserver.com/docs/install](https://caddyserver.com/docs/install)

Для Ubuntu/Debian:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 6.2. Конфигурация

Скопируйте пример из репозитория:

```bash
sudo cp /opt/parser-news/deploy/caddy/Caddyfile.example /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Убедитесь, что имя сайта — **`parser.drivebro.ru`** (или ваш домен). Блок `reverse_proxy 127.0.0.1:3000` должен совпадать с портом приложения.

Проверка синтаксиса и перезапуск:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
# или: sudo systemctl restart caddy
sudo systemctl status caddy
```

Caddy сам получит сертификат **Let’s Encrypt** при первом запросе по HTTPS, если DNS уже указывает на сервер и порты **80** и **443** открыты.

---

## 7. Проверка и firewall

### 7.1. UFW (если включён)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Порт **3000** наружу не открывайте — приложение доступно только по localhost.

### 7.2. Проверка в браузере

Откройте **`https://parser.drivebro.ru`**. Должен открыться интерфейс приложения.

---

## 8. Безопасность (API ключ)

В `.env` на сервере задайте:

```env
API_KEY=длинная_случайная_строка
```

Перезапустите приложение:

```bash
cd /opt/parser-news
docker compose up -d
```

Значение передаётся в контейнер через `docker-compose.yml`. Клиенты и скрипты должны отправлять заголовок:

```http
Authorization: Bearer <ваш_API_KEY>
```

для всех запросов к `/api/*` (если `API_KEY` пустой — доступ к API без ключа, удобно только для локальной разработки).

---

## 9. Обновление приложения

```bash
cd /opt/parser-news
git pull
docker compose build
docker compose up -d
```

Миграции выполняются при старте контейнера (`npm run migrate` в `Dockerfile`). Если добавились новые миграции, убедитесь по логам, что они прошли без ошибок:

```bash
docker compose logs app
```

---

## 10. Резервное копирование

- **База данных PostgreSQL**: том **`postgres_data`**. Делайте дампы:

  ```bash
  docker compose exec postgres pg_dump -U postgres parser_news > backup-$(date +%F).sql
  ```

- **Файлы приложения**: том **`app_data`** (каталог `data` внутри контейнера). При необходимости бэкапьте volume или содержимое через `docker run --rm -v parser-news_app_data:/data ...`.

---

## 11. Устранение неполадок

### «Страница недоступна» / не открывается в браузере

Выполните на **сервере по SSH** по порядку:

1. **Статус Docker и приложения**

   ```bash
   cd /opt/parser-news   # или ваш каталог
   docker compose ps
   docker compose logs --tail=80 app
   ```

   У контейнера `app` должно быть `Up`. В логах — строка `API listening` (и без ошибок после неё).

2. **Ответ приложения на localhost (без Caddy)**

   ```bash
   curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
   curl -sS http://127.0.0.1:3000/api/health
   ```

   Если здесь **ошибка соединения** — приложение не слушает порт 3000 (контейнер перезапускается или не запустился). Смотрите логи: `docker compose logs app`. Убедитесь, что есть файл **`cp .env.example .env`** и задан **`DB_PASSWORD`**.

3. **Caddy**

   ```bash
   sudo systemctl status caddy
   sudo caddy validate --config /etc/caddy/Caddyfile
   journalctl -u caddy -n 40 --no-pager
   ```

   В `Caddyfile` в `reverse_proxy` должен быть **`127.0.0.1:3000`** (как в пробросе порта в `docker-compose`).

4. **DNS**

   С вашего ПК: `ping parser.drivebro.ru` — IP должен совпадать с публичным IP VPS.

5. **Firewall на сервере**

   ```bash
   sudo ufw status
   ```

   Должны быть разрешены **80/tcp** и **443/tcp** (и **22** для SSH).

6. **Типичный ответ Caddy**

   - **502 Bad Gateway** — Caddy не достучался до `127.0.0.1:3000`: приложение не запущено или не слушает порт (см. п. 1–2).
   - **Таймаут / «не удаётся подключиться»** — чаще DNS, firewall или Caddy не запущен.

После обновления образа приложения пересоберите и перезапустите:

```bash
docker compose build --no-cache app
docker compose up -d
```

| Симптом | Что проверить |
|--------|----------------|
| **502 Bad Gateway** | `docker compose ps`, логи `app`: `docker compose logs app`. Убедитесь, что `curl http://127.0.0.1:3000/api/health` отвечает. |
| **Нет HTTPS / ошибка сертификата** | DNS `parser.drivebro.ru` → IP сервера; порты 80/443 не блокируются; firewall. |
| **База не подключается** | Совпадение `DB_PASSWORD` и `POSTGRES_PASSWORD`; сервис `postgres` в статусе `running`. |
| **Очередь не работает** | Redis: `docker compose logs redis`; переменные `REDIS_HOST=redis` внутри сети Compose. |
| **`database "parser_news" does not exist`** | Том PostgreSQL создан **раньше**, чем в `docker-compose` появился `POSTGRES_DB`, или БД не создалась. Создайте вручную: `docker compose exec postgres psql -U postgres -c "CREATE DATABASE parser_news;"` (пароль из `DB_PASSWORD`). Либо **с нуля** (удалит данные БД): `docker compose down -v` и снова `up -d`. |
| **`ReferenceError: File is not defined`** (undici) | Установлен **Node.js 18** или ниже. Нужен **Node 20.18.1+**: `node -v`, затем обновление Node (nvm / NodeSource / пакет ОС). |

---

## Краткий чеклист

1. DNS **A** для `parser.drivebro.ru` → IP VPS  
2. Docker + `docker compose up -d` в каталоге проекта  
3. Сильные пароли БД, при необходимости `API_KEY`  
4. Caddy с `reverse_proxy` на `127.0.0.1:3000`  
5. Firewall: только **22** (SSH), **80**, **443**  

Готово: приложение доступно по **`https://parser.drivebro.ru`**.
