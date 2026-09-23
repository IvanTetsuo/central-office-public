# Central Office

Серверная часть админ-панели центрального офиса. Приложение ведёт администраторов, владельцев магазинов, торговые точки, терминалы ККМ и заявки на подключение терминалов.

Стек: NestJS, Prisma, PostgreSQL, JWT, Docker Compose.

## Структура

- `src/` — модули NestJS: авторизация администраторов и магазинов, администраторы, владельцы, магазины, терминалы, заявки, профиль.
- `prisma/` — схема, миграции и seed корневого администратора.
- `Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh` — сборка и локальный запуск.
- `.env.example` — переменные окружения без боевых секретов.

## Требования

- Docker и Docker Compose — для запуска одной командой.
- Node.js 22 и npm — для локальных команд вне контейнера (`build`, тесты, lint, миграции).

## Запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Backend слушает порт из `PORT` (по умолчанию `3000`). PostgreSQL публикуется на `POSTGRES_PORT` (по умолчанию `5432`). Проверка, что сервис поднялся:

```bash
curl http://localhost:3000
```

Ответ: `Hello World!`.

При старте контейнера `docker-entrypoint.sh` применяет миграции (`prisma migrate deploy`) и запускает seed. Повторный запуск seed не создаёт второго root.

Остановка:

```bash
docker compose down
```

Данные PostgreSQL сохраняются в volume `postgres_data`.

### Локально без Docker

Нужен доступный PostgreSQL и заполненный `.env` (`DATABASE_URL` должен указывать на эту базу).

```bash
npm ci
npx prisma migrate deploy
npm run db:seed
npm run start:dev
```

Продакшен-режим после сборки: `npm run build`, затем `npm run start:prod`.

## Переменные окружения

Скопируйте `.env.example`. Обязательные переменные:

| Переменная | Назначение |
| --- | --- |
| `PORT` | HTTP-порт backend |
| `DATABASE_URL` | Строка подключения PostgreSQL |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` | Параметры сервиса Postgres в Compose |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Секреты JWT администратора |
| `SHOP_JWT_ACCESS_SECRET`, `SHOP_JWT_REFRESH_SECRET` | Секреты JWT магазина |
| `ROOT_EMAIL`, `ROOT_PASSWORD` | Учётная запись единственного root, создаваемая seed |

В `docker-compose.yml` заданы значения по умолчанию только для локальной разработки. Для проверки входа root используйте `ROOT_EMAIL` и `ROOT_PASSWORD` из своего `.env` (в примере это `root@example.com` и `root-password`).

## Root

Seed создаёт администратора с ролью `ROOT`, если такого ещё нет. Второго root создать через API нельзя: `POST /admins` всегда создаёт роль `MANAGER`. Удалить root нельзя.

## Авторизация

Две независимые схемы JWT. Токен администратора не подходит для ручек магазина и наоборот.

Заголовок защищённых ручек: `Authorization: Bearer <accessToken>`.

| Токен | Срок | Секрет |
| --- | --- | --- |
| Access | 15 минут (`expiresIn`: `900`) | `JWT_ACCESS_SECRET` или `SHOP_JWT_ACCESS_SECRET` |
| Refresh | 7 суток | соответствующий refresh-секрет |

Пароли хранятся как bcrypt-хеш. В ответах авторизации пароль и хеш refresh-токена не возвращаются.

### Одна активная сессия

У администратора и у магазина действует одно и то же правило: один аккаунт — одна сессия.

- Новый `login` удаляет предыдущую сессию и выдаёт новую пару токенов. Старые access и refresh перестают работать.
- `refresh` поворачивает refresh-токен: предыдущий refresh повторно не принимается.
- `logout` помечает текущую сессию отозванной.
- На каждом защищённом запросе проверяются тип токена, сессия, отзыв и срок действия.

### Учётные данные магазина

У магазина есть уникальный `login` и пароль. Вход: `POST /shop-auth/login`. Смена логина и пароля: `PATCH /shop/:id` с shop access-токеном. Если в теле передан новый пароль, активные сессии этого магазина отзываются.

## Терминалы и heartbeat

`POST /terminal/alive` принимает MAC-адрес уже существующего терминала, ставит статус `ACTIVE` и обновляет `lastHeartbeatAt`. Неизвестный MAC возвращает `404` и запись не создаёт.

В первой версии у heartbeat нет отдельного секрета: достаточно знать MAC. Это риск для production: любой, кто знает MAC, может пометить терминал активным.

Ручная смена статуса: `PATCH /terminal/:id/status` с телом `{ "status": "ACTIVE" }` или `{ "status": "INACTIVE" }`.

Одобрение заявки создаёт терминал с этим MAC или обновляет существующий терминал того же магазина и переводит заявку в `APPROVED`. MAC уникален. Если MAC уже принадлежит другому магазину, approve возвращает `400`.

## API

Базовый URL локально: `http://localhost:3000`. Тело запросов — JSON. Идентификаторы — UUID. Лишние поля тела отклоняются (`400`).

