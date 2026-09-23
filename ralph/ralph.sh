#!/usr/bin/env bash
# Ralph loop: берёт открытые issues по очереди и реализует каждый в чистом контексте `claude -p`.
# Реализация → проверки (ralph/check.sh) → ревью → ветка ralph/issue-N + PR в dev.
#
# Использование: bash ralph/ralph.sh [сколько задач взять, по умолчанию 1]
# Остановить после текущей задачи: touch .ralph/STOP
# Подробности: ralph/README.md
set -euo pipefail

# bash читает скрипт по ходу выполнения, а цикл переключает ветки — работаем из временной копии.
if [ -z "${RALPH_SELF_COPY:-}" ]; then
  self="$(mktemp)"
  cp "$0" "$self"
  RALPH_SELF_COPY=1 exec bash "$self" "$@"
fi

MAX_ISSUES="${1:-1}"
MAX_ATTEMPTS="${RALPH_MAX_ATTEMPTS:-3}"
MODEL="${RALPH_MODEL:-sonnet}"
IMPL_BUDGET="${RALPH_IMPL_BUDGET:-3}"     # USD на одну попытку реализации
REVIEW_BUDGET="${RALPH_REVIEW_BUDGET:-1}" # USD на одно ревью
REPO="${RALPH_REPO:-dchakin/garage-nuxt-project}"
BASE_BRANCH="${RALPH_BASE:-dev}"
SKIP_LABELS="decision,ralph:blocked,ralph:in-review"

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"
DIR="$ROOT/ralph"
STATE="$ROOT/.ralph"
RUN_ID="$(date +%Y%m%d-%H%M%S)"
LOGS="$STATE/logs/$RUN_ID"
mkdir -p "$LOGS"

GH="${GH:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  GH="/c/Program Files/GitHub CLI/gh.exe"
  [ -x "$GH" ] || { echo "Не найден GitHub CLI (gh)"; exit 1; }
fi

log() { printf '\n\033[1;35m[ralph %s]\033[0m %s\n' "$(date +%H:%M:%S)" "$*"; }
cost_of() { node "$DIR/lib/result.mjs" "$1" cost; }
add_cost() { TOTAL_COST="$(awk -v a="$TOTAL_COST" -v b="$1" 'BEGIN{printf "%.4f", a+b}')"; }

# Общие флаги: без MCP-серверов и скиллов (экономия токенов), без сохранения сессий,
# всё, что не разрешено явно, — запрещено (dontAsk).
COMMON=(--model "$MODEL" --strict-mcp-config --disable-slash-commands --no-session-persistence --permission-mode dontAsk)
DENY=(Agent WebSearch WebFetch "Bash(git push:*)" "Bash(git checkout:*)" "Bash(git switch:*)"
  "Bash(git reset:*)" "Bash(git rebase:*)" "Bash(git merge:*)" "Bash(gh:*)" "Bash(rm -rf:*)")
IMPL_TOOLS=(Read Edit Write Glob Grep
  "Bash(npm test:*)" "Bash(npm run:*)" "Bash(npm install:*)" "Bash(npm i:*)"
  "Bash(npx vitest:*)" "Bash(npx playwright:*)" "Bash(npx nuxi:*)" "Bash(npx drizzle-kit:*)" "Bash(npx tsx:*)"
  "Bash(git status:*)" "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)"
  "Bash(git add:*)" "Bash(git commit:*)" "Bash(ls:*)" "Bash(mkdir:*)")
REVIEW_TOOLS=(Read Glob Grep "Bash(git diff:*)" "Bash(git log:*)" "Bash(git show:*)")

# ---------- предусловия ----------
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "В рабочей копии есть незакоммиченные изменения — закоммитьте или уберите их перед запуском."
  exit 1
fi
ORIG_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
trap 'git checkout -q "$ORIG_BRANCH" 2>/dev/null || echo "Не удалось вернуться на $ORIG_BRANCH — проверьте git status"' EXIT

for label in "ralph:in-review|0e8a16|Ralph открыл PR, ждёт мёржа" "ralph:blocked|d93f0b|Ralph не справился — нужен человек"; do
  IFS='|' read -r name color desc <<<"$label"
  "$GH" label create "$name" --color "$color" --description "$desc" --force -R "$REPO" >/dev/null
done

TOTAL_COST=0
SUMMARY=()

# ---------- функции шагов ----------
pick_issue() {
  "$GH" issue list -R "$REPO" --state open --limit 200 --json number,labels,milestone \
    | node "$DIR/lib/pick-issue.mjs" "$SKIP_LABELS"
}

