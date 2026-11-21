/**
 * Route contract (audit C1): both web routes pass DSH's connection trust fence
 * before doing any work, reject an empty/missing Host, require POST for delete,
 * require `application/json`, and answer with one error shape
 * `{ ok: false, code, message }`.
 *
 * The handlers are driven directly with stub req/res and a stub connection, so
 * this runs with no DSH server, no browser and no network.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { apply, __internal } from '../index.js'
import { makeReq, makeRes, stubContext, tempDirs } from './helpers.mjs'

const { createDeckRoutes, saveDeckFile } = __internal

function routesFor({ connection, dirs }) {
  return createDeckRoutes({ connection, store: { bundledDir: dirs.bundledDir, userDir: dirs.userDir } })
}

function sampleDeck(id) {
  return {
    version: 1,
    id,
    title: '示例',
    subject: '测试',
    description: '',
    notes: [],
    questions: [{
      id: 'q1', topic: 't', level: '基础', prompt: 'p', inputs: [], conditions: '',
      options: [{ kind: 'matrix', matrix: [[1]] }, { kind: 'matrix', matrix: [[2]] }],
      answer: 0, formula: '', steps: [{ title: 's', body: 'b' }], pitfall: '',
    }],
  }
}

test('a missing or empty Host is refused before anything else', async () => {
  const dirs = tempDirs()
  try {
    const routes = routesFor({ connection: { requestRejection: () => undefined }, dirs })
    for (const headers of [{}, { host: '' }, { host: '   ' }]) {
      const res = makeRes()
      routes.getDecks(makeReq({ headers }), res)
      assert.equal(res.status, 403)
      assert.equal(res.json().code, 'forbidden')
    }
  } finally {
    dirs.cleanup()
  }
})

test('the connection fence rejection status is propagated on both routes', async () => {
  const dirs = tempDirs()
  try {
    for (const rejection of [401, 403]) {
      const routes = routesFor({ connection: { requestRejection: () => rejection }, dirs })
      const get = makeRes()
      routes.getDecks(makeReq({ headers: { host: '127.0.0.1:3080' } }), get)
      assert.equal(get.status, rejection)

      const post = makeRes()
      await routes.deleteDeck(makeReq({
        method: 'POST',
        headers: { host: '127.0.0.1:3080', 'content-type': 'application/json' },
        body: JSON.stringify({ id: 'anything' }),
      }), post)
      assert.equal(post.status, rejection)
    }
  } finally {
    dirs.cleanup()
  }
})

test('a rejected request never reads the body nor deletes anything', async () => {
  const dirs = tempDirs()
  try {
    saveDeckFile(sampleDeck('keep'), dirs.userDir)
    let bodyRead = false
    const routes = routesFor({ connection: { requestRejection: () => 403 }, dirs })
    const req = {
      method: 'POST',
      headers: { host: '127.0.0.1:3080', 'content-type': 'application/json' },
      async *[Symbol.asyncIterator]() {
        bodyRead = true
        yield Buffer.from(JSON.stringify({ id: 'keep' }))
      },
    }
    const res = makeRes()
    await routes.deleteDeck(req, res)
    assert.equal(res.status, 403)
    assert.equal(bodyRead, false, 'the trust fence runs before the body is touched')

    const listed = __internal.loadDecks({ bundledDir: dirs.bundledDir, userDir: dirs.userDir })
    assert.deepEqual(listed.decks.map((deck) => deck.id), ['keep'])
  } finally {
    dirs.cleanup()
  }
})

test('a missing connection service fails closed with 503', async () => {
  const dirs = tempDirs()
  try {
    const routes = routesFor({ connection: undefined, dirs })
    const res = makeRes()
    routes.getDecks(makeReq({ headers: { host: '127.0.0.1:3080' } }), res)
    assert.equal(res.status, 503)
    assert.equal(res.json().code, 'unavailable')
  } finally {
    dirs.cleanup()
  }
})

test('methods and media types are enforced after the fence', async () => {
  const dirs = tempDirs()
  try {
    const routes = routesFor({ connection: { requestRejection: () => undefined }, dirs })
    const wrongMethod = makeRes()
    routes.getDecks(makeReq({ method: 'POST', headers: { host: 'localhost' } }), wrongMethod)
    assert.equal(wrongMethod.status, 405)
    assert.equal(wrongMethod.headers.allow, 'GET')

    for (const contentType of [undefined, 'text/plain', 'application/x-www-form-urlencoded']) {
      const headers = { host: 'localhost' }
      if (contentType !== undefined) headers['content-type'] = contentType
      const res = makeRes()
      await routes.deleteDeck(makeReq({ method: 'POST', headers }), res)
      assert.equal(res.status, 415, `content-type ${contentType} must be refused`)
      assert.equal(res.json().code, 'unsupported-media-type')
    }
  } finally {
    dirs.cleanup()
  }
})

test('GET lists decks with a single success shape', () => {
  const dirs = tempDirs()
  try {
    saveDeckFile(sampleDeck('listed'), dirs.userDir)
    const routes = routesFor({ connection: { requestRejection: () => undefined }, dirs })
    const res = makeRes()
    routes.getDecks(makeReq({ headers: { host: 'localhost' } }), res)
    assert.equal(res.status, 200)
    const payload = res.json()
    assert.equal(payload.ok, true)
    assert.deepEqual(payload.decks.map((deck) => deck.id), ['listed'])
    assert.deepEqual(payload.errors, [])
  } finally {
    dirs.cleanup()
  }
})

test('delete: success, invalid id and missing deck answer with the documented shape', async () => {
  const dirs = tempDirs()
  try {
    saveDeckFile(sampleDeck('gone'), dirs.userDir)
    const routes = routesFor({ connection: { requestRejection: () => undefined }, dirs })
    const headers = { host: 'localhost', 'content-type': 'application/json' }

    const ok = makeRes()
    await routes.deleteDeck(makeReq({ method: 'POST', headers, body: JSON.stringify({ id: 'gone' }) }), ok)
    assert.equal(ok.status, 200)
    assert.equal(ok.json().ok, true)
    assert.match(ok.json().message, /已删除/)

    const missing = makeRes()
    await routes.deleteDeck(makeReq({ method: 'POST', headers, body: JSON.stringify({ id: 'gone' }) }), missing)
    assert.equal(missing.status, 404)
    assert.equal(missing.json().code, 'not-found')
    assert.ok(missing.json().message.length > 0)

    const bad = makeRes()
    await routes.deleteDeck(makeReq({ method: 'POST', headers, body: JSON.stringify({ id: '../evil' }) }), bad)
    assert.equal(bad.status, 400)
    assert.equal(bad.json().code, 'invalid-id')

    const invalidJson = makeRes()
    await routes.deleteDeck(makeReq({ method: 'POST', headers, body: '{oops' }), invalidJson)
    assert.equal(invalidJson.status, 400)
    assert.equal(invalidJson.json().code, 'invalid-body')
  } finally {
    dirs.cleanup()
  }
})

test('apply() wires both routes, three tools and the skill through the fence', async () => {
  const dirs = tempDirs()
  try {
    mkdirSync(dirs.bundledDir, { recursive: true })
    const stub = stubContext()
    apply(stub.ctx, { bundledDir: dirs.bundledDir, userDir: dirs.userDir })

    assert.deepEqual(stub.routes.map((route) => route.path), ['/dsh-quiz/decks', '/dsh-quiz/decks/delete'])
    assert.deepEqual(stub.tools.map((tool) => tool.name), ['quiz_list_decks', 'quiz_save_deck', 'quiz_delete_deck'])
    assert.deepEqual(stub.skills.map((skill) => skill.name), ['dsh-quiz'])
    assert.match(stub.skills[0].content, /出题/)

    const list = await stub.tools[0].execute()
    assert.equal(list.ok, true)
    assert.deepEqual(list.decks, [])

    const saved = await stub.tools[1].execute({ deck: JSON.stringify(sampleDeck('via-tool')) })
    assert.equal(saved.ok, true, saved.message)
    assert.equal(saved.bytes > 0, true)
    assert.deepEqual(readdirOf(dirs.userDir), ['via-tool.json'])

    const removed = await stub.tools[2].execute({ id: 'via-tool' })
    assert.equal(removed.ok, true)

    // The registered handlers use the same store as the tools.
    const res = makeRes()
    await stub.routes[0].handler(makeReq({ headers: { host: 'localhost' } }), res)
    assert.equal(res.status, 200)
  } finally {
    dirs.cleanup()
  }
})

test('tool failures carry a stable code, matching the documented shape', async () => {
  const dirs = tempDirs()
  try {
    const stub = stubContext()
    apply(stub.ctx, { bundledDir: dirs.bundledDir, userDir: dirs.userDir })
    const save = stub.tools[1]
    const remove = stub.tools[2]

    const empty = await save.execute({ deck: '  ' })
    assert.deepEqual([empty.ok, empty.code], [false, 'invalid-argument'])

    const badJson = await save.execute({ deck: '{nope' })
    assert.deepEqual([badJson.ok, badJson.code], [false, 'invalid-json'])

    const invalid = await save.execute({ deck: JSON.stringify({ id: 'Bad Id' }) })
    assert.deepEqual([invalid.ok, invalid.code], [false, 'invalid-deck'])
    assert.ok(Array.isArray(invalid.errors) && invalid.errors.length > 0)

    const overlong = sampleDeck('coded')
    overlong.questions[0].prompt = 'x'.repeat(4001)
    const tooLong = await save.execute({ deck: JSON.stringify(overlong) })
    assert.deepEqual([tooLong.ok, tooLong.code], [false, 'invalid-deck'])

    const missing = await remove.execute({ id: 'nope' })
    assert.deepEqual([missing.ok, missing.code], [false, 'not-found'])
    const invalidId = await remove.execute({ id: '../x' })
    assert.deepEqual([invalidId.ok, invalidId.code], [false, 'invalid-id'])
  } finally {
    dirs.cleanup()
  }
})

test('apply() surfaces the size contract as a failed save, not a success', async () => {
  const dirs = tempDirs()
  try {
    const stub = stubContext()
    apply(stub.ctx, { bundledDir: dirs.bundledDir, userDir: dirs.userDir })
    const deck = sampleDeck('huge-via-tool')
    deck.questions = Array.from({ length: 40 }, (_, qi) => ({
      ...sampleDeck('x').questions[0],
      id: `q${qi + 1}`,
      prompt: '题'.repeat(4000),
      steps: [{ title: '步骤', body: '步'.repeat(4000) }],
    }))
    const result = await stub.tools[1].execute({ deck: JSON.stringify(deck) })
    assert.equal(result.ok, false)
    assert.equal(result.code, 'deck-too-large')
    assert.equal(result.limit, __internal.MAX_DECK_BYTES)
    assert.ok(result.bytes > __internal.MAX_DECK_BYTES)
    assert.match(result.message, /512 KiB/)
    assert.deepEqual(readdirOf(dirs.userDir), [])
  } finally {
    dirs.cleanup()
  }
})

function readdirOf(path) {
  try {
    return __internal.loadDecks({ bundledDir: join(path, '..', 'bundled'), userDir: path })
      .decks.map((deck) => deck.fileName)
  } catch {
    return []
  }
}
