/**
 * Package/ID contract: the npm package, the served client bundle and the
 * Cordis patch must agree, and the tarball must ship the source/tools/tests the
 * advertised commands need.  There are no bundled decks; every deck is created
 * by the agent or the user.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

test('package, client bundle and cordis patch agree on one id', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
  assert.equal(pkg.name, 'dsh-quiz-tutorial')
  assert.equal(pkg.version, '1.0.3')
  assert.equal(pkg.private, false)
  assert.equal(pkg.exports['./client'], './client.js')
  assert.equal(pkg.dsh.client.platform, 'web')
  // The packed tarball must ship everything `npm run check` / `npm test` need,
  // so the advertised commands work off a registry install too (audit D1).
  for (const entry of ['client/src/*.js', 'tools/build_client.mjs', 'test/*.js', 'test/*.mjs']) {
    assert.ok(pkg.files.includes(entry), `package.json files must include ${entry}`)
  }
  assert.ok(!pkg.files.includes('decks/*.json'), 'no built-in decks are shipped')
  assert.ok(!pkg.files.includes('tools/gen_decks.py'), 'no built-in deck generator is shipped')
  assert.ok(!pkg.files.includes('tools'), 'do not ship the bare tools directory (pycache)')

  const client = readFileSync(join(ROOT, 'client.js'), 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load\(\{/)
  assert.match(client, /id: 'dsh-quiz-tutorial'/, 'loader id matches the package name')
  assert.equal(/BUNDLED_DIR|source === 'bundled'/.test(client), false, 'no built-in deck path in the client')

  const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')
  assert.equal((/^\s*-\s*id:\s*(\S+)\s*$/m.exec(patch) ?? [])[1], 'dsh-quiz-tutorial')
  assert.equal((/^\s*name:\s*(\S+)\s*$/m.exec(patch) ?? [])[1], 'dsh-quiz-tutorial')
})

test('host entry exports apply and the test surface', async () => {
  const mod = await import('../index.js')
  assert.equal(typeof mod.apply, 'function')
  assert.equal(typeof mod.__internal.normalizeDeck, 'function')
  assert.equal(mod.__internal.BUNDLED_DIR, undefined, 'the host has no bundled-deck directory')
})
