export default defineEventHandler(() => {
  return { passwordReset: isMailEnabled(getMailConfig()) }
})
