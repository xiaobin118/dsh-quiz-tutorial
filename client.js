/**
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
 * `components`/`notebook`/`page`/`panel` are factory bodies, written with
 * the 4-space factory indent because this script inlines them verbatim.  Edit a
 * source file, then run `npm run build:client`; `npm run check` fails when
 * client.js is stale.  DSH serves this single bundle, so keep it in sync.
 */

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

/**
 * @module locale
 * zh/en dictionaries registered under the `dsh-quiz` namespace.  Every visible
 * string goes through `ctx.locale`; keep both dictionaries in sync.
 *
 * Provides: zh, en.
 */

const zh = {
  'panel.label': '刷题场',
  'app.title': '刷题场',
  'app.subtitle': '按当前复习内容生成题集，逐题手算、即时解析',
  'app.back': '返回对话',
  'app.notebook': '错题本',
  'mistakes.title': '错题本',
  'mistakes.sub': '做错的题会自动收进来；重做答对后自动标记为已订正。',
  'mistakes.openCount': '{n} 道未订正',
  'mistakes.open': '未订正',
  'mistakes.mastered': '已订正',
  'mistakes.total': '共',
  'mistakes.filter.open': '未订正',
  'mistakes.filter.mastered': '已订正',
  'mistakes.filter.all': '全部',
  'mistakes.empty': '错题本还是空的',
  'mistakes.emptyHint': '刷题时答错的题会自动出现在这里。',
  'mistakes.emptyFiltered': '这个筛选下暂时没有题。',
  'mistakes.back': '返回刷题',
  'mistakes.stats': '错题统计',
  'mistakes.reviewAll': '重练全部未订正（{n}）',
  'mistakes.clearMastered': '清空已订正（{n}）',
  'mistakes.clearConfirm': '确定要清空 {n} 道已订正的错题记录吗？',
  'mistakes.explainTitle': '怎么用',
  'mistakes.explainBody': '答错的题自动记录；点「重做」会清掉这道题的原答案，重做答对后自动标记已订正；也可以手动标记或移出。',
  'mistakes.explainHint': '「重练全部未订正」按最近出错顺序重来一遍；开始时这些题的原作答会被清空，错题记录保留。',
  'mistakes.lastWrong': '上次答错：{pick} · 正确答案：{answer}',
  'mistakes.wrongTimes': '错 {n} 次',
  'mistakes.lastAt': '最近 {time}',
  'mistakes.masteredAt': '订正于 {time}',
  'mistakes.redo': '重做',
  'mistakes.viewSolution': '看解析',
  'mistakes.markMastered': '标记已掌握',
  'mistakes.reopen': '重新打开',
  'mistakes.remove': '移出错题本',
  'mistakes.missingDeck': '对应题集已不存在。',
  'review.title': '错题重练',
  'review.sub': '按错误记录逐题重做；答对会自动标记已订正。',
  'review.progress': '第 {n}/{m} 题',
  'review.exit': '退出重练',
  'review.done': '本轮错题重练完成：答对 {c}/{n}',
  'review.again': '再来一轮',
  'review.skip': '跳过这条',
  'review.autoMaster': '答对自动订正',
  'app.refresh': '刷新题集',
  'app.loading': '正在加载题集…',
  'app.error': '题集加载失败',
  'app.retry': '重试',
  'app.dismiss': '知道了',
  'markdown.copy': '复制代码',
  'markdown.copied': '已复制',
  'markdown.footnotes': '脚注',
  'refresh.failed': '题集刷新失败',
  'refresh.retry': '重试',
  'refresh.result': '已刷新：{total} 套题集',
  'refresh.added': '新增 {n}',
  'refresh.updated': '更新 {n}',
  'refresh.removed': '移除 {n}',
  'refresh.noChange': '没有变化',
  'refresh.lastAt': '最近刷新 {time}',
  'app.empty': '还没有题集',
  'app.emptyHint': '让 DSH 按复习内容出题：在对话里说「用 quiz_save_deck 为刚才复习的内容出一套题」，保存后回到这里点「刷新题集」。',
  'app.refreshing': '刷新中…',
  'rail.title': '题集',
  'rail.hint': '出题：在对话里输入 /skill dsh-quiz 主题；卡片右上角 × 可删除题集。',
  'deck.count': '{n} 题',
  'deck.done': '{done}/{n}',
  'deck.remove': '删除题集',
  'deck.removeConfirm': '删除题集「{title}」？题集文件会从磁盘删除，无法恢复。',
  'deck.removeFailed': '删除题集失败',
  'deck.removing': '删除中…',
  'deck.restartRequired': '当前宿主还没有加载删除接口，请重启 DSH 后再试。',
  'quiz.index': '第 {n} 题',
  'quiz.of': '共 {m} 题',
  'quiz.prev': '上一题',
  'quiz.next': '下一题',
  'quiz.reset': '重做本套',
  'quiz.retry': '再试一次',
  'quiz.correct': '回答正确',
  'quiz.wrong': '回答错误',
  'quiz.yourPick': '你的选择',
  'quiz.answerLabel': '正确答案',
  'quiz.pickHint': '选一个选项后，右侧会展开逐步手算与易错点。',
  'quiz.pickHintMulti': '选出所有正确项并提交后，右侧会展开逐步手算与易错点。',
  'quiz.multi': '多选',
  'quiz.multiHint': '多选题：选出所有正确项（已选 {n} 个，至少 2 个）',
  'quiz.submit': '提交答案',
  'quiz.answersLabel': '正确答案（多选）',
  'quiz.keyboardHintMulti': '键盘：A–F 选择/取消，Enter 提交，← / → 切题',
  'quiz.conditions': '条件',
  'app.deckDiagnostics': '题集诊断',
  'quiz.summary': '本套完成：答对 {c}/{n} 题，正确率 {p}%',
  'quiz.notesTab': '速查卡',
  'quiz.asideTab': '本题解析',
  'quiz.keyboardHint': '键盘：A–F 选答案，← / → 切题',
  'aside.empty': '先作答，再看解析。',
  'aside.steps': '手算步骤',
  'aside.formula': '用到的公式',
  'aside.pitfall': '易错点',
  'aside.diagnostics': '选项诊断',
  'aside.notesTitle': '公式速查',
  'aside.notesEmpty': '本题集没有速查卡。',
  'stats.correct': '正确',
  'stats.wrong': '错误',
  'stats.rate': '正确率',
  'common.refresh': '刷新',
}

const en = {
  'panel.label': 'Quiz',
  'app.title': 'Quiz',
  'app.subtitle': 'Turn review context into practice sets; hand-worked solutions on the side.',
  'app.back': 'Back to chat',
  'app.notebook': 'Mistake log',
  'mistakes.title': 'Mistake log',
  'mistakes.sub': 'Wrong answers are collected automatically; a correct retry marks them as fixed.',
  'mistakes.openCount': '{n} open',
  'mistakes.open': 'Open',
  'mistakes.mastered': 'Fixed',
  'mistakes.total': 'Total',
  'mistakes.filter.open': 'Open',
  'mistakes.filter.mastered': 'Fixed',
  'mistakes.filter.all': 'All',
  'mistakes.empty': 'The mistake log is empty',
  'mistakes.emptyHint': 'Questions you answer incorrectly show up here automatically.',
  'mistakes.emptyFiltered': 'Nothing under this filter yet.',
  'mistakes.back': 'Back to practice',
  'mistakes.stats': 'Mistake stats',
  'mistakes.reviewAll': 'Review all open ({n})',
  'mistakes.clearMastered': 'Clear fixed ({n})',
  'mistakes.clearConfirm': 'Clear {n} fixed mistake records?',
  'mistakes.explainTitle': 'How it works',
  'mistakes.explainBody': 'Wrong answers are recorded; Redo clears that question\'s answer, and a correct retry marks it fixed. You can also mark or remove manually.',
  'mistakes.explainHint': '"Review all open" walks through them most recent first; starting it clears those answers but keeps the mistake records.',
  'mistakes.lastWrong': 'Last pick: {pick} · Answer: {answer}',
  'mistakes.wrongTimes': 'Wrong {n}×',
  'mistakes.lastAt': 'Last {time}',
  'mistakes.masteredAt': 'Fixed {time}',
  'mistakes.redo': 'Redo',
  'mistakes.viewSolution': 'Solution',
  'mistakes.markMastered': 'Mark fixed',
  'mistakes.reopen': 'Reopen',
  'mistakes.remove': 'Remove',
  'mistakes.missingDeck': 'The source deck no longer exists.',
  'review.title': 'Mistake review',
  'review.sub': 'Redo recorded mistakes one by one; a correct answer marks it fixed.',
  'review.progress': '{n}/{m}',
  'review.exit': 'Exit review',
  'review.done': 'Review complete: {c}/{n} correct',
  'review.again': 'Another round',
  'review.skip': 'Skip this one',
  'review.autoMaster': 'Correct = fixed',
  'app.refresh': 'Refresh decks',
  'app.loading': 'Loading decks…',
  'app.error': 'Could not load decks',
  'app.retry': 'Retry',
  'app.dismiss': 'Dismiss',
  'markdown.copy': 'Copy code',
  'markdown.copied': 'Copied',
  'markdown.footnotes': 'Footnotes',
  'refresh.failed': 'Could not refresh decks',
  'refresh.retry': 'Retry',
  'refresh.result': 'Refreshed: {total} decks',
  'refresh.added': 'added {n}',
  'refresh.updated': 'updated {n}',
  'refresh.removed': 'removed {n}',
  'refresh.noChange': 'No changes',
  'refresh.lastAt': 'last refresh {time}',
  'app.empty': 'No decks yet',
  'app.emptyHint': 'Ask DSH to build a deck from the current review context: "use quiz_save_deck for the topic we just reviewed", then press Refresh.',
  'app.refreshing': 'Refreshing…',
  'rail.title': 'Decks',
  'rail.hint': 'Generate: send /skill dsh-quiz <topic>; use the × on a deck card to delete it.',
  'deck.count': '{n} questions',
  'deck.done': '{done}/{n}',
  'deck.remove': 'Remove deck',
  'deck.removeConfirm': 'Delete deck "{title}"? The deck file is removed from disk and cannot be restored.',
  'deck.removeFailed': 'Could not remove deck',
  'deck.removing': 'Removing…',
  'deck.restartRequired': 'This host has not loaded the removal endpoint yet. Restart DSH and try again.',
  'quiz.index': 'Question {n}',
  'quiz.of': 'of {m}',
  'quiz.prev': 'Previous',
  'quiz.next': 'Next',
  'quiz.reset': 'Restart deck',
  'quiz.retry': 'Try again',
  'quiz.correct': 'Correct',
  'quiz.wrong': 'Not quite',
  'quiz.yourPick': 'Your pick',
  'quiz.answerLabel': 'Answer',
  'quiz.pickHint': 'Pick an option to unfold the step-by-step work and pitfalls here.',
  'quiz.pickHintMulti': 'Choose every correct option, then submit to unfold the step-by-step work and pitfalls here.',
  'quiz.multi': 'Multi',
  'quiz.multiHint': 'Multi-select: choose every correct option ({n} selected, at least 2)',
  'quiz.submit': 'Submit',
  'quiz.answersLabel': 'Answers',
  'quiz.keyboardHintMulti': 'Keys: A–F toggle, Enter submit, ← / → to move',
  'quiz.conditions': 'Conditions',
  'app.deckDiagnostics': 'Deck diagnostics',
  'quiz.summary': 'Deck complete: {c}/{n} correct, {p}% accuracy',
  'quiz.notesTab': 'Cheat sheet',
  'quiz.asideTab': 'Solution',
  'quiz.keyboardHint': 'Keys: A–F to answer, ← / → to move',
  'aside.empty': 'Answer first, then read the solution.',
  'aside.steps': 'Step by step',
  'aside.formula': 'Formula',
  'aside.pitfall': 'Pitfall',
  'aside.diagnostics': 'Option check',
  'aside.notesTitle': 'Formula cheat sheet',
  'aside.notesEmpty': 'This deck has no cheat sheet.',
  'stats.correct': 'Correct',
  'stats.wrong': 'Wrong',
  'stats.rate': 'Accuracy',
  'common.refresh': 'Refresh',
}

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

