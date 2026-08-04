# HostelHaven — Системный дизайн

Версия: 3.0 · Обновлено: 2026-08-02

## 1. Обзор

HostelHaven — веб-панель управления сетью хостелов. Позволяет управлять
хостелами, комнатами, гостями и платежами, отслеживать занятость, долги и
рассылать SMS-напоминания.

### Технологический стек

| Слой | Технологии |
| --- | --- |
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS 4, React Query (`@tanstack/react-query`) |
| Backend / CMS | Strapi 5 (TypeScript), REST API, users-permissions (JWT auth) |
| СУБД | PostgreSQL 16 (Docker, `hostelhaven-db`) |
| Deploy | Docker Compose (cms :1337, frontend :3000) |
| Тесты | Jest + Supertest (интеграционные, против Strapi), Vitest (unit-тесты хелперов) |

## 2. Архитектура

Два сервиса, запускаемых из корня (`npm run dev` через `concurrently`):

```
┌─────────────┐      /api, /uploads (rewrite)    ┌──────────────────┐
│  Frontend    │ ◄────────────────────────────► │  Strapi (CMS +   │
│  Next.js 16  │    http://localhost:3000        │  REST API + Auth)│
│  :3000       │          /api/*                 │  :1337           │
└──────┬──────┘                                 └───────┬──────────┘
       │                                               │  PostgreSQL
       │                                             ┌─▼───────────┐
       │                                             │ hostelhaven  │
       │                                             └─────────────┘
```

### Ключевые решения
- **Strapi — единый источник данных**: хранение, REST API, валидация, аутентификация.
- **JWT-авторизация**: users-permissions; публичная регистрация закрыта. Роль
  `Administrator` (admin@hostel.com) имеет полный CRUD; `Authenticated` — только
  чтение; `Public` прав не имеет.
- **React Query как слой данных**: `DataContext` грузит 4 коллекции пагинацией
  (блоками по 500), единообразно нормализует и предоставляет мутации с
  автоматической инвалидацией кэша (`invalidateQueries`).
- **Производные значения не хранятся** — вычисляются при нормализации из
  отношений (связей) и платежей, единый источник истины.
- **Серверная бизнес-валидация** — в контроллерах Strapi (даты, капасити комнат,
  соответствие hostel/room, обязательный гость у платежа).

## 3. Модель данных (Strapi content-types)

Сущности и связи:

```
Hostel 1 ──── n Room
Hostel 1 ──── n Guest
Room   1 ──── n Guest
Guest  1 ──── n Payment
```

Все content-types: `draftAndPublish: false`, находятся в `cms/src/api/*/content-types/*/schema.json`.

### 3.1 Hostel
| Поле | Тип | Правила |
| --- | --- | --- |
| `name` | string | required, min 2 |
| `address` | string | required, min 3 |
| `floors` | integer | опционально, min 1 |
| `kitchens` | integer | опционально, min 0 |
| `parking` | string | опционально (напр. «Большая парковка») |
| `showers` | integer | опционально, min 0 |
| `toilets` | integer | опционально, min 0 |
| `image` | media (single) | изображения |
| `rooms` | relation oneToMany → Room | mappedBy `hostel` |
| `guests` | relation oneToMany → Guest | mappedBy `hostel` |

### 3.2 Room
| Поле | Тип | Правила |
| --- | --- | --- |
| `number` | string | required |
| `floor` | integer | required |
| `beds` | integer | required, 1..100 |
| `type` | enumeration | standard / economy / vip |
| `pricePerBed` | integer | required, min 0 |
| `hasBalcony` | boolean | default false |
| `hasPrivateBathroom` | boolean | default false |
| `photos` | media (multiple) | изображения |
| `hostel` | relation manyToOne → Hostel | inversedBy `rooms` |
| `guests` | relation oneToMany → Guest | mappedBy `room` |