# Ветка от последнего открытого PR Ralph (цепочка), иначе от свежего dev.
base_ref() {
  local head
  head="$("$GH" pr list -R "$REPO" --state open --base "$BASE_BRANCH" --json number,headRefName \
    --jq '[.[] | select(.headRefName | startswith("ralph/"))] | sort_by(.number) | last | .headRefName // empty')"
  if [ -n "$head" ]; then echo "$head"; else echo "$BASE_BRANCH"; fi
}

plan_file() {
  [ -n "$STAGE" ] && ls docs/plans/stage-"$STAGE"-*.md 2>/dev/null | head -n 1 || true
}

context_block() {
  printf '\n\n# Задача #%s: %s\n\n%s\n' "$N" "$TITLE" "$BODY"
  local plan; plan="$(plan_file)"
  if [ -n "$plan" ]; then printf '\n\n# План этапа (%s)\n\n' "$plan"; cat "$plan"; fi
  if [ -f docs/plans/conventions.md ]; then printf '\n\n# Договорённости (docs/plans/conventions.md)\n\n'; cat docs/plans/conventions.md; fi
}

implement() {
  local out="$LOGS/issue-$N-a$ATTEMPT-impl.jsonl"
  {
    cat "$DIR/prompts/implement.md"
    context_block
    if [ -n "$FEEDBACK" ]; then
      printf '\n\n# Это попытка %s из %s. Предыдущая не прошла\n\nКоммиты предыдущих попыток уже в ветке — исправляй их, а не начинай заново.\n\n%s\n' \
        "$ATTEMPT" "$MAX_ATTEMPTS" "$FEEDBACK"
    fi
  } | claude -p "${COMMON[@]}" --max-budget-usd "$IMPL_BUDGET" \
      --allowedTools "${IMPL_TOOLS[@]}" --disallowedTools "${DENY[@]}" \
      --output-format stream-json --verbose >"$out" 2>"$out.stderr" || true
  local c; c="$(cost_of "$out")"; add_cost "$c"
  IMPL_TEXT="$(node "$DIR/lib/result.mjs" "$out" text)"
  log "реализация: \$$c"
  printf '%s\n' "$IMPL_TEXT" | tail -n 6
}

review() {
  local out="$LOGS/issue-$N-a$ATTEMPT-review.json"
  {
    cat "$DIR/prompts/review.md"
    context_block
    printf '\n\n# Что ревьюить\n\nИзменения: `git diff %s...HEAD`, коммиты: `git log --oneline %s..HEAD`.\n' "$START_SHA" "$START_SHA"
    local shots; shots="$(ls test-results/screens/*.png 2>/dev/null || true)"
    if [ -n "$shots" ]; then
      printf '\n# Скриншоты экранов из e2e (390px)\n\n%s\n' "$shots"
    else
      printf '\n# Скриншоты экранов\n\nСкриншотов нет.\n'
    fi
  } | claude -p "${COMMON[@]}" --max-budget-usd "$REVIEW_BUDGET" \
      --allowedTools "${REVIEW_TOOLS[@]}" --disallowedTools "${DENY[@]}" \
      --output-format json --json-schema "$(cat "$DIR/review-schema.json")" >"$out" 2>"$out.stderr" || true
  local c; c="$(cost_of "$out")"; add_cost "$c"
  VERDICT="$(node "$DIR/lib/result.mjs" "$out" verdict)"
  REVIEW_SUMMARY="$(node "$DIR/lib/result.mjs" "$out" summary)"
  REVIEW_ISSUES="$(node "$DIR/lib/result.mjs" "$out" issues)"
  log "ревью: $VERDICT (\$$c)"
  [ -n "$REVIEW_ISSUES" ] && printf '%s\n' "$REVIEW_ISSUES"
  return 0
}