Роли в таблице:

- **public** — без токена.
- **admin** — access-токен администратора (`ROOT` или `MANAGER`).
- **root** — access-токен администратора с ролью `ROOT`.
- **shop** — access-токен магазина.
- **нет** — guard в текущей версии не подключён.

### Сводка ручек

| Метод | URL | Доступ | Вход | Выход |
| --- | --- | --- | --- | --- |
| `GET` | `/` | public | — | текст `Hello World!` |
| `POST` | `/auth/login` | public | `email`, `password` | пара токенов и карточка администратора |
| `POST` | `/auth/refresh` | public | `refreshToken` | новая пара токенов и карточка администратора |
| `POST` | `/auth/logout` | admin | — | `{ "success": true }` |
| `GET` | `/admins` | admin | — | массив администраторов |
| `GET` | `/admins/:id` | admin | — | карточка администратора |
| `POST` | `/admins` | root | `name`, `email`, `password` | созданный менеджер |
| `PATCH` | `/admins/:id/password` | root | `password` | карточка администратора; его сессии удаляются |
| `DELETE` | `/admins/:id` | root | — | пустое тело; root удалить нельзя |
| `GET` | `/shop-owners` | admin | — | массив владельцев, у каждого вложены `shops` |
| `GET` | `/shop-owners/:id` | admin | — | карточка владельца |
| `POST` | `/shop-owners` | admin | `firstName`, `lastName`, `phone`, `email`, `address` | созданный владелец |
| `PATCH` | `/shop-owners/:id` | admin | любые из полей создания | обновлённый владелец |
| `DELETE` | `/shop-owners/:id` | admin | — | `{ "success": true }`; отказ, если есть магазины |
| `GET` | `/shop` | admin | — | массив магазинов с `owner` |
| `POST` | `/shop` | admin | `ownerId`, `name`, `address`, `requisites`, `login`, `password` | созданный магазин с `owner` |
| `GET` | `/shop/:id` | shop | — | магазин с `owner` |
| `PATCH` | `/shop/:id` | shop | `login`, `password` | магазин с новым логином; при новом пароле сессии магазина отзываются |
| `DELETE` | `/shop/:id` | admin | — | удалённый магазин с `owner` |
| `POST` | `/shop-auth/login` | public | `login`, `password` | пара токенов и краткая карточка магазина |
| `POST` | `/shop-auth/refresh` | public | `refreshToken` | новая пара токенов и краткая карточка магазина |
| `GET` | `/shop-auth/me` | shop | — | `{ id, shopId, login, ownerId, sessionId }` |
| `POST` | `/shop-auth/logout` | shop | — | `{ "success": true }` |
| `GET` | `/terminal` | нет | — | массив терминалов с `shop` |
| `GET` | `/terminal/:id` | нет | — | терминал с `shop` |
| `PATCH` | `/terminal/:id/status` | нет | `status`: `ACTIVE` \| `INACTIVE` | терминал с `shop` |
| `POST` | `/terminal/alive` | нет | `macAddress` | терминал со статусом `ACTIVE` |
| `GET` | `/requests` | нет | — | массив заявок с `shop` |
| `PATCH` | `/requests/:id/approve` | нет | `macAddress` | `{ terminal, request }` или сама заявка, если она уже `APPROVED` |
| `PATCH` | `/requests/:id/reject` | нет | — | заявка со статусом `REJECTED` |
| `POST` | `/requests/:id/comment` | нет | `comment` | заявка с новым комментарием |
| `PATCH` | `/profile/password` | admin | `currentPassword`, `newPassword` | `{ "success": true }` |

Карточка администратора: `id`, `name`, `email`, `role` (`ROOT` \| `MANAGER`), `createdAt`, `updatedAt`. Поля `passwordHash` в ответах администратора и магазина нет. В ответе login/refresh поля `createdAt` и `updatedAt` тоже нет.

Карточка магазина: `id`, `ownerId`, `name`, `address`, `requisites`, `login`, `createdAt`, `updatedAt`. В ручках `/shop` дополнительно вложен `owner`. Вложенный `shop` у терминала, заявки и в списке владельцев содержит те же поля магазина, без хеша пароля.

Карточка владельца: `id`, `firstName`, `lastName`, `phone`, `email`, `address`, `createdAt`, `updatedAt`.

Терминал: `id`, `shopId`, `macAddress`, `status` (`ACTIVE` \| `INACTIVE`), `lastHeartbeatAt`, `createdAt`, `updatedAt`, вложенный `shop`.

Заявка: `id`, `shopId`, `macAddress`, `status` (`PENDING` \| `APPROVED` \| `REJECTED`), `comment`, `createdAt`, `updatedAt`. В списке и в approve дополнительно вложен `shop`.

### Примеры

Вход администратора:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "root@example.com",
  "password": "root-password"
}
```

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "admin": {
    "id": "3f1c2a40-7c1e-4e0a-9b1a-6d0e1f2a3b4c",
    "name": "Root administrator",
    "email": "root@example.com",
    "role": "ROOT"
  }
}
```

