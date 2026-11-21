/**
 * @module math
 * LaTeX authoring support for deck prose.
 *
 * Decks are rendered by DSH's KaTeX-backed `MarkdownText`, so the authoring
 * convention is `$...$` (inline) and `$$...$$` (display).  Two helpers live
 * here, both pure and testable without React:
 *
 * - `toLatexMarkdown(text)` normalizes legacy decks: decks written before the
 *   convention used bare `_`/`^` scripts and Unicode math (`Σ`, `μ`, `²`).
 *   Text that already contains a `$` delimiter is returned untouched.  Other
 *   text is scanned for math-looking runs, those runs are converted to LaTeX
 *   commands and wrapped in `$...$`, and Chinese prose between them is left
 *   alone.  Unbalanced braces/commands leave the run as literal text instead
 *   of producing broken math.
 * - `latexPlainText(text)` produces a readable label for `aria-label`, where
 *   `MarkdownText` cannot be used.
 *
 * The renderer itself lives in components.js and only ever calls KaTeX through
 * `MarkdownText`; this module must not grow a second (Unicode) render path.
 */

const GREEK = {
  α: '\\alpha', β: '\\beta', γ: '\\gamma', δ: '\\delta', ε: '\\varepsilon',
  ζ: '\\zeta', η: '\\eta', θ: '\\theta', ι: '\\iota', κ: '\\kappa',
  λ: '\\lambda', μ: '\\mu', ν: '\\nu', ξ: '\\xi', π: '\\pi', ρ: '\\rho',
  σ: '\\sigma', τ: '\\tau', υ: '\\upsilon', φ: '\\varphi', χ: '\\chi',
  ψ: '\\psi', ω: '\\omega',
  Γ: '\\Gamma', Δ: '\\Delta', Θ: '\\Theta', Λ: '\\Lambda', Ξ: '\\Xi',
  Π: '\\Pi', Σ: '\\Sigma', Υ: '\\Upsilon', Φ: '\\Phi', Ψ: '\\Psi', Ω: '\\Omega',
}

const SYMBOLS = {
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∞': '\\infty', '√': '\\sqrt',
  '∈': '\\in', '∉': '\\notin', '×': '\\times', '·': '\\cdot', '⋅': '\\cdot',
  '÷': '\\div', '±': '\\pm', '∓': '\\mp', '≤': '\\le', '≥': '\\ge',
  '≠': '\\ne', '≈': '\\approx', '≡': '\\equiv', '∼': '\\sim', '~': '\\sim',
  '∝': '\\propto', '→': '\\to', '⇒': '\\Rightarrow', '↔': '\\leftrightarrow',
  '∪': '\\cup', '∩': '\\cap', '⊂': '\\subset', '⊆': '\\subseteq',
  '∅': '\\emptyset', '∀': '\\forall', '∃': '\\exists', '¬': '\\neg',
  '∧': '\\wedge', '∨': '\\vee', '∂': '\\partial', '∇': '\\nabla',
  '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil',
  '⟨': '\\langle', '⟩': '\\rangle', '⋯': '\\cdots', '…': '\\ldots',
  '⊙': '\\odot', '⊗': '\\otimes', '‖': '\\|', '−': '-', '′': "'",
  '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}',
}

const SUPERSCRIPT_DIGITS = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-',
}

const SUBSCRIPT_DIGITS = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₐ': 'a', 'ₑ': 'e', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₙ': 'n', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't',
  'ₓ': 'x', 'ₔ': 'e',
}

const COMBINING = {
  '\u0302': 'hat', '\u0304': 'bar', '\u0305': 'overline', '\u0307': 'dot',
  '\u0308': 'ddot', '\u0303': 'tilde', '\u030C': 'check',
}

const OPERATORS = new Set(['=', '+', '-', '*', '/', '<', '>', '|', '(', ')', '[', ']', '^', '_', '{', '}', ',', ';', ':'])
const OPENERS = new Set(['(', '[', '{', '|'])
const COMMAND_END = /[A-Za-z]/

