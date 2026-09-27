# Досье — бэкенд

REST API на NestJS 11. Он синхронизирует героев и предметы из [Deadlock API](https://api.deadlock-api.com), считает аналитику (контрпики, синергию, матчапы, оценку сборки), хранит пользователей и сохранённые сборки.

## Стек

- **NestJS 11**, глобальный `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`)
- **Prisma 7** + адаптер `@prisma/adapter-pg`, **PostgreSQL 16**
- **Redis**: кэш аналитики (`@nestjs/cache-manager` + `@keyv/redis`, TTL 2 ч) и очередь **BullMQ**
- **JWT** (`@nestjs/jwt`, срок жизни 1 сутки) и **bcrypt** для паролей

## Запуск

Нужны Node.js 22+, pnpm, а также запущенные PostgreSQL и Redis. Их проще поднять из корня репозитория командой `docker compose up -d`.

```bash
pnpm install
cp .env.example .env
pnpm prisma migrate deploy --config prisma7.config.ts
pnpm prisma generate --config prisma7.config.ts
pnpm start:dev
```

Сервер слушает `http://localhost:3000`.

> Конфиг Prisma называется `prisma7.config.ts`, а не `prisma.config.ts`, поэтому любой команде Prisma CLI нужен флаг `--config prisma7.config.ts`.

### Переменные окружения

| Переменная     | Обязательна | Описание |
|----------------|:-----------:|----------|
| `DATABASE_URL` | да  | Строка подключения к PostgreSQL, например `postgresql://postgres:password@localhost:5432/deadlock_db` |
| `JWT_SECRET`   | да  | Секрет для подписи JWT; сгенерируйте через `openssl rand -hex 32` |
| `REDIS_URL`    | да  | Адрес Redis, например `redis://localhost:6379` |
| `CORS_ORIGIN`  | нет | Разрешённые origin через запятую, по умолчанию `http://localhost:5173` |
| `PORT`         | нет | Порт сервера, по умолчанию `3000` |

### Скрипты

| Команда           | Что делает |
|-------------------|------------|
| `pnpm start:dev`  | Запуск с перезагрузкой при изменениях |
| `pnpm build`      | Сборка в `dist/` |
| `pnpm start:prod` | Запуск собранного `dist/main.js` |
| `pnpm lint`       | ESLint с автоисправлением |
| `pnpm format`     | Prettier для `src/` и `test/` |
| `pnpm test`       | Unit-тесты (Jest, файлы `*.spec.ts`) |
| `pnpm test:cov`   | Unit-тесты с покрытием |

`test/app.e2e-spec.ts` остался от шаблона NestJS и проверяет несуществующий `GET /`, поэтому `pnpm test:e2e` сейчас не пройдёт.

## Структура

```
src/
├── main.ts                 # bootstrap: CORS, ValidationPipe, BigInt → JSON number
├── app.module.ts           # подключение Redis-кэша, BullMQ и модулей
├── prisma/                 # PrismaService
├── deadlock-api/           # HTTP-клиент к api.deadlock-api.com/v1
├── sync/                   # синхронизация героев и предметов (BullMQ)
│   ├── sync.service.ts     #   расписание и ручной запуск
│   ├── sync.processor.ts   #   обработчик задач sync-heroes / sync-items
│   └── item-tooltip.ts     #   нормализация русских подсказок предметов
├── assets/                 # отдача героев, предметов и подсказок из БД
├── analytics/              # контрпики, синергия, линия, рекомендации, оценка сборки
│   └── popular-build.ts    #   выбор популярной сборки героя
├── auth/                   # регистрация, вход, JWT-guard'ы
└── build/                  # сохранённые сборки
prisma/
├── schema.prisma
└── migrations/
```

## Модель данных

| Модель       | Назначение |
|--------------|------------|
| `Hero`       | Герои из API: имя, иконка, карточка, `isPlayable` |
| `Item`       | Предметы магазина (тиры 1–4): цена, тир, категория (`weapon` / `vitality` / `spirit`), картинка, `nameRu` и `tooltip` (JSON) |
| `User`       | Email и bcrypt-хэш пароля |
| `SavedBuild` | Сборка: имя, герой, `itemIds` (`BigInt[]`), необязательный `userId` (null означает анонимную сборку) |

## Синхронизация данных

Модуль `sync` работает через очередь BullMQ `assets-sync`:

- при старте, если таблица `Hero` пуста, синхронизация запускается сразу;
- по расписанию: `sync-heroes` каждый день в 04:00, `sync-items` в 04:10;
- вручную: `POST /sync/trigger`.

Особенности:

- в базу попадают только предметы магазина тиров 1–4. Тир 5 — легендарки режима Street Brawl с ценой-заглушкой 9999;
- герои и предметы, пропавшие из ответа API, удаляются из базы. При пустом ответе или ошибке API ничего не удаляется;
- русские названия и подсказки берутся из `/assets/items/by-type/upgrade?language=russian`. Если этот запрос упал, старые подсказки остаются как были.

