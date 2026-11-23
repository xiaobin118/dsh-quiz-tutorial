/**
 * Storage contract (audit C2/I4):
 *   - save measures UTF-8 bytes and refuses an oversized deck before writing;
 *   - read measures bytes too, so a saved deck is always listable;
 *   - the file name must equal `<id>.json`, so list/save/delete address one file;
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { __internal } from '../index.js'
import { tempDirs } from './helpers.mjs'

const { saveDeckFile, readDeckFile, loadDecks, deleteUserDeck, serializeDeck, MAX_DECK_BYTES, DeckSizeError } = __internal

function sampleDeck(id = 'sample') {
  return {
    version: 1,
    id,
    title: '示例题集',
    subject: '测试',
    description: '',
    notes: [],
    questions: [
      {
        id: 'q1',
        topic: '主题',
        level: '基础',
        prompt: '题干',
        inputs: [],
        conditions: '',
        options: [{ kind: 'matrix', matrix: [[1]] }, { kind: 'matrix', matrix: [[2]] }],
        answer: 0,
        formula: '',
        steps: [{ title: '第 1 步', body: '过程' }],
        pitfall: '',
      },
    ],
  }
}

test('save -> list -> delete round trip', () => {
  const dirs = tempDirs()
  try {
    const saved = saveDeckFile(sampleDeck(), dirs.userDir)
    assert.equal(saved.path, join(dirs.userDir, 'sample.json'))
    assert.ok(saved.bytes > 0)

    const listed = loadDecks({ userDir: dirs.userDir })
    assert.deepEqual(listed.errors, [])
    assert.deepEqual(listed.decks.map((deck) => deck.id), ['sample'])
    assert.equal(listed.decks[0].source, 'user')

    const deleted = deleteUserDeck('sample', dirs.userDir)
    assert.equal(deleted.ok, true)
    assert.equal(readdirSync(dirs.userDir).length, 0)
    assert.equal(deleteUserDeck('sample', dirs.userDir).code, 'not-found')
  } finally {
    dirs.cleanup()
  }
})

test('save -> load keeps multi-select answers and drops the absent single answer', () => {
  const dirs = tempDirs()
  try {
    const deck = sampleDeck('multi')
    deck.questions[0].options.push({ kind: 'matrix', matrix: [[3]] }, { kind: 'matrix', matrix: [[4]] })
    delete deck.questions[0].answer
    deck.questions[0].answers = [2, 0]
    saveDeckFile(deck, dirs.userDir)

    const listed = loadDecks({ userDir: dirs.userDir })
    assert.deepEqual(listed.errors, [])
    const loaded = listed.decks[0].questions[0]
    assert.deepEqual(loaded.answers, [0, 2])
    assert.equal('answer' in loaded, false)
  } finally {
    dirs.cleanup()
  }
})

test('a deck that exceeds 512 KiB is refused before any file is written', () => {
  const dirs = tempDirs()
  try {
    // normalizeDeck's field caps cannot express this, so drive the store directly:
    // the store's contract is "serialize, measure bytes, then write".
    const huge = { version: 1, id: 'huge', blob: 'x'.repeat(MAX_DECK_BYTES + 1) }
    assert.throws(() => saveDeckFile(huge, dirs.userDir), (error) => {
      assert.ok(error instanceof DeckSizeError)
      assert.equal(error.limit, MAX_DECK_BYTES)
      assert.match(error.message, /512 KiB/)
      return true
    })
    // The size check runs before mkdir/write, so not even the directory exists.
    assert.deepEqual(readdirSync(dirs.root), [], 'no directory, partial file or temp file survives')
  } finally {
    dirs.cleanup()
  }
})

test('the byte boundary is inclusive and measured in bytes, not chars', () => {
  const dirs = tempDirs()
  try {
    const base = { version: 1, id: 'boundary' }
    const baseBytes = Buffer.byteLength(serializeDeck({ ...base, blob: '' }), 'utf8')
    const exact = saveDeckFile({ ...base, blob: 'x'.repeat(MAX_DECK_BYTES - baseBytes) }, dirs.userDir)
    assert.equal(exact.bytes, MAX_DECK_BYTES)
    assert.equal(readFileSync(exact.path).length, MAX_DECK_BYTES)
    assert.doesNotThrow(() => readDeckFile(exact.path))

    assert.throws(
      () => saveDeckFile({ ...base, blob: 'x'.repeat(MAX_DECK_BYTES - baseBytes + 1) }, dirs.userDir),
      DeckSizeError,
    )

    // Multi-byte content is measured by Buffer.byteLength: 200k Chinese chars
    // are 600k bytes, which must be rejected even though `.length` is under 512 KiB.
    const chinese = { version: 1, id: 'chinese', blob: '题'.repeat(200_000) }
    assert.ok(chinese.blob.length < MAX_DECK_BYTES)
    assert.throws(() => saveDeckFile(chinese, dirs.userDir), DeckSizeError)
  } finally {
    dirs.cleanup()
  }
})

test('read rejects an oversized file with the byte number', () => {
  const dirs = tempDirs()
  try {
    mkdirSync(dirs.userDir, { recursive: true })
    const path = join(dirs.userDir, 'big.json')
    writeFileSync(path, JSON.stringify({ id: 'big', blob: 'x'.repeat(MAX_DECK_BYTES) }))
    assert.throws(() => readDeckFile(path), /超过 512 KiB 上限/)
  } finally {
    dirs.cleanup()
  }
})

test('a file whose name disagrees with its id is skipped, so delete stays honest', () => {
  const dirs = tempDirs()
  try {
    mkdirSync(dirs.userDir, { recursive: true })
    writeFileSync(join(dirs.userDir, 'bar.json'), JSON.stringify(sampleDeck('foo')))
    writeFileSync(join(dirs.userDir, 'foo.json'), JSON.stringify(sampleDeck('foo')))

    const listed = loadDecks({ userDir: dirs.userDir })
    assert.deepEqual(listed.decks.map((deck) => deck.id), ['foo'])
    assert.equal(listed.decks[0].fileName, 'foo.json')
    assert.ok(listed.errors.some((line) => line.includes('文件名必须与题集 id 一致')), listed.errors.join('\n'))

    // Deleting removes the deck the list actually served.
    assert.equal(deleteUserDeck('foo', dirs.userDir).ok, true)
    const after = loadDecks({ userDir: dirs.userDir })
    assert.deepEqual(after.decks, [])
    assert.ok(after.errors.some((line) => line.includes('bar.json')), 'the stray file stays reported')
  } finally {
    dirs.cleanup()
  }
})

test('delete refuses malformed ids and missing directories', () => {
  const dirs = tempDirs()
  try {
    assert.equal(deleteUserDeck('../evil', dirs.userDir).code, 'invalid-id')
    assert.equal(deleteUserDeck('missing', join(dirs.root, 'nope')).code, 'not-found')
  } finally {
    dirs.cleanup()
  }
})
