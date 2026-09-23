# Гараж — учёт обслуживания и трат на автомобиль

Nuxt 3 + TypeScript + Tailwind + Drizzle (SQLite) + nuxt-auth-utils.

Реализовано в этой версии (v1, по этапам 1–3 из ТЗ):

- Авторизация (регистрация/логин/логаут, сессии на куках).
- CRUD автомобилей, список, карточка авто, приглашение участников по email.
- Журнал записей: создание/просмотр/редактирование/удаление, фильтры по типу/категории/датам, сортировка по дате/пробегу.
- Категории (сидятся по умолчанию).
- Напоминания: создание/редактирование/удаление, привязка к последней записи журнала (авто-расчёт следующей даты/пробега по интервалу), статусы «скоро/просрочено/ок», бейдж-уведомление на карточке авто.
- PWA: манифест и свой service worker (`@vite-pwa/nuxt`, `service-worker/sw.ts`), браузер предлагает установить приложение на главный экран; иконки сгенерированы из `public/logo.svg`.
- Push-уведомления о напоминаниях (Web Push, VAPID): включаются кнопкой на странице «Мои автомобили». Проверка идёт раз в день в 09:00 МСК (Nitro scheduled task) и сразу после записи с новым пробегом. Одно уведомление на каждый статус «скоро»/«просрочено» по каждому сроку.

Пока не реализовано (следующие этапы): аналитика/графики, вложения к записям.

## Запуск локально

1. Установить зависимости:

   ```bash
   npm install
   ```

2. Скопировать `.env.example` в `.env` и задать `NUXT_SESSION_PASSWORD` (любая случайная строка от 32 символов):

   ```bash
   cp .env.example .env
   ```

   Для push-уведомлений сгенерировать VAPID-ключи и вписать их в `NUXT_PUBLIC_VAPID_PUBLIC_KEY` / `NUXT_VAPID_PRIVATE_KEY` (без них push просто отключён):

   ```bash
   npx web-push generate-vapid-keys
   ```

3. Сгенерировать и применить миграции БД:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Засеять дефолтные категории:

   ```bash
   npm run db:seed
   ```

5. Прогнать тесты (Vitest — юнит-тесты логики и Zod-схем + интеграционные тесты API через реальный dev-сервер):

   ```bash
   npm test
   ```

6. Запустить dev-сервер:

   ```bash
   npm run dev
   ```

Приложение будет доступно на http://localhost:3000. Первый экран — регистрация, после неё сразу открывается список автомобилей.

## Структура

```
server/
  api/          — Nitro API-роуты (auth, cars, entries, reminders, categories)
  database/     — схема Drizzle, миграции, seed
  tasks/        — reminders/notify.ts — ежедневная задача рассылки push о напоминаниях
  utils/        — access.ts (проверка доступа к авто), reminderDue.ts (расчёт next due), push.ts (Web Push)
service-worker/ — sw.ts — service worker (прекэш + обработка push/кликов по уведомлениям)
shared/
  schemas/      — Zod-схемы (общие для фронта и бэка)
  types.ts      — TS-типы сущностей для фронта
  utils/        — reminderStatus.ts — расчёт статуса напоминания (скоро/просрочено/ок)
pages/          — экраны (login, register, cars, cars/[id], cars/[id]/entries, cars/[id]/reminders)
components/     — CarForm, EntryForm, EntryJournal, ReminderForm, ReminderList, PushSettings
composables/    — useCars, useEntries, useReminders, useCategories, usePush
middleware/     — auth.ts — редиректы неавторизованных
```

## Тесты

`npm test` (Vitest) — юнит-тесты чистой логики (`computeNextDue`, `getReminderStatus`, Zod-схемы), тест `requireCarAccess`/`notifyDueReminders` на временной SQLite-БД и интеграционные тесты API (`tests/integration/api.test.ts`) через реальный dev-сервер (`@nuxt/test-utils/e2e`). `npm run typecheck` гоняется отдельно (см. `CLAUDE.md`). E2E в браузере (Playwright) пока не настроен — следующая задача.

## Известные ограничения этой версии

- Вложения (фото чеков) и аналитика — не реализованы, это следующие этапы по ТЗ.
- Push на iPhone работает только в установленном на экран «Домой» приложении (iOS 16.4+), в обычной вкладке Safari — нет. Нужен HTTPS (локально — `localhost`).
- Push о просроченном напоминании приходит один раз; повторных «напоминаний о напоминании» нет, пока срок не продлят.
- Мультивалютность не поддерживается (валюта хранится в записи, но конвертации нет — как и заявлено в ТЗ).
