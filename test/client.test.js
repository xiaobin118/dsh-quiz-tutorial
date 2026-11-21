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

function loadClient({ primitives = { MarkdownText() {} } } = {}) {
  const source = readFileSync(join(ROOT, 'client.js'), 'utf8')
  let config = null
  const registrations = []
  const styleTags = []
  const requires = []
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
    requires.push(name)
    if (name === 'react') return react
    if (name === '@deepseek-ai/dsh-client-ui-primitives') {
      if (primitives === null) throw new Error('module unavailable')
      return primitives
    }
    throw new Error(`unexpected require(${name})`)
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
    requires,
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

test('deck math is rendered through the KaTeX Markdown primitive', () => {
  assert.ok(client.requires.includes('@deepseek-ai/dsh-client-ui-primitives'))
  const bundle = readFileSync(join(ROOT, 'client.js'), 'utf8')
  assert.match(bundle, /MarkdownText/)
  assert.match(bundle, /variant: 'compact'/)
  // the Unicode sup/sub renderer is gone: KaTeX is the only math path
  assert.equal(bundle.includes('mathTokens'), false)
  assert.equal(bundle.includes('dshq-math-sup'), false)
})

test('the primitive is optional: a host without it still registers the panel', () => {
  const fallback = loadClient({ primitives: null })
  assert.deepEqual(fallback.registrations.map((entry) => entry[0]), ['locale', 'slot', 'slot'])
  assert.ok(fallback.requires.includes('@deepseek-ai/dsh-client-ui-primitives'))
})

test('legacy deck text is normalized to $...$ around every math run', () => {
  const strings = [
    'J=Σ_{k=1}^{K}Σ_{x∈C_k}||x−μ_k||²。',
    'p(y)=Σ_k π_k N(y;μ_k,σ_k²)；ln p(y) 是单个样本的对数似然贡献。',
    '分配看距离平方；更新 μ_k=簇内均值；SSE=Σ||x−μ_k||²。',
    'MSE = (1/n) Σ (x_i − x̂_i)²。',
  ]
  const banned = /[Σμσπγ²_^∈×−½⊙√≤≥≈≠→]/
  const outside = (text) => text.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, '')
  for (const source of strings) {
    const normalized = client.run(`toLatexMarkdown(${JSON.stringify(source)})`)
    assert.ok(normalized.includes('$'), `normalized: ${normalized}`)
    assert.equal(banned.test(outside(normalized)), false, `math left outside $...$: ${normalized}`)
  }
})

test('the four reported strings keep their prose and group scripts', () => {
  const normalize = (source) => client.run(`toLatexMarkdown(${JSON.stringify(source)})`)
  const samples = [
    ['J=Σ_{k=1}^{K}Σ_{x∈C_k}||x−μ_k||²。',
      'J=\\Sigma_{k=1}^{K}\\Sigma_{x\\in C_{k}}||x-\\mu_{k}||^{2}'],
    ['MSE = (1/n) Σ (x_i − x̂_i)²。',
      'MSE = (1/n) \\Sigma (x_{i} - \\hat{x}_{i})^{2}'],
  ]
  for (const [source, expected] of samples) {
    const normalized = normalize(source)
    assert.ok(normalized.includes(`$${expected}$`), `${normalized} should contain ${expected}`)
  }
  const probability = normalize('p(y)=Σ_k π_k N(y;μ_k,σ_k²)；ln p(y) 是单个样本的对数似然贡献。')
  assert.ok(probability.includes('ln $p(y)$'), probability)
  assert.ok(probability.includes('；'), 'Chinese prose survives outside math')
})

test('latexPlainText strips delimiters and commands for aria labels', () => {
  const plain = (source) => client.run(`latexPlainText(${JSON.stringify(source)})`)
  assert.equal(plain('$H_{out}$ 的平方'), 'Hout 的平方')
  assert.equal(plain('$\\mu_k$'), 'μk')
  assert.equal(plain('||x−μ_k||²').includes('$'), false)
})

