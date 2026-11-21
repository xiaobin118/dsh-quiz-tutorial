/**
 * dsh-quiz — Host half.
 *
 * Serves the review decks to the Web UI and lets the agent turn any review
 * context into a deck:
 *   GET  /dsh-quiz/decks        -> { ok, decks, errors }
 *   POST /dsh-quiz/decks/delete -> { ok, message } | { ok:false, code, message }
 *   tool quiz_list_decks        -> list installed decks
 *   tool quiz_save_deck         -> validate + write one deck JSON
 *   tool quiz_delete_deck       -> remove a user deck
 *
 * Decks live in <DSH_HOME>/dsh-quiz/decks/<id>.json (user decks override a
 * bundled deck with the same id).  Bundled decks ship in ./decks and are
 * read-only; saving a deck with the same id is the supported way to update it.
 *
 * Two invariants keep the store addressable and honest:
 *   - the file name must be exactly `<id>.json`; a deck whose content id and
 *     file name disagree is reported in `errors` and skipped, so listing and
 *     delete address the same file the loader read (see I4 in the 1.0.0 audit);
 *   - MAX_DECK_BYTES is enforced in bytes on both write and read, so a save
 *     never reports success for a file the list would then refuse (C2).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url))
const BUNDLED_DIR = join(PACKAGE_DIR, 'decks')
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const USER_DIR = join(DSH_HOME, 'dsh-quiz', 'decks')
const ROUTE = '/dsh-quiz/decks'
const DELETE_ROUTE = '/dsh-quiz/decks/delete'
const MAX_DECK_BYTES = 512 * 1024
const ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/
const JSON_MEDIA_TYPE = /^application\/json(?:\s*;|$)/i
const SKILL_NAME = 'dsh-quiz'
const SKILL_DESCRIPTION = '从当前复习内容直接生成一套「刷题场」题集：自己算对每道题的答案与中间量，用 quiz_save_deck 保存，用户打开刷题场刷新即可练习。'
const SKILL_WHEN_TO_USE = '用户说 /skill dsh-quiz、想复习或备考某个主题、或要求根据讲义、错题、对话内容生成练习题时。'

/** Every bound the Host enforces, in one place, so save and read agree. */
const LIMITS = Object.freeze({
  deckBytes: MAX_DECK_BYTES,
  id: 64,
  title: 120,
  subject: 60,
  description: 600,
  questionId: 64,
  topic: 80,
  level: 20,
  prompt: 4000,
  conditions: 600,
  formula: 800,
  pitfall: 600,
  stepTitle: 120,
  stepBody: 4000,
  stepMatrices: 4,
  noteTitle: 120,
  noteBody: 2000,
  optionText: 400,
  optionNote: 300,
  inputLabel: 40,
  matrixLabel: 80,
  questions: 100,
  steps: 40,
  notes: 20,
  inputs: 8,
  optionsMin: 2,
  optionsMax: 6,
  matrixDim: 12,
})

