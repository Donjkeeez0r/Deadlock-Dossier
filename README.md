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
└── docker-compose.yml   # весь стек в Docker: frontend (nginx), backend, PostgreSQL 16, Redis
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

## Запуск в Docker

Понадобится только Docker. В `backend/` должен лежать файл `.env` (`cp backend/.env.example backend/.env`): compose подключает его целиком, но `DATABASE_URL`, `REDIS_URL` и `JWT_SECRET` переопределяет своими значениями.

```bash
docker compose up -d --build
```

| Сервис     | Адрес на хосте | Что внутри |
|------------|----------------|------------|
| `frontend` | http://localhost | nginx раздаёт собранный SPA и проксирует `/backend/*` на `backend:3000`, отрезая префикс |
| `backend`  | http://localhost:3000 | NestJS; при старте применяет миграции (`prisma migrate deploy`) |
| `postgres` | `localhost:5433` | PostgreSQL 16, данные в томе `postgres_main` |
| `redis`    | `localhost:6379` | Redis |

PostgreSQL проброшен на порт **5433**, а не 5432, чтобы не конфликтовать с другими локальными базами. Внутри сети Docker backend подключается к нему как `postgres:5432`.

Параметры базы и `JWT_SECRET` можно задать в файле `.env` в корне репозитория: `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`. Без него используются значения по умолчанию из `docker-compose.yml` (`postgres` / `password` / `main_db`, `supersecret`). Для чего-то кроме локальной проверки задайте свой `JWT_SECRET`.

## Разработка

Понадобятся Node.js 22+, [pnpm](https://pnpm.io) и Docker.

```bash
# 1. Только PostgreSQL и Redis (контейнер backend занял бы порт 3000)
docker compose up -d postgres redis

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

> **Имя базы.** `docker-compose.yml` по умолчанию создаёт базу `main_db`, а в `backend/.env.example` указана `deadlock_db` на `localhost:5433`. Проще всего положить в корень репозитория файл `.env` со строкой `DB_NAME=deadlock_db` до первого `docker compose up`. Другой вариант — поправить `DATABASE_URL`.

## Технологии

| Часть    | Стек |
|----------|------|
| Бэкенд   | NestJS 11, Prisma 7, PostgreSQL 16, Redis, BullMQ, cache-manager + Keyv, JWT, bcrypt, class-validator |
| Фронтенд | React 19 (React Compiler), TypeScript, Vite 8, Tailwind CSS 4, TanStack Query 5, React Router, Motion |
