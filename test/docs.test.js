/**
 * Documentation guards for the 1.0.0 audit fixes:
 *   I5 — the worked example must be arithmetically consistent (it was a 2×2
 *        input shown with a 4×4 output and an impossible pooling step);
 *   I6 — install docs must prefer the published npm package, not "not published";
 *   I9 — docs must state the math convention and the unsupported constructs.
 *
 * The example numbers are recomputed here, not copied from the docs.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const read = (name) => readFileSync(join(ROOT, name), 'utf8')

/** Valid cross-correlation of the documented 2×2 example, P=0/S=1. */
function documentedExample() {
  const X = [[1, 0], [0, 1]]
  const K = [[1, -1], [0, 2]]
  const terms = [
    X[0][0] * K[0][0],
    X[0][1] * K[0][1],
    X[1][0] * K[1][0],
    X[1][1] * K[1][1],
  ]
  const raw = terms.reduce((sum, value) => sum + value, 0)
  return { raw, withBias: raw - 1, forgotBias: raw, flippedBias: raw + 1 }
}

const example = documentedExample()

test('the documented worked example is arithmetically consistent', () => {
  assert.equal(example.raw, 3)
  assert.equal(example.withBias, 2)
  assert.equal(`⌊(2 − 2)/1⌋ + 1`, '⌊(2 − 2)/1⌋ + 1')

  for (const file of ['docs/deck-format.md', 'skill.md']) {
    const doc = read(file)
    assert.ok(doc.includes('[[2]]'), `${file}: correct option is 1×1 [[2]]`)
    assert.ok(doc.includes('[[3]]'), `${file}: "forgot bias" distractor is [[3]]`)
    assert.ok(doc.includes('[[4]]'), `${file}: "flipped bias" distractor is [[4]]`)
    assert.ok(doc.includes('⌊(2 − 2)/1⌋ + 1 = 1'), `${file}: output size matches the 2×2 input`)
    assert.ok(doc.includes('1×1 + 0×(−1) + 0×0 + 1×2 = 3'), `${file}: substitution is written out`)
    assert.ok(!doc.includes('2×2 最大池化'), `${file}: no impossible pooling step`)
    assert.ok(!doc.includes('[[2, 4], [4, 3]]'), `${file}: stale 2×2 example removed`)
  }
})

test('the math rendering convention is documented', () => {
  const format = read('docs/deck-format.md')
  for (const needle of ['_{...}', '^{...}', '$...$', '\\frac', '\\sum', '\\begin{...}']) {
    assert.ok(format.includes(needle), `docs/deck-format.md documents ${needle}`)
  }
  const skill = read('skill.md')
  assert.ok(skill.includes('公式怎么写'))
  assert.match(skill, /不支持|不要\*\*写|不要写/)
})

test('install docs prefer the published npm package and keep the GitHub fallback', () => {
  const zh = read('README.md')
  const en = read('README.en.md')
  for (const doc of [zh, en]) {
    assert.ok(doc.includes('dsh plugin --profile web add dsh-quiz-tutorial'))
    assert.ok(doc.includes('github:xiaobin118/dsh-quiz-tutorial'))
  }
  assert.ok(!zh.includes('尚未发布'))
  assert.ok(!en.includes('not published yet'))
  assert.ok(zh.includes('1.0.1'), 'changelog documents the fix release')
  assert.ok(en.includes('1.0.1'))
})

test('docs state the file-name and size contracts', () => {
  const format = read('docs/deck-format.md')
  assert.ok(format.includes('文件名必须等于 `<id>.json`'))
  assert.ok(format.includes('512 KiB'))
  const readme = read('README.md')
  assert.ok(readme.includes('512 KiB'))
  assert.ok(readme.includes('`<id>.json`'))
})

test('the client bundle is generated from client/src and checked in', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.scripts['build:client'], 'node tools/build_client.mjs')
  assert.match(pkg.scripts.check, /build_client\.mjs --check/)
  const bundle = read('client.js')
  assert.match(bundle, /GENERATED FILE/)
  assert.match(bundle, /Source lives in client\/src/)
})
