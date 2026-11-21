/**
 * dsh-quiz — Host half.
 *
 * Serves the review decks to the Web UI and lets the agent turn any review
 * context into a deck:
 *   GET /dsh-quiz/decks            -> { ok, decks, errors }
 *   tool quiz_list_decks           -> list installed decks
 *   tool quiz_save_deck            -> validate + write one deck JSON
 *   tool quiz_delete_deck          -> remove a user deck
 *
 * Decks live in <DSH_HOME>/dsh-quiz/decks/<id>.json (user decks override a
 * bundled deck with the same id).  Bundled decks ship in ./decks and are
 * read-only; saving a deck with the same id is the supported way to update it.
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
const SKILL_NAME = 'dsh-quiz'
const SKILL_DESCRIPTION = '从当前复习内容直接生成一套「刷题场」题集：自己算对每道题的答案与中间量，用 quiz_save_deck 保存，用户打开刷题场刷新即可练习。'
const SKILL_WHEN_TO_USE = '用户说 /skill dsh-quiz、想复习或备考某个主题、或要求根据讲义、错题、对话内容生成练习题时。'

const DECK_SCHEMA_HINT = `deck JSON 结构（必填项见括号）：
{
  "id": "小写字母/数字/-/_ 的短 id（必填）",
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
规则：每题 options 2–6 个、answer 是 0 基下标；矩阵必须是矩形数字数组；所有答案与中间量必须真实计算过，不许估算。`

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value, max) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function numberValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function normalizeMatrix(raw, path, errors, maxDim = 12) {
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
  if (raw.length > 8) {
    errors.push(`${path}.inputs 最多 8 项`)
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
    const label = text(input.label, 40)
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
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 6) {
    errors.push(`${path}.options 必须是 2–6 个选项的数组`)
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
    const note = text(option.note, 300) || undefined
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
      const value = text(option.text, 400)
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
  if (raw.length > 40) {
    errors.push(`${path}.steps 最多 40 步`)
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
    const title = text(step.title, 120)
    const body = text(step.body, 4000)
    if (!title) errors.push(`${at}.title 不能为空`)
    if (!body) errors.push(`${at}.body 不能为空`)
    if (!title || !body) continue
    const normalized = { title, body }
    if (Array.isArray(step.matrices) && step.matrices.length > 0) {
      if (step.matrices.length > 4) {
        errors.push(`${at}.matrices 最多 4 个矩阵`)
      } else {
        const matrices = []
        for (let j = 0; j < step.matrices.length; j += 1) {
          const entry = step.matrices[j]
          const atM = `${at}.matrices[${j + 1}]`
          if (!isRecord(entry)) {
            errors.push(`${atM} 必须是对象`)
            continue
          }
          const label = text(entry.label, 80)
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
  if (raw.length > 20) {
    errors.push(`${path}.notes 最多 20 张速查卡`)
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
    const title = text(note.title, 120)
    const body = text(note.body, 2000)
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
  const id = text(raw.id, 64)
  if (!ID_PATTERN.test(id)) {
    errors.push('id 只能包含小写字母、数字、-、_，且以字母或数字开头（最长 64）')
  }
  const title = text(raw.title, 120)
  if (!title) errors.push('title 不能为空')
  const subject = text(raw.subject, 60)
  if (!subject) errors.push('subject 不能为空')
  const description = text(raw.description, 600)
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    errors.push('questions 至少要有 1 道题')
    return { errors }
  }
  if (raw.questions.length > 100) {
    errors.push('questions 最多 100 道题')
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
    let qid = text(question.id, 64) || `q${i + 1}`
    if (questionIds.has(qid)) qid = `${qid}-${i + 1}`
    questionIds.add(qid)
    const topic = text(question.topic, 80)
    if (!topic) errors.push(`${at}.topic 不能为空`)
    const prompt = text(question.prompt, 4000)
    if (!prompt) errors.push(`${at}.prompt 不能为空`)
    const options = normalizeOptions(question.options, at, errors)
    if (options.length < 2) errors.push(`${at}.options 至少要有 2 个有效选项`)
    const answer = Number.isInteger(question.answer) ? question.answer : numberValue(question.answer)
    if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
      errors.push(`${at}.answer 必须是 0 到 ${Math.max(options.length - 1, 0)} 之间的整数下标`)
    }
    const steps = normalizeSteps(question.steps, at, errors)
    const inputs = normalizeInputs(question.inputs, at, errors)
    if (!topic || !prompt || options.length < 2 || !Number.isInteger(answer) || steps.length === 0) continue
    const normalized = {
      id: qid,
      topic,
      level: text(question.level, 20) || '基础',
      prompt,
      inputs,
      conditions: text(question.conditions, 600),
      options,
      answer,
      formula: text(question.formula, 800),
      steps,
      pitfall: text(question.pitfall, 600),
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

function readDeckFile(path) {
  const rawText = readFileSync(path, 'utf8')
  if (rawText.length > MAX_DECK_BYTES) throw new Error('file exceeds 512 KiB')
  return JSON.parse(rawText)
}

function decksIn(dir, source, errors, decks) {
  if (!existsSync(dir)) return
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
      decks.set(result.deck.id, { ...result.deck, source, fileName: name })
    } catch (error) {
      errors.push(`${source}/${name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/** Read bundled decks first, then user decks (same id overrides). */
