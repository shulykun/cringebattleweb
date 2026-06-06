# Бой с кринжем — сводка проекта (июнь 2026)

## О проекте
Навык Алисы + веб-приложение (SPA). Дети 9-14 лет, DAU ~1500.

## Инфраструктура
- **Backend:** Python/Flask на `64.188.62.166:4998`
- **Frontend:** React (CRA) на `:3003`, nginx + HTTPS
- **Домен:** бойскринжем.рф (Let's Encrypt SSL)
- **БД:** MySQL на `62.113.96.121:3307`
- **Frontend repo:** `/root/.openclaw/workspace/projects/Cringebattleweb` (master)
- **Backend repo:** `/root/.openclaw/workspace/projects/cringebattle22` (cleanup-remove-duel-v1)

## Что сделано

### Авторизация
- [x] Яндекс OAuth + OTP-код из колонки Алисы
- [x] Антиспам: 1 код/мин генерация, 5 попыток/10 мин по IP
- [x] Гостевая игра без регистрации (временный юзер → мерж при логине)

### Страницы
- [x] Главная, Игра, Дуэль (6 экранов), Логин, Профиль, Рейтинг, Мои дуэли, Правила, Обратная связь, Установка (PWA), Юзер-профили

### UI/UX
- [x] Dark Glass дизайн, единый AppHeader/AppFooter
- [x] Звуки, PWA (manifest + service worker), favicon «Б»
- [x] SEO: react-helmet-async на каждой странице
- [x] OG-теги для шаринга дуэлей + профилей юзеров
- [x] Exit modal при выходе из игры (для гостей)
- [x] Кнопка «Онлайн дуэль» под статистикой

### Профиль юзера
- [x] Статистика (очки, игры, средний ответ, кринж)
- [x] Лучший ответ (с задачей и оценкой /10)
- [x] Кнопки «Поделиться» (TG, VK, копировать)
- [x] Метрики: title/description/og с ником и рейтингом

### Аналитика
- [x] Яндекс Метрика (102000769): 20 событий, webvisor, SPA hit tracking

### Backend
- [x] Feedback → feedback.jsonl (с user_id)
- [x] Leaderboard из user_rating
- [x] Best answer в /api/user/<id>
- [x] Guest play: /api/guest + /api/merge-guest
- [x] OTP rate limiting

## Что в планах / не сделано
- [ ] www.бойскринжем.рф — DNS указывает на Beget, не на наш сервер
- [ ] Cleanup cron для guest-юзеров (старше 24ч)
- [ ] Telegram Login Widget как доп. метод авторизации
- [ ] Пользовательские ситуации из фидбека → в игру
- [ ] Capacitor для нативного приложения (отложено)
- [ ] Исправить повторение ситуаций в раундах (жалоба от юзера 04.06)

## Ключевые решения
- `user_rating` таблица вместо GROUP BY по 5.7M строк
- `setupProxy.js` вместо proxy в package.json (CRA ломал SPA routing)
- OTP: `User.id` а не `User.chat_id` для поиска юзера
- Guest play: вариант Б — бэкенд создаёт юзера с `is_guest=1`, мерж при логине
- Uplift через `/api/merge-guest`: перепривязка rounds + round_answer

## Доступы (доверенные пользователи)
- **79711951** — Vadim (хозяин)
- **40301814** — Слава Усышкин (полный доступ)
- **468001724** — Слава (полный доступ)
- **341546944** — полный доступ
- **235745248** — Semen Yurevich (@YurevichSemen, полный доступ)
