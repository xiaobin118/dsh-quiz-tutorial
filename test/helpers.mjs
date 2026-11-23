/**
 * Shared test helpers.  Deliberately dependency-free: `node --test test/` runs
 * on a bare Node 22 checkout with no `npm install`, mirrors CI, and never
 * touches the real DSH_HOME (callers pass temp dirs).
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function tempDirs() {
  const root = mkdtempSync(join(tmpdir(), 'dsh-quiz-test-'))
  return {
    root,
    userDir: join(root, 'user'),
    cleanup() {
      rmSync(root, { recursive: true, force: true })
    },
  }
}

/** Minimal node:http response double that records status/headers/body. */
export function makeRes() {
  return {
    status: 0,
    headers: {},
    body: '',
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value
    },
    writeHead(status, headers) {
      this.status = status
      Object.assign(this.headers, headers ?? {})
    },
    end(body) {
      this.body = body ?? ''
    },
    json() {
      return JSON.parse(this.body)
    },
  }
}

/** Minimal request double: headers + optional async body chunks. */
export function makeReq({ method = 'GET', headers = {}, body = null } = {}) {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() {
      if (body !== null) yield Buffer.from(body)
    },
  }
}

/**
 * A stub Cordis context that records what `apply(ctx)` registers.
 * `connection` defaults to an admitting fence; pass `rejection` to simulate
 * DSH refusing a request (401/403) and record calls.
 */
export function stubContext({ rejection = undefined, connection = undefined } = {}) {
  const routes = []
  const tools = []
  const skills = []
  const effects = []
  const calls = []
  const fence = connection ?? (rejection === undefined ? {
    requestRejection() {
      calls.push('requestRejection')
      return undefined
    },
  } : {
    requestRejection() {
      calls.push('requestRejection')
      return rejection
    },
  })

  const ctx = {
    inject(names, callback) {
      const child = {}
      child.effect = (fn) => {
        const disposer = fn()
        effects.push(disposer)
        return disposer
      }
      if (names.includes('webServer')) {
        child.webServer = {
          register(route) {
            routes.push(route)
            return () => {}
          },
        }
      }
      if (names.includes('connection')) child.connection = fence
      if (names.includes('tools')) {
        child.tools = {
          register(tool) {
            tools.push(tool)
            return () => {}
          },
        }
      }
      if (names.includes('skills')) {
        child.skills = {
          register(skill) {
            skills.push(skill)
            return () => {}
          },
        }
      }
      callback(child)
    },
  }
  return { ctx, routes, tools, skills, effects, calls, fence }
}