Обновление токена администратора:

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "<jwt>" }
```

Ответ того же вида, что у login, с новой парой токенов.

Создание менеджера:

```http
POST /admins
Authorization: Bearer <accessToken root>
Content-Type: application/json

{
  "name": "Менеджер",
  "email": "manager@example.com",
  "password": "password1"
}
```

`password` — от 8 до 72 символов. Ответ — карточка администратора с `"role": "MANAGER"`.

Создание владельца:

```http
POST /shop-owners
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "firstName": "Иван",
  "lastName": "Петров",
  "phone": "+79001234567",
  "email": "owner@example.com",
  "address": "Москва, ул. Пример, 1"
}
```

`phone` — номер в международном формате.

Создание магазина:

```http
POST /shop
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "ownerId": "3f1c2a40-7c1e-4e0a-9b1a-6d0e1f2a3b4c",
  "name": "Магазин на Ленина",
  "address": "Москва, ул. Ленина, 1",
  "requisites": "ИНН 7700000000",
  "login": "shop-lenina",
  "password": "shop-password"
}
```

`password` — от 8 до 72 символов. `login` приводится к нижнему регистру и должен быть уникальным.

Вход магазина:

```http
POST /shop-auth/login
Content-Type: application/json

{
  "login": "shop-lenina",
  "password": "shop-password"
}
```

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "shop": {
    "id": "8a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
    "login": "shop-lenina",
    "ownerId": "3f1c2a40-7c1e-4e0a-9b1a-6d0e1f2a3b4c",
    "name": "Магазин на Ленина"
  }
}
```

Смена учётных данных магазина:

```http
PATCH /shop/8a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d
Authorization: Bearer <shop accessToken>
Content-Type: application/json

{
  "login": "shop-lenina",
  "password": "new-password"
}
```

Одобрение заявки:

```http
PATCH /requests/1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d/approve
Content-Type: application/json

{ "macAddress": "AA:BB:CC:DD:EE:FF" }
```

```json
{
  "terminal": {
    "id": "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    "shopId": "8a0b1c2d-3e4f-5a6b-7c8d-9e0f1a2b3c4d",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "status": "ACTIVE",
    "lastHeartbeatAt": null
  },
  "request": {
    "id": "1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d",
    "status": "APPROVED",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "comment": "Approved"
  }
}
```

Повторный approve уже одобренной заявки возвращает саму заявку, без обёртки `{ terminal, request }`, и второй терминал не создаёт.

Heartbeat:

```http
POST /terminal/alive
Content-Type: application/json

{ "macAddress": "AA:BB:CC:DD:EE:FF" }
```

Смена своего пароля:

```http
PATCH /profile/password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "root-password",
  "newPassword": "new-password"
}
```

`newPassword` проверяется в сервисе: минимум 8 символов. Неверный текущий пароль — `401`.

### Ошибки

Тело ошибки NestJS:

```json
{
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "statusCode": 401
}
```

Ошибка валидации: `message` — массив строк, `error` — `Bad Request`, `statusCode` — `400`.

| Код | Когда |
| --- | --- |
| `400` | Невалидное тело, занятый логин магазина, неизвестный `ownerId`, неуникальный MAC при approve, удаление владельца с магазинами, короткий новый пароль профиля |
| `401` | Неверные учётные данные, невалидный или просроченный токен, отозванная сессия, неверный текущий пароль |
| `403` | Ручка root вызвана менеджером, попытка удалить root |
| `404` | Нет администратора, владельца, магазина, терминала или заявки |
| `409` | Email администратора или владельца уже занят |

Неверный email и неверный пароль администратора дают один и тот же ответ `401` с текстом `Invalid email or password`.

## Команды разработки

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run db:seed
```

`prisma:migrate` — создание миграции в разработке. В контейнере применяется `prisma migrate deploy`.

## Ограничения первой версии

- Пути контроллеров: `/shop-owners`, `/shop`, `/terminal`. В исходном ТЗ они указаны во множественном числе (`/shops-owners`, `/shops`, `/terminals`).
- Смена учётных данных магазина — `PATCH /shop/:id`, а не `PATCH /shops/:id/credentials`. Ручка требует shop-токен. Проверки, что токен принадлежит магазину из `:id`, нет.
- `GET /terminal`, `PATCH /terminal/:id/status`, `POST /terminal/alive` и все ручки `/requests` сейчас без JWT.
- Heartbeat авторизуется только знанием MAC-адреса.
- Ручки создания заявки нет. Одобрить можно только уже существующую запись `TerminalRequest`.
- Повторный approve уже одобренной заявки возвращает заявку без обёртки `{ terminal, request }`.
- У `ChangePasswordDto` нет декораторов `class-validator`. Глобальный `ValidationPipe` с `whitelist` может отбросить `currentPassword` и `newPassword` до входа в сервис.