const DECK_SCHEMA_HINT = `deck JSON 结构（必填项见括号）：
{
  "id": "小写字母/数字/-/_ 的短 id（必填，同时决定文件名 <id>.json）",
  "title": "题集标题（必填）",
  "subject": "学科/课程，如 机器学习、SQL（必填）",
  "description": "一句话说明（可选）",
  "notes": [{"title": "速查卡标题", "body": "公式/要点正文"}],
  "questions": [{
    "id": "q1",
    "topic": "考点名（必填）",
    "level": "基础 | 进阶 | 挑战 | 概念",
    "prompt": "题干（必填）",
    "inputs": [{"label": "X", "matrix": [[1,2],[3,4]]}, {"label": "b", "scalar": -1}],
    "conditions": "P=0、S=1 之类的补充条件",
    "options": [{"kind": "matrix", "matrix": [[...]], "note": "这选项为什么错（可选）"},
                {"kind": "text", "text": "文字选项"}],
    "answer": 0,
    "formula": "本题用到的公式/知识点",
    "pitfall": "易错点",
    "steps": [{"title": "第 1 步 · ...", "body": "逐步手算，写出中间量",
               "matrices": [{"label": "中间结果", "matrix": [[...]]}]}]
  }]
}
规则：每题 options 2–6 个、answer 是 0 基下标；矩阵必须是矩形数字数组；所有答案与中间量必须真实计算过，不许估算。
公式写法：直接用 Unicode（σ_k²、⌊(H + 2P − K)/S⌋ + 1）或用 $...$ 包住；渲染器支持 _{...}/^{...} 与常见 LaTeX 命令（\\frac、\\sum、\\alpha…），
不支持完整 LaTeX 排版，不要写 \\begin{} / \\end{} 环境。
单套题集序列化后上限 512 KiB，超过会在写入前被拒绝。`

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Trimmed string with an explicit length failure.  Never slices: silently
 * cutting a prompt or a worked step corrupts the deck (I1).
 */
function bounded(value, max, path, errors) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (trimmed.length > max) {
    errors.push(`${path} 超过 ${max} 字符上限（当前 ${trimmed.length} 字符），请缩短后重试`)
  }
  return trimmed
}

function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeMatrix(raw, path, errors) {
  const maxDim = LIMITS.matrixDim
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push(`${path} 必须是二维数字数组`)
    return null
  }
  if (raw.length > maxDim) {
    errors.push(`${path} 行数不能超过 ${maxDim}`)
    return null
  }
  const width = Array.isArray(raw[0]) ? raw[0].length : 0
  if (width === 0 || width > maxDim) {
    errors.push(`${path} 每行必须有 1–${maxDim} 个数`)
    return null
  }
  const out = []
  for (let i = 0; i < raw.length; i += 1) {
    const row = raw[i]
    if (!Array.isArray(row) || row.length !== width) {
      errors.push(`${path} 第 ${i + 1} 行的列数与首行不一致`)
      return null
    }
    const cells = []
    for (let j = 0; j < row.length; j += 1) {
      const n = numberValue(row[j])
      if (n === null) {
        errors.push(`${path}[${i + 1}][${j + 1}] 不是有限数字`)
        return null
      }
      cells.push(n)
    }
    out.push(cells)
  }
  return out
}

function normalizeInputs(raw, path, errors) {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    errors.push(`${path}.inputs 必须是数组`)
    return []
  }
  if (raw.length > LIMITS.inputs) {
    errors.push(`${path}.inputs 最多 ${LIMITS.inputs} 项`)
    return []
  }
  const out = []
  for (let i = 0; i < raw.length; i += 1) {
    const input = raw[i]
    const at = `${path}.inputs[${i + 1}]`
    if (!isRecord(input)) {
      errors.push(`${at} 必须是对象`)
      continue
    }
    const label = bounded(input.label, LIMITS.inputLabel, `${at}.label`, errors)
    if (!label) {
      errors.push(`${at}.label 不能为空`)
      continue
    }
    const hasMatrix = input.matrix !== undefined
    const hasScalar = input.scalar !== undefined
    if (hasMatrix === hasScalar) {
      errors.push(`${at} 必须且只能提供 matrix 或 scalar 之一`)
      continue
    }
    if (hasMatrix) {
      const matrix = normalizeMatrix(input.matrix, `${at}.matrix`, errors)
      if (matrix) out.push({ label, matrix })
    } else {
      const scalar = numberValue(input.scalar)
      if (scalar === null) errors.push(`${at}.scalar 不是有限数字`)
      else out.push({ label, scalar })
    }
  }
  return out
}

