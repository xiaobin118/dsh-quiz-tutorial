/**
 * Client-half regression tests without a browser.
 *
 * `client.js` is a classic script that registers a factory with
 * `window.__ModuleLoader__`.  Loading it in a `node:vm` context with stubs lets
 * the tests reach the pure helpers directly and materialize the plugin face, so
 * the math renderer and the progress-purge fixes stay covered while DSH itself
 * is not running.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

function loadClient() {
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8')
  let config = null
  const registrations = []
  const styleTags = []
  const context = vm.createContext({
    window: {
      __ModuleLoader__: { load(candidate) { config = candidate } },
      location: { href: 'http://127.0.0.1:3080/' },
      localStorage: { getItem: () => null, setItem() {} },
    },
    document: {
      currentScript: null,
      createElement() {
        const tag = { dataset: {}, textContent: '', remove() {} }
        styleTags.push(tag)
        return tag
      },
      head: { appendChild() {} },
    },
    console,
    URL,
  })
  vm.runInContext(source, context, { filename: 'client.js' })

  const react = {
    createElement: (...args) => ['el', ...args],
    Fragment: 'Fragment',
    useCallback: (fn) => fn,
    useEffect() {},
    useMemo: (fn) => fn(),
    useRef: () => ({}),
    useState: (value) => [value, () => {}],
  }
  const exported = config.factory((name) => {
    if (name !== 'react') throw new Error(`unexpected require(${name})`)
    return react
  })
  const ctx = {
    effect(fn) { return fn() },
    locale: {
      register(namespace, dictionaries) { registrations.push(['locale', namespace, Object.keys(dictionaries)]); return () => {} },
      bind() { return (key) => key },
    },
    slots: {
      inject(name, fn) { fn() },
      register(definition, component) {
        registrations.push(['slot', definition.name, definition.key ?? definition.id, typeof component])
        return () => {}
      },
    },
    layout: { selectPanel() {} },
  }
  exported.apply(ctx)

  return {
    config,
    exported,
    registrations,
    styleTags,
    run: (expression) => vm.runInContext(expression, context),
  }
}

const client = loadClient()

test('the bundle registers the documented module id and plugin face', () => {
  assert.equal(client.config.id, 'dsh-quiz-tutorial')
  assert.deepEqual([...client.exported.inject], ['slots', 'locale', 'layout'])
  assert.deepEqual(client.registrations, [
    ['locale', 'dsh-quiz', ['zh', 'en']],
    ['slot', 'main', 'quiz', 'function'],
    ['slot', 'sidebar.panellist', 'quiz', 'function'],
  ])
  assert.equal(client.styleTags.length, 1, 'styles are injected once')
  assert.match(client.styleTags[0].textContent, /\.dshq-page/)
})

test('math tokens: plain prose passes through untouched', () => {
  const tokens = client.run('mathTokens("普通文本，没有数学。")')
  assert.deepEqual(JSON.parse(JSON.stringify(tokens)), [{ type: 'text', text: '普通文本，没有数学。' }])
})

test('math tokens: subscripts and superscripts render as nodes', () => {
  const tokens = JSON.parse(JSON.stringify(client.run('mathTokens("H_out = e^{−2.1115}")')))
  assert.deepEqual(tokens, [
    { type: 'text', text: 'H' },
    { type: 'sub', tokens: [{ type: 'text', text: 'out' }] },
    { type: 'text', text: ' = e' },
    { type: 'sup', tokens: [{ type: 'text', text: '−2.1115' }] },
  ])
})

test('math tokens: dollar delimiters are dropped, not shown', () => {
  const tokens = JSON.parse(JSON.stringify(client.run('mathTokens("$x^2$ 和 q_ik")')))
  assert.equal(JSON.stringify(tokens).includes('$'), false)
  assert.deepEqual(tokens, [
    { type: 'text', text: 'x' },
    { type: 'sup', tokens: [{ type: 'text', text: '2' }] },
    { type: 'text', text: ' 和 q' },
    { type: 'sub', tokens: [{ type: 'text', text: 'ik' }] },
  ])
})

test('math tokens: commands become symbols and fractions', () => {
  assert.equal(JSON.stringify(client.run('mathTokens("\\\\frac{1}{2}")')), JSON.stringify([{ type: 'text', text: '1/2' }]))
  assert.equal(JSON.stringify(client.run('mathTokens("\\\\frac{H+2P-K}{S}")')), JSON.stringify([{ type: 'text', text: '(H+2P-K)/S' }]))
  assert.equal(JSON.stringify(client.run('mathTokens("\\\\sqrt{x}")')), JSON.stringify([{ type: 'text', text: '√x' }]))
  const sum = JSON.parse(JSON.stringify(client.run('mathTokens("\\\\sum_{k=1}^{K}")')))
  assert.deepEqual(sum, [
    { type: 'text', text: 'Σ' },
    { type: 'sub', tokens: [{ type: 'text', text: 'k=1' }] },
    { type: 'sup', tokens: [{ type: 'text', text: 'K' }] },
  ])
  assert.deepEqual(
    JSON.parse(JSON.stringify(client.run('mathTokens("\\\\alpha_{k}")'))),
    [
      { type: 'text', text: 'α' },
      { type: 'sub', tokens: [{ type: 'text', text: 'k' }] },
    ],
  )
})

test('math tokens: unknown commands and LaTeX environments degrade, never throw', () => {
  assert.equal(JSON.stringify(client.run('mathTokens("\\\\foo")')), JSON.stringify([{ type: 'text', text: 'foo' }]))
  assert.ok(client.run('mathTokens("\\\\begin{matrix} x \\\\end{matrix}")').length > 0)
  assert.equal(client.run('mathTokens("x^{a_b}")[1].type'), 'sup')
  assert.equal(client.run('mathTokens("x^{a_b}")[1].tokens[1].type'), 'sub')
})

test('mathPlainText gives accessible labels without markup', () => {
  assert.equal(client.run('mathPlainText("||x−μ_k||²")'), '||x−μk||²')
  assert.equal(client.run('mathPlainText("$J=Σ_{k=1}^{K}$")'), 'J=Σk=1K')
})

test('progress helpers purge exactly one deck', () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(client.run('withoutDeckAnswers({ a: { q1: 1 }, b: {} }, "a")'))),
    { b: {} },
  )
  assert.deepEqual(
    JSON.parse(JSON.stringify(client.run('withoutDeckMistakes({ "a::q1": { wrong: 1 }, "a::q2": { wrong: 2 }, "b::q3": { wrong: 3 } }, "a")'))),
    { 'b::q3': { wrong: 3 } },
  )
  assert.deepEqual(JSON.parse(JSON.stringify(client.run('withoutHiddenDeck(["a","b"], "b")'))), ['a'])
  assert.deepEqual(JSON.parse(JSON.stringify(client.run('withDeckVisible(["a","b"], "b")'))), ['a'])
  assert.deepEqual(JSON.parse(JSON.stringify(client.run('withDeckVisible(["a"], "z")'))), ['a'])
})

test('mistake rows resolve known questions and keep orphans addressable', () => {
  const rows = JSON.parse(JSON.stringify(client.run(`mistakeRows(
    [{ id: 'd1', questions: [{ id: 'q1', answer: 1 }] }],
    {
      'd1::q1': { wrong: 2, lastAt: 20, masteredAt: null, lastPick: 0 },
      'gone::q9': { wrong: 1, lastAt: 10, masteredAt: null, lastPick: null },
    },
  )`)))
  assert.equal(rows.length, 2)
  assert.equal(rows[0].deckId, 'd1')
  assert.equal(rows[0].question.id, 'q1')
  assert.equal(rows[1].question, null)
  assert.equal(rows[1].deck, null)
})

test('stored mistakes are normalized defensively', () => {
  const mistakes = JSON.parse(JSON.stringify(client.run(`normalizeMistakes({
    good: { wrong: 3, lastAt: 5, masteredAt: 6, lastPick: 1 },
    bad: { wrong: -1, lastAt: 'x', masteredAt: 'y', lastPick: 1.5 },
  })`)))
  assert.deepEqual(mistakes.good, { wrong: 3, lastAt: 5, masteredAt: 6, lastPick: 1 })
  assert.equal(mistakes.bad.wrong, 1)
  assert.equal(mistakes.bad.masteredAt, null)
  assert.equal(mistakes.bad.lastPick, null)
})

test('keyboard hint matches the six-option schema', () => {
  assert.equal(client.run("zh['quiz.keyboardHint']"), '键盘：A–F 选答案，← / → 切题')
  assert.match(client.run("en['quiz.keyboardHint']"), /A–F/)
})
