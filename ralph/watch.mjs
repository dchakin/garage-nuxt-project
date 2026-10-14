// Ход работы Ralph в реальном времени: следит за последним запуском в .ralph/logs/ и печатает
// вызовы инструментов модели (реализация, ревью) и строки проверок (check.sh).
// Использование: node ralph/watch.mjs   (из корня worktree, где идёт запуск; Ctrl+C — выйти)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const LOGS_DIR = path.resolve('.ralph/logs')
const POLL_MS = 2000
const QUIET_WARN_MS = 5 * 60 * 1000
const offsets = new Map()
let lastActivity = Date.now()
let warned = false

const time = () => new Date().toTimeString().slice(0, 8)
const short = (value, max = 140) => String(value).replace(/\s+/g, ' ').slice(0, max)

function latestRunDir() {
  if (!existsSync(LOGS_DIR)) return null
  const runs = readdirSync(LOGS_DIR).sort()
  return runs.length ? path.join(LOGS_DIR, runs.at(-1)) : null
}

function describeToolUse(block) {
  const input = block.input ?? {}
  const detail = input.command ?? input.file_path ?? input.pattern ?? ''
  return `${block.name} ${short(detail)}`
}

function printStreamLine(file, line) {
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return
  }
  const tag = path.basename(file).replace(/\.(jsonl|json)$/, '')
  if (msg.type === 'assistant') {
    for (const block of msg.message?.content ?? []) {
      if (block.type === 'tool_use') console.log(`${time()} [${tag}] → ${describeToolUse(block)}`)
      if (block.type === 'text' && block.text.trim())
        console.log(`${time()} [${tag}] ${short(block.text)}`)
    }
  } else if (msg.type === 'result') {
    console.log(`${time()} [${tag}] ✓ итог: $${(msg.total_cost_usd ?? 0).toFixed(2)}`)
  }
}

function printNewLines(file) {
  const size = statSync(file).size
  const from = offsets.get(file) ?? 0
  if (size <= from) return
  const chunk = readFileSync(file).subarray(from, size).toString('utf8')
  const lastNewline = chunk.lastIndexOf('\n')
  if (lastNewline < 0) return
  offsets.set(file, from + Buffer.byteLength(chunk.slice(0, lastNewline + 1)))
  lastActivity = Date.now()
  warned = false
  for (const line of chunk.slice(0, lastNewline).split('\n')) {
    if (!line.trim()) continue
    if (file.endsWith('.log')) {
      const tag = path.basename(file, '.log')
      if (line.startsWith(':::')) console.log(`${time()} [${tag}] ${line}`)
    } else printStreamLine(file, line)
  }
}

function tick() {
  const runDir = latestRunDir()
  if (!runDir) return
  const files = readdirSync(runDir)
    .filter((name) => /\.(jsonl|json|log)$/.test(name))
    .map((name) => path.join(runDir, name))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs)
  for (const file of files) printNewLines(file)
  if (!warned && Date.now() - lastActivity > QUIET_WARN_MS) {
    console.log(
      `${time()} ⚠ 5 минут без новых записей в логах (сборка/e2e идут молча до 25 мин; дольше — смотрите процессы)`,
    )
    warned = true
  }
}

console.log(`Слежу за ${LOGS_DIR} (последний запуск). Ctrl+C — выйти.`)
tick()
setInterval(tick, POLL_MS)
