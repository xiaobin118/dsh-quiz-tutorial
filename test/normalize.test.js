/**
 * Deck normalization contract: explicit errors for over-long text (never
 * silent truncation), duplicate question ids, option/answer bounds, matrices,
 * and traversal-shaped ids.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { __internal } from '../index.js'

const { normalizeDeck, LIMITS } = __internal

function validDeck(overrides = {}) {
  return {
    id: 'unit-deck',
    title: '单元测试题集',
    subject: '测试',
    description: '一句话',
    questions: [
      {
        id: 'q1',
        topic: '主题',
        level: '基础',
        prompt: '题干',
        inputs: [{ label: 'X', matrix: [[1, 2], [3, 4]] }, { label: 'b', scalar: -1 }],
        conditions: 'P=0',
        options: [
          { kind: 'matrix', matrix: [[1]] },
          { kind: 'matrix', matrix: [[2]], note: '漏加偏置' },
        ],
        answer: 0,
        formula: 'H_out = 1',
        steps: [{ title: '第 1 步', body: '代入得 1。' }],
        pitfall: '别漏偏置',
      },
    ],
    ...overrides,
  }
}

test('a minimal valid deck normalizes with no errors', () => {
  const { errors, deck } = normalizeDeck(validDeck())
  assert.deepEqual(errors, [])
  assert.equal(deck.id, 'unit-deck')
  assert.equal(deck.questions[0].id, 'q1')
  assert.equal(deck.version, 1)
})

test('over-long text is an error, not a silent slice', () => {
  const deck = validDeck()
  deck.questions[0].prompt = 'x'.repeat(LIMITS.prompt + 1)
  const { errors, deck: normalized } = normalizeDeck(deck)
  assert.equal(normalized, undefined)
  assert.ok(errors.some((line) => line.includes('超过 4000 字符上限')), errors.join('\n'))
})

test('control characters are rejected instead of saved as broken LaTeX', () => {
  const tabbed = validDeck()
  tabbed.questions[0].prompt = '输入是 $10\\times10$'.replace('\\times', '\t' + 'imes')
  const { errors } = normalizeDeck(tabbed)
  assert.ok(errors.some((line) => line.includes('控制字符')), errors.join('\n'))
  assert.ok(errors.some((line) => line.includes('双写')), errors.join('\n'))

  const multiline = validDeck()
  multiline.questions[0].prompt = '第一行\n第二行'
  assert.deepEqual(normalizeDeck(multiline).errors, [])

  const crlf = validDeck()
  crlf.questions[0].prompt = '第一行\r\n第二行'
  assert.deepEqual(normalizeDeck(crlf).errors, [])

  const brokenNabla = validDeck()
  brokenNabla.questions[0].prompt = '求梯度 $' + '\n' + 'abla f$'
  const { errors: nablaErrors } = normalizeDeck(brokenNabla)
  assert.ok(nablaErrors.some((line) => line.includes('行内公式里有换行')), nablaErrors.join('\n'))

  const brokenRight = validDeck()
  brokenRight.questions[0].prompt = '括号 $' + '\r' + 'ight)$'
  const { errors: rightErrors } = normalizeDeck(brokenRight)
  assert.ok(rightErrors.some((line) => line.includes('控制字符')), rightErrors.join('\n'))
})

test('exactly-at-limit text is accepted untouched', () => {
  const deck = validDeck()
  deck.questions[0].prompt = 'x'.repeat(LIMITS.prompt)
  const { errors, deck: normalized } = normalizeDeck(deck)
  assert.deepEqual(errors, [])
  assert.equal(normalized.questions[0].prompt.length, LIMITS.prompt)
})

test('deck-level and nested caps are enforced', () => {
  const longTitle = normalizeDeck(validDeck({ title: 'x'.repeat(LIMITS.title + 1) }))
  assert.ok(longTitle.errors.some((line) => line.includes('title')))

  const longStep = validDeck()
  longStep.questions[0].steps[0].body = 'x'.repeat(LIMITS.stepBody + 1)
  assert.ok(normalizeDeck(longStep).errors.some((line) => line.includes('steps[1].body')))

  const longNote = validDeck({ notes: [{ title: 't', body: 'x'.repeat(LIMITS.noteBody + 1) }] })
  assert.ok(normalizeDeck(longNote).errors.some((line) => line.includes('notes[1].body')))

  const longOption = validDeck()
  longOption.questions[0].options[0] = { kind: 'text', text: 'x'.repeat(LIMITS.optionText + 1) }
  assert.ok(normalizeDeck(longOption).errors.some((line) => line.includes('options[1].text')))
})

test('multi-select answers are sorted, unique and mutually exclusive with answer', () => {
  const deck = validDeck()
  deck.questions[0].options.push({ kind: 'matrix', matrix: [[3]] }, { kind: 'matrix', matrix: [[4]] })
  delete deck.questions[0].answer
  deck.questions[0].answers = [2, 0]
  const { errors, deck: normalized } = normalizeDeck(deck)
  assert.deepEqual(errors, [])
  assert.deepEqual(normalized.questions[0].answers, [0, 2])
  assert.equal('answer' in normalized.questions[0], false)
})

test('malformed multi-select answers fail with an actionable error', () => {
  const cases = [
    ['both fields', (q) => { q.answers = [0, 1] }, '只能二选一'],
    ['neither field', (q) => { delete q.answer }, '必须提供 answer'],
    ['too few', (q) => { delete q.answer; q.answers = [0] }, '至少要有 2 个'],
    ['duplicate', (q) => { delete q.answer; q.answers = [0, 0] }, '重复下标'],
    ['out of range', (q) => { delete q.answer; q.answers = [0, 9] }, '超出'],
    ['not an integer', (q) => { delete q.answer; q.answers = [0, '1'] }, '整数下标'],
    ['not an array', (q) => { delete q.answer; q.answers = 0 }, '必须是数组'],
    ['more than options', (q) => { delete q.answer; q.answers = [0, 1, 2, 3, 4] }, '不能超过选项数'],
  ]
  for (const [name, mutate, expected] of cases) {
    const deck = validDeck()
    mutate(deck.questions[0])
    const { errors } = normalizeDeck(deck)
    assert.ok(errors.some((line) => line.includes(expected)), `${name}: ${errors.join('\n')}`)
  }
})

test('duplicate question ids are rejected instead of renamed', () => {
  const deck = validDeck()
  deck.questions.push(structuredClone(deck.questions[0]))
  const { errors } = normalizeDeck(deck)
  assert.ok(errors.some((line) => line.includes('重复')), errors.join('\n'))
})

test('option, answer and matrix rules produce actionable errors', () => {
  const oneOption = validDeck()
  oneOption.questions[0].options = [{ kind: 'matrix', matrix: [[1]] }]
  assert.ok(normalizeDeck(oneOption).errors.some((line) => line.includes('2–6')))

  const duplicate = validDeck()
  duplicate.questions[0].options = [{ kind: 'matrix', matrix: [[1]] }, { kind: 'matrix', matrix: [[1]] }]
  assert.ok(normalizeDeck(duplicate).errors.some((line) => line.includes('重复')))

  const outOfRange = validDeck()
  outOfRange.questions[0].answer = 2
  assert.ok(normalizeDeck(outOfRange).errors.some((line) => line.includes('answer')))

  const ragged = validDeck()
  ragged.questions[0].options[0] = { kind: 'matrix', matrix: [[1], [1, 2]] }
  assert.ok(normalizeDeck(ragged).errors.some((line) => line.includes('列数')))

  const nonNumeric = validDeck()
  nonNumeric.questions[0].options[0] = { kind: 'matrix', matrix: [['x']] }
  assert.ok(normalizeDeck(nonNumeric).errors.some((line) => line.includes('有限数字')))
})

test('traversal-shaped and over-long deck ids are rejected', () => {
  for (const id of ['../evil', 'a/b', '.', 'a..b', '', 'A-upper', 'x'.repeat(LIMITS.id + 1)]) {
    const { errors } = normalizeDeck(validDeck({ id }))
    assert.ok(errors.some((line) => line.includes('id')), `id ${JSON.stringify(id)} must be rejected`)
  }
})

test('inputs must be exactly one of matrix/scalar', () => {
  const both = validDeck()
  both.questions[0].inputs = [{ label: 'x', matrix: [[1]], scalar: 1 }]
  assert.ok(normalizeDeck(both).errors.some((line) => line.includes('matrix 或 scalar')))

  const tooMany = validDeck()
  tooMany.questions[0].inputs = Array.from({ length: LIMITS.inputs + 1 }, (_, i) => ({ label: `i${i}`, scalar: i }))
  assert.ok(normalizeDeck(tooMany).errors.some((line) => line.includes('最多 8 项')))
})
