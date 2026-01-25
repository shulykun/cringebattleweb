# Требования к Backend API для авторизации через Яндекс OAuth

## Обзор

Backend должен обрабатывать авторизацию пользователей через Яндекс OAuth и предоставлять уникальный `user_id` для каждого пользователя.

## API Endpoints

### 1. POST /api/auth/yandex

**Описание:** Авторизация пользователя через Яндекс OAuth. Backend должен обработать обмен authorization code на access_token и авторизацию пользователя.

**Запрос:**
```json
{
  "code": "authorization_code_from_yandex"
}
```

**Альтернативный вариант (если frontend уже получил token):**
```json
{
  "access_token": "yandex_oauth_access_token"
}
```

**Логика обработки:**
1. Если передан `code`:
   - Обменять `code` на `access_token` через Яндекс API (POST https://oauth.yandex.ru/token)
   - Использовать полученный `access_token` для дальнейшей авторизации
2. Если передан `access_token`:
   - Использовать его напрямую для авторизации

**Успешный ответ (200):**
```json
{
  "success": true,
  "user_id": "unique_user_id",
  "yandex_id": "yandex_user_id",
  "username": "Имя пользователя из Яндекс",
  "email": "user@example.com"
}
```

**Ошибка (400/401):**
```json
{
  "success": false,
  "error": "Invalid token" | "Token expired" | "Yandex API error"
}
```

**Логика:**
1. Если передан `code` - обменять на `access_token` через Яндекс API
2. Проверить `access_token` через Яндекс API (GET https://login.yandex.ru/info)
3. Получить информацию о пользователе (id, имя, email)
4. Проверить, существует ли пользователь с таким `yandex_id` в базе
5. Если не существует - создать нового пользователя с уникальным `user_id` (UUID)
6. Если существует - вернуть существующий `user_id`
7. Вернуть `user_id` и информацию о пользователе

**Обмен code на token:**
```
POST https://oauth.yandex.ru/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={code}&
client_id={YANDEX_CLIENT_ID}&
client_secret={YANDEX_CLIENT_SECRET}
```

### 2. GET /api/auth/user

**Описание:** Получить информацию о пользователе по user_id

**Запрос:**
```
GET /api/auth/user?user_id=unique_user_id
```

**Успешный ответ (200):**
```json
{
  "success": true,
  "user": {
    "user_id": "unique_user_id",
    "yandex_id": "yandex_user_id",
    "username": "Имя пользователя",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Ошибка (404):**
```json
{
  "success": false,
  "error": "User not found"
}
```

### 3. POST /api/score

**Описание:** Прокси для получения статистики игрока (существующий endpoint)

**Запрос:**
```json
{
  "user_id": "unique_user_id"
}
```

**Ответ:** Проксирует запрос к `https://cringebattle22.roborumba.com/web_score`

### 4. POST /api/message

**Описание:** Прокси для отправки сообщений в игру (существующий endpoint)

**Запрос:**
```json
{
  "user_id": "unique_user_id",
  "request": {
    "original_utterance": "текст сообщения",
    "type": "SimpleUtterance"
  }
}
```

**Ответ:** Проксирует запрос к `https://cringebattle22.roborumba.com/web_chat`

## Требования к хранению данных

### Структура пользователя в БД:

```sql
users:
  - user_id (UUID, PRIMARY KEY) - уникальный ID для игры
  - yandex_id (STRING, UNIQUE) - ID пользователя в Яндекс
  - username (STRING) - имя пользователя из Яндекс
  - email (STRING) - email пользователя
  - created_at (TIMESTAMP) - дата регистрации
  - updated_at (TIMESTAMP) - дата последнего обновления
```

### Логика работы:

1. **Первая авторизация:**
   - Пользователь авторизуется через Яндекс OAuth
   - Backend получает `yandex_id` из Яндекс API
   - Проверяет, есть ли пользователь с таким `yandex_id`
   - Если нет - создает нового пользователя с новым `user_id` (UUID)
   - Возвращает `user_id` клиенту

2. **Повторная авторизация:**
   - Пользователь авторизуется через Яндекс OAuth
   - Backend получает `yandex_id` из Яндекс API
   - Находит существующего пользователя по `yandex_id`
   - Возвращает существующий `user_id` клиенту

## Интеграция с Яндекс OAuth

### Проверка токена:

```
GET https://login.yandex.ru/info
Headers:
  Authorization: OAuth {access_token}
```

**Ответ Яндекс API:**
```json
{
  "id": "yandex_user_id",
  "login": "username",
  "first_name": "Имя",
  "last_name": "Фамилия",
  "display_name": "Имя Фамилия",
  "default_email": "user@example.com",
  "emails": ["user@example.com"]
}
```

## Обработка ошибок

- **400 Bad Request** - неверный формат запроса
- **401 Unauthorized** - невалидный или истекший токен Яндекс
- **404 Not Found** - пользователь не найден (для GET /api/auth/user)
- **500 Internal Server Error** - внутренняя ошибка сервера

## Безопасность

1. Валидация токенов Яндекс OAuth
2. Хранение `yandex_id` для связи с аккаунтом Яндекс
3. Генерация уникального `user_id` (UUID) для игры
4. CORS настройки для работы с frontend
5. Логирование попыток авторизации

## Переменные окружения

Backend должен использовать следующие переменные окружения:

- `YANDEX_CLIENT_ID` - ID приложения в Яндекс OAuth (опционально, для дополнительной валидации)
- `DATABASE_URL` - URL базы данных (если используется БД)
- `PORT` - порт для запуска сервера (по умолчанию 5000)

