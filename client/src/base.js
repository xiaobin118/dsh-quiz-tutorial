/**
 * @module base
 * Runtime addresses and storage keys.  `APP_BASE` is derived from this script's
 * own URL so the routes work under any deployment mount; nothing else in the
 * client depends on the page.
 *
 * Provides: APP_BASE, ENDPOINT, DELETE_ENDPOINT, NS, PANEL_ID, STORAGE_KEY.
 */

const APP_BASE = (() => {
  try {
    const src = document.currentScript && document.currentScript.src
    if (typeof src === 'string' && src !== '') {
      const url = new URL(src, window.location.href)
      const match = /^(.*)\/plugins\/dsh-quiz-tutorial\/client\.js$/.exec(url.pathname)
      if (match) return match[1]
    }
  } catch {
    /* fall through to root deployment */
  }
  return ''
})()

const ENDPOINT = `${APP_BASE}/dsh-quiz/decks`
const DELETE_ENDPOINT = `${APP_BASE}/dsh-quiz/decks/delete`
const NS = 'dsh-quiz'
const PANEL_ID = 'quiz'
const STORAGE_KEY = 'dsh-quiz:state:v1'
