# План: Игра без регистрации

## 1. Доступ к `/game` без логина
- Убрать редирект на `/login` для неавторизованных на GamePage
- При входе в игру без `userId` в localStorage — вызвать `POST /api/guest` → получить int `user_id`
- Сохранить как `guestUserId` в localStorage
- Использовать его как обычный `user_id` во всех запросах

## 2. Временное хранение прогресса
- Состояние игры (вопрос, ответ, счёт) — в React state компонента
- При закрытии/уходе со страницы — всё стирается
- localStorage не используем для прогресса — только временный guest ID

## 3. Предупреждение при выходе
- `beforeunload` event — браузерное подтверждение при закрытии вкладки
- Кнопка «← Назад» в AppHeader — показать свой модал: «Прогресс не сохранится. Выйти?» с двумя кнопками
- `react-router` `useBlocker` — перехват навигации внутри SPA
- Показывать предупреждение только если **игра начата** (есть хотя бы 1 ответ)

## 4. Сохранение результата при выходе
- При попытке выйти из игры (если есть прогресс) — модал с вариантами:
  - «Сохранить и выйти» → редирект на `/login`, после логина — результат записывается в БД
  - «Выйти без сохранения» — просто уходим, прогресс теряется
- Для этого перед редиректом на логин сохраняем результат игры в `localStorage` (`pendingGameResult`)
- После успешного логина — проверяем `pendingGameResult` и отправляем на бэкенд

## 5. Генерация guest_id через бэкенд (вариант Б)
- Endpoint `POST /api/guest` → бэкенд создаёт юзера (`nickname='Гость'`, `is_guest=1`) → возвращает реальный int `user_id`
- Фронт сохраняет `guestUserId` в localStorage
- Игра работает как обычно — раунды и ответы привязаны к int ID
- После логина — мерж гостя в реального юзера:
  - `UPDATE round_answer SET user_id = <real_id> WHERE user_id = <guest_id>`
  - `UPDATE rounds SET user_id = <real_id> WHERE user_id = <guest_id>`
  - Удалить гостевого юзера из `users`
- Cleanup: cron раз в сутки — удалять guest-юзеров старше 24ч без активности
- Флаг `is_guest` (tinyint) в таблице `users` — отличать гостей от реальных

## Что НЕ меняем
- Дуэли — только для авторизованных (нужен реальный user_id)
- Рейтинг — только для авторизованных
- Профиль — без изменений

## Файлы
- `GamePage.js` — убрать проверку auth, добавить modal + beforeunload + pending result
- `GamePage.css` — стили для modal
- `AppHeader.js` — опционально: передать callback для кнопки «назад»
- `LoginPage.js` — после логина проверить `pendingGameResult` и отправить
- Backend — `/api/guest` для создания гостя, мерж после логина, cleanup cron

## Порядок реализации
1. **Backend: `is_guest` поле + `/api/guest` endpoint**
   - ALTER TABLE `users` ADD COLUMN `is_guest` TINYINT DEFAULT 0
   - `POST /api/guest` → создать User(nickname='Гость', is_guest=1) → вернуть user_id
2. **Backend: мерж гостя при логине**
   - В `/api/auth/code` и Yandex callback: если есть `guestUserId` в запросе → перепривязать rounds/round_answer → удалить гостя
   - `POST /api/merge-guest` с body {guest_id, real_id}
3. **GamePage: убрать проверку авторизации**
   - Если нет `userId` → вызвать `/api/guest` → сохранить в `guestUserId`
   - Использовать `guestUserId` как activeUserId для игровой логики
4. **GamePage: beforeunload + useBlocker**
   - `beforeunload` — браузерное подтверждение при закрытии/обновлении
   - `useBlocker` — перехват навигации внутри SPA (кнопка ←, клик по ссылке)
   - Показывать только если есть хотя бы 1 ответ
5. **GamePage: exit modal**
   - «Сохранить и войти» → сохранить `guestUserId` + состояние в localStorage → редирект `/login`
   - «Выйти» → просто уйти без сохранения
6. **LoginPage: обработка после логина**
   - После успешного логина проверить `guestUserId` в localStorage
   - Вызвать `/api/merge-guest` → очистить `guestUserId`
   - Редирект на главную
7. **Cleanup cron (опционально)**
   - Раз в сутки: удалять `users` с `is_guest=1` и `created_at < NOW() - 24h`
   - Также удалить их rounds и round_answer

## Открытые вопросы
- Показывать ли гостю его счёт после игры? (Да, но без записи в рейтинг)
- Ограничить кол-во гостевых игр? (Пока нет)
- Нужен ли rate limit на `/api/guest` по IP? (Да, 1 в минуту)
