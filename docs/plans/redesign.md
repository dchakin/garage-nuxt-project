# План: редизайн «Гаража» по макету `design/garage.pen`

**PRD:** `docs/prd-implement-redesign-from-garage-pen.md` · **Порядок работы:** `docs/plans/redesign-workflow.md` · **Дата:** 2026-10-13

## Как читать план (и как из него делаются issues)

- Скилл `/issues` превращает каждый `### Этап N: …` в milestone с тем же названием, а каждую задачу — в issue: **жирная строка** → заголовок, вложенные пункты → тело, метки в `[…]` → `--label`. Ralph видит только тело issue и `docs/plans/conventions.md`, поэтому задачи написаны самодостаточно.
- Milestone обязан называться `Этап N: …`: Ralph (`ralph/lib/pick-issue.mjs`) сортирует задачи по `/Этап\s+(\d+)/`.
- Метка `decision` — задачу делаем интерактивно (Opus), Ralph её пропускает. Остальные — для Ralph. Метку `tests` не ставить: такие issue Ralph берёт вне очереди.
- **Ralph на экраны (этапы 6–11) запускать только после закрытия этапов 1–2**: `decision`-задачи не блокируют выбор, и Ralph иначе возьмёт экран без компонентов. API-этапы 3–5 от фундамента не зависят и могут идти параллельно с ним.
- **Макет:** экраны указаны именем фрейма в `design/garage.pen`. PNG лежат в `design/export/<код>.png` (код — часть имени до « · », например `Б1.png`, `Т1.png`, `Сценарий-2.png`), страницы дизайн-системы — `design/export/01.png` … `07.png`, `09.png`. Экспорт — шаг 2 `redesign-workflow.md`.
- **Эталонные данные** (тексты, суммы, даты для фикстуры и скриншотов) — раздел «Эталонные данные» в `docs/plans/design-ux-fixes.md`: Toyota Camry, «сейчас» = 10 окт 2026.
- **Общее для всех задач** (не повторяется в каждой): готовность = issue + `TZ.md`, тесты на новое поведение, зелёные `npm test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`. UI-задача — e2e-сценарий в `tests/e2e/` со `snap()` каждого затронутого экрана (390 px, светлая и тёмная). Новые роуты — `requireAuth` + `requireCarAccess` и тест 403 для постороннего. Новый контракт → строка в `conventions.md` в том же коммите. Лимиты: файл ≤ 250 строк, функция ≤ 40.

---

### Этап 1: Фундамент — токены, тема, шрифты, форматтеры, e2e

**Цель:** существующие экраны работают на токенах, шрифтах и иконках макета; есть `npm run test:e2e` со скриншотами в обеих темах.
**Когда готов:** `test:e2e` проходит и пишет скриншоты в `test-results/screens/`; unit-тесты форматтеров зелёные; в `conventions.md` описаны токены, тема, форматтеры, e2e.

