/**
 * @module text
 * Tiny display helpers shared by the deck view and the accessible labels.
 *
 * Provides: cellText, letterOf.  Requires: nothing.
 */

function cellText(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value).replace('-', '\u2212')
  }
  return String(value).replace('-', '\u2212')
}

function letterOf(index) {
  return String.fromCharCode(65 + index)
}