/**
 * @module text
 * Tiny display helpers shared by the deck view and the accessible labels.
 *
 * Provides: letterOf.  Requires: nothing.
 */

function letterOf(index) {
  return String.fromCharCode(65 + index)
}

/**
 * @module math
 * LaTeX authoring support for deck prose.
 *
 * Decks are rendered by DSH's KaTeX-backed `MarkdownText`, so the authoring
 * convention is `$...$` (inline) and `$$...$$` (display).  Two helpers live
 * here, both pure and testable without React:
 *
 * - `toLatexMarkdown(text)` normalizes legacy decks: decks written before the
 *   convention used bare `_`/`^` scripts and Unicode math (`Σ`, `μ`, `²`).
 *   Text that already contains a `$` delimiter is returned untouched.  Other
 *   text is scanned for math-looking runs, those runs are converted to LaTeX
 *   commands and wrapped in `$...$`, and Chinese prose between them is left
 *   alone.  Unbalanced braces/commands leave the run as literal text instead
 *   of producing broken math.
 * - `latexPlainText(text)` produces a readable label for `aria-label`, where
 *   `MarkdownText` cannot be used.
 *
 * The renderer itself lives in components.js and only ever calls KaTeX through
 * `MarkdownText`; this module must not grow a second (Unicode) render path.
 */

const GREEK = {
  α: '\\alpha', β: '\\beta', γ: '\\gamma', δ: '\\delta', ε: '\\varepsilon',
  ζ: '\\zeta', η: '\\eta', θ: '\\theta', ι: '\\iota', κ: '\\kappa',
  λ: '\\lambda', μ: '\\mu', ν: '\\nu', ξ: '\\xi', π: '\\pi', ρ: '\\rho',
  σ: '\\sigma', τ: '\\tau', υ: '\\upsilon', φ: '\\varphi', χ: '\\chi',
  ψ: '\\psi', ω: '\\omega',
  Γ: '\\Gamma', Δ: '\\Delta', Θ: '\\Theta', Λ: '\\Lambda', Ξ: '\\Xi',
  Π: '\\Pi', Σ: '\\Sigma', Υ: '\\Upsilon', Φ: '\\Phi', Ψ: '\\Psi', Ω: '\\Omega',
}

const SYMBOLS = {
  '∑': '\\sum', '∏': '\\prod', '∫': '\\int', '∞': '\\infty', '√': '\\sqrt',
  '∈': '\\in', '∉': '\\notin', '×': '\\times', '·': '\\cdot', '⋅': '\\cdot',
  '÷': '\\div', '±': '\\pm', '∓': '\\mp', '≤': '\\le', '≥': '\\ge',
  '≠': '\\ne', '≈': '\\approx', '≡': '\\equiv', '∼': '\\sim', '~': '\\sim',
  '∝': '\\propto', '→': '\\to', '⇒': '\\Rightarrow', '↔': '\\leftrightarrow',
  '∪': '\\cup', '∩': '\\cap', '⊂': '\\subset', '⊆': '\\subseteq',
  '∅': '\\emptyset', '∀': '\\forall', '∃': '\\exists', '¬': '\\neg',
  '∧': '\\wedge', '∨': '\\vee', '∂': '\\partial', '∇': '\\nabla',
  '⌊': '\\lfloor', '⌋': '\\rfloor', '⌈': '\\lceil', '⌉': '\\rceil',
  '⟨': '\\langle', '⟩': '\\rangle', '⋯': '\\cdots', '…': '\\ldots',
  '⊙': '\\odot', '⊗': '\\otimes', '‖': '\\|', '−': '-', '′': "'",
  '½': '\\frac{1}{2}', '⅓': '\\frac{1}{3}', '¼': '\\frac{1}{4}', '¾': '\\frac{3}{4}',
}

const SUPERSCRIPT_DIGITS = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  '⁺': '+', '⁻': '-',
}

const SUBSCRIPT_DIGITS = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₐ': 'a', 'ₑ': 'e', 'ᵢ': 'i', 'ⱼ': 'j', 'ₖ': 'k', 'ₙ': 'n', 'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't',
  'ₓ': 'x', 'ₔ': 'e',
}

const COMBINING = {
  '\u0302': 'hat', '\u0304': 'bar', '\u0305': 'overline', '\u0307': 'dot',
  '\u0308': 'ddot', '\u0303': 'tilde', '\u030C': 'check',
}

const OPERATORS = new Set(['=', '+', '-', '*', '/', '<', '>', '|', '(', ')', '[', ']', '^', '_', '{', '}', ',', ';', ':'])
const OPENERS = new Set(['(', '[', '{', '|'])
const COMMAND_END = /[A-Za-z]/

function isAsciiLetter(ch) {
  return ch !== undefined && /[A-Za-z]/.test(ch)
}

function isDigit(ch) {
  return ch !== undefined && /[0-9]/.test(ch)
}

function isMathSymbol(ch) {
  return ch !== undefined && (Object.prototype.hasOwnProperty.call(GREEK, ch)
    || Object.prototype.hasOwnProperty.call(SYMBOLS, ch)
    || Object.prototype.hasOwnProperty.call(SUPERSCRIPT_DIGITS, ch)
    || Object.prototype.hasOwnProperty.call(SUBSCRIPT_DIGITS, ch)
    || Object.prototype.hasOwnProperty.call(COMBINING, ch))
}

function isOperator(ch) {
  return ch !== undefined && OPERATORS.has(ch)
}

/** Candidate starter: a backslash command, a math symbol, or a word/digit id. */
function startsMath(source, index) {
  const ch = source[index]
  // "·" and "…" are also Chinese separators; they may continue a run but never
  // start one, or "第 3 步 · 2×2" would become "$\cdot 2\times2$".
  if (ch === '·' || ch === '…' || ch === '⋯') return false
  if (ch === '\\') return true
  if (isMathSymbol(ch)) return true

  if (isAsciiLetter(ch)) {
    if (index > 0 && (isAsciiLetter(source[index - 1]) || isDigit(source[index - 1]))) return false
    let end = index
    while (end < source.length && isAsciiLetter(source[end])) end += 1
    const next = source[end]
    if (next === '_' || next === '^' || next === '(' || next === '[' || next === '|' || next === '\\') return true
    if (isDigit(next)) return true
    if (next === ':' && (isAsciiLetter(source[end + 1]) || isDigit(source[end + 1]) || isMathSymbol(source[end + 1]))) return true
    if (next !== undefined && isMathSymbol(next)) return true
    if (next === '-' && !isAsciiLetter(source[end + 1])) return true
    if (next !== undefined && isOperator(next) && next !== ',' && next !== ';' && next !== ':' && next !== '|') return true
    // "MSE = ..." / "min || ...": skip spaces before an operator or symbol
    let spaced = end
    while (spaced < source.length && source[spaced] === ' ') spaced += 1
    if (spaced > end && spaced < source.length) {
      const after = source[spaced]
      if (after === '=' || after === '|' || after === '+' || after === '-' || after === '/'
        || after === '<' || after === '>' || after === '×' || after === '·' || isMathSymbol(after)) return true
    }
    return false
  }

  if (isDigit(ch)) {
    if (index > 0 && (isAsciiLetter(source[index - 1]) || isDigit(source[index - 1]) || source[index - 1] === '.')) return false
    let end = index
    while (end < source.length && isDigit(source[end])) end += 1
    const next = source[end]
    if (next === ',' && isDigit(source[end + 1])) return true
    if (next === '.' && isDigit(source[end + 1])) return true
    if (next === '_' || next === '^' || next === '(' || next === '[') return true
    if (next !== undefined && isMathSymbol(next)) return true
    if (next !== undefined && isOperator(next) && next !== ',' && next !== ';' && next !== ':' && next !== '|') return true
    return false
  }

  return false
}

/** Whether a space at `space` may continue the run (next char is math-ish). */
function spaceContinues(source, space, previous, insideGroup = false) {
  let next = space
  while (next < source.length && source[next] === ' ') next += 1
  if (next >= source.length) return -1
  const ch = source[next]
  if (isDigit(ch) || isMathSymbol(ch) || isOperator(ch)) return next
  // Inside brackets/braces a space before a word is still math: f(x, y), E_q[log p(x)].
  if (isAsciiLetter(ch) && (insideGroup || OPERATORS.has(previous) || isMathSymbol(previous))) return next
  return -1
}

function scanRun(source, start) {
  let end = start
  let parenDepth = 0
  let braceDepth = 0
  while (end < source.length) {
    const ch = source[end]
    if (isAsciiLetter(ch) || isDigit(ch) || ch === '\\' || ch === "'") {
      end += 1
      continue
    }
    if (ch === '{') {
      braceDepth += 1
      end += 1
      continue
    }
    if (ch === '}') {
      braceDepth = Math.max(0, braceDepth - 1)
      end += 1
      continue
    }
    if (isMathSymbol(ch)) {
      end += 1
      continue
    }
    if (ch === '.' && isDigit(source[end - 1]) && isDigit(source[end + 1])) {
      end += 1
      continue
    }
    if (ch === '(' || ch === '[') {
      parenDepth += 1
      end += 1
      continue
    }
    if (ch === ')' || ch === ']') {
      parenDepth = Math.max(0, parenDepth - 1)
      end += 1
      continue
    }
    if (ch === ',' || ch === ';' || ch === ':') {
      const thousands = ch === ',' && isDigit(source[end - 1]) && isDigit(source[end + 1])
      if (parenDepth > 0 || braceDepth > 0 || thousands) {
        end += 1
        continue
      }
      break
    }
    if (ch === '|' || ch === '_' || ch === '^' || ch === '=' || ch === '+' || ch === '*' || ch === '<' || ch === '>') {
      end += 1
      continue
    }
    if (ch === '-') {
      // a hyphenated word ("K-means") is prose, not subtraction
      if (end > start && isAsciiLetter(source[end - 1]) && isAsciiLetter(source[end + 1])) break
      end += 1
      continue
    }
    if (ch === '/') {
      end += 1
      continue
    }
    if (ch === ' ') {
      const next = spaceContinues(source, end, source[end - 1], parenDepth > 0 || braceDepth > 0)
      if (next < 0) break
      end = next
      continue
    }
    break
  }
  return end
}

