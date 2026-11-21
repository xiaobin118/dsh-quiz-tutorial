/**
 * @module text
 * Tiny display helpers shared by the deck view and the accessible labels.
 *
 * Provides: letterOf.  Requires: nothing.
 */

function letterOf(index) {
  return String.fromCharCode(65 + index)
}
