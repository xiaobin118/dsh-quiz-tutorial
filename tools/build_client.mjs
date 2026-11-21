#!/usr/bin/env node
/**
 * Build the one classic-script bundle DSH serves for this package.
 *
 * DSH's client module system serves exactly one bundle per package
 * (`exports["./client"]`) and resolves `require` against the platform module
 * table; it cannot resolve package-local ESM imports.  The client half
 * therefore lives in `client/src/*.js` as plain top-level modules, and this
 * dependency-free script concatenates them — in the explicit order below —
 * into `client.js`, which remains the served, versioned artifact.
 *
 * Usage:
 *   node tools/build_client.mjs           # write client.js
 *   node tools/build_client.mjs --check   # fail when client.js is stale
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SRC = join(ROOT, 'client', 'src')
const OUT = join(ROOT, 'client.js')

/**
 * Order matters only for top-level `const` initialization: `base.js` first
 * (addresses), `locale.js`/`styles.js`/`text.js`/`math.js` are independent, and
 * `state.js` reads `STORAGE_KEY`.  Factory modules may declare functions in any
 * order because function declarations hoist inside the factory scope.
 */
const SHARED = ['base.js', 'locale.js', 'styles.js', 'text.js', 'math.js', 'state.js']
const FACTORY = ['components.js', 'notebook.js', 'page.js', 'panel.js']

const BANNER = `/**
 * dsh-quiz — Client half.  GENERATED FILE — do not edit.
 *
 * Source lives in client/src/*.js (one module per concern):
 *   base.js        routes/keys derived from this script's URL
 *   locale.js      zh/en dictionaries (namespace dsh-quiz)
 *   styles.js      theme-token CSS + injector
 *   text.js        display helpers
 *   math.js        math-lite tokenizer for authored deck prose
 *   state.js       pure answers/mistakes/hidden helpers
 *   components.js  icons, matrix, options, solution cards, notes
 *   notebook.js    mistake log
 *   page.js        the stateful QuizPage
 *   panel.js       plugin face (locale/styles/panels)
 *
 * \`components\`/\`notebook\`/\`page\`/\`panel\` are factory bodies, written with
 * the 4-space factory indent because this script inlines them verbatim.  Edit a
 * source file, then run \`npm run build:client\`; \`npm run check\` fails when
 * client.js is stale.  DSH serves this single bundle, so keep it in sync.
 */
`

function readModule(name) {
  const text = readFileSync(join(SRC, name), 'utf8').replace(/\s+$/u, '')
  if (text.trim() === '') throw new Error(`client/src/${name} is empty`)
  return text
}

function build() {
  const shared = SHARED.map(readModule).join('\n\n')
  const factory = FACTORY.map(readModule).join('\n\n')
  return `${BANNER}
${shared}
window.__ModuleLoader__.load({
  id: 'dsh-quiz-tutorial',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

${factory}

    return pluginFace()
  },
})
`
}

const output = build()
if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(OUT, 'utf8')
  } catch {
    console.error('client.js: missing; run npm run build:client')
    process.exit(1)
  }
  if (current !== output) {
    console.error('client.js: stale; run npm run build:client')
    process.exit(1)
  }
  console.log('client.js: up to date')
} else {
  writeFileSync(OUT, output, 'utf8')
  console.log(`wrote client.js (${Buffer.byteLength(output)} bytes from ${SHARED.length + FACTORY.length} modules)`)
}