/** Convert one math run to LaTeX; returns null when it is not safe. */
function runToLatex(source, start, end) {
  let trimmed = end
  while (trimmed > start && /[\s=+\-*/^_,;:(<|]/.test(source[trimmed - 1])) trimmed -= 1
  if (trimmed <= start) return null
  const run = source.slice(start, trimmed)

  let depth = 0
  for (const ch of run) {
    if (ch === '{') depth += 1
    else if (ch === '}') {
      depth -= 1
      if (depth < 0) return null
    }
  }
  if (depth !== 0) return null
  if (/\\$/.test(run)) return null

  let latex = ''
  for (let i = 0; i < run.length; i += 1) {
    const ch = run[i]
    const combining = COMBINING[ch]
    if (combining !== undefined) {
      // attach to the previous single-letter atom: x̂ -> \hat{x}
      const match = /([A-Za-z])$/u.exec(latex)
      if (match) latex = `${latex.slice(0, -1)}\\${combining}{${match[1]}}`
      continue
    }
    if (SUPERSCRIPT_DIGITS[ch] !== undefined) {
      latex += `^${SUPERSCRIPT_DIGITS[ch]}`
      continue
    }
    if (SUBSCRIPT_DIGITS[ch] !== undefined) {
      latex += `_${SUBSCRIPT_DIGITS[ch]}`
      continue
    }
    const command = GREEK[ch] ?? SYMBOLS[ch]
    if (command !== undefined) {
      latex += command
      if (COMMAND_END.test(run[i + 1] ?? '')) latex += ' '
      continue
    }
    latex += ch
  }

  // Normalize `x_i` / `H_out` into `x_{i}` / `H_{out}` so LaTeX groups the
  // whole subscript, and leave already-braced scripts alone.
  latex = latex.replace(/(?<![\\])([_^])(?![{^])([A-Za-z0-9]+)/g, '$1{$2}')

  // A run must carry a math signal; otherwise "note (see)" would become math.
  const hasCore = /[_^\\{}]/.test(latex)
    || /[=+\-*/|<>]/.test(latex)
    || /[0-9]/.test(latex)
    || /[A-Za-z]\(/.test(latex)
  if (!hasCore) return null
  // "·" is also a Chinese list separator; never turn a lone one into $\cdot$.
  if (/^\\cdot$/.test(latex) || /^\\ldots$/.test(latex)) return null
  return { latex, end: trimmed }
}

/**
 * Normalize deck prose to the KaTeX Markdown convention.
 * @param value - authored deck text (LaTeX or legacy Unicode math)
 * @returns Markdown whose math is inside `$...$`
 */
function toLatexMarkdown(value) {
  const source = String(value ?? '')
  if (source.includes('$')) return source
  try {
    let out = ''
    let index = 0
    while (index < source.length) {
      if (!startsMath(source, index)) {
        out += source[index]
        index += 1
        continue
      }
      // Pick up letters/digits glued to a symbol, plus an immediately adjacent
      // opening bracket: "(0,0)" is one atom, not "($0,0)$".
      let start = index
      while (start > 0 && (isAsciiLetter(source[start - 1]) || isDigit(source[start - 1]))) {
        if (out.endsWith('$')) break
        out = out.slice(0, -1)
        start -= 1
      }
      if (start > 0 && (source[start - 1] === '(' || source[start - 1] === '[') && !out.endsWith('$')) {
        out = out.slice(0, -1)
        start -= 1
      }
      let run = runToLatex(source, start, scanRun(source, start))
      if (run !== null && (source[run.end] === ')' || source[run.end] === ']')) {
        const expected = source[run.end] === ')' ? '(' : '['
        if (run.latex.split(expected).length === run.latex.split(expected === '(' ? ')' : ']').length) {
          run = { latex: `${run.latex}${source[run.end]}`, end: run.end + 1 }
        }
      }
      if (run === null) {
        out += source[index]
        index += 1
        continue
      }
      out += `$${run.latex}$`
      index = run.end
    }
    return out
  } catch {
    return source
  }
}

/**
 * Deck text is agent-authored; `MarkdownText` would happily render an HTTP(S)
 * image or link, which would fetch a remote URL from the local UI.  Drop image
 * and link syntax before rendering, keeping only the visible text (the panel's
 * "no external requests" property must survive Markdown support).
 */
function neutralizeMarkdownMedia(value) {
  try {
    return String(value ?? '')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
  } catch {
    return String(value ?? '')
  }
}

/** Escape one user-authored cell for LaTeX text mode. */
function latexEscapeCell(value) {
  let out = ''
  for (const ch of String(value ?? '')) {
    if (ch === '\\') out += '\\textbackslash{}'
    else if ('&%#$_{}'.includes(ch)) out += `\\${ch}`
    else if (ch === '~') out += '\\textasciitilde{}'
    else if (ch === '^') out += '\\textasciicircum{}'
    else out += ch
  }
  return out
}

/** One numeric cell: ASCII digits and minus (KaTeX rejects U+2212). */
function latexCell(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return latexEscapeCell(value)
}

/**
 * Build a KaTeX bmatrix from a rectangular numeric/string matrix.
 * @param matrix - rows of cells (already validated by the Host)
 * @returns LaTeX source without delimiters: `\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`
 */
function matrixToLatex(matrix) {
  const rows = (matrix ?? []).map((row) => row.map(latexCell).join(' & '))
  return `\\begin{bmatrix} ${rows.join(' \\\\ ')} \\end{bmatrix}`
}

/** Plain, accessible view of a matrix: "[1, 2; 3, 4]". */
function matrixToPlain(matrix) {
  const rows = (matrix ?? []).map((row) => row.map((cell) => (
    typeof cell === 'number' && Number.isFinite(cell) ? String(cell) : String(cell ?? '')
  )).join(', '))
  return `[${rows.join('; ')}]`
}

const LATEX_TO_TEXT = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', varepsilon: 'ε', epsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ',
  nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ',
  varphi: 'φ', phi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ',
  Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  sum: 'Σ', prod: 'Π', int: '∫', infty: '∞', in: '∈', notin: '∉', times: '×',
  cdot: '·', div: '÷', pm: '±', mp: '∓', le: '≤', ge: '≥', ne: '≠',
  approx: '≈', equiv: '≡', sim: '∼', propto: '∝', to: '→',
  Rightarrow: '⇒', leftrightarrow: '↔', cup: '∪', cap: '∩', subset: '⊂',
  subseteq: '⊆', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧',
  lor: '∨', partial: '∂', nabla: '∇', lfloor: '⌊', rfloor: '⌋', lceil: '⌈',
  rceil: '⌉', langle: '⟨', rangle: '⟩', cdots: '⋯', ldots: '…', odot: '⊙',
  otimes: '⊗', hat: '', bar: '', overline: '', frac: '/', sqrt: '√',
}

/** Readable plain text for `aria-label` / titles that cannot host Markdown. */
function latexPlainText(value) {
  try {
    return neutralizeMarkdownMedia(toLatexMarkdown(value))
      .replace(/\$\$?/g, '')
      .replace(/\\(?:left|right|big|Big|bigg|Bigg|quad|qquad|,|;|:|!)/g, ' ')
      .replace(/\\([A-Za-z]+)/g, (match, name) => (LATEX_TO_TEXT[name] ?? name))
      .replace(/[{}]/g, '')
      .replace(/[_^]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    return String(value ?? '')
  }
}

/**
 * @module state
 * Pure progress/queue helpers over the persisted shape:
 * `{ deckId, qi, answers, mistakes, tab, view }`.
 *
 * Every function here is pure and side-effect free; the page component owns the
 * React state.
 *
 * Provides: withoutDeckAnswers, withoutDeckMistakes, readStored, MISTAKE_SEP,
 * mistakeKey, splitMistakeKey, normalizeMistakes, resolveQueueItem, mistakeRows,
 * isMultiAnswer, correctIndexes, toPickIndexes, togglePickIndex, isCorrectAnswer, lettersFor,
 * optionState,
 * formatTime, deckFingerprint, diffDecks, refreshSummary, fetchDecks.
 * Requires: STORAGE_KEY (base.js).
 */

function withoutDeckAnswers(answers, deckId) {
  const next = { ...answers }
  delete next[deckId]
  return next
}

function withoutDeckMistakes(mistakes, deckId) {
  const next = {}
  for (const [key, record] of Object.entries(mistakes)) {
    const parts = splitMistakeKey(key)
    if (parts !== null && parts[0] === deckId) continue
    next[key] = record
  }
  return next
}

function readStored() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

const MISTAKE_SEP = '::'

function mistakeKey(deckId, qid) {
  return `${deckId}${MISTAKE_SEP}${qid}`
}

function splitMistakeKey(key) {
  const at = key.indexOf(MISTAKE_SEP)
  if (at <= 0 || at + MISTAKE_SEP.length >= key.length) return null
  return [key.slice(0, at), key.slice(at + MISTAKE_SEP.length)]
}

function normalizeMistakes(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [key, record] of Object.entries(raw)) {
    if (record === null || typeof record !== 'object' || Array.isArray(record)) continue
    const wrong = Number.isFinite(record.wrong) && record.wrong > 0 ? Math.floor(record.wrong) : 1
    const lastAt = Number.isFinite(record.lastAt) ? record.lastAt : Date.now()
    const masteredAt = Number.isFinite(record.masteredAt) ? record.masteredAt : null
    const rawPick = Array.isArray(record.lastPick)
      ? record.lastPick.filter((entry) => Number.isInteger(entry)).sort((left, right) => left - right)
      : record.lastPick
    const lastPick = Array.isArray(rawPick)
      ? (rawPick.length > 0 ? rawPick : null)
      : (Number.isInteger(rawPick) ? rawPick : null)
    out[key] = { wrong, lastAt, masteredAt, lastPick }
  }
  return out
}

/** True for a deck question that carries `answers` instead of `answer`. */
function isMultiAnswer(question) {
  return question !== null && typeof question === 'object' && Array.isArray(question.answers)
}

/** The correct option indexes for either question shape. */
function correctIndexes(question) {
  if (isMultiAnswer(question)) return question.answers
  return question && Number.isInteger(question.answer) ? [question.answer] : []
}

/** Normalize a stored answer (number, array, or junk) to an index list. */
function toPickIndexes(value) {
  if (Array.isArray(value)) return value.filter((entry) => Number.isInteger(entry))
  return Number.isInteger(value) ? [value] : []
}

/** Toggle one index in a sorted multi-select list. */
function togglePickIndex(picks, index) {
  const current = toPickIndexes(picks)
  return current.includes(index)
    ? current.filter((entry) => entry !== index)
    : [...current, index].sort((left, right) => left - right)
}

/** Exact set match: multi-select has no partial credit. */
function isCorrectAnswer(question, value) {
  const correct = [...correctIndexes(question)].sort((left, right) => left - right)
  const picks = [...toPickIndexes(value)].sort((left, right) => left - right)
  if (picks.length !== correct.length) return false
  return picks.every((pick, index) => pick === correct[index])
}

/** "A, C" for a value; used by verdict cards and the mistake log. */
function lettersFor(value) {
  return [...toPickIndexes(value)].sort((left, right) => left - right).map(letterOf).join(', ')
}

/**
 * Visual state of one option after (or before) answering.  `selected` is the
 * pre-submit draft state for multi-select and is handled by the component; this
 * function only describes the graded states.
 */
function optionState(question, picked, index) {
  if (picked === null || picked === undefined) return 'idle'
  if (isMultiAnswer(question)) {
    const picks = new Set(toPickIndexes(picked))
    const correct = new Set(correctIndexes(question))
    if (picks.has(index)) return correct.has(index) ? 'picked-correct' : 'picked-wrong'
    return correct.has(index) ? 'reveal-correct' : 'dim'
  }
  if (picked === question.answer) return index === picked ? 'picked-correct' : 'dim'
  if (index === picked) return 'picked-wrong'
  if (index === question.answer) return 'reveal-correct'
  return 'dim'
}

function resolveQueueItem(decks, item) {
  const deck = decks.find((entry) => entry.id === item.deckId)
  if (!deck) return null
  const question = deck.questions.find((entry) => entry.id === item.qid)
  if (!question) return null
  return { deck, question }
}

function mistakeRows(decks, mistakes) {
  const rows = []
  for (const [key, rec] of Object.entries(mistakes)) {
    const parts = splitMistakeKey(key)
    if (!parts) continue
    const [deckId, qid] = parts
    const deck = decks.find((entry) => entry.id === deckId) ?? null
    const question = deck ? (deck.questions.find((entry) => entry.id === qid) ?? null) : null
    rows.push({ key, deckId, qid, deck, question, rec })
  }
  rows.sort((left, right) => {
    const leftOpen = left.rec.masteredAt === null ? 0 : 1
    const rightOpen = right.rec.masteredAt === null ? 0 : 1
    if (leftOpen !== rightOpen) return leftOpen - rightOpen
    return (right.rec.lastAt || 0) - (left.rec.lastAt || 0)
  })
  return rows
}

function formatTime(ts) {
  if (!Number.isFinite(ts)) return ''
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return ''
  }
}

/**
 * Fingerprint one deck for change detection.  The Host sends whole decks, so a
 * stable JSON string is enough to tell "same deck" from "same id, new content"
 * (a `quiz_save_deck` overwrite) without a version field.
 */
function deckFingerprint(deck) {
  return JSON.stringify(deck)
}

/**
 * Compare two deck lists by id + content.
 * @returns {{added: string[], updated: string[], removed: string[]}}
 */
function diffDecks(previous, next) {
  const before = new Map((previous ?? []).map((deck) => [deck.id, deckFingerprint(deck)]))
  const after = new Map((next ?? []).map((deck) => [deck.id, deckFingerprint(deck)]))
  const added = [...after.keys()].filter((id) => !before.has(id))
  const updated = [...after.keys()].filter((id) => before.has(id) && before.get(id) !== after.get(id))
  const removed = [...before.keys()].filter((id) => !after.has(id))
  return { added, updated, removed }
}

/** What the refresh status line reports: totals plus the delta since last load. */
function refreshSummary(previous, next, at = Date.now()) {
  const diff = diffDecks(previous, next)
  const list = next ?? []
  return {
    at,
    total: list.length,
    userCount: list.length,
    added: diff.added,
    updated: diff.updated,
    removed: diff.removed,
    changed: diff.added.length + diff.updated.length + diff.removed.length,
  }
}

async function fetchDecks(signal) {
  const response = await fetch(`${ENDPOINT}?ts=${Date.now()}`, {
    signal,
    headers: { accept: 'application/json' },
    cache: 'no-store',
    credentials: 'same-origin',
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  if (data === null || typeof data !== 'object' || !Array.isArray(data.decks)) {
    throw new Error('unexpected payload')
  }
  return data
}
window.__ModuleLoader__.load({
  id: 'dsh-quiz-tutorial',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useCallback, useEffect, useMemo, useRef, useState } = React

/**
 * @module components
 * Presentational pieces of the practice page: icons, matrix rendering, option
 * buttons, the solution/aside cards, step blocks and the notes panel.  Deck
 * prose goes through `MathText` so authored math renders instead of leaking
 * `_{...}` into the UI.
 *
 * Provides: MarkdownText, markdownLabels, MathText, GridIcon, CheckIcon,
 * CrossIcon, RefreshIcon, ChevronIcon, MatrixView, Inputs, OptionButton,
 * optionState, AnswerValue, VerdictCard, StepBlock, Solution, Notes.
 * Requires: h, React hooks (factory prologue); toLatexMarkdown/latexPlainText
 * (math.js); letterOf (text.js).
 */

    /**
     * DSH's KaTeX-backed Markdown primitive.  The module table provides it on
     * every dsh web build; outside one (unit tests, an older host) the guarded
     * require leaves it null and `MathText` falls back to plain text instead of
     * crashing the panel.
     */
    let MarkdownText = null
    try {
      MarkdownText = require('@deepseek-ai/dsh-client-ui-primitives').MarkdownText ?? null
    } catch {
      MarkdownText = null
    }

    /** Localized chrome `MarkdownText` requires (code-fence copy + footnotes). */
    function markdownLabels(t) {
      return {
        code: { copyLabel: t('markdown.copy'), copiedLabel: t('markdown.copied') },
        footnotes: t('markdown.footnotes'),
      }
    }

    /**
     * Deck prose rendered as KaTeX Markdown.  Legacy decks (bare `_`/`^`,
     * Unicode math) are normalized to `$...$` first; the only render path is
     * `MarkdownText`, never raw HTML.
     */
    function MathText({ text, t, inline }) {
      const source = neutralizeMarkdownMedia(toLatexMarkdown(text))
      const labels = useMemo(() => markdownLabels(t), [t])
      const className = `dshq-md${inline ? ' is-inline' : ''}`
      if (MarkdownText === null) {
        return h('div', { className: `${className} is-fallback` }, source)
      }
      return h('div', { className },
        h(MarkdownText, { text: source, labels, variant: 'compact' }))
    }

    function GridIcon({ size = 20 }) {
      const cells = [[2.5, 2.5], [13.5, 2.5], [2.5, 13.5], [13.5, 13.5]]
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, focusable: false,
      }, cells.map(([x, y], index) => h('rect', {
        key: index, x, y, width: 8, height: 8, rx: 2.2,
        fill: 'currentColor', opacity: index === 3 ? 0.45 : 1,
      })))
    }

    function CheckIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M3 8.5 6.4 12 13 4.5', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    function CrossIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' }))
    }

    function RefreshIcon({ size = 14 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', {
          d: 'M13 8a5 5 0 1 1-1.6-3.7M13 2.5V6H9.5',
          stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round',
        }))
    }

    function ChevronIcon({ direction = 'right', size = 14 }) {
      const path = direction === 'left' ? 'M10 3 5 8l5 5' : 'M6 3l5 5-5 5'
      return h('svg', { width: size, height: size, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true },
        h('path', { d: path, stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }))
    }

    /**
     * A matrix is LaTeX now: KaTeX draws the brackets and aligns the cells.
     * `aria-label` carries the plain value because KaTeX's HTML is visual only.
     */
    function MatrixView({ matrix, label, small, t, display }) {
      const latex = matrixToLatex(matrix)
      const source = display === true ? `$$${latex}$$` : `$${latex}$`
      return h('div', { className: `dshq-matrix-block${small ? ' is-small' : ''}` },
        label
          ? h('div', { className: 'dshq-matrix-label' }, h(MathText, { text: label, t, inline: true }))
          : null,
        h('div', {
          className: 'dshq-matrix-math',
          role: 'img',
          'aria-label': `矩阵 ${matrixToPlain(matrix)}`,
        }, h(MathText, { text: source, t, inline: display !== true })))
    }

    function Inputs({ inputs, t }) {
      return h('div', { className: 'dshq-inputs' }, inputs.map((input, index) => {
        if (Array.isArray(input.matrix)) {
          return h(MatrixView, {
            key: index, matrix: input.matrix, label: input.label, t, display: true,
          })
        }
        return h('div', { key: index, className: 'dshq-scalar' },
          h('div', { className: 'dshq-matrix-label' }, h(MathText, { text: input.label, t, inline: true })),
          h('div', { className: 'dshq-scalar-value' }, h(MathText, {
            text: `$= ${latexCell(input.scalar)}$`, t, inline: true,
          })))
      }))
    }

    function OptionButton({ option, index, state, selected, multi, disabled, onPick, t }) {
      const classes = ['dshq-option']
      if (option.kind === 'text') classes.push('is-text')
      if (selected) classes.push('is-selected')
      if (state === 'picked-correct') classes.push('is-picked-correct')
      else if (state === 'picked-wrong') classes.push('is-picked-wrong')
      else if (state === 'reveal-correct') classes.push('is-reveal-correct')
      else if (state === 'dim') classes.push('is-dim')
      const mark = state === 'picked-correct' || state === 'reveal-correct'
        ? h('span', { className: 'dshq-opt-mark is-good' }, h(CheckIcon))
        : state === 'picked-wrong'
          ? h('span', { className: 'dshq-opt-mark is-bad' }, h(CrossIcon))
          : null
      const description = option.kind === 'matrix'
        ? `矩阵 ${matrixToPlain(option.matrix)}`
        : latexPlainText(option.text)
      return h('button', {
        type: 'button',
        className: classes.join(' '),
        onClick: () => onPick(index),
        disabled,
        'aria-pressed': selected || state === 'picked-correct' || state === 'picked-wrong'
          ? true
          : (multi ? false : undefined),
        'aria-label': `${letterOf(index)}. ${description}`,
      },
      h('span', { className: 'dshq-opt-letter', 'aria-hidden': true }, letterOf(index)),
      h('div', { className: 'dshq-opt-body' }, option.kind === 'matrix'
        ? h(MatrixView, { matrix: option.matrix, small: true, t })
        : h('div', { className: 'dshq-opt-value' }, h(MathText, { text: option.text, t }))),
      mark)
    }

    function AnswerValue({ option, index, good, t }) {
      const letter = letterOf(index)
      const chipClass = `dshq-chip-letter${good ? ' is-good' : ' is-bad'}`
      return h('div', { className: 'dshq-pick-value' },
        h('span', { className: chipClass }, letter),
        option.kind === 'matrix'
          ? h(MatrixView, { matrix: option.matrix, small: true, t })
          : h('div', { className: 'dshq-pick-text' }, h(MathText, { text: option.text, t })))
    }

    function VerdictCard({ question, picked, t, onRetry }) {
      const good = isCorrectAnswer(question, picked)
      const correct = correctIndexes(question)
      const pickedIndexes = toPickIndexes(picked)
      return h('div', { className: 'dshq-card' },
        h('div', { className: `dshq-verdict${good ? ' is-good' : ' is-bad'}`, style: { width: '100%' } },
          good ? h(CheckIcon, { size: 15 }) : h(CrossIcon, { size: 15 }),
          h('span', null, good ? t('quiz.correct') : t('quiz.wrong')),
          h('button', {
            type: 'button', className: 'dshq-button', style: { marginLeft: 'auto' },
            onClick: onRetry,
          }, t('quiz.retry'))),
        h('div', { className: 'dshq-answer-row' },
          h('div', { className: 'dshq-pick' },
            h('div', { className: 'dshq-pick-label' }, t(Array.isArray(question.answers) ? 'quiz.answersLabel' : 'quiz.answerLabel')),
            correct.map((index) => question.options[index]
              ? h(AnswerValue, { key: `answer-${index}`, option: question.options[index], index, good: true, t })
              : null)),
          !good
            ? h('div', { className: 'dshq-pick' },
              h('div', { className: 'dshq-pick-label' }, t('quiz.yourPick')),
              pickedIndexes.map((index) => question.options[index]
                ? h(AnswerValue, { key: `pick-${index}`, option: question.options[index], index, good: correct.includes(index), t })
                : null))
            : null))
    }

    function StepBlock({ step, t }) {
      return h('div', { className: 'dshq-step' },
        h('div', { className: 'dshq-step-title', role: 'heading', 'aria-level': 4 },
          h(MathText, { text: step.title, t })),
        h('div', { className: 'dshq-step-body' }, h(MathText, { text: step.body, t })),
        Array.isArray(step.matrices) && step.matrices.length > 0
          ? h('div', { className: 'dshq-step-matrices' }, step.matrices.map((entry, index) => h(MatrixView, {
            key: index, matrix: entry.matrix, label: entry.label, small: true, t,
          })))
          : null)
    }

    function Solution({ question, picked, t, onRetry }) {
      if (picked === null || picked === undefined) {
        return h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-verdict' }, h(GridIcon, { size: 15 }), h('span', null, t('aside.empty'))),
          question.formula ? h('div', { style: { marginTop: '10px' } },
            h('div', { className: 'dshq-section-title' }, t('aside.formula')),
            h('div', { className: 'dshq-formula' }, h(MathText, { text: question.formula, t }))) : null,
          h('p', { className: 'dshq-hint', style: { margin: '10px 0 0' } }, t(Array.isArray(question.answers) ? 'quiz.pickHintMulti' : 'quiz.pickHint')))
      }
      const correct = correctIndexes(question)
      const pickedIndexes = toPickIndexes(picked)
      const diagnostics = question.options
        .map((option, index) => ({ option, index }))
        .filter((entry) => !correct.includes(entry.index) && entry.option.note)
      return h(React.Fragment, null,
        h(VerdictCard, { question, picked, t, onRetry }),
        question.formula ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.formula')),
          h('div', { className: 'dshq-formula' }, h(MathText, { text: question.formula, t }))) : null,
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.steps')),
          question.steps.map((step, index) => h(StepBlock, { key: index, step, t }))),
        question.pitfall ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.pitfall')),
          h('div', { className: 'dshq-step-body' }, h(MathText, { text: question.pitfall, t }))) : null,
        diagnostics.length > 0 ? h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('aside.diagnostics')),
          h('div', { className: 'dshq-diagnostics' }, diagnostics.map((entry) => h('div', {
            key: entry.index,
            className: `dshq-diagnostic${pickedIndexes.includes(entry.index) ? ' is-picked' : ''}`,
          },
          h('span', { className: 'dshq-chip-letter' }, letterOf(entry.index)),
          h('div', { className: 'dshq-diagnostic-note' }, h(MathText, { text: entry.option.note, t })))))) : null)
    }

    function Notes({ notes, t }) {
      if (!notes || notes.length === 0) {
        return h('div', { className: 'dshq-empty' }, h('h2', null, t('aside.notesTitle')), h('p', null, t('aside.notesEmpty')))
      }
      return h(React.Fragment, null, notes.map((note, index) => h('div', { key: index, className: 'dshq-card dshq-note-card' },
        h('div', { className: 'dshq-note-title', role: 'heading', 'aria-level': 3 },
          h(MathText, { text: note.title, t })),
        h('div', { className: 'dshq-note-body' }, h(MathText, { text: note.body, t })))))
    }

