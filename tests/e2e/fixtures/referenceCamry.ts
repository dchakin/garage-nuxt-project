import type { ReferenceEntry, ReferenceReminder } from './reference'

// Toyota Camry — машина, которую показывают все экраны макета. Таблицы записей и напоминаний —
// в разделе «Эталонные данные» docs/plans/design-ux-fixes.md.

// Записи Camry за 2026 год: 8 штук на 88 500 ₽
export const camryEntries: ReferenceEntry[] = [
  {
    date: '2026-10-07',
    mileage: 87_450,
    description: 'Щётки стеклоочистителя',
    cost: 1_200,
    type: 'purchase',
    category: 'Прочее',
    place: 'Автомагазин',
  },
  {
    date: '2026-09-25',
    mileage: 87_330,
    description: 'Мойка и химчистка салона',
    cost: 3_500,
    type: 'other',
    category: 'Прочее',
    place: null,
  },
  {
    date: '2026-09-12',
    mileage: 87_200,
    description: 'ТО-6: свечи и воздушный фильтр',
    cost: 6_800,
    type: 'maintenance',
    category: 'Прочее',
    place: 'Сервис на Ленина',
  },
  {
    date: '2026-08-03',
    mileage: 86_100,
    description: 'Не заводился — заменили аккумулятор',
    cost: 9_900,
    type: 'repair',
    category: 'Электрика',
    place: 'АвтоМастер',
  },
  {
    date: '2026-06-11',
    mileage: 84_000,
    description: 'Стойки стабилизатора передние',
    cost: 7_500,
    type: 'repair',
    category: 'Подвеска',
    place: 'Сервис на Ленина',
  },
  {
    date: '2026-05-02',
    mileage: 82_100,
    description: 'Летняя резина Michelin 215/55 R17',
    cost: 48_600,
    type: 'purchase',
    category: 'Шины',
    place: 'Шинный центр',
  },
  {
    date: '2026-03-20',
    mileage: 79_800,
    description: 'Передние тормозные колодки',
    cost: 4_200,
    type: 'replacement',
    category: 'Тормоза',
    place: 'АвтоМастер',
  },
  {
    date: '2026-02-14',
    mileage: 77_200,
    description: 'Замена масла 5W-30 и фильтра',
    cost: 6_800,
    type: 'maintenance',
    category: 'Масло и фильтры',
    place: 'Сервис на Ленина',
  },
]

// Сроки заданы явно (через API прошлый срок не задать). На 10 окт 2026 и 87 450 км:
// 2 просрочено, 1 скоро, 1 в порядке, 1 выключено → бейдж «Напоминания» = 3
export const camryReminders: ReferenceReminder[] = [
  {
    // просрочено на 250 км; по дате — 14 фев 2027
    title: 'Замена масла',
    triggerType: 'both',
    intervalMonths: 12,
    intervalKm: 10_000,
    nextDueDate: '2027-02-14',
    nextDueMileage: 87_200,
    category: 'Масло и фильтры',
    lastEntry: 'Замена масла 5W-30 и фильтра',
    isActive: true,
  },
  {
    // просрочено на 39 дней
    title: 'Техосмотр',
    triggerType: 'date',
    intervalMonths: 24,
    intervalKm: null,
    nextDueDate: '2026-09-01',
    nextDueMileage: null,
    category: null,
    lastEntry: null,
    isActive: true,
  },
  {
    // через 8 дней
    title: 'ОСАГО',
    triggerType: 'date',
    intervalMonths: 12,
    intervalKm: null,
    nextDueDate: '2026-10-18',
    nextDueMileage: null,
    category: null,
    lastEntry: null,
    isActive: true,
  },
  {
    // через 12 550 км
    title: 'Замена ГРМ',
    triggerType: 'mileage',
    intervalMonths: null,
    intervalKm: 100_000,
    nextDueDate: null,
    nextDueMileage: 100_000,
    category: 'Двигатель',
    lastEntry: null,
    isActive: true,
  },
  {
    title: 'Сезонная смена шин',
    triggerType: 'date',
    intervalMonths: 6,
    intervalKm: null,
    nextDueDate: '2026-11-02',
    nextDueMileage: null,
    category: 'Шины',
    lastEntry: 'Летняя резина Michelin 215/55 R17',
    isActive: false,
  },
]
