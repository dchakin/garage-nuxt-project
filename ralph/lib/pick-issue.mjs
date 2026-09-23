// Выбирает следующий issue для Ralph loop из JSON `gh issue list` на stdin.
// Порядок: метка `tests` первой, затем по номеру этапа из milestone, затем по номеру issue.
// Печатает "<номер>\t<номер этапа или пусто>" либо ничего, если брать нечего.
const skip = new Set((process.argv[2] ?? '').split(',').filter(Boolean))

let raw = ''
process.stdin.on('data', (d) => (raw += d))
process.stdin.on('end', () => {
  const stageOf = (issue) => {
    const m = issue.milestone?.title?.match(/Этап\s+(\d+)/)
    return m ? Number(m[1]) : null
  }
  const candidates = JSON.parse(raw)
    .filter((i) => !i.labels.some((l) => skip.has(l.name)))
    .map((i) => ({
      number: i.number,
      stage: stageOf(i),
      tests: i.labels.some((l) => l.name === 'tests')
    }))
    .sort((a, b) =>
      Number(b.tests) - Number(a.tests) ||
      (a.stage ?? 99) - (b.stage ?? 99) ||
      a.number - b.number
    )

  const next = candidates[0]
  if (next) process.stdout.write(`${next.number}\t${next.stage ?? ''}\n`)
})
