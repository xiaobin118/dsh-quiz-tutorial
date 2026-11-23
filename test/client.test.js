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
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
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

test('matrixToLatex builds a balanced bmatrix without HTML', () => {
  const run = (matrix) => client.run(`matrixToLatex(${JSON.stringify(matrix)})`)
  assert.equal(run([[1, 2], [3, 4]]), '\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}')
  assert.equal(run([[-1, 0.5], [2.25, -3]]), '\\begin{bmatrix} -1 & 0.5 \\\\ 2.25 & -3 \\end{bmatrix}')
  const escaped = run([['a&b', 'c_d'], ['50%', '#1']])
  assert.ok(escaped.includes('a\\&b'))
  assert.ok(escaped.includes('c\\_d'))
  assert.ok(escaped.includes('50\\%'))
  assert.ok(escaped.includes('\\#1'))
  const backslash = run([['x\\y']])
  assert.ok(backslash.includes('\\textbackslash{}'))
  for (const matrix of [[[1]], [[1, 2], [3, 4]], [['a']]]) {
    const latex = run(matrix)
    assert.equal((latex.match(/\\begin\{bmatrix\}/g) ?? []).length, 1)
    assert.equal((latex.match(/\\end\{bmatrix\}/g) ?? []).length, 1)
    assert.equal(/<[a-z]/i.test(latex), false)
  }
})

test('matrixToPlain is the accessible text form', () => {
  assert.equal(client.run('matrixToPlain([[0.7,-0.25],[1,-1]])'), '[0.7, -0.25; 1, -1]')
})

function collectMathText(node, MathText, found = []) {
  if (node === null || node === undefined) return found
  if (Array.isArray(node)) {
    for (const item of node) collectMathText(item, MathText, found)
    return found
  }
  if (node.type === MathText) {
    found.push(node.props)
    return found
  }
  if (node.children) collectMathText(node.children, MathText, found)
  return found
}

test('MatrixView renders through KaTeX and renders its label through MathText', () => {
  const { MatrixView, MathText } = client.exported.__test
  const tree = MatrixView({
    matrix: [[2, 4], [4, 3]], label: '卷积结果 C（$4\\times4$）', small: true, t: (key) => key,
  })
  const props = collectMathText(tree, MathText)
  assert.ok(props.some((entry) => entry.text === '卷积结果 C（$4\\times4$）'), 'label must be Markdown, not plain text')
  const body = props.find((entry) => entry.text.includes('bmatrix'))
  assert.ok(body, 'matrix body must be LaTeX')
  assert.ok(body.text.startsWith('$') && body.text.endsWith('$'))
  assert.match(body.text, /\\begin\{bmatrix\} 2 & 4 \\\\ 4 & 3 \\end\{bmatrix\}/)
  const bundle = readFileSync(join(ROOT, 'client.js'), 'utf8')
  assert.match(bundle, /dshq-matrix-math/)
  assert.match(bundle, /matrixToLatex\(matrix\)/)
})

test('MatrixView exposes a plain aria-label for the KaTeX visual', () => {
  const { MatrixView, MathText } = client.exported.__test
  const tree = MatrixView({ matrix: [[0.7, -0.25], [1, -1]], small: true, t: (key) => key })
  const findLabel = (node) => {
    if (Array.isArray(node)) return node.map(findLabel).find(Boolean)
    if (node && node.type === 'div' && node.props?.['aria-label']) return node.props['aria-label']
    return node?.children ? findLabel(node.children) : undefined
  }
  assert.equal(findLabel(tree), '矩阵 [0.7, -0.25; 1, -1]')
})

function findElement(node, type) {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = findElement(item, type)
      if (hit) return hit
    }
    return null
  }
  if (node.type === type) return node
  return node.children ? findElement(node.children, type) : null
}

test('Inputs sends matrix and scalar labels through MathText', () => {
  const { Inputs, MatrixView, MathText } = client.exported.__test
  const tree = Inputs({
    t: (key) => key,
    inputs: [
      { label: 'X（$2\\times2$）', matrix: [[1, 2], [3, 4]] },
      { label: '$b$', scalar: -1 },
    ],
  })
  const matrixElement = findElement(tree, MatrixView)
  assert.ok(matrixElement, 'matrix input renders through MatrixView')
  assert.equal(matrixElement.props.label, 'X（$2\\times2$）', 'label travels as Markdown, not plain text')
  assert.equal(matrixElement.props.display, true)
  const matrixProps = collectMathText(MatrixView(matrixElement.props), MathText)
  assert.ok(matrixProps.some((entry) => entry.text.includes('bmatrix')))
  const scalarTexts = collectMathText(tree, MathText).map((entry) => entry.text)
  assert.ok(scalarTexts.includes('$b$'), scalarTexts.join(' | '))
  assert.ok(scalarTexts.includes('$= -1$'))
})

test('display matrices use a block container; small matrices stay inline', () => {
  const { MatrixView, Inputs, OptionButton, MathText } = client.exported.__test
  const bodyProps = (tree) => collectMathText(tree, MathText).find((entry) => entry.text.includes('bmatrix'))
  const identity = (key) => key

  const display = bodyProps(MatrixView({ matrix: [[1, 2], [3, 4]], t: identity, display: true }))
  assert.equal(display.inline, false, 'standalone input matrices must not use the inline container')
  assert.ok(display.text.startsWith('$$'), 'display matrices use $$...$$')

  const small = bodyProps(MatrixView({ matrix: [[2, 4], [4, 3]], small: true, t: identity }))
  assert.equal(small.inline, true, 'option/step matrices stay inline')
  assert.ok(small.text.startsWith('$') && !small.text.startsWith('$$'))

  const fromInputs = bodyProps(MatrixView(findElement(Inputs({
    t: identity, inputs: [{ label: 'X', matrix: [[1, 2], [3, 4]] }],
  }), MatrixView).props))
  assert.equal(fromInputs.inline, false, 'Inputs renders display matrices')

  const optionMatrix = findElement(OptionButton({
    option: { kind: 'matrix', matrix: [[2, 4], [4, 3]] },
    index: 0, state: 'idle', disabled: false, onPick() {}, t: identity,
  }), MatrixView)
  assert.equal(optionMatrix.props.display, undefined)
  assert.equal(bodyProps(MatrixView(optionMatrix.props)).inline, true, 'option matrices stay inline')

  const bundle = readFileSync(join(ROOT, 'client.js'), 'utf8')
  assert.match(bundle, /inline: display !== true/, 'the built bundle carries the block-container rule')
})

test('no deck-content field is rendered as raw text any more', () => {
  const sources = ['components.js', 'notebook.js', 'page.js']
    .map((file) => readFileSync(join(ROOT, 'client', 'src', file), 'utf8'))
    .join('\n')
  for (const pattern of [
    /h\('div', \{ className: 'dshq-matrix-label' \}, label\)/,
    /, question\.topic\)/,
    /, deck\.title\)/,
    /, question\.level\)/,
    /, practiceDeck\.title\)/,
    /, input\.label\)/,
    /, entry\.label\)/,
  ]) {
    assert.equal(pattern.test(sources), false, `raw deck-content render still matches ${pattern}`)
  }
})

test('refresh diff reports added / updated / removed decks honestly', () => {
  const run = (expression) => JSON.parse(JSON.stringify(client.run(expression)))
  const first = [{ id: 'a', source: 'user', title: 'A' }, { id: 'b', source: 'user', title: 'B' }]
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