### 3.3 Guest
| Поле | Тип | Правила |
| --- | --- | --- |
| `name` | string | required, min 2 |
| `phone` | string | required |
| `email` | email | опционально |
| `passport` | string | опционально |
| `checkIn`, `checkOut` | date | required |
| `status` | enumeration | active / checked_out / reserved |
| `hostel` | relation manyToOne → Hostel | inversedBy `guests` |
| `room` | relation manyToOne → Room | inversedBy `guests` |
| `payments` | relation oneToMany → Payment | mappedBy `guest` |

### 3.4 Payment
| Поле | Тип | Правила |
| --- | --- | --- |
| `amount` | integer | required, min 0 |
| `dueDate` | date | required |
| `paidDate` | date | опционально |
| `type` | enumeration | cash / card / transfer |
| `status` | enumeration | paid / pending / overdue |
| `smsSent` | boolean | default false |
| `guest` | relation manyToOne → Guest | inversedBy `payments` |

> **Производные поля** (не хранятся в Strapi, вычисляются в `frontend/src/api.ts`
> при нормализации): `Hostel.totalRooms/totalBeds/occupiedBeds/monthlyRevenue`,
> `Room.occupiedBeds`, `Guest.totalPaid/totalDue`, `Payment.guestName/roomId`.

## 4. API (Strapi REST)

Все запросы требуют заголовок `Authorization: Bearer <jwt>` (кроме `auth`).

### Auth (users-permissions)
| Метод | Путь | Описание |
| --- | --- | --- |
| POST | `/api/auth/local` | Вход (identifier/password) → `{ jwt, user }` (регистрация закрыта) |
| GET | `/api/users/me` | Текущий пользователь |
| POST | `/api/auth/change-password` | Смена пароля |

### Content API
| Метод | Путь | Описание |
| --- | --- | --- |
| GET | `/api/hostels?populate=image` | Список хостелов |
| GET | `/api/rooms?populate[hostel]=true` | Комнаты + хостел |
| GET | `/api/guests?populate[hostel]=true&populate[room]=true` | Гости + связи |
| GET | `/api/payments?populate[guest][populate][room]=true` | Платежи + гость + комната |
| GET | `/api/metrics/hostels` | Серверные метрики по хостелам (кастомный контроллер `hostel.stats`) |
| POST / PUT / DELETE | `/api/{collection}/:documentId` | CRUD |

Параметры: `pagination[page]` / `pagination[pageSize]` (фронтенд грузит все страницы
блоками по 500 через `fetchAllPages`), `filters[...]`, `populate[...]`.

### Безопасность и валидация
- **Роли** (настраиваются в `cms/src/index.ts`, `seedPermissions`):
  - `Administrator` (тип `admin`, пользователь `admin@hostel.com`) — полный CRUD
    на все 4 типа + `users/me` + `change-password`;
  - `Authenticated` — только чтение (find/findOne);
  - `Public` — прав нет, только вход.
- **Регистрация закрыта**: `plugin::users-permissions` store `allow_register = false`;
  `POST /api/auth/local/register` → `400 Register action is currently disabled`.
- **Серверная бизнес-валидация** (в контроллерах `cms/src/api/*/controllers`):
  - платёж обязан иметь гостя (`payment`);
  - `checkOut >= checkIn`, комната из того же хостела, что и гость, число активных
    гостей не превышает `beds` комнаты (`guest`).
  - `ctx.badRequest` не бросает исключение — валидатор возвращает `message | null`.
- Ошибки структурированы (`403 Forbidden`, `400 Validation`, `404 Not Found`).

## 5. Frontend

### Поток данных
```
AuthProvider (JWT + user в localStorage)
  └── DataProvider (React Query, QueryClientProvider в providers.tsx)
        ├── query "all-data" (enabled: !user? false : true)
        │     └── fetchAllPages → 4 коллекции блоками по 500 → единая нормализация
        ├── query "stats" → GET /metrics/hostels (агрегаты для дашборда)
        ├── мутации → invalidateQueries(all-data + stats); ошибки/успех — тосты
        └── 401 → авто-логаут; retry-кнопка → refetch() без перезагрузки страницы
```

