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

`POST /terminal/alive` принимает MAC-адрес уже существующего терминала, ставит статус `ACTIVE` и обновляет `lastHeartbeatAt`. Неизвестный MAC возвращает `404` и запись не создаёт. Ответ — только поля терминала, без данных магазина. Ручка без токена: её вызывает сам терминал.

Список, карточка и ручная смена статуса терминала, а также все ручки `/requests` требуют access-токен администратора. Ручная смена статуса: `PATCH /terminal/:id/status` с телом `{ "status": "ACTIVE" }` или `{ "status": "INACTIVE" }`.

Одобрение заявки создаёт терминал с этим MAC или обновляет существующий терминал того же магазина и переводит заявку в `APPROVED`. MAC уникален. Если MAC уже принадлежит другому магазину, approve возвращает `400`.

## API

Базовый URL локально: `http://localhost:3000`. Тело запросов — JSON. Идентификаторы — UUID. Лишние поля тела отклоняются (`400`).

Роли в таблице:

- **public** — без токена.
- **admin** — access-токен администратора (`ROOT` или `MANAGER`).
- **root** — access-токен администратора с ролью `ROOT`.
- **shop** — access-токен магазина.

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
| `GET` | `/terminal` | admin | — | массив терминалов с кратким `shop` |
| `GET` | `/terminal/:id` | admin | — | терминал с кратким `shop` |
| `PATCH` | `/terminal/:id/status` | admin | `status`: `ACTIVE` \| `INACTIVE` | терминал с кратким `shop` |
| `POST` | `/terminal/alive` | public | `macAddress` | терминал со статусом `ACTIVE`, без магазина |
| `GET` | `/requests` | admin | — | массив заявок с кратким `shop` |
| `PATCH` | `/requests/:id/approve` | admin | `macAddress` | `{ terminal, request }` или сама заявка, если она уже `APPROVED` |
| `PATCH` | `/requests/:id/reject` | admin | — | заявка со статусом `REJECTED` |
| `POST` | `/requests/:id/comment` | admin | `comment` | заявка с новым комментарием |
| `PATCH` | `/profile/password` | admin | `currentPassword`, `newPassword` | `{ "success": true }` |

Карточка администратора: `id`, `name`, `email`, `role` (`ROOT` \| `MANAGER`), `createdAt`, `updatedAt`. Поля `passwordHash` в ответах администратора и магазина нет. В ответе login/refresh поля `createdAt` и `updatedAt` тоже нет.

Карточка магазина: `id`, `ownerId`, `name`, `address`, `requisites`, `login`, `createdAt`, `updatedAt`. В ручках `/shop` дополнительно вложен `owner`. В списке владельцев вложенный магазин содержит те же поля, без хеша пароля. У терминала и заявки вложенный `shop` — только `id`, `ownerId`, `name`, `createdAt`, `updatedAt`, без адреса, реквизитов и логина.

Карточка владельца: `id`, `firstName`, `lastName`, `phone`, `email`, `address`, `createdAt`, `updatedAt`.

Терминал: `id`, `shopId`, `macAddress`, `status` (`ACTIVE` \| `INACTIVE`), `lastHeartbeatAt`, `createdAt`, `updatedAt`. В списке, карточке и смене статуса вложен краткий `shop`. Heartbeat возвращает терминал без `shop`.

Заявка: `id`, `shopId`, `macAddress`, `status` (`PENDING` \| `APPROVED` \| `REJECTED`), `comment`, `createdAt`, `updatedAt`. В списке и в approve вложен краткий `shop`.

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