function loadDecks() {
  const decks = new Map()
  const errors = []
  decksIn(BUNDLED_DIR, 'bundled', errors, decks)
  decksIn(USER_DIR, 'user', errors, decks)
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

function writeDeckFile(deck) {
  mkdirSync(USER_DIR, { recursive: true })
  const target = join(USER_DIR, `${deck.id}.json`)
  const temp = `${target}.tmp-${process.pid}-${Date.now()}`
  writeFileSync(temp, `${JSON.stringify(deck, null, 2)}\n`, 'utf8')
  renameSync(temp, target)
  return target
}

function deleteUserDeck(id) {
  if (!ID_PATTERN.test(id)) return { ok: false, message: 'id 格式不合法。' }
  const target = join(USER_DIR, `${id}.json`)
  if (!existsSync(target)) {
    return { ok: false, message: `没有找到用户题集 ${id}（内置题集不能删除）。` }
  }
  try {
    unlinkSync(target)
  } catch (error) {
    return { ok: false, message: `删除失败：${error instanceof Error ? error.message : String(error)}` }
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

function requestHost(req) {
  const raw = String(req.headers.host || '').trim().toLowerCase()
  if (raw === '') return ''
  if (raw.startsWith('[')) {
    const end = raw.indexOf(']')
    return end === -1 ? raw : raw.slice(0, end + 1)
  }
  const colon = raw.lastIndexOf(':')
  return colon === -1 ? raw : raw.slice(0, colon)
}

function allowedHosts() {
  const extra = String(process.env.DSH_QUIZ_ALLOWED_HOSTS || '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
  return new Set(['', '127.0.0.1', 'localhost', '::1', '[::1]', ...extra])
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

function toolResult(value) {
  return value
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

const listDeckTool = {
  name: 'quiz_list_decks',
  description: '列出「刷题场」里现有的题集（内置 + 用户创建）。为复习内容出题前先调用它，'
    + '避免重复创建同 id 的题集。',
  parameters: { type: 'object', properties: {} },
  output: { schema: OUTPUT_SCHEMA, render: toolRender },
  async execute() {
    const { decks, errors } = loadDecks()
    const lines = decks.map((deck) => `- ${deck.id}｜${deck.subject}｜${deck.title}`
      + `（${deck.questions.length} 题，${deck.source === 'user' ? '用户题集' : '内置'}）`)
    const message = decks.length === 0
      ? '还没有题集。'
      : `共 ${decks.length} 套题集：\n${lines.join('\n')}`
        + (errors.length > 0 ? `\n\n有 ${errors.length} 个文件未通过校验：\n${errors.slice(0, 5).join('\n')}` : '')
    return toolResult({
      ok: true,
      message,
      decks: decks.map(deckSummary),
      errors,
    })
  },
}

const saveDeckTool = {
  name: 'quiz_save_deck',
  description: '把一套复习题保存进「刷题场」，用户在侧边栏的刷题场页面即可逐题练习、看逐步手算解析。'
    + '适用于任意学科：先根据当前复习内容（讲义、错题、对话里讲过的知识）设计题目，'
    + '自己把答案和中间量全部算对，再用本工具保存。同 id 会覆盖旧题集（也可用来更新内置题集）。\n\n'
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
    if (!raw.trim()) return { ok: false, message: 'deck 不能为空，需要完整的题集 JSON 字符串。' }
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      return { ok: false, message: `deck 不是合法 JSON：${error instanceof Error ? error.message : String(error)}` }
    }
    const result = normalizeDeck(parsed)
    if (result.errors.length > 0) {
      return {
        ok: false,
        message: `题集校验失败，未写入：\n${result.errors.slice(0, 12).map((line) => `- ${line}`).join('\n')}`,
      }
    }
    const path = writeDeckFile(result.deck)
    return {
      ok: true,
      message: `已保存题集「${result.deck.title}」（${result.deck.questions.length} 题）到 ${path}。`
        + '打开侧边栏的刷题场即可练习；页面里点「刷新题集」可立即看到新题集。',
      id: result.deck.id,
      path,
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
    return deleteUserDeck(id)
  },
}

export function apply(ctx) {
  ctx.inject(['webServer'], (webCtx) => {
    const webServer = webCtx.webServer
    webCtx.effect(() => webServer.register({
      kind: 'exact',
      path: ROUTE,
      handler(req, res) {
        if (String(req.method || '').toUpperCase() !== 'GET') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        if (!allowedHosts().has(requestHost(req))) {
          sendJson(res, 403, { ok: false, error: 'forbidden host' })
          return
        }
        try {
          const { decks, errors } = loadDecks()
          sendJson(res, 200, { ok: true, decks, errors })
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      },
    }), 'dsh-quiz: deck route')

    // UI remove: delete one user deck from the Web page. Built-in decks are
    // read-only and never reach this path.
    webCtx.effect(() => webServer.register({
      kind: 'exact',
      path: DELETE_ROUTE,
      async handler(req, res) {
        if (String(req.method || '').toUpperCase() !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }
        if (!allowedHosts().has(requestHost(req))) {
          sendJson(res, 403, { ok: false, error: 'forbidden host' })
          return
        }
        try {
          const body = await readJsonBody(req)
          const id = typeof body?.id === 'string' ? body.id.trim() : ''
          if (!ID_PATTERN.test(id)) {
            sendJson(res, 400, { ok: false, error: 'invalid deck id' })
            return
          }
          const result = deleteUserDeck(id)
          sendJson(res, result.ok ? 200 : 404, result)
        } catch (error) {
          sendJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
        }
      },
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
    toolCtx.effect(() => toolCtx.tools.register(listDeckTool), 'dsh-quiz: quiz_list_decks')
    toolCtx.effect(() => toolCtx.tools.register(saveDeckTool), 'dsh-quiz: quiz_save_deck')
    toolCtx.effect(() => toolCtx.tools.register(deleteDeckTool), 'dsh-quiz: quiz_delete_deck')
  })
}
