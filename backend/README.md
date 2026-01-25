# Backend API для авторизации через Яндекс OAuth

Реализация Flask API для авторизации пользователей через Яндекс OAuth и проксирование запросов к игровому API.

## Установка

1. Создайте виртуальное окружение:
```bash
python3 -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Установите переменные окружения:
```bash
export YANDEX_CLIENT_ID=your_client_id
export YANDEX_CLIENT_SECRET=your_client_secret
export PORT=5000  # опционально, по умолчанию 5000
```

Или создайте файл `.env`:
```
YANDEX_CLIENT_ID=your_client_id
YANDEX_CLIENT_SECRET=your_client_secret
PORT=5000
```

4. Запустите сервер:
```bash
python api.py
```

Сервер будет доступен на `http://127.0.0.1:5000`

## API Endpoints

### POST /api/auth/yandex
Авторизация через Яндекс OAuth

**Запрос:**
```json
{
  "code": "authorization_code_from_yandex"
}
```

**Ответ:**
```json
{
  "success": true,
  "user_id": "unique_user_id",
  "yandex_id": "yandex_user_id",
  "username": "Имя пользователя",
  "email": "user@example.com"
}
```

### GET /api/auth/user?user_id=...
Получить информацию о пользователе

### POST /api/score
Прокси для получения статистики игрока

### POST /api/message
Прокси для отправки сообщений в игру

### GET /api/health
Health check

## Важно

- Данная реализация использует Peewee ORM с SQLite базой данных (по умолчанию `users.db`)
- В продакшене необходимо использовать реальную базу данных
- Необходимо настроить CORS для работы с frontend
- Переменные окружения `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` обязательны для работы OAuth

## Интеграция с другой базой данных

Для использования других БД (PostgreSQL, MySQL), измените тип базы данных в `api.py`:

```python
# Для PostgreSQL
from peewee import PostgresqlDatabase
database = PostgresqlDatabase('mydb', user='user', password='pass', host='localhost')

# Для MySQL
from peewee import MySQLDatabase
database = MySQLDatabase('mydb', user='user', password='pass', host='localhost')
```

