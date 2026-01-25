# Бой с кринжем - Веб-версия

Веб-версия игры "Бой с кринжем", где игроки попадают в неловкие ситуации и должны выйти из них с блеском.

## Технологии

- **Frontend**: React
- **Backend**: Python + Flask (требуется для авторизации через Яндекс OAuth)
- **API**: Игровой API через backend прокси

## Структура проекта

```
CringeBattleWeb/
├── backend/         # Требования к Backend API
│   └── API_REQUIREMENTS.md  # Документация требований к backend
├── frontend/        # React приложение
│   ├── src/
│   │   ├── pages/   # Страницы приложения
│   │   ├── services/ # API сервисы
│   │   └── App.js
│   └── package.json
└── api/             # Документация игрового API
```

## Установка и запуск

### Backend

**Важно:** Backend должен быть реализован согласно требованиям в `backend/API_REQUIREMENTS.md`

Backend должен быть запущен на `http://127.0.0.1:5000` перед запуском frontend.

### Frontend

1. Перейдите в директорию frontend:
```bash
cd frontend
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите приложение:
```bash
npm start
```

Приложение будет доступно на `http://localhost:3000`

## Основные разделы

1. **Главная страница** (`/`) - Приветствие и кнопка начала игры
2. **Авторизация** (`/login`) - Вход через Яндекс OAuth
3. **Игра** (`/game`) - Основной игровой интерфейс с чатом и панелью очков
4. **Профиль** (`/profile`) - Личный кабинет с статистикой и подпиской

## API Endpoints

### Backend API (требуется реализация)

См. подробные требования в `backend/API_REQUIREMENTS.md`:

- `POST /api/auth/yandex` - Авторизация через Яндекс OAuth
- `GET /api/auth/user` - Получить информацию о пользователе
- `POST /api/score` - Прокси для получения статистики
- `POST /api/message` - Прокси для отправки сообщений в игру

### Игровой API (через backend)

- `POST https://cringebattle22.roborumba.com/web_score` - Получение статистики
- `POST https://cringebattle22.roborumba.com/web_chat` - Взаимодействие с игрой

## Особенности

- Современный и красивый UI с градиентами и анимациями
- Адаптивный дизайн для мобильных устройств
- Интеграция с игровым API
- Отображение изображений из игры
- Система кнопок и текстовых ответов
- Панель статистики в реальном времени

## Авторизация

Приложение использует авторизацию через Яндекс OAuth:

1. Пользователь нажимает "Войти через Яндекс"
2. Перенаправление на страницу авторизации Яндекс
3. После успешной авторизации Яндекс возвращает `code`
4. Frontend отправляет `code` на backend
5. Backend обменивает `code` на `access_token` и получает информацию о пользователе
6. Backend создает или находит пользователя по `yandex_id` и возвращает уникальный `user_id`
7. Frontend сохраняет `user_id` в localStorage

**Требования к backend:** См. `backend/API_REQUIREMENTS.md`

## Настройка Яндекс OAuth

Для работы авторизации необходимо:

1. Создать приложение в [Яндекс OAuth](https://oauth.yandex.ru/)
2. Получить `Client ID` и `Client Secret`
3. Настроить redirect URI: `http://localhost:3000/login`
4. Добавить переменные окружения в `.env`:
   ```
   REACT_APP_YANDEX_CLIENT_ID=your_client_id
   REACT_APP_YANDEX_CLIENT_SECRET=your_client_secret
   REACT_APP_API_URL=http://127.0.0.1:5000/api
   ```
   
   **Примечание:** По умолчанию frontend использует `http://127.0.0.1:5000/api` для backend API.

**Важно:** Backend должен быть реализован согласно требованиям в `backend/API_REQUIREMENTS.md`

