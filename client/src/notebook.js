/**
 * @module notebook
 * The mistake log: one card per recorded mistake, the notebook body with its
 * filters, and the aside with the review-all action.
 *
 * Provides: NotebookIcon, scoreChip, statBox, MistakeCard, NotebookMain,
 * NotebookAside.
 * Requires: h (factory prologue), MathText (components.js), letterOf/text.js,
 * formatTime/state.js.
 */

    function NotebookIcon({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, focusable: false,
      },
      h('path', {
        d: 'M6.5 4.5A1.5 1.5 0 0 1 8 3h9.5v17l-5.5-3.2L6.5 20V4.5Z',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round',
      }))
    }

    function scoreChip(key, className, icon, label) {
      return h('span', { key, className: `dshq-score-chip${className ? ` ${className}` : ''}` }, icon, label)
    }

    function statBox(key, value, label, kind) {
      return h('div', { key, className: `dshq-stat${kind ? ` is-${kind}` : ''}` },
        h('div', { className: 'dshq-stat-value' }, String(value)),
        h('div', { className: 'dshq-stat-label' }, label))
    }

    function MistakeCard({ row, t, onView, onRedo, onToggle, onRemove }) {
      const { question, deck, rec } = row
      const mastered = rec.masteredAt !== null
      const lastPick = rec.lastPick
      const hasPick = lastPick !== null && lastPick !== undefined
      const answerText = lettersFor(correctIndexes(question))
      return h('article', { className: 'dshq-mistake' },
        h('div', { className: 'dshq-mistake-top' },
          question && question.level
            ? h('div', { className: 'dshq-tag' }, h(MathText, { text: question.level, t, inline: true }))
            : null,
          h('div', { className: 'dshq-mistake-deck' },
            h(MathText, { text: deck ? deck.title : row.deckId, t, inline: true })),
          question && question.topic
            ? h('div', { className: 'dshq-mistake-topic' }, h(MathText, { text: question.topic, t, inline: true }))
            : null,
          h('span', { className: 'dshq-mistake-badge' }, t('mistakes.wrongTimes', { n: rec.wrong || 1 })),
          mastered ? h('span', { className: 'dshq-mistake-done' }, t('mistakes.filter.mastered')) : null),
        question
          ? h('div', { className: 'dshq-mistake-prompt' }, h(MathText, { text: question.prompt, t }))
          : h('p', { className: 'dshq-mistake-prompt' }, t('mistakes.missingDeck')),
        question
          ? h('div', { className: 'dshq-mistake-meta' },
            hasPick
              ? h('span', null, t('mistakes.lastWrong', { pick: lettersFor(lastPick), answer: answerText }))
              : h('span', null, `${t('quiz.answerLabel')} ${answerText}`),
            h('span', null, t('mistakes.lastAt', { time: formatTime(rec.lastAt) })),
            mastered ? h('span', null, t('mistakes.masteredAt', { time: formatTime(rec.masteredAt) })) : null)
          : null,
        h('div', { className: 'dshq-mistake-actions' },
          question
            ? h('button', { type: 'button', className: 'dshq-button', onClick: () => onView(row) }, t('mistakes.viewSolution'))
            : null,
          question
            ? h('button', { type: 'button', className: 'dshq-button is-primary', onClick: () => onRedo(row) }, t('mistakes.redo'))
            : null,
          question
            ? h('button', { type: 'button', className: 'dshq-button', onClick: () => onToggle(row) },
              mastered ? t('mistakes.reopen') : t('mistakes.markMastered'))
            : null,
          h('button', { type: 'button', className: 'dshq-button', onClick: () => onRemove(row) }, t('mistakes.remove'))))
    }

    function NotebookMain({ rows, filter, setFilter, counts, t, onBack, onView, onRedo, onToggle, onRemove }) {
      const filtered = rows.filter((row) => (filter === 'all'
        ? true
        : filter === 'mastered'
          ? row.rec.masteredAt !== null
          : row.rec.masteredAt === null))
      const filters = [
        ['open', t('mistakes.filter.open'), counts.open],
        ['mastered', t('mistakes.filter.mastered'), counts.mastered],
        ['all', t('mistakes.filter.all'), counts.total],
      ]
      return h('div', { className: 'dshq-notebook' },
        h('div', { className: 'dshq-notebook-head' },
          h('div', null,
            h('h2', { className: 'dshq-notebook-title' }, t('mistakes.title')),
            h('p', { className: 'dshq-notebook-sub' }, t('mistakes.sub'))),
          h('button', { type: 'button', className: 'dshq-button', onClick: onBack },
            h(ChevronIcon, { direction: 'left' }), t('mistakes.back'))),
        h('div', { className: 'dshq-filters' }, filters.map(([key, label, count]) => h('button', {
          key,
          type: 'button',
          className: `dshq-filter${filter === key ? ' is-active' : ''}`,
          onClick: () => setFilter(key),
        }, `${label} ${count}`))),
        rows.length === 0
          ? h('div', { className: 'dshq-empty', style: { padding: '36px 16px' } },
            h(NotebookIcon, { size: 26 }),
            h('h2', null, t('mistakes.empty')),
            h('p', null, t('mistakes.emptyHint')))
          : filtered.length === 0
            ? h('div', { className: 'dshq-empty', style: { padding: '36px 16px' } },
              h('p', null, t('mistakes.emptyFiltered')))
            : h('div', { className: 'dshq-mistake-list' },
              filtered.map((row) => h(MistakeCard, { key: row.key, row, t, onView, onRedo, onToggle, onRemove }))))
    }

    function NotebookAside({ counts, t, onReviewAll, onClearMastered }) {
      return h('div', { className: 'dshq-aside-body' },
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('mistakes.stats')),
          h('div', { className: 'dshq-mistake-stats' },
            statBox('open', counts.open, t('mistakes.open'), 'open'),
            statBox('mastered', counts.mastered, t('mistakes.mastered'), 'done'),
            statBox('total', counts.total, t('mistakes.total'))),
          h('button', {
            type: 'button',
            className: 'dshq-button is-primary',
            style: { width: '100%', justifyContent: 'center' },
            disabled: counts.openResolved === 0,
            onClick: onReviewAll,
          }, h(NotebookIcon, { size: 14 }), t('mistakes.reviewAll', { n: counts.openResolved })),
          h('button', {
            type: 'button',
            className: 'dshq-button',
            style: { width: '100%', justifyContent: 'center', marginTop: '8px' },
            disabled: counts.mastered === 0,
            onClick: onClearMastered,
          }, t('mistakes.clearMastered', { n: counts.mastered }))),
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('mistakes.explainTitle')),
          h('p', { className: 'dshq-step-body' }, t('mistakes.explainBody'))),
        h('div', { className: 'dshq-kbd-hint' },
          h('span', { className: 'dshq-hint' }, t('mistakes.explainHint'))))
    }