function isAsciiLetter(ch) {
  return ch !== undefined && /[A-Za-z]/.test(ch)
}

function isDigit(ch) {
  return ch !== undefined && /[0-9]/.test(ch)
}

function isMathSymbol(ch) {
  return ch !== undefined && (Object.prototype.hasOwnProperty.call(GREEK, ch)
    || Object.prototype.hasOwnProperty.call(SYMBOLS, ch)
    || Object.prototype.hasOwnProperty.call(SUPERSCRIPT_DIGITS, ch)
    || Object.prototype.hasOwnProperty.call(SUBSCRIPT_DIGITS, ch)
    || Object.prototype.hasOwnProperty.call(COMBINING, ch))
}

function isOperator(ch) {
  return ch !== undefined && OPERATORS.has(ch)
}

/** Candidate starter: a backslash command, a math symbol, or a word/digit id. */
function startsMath(source, index) {
  const ch = source[index]
  // "·" and "…" are also Chinese separators; they may continue a run but never
  // start one, or "第 3 步 · 2×2" would become "$\cdot 2\times2$".
  if (ch === '·' || ch === '…' || ch === '⋯') return false
  if (ch === '\\') return true
  if (isMathSymbol(ch)) return true

  if (isAsciiLetter(ch)) {
    if (index > 0 && (isAsciiLetter(source[index - 1]) || isDigit(source[index - 1]))) return false
    let end = index
    while (end < source.length && isAsciiLetter(source[end])) end += 1
    const next = source[end]
    if (next === '_' || next === '^' || next === '(' || next === '[' || next === '|' || next === '\\') return true
    if (isDigit(next)) return true
    if (next === ':' && (isAsciiLetter(source[end + 1]) || isDigit(source[end + 1]) || isMathSymbol(source[end + 1]))) return true
    if (next !== undefined && isMathSymbol(next)) return true
    if (next === '-' && !isAsciiLetter(source[end + 1])) return true
    if (next !== undefined && isOperator(next) && next !== ',' && next !== ';' && next !== ':' && next !== '|') return true
    // "MSE = ..." / "min || ...": skip spaces before an operator or symbol
    let spaced = end
    while (spaced < source.length && source[spaced] === ' ') spaced += 1
    if (spaced > end && spaced < source.length) {
      const after = source[spaced]
      if (after === '=' || after === '|' || after === '+' || after === '-' || after === '/'
        || after === '<' || after === '>' || after === '×' || after === '·' || isMathSymbol(after)) return true
    }
    return false
  }

  if (isDigit(ch)) {
    if (index > 0 && (isAsciiLetter(source[index - 1]) || isDigit(source[index - 1]) || source[index - 1] === '.')) return false
    let end = index
    while (end < source.length && isDigit(source[end])) end += 1
    const next = source[end]
    if (next === ',' && isDigit(source[end + 1])) return true
    if (next === '.' && isDigit(source[end + 1])) return true
    if (next === '_' || next === '^' || next === '(' || next === '[') return true
    if (next !== undefined && isMathSymbol(next)) return true
    if (next !== undefined && isOperator(next) && next !== ',' && next !== ';' && next !== ':' && next !== '|') return true
    return false
  }

  return false
}

/** Whether a space at `space` may continue the run (next char is math-ish). */
function spaceContinues(source, space, previous, insideGroup = false) {
  let next = space
  while (next < source.length && source[next] === ' ') next += 1
  if (next >= source.length) return -1
  const ch = source[next]
  if (isDigit(ch) || isMathSymbol(ch) || isOperator(ch)) return next
  // Inside brackets/braces a space before a word is still math: f(x, y), E_q[log p(x)].
  if (isAsciiLetter(ch) && (insideGroup || OPERATORS.has(previous) || isMathSymbol(previous))) return next
  return -1
}

