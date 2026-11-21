/**
 * @module state
 * Pure progress/queue helpers over the persisted shape:
 * `{ deckId, qi, answers, mistakes, hiddenDecks }`.
 *
 * Every function here is pure and side-effect free; the page component owns the
 * React state.  They are also the regression surface for the audit fixes
 * (deleting a deck purges its answers/mistakes/hidden flag; opening a mistake
 * from a hidden deck makes that deck visible again).
 *
 * Provides: withoutDeckAnswers, withoutDeckMistakes, withoutHiddenDeck,
 * withDeckVisible, readStored, MISTAKE_SEP, mistakeKey, splitMistakeKey,
 * normalizeHiddenDecks, normalizeMistakes, resolveQueueItem, mistakeRows,
 * formatTime, fetchDecks.
 * Requires: STORAGE_KEY (base.js).
 */

function withoutDeckAnswers(answers, deckId) {
  const next = { ...answers }
  delete next[deckId]
  return next
}

function withoutDeckMistakes(mistakes, deckId) {
  const next = {}
  for (const [key, record] of Object.entries(mistakes)) {
    const parts = splitMistakeKey(key)
    if (parts !== null && parts[0] === deckId) continue
    next[key] = record
  }
  return next
}

function withoutHiddenDeck(hiddenDecks, deckId) {
  return hiddenDecks.filter((id) => id !== deckId)
}

function withDeckVisible(hiddenDecks, deckId) {
  return hiddenDecks.includes(deckId) ? withoutHiddenDeck(hiddenDecks, deckId) : hiddenDecks
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

const MISTAKE_SEP = '::'

function mistakeKey(deckId, qid) {
  return `${deckId}${MISTAKE_SEP}${qid}`
}

function splitMistakeKey(key) {
  const at = key.indexOf(MISTAKE_SEP)
  if (at <= 0 || at + MISTAKE_SEP.length >= key.length) return null
  return [key.slice(0, at), key.slice(at + MISTAKE_SEP.length)]
}

function normalizeHiddenDecks(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id) => typeof id === 'string' && id !== ''))]
}

function normalizeMistakes(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, record] of Object.entries(raw)) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) continue
    const wrong = Number.isFinite(record.wrong) && record.wrong > 0 ? Math.floor(record.wrong) : 1
    const lastAt = Number.isFinite(record.lastAt) ? record.lastAt : Date.now()
    const masteredAt = Number.isFinite(record.masteredAt) ? record.masteredAt : null
    const lastPick = Number.isInteger(record.lastPick) ? record.lastPick : null
    out[key] = { wrong, lastAt, masteredAt, lastPick }
  }
  return out
}

function resolveQueueItem(decks, item) {
  const deck = decks.find((entry) => entry.id === item.deckId)
  if (!deck) return null
  const question = deck.questions.find((entry) => entry.id === item.qid)
  if (!question) return null
  return { deck, question }
}

function mistakeRows(decks, mistakes) {
  const rows = []
  for (const [key, rec] of Object.entries(mistakes)) {
    const parts = splitMistakeKey(key)
    if (!parts) continue
    const [deckId, qid] = parts
    const deck = decks.find((entry) => entry.id === deckId) ?? null
    const question = deck ? (deck.questions.find((entry) => entry.id === qid) ?? null) : null
    rows.push({ key, deckId, qid, deck, question, rec })
  }
  rows.sort((left, right) => {
    const leftOpen = left.rec.masteredAt === null ? 0 : 1
    const rightOpen = right.rec.masteredAt === null ? 0 : 1
    if (leftOpen !== rightOpen) return leftOpen - rightOpen
    return (right.rec.lastAt || 0) - (left.rec.lastAt || 0)
  })
  return rows
}

function formatTime(ts) {
  if (!Number.isFinite(ts)) return ''
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ''
  }
}

async function fetchDecks(signal) {
  const response = await fetch(`${ENDPOINT}?ts=${Date.now()}`, {
    signal,
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (data === null || typeof data !== 'object' || !Array.isArray(data.decks)) {
    throw new Error('unexpected payload')
  }
  return data
}
