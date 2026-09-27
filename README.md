# Досье — контрпики и сборки Deadlock

Веб-приложение для игроков в [Deadlock](https://store.steampowered.com/app/1422450/Deadlock/). Оно показывает контрпики и матчапы на линии, помогает собрать и оценить сборку предметов по свежей статистике матчей. Данные берутся из открытого [Deadlock API](https://api.deadlock-api.com).

## Возможности

- **Контрпик.** Выбираете вражеского героя и получаете пятёрку героев с лучшим винрейтом против него.
- **Матчап на линии.** Винрейт пары «мой герой против врага», лучшие союзники героя и предметы с лучшим винрейтом в этом матчапе.
- **Конструктор сборки.** Сборка из 2–12 предметов магазина с подсказками к каждому предмету. Её можно оценить: стоимость, винрейт, среднее время покупки и бейджи вроде «Темповый билд» или «Нет выживаемости».
- **Популярная сборка.** 12 самых покупаемых предметов героя, упорядоченных по времени покупки.
- **Сохранение и ссылки.** Сборку можно сохранить и поделиться ссылкой `/build/:id`. Гость сохраняет анонимно, а вошедший пользователь сохраняет в аккаунт.
- **Мои сборки.** Список своих сборок, которые можно переименовать или удалить.
- **Сравнение.** Две сборки рядом: сохранённая, популярная или собранная на лету.

## Структура репозитория

```
.
├── backend/             # REST API на NestJS: Prisma + PostgreSQL, Redis, BullMQ
├── frontend/            # SPA на React 19 + Vite + Tailwind CSS 4
└── docker-compose.yml   # PostgreSQL 16 и Redis для локальной разработки
```

Подробности в [backend/README.md](backend/README.md) и [frontend/README.md](frontend/README.md).

## Архитектура

```
Браузер ──► frontend (Vite, :5173)
              │  /backend/* → проксируется на :3000
              ▼
            backend (NestJS, :3000) ──► api.deadlock-api.com
              │            │
              ▼            ▼
         PostgreSQL      Redis
     (герои, предметы,  (кэш аналитики на 2 ч,
      пользователи,      очередь синхронизации BullMQ)
      сборки)
```

- Героев и предметы бэкенд синхронизирует из Deadlock API в PostgreSQL: при первом запуске и каждый день в 04:00 и 04:10.
- Аналитику (контрпики, синергию, матчапы, статистику предметов) бэкенд запрашивает у Deadlock API и кэширует в Redis на 2 часа.
- Авторизация построена на JWT, который живёт сутки. Фронтенд хранит сессию в `localStorage`.

## Быстрый старт

Понадобятся Node.js 22+, [pnpm](https://pnpm.io) и Docker.

```bash
# 1. PostgreSQL и Redis
docker compose up -d

# 2. Бэкенд
cd backend
pnpm install
cp .env.example .env            # впишите JWT_SECRET: openssl rand -hex 32
pnpm prisma migrate deploy --config prisma7.config.ts
pnpm prisma generate --config prisma7.config.ts
pnpm start:dev                  # http://localhost:3000

# 3. Фронтенд (в другом терминале)
cd frontend
pnpm install
pnpm dev                        # http://localhost:5173
```

При первом запуске бэкенд сам ставит в очередь синхронизацию героев и предметов. Пока она не закончится (обычно несколько секунд), списки на фронтенде будут пустыми.

> **Имя базы.** `docker-compose.yml` по умолчанию создаёт базу `main_db`, а в `.env.example` указана `deadlock_db`. Проще всего положить в корень репозитория файл `.env` со строкой `DB_NAME=deadlock_db` до первого `docker compose up`. Другой вариант — поправить `DATABASE_URL`.

## Технологии

| Часть    | Стек |
|----------|------|
| Бэкенд   | NestJS 11, Prisma 7, PostgreSQL 16, Redis, BullMQ, cache-manager + Keyv, JWT, bcrypt, class-validator |
| Фронтенд | React 19 (React Compiler), TypeScript, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router, Motion |