/**
 * @module notebook
 * The mistake log: one card per recorded mistake, the notebook body with its
 * filters, and the aside with the review-all action.
 *
 * Provides: NotebookIcon, scoreChip, statBox, MistakeCard, NotebookMain,
 * NotebookAside.
 * Requires: h (factory prologue), MathText (components.js), letterOf/text.js,
 * formatTime/state.js.
 */

    function NotebookIcon({ size = 16 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, focusable: false,
      },
      h('path', {
        d: 'M6.5 4.5A1.5 1.5 0 0 1 8 3h9.5v17l-5.5-3.2L6.5 20V4.5Z',
        stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round',
      }))
    }

    function scoreChip(key, className, icon, label) {
      return h('span', { key, className: `dshq-score-chip${className ? ` ${className}` : ''}` }, icon, label)
    }

    function statBox(key, value, label, kind) {
      return h('div', { key, className: `dshq-stat${kind ? ` is-${kind}` : ''}` },
        h('div', { className: 'dshq-stat-value' }, String(value)),
        h('div', { className: 'dshq-stat-label' }, label))
    }

    function MistakeCard({ row, t, onView, onRedo, onToggle, onRemove }) {
      const { question, deck, rec } = row
      const mastered = rec.masteredAt !== null
      const lastPick = rec.lastPick
      const hasPick = lastPick !== null && lastPick !== undefined
      const answerText = lettersFor(correctIndexes(question))
      return h('article', { className: 'dshq-mistake' },
        h('div', { className: 'dshq-mistake-top' },
          question && question.level
            ? h('div', { className: 'dshq-tag' }, h(MathText, { text: question.level, t, inline: true }))
            : null,
          h('div', { className: 'dshq-mistake-deck' },
            h(MathText, { text: deck ? deck.title : row.deckId, t, inline: true })),
          question && question.topic
            ? h('div', { className: 'dshq-mistake-topic' }, h(MathText, { text: question.topic, t, inline: true }))
            : null,
          h('span', { className: 'dshq-mistake-badge' }, t('mistakes.wrongTimes', { n: rec.wrong || 1 })),
          mastered ? h('span', { className: 'dshq-mistake-done' }, t('mistakes.filter.mastered')) : null),
        question
          ? h('div', { className: 'dshq-mistake-prompt' }, h(MathText, { text: question.prompt, t }))
          : h('p', { className: 'dshq-mistake-prompt' }, t('mistakes.missingDeck')),
        question
          ? h('div', { className: 'dshq-mistake-meta' },
            hasPick
              ? h('span', null, t('mistakes.lastWrong', { pick: lettersFor(lastPick), answer: answerText }))
              : h('span', null, `${t('quiz.answerLabel')} ${answerText}`),
            h('span', null, t('mistakes.lastAt', { time: formatTime(rec.lastAt) })),
            mastered ? h('span', null, t('mistakes.masteredAt', { time: formatTime(rec.masteredAt) })) : null)
          : null,
        h('div', { className: 'dshq-mistake-actions' },
          question
            ? h('button', { type: 'button', className: 'dshq-button', onClick: () => onView(row) }, t('mistakes.viewSolution'))
            : null,
          question
            ? h('button', { type: 'button', className: 'dshq-button is-primary', onClick: () => onRedo(row) }, t('mistakes.redo'))
            : null,
          question
            ? h('button', { type: 'button', className: 'dshq-button', onClick: () => onToggle(row) },
              mastered ? t('mistakes.reopen') : t('mistakes.markMastered'))
            : null,
          h('button', { type: 'button', className: 'dshq-button', onClick: () => onRemove(row) }, t('mistakes.remove'))))
    }

    function NotebookMain({ rows, filter, setFilter, counts, t, onBack, onView, onRedo, onToggle, onRemove }) {
      const filtered = rows.filter((row) => (filter === 'all'
        ? true
        : filter === 'mastered'
          ? row.rec.masteredAt !== null
          : row.rec.masteredAt === null))
      const filters = [
        ['open', t('mistakes.filter.open'), counts.open],
        ['mastered', t('mistakes.filter.mastered'), counts.mastered],
        ['all', t('mistakes.filter.all'), counts.total],
      ]
      return h('div', { className: 'dshq-notebook' },
        h('div', { className: 'dshq-notebook-head' },
          h('div', null,
            h('h2', { className: 'dshq-notebook-title' }, t('mistakes.title')),
            h('p', { className: 'dshq-notebook-sub' }, t('mistakes.sub'))),
          h('button', { type: 'button', className: 'dshq-button', onClick: onBack },
            h(ChevronIcon, { direction: 'left' }), t('mistakes.back'))),
        h('div', { className: 'dshq-filters' }, filters.map(([key, label, count]) => h('button', {
          key,
          type: 'button',
          className: `dshq-filter${filter === key ? ' is-active' : ''}`,
          onClick: () => setFilter(key),
        }, `${label} ${count}`))),
        rows.length === 0
          ? h('div', { className: 'dshq-empty', style: { padding: '36px 16px' } },
            h(NotebookIcon, { size: 26 }),
            h('h2', null, t('mistakes.empty')),
            h('p', null, t('mistakes.emptyHint')))
          : filtered.length === 0
            ? h('div', { className: 'dshq-empty', style: { padding: '36px 16px' } },
              h('p', null, t('mistakes.emptyFiltered')))
            : h('div', { className: 'dshq-mistake-list' },
              filtered.map((row) => h(MistakeCard, { key: row.key, row, t, onView, onRedo, onToggle, onRemove }))))
    }

    function NotebookAside({ counts, t, onReviewAll, onClearMastered }) {
      return h('div', { className: 'dshq-aside-body' },
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('mistakes.stats')),
          h('div', { className: 'dshq-mistake-stats' },
            statBox('open', counts.open, t('mistakes.open'), 'open'),
            statBox('mastered', counts.mastered, t('mistakes.mastered'), 'done'),
            statBox('total', counts.total, t('mistakes.total'))),
          h('button', {
            type: 'button',
            className: 'dshq-button is-primary',
            style: { width: '100%', justifyContent: 'center' },
            disabled: counts.openResolved === 0,
            onClick: onReviewAll,
          }, h(NotebookIcon, { size: 14 }), t('mistakes.reviewAll', { n: counts.openResolved })),
          h('button', {
            type: 'button',
            className: 'dshq-button',
            style: { width: '100%', justifyContent: 'center', marginTop: '8px' },
            disabled: counts.mastered === 0,
            onClick: onClearMastered,
          }, t('mistakes.clearMastered', { n: counts.mastered }))),
        h('div', { className: 'dshq-card' },
          h('div', { className: 'dshq-section-title' }, t('mistakes.explainTitle')),
          h('p', { className: 'dshq-step-body' }, t('mistakes.explainBody'))),
        h('div', { className: 'dshq-kbd-hint' },
          h('span', { className: 'dshq-hint' }, t('mistakes.explainHint'))))
    }

