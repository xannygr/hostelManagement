# HostelHaven

Дашборд управления хостелами: Next.js 16 (frontend) и Strapi 5 CMS (REST API + PostgreSQL).

## Структура

```
.
├── frontend/          # Next.js 16 + Tailwind приложение
│   ├── app/           # App Router: маршруты + auth-guard layout
│   ├── proxy.ts       # Security-заголовки (CSP report-only, nosniff, frame DENY, ...)
│   └── src/
│       ├── api.ts     # Клиент к Strapi REST API (JWT + нормализация, пагинация)
│       ├── context/   # AuthContext (логин) + DataContext (React Query)
│       ├── views/     # Страницы (Dashboard, Login, HostelDetail, ...)
│       ├── components/
│       ├── types/     # Общие типы Hostel, Room, Guest, Payment
│       └── utils/     # Хелперы расчётов (+ тесты)
└── cms/               # Strapi 5 (TypeScript + PostgreSQL)
    ├── src/api/       # Content-types + контроллеры с бизнес-валидацией
    ├── src/index.ts   # Bootstrap: seed данных + роли (Administrator / Authenticated)
    └── data/mock.json # Демо-данные (импортируются при первом запуске)
```

## Запуск

Из корня проекта:

```bash
npm install              # корневые инструменты (concurrently)
npm --prefix frontend install
npm --prefix cms install
```

PostgreSQL поднимается в Docker (`postgres:16-alpine`, БД `hostelhaven`):

```bash
docker compose up -d db
```

Запустить оба процесса (Strapi :1337 + фронтенд :3000):

```bash
npm run dev
```

Или по отдельности:

```bash
npm run dev:cms          # Strapi на http://localhost:1337 (admin панель)
npm run dev:frontend     # Next.js на http://localhost:3000 (rewrites /api на 1337)
```

## Первый запуск

1. Откройте http://localhost:3000 — попадёте на страницу входа.
2. Войдите под `admin@hostel.com` / `admin123` (учётная запись администратора).
   Публичная регистрация закрыта: новые аккаунты создаются через админ-панель Strapi
   (роль `Administrator` или read-only `Authenticated`).
3. Данные автоматически импортируются из `cms/data/mock.json` при первом
   старте Strapi (если БД пуста).

## API

Strapi REST API (все запросы кроме auth требуют `Authorization: Bearer <jwt>`):

| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/api/auth/local` | Вход (регистрация закрыта) |
| POST | `/api/auth/change-password` | Смена пароля (вкладка Security в настройках) |
| GET | `/api/hostels` | Список хостелов |
| GET | `/api/rooms` | Список комнат |
| GET | `/api/guests` | Список гостей |
| GET | `/api/payments` | Список платежей |
| GET | `/api/metrics/hostels` | Серверные метрики по хостелам (занятость, доход, долги) |
| POST/PUT/DELETE | `/api/{collection}/:documentId` | CRUD |

Производные значения (занятость, доход, долги) не хранятся в БД. На дашборде
они считаются на сервере (`/api/metrics/hostels`), для остальных экранов —
на клиенте из отношений и платежей. Данные на фронтенде грузятся через
React Query (`DataContext`) с пагинацией по всем страницам; ошибки мутаций
показываются пользователю всплывающими уведомлениями.

## Бизнес-валидация (серверная, в контроллерах Strapi)

- Платёж обязан быть привязан к гостю (`payment/controllers`).
- Дата выезда не раньше даты заезда (`guest/controllers`).
- Комната должна относиться к указанному хостелу.
- Нельзя заселить больше активных гостей, чем кроватей в комнате.

## Безопасность

- **Роли:** `Administrator` (полный CRUD + `users/me`, `change-password`) и
  `Authenticated` (только чтение). Назначаются в `cms/src/index.ts` (bootstrap).
- **Регистрация закрыта** (`allow_register = false`), пароль минимум 8 символов.
- JWT живёт 7 дней, rate-limit входа 30 запросов/мин (см. `cms/config/plugins.ts`).
- `frontend/proxy.ts` добавляет security-заголовки: `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `COOP`,
  CSP в report-only. Пути `/api` и `/uploads` проксируются на Strapi без изменений.
- Strapi медиа-политики: только image/video/audio/pdf/office/text/csv,
  исполняемые типы (`exe`, `shell`, `mach-binary`) запрещены.

## Проверка

```bash
npm test                   # 31 jest-тестов против Strapi API (Postgres)
npm --prefix frontend test # 4 unit-теста хелперов (vitest)
npm run lint               # oxlint фронтенда
npm --prefix frontend run build
```

## Системный дизайн

Архитектура и решения описаны в [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md).