function scanRun(source, start) {
  let end = start
  let parenDepth = 0
  let braceDepth = 0
  while (end < source.length) {
    const ch = source[end]
    if (isAsciiLetter(ch) || isDigit(ch) || ch === '\\' || ch === "'") {
      end += 1
      continue
    }
    if (ch === '{') {
      braceDepth += 1
      end += 1
      continue
    }
    if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      end += 1
      continue
    }
    if (isMathSymbol(ch)) {
      end += 1
      continue
    }
    if (ch === '.' && isDigit(source[end - 1]) && isDigit(source[end + 1])) {
      end += 1
      continue
    }
    if (ch === '(' || ch === '[') {
      parenDepth += 1
      end += 1
      continue
    }
    if (ch === ')' || ch === ']') {
      parenDepth = Math.max(0, parenDepth - 1)
      end += 1
      continue
    }
    if (ch === ',' || ch === ';' || ch === ':') {
      const thousands = ch === ',' && isDigit(source[end - 1]) && isDigit(source[end + 1])
      if (parenDepth > 0 || braceDepth > 0 || thousands) {
        end += 1
        continue
      }
      break
    }
    if (ch === '|' || ch === '_' || ch === '^' || ch === '=' || ch === '+' || ch === '*' || ch === '<' || ch === '>') {
      end += 1
      continue
    }
    if (ch === '-') {
      // a hyphenated word ("K-means") is prose, not subtraction
      if (end > start && isAsciiLetter(source[end - 1]) && isAsciiLetter(source[end + 1])) break
      end += 1
      continue
    }
    if (ch === '/') {
      end += 1
      continue
    }
    if (ch === ' ') {
      const next = spaceContinues(source, end, source[end - 1], parenDepth > 0 || braceDepth > 0)
      if (next < 0) break
      end = next
      continue
    }
    break
  }
  return end
}

