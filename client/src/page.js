/**
 * @module page
 * The full-page practice surface: deck rail, question card, answer aside, the
 * review queue, keyboard handling, and all persisted progress.  This is the
 * only stateful component in the plugin.
 *
 * Provides: QuizPage.
 * Requires: h + React hooks (factory prologue); every other module.
 */

    function QuizPage(props) {
      const { t, onBack } = props
      const [initial] = useState(readStored)
      const [snapshot, setSnapshot] = useState({ status: 'loading', decks: [], errors: [] })
      const [deckId, setDeckId] = useState(() => (typeof initial?.deckId === 'string' ? initial.deckId : null))
      const [qi, setQi] = useState(() => (Number.isInteger(initial?.qi) && initial.qi >= 0 ? initial.qi : 0))
      const [answers, setAnswers] = useState(() => (initial?.answers && typeof initial.answers === 'object' ? initial.answers : {}))
      const [mistakes, setMistakes] = useState(() => normalizeMistakes(initial?.mistakes))
      const [hiddenDecks, setHiddenDecks] = useState(() => normalizeHiddenDecks(initial?.hiddenDecks))
      const [tab, setTab] = useState(() => (initial?.tab === 'notes' ? 'notes' : 'quiz'))
      const [view, setView] = useState(() => (initial?.view === 'mistakes' ? 'mistakes' : 'practice'))
      const [filter, setFilter] = useState('open')
      const [queue, setQueue] = useState(null)
      const [refreshing, setRefreshing] = useState(false)
      const [removing, setRemoving] = useState(null)
      const [actionError, setActionError] = useState(null)
      const mainRef = useRef(null)
      const asideRef = useRef(null)

      const load = useCallback(async (signal) => {
        setRefreshing(true)
        try {
          const data = await fetchDecks(signal)
          const ordered = [...data.decks].sort((left, right) => {
            if (left.source !== right.source) return left.source === 'user' ? -1 : 1
            return String(left.id).localeCompare(String(right.id))
          })
          setSnapshot({ status: 'ready', decks: ordered, errors: Array.isArray(data.errors) ? data.errors : [] })
        } catch (error) {
          if (error && error.name === 'AbortError') return
          const message = error instanceof Error ? error.message : String(error)
          setSnapshot((previous) => (previous.decks.length > 0
            ? { ...previous, errors: [message] }
            : { status: 'error', decks: [], errors: [message], message }))
        } finally {
          setRefreshing(false)
        }
      }, [])

      useEffect(() => {
        const controller = new AbortController()
        load(controller.signal)
        return () => controller.abort()
      }, [load])

      const decks = snapshot.decks
      // Hide is a bundled-deck feature; a stale id left in localStorage must not
      // hide a user deck that happens to reuse it (M12).
      const visibleDecks = useMemo(
        () => decks.filter((deck) => !(deck.source === 'bundled' && hiddenDecks.includes(deck.id))),
        [decks, hiddenDecks],
      )
      const currentDeck = useMemo(() => {
        if (visibleDecks.length === 0) return null
        return visibleDecks.find((deck) => deck.id === deckId) ?? visibleDecks[0]
      }, [visibleDecks, deckId])

      useEffect(() => {
        if (!currentDeck) return
        if (currentDeck.id !== deckId) setDeckId(currentDeck.id)
        if (qi >= currentDeck.questions.length) setQi(0)
      }, [currentDeck, deckId, qi])

      useEffect(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            v: 2, deckId, qi, answers, mistakes, hiddenDecks, tab, view,
          }))
        } catch {
          /* storage may be unavailable */
        }
      }, [deckId, qi, answers, mistakes, hiddenDecks, tab, view])

      const rows = useMemo(() => mistakeRows(decks, mistakes), [decks, mistakes])
      const counts = useMemo(() => {
        let open = 0
        let mastered = 0
        let openResolved = 0
        for (const row of rows) {
          if (row.rec.masteredAt === null) {
            open += 1
            if (row.question) openResolved += 1
          } else {
            mastered += 1
          }
        }
        return { open, mastered, openResolved, total: rows.length }
      }, [rows])

      const queueItems = queue ? queue.items : []
      const queueItem = queue && queueItems.length > 0
        ? queueItems[Math.min(queue.index, queueItems.length - 1)]
        : null
      const queueResolved = queueItem ? resolveQueueItem(decks, queueItem) : null
      const practiceDeck = queue ? (queueResolved ? queueResolved.deck : null) : currentDeck
      const question = queue
        ? (queueResolved ? queueResolved.question : null)
        : (currentDeck && currentDeck.questions.length > 0
          ? currentDeck.questions[Math.min(qi, currentDeck.questions.length - 1)]
          : null)
      const displayIndex = queue ? queue.index : qi
      const displayTotal = queue ? queueItems.length : (currentDeck ? currentDeck.questions.length : 0)
      const deckAnswers = currentDeck ? (answers[currentDeck.id] ?? {}) : {}
      const activeAnswers = practiceDeck ? (answers[practiceDeck.id] ?? {}) : {}
      const picked = question && activeAnswers[question.id] !== undefined ? activeAnswers[question.id] : null

      const deckStats = currentDeck
        ? currentDeck.questions.reduce((stats, item) => {
          const value = deckAnswers[item.id]
          if (value !== undefined) {
            stats.answered += 1
            if (value === item.answer) stats.correct += 1
          }
          return stats
        }, { answered: 0, correct: 0 })
        : { answered: 0, correct: 0 }

      const queueStats = queue
        ? queue.items.reduce((stats, item) => {
          const resolved = resolveQueueItem(decks, item)
          if (!resolved) return stats
          const value = answers[resolved.deck.id]?.[item.qid]
          if (value === undefined) return stats
          stats.answered += 1
          if (value === resolved.question.answer) stats.correct += 1
          return stats
        }, { answered: 0, correct: 0 })
        : null

      const headerMode = view === 'mistakes' ? 'notebook' : queue ? 'review' : 'practice'
      const activeAnswered = headerMode === 'review' ? queueStats.answered : deckStats.answered
      const activeCorrect = headerMode === 'review' ? queueStats.correct : deckStats.correct
      const activeWrong = activeAnswered - activeCorrect
      const activeAccuracy = activeAnswered > 0 ? Math.round((activeCorrect / activeAnswered) * 100) : 0
      const answeredCount = headerMode === 'review'
        ? queueStats.answered
        : headerMode === 'notebook'
          ? counts.open + counts.mastered
          : deckStats.answered
      const correctCount = headerMode === 'review'
        ? queueStats.correct
        : headerMode === 'notebook'
          ? counts.mastered
          : deckStats.correct
      const accuracy = activeAnswered > 0 ? activeAccuracy : 0
      const allDone = displayTotal > 0 && answeredCount >= displayTotal && headerMode !== 'notebook'

      function recordAnswer(deck, item, index) {
        setAnswers((previous) => {
          const deckState = { ...(previous[deck.id] ?? {}) }
          deckState[item.id] = index
          return { ...previous, [deck.id]: deckState }
        })
        setMistakes((previous) => {
          const key = mistakeKey(deck.id, item.id)
          const current = previous[key]
          if (index !== item.answer) {
            return {
              ...previous,
              [key]: {
                wrong: (current?.wrong ?? 0) + 1,
                lastAt: Date.now(),
                masteredAt: null,
                lastPick: index,
              },
            }
          }
          if (current && current.masteredAt === null) {
            return { ...previous, [key]: { ...current, masteredAt: Date.now() } }
          }
          return previous
        })
      }

      function pick(index) {
        if (!question || !practiceDeck || picked !== null) return
        recordAnswer(practiceDeck, question, index)
      }

      function retryQuestion() {
        if (!practiceDeck || !question) return
        setAnswers((previous) => {
          const deckState = { ...(previous[practiceDeck.id] ?? {}) }
          delete deckState[question.id]
          return { ...previous, [practiceDeck.id]: deckState }
        })
        setTab('quiz')
      }

      function selectDeck(id) {
        setDeckId(id)
        setQi(0)
        setQueue(null)
        setView('practice')
        setTab('quiz')
      }

      function navigateTo(next) {
        if (queue) {
          setQueue((previous) => (previous
            ? { ...previous, index: Math.max(0, Math.min(previous.items.length - 1, next)) }
            : previous))
          return
        }
        if (!currentDeck) return
        setQi(Math.max(0, Math.min(currentDeck.questions.length - 1, next)))
      }

      function resetDeck() {
        if (!currentDeck) return
        setAnswers((previous) => ({ ...previous, [currentDeck.id]: {} }))
        setQi(0)
        setTab('quiz')
      }

      function startReview() {
        const target = rows.filter((row) => row.question && row.rec.masteredAt === null)
        if (target.length === 0) return
        setAnswers((previous) => {
          const next = { ...previous }
          for (const row of target) {
            const deckState = { ...(next[row.deckId] ?? {}) }
            delete deckState[row.qid]
            next[row.deckId] = deckState
          }
          return next
        })
        setQueue({ items: target.map((row) => ({ deckId: row.deckId, qid: row.qid })), index: 0 })
        setView('practice')
        setTab('quiz')
      }

      function exitReview() {
        setQueue(null)
        setView('mistakes')
      }

      function openRow(row, redo) {
        if (!row.deck || !row.question) return
        if (redo) {
          setAnswers((previous) => {
            const deckState = { ...(previous[row.deckId] ?? {}) }
            delete deckState[row.qid]
            return { ...previous, [row.deckId]: deckState }
          })
        }
        // A mistake can outlive a hidden bundled deck; unhide it first so
        // `currentDeck` resolves to the deck the row actually belongs to (I2).
        setHiddenDecks((previous) => withDeckVisible(previous, row.deckId))
        const index = row.deck.questions.findIndex((item) => item.id === row.qid)
        setDeckId(row.deckId)
        setQi(index >= 0 ? index : 0)
        setQueue(null)
        setView('practice')
        setTab('quiz')
      }

      function toggleMastered(row) {
        setMistakes((previous) => {
          const current = previous[row.key]
          if (!current) return previous
          return {
            ...previous,
            [row.key]: { ...current, masteredAt: current.masteredAt === null ? Date.now() : null },
          }
        })
      }

      function removeMistake(row) {
        setMistakes((previous) => {
          if (previous[row.key] === undefined) return previous
          const next = { ...previous }
          delete next[row.key]
          return next
        })
      }

      function clearMastered() {
        if (counts.mastered === 0) return
        try {
          if (typeof window.confirm !== 'function') return
          if (!window.confirm(t('mistakes.clearConfirm', { n: counts.mastered }))) return
        } catch {
          return
        }
        setMistakes((previous) => {
          const next = {}
          for (const [key, record] of Object.entries(previous)) {
            if (record.masteredAt === null) next[key] = record
          }
          return next
        })
      }

      function skipQueue() {
        if (!queue) return
        navigateTo(Math.min(queue.index + 1, queue.items.length - 1))
      }

      const refresh = () => { load() }

      function hideDeck(deck) {
        if (!deck || deck.source !== 'bundled') return
        let confirmed = false
        try {
          if (typeof window.confirm === 'function') confirmed = window.confirm(t('deck.hideConfirm', { title: deck.title }))
        } catch {
          confirmed = false
        }
        if (!confirmed) return
        setHiddenDecks((previous) => (previous.includes(deck.id) ? previous : [...previous, deck.id]))
      }

      function restoreHiddenDecks() {
        setHiddenDecks([])
      }

      async function removeDeck(deck) {
        if (!deck || deck.source !== 'user' || removing !== null) return
        let confirmed = false
        try {
          if (typeof window.confirm === 'function') confirmed = window.confirm(t('deck.removeConfirm', { title: deck.title }))
        } catch {
          confirmed = false
        }
        if (!confirmed) return
        setRemoving(deck.id)
        try {
          const response = await fetch(DELETE_ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ id: deck.id }),
            credentials: 'same-origin',
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || data?.ok !== true) {
            // 405 (or a body-less 404) means an older Host without the route;
            // any other 404 carries the Host's own "deck not found" message.
            if (response.status === 405 || (response.status === 404 && !data?.message)) {
              throw new Error(t('deck.restartRequired'))
            }
            throw new Error(data?.message || data?.error || `HTTP ${response.status}`)
          }
          // The deck's answers/mistakes/hidden flag belong to that deck; a
          // bundled deck restored by this delete must start clean (I3).
          setAnswers((previous) => withoutDeckAnswers(previous, deck.id))
          setMistakes((previous) => withoutDeckMistakes(previous, deck.id))
          setHiddenDecks((previous) => withoutHiddenDeck(previous, deck.id))
          await load()
          setDeckId((previous) => (previous === deck.id ? null : previous))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          setSnapshot((previous) => ({ ...previous, errors: [`${t('deck.removeFailed')}: ${message}`] }))
          setActionError(`${t('deck.removeFailed')}: ${message}`)
        } finally {
          setRemoving(null)
        }
      }

      useEffect(() => {
        const main = mainRef.current
        const aside = asideRef.current
        if (main) main.scrollTop = 0
        if (aside) aside.scrollTop = 0
      }, [displayIndex, practiceDeck?.id, tab, view])

      useEffect(() => {
        function onKeyDown(event) {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
          const target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
            || target.tagName === 'SELECT' || target.isContentEditable)) return
          if (view !== 'practice' || !question) return
          const key = event.key
          if (key === 'ArrowLeft') {
            event.preventDefault()
            navigateTo(displayIndex - 1)
            return
          }
          if (key === 'ArrowRight') {
            event.preventDefault()
            navigateTo(displayIndex + 1)
            return
          }
          const lower = key.toLowerCase()
          let index = -1
          if (lower.length === 1 && lower >= 'a' && lower <= 'f') index = lower.charCodeAt(0) - 97
          else if (lower.length === 1 && lower >= '1' && lower <= '6') index = Number(lower) - 1
          if (index < 0 || index >= question.options.length) return
          if (picked !== null) return
          event.preventDefault()
          pick(index)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      })

      const headerTitle = headerMode === 'notebook'
        ? t('mistakes.title')
        : headerMode === 'review'
          ? t('review.title')
          : currentDeck
            ? currentDeck.title
            : t('app.title')
      const headerKicker = headerMode === 'notebook'
        ? `${t('app.title')} · ${t('app.notebook')}`
        : headerMode === 'review'
          ? `${t('app.title')} · ${t('review.title')}`
          : currentDeck
            ? `${t('app.title')} · ${currentDeck.subject}`
            : t('app.title')
      const headerSub = headerMode === 'notebook'
        ? t('mistakes.sub')
        : headerMode === 'review'
          ? t('review.sub')
          : currentDeck && currentDeck.description
            ? currentDeck.description
            : t('app.subtitle')

      const header = h('header', { className: 'dshq-topbar' },
        h('div', { className: 'dshq-heading' },
          h('div', { className: 'dshq-logo' }, h(GridIcon, { size: 20 })),
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 'dshq-kicker' }, headerKicker),
            h('h1', { className: 'dshq-title' }, headerTitle),
            h('p', { className: 'dshq-sub' }, headerSub))),
        h('div', { className: 'dshq-head-actions' },
          h('button', { type: 'button', className: 'dshq-button', onClick: onBack },
            h(ChevronIcon, { direction: 'left' }), t('app.back')),
          h('div', { className: 'dshq-score' },
            headerMode === 'notebook'
              ? [
                scoreChip('open', 'is-bad', h(CrossIcon, { size: 12 }), `${t('mistakes.open')} ${counts.open}`),
                scoreChip('mastered', 'is-good', h(CheckIcon, { size: 12 }), `${t('mistakes.mastered')} ${counts.mastered}`),
                scoreChip('total', '', null, `${t('mistakes.total')} ${counts.total}`),
              ]
              : [
                scoreChip('correct', 'is-good', h(CheckIcon, { size: 12 }), `${activeCorrect}`),
                scoreChip('wrong', 'is-bad', h(CrossIcon, { size: 12 }), `${activeWrong}`),
                scoreChip('rate', '', null, `${t('stats.rate')} ${activeAccuracy}%`),
              ],
            snapshot.errors.length > 0
              ? h('span', {
                className: 'dshq-score-chip',
                title: snapshot.errors.join('\n'),
                style: { color: 'var(--dsw-alias-state-error-primary)' },
              }, `${t('app.deckDiagnostics')} ${snapshot.errors.length}`)
              : null),
          h('button', {
            type: 'button', className: 'dshq-button', onClick: refresh, disabled: refreshing,
          }, h(RefreshIcon), refreshing ? t('app.refreshing') : t('app.refresh'))))

      if (snapshot.status === 'loading') {
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-loader' },
            h('span', { className: 'dshq-loader-dot' }),
            h('span', { className: 'dshq-loader-dot' }),
            h('span', { className: 'dshq-loader-dot' }),
            h('span', null, t('app.loading'))))
      }
      if (snapshot.status === 'error') {
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-empty', style: { flex: 1 } },
            h('h2', null, t('app.error')),
            h('p', null, snapshot.message || ''),
            h('button', { type: 'button', className: 'dshq-button is-primary', onClick: refresh }, h(RefreshIcon), t('app.retry'))))
      }
      if (!currentDeck) {
        const hiddenCount = decks.filter((deck) => hiddenDecks.includes(deck.id)).length
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-empty', style: { flex: 1 } },
            hiddenCount > 0
              ? h(React.Fragment, null,
                h('h2', null, t('deck.allHidden')),
                h('p', null, t('deck.allHiddenHint')),
                h('button', { type: 'button', className: 'dshq-button is-primary', onClick: restoreHiddenDecks }, t('deck.restore')),
                h('button', { type: 'button', className: 'dshq-button', onClick: refresh }, h(RefreshIcon), t('app.refresh')))
              : h(React.Fragment, null,
                h('h2', null, t('app.empty')),
                h('p', null, t('app.emptyHint')),
                h('button', { type: 'button', className: 'dshq-button', onClick: refresh }, h(RefreshIcon), t('app.refresh')))))
      }

      const rail = h('nav', { className: 'dshq-rail', 'aria-label': t('rail.title') },
        h('button', {
          type: 'button',
          className: `dshq-rail-note${view === 'mistakes' ? ' is-active' : ''}`,
          onClick: () => { setQueue(null); setView('mistakes') },
        },
        h('span', { className: 'dshq-rail-note-icon' }, h(NotebookIcon, { size: 17 })),
        h('span', { className: 'dshq-rail-note-body' },
          h('span', { className: 'dshq-rail-note-title' }, t('app.notebook')),
          h('span', { className: 'dshq-rail-note-meta' }, t('mistakes.openCount', { n: counts.open }))),
        counts.open > 0 ? h('span', { className: 'dshq-rail-badge' }, counts.open) : null),
        h('div', { className: 'dshq-rail-title' }, t('rail.title')),
        visibleDecks.map((deck) => {
          const state = answers[deck.id] ?? {}
          const done = deck.questions.reduce((count, item) => (state[item.id] !== undefined ? count + 1 : count), 0)
          return h('div', { key: deck.id, className: 'dshq-deck-row' },
            h('button', {
              type: 'button',
              className: `dshq-deck${view === 'practice' && !queue && deck.id === currentDeck.id ? ' is-active' : ''}`,
              onClick: () => selectDeck(deck.id),
              'aria-current': view === 'practice' && !queue && deck.id === currentDeck.id ? 'page' : undefined,
            },
            h('span', { className: 'dshq-deck-subject' }, `${deck.subject} · ${deck.source === 'user' ? t('app.sourceUser') : t('app.sourceBundled')}`),
            h('span', { className: 'dshq-deck-title' }, deck.title),
            h('span', { className: 'dshq-deck-meta' }, t('deck.count', { n: deck.questions.length }),
              ' · ', t('deck.done', { done, n: deck.questions.length }))),
            h('button', {
              type: 'button',
              className: 'dshq-deck-remove',
              title: deck.source === 'user' ? t('deck.remove') : t('deck.hide'),
              'aria-label': `${deck.source === 'user' ? t('deck.remove') : t('deck.hide')} ${deck.title}`,
              disabled: deck.source === 'user' && removing === deck.id,
              onClick: () => (deck.source === 'user' ? removeDeck(deck) : hideDeck(deck)),
            }, h(CrossIcon, { size: 11 })))
        }),
        decks.some((deck) => hiddenDecks.includes(deck.id))
          ? h('button', {
            type: 'button',
            className: 'dshq-rail-restore',
            onClick: restoreHiddenDecks,
          }, t('deck.restoreHidden', { n: decks.filter((deck) => hiddenDecks.includes(deck.id)).length }))
          : null,
        h('div', { className: 'dshq-rail-hint' }, t('rail.hint')))

      const notebookMain = h('main', { className: 'dshq-main', ref: mainRef },
        h(NotebookMain, {
          rows,
          filter,
          setFilter,
          counts,
          t,
          onBack: () => setView('practice'),
          onView: (row) => openRow(row, false),
          onRedo: (row) => openRow(row, true),
          onToggle: toggleMastered,
          onRemove: removeMistake,
        }))

      const pagerEntries = queue
        ? queueItems.map((item) => {
          const resolved = resolveQueueItem(decks, item)
          return {
            key: mistakeKey(item.deckId, item.qid),
            value: resolved ? answers[resolved.deck.id]?.[item.qid] : undefined,
            answer: resolved ? resolved.question.answer : null,
          }
        })
        : currentDeck.questions.map((item) => ({ key: item.id, value: deckAnswers[item.id], answer: item.answer }))

      const practiceMain = h('main', { className: 'dshq-main', ref: mainRef },
        h('div', { className: 'dshq-main-inner' },
          queue
            ? h('div', { className: 'dshq-review-bar' },
              h('span', { className: 'dshq-review-title' },
                h(NotebookIcon, { size: 14 }),
                `${t('review.title')} · ${t('review.progress', { n: displayIndex + 1, m: displayTotal })}`),
              h('span', { className: 'dshq-hint' }, t('review.autoMaster')),
              h('button', { type: 'button', className: 'dshq-button', onClick: exitReview }, t('review.exit')))
            : null,
          h('div', {
            className: 'dshq-progress', role: 'progressbar',
            'aria-valuenow': answeredCount, 'aria-valuemin': 0, 'aria-valuemax': displayTotal,
          },
          h('div', {
            className: 'dshq-progress-fill',
            style: { width: `${displayTotal > 0 ? Math.round((answeredCount / displayTotal) * 100) : 0}%` },
          })),
          question
            ? h('div', { className: 'dshq-question-card' },
              h('div', { className: 'dshq-qhead' },
                h('span', { className: 'dshq-qindex' }, t('quiz.index', { n: displayIndex + 1 })),
                h('span', { className: 'dshq-qof' }, t('quiz.of', { m: displayTotal })),
                question.level ? h('span', { className: 'dshq-tag' }, question.level) : null,
                question.topic ? h('span', { className: 'dshq-topic' }, question.topic) : null,
                queue && practiceDeck ? h('span', { className: 'dshq-mistake-deck' }, practiceDeck.title) : null),
              h('p', { className: 'dshq-stem' }, h(MathText, { text: question.prompt })),
              Array.isArray(question.inputs) && question.inputs.length > 0
                ? h(Inputs, { inputs: question.inputs })
                : null,
              question.conditions
                ? h('div', { className: 'dshq-conditions' },
                  h('span', { className: 'dshq-cond-label' }, t('quiz.conditions')),
                  h('span', null, h(MathText, { text: question.conditions })))
                : null,
              h('div', { className: 'dshq-options' }, question.options.map((option, index) => h(OptionButton, {
                key: index,
                option,
                index,
                state: optionState(question, picked, index),
                disabled: picked !== null,
                onPick: pick,
                t,
              }))),
              allDone
                ? h('div', { className: 'dshq-summary' },
                  h('span', null, queue
                    ? t('review.done', { c: correctCount, n: displayTotal })
                    : t('quiz.summary', { c: correctCount, n: displayTotal, p: accuracy })),
                  h('div', { className: 'dshq-summary-actions' },
                    queue ? h('button', { type: 'button', className: 'dshq-button', onClick: exitReview }, t('review.exit')) : null,
                    queue && counts.openResolved > 0
                      ? h('button', { type: 'button', className: 'dshq-button', onClick: startReview }, t('review.again'))
                      : null,
                    !queue ? h('button', { type: 'button', className: 'dshq-button', onClick: resetDeck }, t('quiz.reset')) : null))
                : null)
            : h('div', { className: 'dshq-card' },
              h('p', { className: 'dshq-step-body', style: { margin: 0 } }, t('mistakes.missingDeck')),
              queue ? h('button', { type: 'button', className: 'dshq-button', style: { marginTop: '10px' }, onClick: skipQueue }, t('review.skip')) : null),
          question
            ? h('div', { className: 'dshq-pager' },
              h('button', {
                type: 'button', className: 'dshq-button', onClick: () => navigateTo(displayIndex - 1), disabled: displayIndex <= 0,
              }, h(ChevronIcon, { direction: 'left' }), t('quiz.prev')),
              h('div', { className: 'dshq-dots' }, pagerEntries.map((entry, index) => {
                const dotClass = ['dshq-dot']
                if (index === displayIndex) dotClass.push('is-current')
                if (entry.value !== undefined) dotClass.push(entry.value === entry.answer ? 'is-good' : 'is-bad')
                return h('button', {
                  key: entry.key,
                  type: 'button',
                  className: dotClass.join(' '),
                  onClick: () => navigateTo(index),
                  'aria-label': t('quiz.index', { n: index + 1 }),
                  'aria-current': index === displayIndex ? 'step' : undefined,
                }, index + 1)
              })),
              h('button', {
                type: 'button', className: 'dshq-button', onClick: () => navigateTo(displayIndex + 1), disabled: displayIndex >= displayTotal - 1,
              }, t('quiz.next'), h(ChevronIcon, { direction: 'right' })))
            : null))

      const main = view === 'mistakes' ? notebookMain : practiceMain

      const aside = view === 'mistakes'
        ? h('aside', { className: 'dshq-aside', ref: asideRef },
          h('div', { className: 'dshq-aside-head' },
            h('div', { className: 'dshq-section-title', style: { margin: 0 } }, t('app.notebook'))),
          h(NotebookAside, {
            counts,
            t,
            onReviewAll: startReview,
            onClearMastered: clearMastered,
          }))
        : h('aside', { className: 'dshq-aside', ref: asideRef },
          h('div', { className: 'dshq-aside-head' },
            h('div', { className: 'dshq-tabs', role: 'tablist' },
              h('button', {
                type: 'button', role: 'tab', 'aria-selected': tab === 'quiz',
                className: `dshq-tab${tab === 'quiz' ? ' is-active' : ''}`,
                onClick: () => setTab('quiz'),
              }, t('quiz.asideTab')),
              h('button', {
                type: 'button', role: 'tab', 'aria-selected': tab === 'notes',
                className: `dshq-tab${tab === 'notes' ? ' is-active' : ''}`,
                onClick: () => setTab('notes'),
              }, t('quiz.notesTab')))),
          h('div', { className: 'dshq-aside-body' },
            tab === 'notes'
              ? h(Notes, { notes: practiceDeck ? practiceDeck.notes : [], t })
              : question
                ? h(Solution, { question, picked, t, onRetry: retryQuestion })
                : h('div', { className: 'dshq-card' }, t('mistakes.missingDeck')),
            h('div', { className: 'dshq-kbd-hint' },
              h('span', { className: 'dshq-hint' }, t('quiz.keyboardHint')))))

      const actionBanner = actionError
        ? h('div', { className: 'dshq-alert', role: 'alert' },
          h('span', null, actionError),
          h('button', { type: 'button', className: 'dshq-button', onClick: () => setActionError(null) },
            t('app.dismiss')))
        : null

      return h('div', { className: 'dshq-page' }, header, actionBanner,
        h('div', { className: 'dshq-layout' }, rail, main, aside))
    }

