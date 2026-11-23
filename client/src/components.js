/**
 * @module components
 * Presentational pieces of the practice page: icons, matrix rendering, option
 * buttons, the solution/aside cards, step blocks and the notes panel.  Deck
 * prose goes through `MathText` so authored math renders instead of leaking
 * `_{...}` into the UI.
 *
 * Provides: MarkdownText, markdownLabels, MathText, GridIcon, CheckIcon,
 * CrossIcon, RefreshIcon, ChevronIcon, MatrixView, Inputs, OptionButton,
 * optionState, AnswerValue, VerdictCard, StepBlock, Solution, Notes.
 * Requires: h, React hooks (factory prologue); toLatexMarkdown/latexPlainText
 * (math.js); letterOf (text.js).
 */

    /**
     * DSH's KaTeX-backed Markdown primitive.  The module table provides it on
     * every dsh web build; outside one (unit tests, an older host) the guarded
     * require leaves it null and `MathText` falls back to plain text instead of
     * crashing the panel.
     */
    let MarkdownText = null
    try {
      MarkdownText = require('@deepseek-ai/dsh-client-ui-primitives').MarkdownText ?? null
    } catch {
      MarkdownText = null
    }

    /** Localized chrome `MarkdownText` requires (code-fence copy + footnotes). */
    function markdownLabels(t) {
      return {
        code: { copyLabel: t('markdown.copy'), copiedLabel: t('markdown.copied') },
        footnotes: t('markdown.footnotes'),
      }
    }

    /**
     * Deck prose rendered as KaTeX Markdown.  Legacy decks (bare `_`/`^`,
     * Unicode math) are normalized to `$...$` first; the only render path is
     * `MarkdownText`, never raw HTML.
     */
    function MathText({ text, t, inline }) {
      const source = neutralizeMarkdownMedia(toLatexMarkdown(text))
      const labels = useMemo(() => markdownLabels(t), [t])
      const className = `dshq-md${inline ? ' is-inline' : ''}`
      if (MarkdownText === null) {
        return h('div', { className: `${className} is-fallback` }, source)
      }
      return h('div', { className },
        h(MarkdownText, { text: source, labels, variant: 'compact' }))
    }

    function GridIcon({ size = 20 }) {
      const cells = [[2.5, 2.5], [13.5, 2.5], [2.5, 13.5], [13.5, 13.5]]
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, focusable: false,
      }, cells.map(([x, y], index) => h('rect', {
        key: index, x, y, width: 8, height: 8, rx: 2.2,
        fill: 'currentColor', opacity: index === 3 ? 0.45 : 1,
      })))
    }

    function CheckIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3 8.5 6.4 12 13 4.5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function CrossIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }))
    }

    function RefreshIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M13 8a5 5 0 1 1-1.6-3.7M13 2.5V6H9.5',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        }))
    }

    function ChevronIcon({ direction = 'right', size = 14 }) {
      const path = direction === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: path, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    /**
     * A matrix is LaTeX now: KaTeX draws the brackets and aligns the cells.
     * `aria-label` carries the plain value because KaTeX's HTML is visual only.
     */
    function MatrixView({ matrix, label, small, t, display }) {
      const latex = matrixToLatex(matrix)
      const source = display === true ? `$$${latex}$$` : `$${latex}$`
      return h('div', { className: `dshq-matrix-block${small ? ' is-small' : ''}` },
        label
          ? h('div', { className: 'dshq-matrix-label' }, h(MathText, { text: label, t, inline: true }))
          : null,
        h('div', {
          className: 'dshq-matrix-math',
          role: 'img',
          'aria-label': `矩阵 ${matrixToPlain(matrix)}`,
        }, h(MathText, { text: source, t, inline: display !== true })))
    }

    function Inputs({ inputs, t }) {
      return h('div', { className: 'dshq-inputs' }, inputs.map((input, index) => {
        if (Array.isArray(input.matrix)) {
          return h(MatrixView, {
            key: index, matrix: input.matrix, label: input.label, t, display: true,
          })
        }
        return h('div', { key: index, className: 'dshq-scalar' },
          h('div', { className: 'dshq-matrix-label' }, h(MathText, { text: input.label, t, inline: true })),
          h('div', { className: 'dshq-scalar-value' }, h(MathText, {
            text: `$= ${latexCell(input.scalar)}$`, t, inline: true,
          })))
      }))
    }

    function OptionButton({ option, index, state, selected, multi, disabled, onPick, t }) {
      const classes = ['dshq-option']
      if (option.kind === 'text') classes.push('is-text')
      if (selected) classes.push('is-selected')
      if (state === 'picked-correct') classes.push('is-picked-correct')
      else if (state === 'picked-wrong') classes.push('is-picked-wrong')
      else if (state === 'reveal-correct') classes.push('is-reveal-correct')
      else if (state === 'dim') classes.push('is-dim')
      const mark = state === 'picked-correct' || state === 'reveal-correct'
        ? h('span', { className: 'dshq-opt-mark is-good' }, h(CheckIcon))
        : state === 'picked-wrong'
          ? h('span', { className: 'dshq-opt-mark is-bad' }, h(CrossIcon))
          : null
      const description = option.kind === 'matrix'
        ? `矩阵 ${matrixToPlain(option.matrix)}`
        : latexPlainText(option.text)
      return h('button', {
        type: 'button',
        className: classes.join(' '),
        onClick: () => onPick(index),
        disabled,
        'aria-pressed': selected || state === 'picked-correct' || state === 'picked-wrong'
          ? true
          : (multi ? false : undefined),
        'aria-label': `${letterOf(index)}. ${description}`,
      },
      h('span', { className: 'dshq-opt-letter', 'aria-hidden': true }, letterOf(index)),
      h('div', { className: 'dshq-opt-body' }, option.kind === 'matrix'
        ? h(MatrixView, { matrix: option.matrix, small: true, t })
        : h('div', { className: 'dshq-opt-value' }, h(MathText, { text: option.text, t }))),
      mark)
    }

    function AnswerValue({ option, index, good, t }) {
      const letter = letterOf(index)
      const chipClass = `dshq-chip-letter${good ? ' is-good' : ' is-bad'}`
      return h('div', { className: 'dshq-pick-value' },
        h('span', { className: chipClass }, letter),
        option.kind === 'matrix'
          ? h(MatrixView, { matrix: option.matrix, small: true, t })
          : h('div', { className: 'dshq-pick-text' }, h(MathText, { text: option.text, t })))
    }

    function VerdictCard({ question, picked, t, onRetry }) {
      const good = isCorrectAnswer(question, picked)
      const correct = correctIndexes(question)
      const pickedIndexes = toPickIndexes(picked)
      return h('div', { className: 'dshq-card' },
        h('div', { className: `dshq-verdict${good ? ' is-good' : ' is-bad'}`, style: { width: '100%' } },
          good ? h(CheckIcon, { size: 15 }) : h(CrossIcon, { size: 15 }),
          h('span', null, good ? t('quiz.correct') : t('quiz.wrong')),
          h('button', {
            type: 'button', className: 'dshq-button', style: { marginLeft: 'auto' },
            onClick: onRetry,
          }, t('quiz.retry'))),
        h('div', { className: 'dshq-answer-row' },
          h('div', { className: 'dshq-pick' },
            h('div', { className: 'dshq-pick-label' }, t(Array.isArray(question.answers) ? 'quiz.answersLabel' : 'quiz.answerLabel')),
            correct.map((index) => question.options[index]
              ? h(AnswerValue, { key: `answer-${index}`, option: question.options[index], index, good: true, t })
              : null)),
          !good
            ? h('div', { className: 'dshq-pick' },
              h('div', { className: 'dshq-pick-label' }, t('quiz.yourPick')),
              pickedIndexes.map((index) => question.options[index]
                ? h(AnswerValue, { key: `pick-${index}`, option: question.options[index], index, good: correct.includes(index), t })
                : null))
            : null))
    }

    function StepBlock({ step, t }) {
      return h('div', { className: 'dshq-step' },
        h('div', { className: 'dshq-step-title', role: 'heading', 'aria-level': 4 },
          h(MathText, { text: step.title, t })),
        h('div', { className: 'dshq-step-body' }, h(MathText, { text: step.body, t })),
        Array.isArray(step.matrices) && step.matrices.length > 0
          ? h('div', { className: 'dshq-step-matrices' }, step.matrices.map((entry, index) => h(MatrixView, {
            key: index, matrix: entry.matrix, label: entry.label, small: true, t,
          })))
          : null)
    }

    function Solution({ question, picked, t, onRetry }) {
      if (picked === null || picked === undefined) {
        return h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-verdict' }, h(GridIcon, { size: 15 }), h('span', null, t('aside.empty'))),
          question.formula ? h('div', { style: { marginTop: '10px' } },
            h('div', { className: 'dshq-section-title' }, t('aside.formula')),
            h('div', { className: 'dshq-formula' }, h(MathText, { text: question.formula, t }))) : null,
          h('p', { className: 'dshq-hint', style: { margin: '10px 0 0' } }, t(Array.isArray(question.answers) ? 'quiz.pickHintMulti' : 'quiz.pickHint')))
      }
      const correct = correctIndexes(question)
      const pickedIndexes = toPickIndexes(picked)
      const diagnostics = question.options
        .map((option, index) => ({ option, index }))
        .filter((entry) => !correct.includes(entry.index) && entry.option.note)
      return h(React.Fragment, null,
        h(VerdictCard, { question, picked, t, onRetry }),
        question.formula ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.formula')),
          h('div', { className: 'dshq-formula' }, h(MathText, { text: question.formula, t }))) : null,
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.steps')),
          question.steps.map((step, index) => h(StepBlock, { key: index, step, t }))),
        question.pitfall ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.pitfall')),
          h('div', { className: 'dshq-step-body' }, h(MathText, { text: question.pitfall, t }))) : null,
        diagnostics.length > 0 ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.diagnostics')),
          h('div', { className: 'dshq-diagnostics' }, diagnostics.map((entry) => h('div', {
            key: entry.index,
            className: `dshq-diagnostic${pickedIndexes.includes(entry.index) ? ' is-picked' : ''}`,
          },
          h('span', { className: 'dshq-chip-letter' }, letterOf(entry.index)),
          h('div', { className: 'dshq-diagnostic-note' }, h(MathText, { text: entry.option.note, t })))))) : null)
    }

    function Notes({ notes, t }) {
      if (!notes || notes.length === 0) {
        return h('div', { className: 'dshq-empty' }, h('h2', null, t('aside.notesTitle')), h('p', null, t('aside.notesEmpty')))
      }
      return h(React.Fragment, null, notes.map((note, index) => h('div', { key: index, className: 'dshq-card dshq-note-card' },
        h('div', { className: 'dshq-note-title', role: 'heading', 'aria-level': 3 },
          h(MathText, { text: note.title, t })),
        h('div', { className: 'dshq-note-body' }, h(MathText, { text: note.body, t })))))
    }

