export default defineTask({
  meta: {
    name: 'reminders:notify',
    description: 'Push-уведомления о напоминаниях со статусом «скоро»/«просрочено»'
  },
  async run() {
    const result = await notifyDueReminders()
    console.log('[reminders:notify]', result)
    return { result }
  }
})
