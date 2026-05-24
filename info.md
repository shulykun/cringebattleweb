# Схема запуска CringeBattle Web

## Архитектура

```
Пользователь
    │
    ▼
https://64.188.62.166:3443  (nginx, self-signed SSL)
    │
    ├── /api/*    ──►  Backend (cringebattle22) :4998
    │                  Flask, MySQL, DeepSeek AI
    │
    ├── /ws       ──►  Frontend dev server :3003 (WebSocket HMR)
    │
    └── /*        ──►  Frontend dev server :3003 (React)
```

## Компоненты

### 1. Nginx (порт 3443, SSL)
- **Конфиг:** `/etc/nginx/sites-available/cringebattle-ssl`
- **Сертификат:** self-signed (`/etc/ssl/certs/cringebattle.crt`)
- Маршрутизация:
  - `/api/*` → backend :4998
  - `/ws` → frontend :3003 (WebSocket для hot reload)
  - `/*` → frontend :3003

### 2. Backend — cringebattle22 (порт 4998)
- **Репозиторий:** `/root/.openclaw/workspace/projects/cringebattle22/`
- **Запуск:** `cd /root/.openclaw/workspace/projects/cringebattle22 && python3 app.py`
- **БД:** MySQL на `62.113.96.121:3307` (vstoch2s_cb22)
- **Ручки:**
  - `POST /api/auth/yandex` — авторизация через Яндекс OAuth
  - `POST /api/auth/pseudo-login` — гостевой вход по нику
  - `GET /api/auth/user` — информация о пользователе
  - `POST /api/score` — получить/обновить счёт
  - `POST /api/message` — отправить сообщение/ответ
  - `POST /api/duel2/create` — создать комнату (только Яндекс)
  - `POST /api/duel2/accept` — войти по коду (гости могут)
  - `POST /api/duel2/start` — начать игру (создатель)
  - `POST /api/duel2/answer` — ответить на вопрос
  - `POST /api/duel2/next` — следующий раунд
  - `POST /api/duel2/finish` — завершить игру
  - `POST /api/duel2/message` — сообщение в чат
  - `GET /api/duel2/status/<room_id>` — статус комнаты (polling)
  - `GET /api/health` — health check
  - ~~`POST /api/duel/create`~~ — удалено (v1)
  - ~~`POST /api/duel/accept`~~ — удалено (v1)
  - ~~`POST /api/duel/answer`~~ — удалено (v1)
  - ~~`GET /api/duel/status/<id>`~~ — удалено (v1)
- **Оценка ответов:** DeepSeek API (`api.deepseek.com`) через `logic/referee.py` → `service/llmds.py`
- **Яндекс OAuth:**
  - Client ID: `99cba34d48204d18a6f5ed537ba0f693`
  - Client Secret: `9f79c9aeb5d64ca887f8098afd563c9c`
  - Redirect URI: `https://64.188.62.166:3443/login`

### 3. Frontend — Cringebattleweb (порт 3003)
- **Репозиторий:** `/root/.openclaw/workspace/projects/Cringebattleweb/frontend/`
- **Запуск:** `cd frontend && PORT=3003 npm start`
- **Стек:** React (Create React App), React Router
- **API:** относительный путь `/api` (проксируется nginx)
- **Авторизация:** фронтенд сохраняет в localStorage:
  - `userId` — chat_id из прод-базы (для duel2)
  - `yandexId` — yandex_id (для проверки isYandexUser)
  - `username`, `email`
- **Внешние зависимости (хардкод):**
  - `https://cringebattle22.roborumba.com/` — сервер с игровыми картинками

### 4. Duel v1 — удалён
- Эндпоинты `/api/duel/*` и `service/duel_api.py` удалены из бэкенда (ветка `cleanup-remove-duel-v1`)
- Фронтенд может ещё содержать старые вызовы в `api.js` — при необходимости выпилить

### 5. Картинки — внешний сервер
- **URL:** `https://cringebattle22.roborumba.com/`
- **Источник:** `frontend/src/pages/GamePage.js`, строка 149
- Находится на отдельном хосте `cringebattle22.roborumba.com` — не на этой VM

### 6. База данных MySQL
- **Хост:** `62.113.96.121:3307`
- **БД:** `vstoch2s_cb22`
- Внешняя — не на этой VM

## Авторизация

- **Создание дуэли** — только через Яндекс OAuth (проверяется `isYandexUser`)
- **Вход по коду** — гости могут под любым ником (создаётся `web_*` chat_id)
- **Псевдологин** — `/api/auth/pseudo-login` для быстрого входа без OAuth

## Команды запуска

```bash
# Backend
cd /root/.openclaw/workspace/projects/cringebattle22
nohup python3 app.py > /tmp/cringe22.log 2>&1 &

# Frontend
cd /root/.openclaw/workspace/projects/Cringebattleweb/frontend
PORT=3003 nohup npm start > /tmp/frontend.log 2>&1 &

# Nginx (обычно уже работает)
/usr/sbin/nginx -t && /usr/sbin/nginx -s reload
```

## Проверка

```bash
curl -sk https://64.188.62.166:3443/api/health        # → {"status":"ok"}
curl -s http://localhost:4998/api/health                # → {"status":"ok"}
curl -s http://localhost:3003/ -o /dev/null -w "%{http_code}"  # → 200
```

## Логи

- Backend: `/tmp/cringe22.log`
- Frontend: `/tmp/frontend.log`
- Nginx: `/var/log/nginx/error.log`, `/var/log/nginx/access.log`

## Также на сервере

- `https://64.188.62.166/hook` — Telegram webhook (roborumba бот)
- `https://64.188.62.166/hook_mitasu` — второй webhook
- Порты 80/443 (основной nginx на `64.188.62.166`) заняты под Telegram hooks

## Сводка внешних зависимостей фронтенда

| Зависимость | Адрес | Что даёт |
|---|---|---|
| Backend API | `localhost:4998` | Вся логика: авторизация, игра, чат |
| Картинки | `cringebattle22.roborumba.com` | Изображения для игры |
| MySQL | `62.113.96.121:3307` | База данных (пользователи, игры, вопросы) |
| DeepSeek AI | `api.deepseek.com` | Оценка ответов (через backend) |
| Яндекс OAuth | `oauth.yandex.ru` | Аутентификация |
| Frontend dev | `localhost:3003` | React dev-сервер (проксируется nginx) |
