/**
 * @module math
 * Math-lite rendering for deck prose.
 *
 * Deck content is authored by an agent, so it arrives with LaTeX-ish markup:
 * `J=\sum_{k=1}^{K}...`, `H_out`, `e^{−2.1115}`, `\frac{a}{b}`, `\gamma_ik`.
 * Deck text is rendered as React text (never HTML), so `_{...}` and `^{...}`
 * used to show up literally.  This tokenizer turns the common subset into
 * `<sup>`/`<sub>` and Unicode symbols; it is deliberately not a TeX engine (no
 * macro expansion, no layout), and unknown commands degrade to their bare name.
 * `$...$` / `$$...$$` delimiters are simply dropped, so both "wrap math in
 * dollars" and "bare `_`/`^`" authoring styles render.
 *
 * Provides: MATH_SYMBOLS, MATH_IGNORED, MATH_WRAPPERS, readMathGroup,
 * wrapMathGroup, readMathCommand, readMathScript, mathTokens, mathPlainText.
 * Requires: nothing.  The React component lives in components.js.
 */

/**
 * Math-lite rendering for deck prose (I9).
 *
 * Deck content is authored by an agent, so it arrives with LaTeX-ish markup:
 * `J=\sum_{k=1}^{K}...`, `H_out`, `e^{−2.1115}`, `\frac{a}{b}`, `\gamma_ik`.
 * The client renders deck text as plain React text (never HTML), so `_{...}`
 * and `^{...}` used to show up literally.  This tokenizer turns the common
 * subset into `<sup>`/`<sub>` and Unicode symbols; it is deliberately not a
 * TeX engine (no macro expansion, no layout), and unknown commands degrade to
 * their bare name.  `$...$` / `$$...$$` delimiters are simply dropped, so both
 * "wrap math in dollars" and "bare `_`/`^`" authoring styles render.
 */
const MATH_SYMBOLS = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ',
  eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν',
  xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ',
  chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  sum: 'Σ', prod: 'Π', int: '∫', oint: '∮', infty: '∞', partial: '∂', nabla: '∇',
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗', star: '⋆',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', equiv: '≡',
  sim: '∼', propto: '∝', ll: '≪', gg: '≫',
  to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', mapsto: '↦',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
  cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', langle: '⟨', rangle: '⟩',
  cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱',
  angle: '∠', perp: '⊥', parallel: '∥', triangle: '△',
  quad: ' ', qquad: '  ', '%': '%', '#': '#', '&': '&', _: '_', '{': '{', '}': '}',
}

/** `\left(` etc. only change TeX layout; the delimiter itself is kept. */
const MATH_IGNORED = new Set([
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'displaystyle', 'textstyle', 'limits', 'nolimits',
])

/** Commands whose `{...}` argument is plain text, not more math. */
const MATH_WRAPPERS = new Set(['text', 'mathrm', 'mathbf', 'mathit', 'mathsf', 'mathtt', 'operatorname'])

function readMathGroup(source, start) {
  let i = start
  while (i < source.length && /\s/.test(source[i])) i += 1
  if (i >= source.length || source[i] !== '{') return null
  let depth = 0
  for (let j = i; j < source.length; j += 1) {
    if (source[j] === '{') depth += 1
    else if (source[j] === '}') {
      depth -= 1
      if (depth === 0) return { text: source.slice(i + 1, j), next: j + 1 }
    }
  }
  return null
}

function wrapMathGroup(text) {
  const trimmed = text.trim()
  if (trimmed.length <= 1 || !/[\s+*/×·]/.test(trimmed)) return trimmed
  return `(${trimmed})`
}

function readMathCommand(source, start) {
  let i = start + 1
  if (i >= source.length) return { text: '\\', next: i }
  if (!/[A-Za-z]/.test(source[i])) {
    const char = source[i]
    if (char === ',' || char === ';' || char === ':' || char === ' ') return { text: ' ', next: i + 1 }
    if (char === '!') return { text: '', next: i + 1 }
    return { text: char, next: i + 1 }
  }
  let end = i
  while (end < source.length && /[A-Za-z]/.test(source[end])) end += 1
  const name = source.slice(i, end)
  if (MATH_IGNORED.has(name)) return { text: '', next: end }
  if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
    const numerator = readMathGroup(source, end)
    const denominator = numerator === null ? null : readMathGroup(source, numerator.next)
    if (numerator === null || denominator === null) return { text: `${name}`, next: end }
    return {
      text: `${wrapMathGroup(numerator.text)}/${wrapMathGroup(denominator.text)}`,
      next: denominator.next,
    }
  }
  if (name === 'sqrt') {
    const group = readMathGroup(source, end)
    if (group === null) return { text: '√', next: end }
    return { text: `√${wrapMathGroup(group.text)}`, next: group.next }
  }
  if (MATH_WRAPPERS.has(name)) {
    const group = readMathGroup(source, end)
    if (group === null) return { text: '', next: end }
    return { text: group.text, next: group.next }
  }
  if (Object.prototype.hasOwnProperty.call(MATH_SYMBOLS, name)) {
    return { text: MATH_SYMBOLS[name], next: end }
  }
  return { text: name, next: end }
}

function readMathScript(source, start) {
  if (start >= source.length) return null
  if (source[start] === '{') return readMathGroup(source, start)
  let end = start
  if (source[end] === '−' || source[end] === '-') end += 1
  while (end < source.length && /[0-9A-Za-z.]/.test(source[end])) end += 1
  if (end === start) return null
  return { text: source.slice(start, end), next: end }
}

/**
 * Tokenize deck prose into `{type:'text'}` / `{type:'sup'|'sub', tokens}` nodes.
 * Pure and side-effect free so `test/client-state.test.js` can assert it.
 */
function mathTokens(value) {
  const source = String(value ?? '')
  const nodes = []
  let buffer = ''
  const flush = () => {
    if (buffer !== '') {
      nodes.push({ type: 'text', text: buffer })
      buffer = ''
    }
  }
  let i = 0
  while (i < source.length) {
    const char = source[i]
    if (char === '$') {
      i += 1
      continue
    }
    if (char === '\\') {
      const command = readMathCommand(source, i)
      buffer += command.text
      i = command.next
      continue
    }
    if (char === '^' || char === '_') {
      const script = readMathScript(source, i + 1)
      if (script === null) {
        buffer += char
        i += 1
        continue
      }
      flush()
      nodes.push({ type: char === '^' ? 'sup' : 'sub', tokens: mathTokens(script.text) })
      i = script.next
      continue
    }
    buffer += char
    i += 1
  }
  flush()
  return nodes
}

/** Plain-text view of the tokenizer output (used for accessible labels). */
function mathPlainText(value) {
  return mathTokens(value).map(function flatten(token) {
    return token.type === 'text' ? token.text : token.tokens.map(flatten).join('')
  }).join('')
}

