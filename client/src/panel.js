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
        __test: { MathText, MatrixView, Inputs, matrixToLatex, matrixToPlain },
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