/** Convert one math run to LaTeX; returns null when it is not safe. */
function runToLatex(source, start, end) {
  let trimmed = end
  while (trimmed > start && /[\s=+\-*/^_,;:(<|]/.test(source[trimmed - 1])) trimmed -= 1
  if (trimmed <= start) return null
  const run = source.slice(start, trimmed)

  let depth = 0
  for (const ch of run) {
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth < 0) return null
    }
  }
  if (depth !== 0) return null
  if (/\\$/.test(run)) return null

  let latex = ''
  for (let i = 0; i < run.length; i += 1) {
    const ch = run[i]
    const combining = COMBINING[ch]
    if (combining !== undefined) {
      // attach to the previous single-letter atom: x̂ -> \hat{x}
      const match = /([A-Za-z])$/u.exec(latex)
      if (match) latex = `${latex.slice(0, -1)}\\${combining}{${match[1]}}`
      continue
    }
    if (SUPERSCRIPT_DIGITS[ch] !== undefined) {
      latex += `^${SUPERSCRIPT_DIGITS[ch]}`
      continue
    }
    if (SUBSCRIPT_DIGITS[ch] !== undefined) {
      latex += `_${SUBSCRIPT_DIGITS[ch]}`
      continue
    }
    const command = GREEK[ch] ?? SYMBOLS[ch]
    if (command !== undefined) {
      latex += command
      if (COMMAND_END.test(run[i + 1] ?? '')) latex += ' '
      continue
    }
    latex += ch
  }

  // Normalize `x_i` / `H_out` into `x_{i}` / `H_{out}` so LaTeX groups the
  // whole subscript, and leave already-braced scripts alone.
  latex = latex.replace(/(?<![\\])([_^])(?![{^])([A-Za-z0-9]+)/g, '$1{$2}')

  // A run must carry a math signal; otherwise "note (see)" would become math.
  const hasCore = /[_^\\{}]/.test(latex)
    || /[=+\-*/|<>]/.test(latex)
    || /[0-9]/.test(latex)
    || /[A-Za-z]\(/.test(latex)
  if (!hasCore) return null
  // "·" is also a Chinese list separator; never turn a lone one into $\cdot$.
  if (/^\\cdot$/.test(latex) || /^\\ldots$/.test(latex)) return null
  return { latex, end: trimmed }
}

/**
 * Normalize deck prose to the KaTeX Markdown convention.
 * @param value - authored deck text (LaTeX or legacy Unicode math)
 * @returns Markdown whose math is inside `$...$`
 */
function toLatexMarkdown(value) {
  const source = String(value ?? '')
  if (source.includes('$')) return source
  try {
    let out = ''
    let index = 0
    while (index < source.length) {
      if (!startsMath(source, index)) {
        out += source[index]
        index += 1
        continue
      }
      // Pick up letters/digits glued to a symbol, plus an immediately adjacent
      // opening bracket: "(0,0)" is one atom, not "($0,0)$".
      let start = index
      while (start > 0 && (isAsciiLetter(source[start - 1]) || isDigit(source[start - 1]))) {
        if (out.endsWith('$')) break
        out = out.slice(0, -1)
        start -= 1
      }
      if (start > 0 && (source[start - 1] === '(' || source[start - 1] === '[') && !out.endsWith('$')) {
        out = out.slice(0, -1)
        start -= 1
      }
      let run = runToLatex(source, start, scanRun(source, start))
      if (run !== null && (source[run.end] === ')' || source[run.end] === ']')) {
        const expected = source[run.end] === ')' ? '(' : '['
        if (run.latex.split(expected).length === run.latex.split(expected === '(' ? ')' : ']').length) {
          run = { latex: `${run.latex}${source[run.end]}`, end: run.end + 1 }
        }
      }
      if (run === null) {
        out += source[index]
        index += 1
        continue
      }
      out += `$${run.latex}$`
      index = run.end
    }
    return out
  } catch {
    return source
  }
}

/**
 * Deck text is agent-authored; `MarkdownText` would happily render an HTTP(S)
 * image or link, which would fetch a remote URL from the local UI.  Drop image
 * and link syntax before rendering, keeping only the visible text (the panel's
 * "no external requests" property must survive Markdown support).
 */
function neutralizeMarkdownMedia(value) {
  try {
    return String(value ?? '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  } catch {
    return String(value ?? '')
  }
}

const LATEX_TO_TEXT = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', varepsilon: 'ε', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  varphi: 'φ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  sum: 'Σ', prod: 'Π', int: '∫', infty: '∞', in: '∈', notin: '∉', times: '×',
  cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', ge: '≥', ne: '≠',
  approx: '≈', equiv: '≡', sim: '∼', propto: '∝', to: '→',
  Rightarrow: '⇒', leftrightarrow: '↔', cup: '∪', cap: '∩', subset: '⊂',
  subseteq: '⊆', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧',
  lor: '∨', partial: '∂', nabla: '∇', lfloor: '⌊', rfloor: '⌋', lceil: '⌈',
  rceil: '⌉', langle: '⟨', rangle: '⟩', cdots: '⋯', ldots: '…', odot: '⊙',
  otimes: '⊗', hat: '', bar: '', overline: '', frac: '/', sqrt: '√',
}

/** Readable plain text for `aria-label` / titles that cannot host Markdown. */
function latexPlainText(value) {
  try {
    return neutralizeMarkdownMedia(toLatexMarkdown(value))
      .replace(/\$\$?/g, '')
      .replace(/\\(?:left|right|big|Big|bigg|Bigg|quad|qquad|,|;|:|!)/g, ' ')
      .replace(/\\([A-Za-z]+)/g, (match, name) => (LATEX_TO_TEXT[name] ?? name))
      .replace(/[{}]/g, '')
      .replace(/[_^]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return String(value ?? '')
  }
}