function normalizeOptions(raw, path, errors) {
  if (!Array.isArray(raw) || raw.length < LIMITS.optionsMin || raw.length > LIMITS.optionsMax) {
    errors.push(`${path}.options 必须是 ${LIMITS.optionsMin}–${LIMITS.optionsMax} 个选项的数组`)
    return []
  }
  const out = []
  const seen = new Set()
  for (let i = 0; i < raw.length; i += 1) {
    const option = raw[i]
    const at = `${path}.options[${i + 1}]`
    if (!isRecord(option)) {
      errors.push(`${at} 必须是对象`)
      continue
    }
    const kind = option.kind === 'matrix' ? 'matrix' : option.kind === 'text' ? 'text' : ''
    if (!kind) {
      errors.push(`${at}.kind 只能是 "matrix" 或 "text"`)
      continue
    }
    const note = bounded(option.note, LIMITS.optionNote, `${at}.note`, errors) || undefined
    if (kind === 'matrix') {
      const matrix = normalizeMatrix(option.matrix, `${at}.matrix`, errors)
      if (!matrix) continue
      const key = `m:${JSON.stringify(matrix)}`
      if (seen.has(key)) {
        errors.push(`${at} 与前面的选项重复`)
        continue
      }
      seen.add(key)
      out.push(note ? { kind, matrix, note } : { kind, matrix })
    } else {
      const value = bounded(option.text, LIMITS.optionText, `${at}.text`, errors)
      if (!value) {
        errors.push(`${at}.text 不能为空`)
        continue
      }
      const key = `t:${value}`
      if (seen.has(key)) {
        errors.push(`${at} 与前面的选项重复`)
        continue
      }
      seen.add(key)
      out.push(note ? { kind, text: value, note } : { kind, text: value })
    }
  }
  return out
}

function normalizeSteps(raw, path, errors) {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push(`${path}.steps 至少要有一步`)
    return []
  }
  if (raw.length > LIMITS.steps) {
    errors.push(`${path}.steps 最多 ${LIMITS.steps} 步`)
    return []
  }
  const out = []
  for (let i = 0; i < raw.length; i += 1) {
    const step = raw[i]
    const at = `${path}.steps[${i + 1}]`
    if (!isRecord(step)) {
      errors.push(`${at} 必须是对象`)
      continue
    }
    const title = bounded(step.title, LIMITS.stepTitle, `${at}.title`, errors)
    const body = bounded(step.body, LIMITS.stepBody, `${at}.body`, errors)
    if (!title) errors.push(`${at}.title 不能为空`)
    if (!body) errors.push(`${at}.body 不能为空`)
    if (!title || !body) continue
    const normalized = { title, body }
    if (Array.isArray(step.matrices) && step.matrices.length > 0) {
      if (step.matrices.length > LIMITS.stepMatrices) {
        errors.push(`${at}.matrices 最多 ${LIMITS.stepMatrices} 个矩阵`)
      } else {
        const matrices = []
        for (let j = 0; j < step.matrices.length; j += 1) {
          const entry = step.matrices[j]
          const atM = `${at}.matrices[${j + 1}]`
          if (!isRecord(entry)) {
            errors.push(`${atM} 必须是对象`)
            continue
          }
          const label = bounded(entry.label, LIMITS.matrixLabel, `${atM}.label`, errors)
          const matrix = normalizeMatrix(entry.matrix, `${atM}.matrix`, errors)
          if (matrix) matrices.push(label ? { label, matrix } : { matrix })
        }
        if (matrices.length > 0) normalized.matrices = matrices
      }
    }
    out.push(normalized)
  }
  return out
}

function normalizeNotes(raw, path, errors) {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) {
    errors.push(`${path}.notes 必须是数组`)
    return []
  }
  if (raw.length > LIMITS.notes) {
    errors.push(`${path}.notes 最多 ${LIMITS.notes} 张速查卡`)
    return []
  }
  const out = []
  for (let i = 0; i < raw.length; i += 1) {
    const note = raw[i]
    const at = `${path}.notes[${i + 1}]`
    if (!isRecord(note)) {
      errors.push(`${at} 必须是对象`)
      continue
    }
    const title = bounded(note.title, LIMITS.noteTitle, `${at}.title`, errors)
    const body = bounded(note.body, LIMITS.noteBody, `${at}.body`, errors)
    if (!title || !body) {
      errors.push(`${at} 的 title / body 不能为空`)
      continue
    }
    out.push({ title, body })
  }
  return out
}