test('authored LaTeX passes through unchanged', () => {
  const authored = '输出 $H_{out} = \\lfloor (H + 2P - K)/S \\rfloor + 1$，见 $$\\sum_{k=1}^{K} \\pi_k = 1$$。'
  assert.equal(client.run(`toLatexMarkdown(${JSON.stringify(authored)})`), authored)
})

test('malformed legacy math degrades to text instead of throwing', () => {
  for (const source of ['未闭合的 { 花括号 x_', '结尾反斜杠 C_k\\', '孤立 ^ 和 _', '$$ 未闭合']) {
    const normalized = client.run(`toLatexMarkdown(${JSON.stringify(source)})`)
    assert.equal(typeof normalized, 'string')
  }
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

test('reduced-motion media query sits at CSS top level, not inside @keyframes', () => {
  const css = client.run('CSS')
  const depthAt = []
  let depth = 0
  for (let i = 0; i < css.length; i += 1) {
    if (css.startsWith('@media', i) || css.startsWith('@keyframes', i)) depthAt.push([css.slice(i, css.indexOf('{', i)), depth])
    if (css[i] === '{') depth += 1
    else if (css[i] === '}') depth -= 1
  }
  assert.ok(depthAt.length > 0)
  for (const [label, depth] of depthAt) {
    assert.equal(depth, 0, `${label.trim()} must be top-level CSS (found depth ${depth})`)
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.dshq-loader-dot \{ animation: none;/)
})

test('refresh diff reports added / updated / removed decks honestly', () => {
  const run = (expression) => JSON.parse(JSON.stringify(client.run(expression)))
  const first = [{ id: 'a', source: 'user', title: 'A' }, { id: 'b', source: 'bundled', title: 'B' }]
  const second = [
    { id: 'a', source: 'user', title: 'A v2' },
    { id: 'c', source: 'user', title: 'C' },
  ]
  const diff = run(`diffDecks(${JSON.stringify(first)}, ${JSON.stringify(second)})`)
  assert.deepEqual(diff, { added: ['c'], updated: ['a'], removed: ['b'] })

  const same = run(`refreshSummary(${JSON.stringify(second)}, ${JSON.stringify(second)})`)
  assert.equal(same.changed, 0)
  assert.equal(same.total, 2)
  assert.equal(same.userCount, 2)
})

test('refresh after a save: new id is added, same id is updated, not both', () => {
  const run = (expression) => JSON.parse(JSON.stringify(client.run(expression)))
  const empty = []
  const saved = [{ id: 'ml-new', source: 'user', title: '新题集', questions: [{ id: 'q1' }] }]
  const added = run(`refreshSummary(${JSON.stringify(empty)}, ${JSON.stringify(saved)})`)
  assert.deepEqual(added.added, ['ml-new'])
  assert.deepEqual(added.updated, [])
  assert.equal(added.changed, 1)

  const overwritten = [{ ...saved[0], title: '新题集 v2' }]
  const updated = run(`refreshSummary(${JSON.stringify(saved)}, ${JSON.stringify(overwritten)})`)
  assert.deepEqual(updated.added, [])
  assert.deepEqual(updated.updated, ['ml-new'], 'an id collision is an update, never a second add')
  assert.equal(updated.changed, 1)

  const unchanged = run(`refreshSummary(${JSON.stringify(overwritten)}, ${JSON.stringify(overwritten)})`)
  assert.equal(unchanged.changed, 0)
  assert.deepEqual(unchanged.added, [])
})

test('deck markdown cannot fetch remote media', () => {
  const source = '图示 ![图](https://evil.example/x.png) 与 [链接](https://evil.example/a)'
  const cleaned = client.run(`neutralizeMarkdownMedia(${JSON.stringify(source)})`)
  assert.equal(cleaned.includes('http'), false)
  assert.ok(cleaned.includes('图示'))
  assert.ok(cleaned.includes('链接'))
})

test('keyboard hint matches the six-option schema', () => {
  assert.equal(client.run("zh['quiz.keyboardHint']"), '键盘：A–F 选答案，← / → 切题')
  assert.match(client.run("en['quiz.keyboardHint']"), /A–F/)
})
