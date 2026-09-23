// Достаёт поля из лога `claude -p`: stream-json (.jsonl) или json.
// Использование: node result.mjs <файл> cost|text|verdict|summary|issues|health
// health: "ok" — сессия отработала (в т.ч. упёрлась в бюджет); "fatal: …" — ответа нет или ошибка API
// (лимит подписки, сеть) — такой запуск надо прерывать, а не считать неудачной попыткой.
import { readFileSync } from 'node:fs'

const [file, field] = process.argv.slice(2)

function readResult() {
  let content = ''
  try {
    content = readFileSync(file, 'utf8').trim()
  } catch {
    return null
  }
  if (!content) return null
  try {
    return JSON.parse(content)
  } catch {
    // stream-json: итоговое сообщение — последняя строка с type === 'result'
    const lines = content.split('\n').reverse()
    for (const line of lines) {
      try {
        const msg = JSON.parse(line)
        if (msg.type === 'result') return msg
      } catch {}
    }
    return null
  }
}

const r = readResult()
const out = {
  cost: () => (r?.total_cost_usd ?? 0).toFixed(4),
  text: () => String(r?.result ?? ''),
  verdict: () => r?.structured_output?.verdict ?? 'ERROR',
  summary: () => r?.structured_output?.summary ?? '',
  issues: () => (r?.structured_output?.issues ?? []).map((i) => `- ${i}`).join('\n'),
  health: () => {
    if (!r) return 'fatal: нет итогового сообщения (процесс упал или убит по таймауту)'
    if (r.api_error_status) return `fatal: ошибка API ${r.api_error_status}: ${String(r.result ?? '').slice(0, 200)}`
    return 'ok'
  }
}[field]

if (!out) {
  console.error(`неизвестное поле: ${field}`)
  process.exit(2)
}
process.stdout.write(out())