function normalizeDeck(raw) {
  const errors = []
  if (!isRecord(raw)) return { errors: ['题集必须是 JSON 对象'] }
  const id = typeof raw.id === 'string' ? raw.id.trim() : ''
  if (!ID_PATTERN.test(id)) {
    errors.push('id 只能包含小写字母、数字、-、_，以字母或数字开头，且最长 64 字符')
  }
  const title = bounded(raw.title, LIMITS.title, 'title', errors)
  if (!title) errors.push('title 不能为空')
  const subject = bounded(raw.subject, LIMITS.subject, 'subject', errors)
  if (!subject) errors.push('subject 不能为空')
  const description = bounded(raw.description, LIMITS.description, 'description', errors)
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    errors.push('questions 至少要有 1 道题')
    return { errors }
  }
  if (raw.questions.length > LIMITS.questions) {
    errors.push(`questions 最多 ${LIMITS.questions} 道题`)
    return { errors }
  }
  const questions = []
  const questionIds = new Set()
  for (let i = 0; i < raw.questions.length; i += 1) {
    const question = raw.questions[i]
    const at = `questions[${i + 1}]`
    if (!isRecord(question)) {
      errors.push(`${at} 必须是对象`)
      continue
    }
    const qid = bounded(question.id, LIMITS.questionId, `${at}.id`, errors) || `q${i + 1}`
    if (questionIds.has(qid)) {
      errors.push(`${at}.id 与前面的题目重复：${qid}（同一题集内题目 id 必须唯一）`)
      continue
    }
    questionIds.add(qid)
    const topic = bounded(question.topic, LIMITS.topic, `${at}.topic`, errors)
    if (!topic) errors.push(`${at}.topic 不能为空`)
    const prompt = bounded(question.prompt, LIMITS.prompt, `${at}.prompt`, errors)
    if (!prompt) errors.push(`${at}.prompt 不能为空`)
    const options = normalizeOptions(question.options, at, errors)
    if (options.length < LIMITS.optionsMin) errors.push(`${at}.options 至少要有 ${LIMITS.optionsMin} 个有效选项`)
    const answer = Number.isInteger(question.answer) ? question.answer : numberValue(question.answer)
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      errors.push(`${at}.answer 必须是 0 到 ${Math.max(options.length - 1, 0)} 之间的整数下标`)
    }
    const steps = normalizeSteps(question.steps, at, errors)
    const inputs = normalizeInputs(question.inputs, at, errors)
    if (!topic || !prompt || options.length < LIMITS.optionsMin || !Number.isInteger(answer) || steps.length === 0) continue
    const normalized = {
      id: qid,
      topic,
      level: bounded(question.level, LIMITS.level, `${at}.level`, errors) || '基础',
      prompt,
      inputs,
      conditions: bounded(question.conditions, LIMITS.conditions, `${at}.conditions`, errors),
      options,
      answer,
      formula: bounded(question.formula, LIMITS.formula, `${at}.formula`, errors),
      steps,
      pitfall: bounded(question.pitfall, LIMITS.pitfall, `${at}.pitfall`, errors),
    }
    questions.push(normalized)
  }
  const notes = normalizeNotes(raw.notes, 'deck', errors)
  if (questions.length === 0) errors.push('没有一道题通过校验')
  if (errors.length > 0) return { errors }
  return {
    errors: [],
    deck: {
      version: 1,
      id,
      title,
      subject,
      description,
      notes,
      questions,
    },
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const kib = bytes / 1024
  return `${Number.isInteger(kib) ? kib : kib.toFixed(1)} KiB`
}