/**
 * @module page
 * The full-page practice surface: deck rail, question card, answer aside, the
 * review queue, keyboard handling, and all persisted progress.  This is the
 * only stateful component in the plugin.
 *
 * Provides: QuizPage.
 * Requires: h + React hooks (factory prologue); every other module.
 */

    function QuizPage(props) {
      const { t, onBack } = props
      const [initial] = useState(readStored)
      const [snapshot, setSnapshot] = useState({ status: 'loading', decks: [], errors: [] })
      const [deckId, setDeckId] = useState(() => (typeof initial?.deckId === 'string' ? initial.deckId : null))
      const [qi, setQi] = useState(() => (Number.isInteger(initial?.qi) && initial.qi >= 0 ? initial.qi : 0))
      const [answers, setAnswers] = useState(() => (initial?.answers && typeof initial.answers === 'object' ? initial.answers : {}))
      const [draft, setDraft] = useState({ key: null, picks: [] })
      const [mistakes, setMistakes] = useState(() => normalizeMistakes(initial?.mistakes))
      const [tab, setTab] = useState(() => (initial?.tab === 'notes' ? 'notes' : 'quiz'))
      const [view, setView] = useState(() => (initial?.view === 'mistakes' ? 'mistakes' : 'practice'))
      const [filter, setFilter] = useState('open')
      const [queue, setQueue] = useState(null)
      const [refreshing, setRefreshing] = useState(false)
      const [removing, setRemoving] = useState(null)
      const [actionError, setActionError] = useState(null)
      const [refreshReport, setRefreshReport] = useState(null)
      const [lastRefreshAt, setLastRefreshAt] = useState(null)
      const mainRef = useRef(null)
      const asideRef = useRef(null)
      // Last loaded deck list, so a refresh can report what actually changed
      // without reading state inside an updater.
      const decksRef = useRef([])

      const load = useCallback(async (signal, options = {}) => {
        const announce = options.announce === true
        setRefreshing(true)
        try {
          const data = await fetchDecks(signal)
          const ordered = [...data.decks].sort((left, right) => String(left.id).localeCompare(String(right.id)))
          const report = refreshSummary(decksRef.current, ordered)
          decksRef.current = ordered
          setSnapshot({ status: 'ready', decks: ordered, errors: Array.isArray(data.errors) ? data.errors : [] })
          setLastRefreshAt(report.at)
          if (announce) setRefreshReport(report)
          if (Array.isArray(data.errors) && data.errors.length === 0) setActionError(null)
        } catch (error) {
          if (error && error.name === 'AbortError') return
          const message = error instanceof Error ? error.message : String(error)
          setSnapshot((previous) => (previous.decks.length > 0
            ? { ...previous, errors: [message] }
            : { status: 'error', decks: [], errors: [message], message }))
          if (announce) setActionError(`${t('refresh.failed')}: ${message}`)
        } finally {
          setRefreshing(false)
        }
      }, [t])

      useEffect(() => {
        const controller = new AbortController()
        load(controller.signal)
        return () => controller.abort()
      }, [load])

      useEffect(() => {
        decksRef.current = snapshot.decks
      }, [snapshot.decks])

      // The success line is transient; the "last refreshed" time stays visible.
      useEffect(() => {
        if (refreshReport === null) return undefined
        const timer = setTimeout(() => setRefreshReport(null), 6000)
        return () => clearTimeout(timer)
      }, [refreshReport])

      const decks = snapshot.decks
      const currentDeck = useMemo(() => {
        if (decks.length === 0) return null
        return decks.find((deck) => deck.id === deckId) ?? decks[0]
      }, [decks, deckId])

      useEffect(() => {
        if (!currentDeck) return
        if (currentDeck.id !== deckId) setDeckId(currentDeck.id)
        if (qi >= currentDeck.questions.length) setQi(0)
      }, [currentDeck, deckId, qi])

      useEffect(() => {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
            v: 2, deckId, qi, answers, mistakes, tab, view,
          }))
        } catch {
          /* storage may be unavailable */
        }
      }, [deckId, qi, answers, mistakes, tab, view])

      const rows = useMemo(() => mistakeRows(decks, mistakes), [decks, mistakes])
      const counts = useMemo(() => {
        let open = 0
        let mastered = 0
        let openResolved = 0
        for (const row of rows) {
          if (row.rec.masteredAt === null) {
            open += 1
            if (row.question) openResolved += 1
          } else {
            mastered += 1
          }
        }
        return { open, mastered, openResolved, total: rows.length }
      }, [rows])

      const queueItems = queue ? queue.items : []
      const queueItem = queue && queueItems.length > 0
        ? queueItems[Math.min(queue.index, queueItems.length - 1)]
        : null
      const queueResolved = queueItem ? resolveQueueItem(decks, queueItem) : null
      const practiceDeck = queue ? (queueResolved ? queueResolved.deck : null) : currentDeck
      const question = queue
        ? (queueResolved ? queueResolved.question : null)
        : (currentDeck && currentDeck.questions.length > 0
          ? currentDeck.questions[Math.min(qi, currentDeck.questions.length - 1)]
          : null)
      const displayIndex = queue ? queue.index : qi
      const displayTotal = queue ? queueItems.length : (currentDeck ? currentDeck.questions.length : 0)
      const deckAnswers = currentDeck ? (answers[currentDeck.id] ?? {}) : {}
      const activeAnswers = practiceDeck ? (answers[practiceDeck.id] ?? {}) : {}
      const picked = question && activeAnswers[question.id] !== undefined ? activeAnswers[question.id] : null
      const multi = question ? isMultiAnswer(question) : false
      const questionKey = question && practiceDeck ? `${practiceDeck.id}::${question.id}` : null
      const draftPicks = multi && picked === null && draft.key === questionKey ? draft.picks : []

      const deckStats = currentDeck
        ? currentDeck.questions.reduce((stats, item) => {
          const value = deckAnswers[item.id]
          if (value !== undefined) {
            stats.answered += 1
            if (isCorrectAnswer(item, value)) stats.correct += 1
          }
          return stats
        }, { answered: 0, correct: 0 })
        : { answered: 0, correct: 0 }

      const queueStats = queue
        ? queue.items.reduce((stats, item) => {
          const resolved = resolveQueueItem(decks, item)
          if (!resolved) return stats
          const value = answers[resolved.deck.id]?.[item.qid]
          if (value === undefined) return stats
          stats.answered += 1
          if (isCorrectAnswer(resolved.question, value)) stats.correct += 1
          return stats
        }, { answered: 0, correct: 0 })
        : null

      const headerMode = view === 'mistakes' ? 'notebook' : queue ? 'review' : 'practice'
      const activeAnswered = headerMode === 'review' ? queueStats.answered : deckStats.answered
      const activeCorrect = headerMode === 'review' ? queueStats.correct : deckStats.correct
      const activeWrong = activeAnswered - activeCorrect
      const activeAccuracy = activeAnswered > 0 ? Math.round((activeCorrect / activeAnswered) * 100) : 0
      const answeredCount = headerMode === 'review'
        ? queueStats.answered
        : headerMode === 'notebook'
          ? counts.open + counts.mastered
          : deckStats.answered
      const correctCount = headerMode === 'review'
        ? queueStats.correct
        : headerMode === 'notebook'
          ? counts.mastered
          : deckStats.correct
      const accuracy = activeAnswered > 0 ? activeAccuracy : 0
      const allDone = displayTotal > 0 && answeredCount >= displayTotal && headerMode !== 'notebook'

      function recordAnswer(deck, item, value) {
        const stored = Array.isArray(value)
          ? [...value].sort((left, right) => left - right)
          : value
        setAnswers((previous) => {
          const deckState = { ...(previous[deck.id] ?? {}) }
          deckState[item.id] = stored
          return { ...previous, [deck.id]: deckState }
        })
        setMistakes((previous) => {
          const key = mistakeKey(deck.id, item.id)
          const current = previous[key]
          if (!isCorrectAnswer(item, stored)) {
            return {
              ...previous,
              [key]: {
                wrong: (current?.wrong ?? 0) + 1,
                lastAt: Date.now(),
                masteredAt: null,
                lastPick: stored,
              },
            }
          }
          if (current && current.masteredAt === null) {
            return { ...previous, [key]: { ...current, masteredAt: Date.now() } }
          }
          return previous
        })
      }

      function pick(index) {
        if (!question || !practiceDeck || picked !== null) return
        if (multi) {
          setDraft((previous) => {
            const base = previous.key === questionKey ? previous.picks : []
            return { key: questionKey, picks: togglePickIndex(base, index) }
          })
          return
        }
        recordAnswer(practiceDeck, question, index)
      }

      function submitPicks() {
        if (!multi || picked !== null || draftPicks.length < 2) return
        if (!practiceDeck || !question) return
        recordAnswer(practiceDeck, question, draftPicks)
      }

      function retryQuestion() {
        if (!practiceDeck || !question) return
        setDraft({ key: null, picks: [] })
        setAnswers((previous) => {
          const deckState = { ...(previous[practiceDeck.id] ?? {}) }
          delete deckState[question.id]
          return { ...previous, [practiceDeck.id]: deckState }
        })
        setTab('quiz')
      }

      function selectDeck(id) {
        setDraft({ key: null, picks: [] })
        setDeckId(id)
        setQi(0)
        setQueue(null)
        setView('practice')
        setTab('quiz')
      }

      function navigateTo(next) {
        if (queue) {
          setQueue((previous) => (previous
            ? { ...previous, index: Math.max(0, Math.min(previous.items.length - 1, next)) }
            : previous))
          return
        }
        if (!currentDeck) return
        setQi(Math.max(0, Math.min(currentDeck.questions.length - 1, next)))
      }

      function resetDeck() {
        if (!currentDeck) return
        setDraft({ key: null, picks: [] })
        setAnswers((previous) => ({ ...previous, [currentDeck.id]: {} }))
        setQi(0)
        setTab('quiz')
      }

      function startReview() {
        const target = rows.filter((row) => row.question && row.rec.masteredAt === null)
        if (target.length === 0) return
        setDraft({ key: null, picks: [] })
        setAnswers((previous) => {
          const next = { ...previous }
          for (const row of target) {
            const deckState = { ...(next[row.deckId] ?? {}) }
            delete deckState[row.qid]
            next[row.deckId] = deckState
          }
          return next
        })
        setQueue({ items: target.map((row) => ({ deckId: row.deckId, qid: row.qid })), index: 0 })
        setView('practice')
        setTab('quiz')
      }

      function exitReview() {
        setQueue(null)
        setView('mistakes')
      }

      function openRow(row, redo) {
        if (!row.deck || !row.question) return
        setDraft({ key: null, picks: [] })
        if (redo) {
          setAnswers((previous) => {
            const deckState = { ...(previous[row.deckId] ?? {}) }
            delete deckState[row.qid]
            return { ...previous, [row.deckId]: deckState }
          })
        }
        const index = row.deck.questions.findIndex((item) => item.id === row.qid)
        setDeckId(row.deckId)
        setQi(index >= 0 ? index : 0)
        setQueue(null)
        setView('practice')
        setTab('quiz')
      }

      function toggleMastered(row) {
        setMistakes((previous) => {
          const current = previous[row.key]
          if (!current) return previous
          return {
            ...previous,
            [row.key]: { ...current, masteredAt: current.masteredAt === null ? Date.now() : null },
          }
        })
      }

      function removeMistake(row) {
        setMistakes((previous) => {
          if (previous[row.key] === undefined) return previous
          const next = { ...previous }
          delete next[row.key]
          return next
        })
      }

      function clearMastered() {
        if (counts.mastered === 0) return
        try {
          if (typeof window.confirm !== 'function') return
          if (!window.confirm(t('mistakes.clearConfirm', { n: counts.mastered }))) return
        } catch {
          return
        }
        setMistakes((previous) => {
          const next = {}
          for (const [key, record] of Object.entries(previous)) {
            if (record.masteredAt === null) next[key] = record
          }
          return next
        })
      }

      function skipQueue() {
        if (!queue) return
        navigateTo(Math.min(queue.index + 1, queue.items.length - 1))
      }

      const refresh = () => { load(undefined, { announce: true }) }

      async function removeDeck(deck) {
        if (!deck || removing !== null) return
        let confirmed = false
        try {
          if (typeof window.confirm === 'function') confirmed = window.confirm(t('deck.removeConfirm', { title: deck.title }))
        } catch {
          confirmed = false
        }
        if (!confirmed) return
        setRemoving(deck.id)
        try {
          const response = await fetch(DELETE_ENDPOINT, {
            method: 'POST',
            headers: { 'content-type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({ id: deck.id }),
            credentials: 'same-origin',
          })
          const data = await response.json().catch(() => ({}))
          if (!response.ok || data?.ok !== true) {
            // 405 (or a body-less 404) means an older Host without the route;
            // any other 404 carries the Host's own "deck not found" message.
            if (response.status === 405 || (response.status === 404 && !data?.message)) {
              throw new Error(t('deck.restartRequired'))
            }
            throw new Error(data?.message || data?.error || `HTTP ${response.status}`)
          }
          // The deck's answers and mistakes belong to that deck.
          setAnswers((previous) => withoutDeckAnswers(previous, deck.id))
          setMistakes((previous) => withoutDeckMistakes(previous, deck.id))
          await load()
          setDeckId((previous) => (previous === deck.id ? null : previous))
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          setSnapshot((previous) => ({ ...previous, errors: [`${t('deck.removeFailed')}: ${message}`] }))
          setActionError(`${t('deck.removeFailed')}: ${message}`)
        } finally {
          setRemoving(null)
        }
      }

      useEffect(() => {
        setDraft({ key: questionKey, picks: [] })
      }, [questionKey, picked])

      useEffect(() => {
        const main = mainRef.current
        const aside = asideRef.current
        if (main) main.scrollTop = 0
        if (aside) aside.scrollTop = 0
      }, [displayIndex, practiceDeck?.id, tab, view])

      useEffect(() => {
        function onKeyDown(event) {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
          const target = event.target
          if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
            || target.tagName === 'SELECT' || target.isContentEditable)) return
          if (view !== 'practice' || !question) return
          const key = event.key
          if (key === 'ArrowLeft') {
            event.preventDefault()
            navigateTo(displayIndex - 1)
            return
          }
          if (key === 'ArrowRight') {
            event.preventDefault()
            navigateTo(displayIndex + 1)
            return
          }
          if (multi && picked === null && key === 'Enter') {
            if (draftPicks.length >= 2) {
              event.preventDefault()
              submitPicks()
            }
            return
          }
          const lower = key.toLowerCase()
          let index = -1
          if (lower.length === 1 && lower >= 'a' && lower <= 'f') index = lower.charCodeAt(0) - 97
          else if (lower.length === 1 && lower >= '1' && lower <= '6') index = Number(lower) - 1
          if (index < 0 || index >= question.options.length) return
          if (picked !== null) return
          event.preventDefault()
          pick(index)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      })

      const headerTitle = headerMode === 'notebook'
        ? t('mistakes.title')
        : headerMode === 'review'
          ? t('review.title')
          : currentDeck
            ? currentDeck.title
            : t('app.title')
      const headerKicker = headerMode === 'notebook'
        ? `${t('app.title')} · ${t('app.notebook')}`
        : headerMode === 'review'
          ? `${t('app.title')} · ${t('review.title')}`
          : currentDeck
            ? `${t('app.title')} · ${currentDeck.subject}`
            : t('app.title')
      const headerSub = headerMode === 'notebook'
        ? t('mistakes.sub')
        : headerMode === 'review'
          ? t('review.sub')
          : currentDeck && currentDeck.description
            ? currentDeck.description
            : t('app.subtitle')

      const headerKickerNodes = headerMode === 'practice' && currentDeck
        ? [t('app.title'), ' · ', h(MathText, { key: 'subject', text: currentDeck.subject, t, inline: true })]
        : [headerKicker]

      const header = h('header', { className: 'dshq-topbar' },
        h('div', { className: 'dshq-heading' },
          h('div', { className: 'dshq-logo' }, h(GridIcon, { size: 20 })),
          h('div', { style: { minWidth: 0 } },
            h('div', { className: 'dshq-kicker' }, headerKickerNodes),
            h('div', { className: 'dshq-title', role: 'heading', 'aria-level': 1 },
              h(MathText, { text: headerTitle, t })),
            h('div', { className: 'dshq-sub' }, h(MathText, { text: headerSub, t })))),
        h('div', { className: 'dshq-head-actions' },
          h('button', { type: 'button', className: 'dshq-button', onClick: onBack },
            h(ChevronIcon, { direction: 'left' }), t('app.back')),
          h('div', { className: 'dshq-score' },
            headerMode === 'notebook'
              ? [
                scoreChip('open', 'is-bad', h(CrossIcon, { size: 12 }), `${t('mistakes.open')} ${counts.open}`),
                scoreChip('mastered', 'is-good', h(CheckIcon, { size: 12 }), `${t('mistakes.mastered')} ${counts.mastered}`),
                scoreChip('total', '', null, `${t('mistakes.total')} ${counts.total}`),
              ]
              : [
                scoreChip('correct', 'is-good', h(CheckIcon, { size: 12 }), `${activeCorrect}`),
                scoreChip('wrong', 'is-bad', h(CrossIcon, { size: 12 }), `${activeWrong}`),
                scoreChip('rate', '', null, `${t('stats.rate')} ${activeAccuracy}%`),
              ],
            lastRefreshAt
              ? h('span', { className: 'dshq-last-refresh' }, t('refresh.lastAt', { time: formatTime(lastRefreshAt) }))
              : null),
          h('button', {
            type: 'button',
            className: 'dshq-button',
            onClick: refresh,
            disabled: refreshing,
            'aria-busy': refreshing ? 'true' : undefined,
          }, h(RefreshIcon), refreshing ? t('app.refreshing') : t('app.refresh'))))

      if (snapshot.status === 'loading') {
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-loader' },
            h('span', { className: 'dshq-loader-dot' }),
            h('span', { className: 'dshq-loader-dot' }),
            h('span', { className: 'dshq-loader-dot' }),
            h('span', null, t('app.loading'))))
      }
      if (snapshot.status === 'error') {
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-empty', style: { flex: 1 } },
            h('h2', null, t('app.error')),
            h('p', null, snapshot.message || ''),
            h('button', { type: 'button', className: 'dshq-button is-primary', onClick: refresh }, h(RefreshIcon), t('app.retry'))))
      }
      if (!currentDeck) {
        return h('div', { className: 'dshq-page' }, header,
          h('div', { className: 'dshq-empty', style: { flex: 1 } },
            h('h2', null, t('app.empty')),
            h('p', null, t('app.emptyHint')),
            h('button', { type: 'button', className: 'dshq-button', onClick: refresh }, h(RefreshIcon), t('app.refresh'))))
      }

      const rail = h('nav', { className: 'dshq-rail', 'aria-label': t('rail.title') },
        h('button', {
          type: 'button',
          className: `dshq-rail-note${view === 'mistakes' ? ' is-active' : ''}`,
          onClick: () => { setQueue(null); setView('mistakes') },
        },
        h('span', { className: 'dshq-rail-note-icon' }, h(NotebookIcon, { size: 17 })),
        h('span', { className: 'dshq-rail-note-body' },
          h('span', { className: 'dshq-rail-note-title' }, t('app.notebook')),
          h('span', { className: 'dshq-rail-note-meta' }, t('mistakes.openCount', { n: counts.open }))),
        counts.open > 0 ? h('span', { className: 'dshq-rail-badge' }, counts.open) : null),
        h('div', { className: 'dshq-rail-title' }, t('rail.title')),
        decks.map((deck) => {
          const state = answers[deck.id] ?? {}
          const done = deck.questions.reduce((count, item) => (state[item.id] !== undefined ? count + 1 : count), 0)
          return h('div', { key: deck.id, className: 'dshq-deck-row' },
            h('button', {
              type: 'button',
              className: `dshq-deck${view === 'practice' && !queue && deck.id === currentDeck.id ? ' is-active' : ''}`,
              onClick: () => selectDeck(deck.id),
              'aria-current': view === 'practice' && !queue && deck.id === currentDeck.id ? 'page' : undefined,
            },
            h('div', { className: 'dshq-deck-subject' },
              h(MathText, { text: deck.subject, t, inline: true })),
            h('div', { className: 'dshq-deck-title' }, h(MathText, { text: deck.title, t, inline: true })),
            h('span', { className: 'dshq-deck-meta' }, t('deck.count', { n: deck.questions.length }),
              ' · ', t('deck.done', { done, n: deck.questions.length }))),
            h('button', {
              type: 'button',
              className: 'dshq-deck-remove',
              title: t('deck.remove'),
              'aria-label': `${t('deck.remove')} ${deck.title}`,
              disabled: removing === deck.id,
              onClick: () => removeDeck(deck),
            }, h(CrossIcon, { size: 11 })))
        }),
        h('div', { className: 'dshq-rail-hint' }, t('rail.hint')))

      const notebookMain = h('main', { className: 'dshq-main', ref: mainRef },
        h(NotebookMain, {
          rows,
          filter,
          setFilter,
          counts,
          t,
          onBack: () => setView('practice'),
          onView: (row) => openRow(row, false),
          onRedo: (row) => openRow(row, true),
          onToggle: toggleMastered,
          onRemove: removeMistake,
        }))

      const pagerEntries = queue
        ? queueItems.map((item) => {
          const resolved = resolveQueueItem(decks, item)
          return {
            key: mistakeKey(item.deckId, item.qid),
            question: resolved ? resolved.question : null,
            value: resolved ? answers[resolved.deck.id]?.[item.qid] : undefined,
          }
        })
        : currentDeck.questions.map((item) => ({ key: item.id, question: item, value: deckAnswers[item.id] }))

      const practiceMain = h('main', { className: 'dshq-main', ref: mainRef },
        h('div', { className: 'dshq-main-inner' },
          queue
            ? h('div', { className: 'dshq-review-bar' },
              h('span', { className: 'dshq-review-title' },
                h(NotebookIcon, { size: 14 }),
                `${t('review.title')} · ${t('review.progress', { n: displayIndex + 1, m: displayTotal })}`),
              h('span', { className: 'dshq-hint' }, t('review.autoMaster')),
              h('button', { type: 'button', className: 'dshq-button', onClick: exitReview }, t('review.exit')))
            : null,
          h('div', {
            className: 'dshq-progress', role: 'progressbar',
            'aria-valuenow': answeredCount, 'aria-valuemin': 0, 'aria-valuemax': displayTotal,
          },
          h('div', {
            className: 'dshq-progress-fill',
            style: { width: `${displayTotal > 0 ? Math.round((answeredCount / displayTotal) * 100) : 0}%` },
          })),
          question
            ? h('div', { className: 'dshq-question-card' },
              h('div', { className: 'dshq-qhead' },
                h('span', { className: 'dshq-qindex' }, t('quiz.index', { n: displayIndex + 1 })),
                h('span', { className: 'dshq-qof' }, t('quiz.of', { m: displayTotal })),
                question.level
                  ? h('div', { className: 'dshq-tag' }, h(MathText, { text: question.level, t, inline: true }))
                  : null,
                multi
                  ? h('div', { className: 'dshq-tag is-multi' }, t('quiz.multi'))
                  : null,
                question.topic
                  ? h('div', { className: 'dshq-topic' }, h(MathText, { text: question.topic, t, inline: true }))
                  : null,
                queue && practiceDeck
                  ? h('div', { className: 'dshq-mistake-deck' }, h(MathText, { text: practiceDeck.title, t, inline: true }))
                  : null),
              h('div', { className: 'dshq-stem' }, h(MathText, { text: question.prompt, t })),
              Array.isArray(question.inputs) && question.inputs.length > 0
                ? h(Inputs, { inputs: question.inputs, t })
                : null,
              question.conditions
                ? h('div', { className: 'dshq-conditions' },
                  h('span', { className: 'dshq-cond-label' }, t('quiz.conditions')),
                  h('div', { className: 'dshq-cond-value' }, h(MathText, { text: question.conditions, t })))
                : null,
              h('div', { className: 'dshq-options' }, question.options.map((option, index) => h(OptionButton, {
                key: index,
                option,
                index,
                state: optionState(question, picked, index),
                selected: multi && picked === null && draftPicks.includes(index),
                multi,
                disabled: picked !== null,
                onPick: pick,
                t,
              }))),
              multi && picked === null
                ? h('div', { className: 'dshq-submit-row' },
                  h('span', { className: 'dshq-hint' }, t('quiz.multiHint', { n: draftPicks.length })),
                  h('button', {
                    type: 'button',
                    className: 'dshq-button is-primary',
                    disabled: draftPicks.length < 2,
                    onClick: submitPicks,
                  }, t('quiz.submit')))
                : null,
              allDone
                ? h('div', { className: 'dshq-summary' },
                  h('span', null, queue
                    ? t('review.done', { c: correctCount, n: displayTotal })
                    : t('quiz.summary', { c: correctCount, n: displayTotal, p: accuracy })),
                  h('div', { className: 'dshq-summary-actions' },
                    queue ? h('button', { type: 'button', className: 'dshq-button', onClick: exitReview }, t('review.exit')) : null,
                    queue && counts.openResolved > 0
                      ? h('button', { type: 'button', className: 'dshq-button', onClick: startReview }, t('review.again'))
                      : null,
                    !queue ? h('button', { type: 'button', className: 'dshq-button', onClick: resetDeck }, t('quiz.reset')) : null))
                : null)
            : h('div', { className: 'dshq-card' },
              h('p', { className: 'dshq-step-body', style: { margin: 0 } }, t('mistakes.missingDeck')),
              queue ? h('button', { type: 'button', className: 'dshq-button', style: { marginTop: '10px' }, onClick: skipQueue }, t('review.skip')) : null),
          question
            ? h('div', { className: 'dshq-pager' },
              h('button', {
                type: 'button', className: 'dshq-button', onClick: () => navigateTo(displayIndex - 1), disabled: displayIndex <= 0,
              }, h(ChevronIcon, { direction: 'left' }), t('quiz.prev')),
              h('div', { className: 'dshq-dots' }, pagerEntries.map((entry, index) => {
                const dotClass = ['dshq-dot']
                if (index === displayIndex) dotClass.push('is-current')
                if (entry.value !== undefined) dotClass.push(entry.question && isCorrectAnswer(entry.question, entry.value) ? 'is-good' : 'is-bad')
                return h('button', {
                  key: entry.key,
                  type: 'button',
                  className: dotClass.join(' '),
                  onClick: () => navigateTo(index),
                  'aria-label': t('quiz.index', { n: index + 1 }),
                  'aria-current': index === displayIndex ? 'step' : undefined,
                }, index + 1)
              })),
              h('button', {
                type: 'button', className: 'dshq-button', onClick: () => navigateTo(displayIndex + 1), disabled: displayIndex >= displayTotal - 1,
              }, t('quiz.next'), h(ChevronIcon, { direction: 'right' })))
            : null))

      const main = view === 'mistakes' ? notebookMain : practiceMain

      const aside = view === 'mistakes'
        ? h('aside', { className: 'dshq-aside', ref: asideRef },
          h('div', { className: 'dshq-aside-head' },
            h('div', { className: 'dshq-section-title', style: { margin: 0 } }, t('app.notebook'))),
          h(NotebookAside, {
            counts,
            t,
            onReviewAll: startReview,
            onClearMastered: clearMastered,
          }))
        : h('aside', { className: 'dshq-aside', ref: asideRef },
          h('div', { className: 'dshq-aside-head' },
            h('div', { className: 'dshq-tabs', role: 'tablist' },
              h('button', {
                type: 'button', role: 'tab', 'aria-selected': tab === 'quiz',
                className: `dshq-tab${tab === 'quiz' ? ' is-active' : ''}`,
                onClick: () => setTab('quiz'),
              }, t('quiz.asideTab')),
              h('button', {
                type: 'button', role: 'tab', 'aria-selected': tab === 'notes',
                className: `dshq-tab${tab === 'notes' ? ' is-active' : ''}`,
                onClick: () => setTab('notes'),
              }, t('quiz.notesTab')))),
          h('div', { className: 'dshq-aside-body' },
            tab === 'notes'
              ? h(Notes, { notes: practiceDeck ? practiceDeck.notes : [], t })
              : question
                ? h(Solution, { question, picked, t, onRetry: retryQuestion })
                : h('div', { className: 'dshq-card' }, t('mistakes.missingDeck')),
            h('div', { className: 'dshq-kbd-hint' },
              h('span', { className: 'dshq-hint' }, t(multi ? 'quiz.keyboardHintMulti' : 'quiz.keyboardHint')))))

      // Host diagnostics and failed refreshes/deletes are visible, not a
      // hover-only chip: one alert region with a retry action.
      const problemLines = [
        ...(actionError ? [actionError] : []),
        ...snapshot.errors,
      ].filter((line) => typeof line === 'string' && line !== '')
      const alertBanner = problemLines.length > 0
        ? h('div', { className: 'dshq-alert', role: 'alert', 'aria-live': 'assertive' },
          h('div', { className: 'dshq-alert-body' },
            h('strong', { className: 'dshq-alert-title' }, t('refresh.failed')),
            problemLines.slice(0, 3).map((line, index) => h('div', {
              key: `e${index}`, className: 'dshq-alert-line',
            }, line)),
            problemLines.length > 3
              ? h('div', { className: 'dshq-alert-line' }, `…+${problemLines.length - 3}`)
              : null),
          h('button', {
            type: 'button', className: 'dshq-button', onClick: refresh, disabled: refreshing,
          }, t('refresh.retry')))
        : null

      // Honest refresh feedback: totals + what changed since the previous load.
      const refreshStatus = refreshReport
        ? h('div', { className: 'dshq-refresh-status', role: 'status', 'aria-live': 'polite' },
          refreshReport.changed === 0
            ? `${t('refresh.noChange')} · ${t('refresh.lastAt', { time: formatTime(refreshReport.at) })}`
            : [
              t('refresh.result', { total: refreshReport.total }),
              refreshReport.added.length > 0 ? t('refresh.added', { n: refreshReport.added.length }) : null,
              refreshReport.updated.length > 0 ? t('refresh.updated', { n: refreshReport.updated.length }) : null,
              refreshReport.removed.length > 0 ? t('refresh.removed', { n: refreshReport.removed.length }) : null,
              t('refresh.lastAt', { time: formatTime(refreshReport.at) }),
            ].filter(Boolean).join(' · '))
        : null

      return h('div', { className: 'dshq-page' }, header, alertBanner, refreshStatus,
        h('div', { className: 'dshq-layout' }, rail, main, aside))
    }

