/**
 * @module styles
 * The plugin's CSS (theme tokens only: `--dsw-alias-*`) and its injector.
 * `injectStyles` is called once from `apply`, and its disposer removes the tag.
 *
 * Provides: CSS, injectStyles.  Requires: nothing.
 */

const CSS = `
.dshq-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 1.65;
}
.dshq-topbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  flex: 0 0 auto;
}
.dshq-heading { display: flex; align-items: flex-start; gap: 12px; min-width: 0; }
.dshq-logo {
  width: 38px; height: 38px; flex: 0 0 auto; border-radius: 10px;
  display: grid; place-items: center;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent);
}
.dshq-kicker {
  font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary);
}
.dshq-title { margin: 1px 0 0; font-size: 18px; line-height: 1.35; font-weight: 600; }
.dshq-sub { margin: 3px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); max-width: 62ch; }
.dshq-head-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dshq-score { display: flex; gap: 6px; }
.dshq-score-chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 26px; padding: 0 9px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  font-size: 12px; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-label-secondary);
}
.dshq-score-chip.is-good { color: var(--dsw-alias-state-success-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 35%, transparent); }
.dshq-score-chip.is-bad { color: var(--dsw-alias-state-error-primary); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent); }
.dshq-button {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 12px; border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: inherit; cursor: pointer;
}
.dshq-button:hover { background: var(--dsw-alias-interactive-bg-hover); border-color: var(--dsw-alias-border-l2); }
.dshq-button:disabled { opacity: .5; cursor: default; }
.dshq-button.is-primary {
  background: var(--dsw-alias-button-primary-fill);
  border-color: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
}
.dshq-button.is-primary:hover { background: var(--dsw-alias-button-primary-hover); border-color: var(--dsw-alias-button-primary-hover); }
.dshq-icon-button {
  display: inline-grid; place-items: center; width: 30px; height: 30px;
  border-radius: 8px; border: 1px solid transparent; background: transparent;
  color: var(--dsw-alias-label-secondary); cursor: pointer;
}
.dshq-icon-button:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dshq-layout {
  flex: 1 1 auto; min-height: 0;
  display: grid;
  grid-template-columns: 212px minmax(0, 1fr) 384px;
}
.dshq-alert {
  display: flex; align-items: flex-start; gap: 10px;
  margin: 8px 14px 0; padding: 8px 12px;
  border-radius: 9px; font-size: 12.5px; line-height: 1.5;
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
}
.dshq-alert-body { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.dshq-alert-title { display: block; margin-bottom: 2px; }
.dshq-alert-line { font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.dshq-refresh-status {
  margin: 8px 14px 0; padding: 6px 12px;
  border-radius: 9px; font-size: 12px; line-height: 1.5;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-fill-l1);
  border: 1px solid var(--dsw-alias-border-l1);
}
.dshq-last-refresh { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); white-space: nowrap; }
.dshq-rail {
  min-height: 0; overflow: auto;
  padding: 14px 10px 18px;
  border-right: 1px solid var(--dsw-alias-border-l1);
  display: flex; flex-direction: column; gap: 4px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 45%, transparent);
}
.dshq-rail-title {
  font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
  color: var(--dsw-alias-label-tertiary); padding: 0 8px 6px;
}
.dshq-deck {
  display: flex; flex-direction: column; gap: 2px; width: 100%;
  padding: 8px 9px; border-radius: 9px; text-align: left;
  border: 1px solid transparent; background: transparent;
  color: var(--dsw-alias-label-secondary); font: inherit; cursor: pointer;
}
.dshq-deck:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dshq-deck.is-active {
  background: var(--dsw-alias-bg-layer-1);
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
  box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary);
}
.dshq-deck-subject { font-size: 10px; letter-spacing: .06em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshq-deck-title { font-size: 12.5px; line-height: 1.45; color: inherit; }
.dshq-deck-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshq-rail-restore {
  width: 100%; margin-top: 4px; padding: 6px 8px; border-radius: 8px;
  border: 1px dashed var(--dsw-alias-border-l2); background: transparent;
  color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 11.5px;
  text-align: left; cursor: pointer;
}
.dshq-rail-restore:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.dshq-rail-hint {
  margin-top: 12px; padding: 10px 9px; border-radius: 9px;
  border: 1px dashed var(--dsw-alias-border-l2);
  font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-tertiary);
}
.dshq-main { min-height: 0; overflow: auto; position: relative; }
.dshq-main-inner { padding: 16px 24px 22px; display: flex; flex-direction: column; gap: 12px; min-height: 100%; }
.dshq-progress { height: 3px; border-radius: 999px; background: var(--dsw-alias-bg-layer-2); overflow: hidden; flex: 0 0 auto; }
.dshq-progress-fill { height: 100%; background: var(--dsw-alias-brand-primary); border-radius: inherit; transition: width .2s ease; }
.dshq-question-card {
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 16px 18px 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.dshq-qhead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshq-qindex { font-size: 14px; font-weight: 600; }
.dshq-qof { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
.dshq-tag.is-multi { color: var(--dsw-alias-brand-primary); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 32%, transparent); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent); }
.dshq-tag {
  display: inline-flex; align-items: center; height: 20px; padding: 0 7px;
  border-radius: 999px; font-size: 10.5px; letter-spacing: .02em;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);
}
.dshq-topic { font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dshq-stem { margin: 0; font-size: 13.5px; line-height: 1.7; }
.dshq-inputs { display: flex; flex-wrap: wrap; gap: 16px 22px; align-items: center; }
.dshq-matrix-block { display: flex; flex-direction: column; gap: 4px; min-width: 0; align-items: flex-start; }
.dshq-matrix-block.is-small { gap: 2px; }
.dshq-matrix-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); letter-spacing: .04em; }
.dshq-scalar { display: flex; align-items: baseline; gap: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dshq-scalar-value { font-size: 13px; }
.dshq-conditions {
  display: flex; gap: 8px; align-items: baseline;
  font-size: 12px; color: var(--dsw-alias-label-secondary);
  padding: 7px 10px; border-radius: 8px;
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2) 70%, transparent);
  border: 1px solid var(--dsw-alias-border-l1);
}
.dshq-cond-label { font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); flex: 0 0 auto; }
.dshq-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.dshq-submit-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
.dshq-submit-row .dshq-button { margin-left: auto; }
.dshq-option {
  display: flex; align-items: center; gap: 10px;
  min-width: 0; padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
  font: inherit; text-align: left; cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.dshq-option.is-text { grid-column: 1 / -1; }
.dshq-option.is-selected { border-color: var(--dsw-alias-brand-primary); background: color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent); box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); }
.dshq-option.is-selected .dshq-opt-letter { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-brand-primary); border-color: transparent; }
.dshq-option:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-interactive-bg-hover); }
.dshq-option:disabled { cursor: default; }
.dshq-option.is-picked-correct { border-color: var(--dsw-alias-state-success-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-state-success-primary); }
.dshq-option.is-picked-wrong { border-color: var(--dsw-alias-state-error-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-state-error-primary); }
.dshq-option.is-reveal-correct { border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 55%, transparent); background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 7%, transparent); }
.dshq-option.is-dim { opacity: .55; }
.dshq-opt-letter {
  flex: 0 0 auto; width: 22px; height: 22px; border-radius: 6px;
  display: grid; place-items: center;
  font-size: 11.5px; font-weight: 600;
  color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);
}
.dshq-option.is-picked-correct .dshq-opt-letter { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-state-success-primary); border-color: transparent; }
.dshq-option.is-picked-wrong .dshq-opt-letter { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-state-error-primary); border-color: transparent; }
.dshq-opt-body { min-width: 0; flex: 1 1 auto; display: flex; align-items: center; }
.dshq-opt-value { min-width: 0; font-size: 12.5px; text-align: left; }
/* Matrices are KaTeX bmatrices: brackets and cell alignment come from KaTeX. */
.dshq-matrix-math { min-width: 0; max-width: 100%; overflow-x: auto; overflow-y: hidden; }
.dshq-matrix-math .dshq-md > div { margin: 0; }
.dshq-matrix-math .katex-display { margin: 0; }
.dshq-matrix-math .katex { font-size: 1.06em; }
.dshq-matrix-block.is-small .dshq-matrix-math .katex { font-size: .96em; }
.dshq-md.is-inline { display: inline; }
.dshq-md.is-inline > div { display: inline; }
.dshq-md.is-inline > div > p { display: inline; margin: 0; }
.dshq-opt-mark { flex: 0 0 auto; display: inline-flex; }
.dshq-opt-mark.is-good { color: var(--dsw-alias-state-success-primary); }
.dshq-opt-mark.is-bad { color: var(--dsw-alias-state-error-primary); }
.dshq-pager { display: flex; align-items: center; gap: 10px; justify-content: space-between; padding: 2px 2px 0; }
.dshq-dots { display: flex; gap: 5px; flex-wrap: wrap; justify-content: center; }
.dshq-dot {
  width: 18px; height: 18px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-tertiary);
  font-size: 10px; font-variant-numeric: tabular-nums; cursor: pointer; display: grid; place-items: center;
  padding: 0;
}
.dshq-dot:hover { border-color: var(--dsw-alias-border-l2); }
.dshq-dot.is-current { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary); box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary); }
.dshq-dot.is-good { background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary) 45%, transparent); color: var(--dsw-alias-state-success-primary); }
.dshq-dot.is-bad { background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 14%, transparent); border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 45%, transparent); color: var(--dsw-alias-state-error-primary); }
.dshq-summary {
  display: flex; align-items: center; gap: 12px; justify-content: space-between; flex-wrap: wrap;
  padding: 10px 12px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  font-size: 12.5px;
}
.dshq-aside {
  min-height: 0; overflow: auto;
  border-left: 1px solid var(--dsw-alias-border-l1);
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-1) 55%, transparent);
  display: flex; flex-direction: column;
}
.dshq-aside-head {
  position: sticky; top: 0; z-index: 1;
  padding: 12px 16px 10px;
  background: var(--dsw-alias-bg-base);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dshq-tabs { display: inline-flex; padding: 2px; gap: 2px; border-radius: 8px; background: var(--dsw-alias-bg-layer-2); border: 1px solid var(--dsw-alias-border-l1); }
.dshq-tab {
  border: 0; background: transparent; color: var(--dsw-alias-label-secondary);
  padding: 4px 10px; border-radius: 6px; font: inherit; font-size: 12px; cursor: pointer;
}
.dshq-tab.is-active { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px color-mix(in srgb, var(--dsw-alias-bg-mask-2) 60%, transparent); }
.dshq-aside-body { padding: 14px 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.dshq-card {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1);
  padding: 12px 13px;
}
.dshq-verdict { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13px; }
.dshq-verdict.is-good { color: var(--dsw-alias-state-success-primary); }
.dshq-verdict.is-bad { color: var(--dsw-alias-state-error-primary); }
.dshq-answer-row { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; margin-top: 6px; }
.dshq-pick { display: flex; flex-direction: column; gap: 4px; }
.dshq-pick-label { font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); }
.dshq-pick-value { display: flex; align-items: center; gap: 8px; font-size: 12.5px; }
.dshq-chip-letter {
  width: 20px; height: 20px; border-radius: 5px; display: grid; place-items: center;
  font-size: 10.5px; font-weight: 600; background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1); color: var(--dsw-alias-label-secondary);
}
.dshq-chip-letter.is-good { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-state-success-primary); border-color: transparent; }
.dshq-chip-letter.is-bad { color: var(--dsw-alias-label-primary-inverted); background: var(--dsw-alias-state-error-primary); border-color: transparent; }
.dshq-section-title { font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--dsw-alias-label-tertiary); margin: 0 0 8px; }
.dshq-formula {
  font-size: 12px; color: var(--dsw-alias-label-secondary);
  background: var(--dsw-alias-bg-layer-2);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px; padding: 8px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  line-height: 1.55; overflow-wrap: anywhere;
}
.dshq-step { padding-top: 12px; margin-top: 12px; border-top: 1px dashed var(--dsw-alias-border-l1); }
.dshq-step:first-child { padding-top: 0; margin-top: 0; border-top: 0; }
.dshq-step-title { margin: 0 0 5px; font-size: 12.5px; font-weight: 600; }
.dshq-step-body { margin: 0; font-size: 12.5px; line-height: 1.7; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshq-step-matrices { display: flex; flex-wrap: wrap; gap: 12px 18px; margin-top: 8px; }
.dshq-diagnostics { display: flex; flex-direction: column; gap: 7px; }
.dshq-diagnostic { display: flex; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.dshq-diagnostic .dshq-chip-letter { flex: 0 0 auto; }
.dshq-diagnostic.is-picked .dshq-chip-letter { border-color: var(--dsw-alias-state-error-primary); }
.dshq-note-card { display: flex; flex-direction: column; gap: 4px; }
.dshq-note-title { margin: 0; font-size: 12.5px; font-weight: 600; }
.dshq-note-body { margin: 0; font-size: 12px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dshq-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; text-align: center; padding: 48px 24px; color: var(--dsw-alias-label-secondary);
}
.dshq-empty h2 { margin: 0; font-size: 15px; color: var(--dsw-alias-label-primary); }
.dshq-empty p { margin: 0; max-width: 46ch; font-size: 12.5px; }
.dshq-loader { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 60px 20px; color: var(--dsw-alias-label-secondary); }
/* Deck prose is rendered by DSH's Markdown/KaTeX primitive inside .dshq-md.
   Zero the first/last block margins so existing card spacing is preserved,
   and let long display math scroll instead of breaking the layout. */
.dshq-md { min-width: 0; max-width: 100%; }
.dshq-md > div { margin: 0; }
.dshq-md > div > :first-child { margin-top: 0; }
.dshq-md > div > :last-child { margin-bottom: 0; }
.dshq-md .katex-display {
  margin: 6px 0; padding: 2px 0 4px;
  overflow-x: auto; overflow-y: hidden;
}
.dshq-md .katex { font-size: 1.02em; }
.dshq-md.is-fallback { white-space: pre-wrap; overflow-wrap: anywhere; }
.dshq-condition .dshq-md, .dshq-cond-value .dshq-md { display: inline; }
.dshq-opt-value .dshq-md > div { display: inline-block; }
.dshq-pick-text .dshq-md > div { display: inline-block; }
.dshq-diagnostic-note { min-width: 0; }
.dshq-loader-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-brand-primary); animation: dshq-pulse 1s infinite ease-in-out; }
.dshq-loader-dot:nth-child(2) { animation-delay: .15s; }
.dshq-loader-dot:nth-child(3) { animation-delay: .3s; }
@keyframes dshq-pulse { 0%, 100% { opacity: .25; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
/* Keep this at the top level: a media query nested inside a keyframes rule is
   invalid CSS and browsers drop it (the 1.0.1 build shipped it inside). */
@media (prefers-reduced-motion: reduce) { .dshq-loader-dot { animation: none; opacity: .6; } }
.dshq-hint { font-size: 11.5px; color: var(--dsw-alias-label-tertiary); }
.dshq-kbd-hint { display: flex; gap: 10px; flex-wrap: wrap; }

.dshq-deck-row { position: relative; display: flex; align-items: stretch; }
.dshq-deck-row > .dshq-deck { flex: 1 1 auto; min-width: 0; padding-right: 26px; }
.dshq-deck-remove {
  position: absolute; right: 4px; top: 5px; width: 20px; height: 20px;
  border: 0; border-radius: 6px; padding: 0;
  display: grid; place-items: center;
  background: transparent; color: var(--dsw-alias-label-tertiary);
  cursor: pointer; opacity: 0; transition: opacity .12s ease, background .12s ease, color .12s ease;
}
.dshq-deck-row:hover .dshq-deck-remove,
.dshq-deck-remove:focus-visible { opacity: 1; }
.dshq-deck-remove:hover {
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);
  color: var(--dsw-alias-state-error-primary);
}
.dshq-deck-remove:disabled { opacity: .4; cursor: default; }
@media (hover: none) { .dshq-deck-remove { opacity: .65; } }
.dshq-rail-note {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 9px; margin-bottom: 8px; border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer;
}
.dshq-rail-note:hover { border-color: var(--dsw-alias-border-l2); }
.dshq-rail-note.is-active {
  border-color: var(--dsw-alias-brand-primary);
  box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary);
}
.dshq-rail-note-icon { display: inline-flex; color: var(--dsw-alias-brand-primary); flex: 0 0 auto; }
.dshq-rail-note-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1 1 auto; }
.dshq-rail-note-title { font-size: 12.5px; line-height: 1.4; }
.dshq-rail-note-meta { font-size: 11px; color: var(--dsw-alias-label-tertiary); font-variant-numeric: tabular-nums; }
.dshq-rail-badge {
  flex: 0 0 auto; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 999px; display: grid; place-items: center;
  background: var(--dsw-alias-state-error-primary);
  color: var(--dsw-alias-label-primary-inverted);
  font-size: 10.5px; font-variant-numeric: tabular-nums;
}
.dshq-notebook { padding: 16px 24px 24px; display: flex; flex-direction: column; gap: 12px; }
.dshq-notebook-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.dshq-notebook-title { margin: 0; font-size: 16px; }
.dshq-notebook-sub { margin: 3px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary); max-width: 62ch; }
.dshq-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.dshq-filter {
  height: 26px; padding: 0 10px; border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11.5px; cursor: pointer;
}
.dshq-filter:hover { border-color: var(--dsw-alias-border-l2); }
.dshq-filter.is-active {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-brand-primary);
}
.dshq-mistake-list { display: flex; flex-direction: column; gap: 10px; }
.dshq-mistake {
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px;
  background: var(--dsw-alias-bg-layer-1); padding: 12px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.dshq-mistake-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dshq-mistake-deck { font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dshq-mistake-topic { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.dshq-mistake-badge {
  margin-left: auto; padding: 1px 7px; border-radius: 999px;
  font-size: 10.5px; font-variant-numeric: tabular-nums;
  color: var(--dsw-alias-state-error-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-error-primary) 30%, transparent);
}
.dshq-mistake-done {
  padding: 1px 7px; border-radius: 999px; font-size: 10.5px;
  color: var(--dsw-alias-state-success-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--dsw-alias-state-success-primary) 30%, transparent);
}
.dshq-mistake-prompt {
  margin: 0; font-size: 12.5px; line-height: 1.65; color: var(--dsw-alias-label-primary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.dshq-mistake-meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 11px; color: var(--dsw-alias-label-tertiary); }
.dshq-mistake-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.dshq-mistake-actions .dshq-button { height: 26px; padding: 0 9px; font-size: 11.5px; }
.dshq-mistake-stats { display: flex; gap: 8px; flex-wrap: wrap; margin: 8px 0 12px; }
.dshq-stat {
  flex: 1 1 60px; min-width: 60px; border-radius: 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-base); padding: 8px 9px;
}
.dshq-stat-value { font-size: 18px; line-height: 1.2; font-weight: 600; font-variant-numeric: tabular-nums; }
.dshq-stat-label { font-size: 10.5px; color: var(--dsw-alias-label-tertiary); }
.dshq-stat.is-open .dshq-stat-value { color: var(--dsw-alias-state-error-primary); }
.dshq-stat.is-done .dshq-stat-value { color: var(--dsw-alias-state-success-primary); }
.dshq-review-bar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 8px 11px; border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
  font-size: 12px;
}
.dshq-review-title { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; color: var(--dsw-alias-brand-primary); }
.dshq-review-bar .dshq-button { margin-left: auto; }
.dshq-summary-actions { display: flex; gap: 8px; flex-wrap: wrap; }

@media (max-width: 1180px) and (min-width: 981px) {
  .dshq-layout { grid-template-columns: 168px minmax(0, 1fr) 324px; }
}
@media (max-width: 980px) {
  .dshq-layout { display: flex; flex-direction: column; overflow: auto; }
  .dshq-rail {
    flex-direction: row; align-items: stretch; overflow-x: auto; overflow-y: hidden;
    border-right: 0; border-bottom: 1px solid var(--dsw-alias-border-l1);
    padding: 8px 12px; gap: 6px; flex: 0 0 auto;
  }
  .dshq-rail-title, .dshq-rail-hint { display: none; }
  .dshq-rail-note { width: auto; min-width: 158px; flex: 0 0 auto; margin-bottom: 0; }
  .dshq-deck-row { min-width: 172px; flex: 0 0 auto; }
  .dshq-deck-row > .dshq-deck { min-width: 0; flex: 1 1 auto; }
  .dshq-deck { min-width: 172px; flex: 0 0 auto; }
  .dshq-main { overflow: visible; }
  .dshq-aside { border-left: 0; border-top: 1px solid var(--dsw-alias-border-l1); overflow: visible; }
}
@media (max-width: 620px) {
  .dshq-options { grid-template-columns: minmax(0, 1fr); }
  .dshq-topbar { padding: 14px 16px 10px; }
  .dshq-main-inner { padding: 12px 16px 18px; }
}
`

function injectStyles() {
  if (typeof document === 'undefined') return () => {}
  const tag = document.createElement('style')
  tag.dataset.plugin = 'dsh-quiz'
  tag.textContent = CSS
  document.head.appendChild(tag)
  return () => tag.remove()
}
