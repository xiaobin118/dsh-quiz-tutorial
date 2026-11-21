/**
 * Bundled-deck contract: every shipped deck must pass the Host's own
 * normalization rules, and the package/client/patch ids must agree.
 *
 * This is the "generator output is accepted by the Host" regression guard from
 * the 1.0.0 audit, run without a DSH server or third-party test runner.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { __internal } from '../index.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const DECKS = join(ROOT, 'decks')

function bundledFiles() {
  return readdirSync(DECKS).filter((name) => name.endsWith('.json')).sort()
}

test('bundled decks validate with the Host normalizer and keep their ids', () => {
  const files = bundledFiles()
  assert.deepEqual(files, ['ml-cnn.json', 'ml-core.json'])
  let questionCount = 0
  for (const file of files) {
    const raw = JSON.parse(readFileSync(join(DECKS, file), 'utf8'))
    const result = __internal.normalizeDeck(raw)
    assert.deepEqual(result.errors, [], `${file} must pass normalizeDeck`)
    assert.equal(`${result.deck.id}.json`, file, 'file name must equal <id>.json')
    questionCount += result.deck.questions.length
  }
  assert.equal(questionCount, 15, '10 CNN + 5 concept questions are shipped')
})

test('every bundled question is structurally sound and its answer is unique', () => {
  for (const file of bundledFiles()) {
    const deck = JSON.parse(readFileSync(join(DECKS, file), 'utf8'))
    const ids = new Set()
    for (const question of deck.questions) {
      assert.ok(question.id && !ids.has(question.id), `${file}:${question.id} unique`)
      ids.add(question.id)
      assert.ok(question.prompt.length > 0 && question.topic.length > 0)
      assert.ok(question.options.length >= 2 && question.options.length <= 6)
      assert.ok(Number.isInteger(question.answer))
      assert.ok(question.answer >= 0 && question.answer < question.options.length)
      assert.ok(question.steps.length > 0, `${question.id} has worked steps`)
      const seen = new Set()
      for (const option of question.options) {
        const key = JSON.stringify(option.matrix ?? option.text)
        assert.ok(!seen.has(key), `${question.id} options unique`)
        seen.add(key)
        if (option.kind === 'matrix') {
          const width = option.matrix[0].length
          assert.ok(option.matrix.length > 0 && width > 0)
          for (const row of option.matrix) {
            assert.equal(row.length, width, `${question.id} matrix is rectangular`)
            for (const cell of row) assert.ok(Number.isFinite(cell), `${question.id} numeric cells`)
          }
        } else {
          assert.ok(typeof option.text === 'string' && option.text.length > 0)
        }
      }
    }
  }
})

test('bundled deck prose avoids markup the math renderer cannot show', () => {
  for (const file of bundledFiles()) {
    const text = readFileSync(join(DECKS, file), 'utf8')
    assert.ok(!text.includes('\\begin{'), `${file}: no LaTeX environments`)
  }
})

test('package, client bundle and cordis patch agree on one id', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-quiz-tutorial')
  assert.equal(pkg.version, '1.0.1')
  assert.equal(pkg.private, false)
  assert.equal(pkg.exports['./client'], './client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
  // The packed tarball must ship everything `npm run check` / `npm test` /
  // gen_decks --check need, so the advertised commands work off a registry
  // install too (audit D1).  Explicit file patterns keep __pycache__/*.pyc out.
  for (const entry of ['client/src/*.js', 'tools/build_client.mjs', 'tools/gen_decks.py', 'test/*.js', 'test/*.mjs']) {
    assert.ok(pkg.files.includes(entry), `package.json files must include ${entry}`)
  }
  assert.ok(!pkg.files.includes('tools'), 'do not ship the bare tools directory (pycache)')

  const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load\(\{/)
  assert.match(client, /id: 'dsh-quiz-tutorial'/, 'loader id matches the package name')

  // The patch is a one-entry `insert` list; parse its two keys without a YAML dep.
  const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')
  assert.equal((/^\s*-\s*id:\s*(\S+)\s*$/m.exec(patch) ?? [])[1], 'dsh-quiz-tutorial')
  assert.equal((/^\s*name:\s*(\S+)\s*$/m.exec(patch) ?? [])[1], 'dsh-quiz-tutorial')
})

test('host entry exports apply and the test surface', async () => {
  const mod = await import('../index.js')
  assert.equal(typeof mod.apply, 'function')
  assert.equal(typeof mod.__internal.normalizeDeck, 'function')
})