/**
 * @module panel
 * Registers the plugin face: locale dictionaries, styles, the `main` panel and
 * the sidebar icon.  `inject` stays the same shape the module loader expects.
 *
 * Provides: QuizIcon, pluginFace.
 * Requires: zh/en (locale.js), injectStyles (styles.js), QuizPage (page.js),
 * NS/PANEL_ID (base.js).  The builder appends `return pluginFace()`.
 */

    function QuizIcon({ size = 18 }) {
      return h('svg', {
        width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
        'aria-hidden': true, focusable: false,
      },
      [[3, 3], [13.5, 3], [3, 13.5], [13.5, 13.5]].map(([x, y], index) => h('rect', {
        key: index, x, y, width: 7.5, height: 7.5, rx: 2,
        fill: 'currentColor', opacity: index === 3 ? 0.45 : 1,
      })))
    }

    /** The plugin face: what `apply(ctx)` registers with the harness. */
    function pluginFace() {
      return {
        inject: ['slots', 'locale', 'layout'],
        // Test-only surface: `test/client.test.js` materializes the bundle with
        // a recording React stub and asserts every deck-content field reaches
        // MathText (matrix cells, input/step labels, topics, titles).
        __test: { MathText, MatrixView, Inputs, OptionButton, StepBlock, matrixToLatex, matrixToPlain },
        apply(ctx) {
          ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-quiz: dictionaries')
          ctx.effect(() => injectStyles(), 'dsh-quiz: styles')
          const t = ctx.locale.bind(NS)

          ctx.slots.inject('main', () => ctx.slots.register({
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              t,
              onBack: () => {
                try {
                  ctx.layout.selectPanel(null)
                } catch {
                  /* layout may already be on the conversation */
                }
              },
            }),
          }, QuizPage))

          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 32,
            locale: NS,
            label: () => t('panel.label'),
          }, QuizIcon))
        },
      }
    }

    return pluginFace()
  },
})