/** A deck that normalizes cleanly but cannot fit the read budget. */
class DeckSizeError extends Error {
  constructor(bytes) {
    super(`题集 JSON 为 ${formatBytes(bytes)}，超过 ${formatBytes(MAX_DECK_BYTES)} 上限；`
      + '请减少题数、步骤或文字长度后重试（未写入任何文件）')
    this.name = 'DeckSizeError'
    this.bytes = bytes
    this.limit = MAX_DECK_BYTES
  }
}

function serializeDeck(deck) {
  return `${JSON.stringify(deck, null, 2)}\n`
}

/** Shared read path: measure bytes, not UTF-16 code units. */
function readDeckFile(path) {
  const buffer = readFileSync(path)
  if (buffer.length > MAX_DECK_BYTES) {
    throw new Error(`文件为 ${formatBytes(buffer.length)}，超过 ${formatBytes(MAX_DECK_BYTES)} 上限，未加载`)
  }
  return JSON.parse(buffer.toString('utf8'))
}

function decksIn(dir, source, errors, decks) {
  if (dir === undefined || !existsSync(dir)) return
  let names = []
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
  } catch (error) {
    errors.push(`${source}: 无法读取目录 ${dir}: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  for (const name of names) {
    const path = join(dir, name)
    try {
      const result = normalizeDeck(readDeckFile(path))
      if (result.errors.length > 0) {
        errors.push(`${source}/${name}: ${result.errors.slice(0, 3).join('；')}`)
        continue
      }
      const expected = `${result.deck.id}.json`
      if (name !== expected) {
        errors.push(`${source}/${name}: 文件名必须与题集 id 一致（应命名为 ${expected}），已跳过该文件`)
        continue
      }
      decks.set(result.deck.id, { ...result.deck, source, fileName: name })
    } catch (error) {
      errors.push(`${source}/${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/** Read bundled decks first, then user decks (same id overrides). */
function loadDecks(options = {}) {
  const bundledDir = options.bundledDir ?? BUNDLED_DIR
  const userDir = options.userDir ?? USER_DIR
  const decks = new Map()
  const errors = []
  decksIn(bundledDir, 'bundled', errors, decks)
  decksIn(userDir, 'user', errors, decks)
  const list = [...decks.values()].sort((left, right) => {
    if (left.source !== right.source) return left.source === 'user' ? -1 : 1
    return left.title.localeCompare(right.title, 'zh')
  })
  return { decks: list, errors }
}

function deckSummary(deck) {
  return {
    id: deck.id,
    title: deck.title,
    subject: deck.subject,
    description: deck.description,
    questionCount: deck.questions.length,
    source: deck.source,
  }
}

function tempPathFor(target) {
  return `${target}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Write one deck after proving it fits the read budget.  Serialize once, check
 * bytes, then rename — a save either lands readable or reports failure (C2).
 */
function saveDeckFile(deck, dir = USER_DIR) {
  const serialized = serializeDeck(deck)
  const bytes = Buffer.byteLength(serialized, 'utf8')
  if (bytes > MAX_DECK_BYTES) throw new DeckSizeError(bytes)
  mkdirSync(dir, { recursive: true })
  const target = join(dir, `${deck.id}.json`)
  const temp = tempPathFor(target)
  try {
    writeFileSync(temp, serialized, 'utf8')
    renameSync(temp, target)
  } catch (error) {
    try {
      unlinkSync(temp)
    } catch {
      /* temp file may not exist */
    }
    throw error
  }
  return { path: target, bytes }
}

function deleteUserDeck(id, dir = USER_DIR) {
  if (!ID_PATTERN.test(id)) return { ok: false, code: 'invalid-id', message: 'id 格式不合法。' }
  const target = join(dir, `${id}.json`)
  if (!existsSync(target)) {
    return { ok: false, code: 'not-found', message: `没有找到用户题集 ${id}（内置题集不能删除）。` }
  }
  try {
    unlinkSync(target)
  } catch (error) {
    return {
      ok: false,
      code: 'delete-failed',
      message: `删除失败：${error instanceof Error ? error.message : String(error)}`,
    }
  }
  return { ok: true, message: `已删除用户题集 ${id}。` }
}

function skillBody() {
  try {
    return readFileSync(join(PACKAGE_DIR, 'skill.md'), 'utf8')
  } catch {
    return '# 出题\n\n调用 quiz_list_decks，再用 quiz_save_deck 保存经过验算的题集。'
  }
}

async function readJsonBody(req, limit = 16 * 1024) {
  let size = 0
  const chunks = []
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.length
    if (size > limit) throw new Error('request body too large')
    chunks.push(buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function sendError(res, status, code, message) {
  sendJson(res, status, { ok: false, code, message })
}

const REJECTION_MESSAGES = {
  401: 'browser session required',
  403: 'request rejected by the connection trust fence',
  503: 'connection service unavailable',
}

/**
 * DSH's own trust fence: Host/Origin allowlist plus browser-session auth.
 *
 * The fences ship as `ctx.connection.requestRejection(req)`; a missing/empty
 * Host is refused here as well so an HTTP/1.0 request without Host can never
 * reach a handler (C1).  When no connection service is injected the routes
 * fail closed with 503 instead of silently serving decks unauthenticated.
 */
function trustRejection(connection, req) {
  const host = String(req?.headers?.host ?? '').trim()
  if (host === '') return 403
  if (connection === undefined || connection === null || typeof connection.requestRejection !== 'function') {
    return 503
  }
  const rejection = connection.requestRejection(req)
  return typeof rejection === 'number' ? rejection : undefined
}

function isJsonRequest(req) {
  return JSON_MEDIA_TYPE.test(String(req?.headers?.['content-type'] ?? ''))
}

/**
 * Route handlers, extracted so tests can drive them with stub req/res and a
 * stub connection without booting a DSH server.
 */
function createDeckRoutes({ connection, store = {} } = {}) {
  const dirs = { bundledDir: store.bundledDir, userDir: store.userDir }

  function reject(req, res, allowed) {
    const rejection = trustRejection(connection, req)
    if (rejection !== undefined) {
      sendError(res, rejection, rejection === 401 ? 'unauthenticated' : rejection === 403 ? 'forbidden' : 'unavailable',
        REJECTION_MESSAGES[rejection] ?? 'request rejected')
      return true
    }
    const method = String(req?.method || '').toUpperCase()
    if (method !== allowed) {
      if (typeof res.setHeader === 'function') res.setHeader('allow', allowed)
      sendError(res, 405, 'method-not-allowed', `${allowed} required`)
      return true
    }
    return false
  }

  function getDecks(req, res) {
    if (reject(req, res, 'GET')) return
    try {
      const { decks, errors } = loadDecks(dirs)
      sendJson(res, 200, { ok: true, decks, errors })
    } catch (error) {
      sendError(res, 500, 'internal', error instanceof Error ? error.message : String(error))
    }
  }

  async function deleteDeck(req, res) {
    if (reject(req, res, 'POST')) return
    if (!isJsonRequest(req)) {
      sendError(res, 415, 'unsupported-media-type', 'content-type must be application/json')
      return
    }
    try {
      const body = await readJsonBody(req)
      const id = typeof body?.id === 'string' ? body.id.trim() : ''
      if (!ID_PATTERN.test(id)) {
        sendError(res, 400, 'invalid-id', 'id 格式不合法（只能是小写字母、数字、-、_，最长 64 字符）。')
        return
      }
      const result = deleteUserDeck(id, dirs.userDir)
      if (result.ok) {
        sendJson(res, 200, result)
        return
      }
      sendError(res, result.code === 'not-found' ? 404 : 400, result.code ?? 'delete-failed', result.message)
    } catch (error) {
      sendError(res, 400, 'invalid-body', error instanceof Error ? error.message : String(error))
    }
  }

  return { getDecks, deleteDeck }
}

function toolRender(_args, value) {
  return [{ type: 'text', text: String(value?.message ?? '') }]
}

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    message: { type: 'string' },
  },
  required: ['ok', 'message'],
  additionalProperties: true,
}

const LIST_TOOL_LABEL = 'dsh-quiz: quiz_list_decks'
const SAVE_TOOL_LABEL = 'dsh-quiz: quiz_save_deck'
const DELETE_TOOL_LABEL = 'dsh-quiz: quiz_delete_deck'

/** Build the three deck tools against one store (dirs are injectable for tests). */
function createDeckTools({ bundledDir, userDir } = {}) {
  const dirs = { bundledDir, userDir }
  const listDeckTool = {
    name: 'quiz_list_decks',
    description: '列出「刷题场」里现有的题集（内置 + 用户创建）。为复习内容出题前先调用它，'
      + '避免重复创建同 id 的题集。',
    parameters: { type: 'object', properties: {} },
    output: { schema: OUTPUT_SCHEMA, render: toolRender },
    async execute() {
      const { decks, errors } = loadDecks(dirs)
      const lines = decks.map((deck) => `- ${deck.id}｜${deck.subject}｜${deck.title}`
        + `（${deck.questions.length} 题，${deck.source === 'user' ? '用户题集' : '内置'}）`)
      const message = decks.length === 0
        ? '还没有题集。'
        : `共 ${decks.length} 套题集：\n${lines.join('\n')}`
          + (errors.length > 0 ? `\n\n有 ${errors.length} 个文件未通过校验：\n${errors.slice(0, 5).join('\n')}` : '')
      return {
        ok: true,
        message,
        decks: decks.map(deckSummary),
        errors,
      }
    },
  }

  const saveDeckTool = {
    name: 'quiz_save_deck',
    description: '把一套复习题保存进「刷题场」，用户在侧边栏的刷题场页面即可逐题练习、看逐步手算解析。'
      + '适用于任意学科：先根据当前复习内容（讲义、错题、对话里讲过的知识）设计题目，'
      + '自己把答案和中间量全部算对，再用本工具保存。同 id 会覆盖旧题集；'
      + '与内置题集同 id 时写入的是用户覆盖版本（安装包里的文件不动，删掉用户版本后内置版本恢复）。\n\n'
      + DECK_SCHEMA_HINT,
    parameters: {
      type: 'object',
      properties: {
        deck: {
          type: 'string',
          description: '完整的题集 JSON 字符串（不是对象），结构见工具描述。',
        },
      },
      required: ['deck'],
    },
    output: { schema: OUTPUT_SCHEMA, render: toolRender },
    async execute(args) {
      const raw = typeof args?.deck === 'string' ? args.deck : ''
      if (!raw.trim()) {
        return { ok: false, code: 'invalid-argument', message: 'deck 不能为空，需要完整的题集 JSON 字符串。' }
      }
      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch (error) {
        return {
          ok: false,
          code: 'invalid-json',
          message: `deck 不是合法 JSON：${error instanceof Error ? error.message : String(error)}`,
        }
      }
      const result = normalizeDeck(parsed)
      if (result.errors.length > 0) {
        return {
          ok: false,
          code: 'invalid-deck',
          message: `题集校验失败，未写入：\n${result.errors.slice(0, 12).map((line) => `- ${line}`).join('\n')}`,
          errors: result.errors.slice(0, 20),
        }
      }
      let saved
      try {
        saved = saveDeckFile(result.deck, userDir)
      } catch (error) {
        if (error instanceof DeckSizeError) {
          return { ok: false, code: 'deck-too-large', message: `题集未写入：${error.message}`, limit: error.limit, bytes: error.bytes }
        }
        return {
          ok: false,
          code: 'write-failed',
          message: `保存失败：${error instanceof Error ? error.message : String(error)}`,
        }
      }
      return {
        ok: true,
        message: `已保存题集「${result.deck.title}」（${result.deck.questions.length} 题，`
          + `${formatBytes(saved.bytes)}）到 ${saved.path}。`
          + '打开侧边栏的刷题场即可练习；页面里点「刷新题集」可立即看到新题集。',
        id: result.deck.id,
        path: saved.path,
        bytes: saved.bytes,
        questionCount: result.deck.questions.length,
      }
    },
  }

  const deleteDeckTool = {
    name: 'quiz_delete_deck',
    description: '删除一套用户创建的题集（按 id）。内置题集不能被删除；如果用户题集覆盖了同名内置题集，'
      + '删掉用户题集后内置版本会重新出现。',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: '要删除的题集 id（quiz_list_decks 返回的 id）' },
      },
      required: ['id'],
    },
    output: { schema: OUTPUT_SCHEMA, render: toolRender },
    async execute(args) {
      const id = typeof args?.id === 'string' ? args.id.trim() : ''
      return deleteUserDeck(id, userDir)
    },
  }

  return { listDeckTool, saveDeckTool, deleteDeckTool }
}

export function apply(ctx, options = {}) {
  const store = {
    bundledDir: options.bundledDir ?? BUNDLED_DIR,
    userDir: options.userDir ?? USER_DIR,
  }
  const { listDeckTool, saveDeckTool, deleteDeckTool } = createDeckTools(store)

  // `connection` is DSH's trust fence (Host/Origin + browser session).  Do not
  // serve or delete decks on a route that has not passed it (C1).
  ctx.inject(['webServer', 'connection'], (webCtx) => {
    const connection = Reflect.get(webCtx, 'connection')
    const routes = createDeckRoutes({ connection, store })
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler: routes.getDecks,
    }), 'dsh-quiz: deck route')

    // UI remove: delete one user deck from the Web page. Built-in decks are
    // read-only and never reach this path.
    webCtx.effect(() => webCtx.webServer.register({
      kind: 'exact',
      path: DELETE_ROUTE,
      handler: routes.deleteDeck,
    }), 'dsh-quiz: deck delete route')
  })

  ctx.inject(['skills'], (skillCtx) => {
    skillCtx.effect(() => skillCtx.skills.register({
      name: SKILL_NAME,
      description: SKILL_DESCRIPTION,
      whenToUse: SKILL_WHEN_TO_USE,
      source: 'custom',
      invocation: { modelInvocable: true, userInvocable: true },
      content: skillBody(),
    }), 'dsh-quiz: deck authoring skill')
  })

  ctx.inject(['tools'], (toolCtx) => {
    toolCtx.effect(() => toolCtx.tools.register(listDeckTool), LIST_TOOL_LABEL)
    toolCtx.effect(() => toolCtx.tools.register(saveDeckTool), SAVE_TOOL_LABEL)
    toolCtx.effect(() => toolCtx.tools.register(deleteDeckTool), DELETE_TOOL_LABEL)
  })
}

/**
 * Test-only surface.  Not part of the plugin contract and not re-exported by
 * `exports` in package.json; `test/` drives these with temp dirs and stub
 * requests so the security/size/normalization contracts stay regression-tested.
 */
export const __internal = {
  LIMITS,
  MAX_DECK_BYTES,
  ID_PATTERN,
  BUNDLED_DIR,
  normalizeDeck,
  readDeckFile,
  saveDeckFile,
  serializeDeck,
  deleteUserDeck,
  loadDecks,
  decksIn,
  createDeckRoutes,
  createDeckTools,
  trustRejection,
  isJsonRequest,
  formatBytes,
  DeckSizeError,
  skillBody,
}