- **`api.ts`**: единый клиент Strapi. `request()` добавляет Bearer-токен,
  парсит `{ error: { message } }` в человекочитаемые ошибки, нормализует
  Strapi-ответы (в v5 отношения приходят напрямую, не в `data`) в плоские
  типы `Hostel | Room | Guest | Payment`. `fetchAllPages` перебирает все страницы.
  Массовые операции параллелятся: комнаты хостела — `Promise.all`,
  смена цен — `fetchRoomsByHostel` (по фильтру) + параллельные PUT.
- **`AuthContext`**: login/logout, токен + user в localStorage (без `register`).
- **`DataContext`**: обёртка над React Query — `useData()` отдаёт состояние +
  мутации, `refetch` для повторной загрузки. Мутации показывают результат
  тостами (`Toasts`): ошибка/успех, авто-скрытие через 6с.
- **Метрики дашборда** — серверные (`/api/metrics/hostels`), фолбэк на клиентские
  вычисления при активных фильтрах (даты/хостел).
- **Вычисляемые данные** (`utils/helpers.ts`): занятость, долги, даты — с
  unit-тестами (`helpers.test.ts`, Vitest).

### Маршруты (Next.js App Router)
| Путь | Страница | Доступ |
| --- | --- | --- |
| `/` | Dashboard | auth |
| `/hostels`, `/hostel/:id`, `/room/:id` | Хостелы | auth |
| `/guests`, `/guest/:id` | Гости | auth |
| `/payments` | Оплаты | auth |
| `/sms` | SMS | auth |
| `/settings` | Настройки | auth |

Неавторизованные пользователи видят страницу `Login` (только вход — регистрация убрана);
отдельного маршрута `/login` нет — guard в `app/(dashboard)/layout.tsx`.
`frontend/proxy.ts` (Next 16 middleware) добавляет security-заголовки и исключает `/api`, `/uploads`.

## 6. Seed (демо-данные)

`cms/src/index.ts` (`bootstrap`):
1. **`seedPermissions`** — роли: `Administrator` (полный CRUD, `users/me`,
   `change-password`) для admin@hostel.com; `Authenticated` — read-only; закрывает
   публичную регистрацию (`allow_register = false`).
 2. **`seed`** — если БД пуста, импортирует `cms/data/mock.json`:
    - создаёт хостелы → комнаты → гостей → платежи с корректными связями;
    - скачивает фотографии комнат (URL из mock.json), загружает их в media Strapi и привязывает к комнатам (кэширование по URL, дедупликация);
    - идемпотентно (пропускается, если хостелы уже есть).

## 7. Деплой и окружение

### Docker Compose
| Сервис | Порт (host:container) | Зависимости |
| --- | --- | --- |
| db | `5432:5432` | — |
| cms | `1337:1337` | depends_on db |
| frontend | `3000:80` | depends_on cms |

### Локальный запуск
```bash
npm install && npm --prefix frontend install && npm --prefix cms install
docker compose up -d db       # PostgreSQL 16 (hostelhaven-db)
npm run dev                   # Strapi :1337 + frontend :3000 (через concurrently)
npm run dev:cms               # только Strapi
npm test                      # jest-тесты (в tests/) против Strapi
npm run lint                  # oxlint фронтенда
npm --prefix frontend test    # vitest unit-тесты хелперов
npm --prefix frontend run build
```

Первый запуск: войдите как `admin@hostel.com` / `admin123` (администратор).
Публичная регистрация закрыта — новые пользователи создаются через админ-панель
Strapi (`http://localhost:1337/admin`). Данные сидируются автоматически из
`cms/data/mock.json`, если БД пуста.

## 8. Известные ограничения и пути развития

| Ограничение | Рекомендация |
| --- | --- |
| JWT без refresh-токена | Настроить refresh/rotation токенов (users-permissions) |
| Метрики дашборда без фильтров по датам | Параметризовать `/api/metrics/hostels` (month/from/to) |
| Пагинация на клиенте (блоками по 500) | Серверная пагинация с виртуализацией/бесконечным скроллом |
| Read-only роль у обычных пользователей | Ввести роль менеджера с CRUD по своему хостелу |
| E2E только скриптами против Strapi | Playwright против :3000 (через Next-прокси) |