## API

Все тела запросов и ответов в JSON. Идентификаторы предметов (`BigInt` в базе) сериализуются как числа.

Ответы с ошибкой приходят в стандартном формате NestJS: `{ statusCode, message, error }`. Бизнес-ошибки написаны по-русски, ошибки валидации приходят массивом английских строк. Если Deadlock API недоступен, сервер отвечает `503`.

### Ассеты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/assets/heroes` | Играбельные герои, по алфавиту |
| GET | `/assets/items` | Предметы магазина без подсказок, по тиру и цене |
| GET | `/assets/items/tooltips` | Подсказки: объект `{ "<itemId>": tooltip }` |

### Аналитика

Ответы кэшируются в Redis на 2 часа.

| Метод | Путь | Параметры | Описание |
|-------|------|-----------|----------|
| GET | `/analytics/counters` | `enemyHeroId` | Топ-5 героев по винрейту против врага (от 100 матчей) |
| GET | `/analytics/synergy` | `heroId` | Топ-5 союзников по винрейту |
| GET | `/analytics/lane` | `myHeroId`, `enemyHeroId` | Винрейт и число матчей на линии |
| GET | `/analytics/items/recommendations` | `myHeroId`, `enemyHeroId` | Топ-10 предметов по винрейту в матчапе |
| GET | `/analytics/popular-build` | `heroId` | `{ heroId, itemIds }`: 12 самых покупаемых предметов в порядке покупки. `404`, если героя нет или статистики мало |
| POST | `/analytics/compare` | тело `{ heroId, itemIds }` | Оценка сборки |

Ключи кэша: `counters:<id>`, `synergy:<id>`, `lane:<my>:<enemy>`, `items:<my>:vs:<enemy>`, `stats:hero:<id>:items`. После изменения логики аналитики соответствующие ключи в Redis нужно удалить.

Пример оценки сборки:

```http
POST /analytics/compare
Content-Type: application/json

{ "heroId": 1, "itemIds": [1234, 5678] }
```

```json
{
  "heroId": 1,
  "totalCost": 4000,
  "buildWinrate": 52.4,
  "avgBuyMin": 9,
  "itemsWithStats": 2,
  "badges": ["Темповый билд (дешево/эффективно)"],
  "items": [{ "id": 1234, "name": "...", "cost": 800, "imageUrl": "..." }]
}
```

`itemIds` должен содержать от 2 до 12 уникальных положительных целых. Если статистики нет, `buildWinrate` и `avgBuyMin` равны `null`, а бейджи по винрейту не выставляются.

### Авторизация

| Метод | Путь | Тело | Ответ |
|-------|------|------|-------|
| POST | `/auth/register` | `{ email, password }` | `201 { access_token }`; `400`, если email занят |
| POST | `/auth/login` | `{ email, password }` | `200 { access_token }`; `401` при неверных данных |

Пароль должен быть не короче 6 символов. Токен передаётся в заголовке `Authorization: Bearer <token>`.

### Сборки

| Метод | Путь | Авторизация | Описание |
|-------|------|-------------|----------|
| POST | `/api/builds` | необязательна | Сохранить `{ name, heroId, itemIds }`. Ответ `{ shareId, owned }` |
| GET | `/api/builds/mine` | обязательна | Сборки текущего пользователя, новые сверху |
| GET | `/api/builds/:id` | необязательна | Сборка с оценкой и флагом `isOwner` |
| PATCH | `/api/builds/:id` | обязательна | Переименовать: `{ name }` |
| DELETE | `/api/builds/:id` | обязательна | Удалить, ответ `204` |

Название сборки должно быть непустым после обрезки пробелов, не длиннее 100 символов. Чужая или несуществующая сборка в `PATCH`/`DELETE` даёт `404`.

### Служебное

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/sync/trigger` | Поставить в очередь синхронизацию героев и предметов |

## Тесты

Unit-тесты лежат рядом с кодом: `analytics.service.spec.ts`, `popular-build.spec.ts`, `build.service.spec.ts`, `item-tooltip.spec.ts`.

Jest не может загрузить ESM-пакет `@nestjs/config`, поэтому в тестах `PrismaService` и `AnalyticsService` подменяются через `jest.mock`.

## Известные особенности Deadlock API

- `hero-counter-stats` игнорирует `enemy_hero_id`, а `hero-synergy-stats` игнорирует `hero_id1`: оба отдают все пары героев. Поэтому фильтрация по нужному герою и агрегация делаются на стороне бэкенда.
- С некоторых сетей API периодически отвечает `ENETUNREACH` по IPv6. В таком случае синхронизацию стоит повторить.
