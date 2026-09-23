// Достаёт поля из лога `claude -p`: stream-json (.jsonl) или json.
// Использование: node result.mjs <файл> cost|text|verdict|summary|issues
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
  issues: () => (r?.structured_output?.issues ?? []).map((i) => `- ${i}`).join('\n')
}[field]

if (!out) {
  console.error(`неизвестное поле: ${field}`)
  process.exit(2)
}
process.stdout.write(out())