- [x] **E2e-инфраструктура на Playwright** [decision, frontend] #29
  - Файлы: `playwright.config.ts` (корень), `tests/e2e/helpers/snap.ts`, `tests/e2e/helpers/auth.ts`, `tests/e2e/smoke.spec.ts`, скрипт `test:e2e` в корневом `package.json`, раздел «E2E» в `conventions.md`, `ralph/check.sh` (убрать ссылку на несуществующий #27).
  - Контракт: e2e гоняется по собранному приложению (`npm run build`, API раздаёт клиент из `NUXT_WEB_DIST_DIR`) на отдельной временной SQLite и своём порту. Viewport 390×844. `snap(page, name)` сохраняет `test-results/screens/<name>-light.png` и `<name>-dark.png` (тема переключается через `colorScheme` + класс `dark`, см. задачу темы; до неё — только light). Фиксированное «сейчас»: `page.clock.setFixedTime('2026-10-10T09:41:00+03:00')`.
  - Готово: `npm run test:e2e` проходит сценарий «регистрация → вход → список машин» и сохраняет скриншот; `ralph/check.sh` запускает его; `conventions.md` описывает запуск, `snap()`, БД и время.

- [x] **E2e-фикстура с эталонными данными макета** [decision] #30
  - Файлы: `tests/e2e/fixtures/seed.ts`, `tests/e2e/fixtures/reference.ts` (данные), `tests/e2e/fixtures/index.ts` (Playwright fixture `seededCar`).
  - Контракт: сид пишет напрямую в тестовую SQLite (через API нельзя задать произвольные `nextDueDate`/`nextDueMileage` и прошлые даты записей). Состав — ровно «Эталонные данные»: пользователи Дмитрий/Анна/Сергей (пароль общий, в `reference.ts`), Camry с 8 записями 2026 г. и 5 напоминаниями (одно выключено), Kia Rio, Lada Largus (Дмитрий — участник). Фикстура отдаёт `{ carId, users }` и залогиненную страницу.
  - Готово: тест на фикстуре проверяет, что `GET /api/cars/:id/entries` отдаёт 8 записей на 88 500 ₽; описание в разделе «E2E» `conventions.md`.

- [x] **Цветовые токены и Tailwind** [decision, frontend] #31
  - Макет: `01 · Цвет`, `03 · Пространство и движение` (`design/export/01.png`, `03.png`); значения — через Pencil MCP `GetVariables()` (ось `mode: light | dark`).
  - Файлы: `apps/web/assets/css/tokens.css` (CSS-переменные для `:root` и `.dark`), `apps/web/tailwind.config.ts` (цвета, радиусы `r-*`, отступы `sp-*`, тени, длительности `dur-*`/`ease-*` через `var(--…)`, `darkMode: 'class'`), `assets/css/main.css`, все текущие `components/*.vue` и `pages/**/*.vue` (замена `slate-*`/`indigo-*`/hex на токены).
  - Контракт: имена Tailwind-классов = имена токенов макета (`bg-surface`, `text-text`, `text-danger`, `bg-status-overdue`…). Цвет вне `tokens.css` — запрещён.
  - Готово: `grep` по `apps/web` не находит `slate-|indigo-|#[0-9a-f]{3,6}` вне `tokens.css`; e2e-скриншот списка машин; таблица токенов в `conventions.md`.

- [x] **Тема «Как в системе / Светлая / Тёмная» без вспышки** [decision, frontend] #32
  - Файлы: `apps/web/composables/useTheme.ts`, inline-скрипт в `app.head.script` (`nuxt.config.ts`), `apps/web/tests/useTheme.test.ts`, `tests/e2e/theme.spec.ts`.
  - Контракт: `useTheme()` → `{ mode: Ref<'system'|'light'|'dark'>, resolved: Ref<'light'|'dark'>, setMode }`; хранение — `localStorage['garage:theme']`; класс `dark` на `<html>` ставит inline-скрипт до монтирования; `<meta name="theme-color">` = токен фона текущей темы; при `system` следит за `prefers-color-scheme`.
  - Готово: unit-тест на выбор/хранение; e2e: выбор «Тёмная» переживает перезагрузку, `theme-color` меняется; `snap()` умеет обе темы.

- [ ] **Шрифты Onest / JetBrains Mono и иконки Lucide** [decision, frontend] #33
  - Макет: `02 · Типографика`, `04 · Иконки` (`design/export/02.png`, `04.png`).
  - Файлы: зависимости `@fontsource-variable/onest`, `@fontsource/jetbrains-mono`, `lucide-vue-next` в `apps/web/package.json`; шкала шрифтов в `tailwind.config.ts`; замена эмодзи во всех `components/*.vue`, `pages/**`, `layouts/default.vue`.
  - Контракт: шрифты — из бандла (свой origin, без CDN); у Onest `font-variant-numeric: tabular-nums` для чисел; `font-mono` = JetBrains Mono (госномер, VIN). Иконки — только компоненты `lucide-vue-next`, `plus` — только на кнопках добавления.
  - Готово: в `apps/web` нет эмодзи (проверка-скрипт `scripts/check-no-emoji.mjs` в `npm test` или vitest); сетевые запросы шрифтов в e2e — только на свой origin.

- [ ] **Функции форматирования дат, сумм, пробега и остатка** [decision, frontend] #34
  - Файлы: `packages/shared/utils/format.ts`, `packages/shared/utils/reminderRemaining.ts`, `packages/shared/tests/format.test.ts`, `packages/shared/tests/reminderRemaining.test.ts`; замена всех мест вывода в `apps/web`.
  - Контракт: `formatDate('2026-09-12') → '12 сент'` (год только если не текущий), `formatMoney(6800) → '6 800 ₽'`, `formatMileage(87450) → '87 450 км'`, разделитель — неразрывный пробел ` `; `averageKmPerMonth(entries)`; `formatReminderRemaining(reminder, { currentMileage, today, avgKmPerMonth })` → `'Через 750 км'`, `'Просрочено на 39 дней'`, `'Через 12 550 км, ≈ 10 мес'`. Статус — только через `getReminderStatus` (`reminderStatus.ts`), без второй реализации.
  - Готово: unit-тесты на все примеры из «Эталонных данных» (в т. ч. склонения «день/дня/дней»); в `apps/web` нет `toLocaleString`/ручного форматирования; контракты в `conventions.md`.

### Этап 2: Компоненты UI-кита

**Цель:** все компоненты фреймов 05–07 — переиспользуемые Vue-компоненты на токенах.
**Когда готов:** компонентные тесты зелёные; `conventions.md` перечисляет компоненты и их props.

Общий контракт этапа: компоненты лежат в `apps/web/components/ui/` и используются как `<Ui…>` (авто-импорт Nuxt с префиксом каталога); тесты — `apps/web/tests/ui/*.test.ts` (`@vue/test-utils`, happy-dom); каждый компонент показан на e2e-странице-витрине `pages/dev/ui.vue` (только в dev и e2e, без `middleware`), с `snap('ui-<группа>')`.

- [ ] **Кнопки, поля и элементы выбора** [decision, frontend] #35
  - Макет: `05 · Компоненты: действия и ввод` (`design/export/05.png`).
  - Файлы: `components/ui/Button.vue` (`variant: 'primary'|'secondary'|'tonal'|'danger'|'text'`, `icon?`, `disabled`, `loading`), `IconButton.vue`, `Field.vue` (`label`, `suffix`, `hint`, `error`, `v-model`), `Textarea.vue`, `AmountField.vue`, `SearchField.vue`, `Chip.vue` (`icon?`, `selected`), `Segmented.vue` (`options`, `v-model`), `Toggle.vue`, `TypeOption.vue`; удалить `.btn-*` из `main.css`, заменить использования.
  - Готово: тесты — ошибка поля показывается вместо подсказки и ставит `aria-invalid`; выбор в Segmented/Chip эмитит `update:modelValue`; disabled-кнопка не кликается.

- [ ] **Бейджи, строки, карточки, заголовки** [decision, frontend] #36
  - Макет: `06 · Компоненты: данные` (`design/export/06.png`).
  - Файлы: `components/ui/TypeBadge.vue` (по `EntryType`), `StatusBadge.vue` (по `ReminderStatus`: цвет + иконка + слово из `reminderStatusLabels`), `Counter.vue`, `Avatar.vue`, `Plate.vue` (моно), `Spinner.vue` (заменяет `components/Spinner.vue`), `Progress.vue`, `Card.vue`, `RowEntry.vue`, `RowSetting.vue`, `RowKeyValue.vue`, `RowCar.vue`, `RowToggle.vue`, `MonthHeader.vue`, `SectionHeader.vue`, `ReminderCard.vue`.
  - Контракт: строки внутри `UiCard` с разделителем сверху, у первой — без него (CSS `:first-child`). `ReminderCard` принимает `reminder`, `currentMileage`, `avgKmPerMonth` и сам считает статус/остаток через shared-утилиты; эмитит `done` («Сделал») и `open`.
  - Готово: тесты — StatusBadge для каждого статуса; ReminderCard для эталонных напоминаний показывает «Просрочено на 250 км» и «Через 8 дней».

- [ ] **Графики, скелетоны, переключатель периода** [decision, frontend] #37
  - Макет: `06 · Компоненты: данные` — группы «Графики», «Загрузка».
  - Файлы: `components/ui/ColumnChart.vue` (chart.js), `CategoryBar.vue`, `MiniBars.vue`, `Skeleton.vue` (`variant: 'line'|'card'|'row'`), `PeriodSwitcher.vue` (`label`, `canPrev`, `canNext`, emits `prev`/`next`).
  - Готово: тесты — неактивная стрелка не эмитит событие; CategoryBar рисует доли из props; цвета графиков читаются из CSS-переменных (переключаются с темой).

- [ ] **Навигация и оверлеи: AppBar, TabBar, Sheet, Dialog, Toast, Alert, EmptyState** [decision, frontend] #38
  - Макет: `07 · Компоненты: навигация и оверлеи` (`design/export/07.png`), анимации — `09 · Анимации`.
  - Файлы: `components/ui/AppBar.vue` (`variant: 'car'|'back'`, слоты), `TabBar.vue` (`active`, `badge`, emits `add`), `Sheet.vue` (`v-model:open`, `title`, слот тела, слот кнопки; закрытие по скриму/Esc/свайпу), `Dialog.vue`, `Toast.vue` + `composables/useToast.ts` (`show({ message, icon?, action?: { label, onClick }, duration = 5000 })`), `Alert.vue` (`variant: 'error'|'warning'|'success'|'info'`), `EmptyState.vue`, `ReminderBridge.vue` (Bridge/Reminder), `Disclosure.vue`; `<Transition>`-имена из фрейма `09`; `prefers-reduced-motion` отключает анимации. Заменить `ConfirmDialog.vue`/`useConfirmDialog.ts` на `UiDialog`.
  - Готово: тесты — Sheet открывается/закрывается и возвращает фокус; Toast с действием вызывает `onClick` и исчезает по таймеру (fake timers); TabBar при `badge = 0` бейдж не рендерит; контракты в `conventions.md`.

### Этап 3: API — записи, напоминания, пробег

**Цель:** серверная логика для «Сделал», мастера первого запуска, обновления пробега и подписи автора.
**Когда готов:** `npm test` зелёный; роуты в `CLAUDE.md` (Architecture) и `conventions.md`.

- [ ] **Записи отдаются с автором** [backend] #39
  - Файлы: `apps/api/server/api/cars/[id]/entries.get.ts`, `entries/[id].get.ts`, `entries.post.ts`, `entries/[id].patch.ts`; `packages/shared/types.ts` (`Entry.author: { id: number; name: string }`); `apps/api/tests/integration/entries.test.ts`.
  - Контракт: каждая запись в ответе содержит `author: { id, name }` (из `entries.authorId` → `users`). Email автора не отдаётся.
  - Готово: интеграционный тест — запись участника в списке владельца отдаётся с именем участника.

- [ ] **Закрытие напоминания записью (`reminderId`)** [backend] #40
  - Файлы: `packages/shared/schemas/entry.ts` (`reminderId?: number`), `apps/api/server/api/cars/[id]/entries.post.ts`, `server/utils/reminderDue.ts`, `server/utils/push.ts`; тесты `apps/api/tests/integration/entries-reminder.test.ts`.
  - Контракт: `POST /api/cars/[id]/entries` с `reminderId` (напоминание той же машины, иначе 400) ставит `reminders.lastEntryId` = новая запись, пересчитывает `nextDueDate`/`nextDueMileage` через `computeNextDue` и удаляет строки `reminder_notifications` этого напоминания. Ответ — запись + `reminder` (обновлённое).
  - Готово: тесты — просроченное после закрытия не `overdue`; push по новому сроку уходит снова (дедупликация сброшена); чужой `reminderId` → 400; посторонний → 403.

- [ ] **Тип срабатывания вычисляется сервером; выключенные не шлют push** [backend] #41
  - Файлы: `packages/shared/schemas/reminder.ts` (убрать `triggerType` из входа, вывести из `intervalKm`/`intervalMonths`), `apps/api/server/api/cars/[id]/reminders.post.ts`, `reminders/[id].patch.ts`, `server/utils/push.ts` (`notifyDueReminders` фильтрует `isActive = true`); тесты.
  - Контракт: `deriveTriggerType({ intervalKm, intervalMonths })` в `packages/shared/utils/reminderTrigger.ts`; колонка `trigger_type` остаётся и заполняется сервером.
  - Готово: unit на `deriveTriggerType`; интеграционный — выключенное напоминание не получает push.

- [ ] **Массовое создание напоминаний** [backend] #42
  - Файлы: `packages/shared/schemas/reminder.ts` (`reminderBulkSchema`), `apps/api/server/api/cars/[id]/reminders/bulk.post.ts`, тест `apps/api/tests/integration/reminders-bulk.test.ts`.
  - Контракт: `POST /api/cars/[id]/reminders/bulk` `{ reminders: Array<{ title, intervalKm?, intervalMonths?, categoryId?, last?: { date?: string; mileage?: number }, nextDueDate?: string }> }` → `Reminder[]`. Срок: `nextDueDate`, если передан (ОСАГО «Полис действует до»); иначе от `last`; иначе от сегодня и `cars.currentMileage`. Всё в одной транзакции.
  - Готово: тесты — с `last`, с `nextDueDate`, без них; посторонний → 403; невалидный элемент → 400 и ничего не создано.

- [ ] **Отдельный роут обновления пробега** [backend] #43
  - Файлы: миграция `cars.mileage_updated_at` (через `schema.ts` → `npm run db:generate`), `packages/shared/schemas/car.ts` (`carMileageSchema`, убрать `currentMileage` из схемы `PATCH`), `packages/shared/types.ts` (`Car.mileageUpdatedAt`), `apps/api/server/api/cars/[id]/mileage.patch.ts`, `cars/[id].patch.ts`, `entries.post.ts` (обновляет `mileageUpdatedAt` при росте пробега); тест `apps/api/tests/integration/mileage.test.ts`.
  - Контракт: `PATCH /api/cars/[id]/mileage` `{ mileage: number, confirmDecrease?: boolean }` — любой участник; меньше текущего без `confirmDecrease: true` → 400 `{ statusMessage: 'mileage_decrease_unconfirmed' }`; после сохранения — `notifyDueReminders({ carId })` fire-and-forget; ответ — `Car`. `PATCH /api/cars/[id]` больше не принимает `currentMileage`.
  - Готово: тесты — 400 без флага, 200 с флагом, участник может обновить, посторонний 403, `mileageUpdatedAt` меняется.

### Этап 4: API — аналитика, участники, категории, аккаунт

**Цель:** данные для «Расходов» и «Обзора», управление участниками, категории машины, действия с аккаунтом.
**Когда готов:** `npm test` зелёный; миграция категорий проверена на копии прод-БД; роуты в документации.

- [ ] **Аналитика расходов** [backend] #44
  - Файлы: `packages/shared/schemas/analytics.ts` (`analyticsQuerySchema`), `packages/shared/types.ts` (`CarAnalytics`), `apps/api/server/utils/analytics.ts` (чистые функции, явные импорты), `apps/api/server/api/cars/[id]/analytics.get.ts`; тесты `apps/api/tests/server/analytics.test.ts` + интеграционный.
  - Контракт: `GET /api/cars/[id]/analytics?period=month|year|all&date=YYYY-MM|YYYY` → `{ total, avgPerMonth, costPerKm, avgEntry, topMonth: { month, total } | null, byMonth: Array<{ month: 'YYYY-MM', total }>, byCategory: Array<{ categoryId, name, total, share }>, hasAnyExpenses, prevPeriodWithExpenses: string | null, nextPeriodWithExpenses: string | null }`. `avgPerMonth` — с первого месяца с тратой в периоде; `share` — целые, сумма = 100 (метод наибольшего остатка).
  - Готово: на эталонных данных: год 2026 → 88 500, 9 800 в месяц, 8,6 ₽/км, 11 060, топ — май 48 600, доли 55/11/8/8/5/13; июль 2026 → `total 0`, prev `2026-06`, next `2026-08`; машина без трат → `hasAnyExpenses: false`.

- [ ] **Участники: удаление, выход, тексты ошибок, данные машины** [backend] #45
  - Файлы: `apps/api/server/api/cars/[id]/members/[userId].delete.ts`, `members/me.delete.ts`, `cars/[id]/invite.post.ts`, `cars/[id].get.ts`, `packages/shared/types.ts` (`CarDetail.ownerName`, `entriesCount`, `remindersCount`); тест `apps/api/tests/integration/members.test.ts`.
  - Контракт: удалить участника — только владелец, себя-владельца нельзя (400); выйти — только участник (владелец → 400). `invite.post.ts`: 404 `statusMessage: 'user_not_found'`, 409 `'already_member'` (тексты на клиенте — И8/И9).
  - Готово: тесты — удаление владельцем, 403 участнику на удаление другого, убранный и вышедший получают 403 на `GET /api/cars/[id]`, посторонний 403.

- [ ] **Категории машины: схема и миграция** [backend, decision] #46
  - Файлы: `apps/api/server/database/schema.ts` (`categories.carId` nullable FK cascade, уникальность `(carId, name)` вместо глобальной), `packages/shared/schemas/category.ts`, `packages/shared/types.ts`, новая миграция (`npm run db:generate` + ручная SQL-часть переноса).
  - Контракт: `carId = null` — стандартная. Перенос: своя категория используется одной машиной → привязать; несколькими → копия на каждую машину с переназначением записей и напоминаний; не используется → удалить.
  - Готово: тест миграции на БД с тремя случаями; прогон на копии прод-БД (вручную, результат в PR). `decision` — потому что трогает прод-данные.

- [ ] **Категории машины: роуты** [backend] #47
  - Зависит от задачи «Категории машины: схема и миграция» (`decision`): если в `schema.ts` ещё нет `categories.carId`, ответить `BLOCKED: нужна миграция категорий`.
  - Файлы: `apps/api/server/api/cars/[id]/categories.get.ts`, `categories.post.ts`, `apps/api/server/api/categories/[id].patch.ts`, `categories/[id].delete.ts`; удалить `api/categories/index.get.ts`/`index.post.ts`; тест `apps/api/tests/integration/categories.test.ts`.
  - Контракт: `GET /api/cars/[id]/categories` → `Array<Category & { entriesCount: number }>` (стандартные + свои этой машины). `PATCH`/`DELETE` — только свои, любому участнику машины; стандартные → 403. Удаление: записи → «Прочее», `reminders.categoryId` → null.
  - Готово: тесты — изоляция между машинами, перенос в «Прочее», стандартные неизменны, посторонний 403.

- [ ] **Аккаунт: имя, пароль, удаление** [backend] #48
  - Файлы: `packages/shared/schemas/auth.ts` (`profileSchema`, `changePasswordSchema`), `apps/api/server/api/auth/me.patch.ts`, `auth/password.post.ts`, `auth/account.delete.ts`; тест `apps/api/tests/integration/account.test.ts`.
  - Контракт: `PATCH /api/auth/me { name }` → `AuthUser`; `POST /api/auth/password { currentPassword, newPassword }` — неверный текущий → 400, отзывает refresh-токены кроме текущего; `DELETE /api/auth/account` — машины-владения каскадом, членства, push-подписки, токены; чистит сессию.
  - Готово: тесты на каждый случай, включая вход старым паролем после смены → 401.

### Этап 5: API — сброс пароля

**Цель:** восстановление доступа по email.
**Когда готов:** `npm test` зелёный; `README.md`, `apps/api/.env.example`, `TZ.md` (исключение из «email вне рамок»), `CLAUDE.md` обновлены.

- [ ] **Почтовый транспорт** [backend] #49
  - Файлы: `apps/api/server/utils/mail.ts` (`sendMail({ to, subject, text, html })`, явные импорты, конфиг в аргументах), зависимость `nodemailer`, `nitro.config.ts` (`runtimeConfig`), `apps/api/.env.example`, `README.md`.
  - Контракт: env `NUXT_SMTP_URL`, `NUXT_MAIL_FROM`, `NUXT_APP_URL` (база ссылок в письмах); `NUXT_MAIL_OUTBOX_DIR` — вместо SMTP пишет письма JSON-файлами в каталог (тесты и e2e). Без SMTP и outbox почта выключена. `GET /api/auth/config` → `{ passwordReset: boolean }`.
  - Готово: unit-тест outbox-транспорта; тест `config` с env и без.

- [ ] **Токены и роуты сброса пароля** [backend] #50
  - Файлы: `schema.ts` (`password_reset_tokens`: `userId`, `tokenHash`, `expiresAt`, `usedAt`) + миграция, `packages/shared/schemas/auth.ts`, `apps/api/server/api/auth/password-reset.post.ts`, `password-reset/confirm.post.ts`; тест `apps/api/tests/integration/password-reset.test.ts`.
  - Контракт: `POST /api/auth/password-reset { email }` → всегда `204`, письмо не чаще раза в 60 с на email, ссылка `${NUXT_APP_URL}/reset-password?token=…`, токен 1 час, хранится SHA-256. `POST /api/auth/password-reset/confirm { token, password, authMode }` → как у `login` (сразу вход); отзывает все refresh-токены. Чтобы старые cookie-сессии стали недействительны — `users.sessionVersion` (миграция), сверяется в `requireAuth`. При выключенной почте — 404.
  - Готово: тесты — одинаковый ответ для существующего/несуществующего email, частота, одноразовость, истечение, старый пароль и старая кука → 401, выключенный режим.

### Этап 6: Навигация, «Обзор» и профиль

**Цель:** новая структура приложения: нижняя панель, переключатель машин, «Обзор» (Б1–Б4) и «Профиль» (З1 без блока «Аккаунт»).
**Когда готов:** e2e навигации и «Обзора» проходят со скриншотами в обеих темах.

- [ ] **Маршруты, AppBar, TabBar и запоминание последней машины** [decision, frontend] #51
  - Макет: `Б1 · Обзор`, `Б4 · Переключатель машин` (`design/export/Б1.png`, `Б4.png`).
  - Файлы: `apps/web/layouts/car.vue` (AppBar/Car + TabBar + слот, «＋» эмитит открытие шторки записи — до этапа 7 заглушка), страницы `pages/cars/[id]/index.vue` (Обзор), `journal.vue`, `reminders.vue`, `expenses.vue`, `settings.vue`, `categories.vue`, `pages/profile.vue` — все с `definePageMeta({ middleware: 'auth', layout: … })`; `components/car/CarSwitcherSheet.vue`; `composables/useLastCar.ts` (`localStorage['garage:lastCarId']`); `pages/index.vue` → редирект на «Обзор» последней машины или `/cars`; `packages/shared/utils/reminderBadge.ts` (`countAttentionReminders(reminders, currentMileage, today)` — просроченные + скорые среди `isActive`) + тест.
  - Готово: e2e — переходы по вкладкам, Б4 переключает машину, после перезагрузки открывается последняя машина, бейдж = 3 на фикстуре и скрыт при 0; скриншоты Б4; маршруты и layout в `conventions.md`.

- [ ] **Экран «Обзор»** [frontend] #52
  - Макет: `Б1 · Обзор`, `Б2 · Обзор — загрузка`, `Т1 · Обзор` (`design/export/Б1.png`, `Б2.png`, `Т1.png`).
  - Файлы: `pages/cars/[id]/index.vue` (≤ 250 строк), `components/overview/MileageCard.vue`, `AttentionList.vue`, `MonthExpensesCard.vue`, `RecentEntries.vue`; `composables/useAnalytics.ts` (`GET /api/cars/[id]/analytics?period=month`). Старый `pages/cars/[id]/index.vue` декомпозировать, не дописывать.
  - Контракт: пробег + «обновлён N дней назад» (`mileageUpdatedAt`); «Требует внимания» — до 3 напоминаний через `UiReminderCard`, ссылка «Все сроки» → `/cars/[id]/reminders`; расходы месяца — из аналитики; последние записи — `UiRowEntry`. Кнопка «Обновить» пробег и тап по записи пока не рендерятся/не активны (появятся в этапах 7–8). Состояния: скелетон, пусто (`UiEmptyState`), ошибка с «Повторить».
  - Готово: e2e на фикстуре — цифры совпадают с Б1 (87 450 км, 3 напоминания, 1 200 ₽ за октябрь); скриншоты Б1, Б2 в обеих темах.

- [ ] **Плашка «Нет соединения»** [frontend] #53
  - Макет: `Б3 · Обзор — нет сети`.
  - Файлы: `composables/useOnline.ts`, `components/OfflineBanner.vue` (в `layouts/car.vue`); composables данных не сбрасывают последние загруженные данные при сетевой ошибке.
  - Готово: e2e — `context.setOffline(true)` → плашка, данные «Обзора» остаются; скриншот Б3.

- [ ] **«Профиль»: push, тема, машины, выход** [frontend] #54
  - Макет: `З1 · Профиль`, `Т8 · Профиль` (без блока «Аккаунт» — он в этапе 11).
  - Файлы: `pages/profile.vue`, `components/PushSettings.vue` (перенос с `/cars`, на `UiRowToggle`, все прежние состояния: нет VAPID, iOS не PWA, запрещено, включено), `components/profile/ThemeSetting.vue` (`useTheme`), `pages/cars/index.vue` (без push, на `UiRowCar`).
  - Готово: e2e — смена темы из профиля, переход к списку машин, выход; скриншоты З1.

### Этап 7: Журнал и шторки записи

**Цель:** быстрое добавление трат, просмотр и правка записи, удобный журнал (В1–В7, Д1, Д3, Д4).
**Когда готов:** e2e этапа проходят; unit-тесты правила пробега и отложенного удаления зелёные.

- [ ] **Журнал: группы по месяцам, фильтры, поиск** [frontend] #55
  - Макет: `В1 · Журнал`, `В2 · Журнал — фильтр «Ремонт»`, `В3 · Журнал — ничего не найдено`, `В4 · Журнал — пусто`, `В5 · Журнал — загрузка`, `В6 · Журнал — ошибка загрузки`, `Т2 · Журнал`.
  - Файлы: `pages/cars/[id]/journal.vue`, `components/journal/JournalFilters.vue`, `JournalMonthGroup.vue`, `packages/shared/utils/groupEntries.ts` (`groupEntriesByMonth(entries)` → `{ month, total, entries }[]`) + тест; удалить `components/EntryJournal.vue` и `pages/cars/[id]/entries/index.vue` (редирект на `journal`).
  - Контракт: строка записи — 2 строки (название + сумма; дата · пробег · место); чипы типов (`entryTypeLabels`) и поиск; при сортировке по пробегу групп нет.
  - Готово: e2e — фильтр «Ремонт» (2 записи), поиск без результатов, пустой журнал, ошибка с повтором; скриншоты В1–В6.

- [ ] **Правило пробега для записи (Д3)** [frontend] #56
  - Файлы: `packages/shared/utils/entryMileageCheck.ts` + `packages/shared/tests/entryMileageCheck.test.ts`.
  - Контракт: `checkEntryMileage({ mileage, date, today, currentMileage, entries })` → `{ level: 'ok' } | { level: 'error', message: 'Похоже на опечатку…' } | { level: 'warning', message }`. Дата = сегодня и пробег < текущего → `error`; дата в прошлом → сверка с соседними по дате записями, расхождение → `warning`.
  - Готово: unit-тесты на все ветки, тексты — как в `Д3 · Ошибка проверки`.

- [ ] **Шторка новой записи** [frontend] #57
  - Макет: `Д1 · Новая запись`, `Д3 · Ошибка проверки`, `Т4 · Новая запись`, `Сценарий · 2`.
  - Файлы: `components/entry/EntrySheet.vue` (на `UiSheet`), `EntryTypePicker.vue`, `EntryTitleField.vue` (подсказки из прошлых записей), `EntryMoreFields.vue` (в `UiDisclosure`: категория, место, комментарий); `composables/useEntrySheet.ts` (`open({ carId, reminder? })` — глобальное состояние шторки, «＋» из `layouts/car.vue`); удалить `components/EntryForm.vue`, `pages/cars/[id]/entries/new.vue`.
  - Контракт: порядок — тип → «что сделали» → сумма (`UiAmountField`, «0» — placeholder) → пробег/дата (по умолчанию `currentMileage` и сегодня) → остальное свёрнуто. Обязательны тип и дата. Ошибки валидации — у полей; серверные — `UiAlert`; успех — toast «Запись добавлена». Проверка пробега — `checkEntryMileage`, при `error` «Сохранить» неактивна.
  - Готово: e2e — с «Обзора» запись о трате за ≤ 4 тапа (тип, название, сумма, сохранить); Д3 блокирует сохранение; скриншоты Д1, Д3.

- [ ] **Отложенное удаление** [frontend] #58
  - Файлы: `composables/useDeferredDelete.ts` + `apps/web/tests/useDeferredDelete.test.ts`.
  - Контракт: `scheduleDelete({ key, run: () => Promise<void>, onUndo })` → удаляет из UI сразу, показывает toast «… · Отменить» на 5 с, по истечении вызывает `run`; «Отменить» отменяет без запроса; на `pagehide`/`beforeunload` и уходе со страницы незавершённые удаления выполняются (`fetch(…, { keepalive: true })`).
  - Готово: unit-тесты (fake timers): отмена → `run` не вызван; таймер → вызван один раз; `pagehide` → вызван; контракт в `conventions.md`.

- [ ] **Шторка записи Д4: просмотр, правка, удаление** [frontend] #59
  - Макет: `Д4 · Запись — изменить`, `В7 · Журнал — запись удалена`.
  - Файлы: `components/entry/EntryDetailSheet.vue`; тап по `UiRowEntry` в журнале и на «Обзоре»; удалить `pages/cars/[id]/entries/[entryId].vue`.
  - Контракт: все поля, категория и место, «Добавил <author.name> · <дата>», «Сохранить изменения» (`PATCH /api/entries/[id]`), «Удалить запись» — через `useDeferredDelete`, без диалога; итоги месяца/года пересчитываются сразу.
  - Готово: e2e — правка; удаление + «Отменить» без DELETE (проверка через `page.on('request')`); удаление без «Отменить» доходит до сервера; скриншоты Д4, В7.

### Этап 8: Экраны напоминаний и обновления пробега

**Цель:** статусы, «Сделал», создание/правка/удаление напоминаний, обновление пробега (Г1–Г3, Д2, Е1–Е4, И3, Б5–Б7).
**Когда готов:** e2e этапа проходят в обеих темах.

- [ ] **Экран «Напоминания»** [frontend] #60
  - Макет: `Г1 · Напоминания`, `Г2 · Напоминания — пусто`, `Г3 · Напоминания — все в порядке`, `Т3 · Напоминания`.
  - Файлы: `pages/cars/[id]/reminders.vue`, `components/reminder/ReminderGroups.vue`; удалить `components/ReminderList.vue`.
  - Контракт: группы по статусу, выключенные — отдельной группой; карточки — `UiReminderCard` (тот же вид, что на «Обзоре»).
  - Готово: e2e на фикстуре — 2 просроченных, 1 скоро, 1 в порядке, 1 выключено; Г2, Г3; скриншоты.

- [ ] **«Сделал»: запись с закрытием напоминания** [frontend] #61
  - Макет: `Д2 · Закрыть напоминание`, `Т5 · Закрыть напоминание`, `Сценарий · 3`.
  - Файлы: `components/entry/EntrySheet.vue` (режим с `reminder`: заголовок «Запись: <название>», передаёт `reminderId`), `ReminderCard`/`AttentionList` (событие `done`).
  - Контракт: после сохранения — toast «Срок сдвинут: следующая замена на 97 450 км» (текст из обновлённого `reminder`), бейдж вкладки пересчитывается.
  - Готово: e2e — «Сделал» на «Замена масла» → запись создана, статус не «просрочено», бейдж 3 → 2; скриншот Д2.

- [ ] **Форма нового напоминания: шаблоны, предпросмотр, дубликат** [frontend] #62
  - Макет: `Е1 · Новое напоминание`, `Е2 · Своё напоминание`, `Е3 · Такое напоминание уже есть`.
  - Файлы: `components/reminder/ReminderSheet.vue`, `ReminderTemplates.vue`, `ReminderPreview.vue`, `packages/shared/utils/reminderTemplates.ts` (масло, ОСАГО, ТО, ГРМ, шины: название, интервалы, категория) + тест; удалить `components/ReminderForm.vue`, `pages/cars/[id]/reminders/new.vue`, `[reminderId].vue`.
  - Контракт: «каждые N км или M мес»; «Последний раз» подставляется из последней записи журнала с той же категорией; предпросмотр от последнего раза через `computeNextDue`-эквивалент из shared (перенести чистую часть `reminderDue.ts` в `packages/shared/utils/`, сервер импортирует оттуда); срок прошёл → `UiAlert` «Срок уже прошёл». Дубликат по названию шаблона: созданные помечены `check`, Alert «<Название> уже есть» с «Открыть «…»» и «Всё равно создать ещё одно».
  - Готово: e2e — создание из шаблона, своё, Е3; скриншоты Е1–Е3.

- [ ] **Правка напоминания (Е4) и удаление с «Отменить» (И3)** [frontend] #63
  - Макет: `Е4 · Изменить напоминание`, `И3 · Удаление с «Отменить»`.
  - Файлы: `components/reminder/ReminderEditSheet.vue`; тап по карточке открывает его.
  - Контракт: поля как в Е1, `UiRowToggle` «Напоминать» (`isActive`), для выключенного — предпросмотр «Если включить: …»; «Удалить напоминание» — `useDeferredDelete`.
  - Готово: e2e — выключить (бейдж уменьшается), удалить + «Отменить» без DELETE; скриншоты Е4, И3.

- [ ] **Шторка обновления пробега (Б5–Б7)** [frontend] #64
  - Макет: `Б5 · Обновить пробег`, `Б6 · Обзор — пробег обновлён`, `Б7 · Пробег меньше прежнего`, `Сценарий · 4`.
  - Файлы: `components/car/MileageSheet.vue`, `packages/shared/utils/mileageImpact.ts` (`diffReminderStatuses(reminders, before, after, today)` → изменившиеся остатки/статусы и признак «будет push» при переходе в `soon`/`overdue`) + тест; кнопка «Обновить» в `MileageCard`.
  - Контракт: `PATCH /api/cars/[id]/mileage`; +100/+500/+1 000 прибавляют к «Было», а не к введённому; блок «Изменится N напоминаний» — только при изменениях; «Пришлём push» — только при переходе статуса. Меньше прежнего → Б7: ошибка «Меньше прежнего на N км», «Исправить на X км» (`confirmDecrease: true`) и «Вернуть Y».
  - Готово: e2e — обновление (Б6), уменьшение с подтверждением; скриншоты Б5–Б7.

### Этап 9: «Расходы» и настройки машины

**Цель:** Ж1–Ж3, З2–З4, И1, И2, И8, И9.
**Когда готов:** e2e этапа проходят в обеих темах.

- [ ] **Экран «Расходы»** [frontend] #65
  - Макет: `Ж1 · Расходы`, `Ж2 · Расходы — пусто`, `Ж3 · Расходы — нет трат за период`, `Т6 · Расходы`.
  - Файлы: `pages/cars/[id]/expenses.vue`, `components/expenses/ExpensesSummary.vue`, `ExpensesCharts.vue`, `composables/useAnalytics.ts`.
  - Контракт: `UiSegmented` «Месяц / Год / Всё время» + `UiPeriodSwitcher` (вперёд дальше текущего периода нельзя); метрики из `CarAnalytics`; Ж2 при `!hasAnyExpenses` (без Segmented); Ж3 при `total = 0` — «В июле трат не было», ближайшие до/после, кнопка «К июню».
  - Готово: e2e — год 2026 совпадает с эталоном, листание ‹ ›, Ж2, Ж3; скриншоты.

- [ ] **Настройки машины (владелец) и удаление машины** [frontend] #66
  - Макет: `З2 · Машина — настройки`, `И2 · Диалог — удалить машину`.
  - Файлы: `pages/cars/[id]/settings.vue`, `components/car/CarSettingsForm.vue` (на базе `CarForm.vue`), `components/car/MembersList.vue`, `components/car/DeleteCarDialog.vue`; удалить `pages/cars/[id]/edit.vue`; вход — строка «Настройки <машина>» в Б4.
  - Контракт: госномер/VIN — `UiPlate`/моно; «Пробег» — строка, открывает `MileageSheet`; «Категории» с числом — на `/cars/[id]/categories`; участники с ролями; диалог И2 перечисляет `entriesCount`, `remindersCount` и участников.
  - Готово: e2e — правка данных, удаление машины; скриншоты З2, И2.

- [ ] **Добавление и удаление участника (И1, И8, И9)** [frontend] #67
  - Макет: `И1 · Пригласить участника`, `И8 · Добавить — не найден`, `И9 · Добавить — уже участник`, `Сценарий · 5`.
  - Файлы: `components/car/AddMemberSheet.vue`, `MembersList.vue` (удаление участника).
  - Контракт: объяснение прав; 404 → ошибка у поля + «Поделиться ссылкой на приложение» (`navigator.share`, иначе копирование ссылки и toast); 409 → «<Имя> уже участник этой машины»; «Добавить» неактивна, пока email не изменён после ошибки.
  - Готово: e2e — успех (Сергей), И8, И9, удаление Анны; скриншоты И1, И8, И9.

- [ ] **«Категории» машины (З3)** [frontend] #68
  - Макет: `З3 · Категории`.
  - Файлы: `pages/cars/[id]/categories.vue`, `composables/useCategories.ts` (переход на `GET /api/cars/[id]/categories`, state по `carId`), все места выбора категории (шторка записи, фильтры журнала, напоминания).
  - Контракт: стандартные — только чтение, с числом записей; свои — добавить, переименовать, удалить (`UiDialog` с текстом «записи перейдут в «Прочее»»).
  - Готово: e2e — добавить/переименовать/удалить свою, стандартные без действий; скриншот З3.

- [ ] **Вид участника (З4) и выход из машины** [frontend] #69
  - Макет: `З4 · Машина — вы участник`.
  - Файлы: `pages/cars/[id]/settings.vue` (ветка по `role`), `components/car/MemberCarView.vue`.
  - Контракт: `UiAlert` «Данные машины меняет владелец — <ownerName>», `UiRowKeyValue`, пробег обновлять можно, «Покинуть машину…» → `UiDialog` → `DELETE /api/cars/[id]/members/me` → `/cars`.
  - Готово: e2e — Дмитрий в Lada Largus видит З4, выходит, машина пропала из списка; скриншот З4.

### Этап 10: Вход, регистрация, сброс пароля, мастер первого запуска

**Цель:** А1–А9 и путь нового пользователя до заполненного «Обзора».
**Когда готов:** e2e этапа проходят в обеих темах.

- [ ] **Вход и регистрация в новом дизайне** [frontend] #70
  - Макет: `А1 · Вход`, `А2 · Вход — ошибка`, `А3 · Регистрация`, `Т7 · Вход`.
  - Файлы: `pages/login.vue`, `pages/register.vue`, `components/PasswordInput.vue` (на `UiField`, показать/скрыть), `composables/useAuthConfig.ts` (`GET /api/auth/config`).
  - Контракт: ошибка входа — только `UiAlert` «Неверный email или пароль», поля не подсвечиваются; «Забыли пароль?» — только при `passwordReset: true`; после регистрации → мастер (`/onboarding`).
  - Готово: e2e — ошибка входа, ссылка скрыта без почты; скриншоты А1–А3.

- [ ] **Восстановление пароля (А7–А9)** [frontend] #71
  - Макет: `А7 · Восстановление пароля`, `А8 · Ссылка отправлена`, `А9 · Новый пароль`.
  - Файлы: `pages/forgot-password.vue`, `pages/reset-password.vue`.
  - Контракт: А8 — «ссылка действует 1 час», «Открыть почту», повторная отправка с таймером 60 с; А9 — минимум 6 символов, «Сохранить и войти» (`confirm` с `authMode` из конфига) → «Обзор».
  - Готово: e2e — e2e-сервер с `NUXT_MAIL_OUTBOX_DIR`, ссылка берётся из файла письма; после сброса вход новым паролем; скриншоты А7–А9.

- [ ] **Мастер первого запуска (А4–А6)** [frontend] #72
  - Макет: `А4 · Первая машина`, `А5 · Что напоминать`, `А6 · Первый Обзор`, `Сценарий · 1`.
  - Файлы: `pages/onboarding.vue`, `components/onboarding/CarStep.vue`, `RemindersStep.vue`, `components/overview/OnboardingBanner.vue`.
  - Контракт: шаг 1 — обязательны марка, модель, пробег (`POST /api/cars`); шаг 2 — `reminderTemplates`, «Указать, когда меняли», для ОСАГО «Полис действует до», «Назад» — на шаг 1 без потери данных; создание — `POST /api/cars/[id]/reminders/bulk`. На «Обзоре» — плашка «Создали N напоминаний» с «Включить push» (`usePush`).
  - Готово: e2e сценария 1 — регистрация → мастер с «последним разом» и датой полиса → «Обзор» с напоминаниями и бейджем; скриншоты А4–А6.

### Этап 11: Аккаунт, экраны ошибок, логотип, финальная проверка

**Цель:** закрыть оставшиеся экраны и критерии готовности PRD.
**Когда готов:** все критерии готовности PRD отмечены.

- [ ] **Блок «Аккаунт» в профиле и удаление аккаунта** [frontend] #73
  - Макет: `З1 · Профиль` (блок «Аккаунт»), `И10 · Диалог — удалить аккаунт`.
  - Файлы: `components/profile/AccountSection.vue`, `ChangePasswordSheet.vue`, `DeleteAccountDialog.vue`; `useAuth` (`updateName`, `changePassword`, `deleteAccount`).
  - Контракт: имя — правка, email — только чтение, «Сменить пароль» (текущий + новый); И10 перечисляет свои машины (удалятся) и чужие (выход) из `GET /api/cars`; после удаления — `/login`.
  - Готово: e2e — смена имени, смена пароля с неверным текущим (ошибка у поля), удаление аккаунта; скриншоты З1, И10.

- [ ] **Экраны 403 / 404 / 500 / «Сессия истекла»** [frontend] #74
  - Макет: `И4 · Ошибка 404`, `И5 · Ошибка 500`, `И6 · Ошибка 403`, `И7 · Сессия истекла`.
  - Файлы: `apps/web/error.vue`, `components/errors/ErrorScreen.vue`, `utils/apiClient.ts` (401 без успешного refresh → И7), `middleware/auth.ts` (сохранение `redirect`), `pages/login.vue` (возврат по `redirect`).
  - Контракт: 403 — в т. ч. после удаления из участников; И7 сохраняет маршрут и возвращает на него после входа.
  - Готово: unit-тест `apiClient` на ветку И7; e2e — чужая машина (403), несуществующая (404), 500 (через `page.route`), истёкшая сессия с возвратом; скриншоты И4–И7.

- [ ] **Новый логотип и PWA-иконки** [frontend] #75
  - Макет: `Logo / App Icon`, `Logo / 72`.
  - Файлы: `apps/web/public/logo.svg` (экспорт из макета), пересборка иконок через `pwa-assets.config.ts` (сгенерированные не править руками), `theme-color`/manifest в `nuxt.config.ts`.
  - Готово: `npm run build` генерирует иконки; манифест ссылается на новые.

- [ ] **Проверка: нет эмодзи и хардкода цветов** [frontend] #76
  - Файлы: `scripts/check-ui-hygiene.mjs` (или vitest-тест в `apps/web/tests/`), подключён в `npm test`.
  - Готово: тест падает на эмодзи-иконке или цвете (`#hex`, `rgb(`, `slate-`/`indigo-` и т. п.) вне `assets/css/tokens.css`, и проходит на текущем коде.

- [ ] **Сверка с макетом и финальная документация** [decision] #77
  - Макет: все экраны А1–И10, Т1–Т8, сценарии 1–5.
  - Файлы: `TZ.md` (пять отступлений, новые роуты, экраны), `README.md`, `CLAUDE.md` (Architecture, устаревший абзац «Reminders/analytics status»), `docs/plans/conventions.md`, `apps/api/.env.example`.
  - Готово: e2e сценариев 2 и 5 целиком; аудит скриншотов против макета (Playwright MCP), расхождения исправлены или записаны в `conventions.md`; `npm test`, `typecheck`, `build`, `test:e2e` зелёные; критерии готовности PRD отмечены.
