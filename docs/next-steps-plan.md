# Dragon Dice — План следующих шагов

> После аудита и фикса 36 из 41 issues. Остаётся 5 open issues + задачи из GDD.

---

## Шаг 1: Rate Limiting (SEC-H3)

**Приоритет**: Высокий — единственная оставшаяся HIGH-уязвимость.
**Оценка**: 2-3 часа

### Варианты

| Вариант | Плюсы | Минусы |
|---|---|---|
| **Upstash Redis + @upstash/ratelimit** | Работает в serverless, простой API | Внешний сервис, $0.5/мес |
| **Next.js middleware + in-memory Map** | Бесплатно, просто | Не работает в serverless (per-instance) |
| **Supabase Edge Functions** | Рядом с БД | Другой runtime, сложнее деплой |

### Рекомендация

Upstash — лучший вариант для serverless (Vercel). Один `middleware.ts`:

```
POST /api/rooms         → 5 req/min per IP (создание комнат)
POST /api/rooms/*/roll  → 20 req/min per IP (игровые действия)
POST /api/rooms/*/score → 20 req/min per IP
GET  /api/rooms/*       → 30 req/min per IP (чтение)
```

### Задачи

- [ ] Создать Upstash Redis instance
- [ ] Установить `@upstash/ratelimit` и `@upstash/redis`
- [ ] Создать middleware.ts с rate limiting по route patterns
- [ ] Добавить env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Тест: проверить что лимиты работают

---

## Шаг 2: COPPA Compliance (SEC-M2)

**Приоритет**: Высокий для продакшена. Блокирует публикацию в App Store / Google Play.
**Оценка**: 1-2 дня (разработка) + юридическая проверка

### Задачи

- [ ] Privacy Policy page (статическая страница)
- [ ] Terms of Service page
- [ ] Раздел «Для родителей» (описание покупок и механик)
- [ ] Предупреждение не использовать реальные имена
- [ ] Минимизация данных: отключить Supabase analytics для детских сессий
- [ ] Data retention policy: автоудаление данных через 90 дней неактивности
- [ ] Родительский гейт перед IAP (реализовать при добавлении монетизации)
- [ ] Age gate или верификация возраста через Dragon Family

---

## Шаг 3: Client-side State Reconciliation (SEC-M3)

**Приоритет**: Средний — broadcast spoofing mitigated, но UI может показать мусор.
**Оценка**: 3-4 часа

### Подход

- При получении broadcast-события сравнивать с ожидаемым состоянием
- Если данные подозрительные → fetch текущее состояние с сервера
- Добавить endpoint `GET /api/rooms/[code]/state` для полной синхронизации

### Задачи

- [ ] Создать `GET /api/rooms/[code]/state` — возвращает полное game state
- [ ] В `useGameChannel`: добавить валидацию входящих событий
- [ ] При расхождении — refetch с сервера
- [ ] Периодический heartbeat sync каждые 30 секунд

---

## Шаг 4: Observability (SEC-L1 + operations)

**Приоритет**: Средний — нужно до масштабирования.
**Оценка**: 2-3 часа

### Задачи

- [ ] Заменить console.error на structured logger (pino / winston)
- [ ] Добавить request logging middleware
- [ ] Настроить error tracking (Sentry)
- [ ] Добавить health check endpoint
- [ ] Метрики: active rooms, concurrent players, game completion rate

---

## Шаг 5: Подготовка к монетизации (из GDD фаза 2)

**Приоритет**: Критичный для бизнеса.
**Оценка**: 2-3 недели

### Блок 1: Интеграция с Dragon Family (1 неделя)

- [ ] Deep link приём user_id, subscription_status, display_name
- [ ] Fallback на anonymous auth если нет Dragon Family
- [ ] API для начисления монет Dragon Family
- [ ] Проверка статуса подписки

### Блок 2: Энерджи-система + Rewarded Ads (3-5 дней)

- [ ] Таблица `player_energy` (session_id, last_free_game_at, ad_views_today)
- [ ] Middleware проверки энергии перед стартом игры
- [ ] Интеграция COPPA-compliant рекламной сети
- [ ] Родительский гейт перед первой рекламой в сессии
- [ ] UI: экран "нет энергии" с опциями (реклама / подписка)

### Блок 3: Драконий календарь (2-3 дня)

- [ ] Таблица `daily_rewards` (user_id, streak_count, last_claim_at, freeze_count)
- [ ] API: claim daily reward, check streak, use freeze
- [ ] UI: экран календаря с визуализацией наград
- [ ] Интеграция с Dragon Family (начисление монет)

### Блок 4: Косметика (2-3 дня)

- [ ] Таблица `player_inventory` (user_id, item_id, purchased_at)
- [ ] Каталог скинов (JSON/DB)
- [ ] UI: выбор скина кубиков, фона
- [ ] Визуализация скинов в игре

---

## Порядок выполнения

```
Шаг 1 (Rate Limiting)     ← 2-3 часа, закрывает последний HIGH
  ↓
Шаг 2 (COPPA basics)      ← Параллельно с шагом 3
Шаг 3 (State reconcile)   ← Параллельно с шагом 2
  ↓
Шаг 4 (Observability)     ← Перед масштабированием
  ↓
Шаг 5 (Монетизация)       ← Основная работа, 2-3 недели
```
