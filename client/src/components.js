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
 * (math.js); cellText/letterOf (text.js).
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
    function MathText({ text, t }) {
      const source = neutralizeMarkdownMedia(toLatexMarkdown(text))
      const labels = useMemo(() => markdownLabels(t), [t])
      if (MarkdownText === null) {
        return h('div', { className: 'dshq-md is-fallback' }, source)
      }
      return h('div', { className: 'dshq-md' },
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

    function MatrixView({ matrix, label, small }) {
      const cols = matrix[0].length
      return h('div', { className: 'dshq-matrix-block' },
        label ? h('div', { className: 'dshq-matrix-label' }, label) : null,
        h('div', {
          className: `dshq-matrix${small ? ' is-small' : ''}`,
          style: { gridTemplateColumns: `repeat(${cols}, minmax(18px, auto))` },
        }, matrix.flatMap((row, rowIndex) => row.map((value, colIndex) => h('span', {
          key: `${rowIndex}:${colIndex}`,
          className: 'dshq-cell',
        }, cellText(value))))))
    }

    function Inputs({ inputs }) {
      return h('div', { className: 'dshq-inputs' }, inputs.map((input, index) => {
        if (Array.isArray(input.matrix)) {
          return h(MatrixView, { key: index, matrix: input.matrix, label: input.label })
        }
        return h('div', { key: index, className: 'dshq-scalar' },
          h('span', { className: 'dshq-matrix-label' }, input.label),
          h('span', { className: 'dshq-scalar-value' }, `= ${cellText(input.scalar)}`))
      }))
    }

    function OptionButton({ option, index, state, disabled, onPick, t }) {
      const classes = ['dshq-option']
      if (option.kind === 'text') classes.push('is-text')
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
        ? `矩阵 ${option.matrix.map((row) => row.map(cellText).join(', ')).join('; ')}`
        : latexPlainText(option.text)
      return h('button', {
        type: 'button',
        className: classes.join(' '),
        onClick: () => onPick(index),
        disabled,
        'aria-pressed': state === 'picked-correct' || state === 'picked-wrong' ? true : undefined,
        'aria-label': `${letterOf(index)}. ${description}`,
      },
      h('span', { className: 'dshq-opt-letter', 'aria-hidden': true }, letterOf(index)),
      h('div', { className: 'dshq-opt-body' }, option.kind === 'matrix'
        ? h(MatrixView, { matrix: option.matrix, small: true })
        : h('div', { className: 'dshq-opt-value' }, h(MathText, { text: option.text, t }))),
      mark)
    }

    function optionState(question, picked, index) {
      if (picked === null || picked === undefined) return 'idle'
      if (picked === question.answer) return index === picked ? 'picked-correct' : 'dim'
      if (index === picked) return 'picked-wrong'
      if (index === question.answer) return 'reveal-correct'
      return 'dim'
    }

    function AnswerValue({ option, index, picked, good, t }) {
      const letter = letterOf(index)
      const chipClass = `dshq-chip-letter${good ? ' is-good' : ''}`
      return h('div', { className: 'dshq-pick-value' },
        h('span', { className: chipClass }, letter),
        option.kind === 'matrix'
          ? h(MatrixView, { matrix: option.matrix, small: true })
          : h('div', { className: 'dshq-pick-text' }, h(MathText, { text: option.text, t })))
    }

    function VerdictCard({ question, picked, t, onRetry }) {
      const good = picked === question.answer
      const pickedOption = question.options[picked]
      const answerOption = question.options[question.answer]
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
            h('div', { className: 'dshq-pick-label' }, t('quiz.answerLabel')),
            answerOption ? h(AnswerValue, { option: answerOption, index: question.answer, picked, good: true, t }) : null),
          pickedOption && !good ? h('div', { className: 'dshq-pick' },
            h('div', { className: 'dshq-pick-label' }, t('quiz.yourPick')),
            h(AnswerValue, { option: pickedOption, index: picked, picked, good: false, t })) : null))
    }

    function StepBlock({ step, t }) {
      return h('div', { className: 'dshq-step' },
        h('div', { className: 'dshq-step-title', role: 'heading', 'aria-level': 4 },
          h(MathText, { text: step.title, t })),
        h('div', { className: 'dshq-step-body' }, h(MathText, { text: step.body, t })),
        Array.isArray(step.matrices) && step.matrices.length > 0
          ? h('div', { className: 'dshq-step-matrices' }, step.matrices.map((entry, index) => h(MatrixView, {
            key: index, matrix: entry.matrix, label: entry.label, small: true,
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
          h('p', { className: 'dshq-hint', style: { margin: '10px 0 0' } }, t('quiz.pickHint')))
      }
      const diagnostics = question.options
        .map((option, index) => ({ option, index }))
        .filter((entry) => entry.index !== question.answer && entry.option.note)
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
            className: `dshq-diagnostic${entry.index === picked ? ' is-picked' : ''}`,
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