open_pr() {
  git push -q -u origin "$BRANCH" --force-with-lease
  local body="$LOGS/issue-$N-pr.md"
  {
    printf 'Closes #%s\n\n' "$N"
    [ -n "$REVIEW_SUMMARY" ] && printf '%s\n\n' "$REVIEW_SUMMARY"
    [ "$VERDICT" = "ERROR" ] && printf '> ⚠️ Автоматическое ревью не завершилось — посмотрите изменения внимательнее.\n\n'
    if [ "$BASE" != "$BASE_BRANCH" ]; then
      printf '> ⚠️ Ветка основана на `%s`, PR которой ещё не смёржен. Мёржите по порядку и способом **Create a merge commit** — иначе коммиты задвоятся.\n\n' "$BASE"
    fi
    printf -- '- Проверки: `npm test`, `typecheck`, `build`, e2e — зелёные\n'
    [ -d "$LOGS/issue-$N-screens" ] && printf -- '- Скриншоты экранов (локально): `.ralph/logs/%s/issue-%s-screens/`\n' "$RUN_ID" "$N"
    printf -- '- Попыток: %s, модель: %s\n\n' "$ATTEMPT" "$MODEL"
    printf '🤖 Generated with [Claude Code](https://claude.com/claude-code) — Ralph loop\n'
  } >"$body"
  PR_URL="$("$GH" pr create -R "$REPO" --base "$BASE_BRANCH" --head "$BRANCH" --title "$TITLE (#$N)" --body-file "$body")"
  "$GH" issue edit "$N" -R "$REPO" --add-label "ralph:in-review" >/dev/null
}

block_issue() {
  local reason="$1" body="$LOGS/issue-$N-blocked.md"
  {
    printf 'Ralph loop не смог завершить задачу за %s попыт(ки).\n\n' "$ATTEMPT"
    printf '**Причина:**\n\n%s\n\n' "$reason"
    printf 'Локальная ветка `%s` сохранена. Логи: `.ralph/logs/%s/`.\n\nЧтобы вернуть задачу в очередь, снимите метку `ralph:blocked`.\n' "$BRANCH" "$RUN_ID"
  } >"$body"
  "$GH" issue comment "$N" -R "$REPO" --body-file "$body" >/dev/null
  "$GH" issue edit "$N" -R "$REPO" --add-label "ralph:blocked" >/dev/null
}

# ---------- главный цикл ----------
for ((done_count = 1; done_count <= MAX_ISSUES; done_count++)); do
  if [ -f "$STATE/STOP" ]; then log "найден .ralph/STOP — останавливаюсь"; rm -f "$STATE/STOP"; break; fi

  PICK="$(pick_issue)"
  if [ -z "$PICK" ]; then log "открытых задач для Ralph нет"; break; fi
  IFS=$'\t' read -r N STAGE <<<"$PICK"
  TITLE="$("$GH" issue view "$N" -R "$REPO" --json title --jq .title)"
  BODY="$("$GH" issue view "$N" -R "$REPO" --json body --jq .body)"

  git fetch -q origin
  BASE="$(base_ref)"
  BRANCH="ralph/issue-$N"
  git checkout -q -B "$BRANCH" "origin/$BASE"
  START_SHA="$(git rev-parse HEAD)"
  log "задача #$N «$TITLE» — ветка $BRANCH от $BASE"

  FEEDBACK=""
  STATUS=""
  for ((ATTEMPT = 1; ATTEMPT <= MAX_ATTEMPTS; ATTEMPT++)); do
    log "#$N попытка $ATTEMPT/$MAX_ATTEMPTS: реализация"
    implement

    if grep -q '^BLOCKED:' <<<"$IMPL_TEXT"; then
      STATUS="blocked"; block_issue "$(grep '^BLOCKED:' <<<"$IMPL_TEXT")"; break
    fi

    if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
      git add -A && git commit -q -m "chore(ralph): commit leftover changes (#$N)"
    fi
    if [ "$(git rev-parse HEAD)" = "$START_SHA" ]; then
      FEEDBACK="Предыдущая попытка не создала ни одного коммита. Реализуй задачу и закоммить изменения."
      continue
    fi

    log "#$N попытка $ATTEMPT: проверки"
    CHECK_LOG="$LOGS/issue-$N-a$ATTEMPT-check.log"
    if ! bash "$DIR/check.sh" >"$CHECK_LOG" 2>&1; then
      log "проверки красные — $(grep '::: FAILED' "$CHECK_LOG" | tail -n 1)"
      FEEDBACK="Проверки не прошли. Последние строки лога:
\`\`\`
$(tail -n 80 "$CHECK_LOG")
\`\`\`"
      continue
    fi

    if ls test-results/screens/*.png >/dev/null 2>&1; then
      mkdir -p "$LOGS/issue-$N-screens" && cp test-results/screens/*.png "$LOGS/issue-$N-screens/"
    fi

    log "#$N попытка $ATTEMPT: ревью"
    review
    if [ "$VERDICT" = "CHANGES" ]; then
      FEEDBACK="Ревью вернуло задачу на доработку:
$REVIEW_ISSUES"
      continue
    fi

    open_pr
    STATUS="pr"
    log "#$N готово: $PR_URL"
    break
  done

  if [ -z "$STATUS" ]; then
    ATTEMPT=$MAX_ATTEMPTS
    STATUS="blocked"
    block_issue "$FEEDBACK"
  fi
  SUMMARY+=("#$N — $([ "$STATUS" = pr ] && echo "PR: $PR_URL" || echo "ralph:blocked") — $TITLE")
done

log "итог запуска $RUN_ID"
printf '%s\n' "${SUMMARY[@]:-ничего не сделано}"
printf 'Потрачено: $%s. Логи: .ralph/logs/%s/\n' "$TOTAL_COST" "$RUN_ID"
